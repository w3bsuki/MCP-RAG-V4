#!/usr/bin/env python3
"""
Admin Agent Orchestrator for MCP-RAG-V4
Implements hierarchical agent coordination with Plan/Act protocol
"""
import asyncio
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
from pathlib import Path
import logging
import os
from dotenv import load_dotenv

# Import task queue
try:
    from .task_queue import task_queue
except ImportError:
    from task_queue import task_queue

# Import security and logging
try:
    from mcp_servers.logging_config import setup_logging, log_async_errors
    from mcp_servers.validation_schemas import StringValidation
except ImportError:
    # Simplified logging if imports fail
    import logging
    setup_logging = lambda name, level: {'main': logging.getLogger(name), 'performance': logging.getLogger(f"{name}-perf")}
    log_async_errors = lambda logger: lambda func: func
    class StringValidation:
        @staticmethod
        def is_safe_path(path): return True

# Load environment variables
load_dotenv()


# Agent roles and types
class AgentRole(Enum):
    ADMIN = "admin"
    FRONTEND = "frontend"
    BACKEND = "backend"
    RAG = "rag"
    TESTING = "testing"
    VALIDATOR = "validator"


class MessageType(Enum):
    PLAN_REQUEST = "plan_request"
    PLAN_RESPONSE = "plan_response"
    ACT_REQUEST = "act_request"
    ACT_RESPONSE = "act_response"
    STATUS_UPDATE = "status_update"
    ERROR = "error"
    COORDINATION = "coordination"


class TaskStatus(Enum):
    PENDING = "pending"
    PLANNING = "planning"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class AgentMessage:
    """Message structure for inter-agent communication"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    from_agent: AgentRole = AgentRole.ADMIN
    to_agent: AgentRole = AgentRole.ADMIN
    message_type: MessageType = MessageType.COORDINATION
    payload: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    correlation_id: Optional[str] = None
    priority: int = 5  # 1-10, higher is more important


@dataclass
class AgentTask:
    """Task definition for agents"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: str = ""
    assigned_to: Optional[AgentRole] = None
    status: TaskStatus = TaskStatus.PENDING
    plan: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None
    dependencies: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    error: Optional[str] = None


class SharedContext:
    """Shared context management for all agents"""
    def __init__(self):
        self.context: Dict[str, Any] = {}
        self.lock = asyncio.Lock()
        self.subscribers: Dict[str, List[Callable]] = {}
    
    async def get(self, key: str, default: Any = None) -> Any:
        """Thread-safe context retrieval"""
        async with self.lock:
            return self.context.get(key, default)
    
    async def set(self, key: str, value: Any):
        """Thread-safe context update with notifications"""
        async with self.lock:
            self.context[key] = value
            # Notify subscribers
            if key in self.subscribers:
                for callback in self.subscribers[key]:
                    asyncio.create_task(callback(key, value))
    
    async def update(self, updates: Dict[str, Any]):
        """Batch update context"""
        async with self.lock:
            self.context.update(updates)
    
    def subscribe(self, key: str, callback: Callable):
        """Subscribe to context changes"""
        if key not in self.subscribers:
            self.subscribers[key] = []
        self.subscribers[key].append(callback)


