#!/usr/bin/env python3
"""
Architect Agent Implementation
Responsible for creating system designs and specifications
"""
import asyncio
import json
import yaml
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import logging

import sys
sys.path.append('../')

from agents.core.agent_runtime import (
    AgentRuntime, Message, MessageIntent, TaskState
)


class ArchitectAgent(AgentRuntime):
    """
    Architect Agent - Creates system designs and specifications
    
    Responsibilities:
    - Analyze requirements and create architectural specifications
    - Define interfaces and contracts between components
    - Choose appropriate technology stacks
    - Apply design patterns and best practices
    - Create architectural decision records (ADRs)
    """
    
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        super().__init__(agent_id, "architect", config)
        
        # Architect-specific state
        self.active_designs: Dict[str, Dict[str, Any]] = {}
        self.design_patterns = self._load_design_patterns()
        
        # Output directories
        self.specs_dir = self.shared_dir / "specifications"
        self.adrs_dir = self.shared_dir / "adrs"
        self.specs_dir.mkdir(exist_ok=True)
        self.adrs_dir.mkdir(exist_ok=True)
    
    async def initialize(self):
        """Initialize architect-specific resources"""
        self.logger.info(f"Architect agent {self.agent_id} initialized")
        self.logger.info(f"Specifications directory: {self.specs_dir}")
        self.logger.info(f"ADRs directory: {self.adrs_dir}")
    
    async def cleanup(self):
        """Cleanup architect resources"""
        # Save any pending designs
        for task_id, design in self.active_designs.items():
            await self._save_design_checkpoint(task_id, design)
        self.logger.info("Architect agent cleanup completed")
    
    async def on_idle(self):
        """Periodic tasks when idle"""
        # Could check for specification updates, clean old designs, etc.
        pass
    
    def _load_design_patterns(self) -> Dict[str, Any]:
        """Load common design patterns and templates"""
        return {
            "microservice": {
                "structure": ["api", "domain", "infrastructure", "tests"],
                "patterns": ["repository", "cqrs", "event-driven"],
                "considerations": ["scalability", "fault-tolerance", "monitoring"]
            },
            "monolith": {
                "structure": ["controllers", "services", "repositories", "models"],
                "patterns": ["mvc", "layered", "domain-driven"],
                "considerations": ["modularity", "database-design", "caching"]
            },
            "event-driven": {
                "structure": ["producers", "consumers", "events", "handlers"],
                "patterns": ["pub-sub", "event-sourcing", "saga"],
                "considerations": ["ordering", "idempotency", "replay"]
            }
        }
    
    async def handle_request(self, message: Message):
        """Handle design requests"""
        request_type = message.payload.get('type')
        
        if request_type == 'create_specification':
            await self._handle_create_specification(message)
        elif request_type == 'review_design':
            await self._handle_review_design(message)
        elif request_type == 'update_specification':
            await self._handle_update_specification(message)
        else:
            self.logger.warning(f"Unknown request type: {request_type}")
    
    async def _handle_create_specification(self, message: Message):
        """Create a new system specification"""
        task_id = message.task_id
        requirements = message.payload.get('requirements', {})
        
        self.logger.info(f"Creating specification for task {task_id}")
        
        # Update status
        await self.broadcast_status(task_id, TaskState.EXECUTING, {
            "phase": "analyzing_requirements"
        })
        
        # Analyze requirements
        design_type = self._analyze_requirements(requirements)
        
        # Create specification
        specification = await self._create_specification(
            task_id,
            requirements,
            design_type
        )
        
        # Save specification
        spec_path = await self._save_specification(task_id, specification)
        
        # Create ADR
        adr_path = await self._create_adr(task_id, specification)
        
        # Update active designs
        self.active_designs[task_id] = {
            "specification": specification,
            "spec_path": str(spec_path),
            "adr_path": str(adr_path),
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Send completion message
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id=message.sender_id,
            intent=MessageIntent.INFORM,
            task_id=task_id,
            payload={
                "type": "specification_created",
                "spec_path": str(spec_path),
                "adr_path": str(adr_path),
                "summary": self._summarize_specification(specification)
            }
        ))
        
        # Broadcast to builder
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id="*",  # Broadcast so builder can pick up
            intent=MessageIntent.INFORM,
            task_id=task_id,
            payload={
                "type": "specification_ready",
                "spec_path": str(spec_path),
                "next_agent": "builder"
            }
        ))
        
        # Update final status
        await self.broadcast_status(task_id, TaskState.COMPLETED, {
            "phase": "specification_complete",
            "outputs": {
                "specification": str(spec_path),
                "adr": str(adr_path)
            }
        })
    
    def _analyze_requirements(self, requirements: Dict[str, Any]) -> str:
        """Analyze requirements to determine design type"""
        # Simple heuristic - in real implementation would be more sophisticated
        features = requirements.get('features', [])
        scale = requirements.get('scale', 'medium')
        
        if 'microservice' in str(features).lower() or scale == 'large':
            return 'microservice'
        elif 'event' in str(features).lower():
            return 'event-driven'
        else:
            return 'monolith'
    
    async def _create_specification(
        self,
        task_id: str,
        requirements: Dict[str, Any],
        design_type: str
    ) -> Dict[str, Any]:
        """Create detailed specification based on requirements"""
        pattern = self.design_patterns.get(design_type, self.design_patterns['monolith'])
        
        # Search knowledge base for similar patterns if MCP is available
        similar_patterns = []
        if self.mcp_client:
            try:
                similar_patterns = await self.mcp_client.mock_search_knowledge(
                    f"architecture {design_type} pattern", limit=3
                )
                self.logger.info(f"Found {len(similar_patterns)} similar patterns in knowledge base")
            except Exception as e:
                self.logger.warning(f"Could not search knowledge base: {e}")
        
        specification = {
            "metadata": {
                "name": requirements.get('name', f'System-{task_id[:8]}'),
                "version": "1.0.0",
                "created_by": self.agent_id,
                "created_at": datetime.utcnow().isoformat(),
                "design_type": design_type
            },
            "purpose": requirements.get('description', 'System implementation'),
            "architecture": {
                "type": design_type,
                "structure": pattern['structure'],
                "patterns": pattern['patterns'],
                "considerations": pattern['considerations']
            },
            "components": self._design_components(requirements, design_type),
            "interfaces": self._design_interfaces(requirements, design_type),
            "dependencies": self._identify_dependencies(requirements, design_type),
            "implementation_notes": self._generate_implementation_notes(requirements, design_type),
            "security_considerations": self._analyze_security(requirements),
            "performance_requirements": self._define_performance_requirements(requirements),
            "testing_approach": self._define_testing_approach(requirements),
            "reference_patterns": similar_patterns  # Include knowledge base results
        }
        
        # Store this specification in knowledge base for future reference
        if self.mcp_client:
            try:
                await self.mcp_client.mock_store_knowledge(
                    json.dumps(specification, indent=2),
                    metadata={
                        "type": "specification",
                        "design_type": design_type,
                        "task_id": task_id,
                        "created_by": self.agent_id
                    }
                )
                self.logger.info("Specification stored in knowledge base")
            except Exception as e:
                self.logger.warning(f"Could not store specification in knowledge base: {e}")
        
        return specification
    
    def _design_components(self, requirements: Dict[str, Any], design_type: str) -> list:
        """Design system components"""
        components = []
        features = requirements.get('features', [])
        
        # Core components based on design type
        if design_type == 'microservice':
            components.extend([
                {
                    "name": "api-gateway",
                    "type": "service",
                    "purpose": "Route requests and handle authentication",
                    "technology": "nginx/kong"
                },
                {
                    "name": "service-registry",
                    "type": "infrastructure",
                    "purpose": "Service discovery and health checking",
                    "technology": "consul/etcd"
                }
            ])
        
        # Feature-based components
        for feature in features:
            if isinstance(feature, dict):
                name = feature.get('name', 'unknown')
                components.append({
                    "name": f"{name}-service",
                    "type": "service",
                    "purpose": feature.get('description', ''),
                    "technology": self._suggest_technology(feature)
                })
        
        return components
    
    def _design_interfaces(self, requirements: Dict[str, Any], design_type: str) -> list:
        """Design system interfaces"""
        interfaces = []
        
        # Default REST API
        interfaces.append({
            "name": "main-api",
            "type": "REST",
            "version": "v1",
            "authentication": "JWT",
            "endpoints": self._generate_endpoints(requirements)
        })
        
        # Add GraphQL if complex queries needed
        if self._needs_graphql(requirements):
            interfaces.append({
                "name": "graphql-api",
                "type": "GraphQL",
                "schema_location": "/specs/graphql/schema.graphql"
            })
        
        # Add event interfaces for event-driven
        if design_type == 'event-driven':
            interfaces.append({
                "name": "event-bus",
                "type": "AsyncAPI",
                "broker": "kafka/rabbitmq",
                "topics": self._generate_topics(requirements)
            })
        
        return interfaces
    
    def _identify_dependencies(self, requirements: Dict[str, Any], design_type: str) -> list:
        """Identify required dependencies"""
        deps = []
        
        # Framework dependencies
        tech_stack = requirements.get('tech_stack', {})
        language = tech_stack.get('language', 'python')
        
        if language == 'python':
            deps.extend([
                {"name": "fastapi", "version": "^0.100.0", "purpose": "Web framework"},
                {"name": "pydantic", "version": "^2.0", "purpose": "Data validation"},
                {"name": "sqlalchemy", "version": "^2.0", "purpose": "ORM"}
            ])
        elif language == 'typescript':
            deps.extend([
                {"name": "express", "version": "^4.18", "purpose": "Web framework"},
                {"name": "zod", "version": "^3.0", "purpose": "Validation"},
                {"name": "prisma", "version": "^5.0", "purpose": "ORM"}
            ])
        
        return deps
    
    def _generate_implementation_notes(self, requirements: Dict[str, Any], design_type: str) -> list:
        """Generate implementation notes and guidelines"""
        notes = [
            "Follow language-specific style guides and conventions",
            "Implement comprehensive error handling and logging",
            "Use dependency injection for loose coupling",
            "Write unit tests with >80% coverage"
        ]
        
        if design_type == 'microservice':
            notes.extend([
                "Implement circuit breakers for external service calls",
                "Use distributed tracing for debugging",
                "Implement health checks for all services"
            ])
        
        return notes
    
    def _analyze_security(self, requirements: Dict[str, Any]) -> list:
        """Analyze security requirements"""
        return [
            "Implement input validation on all endpoints",
            "Use parameterized queries to prevent SQL injection",
            "Implement rate limiting (100 req/min default)",
            "Secure all secrets using environment variables or vault",
            "Enable CORS with appropriate origins",
            "Implement JWT with short expiration times"
        ]
    
    def _define_performance_requirements(self, requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Define performance requirements"""
        return {
            "response_time": {
                "p95": "200ms",
                "p99": "500ms"
            },
            "throughput": "1000 req/sec",
            "availability": "99.9%",
            "scalability": "horizontal"
        }
    
    def _define_testing_approach(self, requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Define testing approach"""
        return {
            "unit_tests": {
                "coverage": "80%",
                "framework": "pytest/jest"
            },
            "integration_tests": {
                "scope": "API endpoints, database operations",
                "tools": "pytest-asyncio, supertest"
            },
            "performance_tests": {
                "tools": "locust, k6",
                "scenarios": ["normal load", "peak load", "stress test"]
            }
        }
    
    def _suggest_technology(self, feature: Dict[str, Any]) -> str:
        """Suggest technology based on feature requirements"""
        name = feature.get('name', '').lower()
        
        if 'auth' in name:
            return 'jwt/oauth2'
        elif 'search' in name:
            return 'elasticsearch'
        elif 'cache' in name:
            return 'redis'
        elif 'queue' in name:
            return 'rabbitmq/kafka'
        else:
            return 'tbd'
    
    def _needs_graphql(self, requirements: Dict[str, Any]) -> bool:
        """Determine if GraphQL is needed"""
        features = str(requirements.get('features', [])).lower()
        return 'complex queries' in features or 'flexible api' in features
    
    def _generate_endpoints(self, requirements: Dict[str, Any]) -> list:
        """Generate REST endpoints based on requirements"""
        endpoints = [
            {"method": "GET", "path": "/health", "purpose": "Health check"},
            {"method": "GET", "path": "/metrics", "purpose": "Prometheus metrics"}
        ]
        
        # Add feature-specific endpoints
        for feature in requirements.get('features', []):
            if isinstance(feature, dict):
                name = feature.get('name', 'resource')
                endpoints.extend([
                    {"method": "GET", "path": f"/{name}", "purpose": f"List {name}"},
                    {"method": "POST", "path": f"/{name}", "purpose": f"Create {name}"},
                    {"method": "GET", "path": f"/{name}/{{id}}", "purpose": f"Get {name}"},
                    {"method": "PUT", "path": f"/{name}/{{id}}", "purpose": f"Update {name}"},
                    {"method": "DELETE", "path": f"/{name}/{{id}}", "purpose": f"Delete {name}"}
                ])
        
        return endpoints
    
    def _generate_topics(self, requirements: Dict[str, Any]) -> list:
        """Generate event topics for event-driven architecture"""
        topics = []
        
        for feature in requirements.get('features', []):
            if isinstance(feature, dict):
                name = feature.get('name', 'entity')
                topics.extend([
                    f"{name}.created",
                    f"{name}.updated",
                    f"{name}.deleted"
                ])
        
        return topics
    
    async def _save_specification(self, task_id: str, specification: Dict[str, Any]) -> Path:
        """Save specification to file"""
        filename = f"spec-{task_id}-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.yaml"
        filepath = self.specs_dir / filename
        
        with open(filepath, 'w') as f:
            yaml.dump(specification, f, default_flow_style=False)
        
        self.logger.info(f"Specification saved to {filepath}")
        return filepath
    
    async def _create_adr(self, task_id: str, specification: Dict[str, Any]) -> Path:
        """Create Architectural Decision Record"""
        adr_content = f"""# ADR: {specification['metadata']['name']}

## Status
Accepted

## Context
{specification['purpose']}

## Decision
We will use a {specification['architecture']['type']} architecture with the following key patterns:
- {', '.join(specification['architecture']['patterns'])}

## Consequences
### Positive
- Clear separation of concerns
- Scalable architecture
- Well-defined interfaces

### Negative
- Increased complexity
- Additional infrastructure requirements

## Compliance
- Follows MCP-RAG-V4 architectural standards
- Implements required security measures
- Meets performance requirements

Created by: {self.agent_id}
Date: {datetime.utcnow().isoformat()}
"""
        
        filename = f"adr-{task_id}-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.md"
        filepath = self.adrs_dir / filename
        
        with open(filepath, 'w') as f:
            f.write(adr_content)
        
        return filepath
    
    def _summarize_specification(self, specification: Dict[str, Any]) -> Dict[str, Any]:
        """Create summary of specification"""
        return {
            "name": specification['metadata']['name'],
            "type": specification['architecture']['type'],
            "components": len(specification['components']),
            "interfaces": len(specification['interfaces']),
            "patterns": specification['architecture']['patterns']
        }
    
    async def _save_design_checkpoint(self, task_id: str, design: Dict[str, Any]):
        """Save design checkpoint for recovery"""
        checkpoint_file = self.shared_dir / f"checkpoint-architect-{task_id}.json"
        with open(checkpoint_file, 'w') as f:
            json.dump(design, f)
    
    async def _handle_review_design(self, message: Message):
        """Handle design review requests"""
        # Implementation for reviewing existing designs
        pass
    
    async def _handle_update_specification(self, message: Message):
        """Handle specification update requests"""
        # Implementation for updating specifications based on feedback
        pass


# Agent entry point
async def main():
    """Run the Architect agent"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Architect Agent')
    parser.add_argument('--id', default='architect-01', help='Agent ID')
    parser.add_argument('--redis-url', default='redis://localhost:6379', help='Redis URL')
    parser.add_argument('--shared-dir', default='../../shared', help='Shared directory')
    args = parser.parse_args()
    
    config = {
        'redis_url': args.redis_url,
        'shared_dir': args.shared_dir,
        'enable_redis': False  # Disabled for Claude Code
    }
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    agent = ArchitectAgent(args.id, config)
    await agent.start()


if __name__ == "__main__":
    asyncio.run(main())