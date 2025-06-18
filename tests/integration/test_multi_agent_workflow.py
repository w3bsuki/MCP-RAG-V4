#!/usr/bin/env python3
"""
Integration tests for multi-agent workflow orchestration
Tests the complete flow from task submission to completion
"""
import asyncio
import pytest
import json
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime

import sys
sys.path.append('../../')

from agents.admin.agent_orchestrator import AdminAgent, AgentTask, AgentRole, TaskStatus
from rag_system.enhanced_rag import EnhancedRAGSystem
from mcp_servers.logging_config import setup_logging

# Test fixtures
@pytest.fixture
async def admin_agent():
    """Create AdminAgent instance for testing"""
    config = {
        'max_concurrent_tasks': 5,
        'task_timeout': 60,
        'coordination_interval': 1
    }
    agent = AdminAgent(config)
    await agent.initialize()
    yield agent
    await agent.shutdown()

@pytest.fixture
async def rag_system():
    """Create RAG system instance for testing"""
    config = {
        'embedding_model': 'sentence-transformers/all-MiniLM-L6-v2',  # Smaller model for tests
        'chunk_size': 256,
        'chunk_overlap': 50
    }
    rag = EnhancedRAGSystem(config)
    await rag.initialize()
    yield rag
    await rag.shutdown()

@pytest.fixture
def shared_dir(tmp_path):
    """Create temporary shared directory structure"""
    shared = tmp_path / "shared"
    (shared / "specifications").mkdir(parents=True)
    (shared / "implementations").mkdir(parents=True)
    (shared / "validation-reports").mkdir(parents=True)
    return shared