class AdminAgent:
    """
    Admin Agent: Orchestrates all other agents using Plan/Act protocol
    Responsibilities:
    - Task allocation and prioritization
    - Agent coordination and conflict resolution
    - Resource management
    - Progress monitoring
    
    Uses Haiku for quick routing decisions (10x cheaper)
    Uses Opus/Sonnet for complex orchestration
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.agents: Dict[AgentRole, 'BaseAgent'] = {}
        self.tasks: Dict[str, AgentTask] = {}
        self.message_queue: asyncio.Queue = asyncio.Queue()
        self.shared_context = SharedContext()
        
        # Initialize logging
        loggers = setup_logging("admin-agent", "INFO")
        self.logger = loggers['main']
        self.security_logger = loggers['security']
        self.performance_logger = loggers['performance']
        
        # Agent capabilities and constraints
        self.agent_capabilities = {
            AgentRole.FRONTEND: ["ui_design", "user_interaction", "visualization"],
            AgentRole.BACKEND: ["api_design", "database", "business_logic"],
            AgentRole.RAG: ["document_search", "embedding", "knowledge_retrieval"],
            AgentRole.TESTING: ["unit_tests", "integration_tests", "validation"],
            AgentRole.VALIDATOR: ["code_review", "security_check", "quality_assurance"]
        }
        
        # Initialize routing models
        self.use_haiku_routing = os.getenv('ENABLE_HAIKU_ROUTING', 'true').lower() == 'true'
        self.haiku_model = os.getenv('ADMIN_ROUTING_MODEL', 'claude-3-haiku-20240307')
        self.opus_model = os.getenv('ADMIN_ORCHESTRATION_MODEL', 'claude-3-opus-20240229')
        
        if self.use_haiku_routing:
            self.logger.info(f"Haiku routing enabled: {self.haiku_model}")
        
        self.logger.info("Admin Agent initialized", extra={'config': config})
    
    def register_agent(self, role: AgentRole, agent: 'BaseAgent'):
        """Register a worker agent"""
        self.agents[role] = agent
        self.logger.info(f"Registered agent: {role.value}", extra={'role': role.value})
    
    async def submit_task(self, task: AgentTask) -> str:
        """Submit a new task for processing"""
        task.status = TaskStatus.PENDING
        self.tasks[task.id] = task
        
        # Log task submission
        self.security_logger.log_access(
            agent="user",
            tool_name="submit_task",
            args={'task_id': task.id, 'task_name': task.name},
            result="accepted"
        )
        
        # Submit to Redis queue if enabled
        task_data = {
            'id': task.id,
            'name': task.name,
            'description': task.description,
            'status': task.status.value,
            'dependencies': task.dependencies,
            'metadata': task.metadata
        }
        await task_queue.submit_task(task_data)
        
        # Also queue locally for processing
        await self.message_queue.put(AgentMessage(
            from_agent=AgentRole.ADMIN,
            to_agent=AgentRole.ADMIN,
            message_type=MessageType.PLAN_REQUEST,
            payload={'task_id': task.id}
        ))
        
        self.logger.info(f"Task submitted: {task.id}", extra={'queue': 'redis' if task_queue.use_redis else 'memory'})
        
        return task.id
    
    @log_async_errors(logging.getLogger())
    async def plan_task(self, task: AgentTask) -> Dict[str, Any]:
        """
        Plan phase: Determine which agent should handle the task
        and create an execution plan
        
        Uses Haiku for simple routing, Opus/Sonnet for complex orchestration
        """
        self.logger.info(f"Planning task: {task.name}", extra={'task_id': task.id})
        task.status = TaskStatus.PLANNING
        
        # Determine if complex orchestration is needed
        needs_orchestration = await self._needs_complex_orchestration(task)
        
        if needs_orchestration:
            # Use Opus/Sonnet for complex planning
            plan = await self._complex_orchestration(task)
            self.logger.info(f"Complex orchestration used for task: {task.name}")
        else:
            # Use Haiku for simple routing
            best_agent = await self._select_best_agent(task)
            
            # Create simple execution plan
            plan = {
                'agent': best_agent.value,
                'steps': await self._generate_execution_steps(task, best_agent),
                'estimated_duration': await self._estimate_duration(task, best_agent),
                'resources_required': await self._identify_resources(task),
                'dependencies': task.dependencies,
                'priority': self._calculate_priority(task)
            }
            
            task.plan = plan
            task.assigned_to = best_agent
        
        self.logger.info(f"Task planned: {task.name}", extra={
            'task_id': task.id,
            'assigned_to': task.plan.get('agent', 'multiple'),
            'steps': len(plan.get('steps', [])),
            'used_orchestration': needs_orchestration
        })
        
        return plan
    
    async def _needs_complex_orchestration(self, task: AgentTask) -> bool:
        """
        Determine if task requires complex orchestration (Opus/Sonnet)
        vs simple routing (Haiku)
        """
        # Complex orchestration needed for:
        # 1. Tasks with dependencies
        if task.dependencies:
            return True
        
        # 2. Multi-agent coordination
        if 'multi-agent' in task.description.lower() or 'coordinate' in task.description.lower():
            return True
        
        # 3. High complexity tasks
        if any(word in task.description.lower() for word in ['complex', 'architecture', 'system design']):
            return True
        
        # 4. Resource conflicts
        if task.metadata.get('exclusive_resource'):
            return True
        
        # Simple routing is sufficient
        return False
    
    async def _complex_orchestration(self, task: AgentTask) -> Dict[str, Any]:
        """
        Use Opus/Sonnet for complex multi-agent orchestration
        This would call Anthropic API with Opus model in production
        """
        # In production:
        # response = await anthropic_client.messages.create(
        #     model=self.opus_model,
        #     max_tokens=1000,
        #     messages=[{"role": "user", "content": orchestration_prompt}]
        # )
        
        # Simulated complex plan
        return {
            'agent': 'multiple',
            'orchestration_type': 'complex',
            'phases': [
                {'agent': AgentRole.FRONTEND.value, 'phase': 'design'},
                {'agent': AgentRole.BACKEND.value, 'phase': 'implementation'},
                {'agent': AgentRole.VALIDATOR.value, 'phase': 'validation'}
            ],
            'steps': [
                {'step': 'Design phase', 'agent': AgentRole.FRONTEND.value},
                {'step': 'Implementation phase', 'agent': AgentRole.BACKEND.value},
                {'step': 'Validation phase', 'agent': AgentRole.VALIDATOR.value}
            ],
            'estimated_duration': 3600,
            'resources_required': ['database', 'api_endpoint'],
            'dependencies': task.dependencies,
            'priority': 'high'
        }
    
    async def _select_best_agent(self, task: AgentTask) -> AgentRole:
        """
        Select the most suitable agent for a task
        Uses Haiku for quick routing decisions if enabled
        """
        start_time = asyncio.get_event_loop().time()
        
        if self.use_haiku_routing:
            try:
                # Use Haiku for quick routing (simulated for now)
                best_agent = await self._haiku_route_task(task)
                
                elapsed = asyncio.get_event_loop().time() - start_time
                self.performance_logger.info("Haiku routing completed", extra={
                    'duration_ms': elapsed * 1000,
                    'task_id': task.id,
                    'selected_agent': best_agent.value,
                    'model': self.haiku_model
                })
                
                return best_agent
                
            except Exception as e:
                self.logger.warning(f"Haiku routing failed, falling back: {e}")
        
        # Fallback to simple capability matching
        task_keywords = task.description.lower().split()
        
        scores = {}
        for role, capabilities in self.agent_capabilities.items():
            score = sum(1 for cap in capabilities 
                       if any(keyword in cap for keyword in task_keywords))
            scores[role] = score
        
        # Return agent with highest score
        best_agent = max(scores, key=scores.get)
        return best_agent
    
    async def _haiku_route_task(self, task: AgentTask) -> AgentRole:
        """
        Use Haiku model for quick task routing
        This would call Anthropic API in production
        """
        # Simulate Haiku routing based on task keywords
        # In production, this would be:
        # response = await anthropic_client.messages.create(
        #     model=self.haiku_model,
        #     max_tokens=50,
        #     messages=[{"role": "user", "content": routing_prompt}]
        # )
        
        task_lower = task.description.lower()
        
        # Quick pattern matching (simulating Haiku's decision)
        if any(word in task_lower for word in ['design', 'architecture', 'specification', 'plan']):
            return AgentRole.FRONTEND  # Using FRONTEND as proxy for ARCHITECT
        elif any(word in task_lower for word in ['implement', 'code', 'api', 'database', 'backend']):
            return AgentRole.BACKEND  # Using BACKEND as proxy for BUILDER
        elif any(word in task_lower for word in ['test', 'validate', 'security', 'audit', 'check']):
            return AgentRole.VALIDATOR
        elif any(word in task_lower for word in ['search', 'rag', 'document', 'knowledge', 'embedding']):
            return AgentRole.RAG
        else:
            # Default to backend for general tasks
            return AgentRole.BACKEND
    
    async def _generate_execution_steps(self, task: AgentTask, agent: AgentRole) -> List[Dict[str, Any]]:
        """Generate execution steps based on task and agent"""
        # This would be enhanced with AI planning in production
        base_steps = [
            {'step': 'validate_inputs', 'description': 'Validate task inputs and requirements'},
            {'step': 'prepare_resources', 'description': 'Prepare necessary resources'},
            {'step': 'execute_main', 'description': f'Execute main {agent.value} logic'},
            {'step': 'validate_output', 'description': 'Validate results'},
            {'step': 'cleanup', 'description': 'Clean up resources'}
        ]
        
        # Add agent-specific steps
        if agent == AgentRole.RAG:
            base_steps.insert(2, {'step': 'index_documents', 'description': 'Index relevant documents'})
            base_steps.insert(3, {'step': 'semantic_search', 'description': 'Perform semantic search'})
        elif agent == AgentRole.TESTING:
            base_steps.insert(2, {'step': 'generate_test_cases', 'description': 'Generate test cases'})
            base_steps.insert(3, {'step': 'run_tests', 'description': 'Execute test suite'})
        
        return base_steps
    
    async def _estimate_duration(self, task: AgentTask, agent: AgentRole) -> int:
        """Estimate task duration in seconds"""
        # Simple estimation based on agent type and task complexity
        base_duration = {
            AgentRole.FRONTEND: 30,
            AgentRole.BACKEND: 45,
            AgentRole.RAG: 20,
            AgentRole.TESTING: 60,
            AgentRole.VALIDATOR: 40
        }
        
        complexity_factor = len(task.description) / 100  # Simple complexity metric
        return int(base_duration.get(agent, 30) * (1 + complexity_factor))
    
    async def _identify_resources(self, task: AgentTask) -> List[str]:
        """Identify required resources for task execution"""
        resources = ['cpu', 'memory']
        
        # Add specific resources based on task
        if 'database' in task.description.lower():
            resources.append('database_connection')
        if 'api' in task.description.lower():
            resources.append('api_quota')
        if 'rag' in task.description.lower() or 'search' in task.description.lower():
            resources.extend(['vector_db', 'embedding_model'])
        
        return resources
    
    def _calculate_priority(self, task: AgentTask) -> int:
        """Calculate task priority (1-10)"""
        priority = 5  # Default priority
        
        # Adjust based on keywords
        if 'urgent' in task.description.lower():
            priority += 3
        if 'critical' in task.description.lower():
            priority += 2
        if 'security' in task.description.lower():
            priority += 2
        
        # Ensure within bounds
        return min(max(priority, 1), 10)
    
    @log_async_errors(logging.getLogger())
    async def execute_task(self, task_id: str) -> Dict[str, Any]:
        """
        Act phase: Execute the planned task through the assigned agent
        """
        task = self.tasks.get(task_id)
        if not task or not task.plan:
            raise ValueError(f"Task {task_id} not found or not planned")
        
        task.status = TaskStatus.EXECUTING
        assigned_agent = self.agents.get(task.assigned_to)
        
        if not assigned_agent:
            raise ValueError(f"Agent {task.assigned_to} not available")
        
        self.logger.info(f"Executing task: {task.name}", extra={
            'task_id': task_id,
            'agent': task.assigned_to.value
        })
        
        # Send execution request to assigned agent
        message = AgentMessage(
            from_agent=AgentRole.ADMIN,
            to_agent=task.assigned_to,
            message_type=MessageType.ACT_REQUEST,
            payload={
                'task': task.__dict__,
                'plan': task.plan,
                'context': await self.shared_context.get('global', {})
            },
            correlation_id=task_id,
            priority=task.plan['priority']
        )
        
        # Execute through agent (would be async message in production)
        result = await assigned_agent.execute(message)
        
        # Update task with results
        task.result = result
        task.status = TaskStatus.COMPLETED if result.get('success') else TaskStatus.FAILED
        task.updated_at = datetime.now()
        
        # Update shared context with results
        await self.shared_context.set(f"task_result_{task_id}", result)
        
        self.logger.info(f"Task completed: {task.name}", extra={
            'task_id': task_id,
            'status': task.status.value,
            'duration': (task.updated_at - task.created_at).total_seconds()
        })
        
        return result
    
    async def coordinate_agents(self):
        """Main coordination loop"""
        self.logger.info("Starting agent coordination loop")
        
        while True:
            try:
                # Process messages
                message = await asyncio.wait_for(
                    self.message_queue.get(), 
                    timeout=1.0
                )
                
                await self._process_message(message)
                
            except asyncio.TimeoutError:
                # Check agent health
                await self._check_agent_health()
                
            except Exception as e:
                self.logger.error(f"Coordination error: {e}", exc_info=True)
    
    async def _process_message(self, message: AgentMessage):
        """Process incoming messages"""
        if message.message_type == MessageType.PLAN_REQUEST:
            task_id = message.payload.get('task_id')
            task = self.tasks.get(task_id)
            if task:
                await self.plan_task(task)
                # Queue for execution
                await self.message_queue.put(AgentMessage(
                    from_agent=AgentRole.ADMIN,
                    to_agent=AgentRole.ADMIN,
                    message_type=MessageType.ACT_REQUEST,
                    payload={'task_id': task_id}
                ))
        
        elif message.message_type == MessageType.ACT_REQUEST:
            task_id = message.payload.get('task_id')
            await self.execute_task(task_id)
    
    async def _check_agent_health(self):
        """Check health of all registered agents"""
        for role, agent in self.agents.items():
            if hasattr(agent, 'health_check'):
                health = await agent.health_check()
                if not health.get('healthy'):
                    self.logger.warning(f"Agent {role.value} unhealthy", extra=health)
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a task"""
        task = self.tasks.get(task_id)
        if not task:
            return None
        
        return {
            'id': task.id,
            'name': task.name,
            'status': task.status.value,
            'assigned_to': task.assigned_to.value if task.assigned_to else None,
            'created_at': task.created_at.isoformat(),
            'updated_at': task.updated_at.isoformat(),
            'plan': task.plan,
            'result': task.result,
            'error': task.error
        }
    
    def get_all_tasks(self) -> List[Dict[str, Any]]:
        """Get status of all tasks"""
        return [self.get_task_status(task_id) for task_id in self.tasks.keys()]


