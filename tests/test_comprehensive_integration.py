#!/usr/bin/env python3
"""
Comprehensive Integration Tests for MCP-RAG-V4
Tests full stack functionality including MCP servers, RAG system, and coordination
"""
import pytest
import asyncio
import json
import subprocess
import time
import requests
import tempfile
import os
from pathlib import Path
from typing import Dict, Any
import docker
import psutil

class TestFullStackIntegration:
    """Full stack integration tests"""
    
    @pytest.fixture(scope="class")
    def docker_client(self):
        """Get Docker client"""
        try:
            client = docker.from_env()
            return client
        except Exception as e:
            pytest.skip(f"Docker not available: {e}")
    
    @pytest.fixture(scope="class")
    def setup_environment(self, docker_client):
        """Setup test environment with Docker stack"""
        # Start Docker Compose stack
        compose_file = Path(__file__).parent.parent / "perfect-claude-env" / "docker-compose.yml"
        
        if not compose_file.exists():
            pytest.skip("Docker compose file not found")
        
        # Start the stack
        result = subprocess.run([
            "docker-compose", "-f", str(compose_file), 
            "up", "-d", "--build"
        ], capture_output=True, text=True, cwd=compose_file.parent)
        
        if result.returncode != 0:
            pytest.fail(f"Failed to start Docker stack: {result.stderr}")
        
        # Wait for services to be healthy
        max_wait = 60
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            try:
                # Check Qdrant
                response = requests.get("http://localhost:6333/health", timeout=5)
                if response.status_code == 200:
                    break
            except:
                pass
            time.sleep(2)
        else:
            pytest.fail("Services did not become healthy within timeout")
        
        yield
        
        # Cleanup
        subprocess.run([
            "docker-compose", "-f", str(compose_file), "down", "-v"
        ], capture_output=True, cwd=compose_file.parent)
    
    def test_qdrant_health(self, setup_environment):
        """Test Qdrant vector database health"""
        response = requests.get("http://localhost:6333/health")
        assert response.status_code == 200
        
        # Test collections endpoint
        response = requests.get("http://localhost:6333/collections")
        assert response.status_code == 200
    
    def test_redis_health(self, setup_environment):
        """Test Redis cache health"""
        import redis
        
        try:
            r = redis.Redis(host='localhost', port=6379, decode_responses=True)
            result = r.ping()
            assert result is True
        except Exception as e:
            pytest.fail(f"Redis connection failed: {e}")
    
    def test_prometheus_metrics(self, setup_environment):
        """Test Prometheus metrics collection"""
        # Wait a bit for metrics to be generated
        time.sleep(5)
        
        response = requests.get("http://localhost:9090/-/healthy")
        assert response.status_code == 200
        
        # Test metrics endpoint
        response = requests.get("http://localhost:9090/api/v1/targets")
        assert response.status_code == 200
        
        targets = response.json()["data"]["activeTargets"]
        assert len(targets) > 0
    
    def test_grafana_health(self, setup_environment):
        """Test Grafana dashboard availability"""
        response = requests.get("http://localhost:3000/api/health")
        assert response.status_code == 200
        
        health_data = response.json()
        assert health_data["database"] == "ok"

