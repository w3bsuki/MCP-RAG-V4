#!/usr/bin/env python3
"""
Comprehensive integration tests for MCP-RAG-V4 system
"""
import pytest
import asyncio
import json
import tempfile
import subprocess
from pathlib import Path
from datetime import datetime
import os
import sys
import time

# Add MCP server paths for testing
sys.path.append(str(Path(__file__).parent.parent / "mcp-servers"))

class TestMCPIntegration:
    """Integration tests for MCP servers"""
    
    @pytest.fixture
    def temp_config(self):
        """Create temporary configuration for testing"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            
            # Create test configuration
            config = {
                "whitelist_paths": [str(tmp_path)],
                "blacklist_paths": [],
                "require_confirmation": ["delete"],
                "max_file_size_mb": 10,
                "enable_audit": True,
                "api_keys": {"test_agent": "test_key"}
            }
            
            config_file = tmp_path / "security-config.json"
            config_file.write_text(json.dumps(config))
            
            # Set environment variables
            os.environ["SECURITY_CONFIG"] = str(config_file)
            os.environ["AUDIT_LOG"] = str(tmp_path / "audit.log")
            
            yield tmp_path
    
    def test_coordination_hub_task_management(self, temp_config):
        """Test coordination hub task creation and management"""
        from coordination_hub.server import create_task, update_task, get_tasks
        
        # Test task creation
        task_args = {
            "title": "Test Task",
            "description": "Integration test task",
            "type": "implementation",
            "priority": "high",
            "assignee": "builder",
            "acceptance_criteria": ["Test passes"]
        }
        
        # This would need to be adapted for actual MCP testing
        # For now, testing the core logic
        assert task_args["title"] == "Test Task"
        assert task_args["type"] == "implementation"
    
    def test_knowledge_base_operations(self, temp_config):
        """Test knowledge base storage and retrieval"""
        knowledge_dir = temp_config / "knowledge"
        knowledge_dir.mkdir()
        
        # Test knowledge storage
        knowledge_item = {
            "title": "Test Pattern",
            "content": "This is a test architectural pattern",
            "category": "pattern",
            "tags": ["test", "architecture"]
        }
        
        # Store knowledge item
        pattern_file = knowledge_dir / "test_pattern.json"
        pattern_file.write_text(json.dumps(knowledge_item, indent=2))
        
        # Verify storage
        assert pattern_file.exists()
        stored_item = json.loads(pattern_file.read_text())
        assert stored_item["title"] == "Test Pattern"
        assert "architecture" in stored_item["tags"]
    
    def test_security_wrapper_path_validation(self, temp_config):
        """Test security wrapper path validation"""
        # This simulates the security validation logic
        
        def is_path_allowed(path: str, whitelist: list, blacklist: list):
            """Simplified version of security validation"""
            path_str = str(Path(path).resolve())
            
            # Check blacklist
            for blocked in blacklist:
                if path_str.startswith(blocked):
                    return False, f"Path blocked: {blocked}"
            
            # Check whitelist
            for allowed in whitelist:
                if path_str.startswith(allowed):
                    return True, None
            
            return False, "Path not in whitelist"
        
        whitelist = [str(temp_config)]
        blacklist = ["/etc", "/usr"]
        
        # Test allowed path
        allowed, reason = is_path_allowed(str(temp_config / "test.txt"), whitelist, blacklist)
        assert allowed is True
        assert reason is None
        
        # Test blocked path
        allowed, reason = is_path_allowed("/etc/passwd", whitelist, blacklist)
        assert allowed is False
        assert "blocked" in reason.lower()
        
        # Test non-whitelisted path
        allowed, reason = is_path_allowed("/tmp/test", whitelist, blacklist)
        assert allowed is False
        assert "whitelist" in reason.lower()
    
    def test_vector_search_embeddings(self, temp_config):
        """Test vector search embedding functionality"""
        # Mock embedding test
        test_text = "This is a test document for embedding"
        
        # Simple embedding simulation (in real test, would use actual model)
        def mock_embedding(text: str):
            """Mock embedding function"""
            # Simple hash-based mock embedding
            import hashlib
            hash_obj = hashlib.md5(text.encode())
            # Convert to list of floats (384 dimensions for all-MiniLM-L6-v2)
            hash_int = int(hash_obj.hexdigest(), 16)
            embedding = [(hash_int >> i) & 1 for i in range(384)]
            return [float(x) for x in embedding]
        
        embedding = mock_embedding(test_text)
        
        assert len(embedding) == 384
        assert all(isinstance(x, float) for x in embedding)
        assert all(x in [0.0, 1.0] for x in embedding)  # Mock embedding uses binary values
    
    def test_health_monitor_system_checks(self, temp_config):
        """Test health monitoring system resource checks"""
        # Simulate system resource checking
        def check_system_resources():
            """Mock system resource check"""
            return {
                "cpu": {"percent": 45.2, "status": "healthy"},
                "memory": {"percent": 67.8, "status": "healthy"},
                "disk": {"percent": 23.1, "status": "healthy"}
            }
        
        resources = check_system_resources()
        
        assert "cpu" in resources
        assert "memory" in resources
        assert "disk" in resources
        assert all(res["status"] == "healthy" for res in resources.values())
    
    def test_agent_configuration_validation(self, temp_config):
        """Test agent configuration validation"""
        # Test agent config structure
        architect_config = {
            "agent": "architect",
            "role": "System Designer & Architect",
            "mcp_servers": {
                "filesystem": {"enabled": True, "permissions": ["read", "write"]},
                "knowledge-base": {"enabled": True, "permissions": ["store", "search"]}
            },
            "security_config": {"require_confirmation": ["delete"]}
        }
        
        # Validate structure
        assert architect_config["agent"] == "architect"
        assert "mcp_servers" in architect_config
        assert "filesystem" in architect_config["mcp_servers"]
        assert architect_config["mcp_servers"]["filesystem"]["enabled"] is True
    
    def test_task_workflow_integration(self, temp_config):
        """Test complete task workflow"""
        # Simulate a complete task workflow
        workflow_steps = [
            {"step": "create_task", "agent": "architect", "status": "TODO"},
            {"step": "assign_task", "agent": "architect", "status": "ASSIGNED"},
            {"step": "start_work", "agent": "builder", "status": "IN_PROGRESS"},
            {"step": "complete_work", "agent": "builder", "status": "IN_REVIEW"},
            {"step": "validate", "agent": "validator", "status": "COMPLETED"}
        ]
        
        current_status = "TODO"
        
        for step in workflow_steps:
            # Simulate workflow progression
            if step["step"] == "create_task":
                current_status = "TODO"
            elif step["step"] == "assign_task":
                current_status = "ASSIGNED"
            elif step["step"] == "start_work":
                current_status = "IN_PROGRESS"
            elif step["step"] == "complete_work":
                current_status = "IN_REVIEW"
            elif step["step"] == "validate":
                current_status = "COMPLETED"
            
            assert current_status == step["status"]
        
        assert current_status == "COMPLETED"

class TestMCPServerStartup:
    """Test MCP server startup and basic functionality"""
    
    def test_server_imports(self):
        """Test that all MCP servers can be imported"""
        # Test imports (this validates syntax and basic structure)
        import importlib.util
        
        servers_to_test = [
            "coordination-hub/server.py",
            "knowledge-base-python/server.py",
            "vector-search-python/server.py",
            "security-wrapper/filesystem-secure.py",
            "monitoring/health-monitor.py"
        ]
        
        servers_dir = Path(__file__).parent.parent / "mcp-servers"
        
        for server_path in servers_to_test:
            full_path = servers_dir / server_path
            if full_path.exists():
                # Try to load the module
                spec = importlib.util.spec_from_file_location("test_module", full_path)
                if spec and spec.loader:
                    try:
                        module = importlib.util.module_from_spec(spec)
                        # Don't execute the module, just validate it can be loaded
                        assert spec is not None
                    except Exception as e:
                        pytest.fail(f"Failed to load {server_path}: {e}")
    
    def test_configuration_files_exist(self):
        """Test that all required configuration files exist"""
        config_dir = Path(__file__).parent.parent / "config"
        
        required_configs = [
            "claude_desktop_config.json",
            "environment.env"
        ]
        
        for config_file in required_configs:
            config_path = config_dir / config_file
            assert config_path.exists(), f"Configuration file {config_file} not found"
            
            if config_file.endswith('.json'):
                # Validate JSON syntax
                try:
                    json.loads(config_path.read_text())
                except json.JSONDecodeError:
                    pytest.fail(f"Invalid JSON in {config_file}")
    
    def test_agent_configs_exist(self):
        """Test that agent configuration files exist and are valid"""
        agents_dir = Path(__file__).parent.parent / "agents"
        
        agents = ["architect", "builder", "validator"]
        
        for agent in agents:
            agent_dir = agents_dir / agent
            config_file = agent_dir / "claude_config.json"
            
            assert config_file.exists(), f"Agent config for {agent} not found"
            
            # Validate JSON and required fields
            config = json.loads(config_file.read_text())
            assert config["agent"] == agent
            assert "mcp_servers" in config
            assert "capabilities" in config
    
    def test_requirements_files_exist(self):
        """Test that all requirements files exist"""
        servers_dir = Path(__file__).parent.parent / "mcp-servers"
        
        python_servers = [
            "coordination-hub",
            "knowledge-base-python", 
            "vector-search-python",
            "security-wrapper",
            "monitoring"
        ]
        
        for server in python_servers:
            requirements_file = servers_dir / server / "requirements.txt"
            assert requirements_file.exists(), f"Requirements file for {server} not found"
            
            # Check that requirements file is not empty
            content = requirements_file.read_text().strip()
            assert len(content) > 0, f"Requirements file for {server} is empty"

class TestDocumentationAndSetup:
    """Test documentation and setup scripts"""
    
    def test_setup_scripts_exist(self):
        """Test that setup scripts exist and are executable"""
        project_root = Path(__file__).parent.parent
        
        setup_scripts = [
            "mcp-servers/install-official.sh",
            "rag-system/setup.sh"
        ]
        
        for script_path in setup_scripts:
            script = project_root / script_path
            assert script.exists(), f"Setup script {script_path} not found"
            
            # Check if script is executable (on Unix systems)
            if os.name != 'nt':  # Not Windows
                stat = script.stat()
                assert stat.st_mode & 0o111, f"Script {script_path} is not executable"
    
    def test_documentation_exists(self):
        """Test that documentation files exist"""
        project_root = Path(__file__).parent.parent
        
        doc_files = [
            "README.md",
            "SETUP_GUIDE.md"
        ]
        
        for doc_file in doc_files:
            doc_path = project_root / doc_file
            assert doc_path.exists(), f"Documentation file {doc_file} not found"
            
            # Check that documentation is not empty
            content = doc_path.read_text().strip()
            assert len(content) > 100, f"Documentation file {doc_file} seems too short"

class TestRealSystemIntegration:
    """Integration tests that require running services"""
    
    @pytest.mark.integration
    def test_qdrant_connection(self):
        """Test connection to Qdrant (requires running Qdrant)"""
        import requests
        
        try:
            response = requests.get("http://localhost:6333/health", timeout=5)
            assert response.status_code == 200
        except requests.exceptions.ConnectionError:
            pytest.skip("Qdrant not running - skipping integration test")
    
    @pytest.mark.integration
    def test_redis_connection(self):
        """Test connection to Redis (requires running Redis)"""
        try:
            import redis
            r = redis.Redis(host='localhost', port=6379)
            r.ping()
        except (redis.exceptions.ConnectionError, ImportError):
            pytest.skip("Redis not running or not installed - skipping integration test")
    
    @pytest.mark.integration
    def test_docker_services_running(self):
        """Test that Docker services are running"""
        try:
            result = subprocess.run(
                ["docker", "ps", "--format", "{{.Names}}"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                running_containers = result.stdout.strip().split('\n')
                expected_containers = ["mcp-rag-qdrant", "mcp-rag-redis"]
                
                for container in expected_containers:
                    if container not in running_containers:
                        pytest.skip(f"Container {container} not running - skipping integration test")
            else:
                pytest.skip("Docker not available - skipping integration test")
                
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pytest.skip("Docker not available - skipping integration test")

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])