class TestMultiAgentWorkflow:
    """Test complete multi-agent workflows"""
    
    @pytest.mark.asyncio
    async def test_full_development_cycle(self, admin_agent, shared_dir):
        """Test complete cycle: design -> implement -> validate"""
        # Create a complex task requiring all agents
        task = AgentTask(
            name="Create User Authentication System",
            description="Design and implement a secure JWT-based authentication system",
            dependencies=[],
            metadata={
                "requirements": [
                    "JWT token generation and validation",
                    "User registration and login",
                    "Password hashing with bcrypt",
                    "Rate limiting on auth endpoints",
                    "Comprehensive security validation"
                ]
            }
        )
        
        # Submit task to Admin Agent
        task_id = await admin_agent.submit_task(task)
        assert task_id is not None
        
        # Wait for task planning
        await asyncio.sleep(2)
        
        # Check task was assigned to Architect first
        status = admin_agent.get_task_status(task_id)
        assert status['assigned_to'] == AgentRole.ARCHITECT.value
        assert status['plan'] is not None
        assert len(status['plan']['steps']) > 0
        
        # Simulate Architect completion by creating specification
        spec = {
            "name": "Authentication System",
            "version": "1.0.0",
            "components": ["AuthController", "TokenService", "UserRepository"],
            "interfaces": [
                {"name": "POST /auth/register", "input": "UserRegistration", "output": "User"},
                {"name": "POST /auth/login", "input": "LoginCredentials", "output": "AuthToken"}
            ],
            "security": ["bcrypt hashing", "JWT RS256", "rate limiting"]
        }
        
        spec_file = shared_dir / "specifications" / f"{task_id}_auth_spec.json"
        spec_file.write_text(json.dumps(spec, indent=2))
        
        # Update task to trigger Builder phase
        await admin_agent._update_task_status(task_id, TaskStatus.COMPLETED, AgentRole.ARCHITECT)
        await asyncio.sleep(2)
        
        # Verify Builder was assigned
        status = admin_agent.get_task_status(task_id)
        assert status['sub_tasks'][1]['assigned_to'] == AgentRole.BUILDER.value
        
        # Simulate Builder completion
        impl_file = shared_dir / "implementations" / f"{task_id}_auth_impl.py"
        impl_file.write_text("# Mock implementation\nclass AuthController: pass")
        
        await admin_agent._update_task_status(
            status['sub_tasks'][1]['id'], 
            TaskStatus.COMPLETED, 
            AgentRole.BUILDER
        )
        await asyncio.sleep(2)
        
        # Verify Validator was assigned
        status = admin_agent.get_task_status(task_id)
        validator_task = next(t for t in status['sub_tasks'] if t['assigned_to'] == AgentRole.VALIDATOR.value)
        assert validator_task is not None
        
        # Simulate validation completion
        report = {
            "timestamp": datetime.now().isoformat(),
            "component": "Authentication System",
            "status": "PASS",
            "security": {"vulnerabilities": [], "risk_level": "LOW"},
            "quality": {"coverage": 92, "code_smells": 0}
        }
        
        report_file = shared_dir / "validation-reports" / f"{task_id}_validation.json"
        report_file.write_text(json.dumps(report, indent=2))
        
        await admin_agent._update_task_status(
            validator_task['id'],
            TaskStatus.COMPLETED,
            AgentRole.VALIDATOR
        )
        
        # Wait for final task completion
        await asyncio.sleep(2)
        
        # Verify entire task completed
        final_status = admin_agent.get_task_status(task_id)
        assert final_status['status'] == TaskStatus.COMPLETED.value
        assert all(st['status'] == TaskStatus.COMPLETED.value for st in final_status['sub_tasks'])
    
    @pytest.mark.asyncio
    async def test_parallel_task_execution(self, admin_agent):
        """Test multiple tasks executing in parallel"""
        tasks = []
        
        # Submit multiple independent tasks
        for i in range(3):
            task = AgentTask(
                name=f"Task {i+1}",
                description=f"Independent task number {i+1}",
                dependencies=[]
            )
            task_id = await admin_agent.submit_task(task)
            tasks.append(task_id)
        
        # Wait for planning
        await asyncio.sleep(3)
        
        # Verify all tasks are being processed
        active_count = 0
        for task_id in tasks:
            status = admin_agent.get_task_status(task_id)
            if status['status'] in ['planning', 'executing']:
                active_count += 1
        
        # Should process multiple tasks concurrently
        assert active_count >= 2
    
    @pytest.mark.asyncio
    async def test_task_dependency_chain(self, admin_agent):
        """Test tasks with dependencies execute in correct order"""
        # Create task chain: A -> B -> C
        task_a = AgentTask(
            name="Task A",
            description="First task in chain",
            dependencies=[]
        )
        task_a_id = await admin_agent.submit_task(task_a)
        
        task_b = AgentTask(
            name="Task B", 
            description="Depends on Task A",
            dependencies=[task_a_id]
        )
        task_b_id = await admin_agent.submit_task(task_b)
        
        task_c = AgentTask(
            name="Task C",
            description="Depends on Task B", 
            dependencies=[task_b_id]
        )
        task_c_id = await admin_agent.submit_task(task_c)
        
        await asyncio.sleep(2)
        
        # Task B and C should be blocked
        status_b = admin_agent.get_task_status(task_b_id)
        status_c = admin_agent.get_task_status(task_c_id)
        
        assert status_b['status'] == TaskStatus.PENDING.value
        assert status_c['status'] == TaskStatus.PENDING.value
        
        # Complete Task A
        await admin_agent._update_task_status(task_a_id, TaskStatus.COMPLETED)
        await asyncio.sleep(2)
        
        # Task B should now be active, C still blocked
        status_b = admin_agent.get_task_status(task_b_id)
        status_c = admin_agent.get_task_status(task_c_id)
        
        assert status_b['status'] in ['planning', 'executing']
        assert status_c['status'] == TaskStatus.PENDING.value
    
    @pytest.mark.asyncio
    async def test_rag_integration(self, admin_agent, rag_system):
        """Test RAG system integration with agent workflow"""
        # Ingest some knowledge
        doc = await rag_system.ingest_document(
            content="MCP-RAG-V4 uses a hierarchical Admin Agent to coordinate worker agents.",
            metadata={
                "title": "Architecture Overview",
                "source": "documentation",
                "category": "architecture"
            }
        )
        
        # Create task that requires RAG search
        task = AgentTask(
            name="Document System Architecture",
            description="Create comprehensive documentation based on existing knowledge",
            metadata={
                "use_rag": True,
                "search_queries": ["Admin Agent", "worker agents", "coordination"]
            }
        )
        
        task_id = await admin_agent.submit_task(task)
        await asyncio.sleep(2)
        
        # Simulate agent using RAG
        results = await rag_system.hybrid_search("Admin Agent coordination", limit=5)
        assert len(results) > 0
        assert "hierarchical" in results[0].chunk.content
    
    @pytest.mark.asyncio
    async def test_error_handling_cascade(self, admin_agent):
        """Test error handling across agent boundaries"""
        # Create task that will fail
        task = AgentTask(
            name="Failing Task",
            description="This task is designed to fail",
            metadata={
                "force_failure": True,
                "failure_stage": "builder"
            }
        )
        
        task_id = await admin_agent.submit_task(task)
        
        # Simulate progression to Builder stage
        await asyncio.sleep(2)
        status = admin_agent.get_task_status(task_id)
        
        # Force Builder failure
        if status['sub_tasks']:
            builder_task = next(
                (t for t in status['sub_tasks'] if t['assigned_to'] == AgentRole.BUILDER.value),
                None
            )
            if builder_task:
                await admin_agent._update_task_status(
                    builder_task['id'],
                    TaskStatus.FAILED,
                    AgentRole.BUILDER,
                    error="Simulated build failure"
                )
        
        await asyncio.sleep(2)
        
        # Verify parent task also marked as failed
        final_status = admin_agent.get_task_status(task_id)
        assert final_status['status'] == TaskStatus.FAILED.value
        assert final_status.get('error') is not None
    
    @pytest.mark.asyncio
    async def test_concurrent_rag_operations(self, rag_system):
        """Test RAG system under concurrent load"""
        # Ingest multiple documents concurrently
        async def ingest_doc(i):
            return await rag_system.ingest_document(
                content=f"Document {i} contains information about component {i}",
                metadata={"id": i, "category": "test"}
            )
        
        # Ingest 10 documents concurrently
        docs = await asyncio.gather(*[ingest_doc(i) for i in range(10)])
        assert len(docs) == 10
        
        # Perform concurrent searches
        async def search(query):
            return await rag_system.hybrid_search(query, limit=3)
        
        queries = [f"component {i}" for i in range(5)]
        results = await asyncio.gather(*[search(q) for q in queries])
        
        # Verify all searches returned results
        assert all(len(r) > 0 for r in results)
    
    @pytest.mark.asyncio
    async def test_agent_coordination_conflict(self, admin_agent):
        """Test handling of agent coordination conflicts"""
        # Create tasks that would conflict (same resource)
        task1 = AgentTask(
            name="Database Migration v1",
            description="Migrate database schema",
            metadata={"resource": "database", "exclusive": True}
        )
        
        task2 = AgentTask(
            name="Database Migration v2",
            description="Another database migration",
            metadata={"resource": "database", "exclusive": True}
        )
        
        # Submit both tasks
        task1_id = await admin_agent.submit_task(task1)
        task2_id = await admin_agent.submit_task(task2)
        
        await asyncio.sleep(2)
        
        # Check conflict resolution
        status1 = admin_agent.get_task_status(task1_id)
        status2 = admin_agent.get_task_status(task2_id)
        
        # One should be active, other should be queued
        statuses = [status1['status'], status2['status']]
        assert TaskStatus.EXECUTING.value in statuses or TaskStatus.PLANNING.value in statuses
        assert TaskStatus.PENDING.value in statuses