class BaseAgent:
    """Base class for all worker agents"""
    
    def __init__(self, role: AgentRole, config: Dict[str, Any]):
        self.role = role
        self.config = config
        self.logger = logging.getLogger(f"agent.{role.value}")
    
    async def execute(self, message: AgentMessage) -> Dict[str, Any]:
        """Execute task based on message"""
        raise NotImplementedError("Subclasses must implement execute method")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check agent health"""
        return {
            'healthy': True,
            'role': self.role.value,
            'timestamp': datetime.now().isoformat()
        }


# Example usage
if __name__ == "__main__":
    async def main():
        # Initialize Admin Agent
        admin = AdminAgent({
            'max_concurrent_tasks': 10,
            'task_timeout': 300
        })
        
        # Create a sample task
        task = AgentTask(
            name="Create User Authentication API",
            description="Design and implement secure user authentication API with JWT tokens",
            dependencies=[]
        )
        
        # Submit task
        task_id = await admin.submit_task(task)
        print(f"Submitted task: {task_id}")
        
        # Plan task
        plan = await admin.plan_task(task)
        print(f"Task plan: {json.dumps(plan, indent=2)}")
        
        # Get status
        status = admin.get_task_status(task_id)
        print(f"Task status: {json.dumps(status, indent=2)}")
    
    asyncio.run(main())