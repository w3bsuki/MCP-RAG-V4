#!/usr/bin/env python3
"""
Unit tests for Admin Agent Orchestrator
Tests multi-agent coordination, task planning, and execution
"""
import asyncio
import pytest
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch
import json

# Import the module to test
import sys
sys.path.append('.')
from agent_orchestrator import (
    AdminAgent, AgentRole, AgentTask, AgentMessage, 
    MessageType, TaskStatus, SharedContext, BaseAgent
)


@pytest.fixture
def admin_agent():
    """Create AdminAgent instance for testing"""
    config = {
        'max_concurrent_tasks': 10,
        'task_timeout': 300
    }
    return AdminAgent(config)


@pytest.fixture
def sample_task():
    """Create sample task for testing"""
    return AgentTask(
        name="Test API Implementation",
        description="Implement user authentication API with JWT tokens and security",
        dependencies=[]
    )


@pytest.fixture
def mock_worker_agent():
    """Create mock worker agent"""
    agent = Mock(spec=BaseAgent)
    agent.role = AgentRole.BACKEND
    agent.execute = AsyncMock(return_value={
        'success': True,
        'result': 'Task completed successfully',
        'duration': 10.5
    })
    agent.health_check = AsyncMock(return_value={
        'healthy': True,
        'role': AgentRole.BACKEND.value,
        'timestamp': datetime.now().isoformat()
    })
    return agent


class TestSharedContext:
    """Test SharedContext functionality"""
    
    @pytest.mark.asyncio
    async def test_set_and_get(self):
        """Test basic set and get operations"""
        context = SharedContext()
        
        await context.set('key1', 'value1')
        value = await context.get('key1')
        assert value == 'value1'
        
        # Test default value
        value = await context.get('nonexistent', 'default')
        assert value == 'default'
    
    @pytest.mark.asyncio
    async def test_batch_update(self):
        """Test batch update functionality"""
        context = SharedContext()
        
        updates = {
            'key1': 'value1',
            'key2': 'value2',
            'key3': {'nested': 'value'}
        }
        
        await context.update(updates)
        
        assert await context.get('key1') == 'value1'
        assert await context.get('key2') == 'value2'
        assert await context.get('key3') == {'nested': 'value'}
    
    @pytest.mark.asyncio
    async def test_subscription(self):
        """Test context change subscriptions"""
        context = SharedContext()
        callback_called = False
        received_key = None
        received_value = None
        
        async def callback(key, value):
            nonlocal callback_called, received_key, received_value
            callback_called = True
            received_key = key
            received_value = value
        
        context.subscribe('test_key', callback)
        await context.set('test_key', 'test_value')
        
        # Give time for async callback
        await asyncio.sleep(0.1)
        
        assert callback_called
        assert received_key == 'test_key'
        assert received_value == 'test_value'