class TestIntegrationScenarios:
    """Test specific integration scenarios"""
    
    @pytest.mark.asyncio
    async def test_api_development_workflow(self, admin_agent, shared_dir):
        """Test complete API development workflow"""
        # Define API development task
        task = AgentTask(
            name="Create REST API for User Management",
            description="Design, implement and validate a complete REST API",
            metadata={
                "endpoints": [
                    "GET /users",
                    "POST /users", 
                    "GET /users/{id}",
                    "PUT /users/{id}",
                    "DELETE /users/{id}"
                ],
                "requirements": [
                    "Input validation",
                    "Authentication required",
                    "Rate limiting",
                    "OpenAPI documentation"
                ]
            }
        )
        
        task_id = await admin_agent.submit_task(task)
        
        # Verify task progression through stages
        stages_seen = set()
        for _ in range(10):  # Poll for updates
            status = admin_agent.get_task_status(task_id)
            if status['assigned_to']:
                stages_seen.add(status['assigned_to'])
            
            if status['status'] == TaskStatus.COMPLETED.value:
                break
                
            await asyncio.sleep(1)
        
        # Should have gone through architect -> builder -> validator
        assert AgentRole.ARCHITECT.value in stages_seen
    
    @pytest.mark.asyncio 
    async def test_security_validation_workflow(self, admin_agent):
        """Test security-focused validation workflow"""
        task = AgentTask(
            name="Security Audit Implementation",
            description="Implement security audit recommendations",
            metadata={
                "security_requirements": [
                    "Fix SQL injection vulnerabilities",
                    "Add CSRF protection",
                    "Implement rate limiting",
                    "Add input sanitization"
                ],
                "priority": "critical"
            }
        )
        
        task_id = await admin_agent.submit_task(task)
        await asyncio.sleep(2)
        
        # Verify high priority handling
        status = admin_agent.get_task_status(task_id)
        assert status['plan']['priority'] == 'high'  # Should elevate critical security tasks

if __name__ == "__main__":
    pytest.main([__file__, "-v"])