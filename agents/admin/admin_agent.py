#!/usr/bin/env python3
"""
Admin Agent Implementation
Orchestrates task distribution to worker agents
"""
import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging

import sys
sys.path.append('../')

from agents.core.agent_runtime import (
    AgentRuntime, Message, MessageIntent, TaskState
)


class AdminAgent(AgentRuntime):
    """
    Admin Agent - Orchestrates multi-agent system
    
    Responsibilities:
    - Receive user requests and route to appropriate agents
    - Monitor task progress across all agents
    - Handle task dependencies and conflicts
    - Provide system-wide coordination
    """
    
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        super().__init__(agent_id, "admin", config)
        
        # Task tracking
        self.active_tasks: Dict[str, Dict[str, Any]] = {}
        self.task_assignments: Dict[str, str] = {}  # task_id -> agent_id
        self.completed_tasks: List[str] = []
        
        # Agent registry
        self.available_agents = {
            'architect': [],
            'builder': [],
            'validator': []
        }
        
        # Load task history
        self.task_history_file = self.shared_dir / "task_history.json"
        self._load_task_history()
    
    async def initialize(self):
        """Initialize admin agent"""
        self.logger.info(f"Admin agent {self.agent_id} initialized")
        self.logger.info("Waiting for worker agents to connect...")
        
        # Broadcast admin online
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id="*",
            intent=MessageIntent.INFORM,
            task_id="system",
            payload={
                "type": "admin_online",
                "admin_id": self.agent_id
            }
        ))
    
    async def cleanup(self):
        """Save state before shutdown"""
        self._save_task_history()
        self.logger.info("Admin agent cleanup completed")
    
    async def on_idle(self):
        """Periodic maintenance tasks"""
        # Check for stuck tasks
        await self._check_stuck_tasks()
        
        # Update agent registry
        await self._ping_agents()
    
    def _load_task_history(self):
        """Load previous task history"""
        if self.task_history_file.exists():
            try:
                with open(self.task_history_file, 'r') as f:
                    history = json.load(f)
                    self.completed_tasks = history.get('completed', [])
                    self.logger.info(f"Loaded {len(self.completed_tasks)} completed tasks")
            except Exception as e:
                self.logger.error(f"Failed to load task history: {e}")
    
    def _save_task_history(self):
        """Save task history"""
        try:
            history = {
                'completed': self.completed_tasks,
                'last_updated': datetime.now(timezone.utc).isoformat()
            }
            with open(self.task_history_file, 'w') as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save task history: {e}")
    
    async def handle_request(self, message: Message):
        """Handle incoming requests"""
        request_type = message.payload.get('type')
        
        if request_type == 'submit_task':
            await self._handle_submit_task(message)
        elif request_type == 'get_status':
            await self._handle_get_status(message)
        elif request_type == 'list_tasks':
            await self._handle_list_tasks(message)
        else:
            self.logger.warning(f"Unknown request type: {request_type}")
    
    async def handle_inform(self, message: Message):
        """Handle inform messages from agents"""
        info_type = message.payload.get('type')
        
        if info_type == 'agent_online':
            await self._register_agent(message)
        elif info_type == 'specification_ready':
            await self._handle_specification_ready(message)
        elif info_type == 'build_complete':
            await self._handle_build_complete(message)
        elif info_type == 'validation_complete':
            await self._handle_validation_complete(message)
    
    async def handle_status(self, message: Message):
        """Track status updates from agents"""
        task_id = message.task_id
        status = message.payload.get('status')
        
        if task_id in self.active_tasks:
            self.active_tasks[task_id]['status'] = status
            self.active_tasks[task_id]['last_update'] = datetime.now(timezone.utc).isoformat()
            
            # Log important status changes
            if status == TaskState.COMPLETED.value:
                self.logger.info(f"Task {task_id} completed by {message.sender_id}")
                self.completed_tasks.append(task_id)
                
                # Move to completed
                if task_id in self.active_tasks:
                    del self.active_tasks[task_id]
            
            elif status == TaskState.FAILED.value:
                self.logger.error(f"Task {task_id} failed: {message.payload.get('error')}")
    
    async def _handle_submit_task(self, message: Message):
        """Handle task submission"""
        task_data = message.payload.get('task', {})
        task_type = task_data.get('type', 'specification')
        
        # Create task ID
        task_id = f"task-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{len(self.active_tasks)}"
        
        # Record task
        self.active_tasks[task_id] = {
            'task_id': task_id,
            'type': task_type,
            'data': task_data,
            'status': TaskState.PENDING.value,
            'submitted_by': message.sender_id,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        self.logger.info(f"New task submitted: {task_id} ({task_type})")
        
        # Route to appropriate agent
        if task_type == 'specification':
            await self._assign_to_architect(task_id, task_data)
        elif task_type == 'build':
            await self._assign_to_builder(task_id, task_data)
        elif task_type == 'validate':
            await self._assign_to_validator(task_id, task_data)
        else:
            # Default to architect for design tasks
            await self._assign_to_architect(task_id, task_data)
        
        # Confirm submission
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id=message.sender_id,
            intent=MessageIntent.INFORM,
            task_id=task_id,
            payload={
                "type": "task_submitted",
                "task_id": task_id,
                "status": "assigned"
            }
        ))
    
    async def _assign_to_architect(self, task_id: str, task_data: Dict[str, Any]):
        """Assign task to architect agent"""
        # For now, broadcast - in production would track specific agents
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id="architect-01",  # Could be dynamic
            intent=MessageIntent.REQUEST,
            task_id=task_id,
            payload={
                "type": "create_specification",
                "requirements": task_data.get('requirements', {})
            }
        ))
        
        self.task_assignments[task_id] = "architect-01"
        self.active_tasks[task_id]['status'] = TaskState.ASSIGNED.value
        self.active_tasks[task_id]['assigned_to'] = "architect-01"
        
        await self.broadcast_status(task_id, TaskState.ASSIGNED, {
            "assigned_to": "architect-01"
        })
    
    async def _assign_to_builder(self, task_id: str, task_data: Dict[str, Any]):
        """Assign task to builder agent"""
        spec_path = task_data.get('specification_path')
        
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id="builder-01",
            intent=MessageIntent.REQUEST,
            task_id=task_id,
            payload={
                "type": "build_from_spec",
                "specification_path": spec_path
            }
        ))
        
        self.task_assignments[task_id] = "builder-01"
        self.active_tasks[task_id]['status'] = TaskState.ASSIGNED.value
    
    async def _assign_to_validator(self, task_id: str, task_data: Dict[str, Any]):
        """Assign task to validator agent"""
        build_path = task_data.get('build_path')
        
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id="validator-01",
            intent=MessageIntent.REQUEST,
            task_id=task_id,
            payload={
                "type": "validate_build",
                "build_path": build_path
            }
        ))
        
        self.task_assignments[task_id] = "validator-01"
        self.active_tasks[task_id]['status'] = TaskState.ASSIGNED.value
    
    async def _handle_specification_ready(self, message: Message):
        """Handle specification completion from architect"""
        task_id = message.task_id
        spec_path = message.payload.get('spec_path')
        
        self.logger.info(f"Specification ready for {task_id}: {spec_path}")
        
        # Automatically trigger build phase
        build_task_id = f"{task_id}-build"
        
        self.active_tasks[build_task_id] = {
            'task_id': build_task_id,
            'type': 'build',
            'parent_task': task_id,
            'data': {'specification_path': spec_path},
            'status': TaskState.PENDING.value,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        await self._assign_to_builder(build_task_id, {'specification_path': spec_path})
    
    async def _handle_build_complete(self, message: Message):
        """Handle build completion from builder"""
        task_id = message.task_id
        build_path = message.payload.get('build_path')
        
        self.logger.info(f"Build complete for {task_id}: {build_path}")
        
        # Automatically trigger validation
        validate_task_id = f"{task_id}-validate"
        
        self.active_tasks[validate_task_id] = {
            'task_id': validate_task_id,
            'type': 'validate',
            'parent_task': task_id,
            'data': {'build_path': build_path},
            'status': TaskState.PENDING.value,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        await self._assign_to_validator(validate_task_id, {'build_path': build_path})
    
    async def _handle_validation_complete(self, message: Message):
        """Handle validation completion"""
        task_id = message.task_id
        validation_passed = message.payload.get('passed', False)
        
        if validation_passed:
            self.logger.info(f"Validation passed for {task_id}")
        else:
            self.logger.warning(f"Validation failed for {task_id}")
            issues = message.payload.get('issues', [])
            for issue in issues:
                self.logger.warning(f"  - {issue}")
    
    async def _register_agent(self, message: Message):
        """Register an agent as available"""
        agent_role = message.payload.get('role')
        agent_id = message.sender_id
        
        if agent_role in self.available_agents:
            if agent_id not in self.available_agents[agent_role]:
                self.available_agents[agent_role].append(agent_id)
                self.logger.info(f"Registered {agent_role} agent: {agent_id}")
    
    async def _check_stuck_tasks(self):
        """Check for tasks that might be stuck"""
        current_time = datetime.now(timezone.utc)
        
        for task_id, task in self.active_tasks.items():
            if task['status'] in [TaskState.ASSIGNED.value, TaskState.EXECUTING.value]:
                # Check if task has been stuck for > 5 minutes
                last_update = task.get('last_update', task['created_at'])
                last_update_time = datetime.fromisoformat(last_update.replace('Z', '+00:00'))
                
                if (current_time - last_update_time).seconds > 300:
                    self.logger.warning(f"Task {task_id} might be stuck (no update for 5+ minutes)")
    
    async def _ping_agents(self):
        """Ping all agents to check availability"""
        # Broadcast ping
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id="*",
            intent=MessageIntent.REQUEST,
            task_id="ping",
            payload={"type": "ping"}
        ))
    
    async def _handle_get_status(self, message: Message):
        """Handle status request"""
        task_id = message.payload.get('task_id')
        
        if task_id in self.active_tasks:
            status = self.active_tasks[task_id]
        elif task_id in self.completed_tasks:
            status = {"task_id": task_id, "status": "completed"}
        else:
            status = {"task_id": task_id, "status": "not_found"}
        
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id=message.sender_id,
            intent=MessageIntent.INFORM,
            task_id=task_id,
            payload={
                "type": "task_status",
                "status": status
            }
        ))
    
    async def _handle_list_tasks(self, message: Message):
        """Handle list tasks request"""
        filter_status = message.payload.get('status', 'all')
        
        tasks = []
        if filter_status == 'all' or filter_status == 'active':
            tasks.extend(self.active_tasks.values())
        
        if filter_status == 'all' or filter_status == 'completed':
            for task_id in self.completed_tasks[-10:]:  # Last 10
                tasks.append({"task_id": task_id, "status": "completed"})
        
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id=message.sender_id,
            intent=MessageIntent.INFORM,
            task_id="list",
            payload={
                "type": "task_list",
                "tasks": tasks
            }
        ))