class TestAdminAgent:
    """Test AdminAgent functionality"""
    
    def test_agent_registration(self, admin_agent, mock_worker_agent):
        """Test agent registration"""
        admin_agent.register_agent(AgentRole.BACKEND, mock_worker_agent)
        
        assert AgentRole.BACKEND in admin_agent.agents
        assert admin_agent.agents[AgentRole.BACKEND] == mock_worker_agent
    
    @pytest.mark.asyncio
    async def test_task_submission(self, admin_agent, sample_task):
        """Test task submission"""
        task_id = await admin_agent.submit_task(sample_task)
        
        assert task_id in admin_agent.tasks
        assert admin_agent.tasks[task_id].status == TaskStatus.PENDING
        assert not admin_agent.message_queue.empty()
        
        # Check message in queue
        message = await admin_agent.message_queue.get()
        assert message.message_type == MessageType.PLAN_REQUEST
        assert message.payload['task_id'] == task_id
    
    @pytest.mark.asyncio
    async def test_agent_selection(self, admin_agent, sample_task):
        """Test best agent selection based on task"""
        # Test backend task
        backend_task = AgentTask(
            name="API Development",
            description="Create REST API endpoints for user management"
        )
        best_agent = await admin_agent._select_best_agent(backend_task)
        assert best_agent == AgentRole.BACKEND
        
        # Test frontend task
        frontend_task = AgentTask(
            name="UI Design",
            description="Design user interface for dashboard visualization"
        )
        best_agent = await admin_agent._select_best_agent(frontend_task)
        assert best_agent == AgentRole.FRONTEND
        
        # Test RAG task
        rag_task = AgentTask(
            name="Document Search",
            description="Search and retrieve relevant documentation"
        )
        best_agent = await admin_agent._select_best_agent(rag_task)
        assert best_agent == AgentRole.RAG
    
    @pytest.mark.asyncio
    async def test_task_planning(self, admin_agent, sample_task):
        """Test task planning phase"""
        task_id = await admin_agent.submit_task(sample_task)
        task = admin_agent.tasks[task_id]
        
        plan = await admin_agent.plan_task(task)
        
        assert task.status == TaskStatus.PLANNING
        assert task.plan is not None
        assert 'agent' in plan
        assert 'steps' in plan
        assert 'estimated_duration' in plan
        assert 'resources_required' in plan
        assert 'priority' in plan
        
        # Check agent assignment
        assert task.assigned_to == AgentRole.BACKEND
        
        # Check steps
        assert len(plan['steps']) >= 5
        assert any(step['step'] == 'validate_inputs' for step in plan['steps'])
    
    @pytest.mark.asyncio
    async def test_execution_steps_generation(self, admin_agent):
        """Test generation of execution steps for different agents"""
        # Test RAG agent steps
        rag_task = AgentTask(name="RAG Task", description="Search documents")
        steps = await admin_agent._generate_execution_steps(rag_task, AgentRole.RAG)
        
        # Should have RAG-specific steps
        step_names = [step['step'] for step in steps]
        assert 'index_documents' in step_names
        assert 'semantic_search' in step_names
        
        # Test Testing agent steps
        test_task = AgentTask(name="Test Task", description="Run tests")
        steps = await admin_agent._generate_execution_steps(test_task, AgentRole.TESTING)
        
        step_names = [step['step'] for step in steps]
        assert 'generate_test_cases' in step_names
        assert 'run_tests' in step_names
    
    @pytest.mark.asyncio
    async def test_priority_calculation(self, admin_agent):
        """Test task priority calculation"""
        # Normal task
        normal_task = AgentTask(name="Normal", description="Regular task")
        priority = admin_agent._calculate_priority(normal_task)
        assert priority == 5  # Default
        
        # Urgent task
        urgent_task = AgentTask(name="Urgent", description="Urgent fix needed")
        priority = admin_agent._calculate_priority(urgent_task)
        assert priority == 8  # 5 + 3
        
        # Critical security task
        critical_task = AgentTask(
            name="Critical", 
            description="Critical security vulnerability"
        )
        priority = admin_agent._calculate_priority(critical_task)
        assert priority == 9  # 5 + 2 + 2
        
        # Max priority
        max_task = AgentTask(
            name="Max Priority",
            description="Urgent critical security issue"
        )
        priority = admin_agent._calculate_priority(max_task)
        assert priority == 10  # Capped at 10
    
    @pytest.mark.asyncio
    async def test_task_execution(self, admin_agent, sample_task, mock_worker_agent):
        """Test task execution phase"""
        # Register worker agent
        admin_agent.register_agent(AgentRole.BACKEND, mock_worker_agent)
        
        # Submit and plan task
        task_id = await admin_agent.submit_task(sample_task)
        task = admin_agent.tasks[task_id]
        await admin_agent.plan_task(task)
        
        # Execute task
        result = await admin_agent.execute_task(task_id)
        
        assert task.status == TaskStatus.COMPLETED
        assert task.result == result
        assert result['success'] is True
        
        # Verify worker agent was called
        mock_worker_agent.execute.assert_called_once()
        
        # Check message passed to agent
        call_args = mock_worker_agent.execute.call_args[0][0]
        assert isinstance(call_args, AgentMessage)
        assert call_args.message_type == MessageType.ACT_REQUEST
        assert call_args.correlation_id == task_id
    
    @pytest.mark.asyncio
    async def test_task_execution_failure(self, admin_agent, sample_task):
        """Test task execution with missing agent"""
        task_id = await admin_agent.submit_task(sample_task)
        task = admin_agent.tasks[task_id]
        await admin_agent.plan_task(task)
        
        # Try to execute without registering agent
        with pytest.raises(ValueError, match="Agent .* not available"):
            await admin_agent.execute_task(task_id)
    
    def test_get_task_status(self, admin_agent, sample_task):
        """Test getting task status"""
        # Non-existent task
        status = admin_agent.get_task_status('nonexistent')
        assert status is None
        
        # Existing task
        task_id = asyncio.run(admin_agent.submit_task(sample_task))
        status = admin_agent.get_task_status(task_id)
        
        assert status is not None
        assert status['id'] == task_id
        assert status['name'] == sample_task.name
        assert status['status'] == TaskStatus.PENDING.value
    
    @pytest.mark.asyncio
    async def test_message_processing(self, admin_agent, sample_task):
        """Test message queue processing"""
        task_id = await admin_agent.submit_task(sample_task)
        
        # Process PLAN_REQUEST message
        message = await admin_agent.message_queue.get()
        await admin_agent._process_message(message)
        
        # Should have planned task and queued ACT_REQUEST
        task = admin_agent.tasks[task_id]
        assert task.plan is not None
        
        # Check ACT_REQUEST was queued
        assert not admin_agent.message_queue.empty()
        act_message = await admin_agent.message_queue.get()
        assert act_message.message_type == MessageType.ACT_REQUEST
    
    @pytest.mark.asyncio
    async def test_resource_identification(self, admin_agent):
        """Test resource requirement identification"""
        # Database task
        db_task = AgentTask(
            name="DB Task",
            description="Create database schema and migrations"
        )
        resources = await admin_agent._identify_resources(db_task)
        assert 'database_connection' in resources
        
        # API task
        api_task = AgentTask(
            name="API Task",
            description="Implement REST API endpoints"
        )
        resources = await admin_agent._identify_resources(api_task)
        assert 'api_quota' in resources
        
        # RAG task
        rag_task = AgentTask(
            name="RAG Task",
            description="Search and retrieve documents using RAG"
        )
        resources = await admin_agent._identify_resources(rag_task)
        assert 'vector_db' in resources
        assert 'embedding_model' in resources
    
    @pytest.mark.asyncio
    async def test_agent_health_check(self, admin_agent, mock_worker_agent):
        """Test agent health monitoring"""
        admin_agent.register_agent(AgentRole.BACKEND, mock_worker_agent)
        
        await admin_agent._check_agent_health()
        
        # Verify health check was called
        mock_worker_agent.health_check.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_concurrent_task_handling(self, admin_agent, mock_worker_agent):
        """Test handling multiple concurrent tasks"""
        admin_agent.register_agent(AgentRole.BACKEND, mock_worker_agent)
        
        # Submit multiple tasks
        tasks = []
        for i in range(3):
            task = AgentTask(
                name=f"Task {i}",
                description=f"Test task {i} for concurrent execution"
            )
            task_id = await admin_agent.submit_task(task)
            tasks.append(task_id)
        
        # Plan and execute all tasks
        for task_id in tasks:
            task = admin_agent.tasks[task_id]
            await admin_agent.plan_task(task)
            await admin_agent.execute_task(task_id)
        
        # Verify all completed
        for task_id in tasks:
            task = admin_agent.tasks[task_id]
            assert task.status == TaskStatus.COMPLETED
        
        # Verify agent was called 3 times
        assert mock_worker_agent.execute.call_count == 3