class TestMCPServers:
    """Test MCP server functionality"""
    
    @pytest.fixture
    def temp_workspace(self):
        """Create temporary workspace for testing"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            
            # Create test files
            (tmp_path / "test.txt").write_text("Hello, World!")
            (tmp_path / "subdir").mkdir()
            (tmp_path / "subdir" / "nested.txt").write_text("Nested content")
            
            yield tmp_path
    
    def test_mcp_server_ports(self):
        """Test that MCP servers are listening on expected ports"""
        expected_ports = {
            8080: "knowledge-base",
            8081: "vector-search", 
            8082: "filesystem-secure",
            8086: "testing-tools",
            9100: "node-metrics",
            9200: "python-metrics"
        }
        
        for port, service in expected_ports.items():
            # Check if port is open
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('localhost', port))
            sock.close()
            
            if result != 0:
                pytest.fail(f"{service} not listening on port {port}")
    
    def test_metrics_endpoints(self):
        """Test that metrics endpoints are working"""
        # Test Node.js metrics (port 9100)
        try:
            response = requests.get("http://localhost:9100/metrics", timeout=5)
            assert response.status_code == 200
            assert "mcp_tool_calls_total" in response.text
        except Exception as e:
            pytest.fail(f"Node metrics endpoint failed: {e}")
        
        # Test Python metrics (port 9200)
        try:
            response = requests.get("http://localhost:9200/metrics", timeout=5)
            assert response.status_code == 200
            assert "mcp_tool_calls_total" in response.text
        except Exception as e:
            pytest.fail(f"Python metrics endpoint failed: {e}")
    
    def test_health_endpoints(self):
        """Test health check endpoints"""
        health_endpoints = [
            "http://localhost:9100/health",
            "http://localhost:9200/health"
        ]
        
        for endpoint in health_endpoints:
            try:
                response = requests.get(endpoint, timeout=5)
                assert response.status_code == 200
                
                health_data = response.json()
                assert health_data["status"] == "healthy"
                assert "uptime" in health_data
            except Exception as e:
                pytest.fail(f"Health endpoint {endpoint} failed: {e}")

class TestRAGSystem:
    """Test RAG (Retrieval Augmented Generation) functionality"""
    
    @pytest.fixture
    def sample_document(self):
        """Create a sample document for testing"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("""
            MCP-RAG-V4 System Architecture
            
            This system implements a multi-agent architecture using Model Context Protocol (MCP).
            The system consists of three main agents:
            
            1. Architect Agent - Responsible for system design and specifications
            2. Builder Agent - Implements the architectural designs
            3. Validator Agent - Tests and validates implementations
            
            The system uses Qdrant for vector storage and Redis for caching.
            """)
            yield f.name
        
        # Cleanup
        os.unlink(f.name)
    
    def test_rag_ingest_workflow(self, sample_document, setup_environment):
        """Test the complete RAG ingestion workflow"""
        # Test document ingestion
        script_path = Path(__file__).parent.parent / "scripts" / "rag_ingest.py"
        
        result = subprocess.run([
            "python", str(script_path), sample_document
        ], capture_output=True, text=True)
        
        assert result.returncode == 0, f"RAG ingestion failed: {result.stderr}"
        assert "ingested successfully" in result.stdout.lower()
    
    def test_rag_search_functionality(self, setup_environment):
        """Test RAG search functionality"""
        script_path = Path(__file__).parent.parent / "scripts" / "rag_search.py"
        
        result = subprocess.run([
            "python", str(script_path), "multi-agent architecture"
        ], capture_output=True, text=True)
        
        # Search might return no results if no documents are indexed, which is OK
        assert result.returncode == 0, f"RAG search failed: {result.stderr}"
    
    def test_rag_status(self, setup_environment):
        """Test RAG system status reporting"""
        script_path = Path(__file__).parent.parent / "scripts" / "rag_status.py"
        
        result = subprocess.run([
            "python", str(script_path)
        ], capture_output=True, text=True)
        
        assert result.returncode == 0, f"RAG status failed: {result.stderr}"
        assert "qdrant server" in result.stdout.lower()

class TestCoordinationSystem:
    """Test agent coordination functionality"""
    
    def test_active_tasks_file(self):
        """Test that ACTIVE_TASKS.json is valid and accessible"""
        tasks_file = Path(__file__).parent.parent / "coordination" / "ACTIVE_TASKS.json"
        
        assert tasks_file.exists(), "ACTIVE_TASKS.json not found"
        
        # Validate JSON structure
        with open(tasks_file) as f:
            tasks_data = json.load(f)
        
        required_keys = ["version", "system", "tasks", "agents"]
        for key in required_keys:
            assert key in tasks_data, f"Missing required key: {key}"
        
        # Validate agent structure
        assert "architect" in tasks_data["agents"]
        assert "builder" in tasks_data["agents"]  
        assert "validator" in tasks_data["agents"]
    
    def test_agent_workspaces(self):
        """Test that agent workspaces are properly setup"""
        base_path = Path(__file__).parent.parent / ".worktrees"
        
        required_agents = ["architect-branch", "builder-branch", "validator-branch"]
        
        for agent in required_agents:
            agent_path = base_path / agent
            assert agent_path.exists(), f"Agent workspace not found: {agent}"
            assert agent_path.is_dir(), f"Agent workspace is not a directory: {agent}"
            
            # Check for README
            readme_path = agent_path / "README.md"
            assert readme_path.exists(), f"Agent README not found: {agent}"

class TestSecurityFeatures:
    """Test security implementations"""
    
    def test_security_config_exists(self):
        """Test that security configuration exists"""
        config_path = Path(__file__).parent.parent / "perfect-claude-env" / "config" / "security-config.json"
        
        if config_path.exists():
            with open(config_path) as f:
                config = json.load(f)
            
            required_keys = ["whitelist_paths", "blacklist_paths", "require_confirmation"]
            for key in required_keys:
                assert key in config, f"Missing security config key: {key}"
    
    def test_secrets_management(self):
        """Test secrets management system"""
        secrets_manager = Path(__file__).parent.parent / "perfect-claude-env" / "config" / "secrets-manager.py"
        assert secrets_manager.exists(), "Secrets manager not found"
        
        # Test that it can be imported
        try:
            import sys
            sys.path.append(str(secrets_manager.parent))
            import secrets_manager as sm
            
            # Test basic functionality
            manager = sm.SecretsManager()
            assert hasattr(manager, 'get_secret')
            assert hasattr(manager, 'get_required_secret')
        except Exception as e:
            pytest.fail(f"Secrets manager import/usage failed: {e}")

class TestScripts:
    """Test utility scripts functionality"""
    
    def test_bootstrap_script(self):
        """Test bootstrap script exists and is executable"""
        script_path = Path(__file__).parent.parent / "scripts" / "bootstrap.sh"
        assert script_path.exists(), "Bootstrap script not found"
        assert script_path.stat().st_mode & 0o111, "Bootstrap script not executable"
    
    def test_makefile_targets(self):
        """Test that Makefile has required targets"""
        makefile = Path(__file__).parent.parent / "Makefile"
        assert makefile.exists(), "Makefile not found"
        
        content = makefile.read_text()
        required_targets = [
            "help", "start", "stop", "status", "health",
            "rag-ingest", "rag-search", "rag-status", 
            "test", "clean"
        ]
        
        for target in required_targets:
            assert f"{target}:" in content, f"Missing Makefile target: {target}"

class TestEnvironmentConfig:
    """Test environment configuration"""
    
    def test_env_example_exists(self):
        """Test that .env.example exists with required variables"""
        env_example = Path(__file__).parent.parent / ".env.example"
        assert env_example.exists(), ".env.example not found"
        
        content = env_example.read_text()
        required_vars = [
            "QDRANT_URL", "REDIS_URL", "PROMETHEUS_URL", 
            "GITHUB_TOKEN", "NODE_METRICS_PORT", "PYTHON_METRICS_PORT"
        ]
        
        for var in required_vars:
            assert var in content, f"Missing environment variable: {var}"
    
    def test_mcp_config_exists(self):
        """Test that .mcp.json configuration exists"""
        mcp_config = Path(__file__).parent.parent / ".mcp.json"
        assert mcp_config.exists(), ".mcp.json not found"
        
        with open(mcp_config) as f:
            config = json.load(f)
        
        assert "mcpServers" in config, "Missing mcpServers configuration"
        assert "permissions" in config, "Missing permissions configuration"
        assert "agents" in config, "Missing agents configuration"

def test_overall_system_health():
    """Test overall system health and integration"""
    # This is a meta-test that runs a quick health check
    issues = []
    
    # Check critical files exist
    critical_files = [
        "package.json",
        "Makefile", 
        ".mcp.json",
        ".env.example",
        "coordination/ACTIVE_TASKS.json"
    ]
    
    base_path = Path(__file__).parent.parent
    for file_path in critical_files:
        if not (base_path / file_path).exists():
            issues.append(f"Missing critical file: {file_path}")
    
    # Check directory structure
    critical_dirs = [
        ".worktrees",
        "scripts", 
        "perfect-claude-env/mcp-servers",
        "coordination",
        "shared"
    ]
    
    for dir_path in critical_dirs:
        if not (base_path / dir_path).exists():
            issues.append(f"Missing critical directory: {dir_path}")
    
    if issues:
        pytest.fail("System health check failed:\n" + "\n".join(issues))

if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"])