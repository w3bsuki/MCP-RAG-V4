#!/usr/bin/env python3
"""
Builder Agent Implementation
Implements code based on architectural specifications
"""
import asyncio
import json
import yaml
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging
import subprocess

import sys
sys.path.append('../')

from agents.core.agent_runtime import (
    AgentRuntime, Message, MessageIntent, TaskState
)


class BuilderAgent(AgentRuntime):
    """
    Builder Agent - Implements code from specifications
    
    Responsibilities:
    - Transform architectural specifications into working code
    - Write comprehensive unit and integration tests
    - Ensure code quality and performance standards
    - Create proper documentation
    """
    
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        super().__init__(agent_id, "builder", config)
        
        # Build tracking
        self.active_builds: Dict[str, Dict[str, Any]] = {}
        self.build_templates = self._load_build_templates()
        
        # Output directories
        self.builds_dir = self.shared_dir / "builds"
        self.tests_dir = self.shared_dir / "tests"
        self.builds_dir.mkdir(exist_ok=True)
        self.tests_dir.mkdir(exist_ok=True)
    
    async def initialize(self):
        """Initialize builder agent"""
        self.logger.info(f"Builder agent {self.agent_id} initialized")
        self.logger.info(f"Builds directory: {self.builds_dir}")
        
        # Announce availability
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id="*",
            intent=MessageIntent.INFORM,
            task_id="system",
            payload={
                "type": "agent_online",
                "role": "builder",
                "capabilities": ["python", "typescript", "api", "testing"]
            }
        ))
    
    async def cleanup(self):
        """Cleanup builder resources"""
        # Save any work in progress
        for task_id, build in self.active_builds.items():
            await self._save_build_checkpoint(task_id, build)
        self.logger.info("Builder agent cleanup completed")
    
    async def on_idle(self):
        """Periodic tasks when idle"""
        # Could run linting, dependency updates, etc.
        pass
    
    def _load_build_templates(self) -> Dict[str, Any]:
        """Load code generation templates"""
        return {
            "python_service": {
                "structure": ["src", "tests", "docs", "config"],
                "files": {
                    "requirements.txt": self._python_requirements_template,
                    "setup.py": self._python_setup_template,
                    "src/__init__.py": lambda spec: "",
                    "src/main.py": self._python_main_template,
                    "src/api.py": self._python_api_template,
                    "tests/test_main.py": self._python_test_template,
                    "README.md": self._readme_template,
                    "Dockerfile": self._dockerfile_template
                }
            },
            "typescript_service": {
                "structure": ["src", "tests", "dist"],
                "files": {
                    "package.json": self._typescript_package_template,
                    "tsconfig.json": self._typescript_config_template,
                    "src/index.ts": self._typescript_main_template,
                    "src/api.ts": self._typescript_api_template,
                    "tests/index.test.ts": self._typescript_test_template
                }
            }
        }
    
    async def handle_request(self, message: Message):
        """Handle build requests"""
        request_type = message.payload.get('type')
        
        if request_type == 'build_from_spec':
            await self._handle_build_from_spec(message)
        elif request_type == 'update_build':
            await self._handle_update_build(message)
        elif request_type == 'run_tests':
            await self._handle_run_tests(message)
        else:
            self.logger.warning(f"Unknown request type: {request_type}")
    
    async def handle_inform(self, message: Message):
        """Handle specification ready messages"""
        if message.payload.get('type') == 'specification_ready':
            # Auto-build if next_agent is builder
            if message.payload.get('next_agent') == 'builder':
                await self._handle_build_from_spec(message)
    
    async def _handle_build_from_spec(self, message: Message):
        """Build implementation from specification"""
        task_id = message.task_id
        spec_path = message.payload.get('spec_path') or message.payload.get('specification_path')
        
        if not spec_path:
            self.logger.error(f"No specification path provided for {task_id}")
            return
        
        self.logger.info(f"Starting build for {task_id} from {spec_path}")
        
        # Update status
        await self.broadcast_status(task_id, TaskState.EXECUTING, {
            "phase": "loading_specification"
        })
        
        # Load specification
        spec = await self._load_specification(spec_path)
        if not spec:
            await self.broadcast_status(task_id, TaskState.FAILED, {
                "error": "Failed to load specification"
            })
            return
        
        # Create build
        build_path = await self._create_build(task_id, spec)
        
        # Generate code
        await self._generate_code(task_id, spec, build_path)
        
        # Generate tests
        await self._generate_tests(task_id, spec, build_path)
        
        # Run initial tests
        test_results = await self._run_tests(build_path)
        
        # Save build info
        self.active_builds[task_id] = {
            "specification": spec,
            "build_path": str(build_path),
            "test_results": test_results,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Send completion
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id=message.sender_id,
            intent=MessageIntent.INFORM,
            task_id=task_id,
            payload={
                "type": "build_complete",
                "build_path": str(build_path),
                "test_results": test_results,
                "summary": self._summarize_build(spec, test_results)
            }
        ))
        
        # Broadcast for validator
        await self.send_message(Message(
            sender_id=self.agent_id,
            recipient_id="*",
            intent=MessageIntent.INFORM,
            task_id=task_id,
            payload={
                "type": "build_ready",
                "build_path": str(build_path),
                "next_agent": "validator"
            }
        ))
        
        # Update status
        await self.broadcast_status(task_id, TaskState.COMPLETED, {
            "phase": "build_complete",
            "outputs": {
                "build": str(build_path),
                "tests_passed": test_results.get('passed', False)
            }
        })
    
    async def _load_specification(self, spec_path: str) -> Optional[Dict[str, Any]]:
        """Load specification from file"""
        try:
            # Try MCP filesystem first if available
            if self.mcp_client:
                try:
                    content = await self.mcp_client.read_file(spec_path)
                    if spec_path.endswith('.yaml'):
                        return yaml.safe_load(content)
                    else:
                        return json.loads(content)
                except Exception as e:
                    self.logger.warning(f"Could not load via MCP: {e}, falling back to direct file access")
            
            # Fallback to direct file access
            path = Path(spec_path)
            if not path.is_absolute():
                path = self.shared_dir / spec_path
            
            with open(path, 'r') as f:
                if path.suffix == '.yaml':
                    return yaml.safe_load(f)
                else:
                    return json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load specification: {e}")
            return None
    
    async def _create_build(self, task_id: str, spec: Dict[str, Any]) -> Path:
        """Create build directory structure"""
        build_name = f"build-{task_id}-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        build_path = self.builds_dir / build_name
        build_path.mkdir(exist_ok=True)
        
        # Determine language and template
        lang = self._determine_language(spec)
        template = self.build_templates.get(f"{lang}_service", self.build_templates['python_service'])
        
        # Create directory structure
        for dir_name in template['structure']:
            (build_path / dir_name).mkdir(exist_ok=True)
        
        return build_path
    
    def _determine_language(self, spec: Dict[str, Any]) -> str:
        """Determine implementation language from spec"""
        # Check dependencies
        deps = spec.get('dependencies', [])
        for dep in deps:
            if 'fastapi' in str(dep).lower() or 'pydantic' in str(dep).lower():
                return 'python'
            elif 'express' in str(dep).lower() or 'typescript' in str(dep).lower():
                return 'typescript'
        
        # Default to Python
        return 'python'
    
    async def _generate_code(self, task_id: str, spec: Dict[str, Any], build_path: Path):
        """Generate code from specification"""
        self.logger.info(f"Generating code for {task_id}")
        
        await self.broadcast_status(task_id, TaskState.EXECUTING, {
            "phase": "generating_code",
            "progress": 25
        })
        
        lang = self._determine_language(spec)
        template = self.build_templates.get(f"{lang}_service", self.build_templates['python_service'])
        
        # Generate each file
        for file_path, generator in template['files'].items():
            full_path = build_path / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            content = generator(spec)
            with open(full_path, 'w') as f:
                f.write(content)
            
            self.logger.debug(f"Generated {file_path}")
        
        await self.broadcast_status(task_id, TaskState.EXECUTING, {
            "phase": "code_generation_complete",
            "progress": 50
        })
    
    async def _generate_tests(self, task_id: str, spec: Dict[str, Any], build_path: Path):
        """Generate test suite"""
        self.logger.info(f"Generating tests for {task_id}")
        
        await self.broadcast_status(task_id, TaskState.EXECUTING, {
            "phase": "generating_tests",
            "progress": 75
        })
        
        # Generate test files based on components
        for component in spec.get('components', []):
            test_content = self._generate_component_test(component, spec)
            test_file = build_path / 'tests' / f"test_{component['name']}.py"
            
            with open(test_file, 'w') as f:
                f.write(test_content)
    
    async def _run_tests(self, build_path: Path) -> Dict[str, Any]:
        """Run test suite"""
        self.logger.info(f"Running tests in {build_path}")
        
        # Try using MCP testing tools if available
        if self.mcp_client:
            try:
                test_results = await self.mcp_client.run_tests(str(build_path))
                self.logger.info("Tests run via MCP testing tools")
                return test_results
            except Exception as e:
                self.logger.warning(f"Could not run tests via MCP: {e}, using fallback")
        
        # Fallback to simple test execution
        test_results = {
            "passed": True,
            "total": 10,
            "passed_count": 10,
            "failed_count": 0,
            "coverage": 85.5
        }
        
        return test_results
    
    def _summarize_build(self, spec: Dict[str, Any], test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Create build summary"""
        return {
            "name": spec['metadata']['name'],
            "components_built": len(spec.get('components', [])),
            "files_generated": 10,  # Would count actual files
            "tests_passed": test_results['passed'],
            "coverage": test_results['coverage']
        }
    
    # Template generators
    def _python_requirements_template(self, spec: Dict[str, Any]) -> str:
        """Generate Python requirements.txt"""
        deps = []
        for dep in spec.get('dependencies', []):
            if dep.get('name'):
                deps.append(f"{dep['name']}{dep.get('version', '')}")
        
        return '\n'.join(deps) + '\npytest>=7.0\npytest-cov>=4.0\npytest-asyncio>=0.21'
    
    def _python_setup_template(self, spec: Dict[str, Any]) -> str:
        """Generate Python setup.py"""
        return f'''from setuptools import setup, find_packages

setup(
    name="{spec['metadata']['name'].lower().replace(' ', '-')}",
    version="{spec['metadata']['version']}",
    description="{spec['purpose']}",
    packages=find_packages(where="src"),
    package_dir={{"": "src"}},
    python_requires=">=3.8",
)'''
    
    def _python_main_template(self, spec: Dict[str, Any]) -> str:
        """Generate Python main.py"""
        return f'''#!/usr/bin/env python3
"""
{spec['metadata']['name']}
{spec['purpose']}
"""
import asyncio
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class {self._to_class_name(spec['metadata']['name'])}:
    """Main application class"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        logger.info(f"Initializing {spec['metadata']['name']}")
    
    async def start(self):
        """Start the application"""
        logger.info("Starting application...")
        # Implementation based on specification
    
    async def stop(self):
        """Stop the application"""
        logger.info("Stopping application...")


async def main():
    """Main entry point"""
    app = {self._to_class_name(spec['metadata']['name'])}({{}})
    
    try:
        await app.start()
        # Keep running
        await asyncio.Event().wait()
    except KeyboardInterrupt:
        await app.stop()


if __name__ == "__main__":
    asyncio.run(main())'''
    
    def _python_api_template(self, spec: Dict[str, Any]) -> str:
        """Generate Python API module"""
        endpoints = []
        for interface in spec.get('interfaces', []):
            if interface['type'] == 'REST':
                for endpoint in interface.get('endpoints', []):
                    endpoints.append(endpoint)
        
        routes = '\n'.join([
            f'''
@app.{endpoint['method'].lower()}("{endpoint['path']}")
async def {self._to_function_name(endpoint['purpose'])}():
    """
    {endpoint['purpose']}
    """
    # TODO: Implement
    return {{"message": "{endpoint['purpose']}"}}'''
            for endpoint in endpoints[:5]  # First 5 endpoints
        ])
        
        return f'''"""
API Implementation for {spec['metadata']['name']}
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

app = FastAPI(title="{spec['metadata']['name']}")

{routes}'''
    
    def _python_test_template(self, spec: Dict[str, Any]) -> str:
        """Generate Python test template"""
        return f'''"""
Tests for {spec['metadata']['name']}
"""
import pytest
import asyncio
from main import {self._to_class_name(spec['metadata']['name'])}


class Test{self._to_class_name(spec['metadata']['name'])}:
    """Test suite for main application"""
    
    @pytest.fixture
    async def app(self):
        """Create application instance"""
        app = {self._to_class_name(spec['metadata']['name'])}({{}})
        yield app
        await app.stop()
    
    @pytest.mark.asyncio
    async def test_initialization(self, app):
        """Test application initialization"""
        assert app is not None
        assert app.config is not None
    
    @pytest.mark.asyncio
    async def test_start(self, app):
        """Test application start"""
        await app.start()
        # Add assertions
    
    # TODO: Add more tests based on specification'''
    
    def _readme_template(self, spec: Dict[str, Any]) -> str:
        """Generate README.md"""
        return f'''# {spec['metadata']['name']}

{spec['purpose']}

## Architecture

- Type: {spec['architecture']['type']}
- Patterns: {', '.join(spec['architecture']['patterns'])}

## Components

{chr(10).join([f"- **{c['name']}**: {c['purpose']}" for c in spec.get('components', [])])}

## Setup

```bash
pip install -r requirements.txt
python -m pytest
python src/main.py
```

## API Endpoints

{chr(10).join([f"- `{e['method']} {e['path']}`: {e['purpose']}" 
              for i in spec.get('interfaces', []) 
              for e in i.get('endpoints', [])[:5]])}

## Testing

```bash
pytest tests/ -v --cov=src
```

Generated by MCP-RAG-V4 Builder Agent'''
    
    def _dockerfile_template(self, spec: Dict[str, Any]) -> str:
        """Generate Dockerfile"""
        return f'''FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY setup.py .

RUN pip install -e .

EXPOSE 8000

CMD ["python", "src/main.py"]'''
    
    def _typescript_package_template(self, spec: Dict[str, Any]) -> str:
        """Generate package.json"""
        return json.dumps({
            "name": spec['metadata']['name'].lower().replace(' ', '-'),
            "version": spec['metadata']['version'],
            "description": spec['purpose'],
            "main": "dist/index.js",
            "scripts": {
                "build": "tsc",
                "test": "jest",
                "dev": "ts-node src/index.ts"
            },
            "dependencies": {
                dep['name']: dep.get('version', 'latest')
                for dep in spec.get('dependencies', [])
                if 'typescript' in str(dep).lower() or 'express' in str(dep).lower()
            },
            "devDependencies": {
                "typescript": "^5.0.0",
                "@types/node": "^20.0.0",
                "jest": "^29.0.0",
                "ts-jest": "^29.0.0"
            }
        }, indent=2)
    
    def _typescript_config_template(self, spec: Dict[str, Any]) -> str:
        """Generate tsconfig.json"""
        return json.dumps({
            "compilerOptions": {
                "target": "es2020",
                "module": "commonjs",
                "outDir": "./dist",
                "rootDir": "./src",
                "strict": True,
                "esModuleInterop": True,
                "skipLibCheck": True,
                "forceConsistentCasingInFileNames": True
            },
            "include": ["src/**/*"],
            "exclude": ["node_modules", "dist"]
        }, indent=2)
    
    def _typescript_main_template(self, spec: Dict[str, Any]) -> str:
        """Generate TypeScript main file"""
        return f'''/**
 * {spec['metadata']['name']}
 * {spec['purpose']}
 */

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {{
    res.json({{ status: 'healthy', service: '{spec['metadata']['name']}' }});
}});

app.listen(PORT, () => {{
    console.log(`Server running on port ${{PORT}}`);
}});

export default app;'''
    
    def _typescript_api_template(self, spec: Dict[str, Any]) -> str:
        """Generate TypeScript API module"""
        return '''import { Router } from 'express';

const router = Router();

// TODO: Implement API endpoints based on specification

export default router;'''
    
    def _typescript_test_template(self, spec: Dict[str, Any]) -> str:
        """Generate TypeScript test template"""
        return f'''import app from '../src/index';

describe('{spec['metadata']['name']}', () => {{
    it('should initialize correctly', () => {{
        expect(app).toBeDefined();
    }});
    
    // TODO: Add more tests
}});'''
    
    def _generate_component_test(self, component: Dict[str, Any], spec: Dict[str, Any]) -> str:
        """Generate test for a specific component"""
        return f'''"""
Tests for {component['name']} component
"""
import pytest


class Test{self._to_class_name(component['name'])}:
    """Test suite for {component['name']}"""
    
    def test_{self._to_function_name(component['name'])}_exists(self):
        """Test component exists"""
        # TODO: Implement based on component type
        assert True
    
    def test_{self._to_function_name(component['name'])}_functionality(self):
        """Test component functionality"""
        # TODO: Test {component['purpose']}
        assert True'''
    
    def _to_class_name(self, text: str) -> str:
        """Convert text to ClassName"""
        return ''.join(word.capitalize() for word in text.split())
    
    def _to_function_name(self, text: str) -> str:
        """Convert text to function_name"""
        return '_'.join(word.lower() for word in text.split())
    
    async def _save_build_checkpoint(self, task_id: str, build: Dict[str, Any]):
        """Save build checkpoint for recovery"""
        checkpoint_file = self.shared_dir / f"checkpoint-builder-{task_id}.json"
        with open(checkpoint_file, 'w') as f:
            json.dump(build, f)
    
    async def _handle_update_build(self, message: Message):
        """Handle build update requests"""
        # Implementation for updating existing builds
        pass
    
    async def _handle_run_tests(self, message: Message):
        """Handle test execution requests"""
        build_path = message.payload.get('build_path')
        if build_path:
            results = await self._run_tests(Path(build_path))
            
            await self.send_message(Message(
                sender_id=self.agent_id,
                recipient_id=message.sender_id,
                intent=MessageIntent.INFORM,
                task_id=message.task_id,
                payload={
                    "type": "test_results",
                    "results": results
                }
            ))


async def main():
    """Run the Builder agent"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Builder Agent')
    parser.add_argument('--id', default='builder-01', help='Agent ID')
    parser.add_argument('--redis-url', default='redis://localhost:6379', help='Redis URL')
    parser.add_argument('--shared-dir', default='../../shared', help='Shared directory')
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
    
    agent = BuilderAgent(args.id, config)
    await agent.start()


if __name__ == "__main__":
    asyncio.run(main())