class TestBaseAgent:
    """Test BaseAgent functionality"""
    
    def test_base_agent_creation(self):
        """Test creating base agent"""
        agent = BaseAgent(AgentRole.BACKEND, {'timeout': 30})
        assert agent.role == AgentRole.BACKEND
        assert agent.config['timeout'] == 30
    
    @pytest.mark.asyncio
    async def test_base_agent_health_check(self):
        """Test base agent health check"""
        agent = BaseAgent(AgentRole.FRONTEND, {})
        health = await agent.health_check()
        
        assert health['healthy'] is True
        assert health['role'] == AgentRole.FRONTEND.value
        assert 'timestamp' in health
    
    @pytest.mark.asyncio
    async def test_base_agent_execute_not_implemented(self):
        """Test that execute raises NotImplementedError"""
        agent = BaseAgent(AgentRole.TESTING, {})
        message = AgentMessage()
        
        with pytest.raises(NotImplementedError):
            await agent.execute(message)


class TestIntegration:
    """Integration tests for complete workflows"""
    
    @pytest.mark.asyncio
    async def test_complete_task_workflow(self, admin_agent, mock_worker_agent):
        """Test complete task workflow from submission to completion"""
        # Register agents
        admin_agent.register_agent(AgentRole.BACKEND, mock_worker_agent)
        
        # Create complex task
        task = AgentTask(
            name="Complete Feature",
            description="Implement complete user authentication system with API, database, and tests",
            dependencies=[]
        )
        
        # Submit task
        task_id = await admin_agent.submit_task(task)
        
        # Get initial status
        status = admin_agent.get_task_status(task_id)
        assert status['status'] == TaskStatus.PENDING.value
        
        # Process messages to complete workflow
        # Process PLAN_REQUEST
        plan_msg = await admin_agent.message_queue.get()
        await admin_agent._process_message(plan_msg)
        
        # Check planning complete
        status = admin_agent.get_task_status(task_id)
        assert admin_agent.tasks[task_id].plan is not None
        
        # Process ACT_REQUEST
        act_msg = await admin_agent.message_queue.get()
        await admin_agent._process_message(act_msg)
        
        # Check execution complete
        final_status = admin_agent.get_task_status(task_id)
        assert final_status['status'] == TaskStatus.COMPLETED.value
        assert final_status['result'] is not None
        
        # Verify shared context was updated
        result = await admin_agent.shared_context.get(f"task_result_{task_id}")
        assert result is not None
        assert result['success'] is True


# Pytest configuration
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])