# Interactive CLI for admin agent
class AdminCLI:
    """Interactive CLI for admin agent"""
    
    def __init__(self, admin: AdminAgent):
        self.admin = admin
        self.running = True
    
    async def run(self):
        """Run interactive CLI"""
        print("\n🎛️  Admin Agent CLI")
        print("Commands: submit, status, list, help, quit")
        
        while self.running:
            try:
                cmd = input("\nadmin> ").strip().lower()
                
                if cmd == 'quit':
                    self.running = False
                elif cmd == 'help':
                    self.show_help()
                elif cmd == 'submit':
                    await self.submit_task()
                elif cmd == 'status':
                    await self.show_status()
                elif cmd == 'list':
                    await self.list_tasks()
                else:
                    print("Unknown command. Type 'help' for commands.")
                    
            except KeyboardInterrupt:
                self.running = False
    
    def show_help(self):
        """Show help"""
        print("""
Commands:
  submit - Submit a new task
  status - Check task status
  list   - List all tasks
  help   - Show this help
  quit   - Exit admin CLI
        """)
    
    async def submit_task(self):
        """Submit a new task"""
        print("\nTask types: specification, build, validate")
        task_type = input("Task type [specification]: ").strip() or "specification"
        
        if task_type == "specification":
            name = input("Project name: ").strip()
            desc = input("Description: ").strip()
            
            requirements = {
                "name": name,
                "description": desc,
                "features": []
            }
            
            # Add features
            print("Add features (empty to finish):")
            while True:
                feature = input("Feature name: ").strip()
                if not feature:
                    break
                feat_desc = input("Feature description: ").strip()
                requirements['features'].append({
                    "name": feature,
                    "description": feat_desc
                })
            
            # Submit task
            await self.admin.send_message(Message(
                sender_id="cli-user",
                recipient_id=self.admin.agent_id,
                intent=MessageIntent.REQUEST,
                task_id="cli-request",
                payload={
                    "type": "submit_task",
                    "task": {
                        "type": "specification",
                        "requirements": requirements
                    }
                }
            ))
            
            print("✓ Task submitted!")
    
    async def show_status(self):
        """Show task status"""
        print(f"\nActive tasks: {len(self.admin.active_tasks)}")
        for task_id, task in self.admin.active_tasks.items():
            print(f"  - {task_id}: {task['status']} ({task['type']})")
        
        print(f"\nCompleted tasks: {len(self.admin.completed_tasks)}")
    
    async def list_tasks(self):
        """List all tasks"""
        await self.show_status()


async def main():
    """Run the Admin agent"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Admin Agent')
    parser.add_argument('--id', default='admin-01', help='Agent ID')
    parser.add_argument('--redis-url', default='redis://localhost:6379', help='Redis URL')
    parser.add_argument('--shared-dir', default='../../shared', help='Shared directory')
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive CLI mode')
    args = parser.parse_args()
    
    config = {
        'redis_url': args.redis_url,
        'shared_dir': args.shared_dir,
        'enable_redis': False  # File-based for Claude Code
    }
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    agent = AdminAgent(args.id, config)
    
    # Start agent
    agent_task = asyncio.create_task(agent.start())
    
    if args.interactive:
        # Run CLI
        cli = AdminCLI(agent)
        await cli.run()
        agent.running = False
    
    await agent_task


if __name__ == "__main__":
    asyncio.run(main())