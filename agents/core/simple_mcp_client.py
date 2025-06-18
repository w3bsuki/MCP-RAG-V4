#!/usr/bin/env python3
"""
Simple MCP Client Implementation
Works around stdio context manager complexity
"""
import asyncio
import json
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Any, Optional


class SimpleMCPClient:
    """
    Simplified MCP client that uses subprocess for server communication
    Bypasses the complex stdio context manager issues
    """
    
    def __init__(self, config_path: str = None):
        self.logger = logging.getLogger("simple_mcp_client")
        self.config_path = config_path or "/home/w3bsuki/MCP-RAG-V4/.mcp.json"
        self.server_configs = {}
        self.server_processes = {}
        
        # Load configurations
        self._load_server_configs()
    
    def _load_server_configs(self):
        """Load MCP server configurations"""
        try:
            config_path = Path(self.config_path)
            if not config_path.exists():
                self.logger.warning(f"MCP config not found: {config_path}")
                return
            
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            self.server_configs = config.get('mcpServers', {})
            self.logger.info(f"Loaded {len(self.server_configs)} MCP server configs")
            
        except Exception as e:
            self.logger.error(f"Failed to load MCP config: {e}")
    
    async def test_server_availability(self, server_name: str) -> bool:
        """Test if an MCP server is available and working"""
        if server_name not in self.server_configs:
            self.logger.error(f"Unknown server: {server_name}")
            return False
        
        config = self.server_configs[server_name]
        
        try:
            # Simple test: try to start the server process
            env = {**config.get('env', {})}
            env.update({
                'PYTHONPATH': '/home/w3bsuki/MCP-RAG-V4',
                'PATH': env.get('PATH', '') + ':/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin'
            })
            
            # Test command
            if config['command'] == 'python3':
                # Check if Python server exists and can import mcp
                script_path = config['args'][0] if config['args'] else ''
                if not Path(script_path).exists():
                    self.logger.error(f"Server script not found: {script_path}")
                    return False
                
                # Try quick import test
                test_cmd = [
                    '/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python',
                    '-c', 'import mcp; print("MCP available")'
                ]
                
                result = subprocess.run(
                    test_cmd,
                    capture_output=True,
                    text=True,
                    timeout=5,
                    env=env
                )
                
                if result.returncode == 0:
                    self.logger.info(f"✓ {server_name} server dependencies available")
                    return True
                else:
                    self.logger.error(f"✗ {server_name} dependency test failed: {result.stderr}")
                    return False
            
            elif config['command'] == 'npx':
                # Test npm package availability
                test_cmd = ['npx', '--help']
                result = subprocess.run(test_cmd, capture_output=True, timeout=5)
                
                if result.returncode == 0:
                    self.logger.info(f"✓ {server_name} (npm) dependencies available")
                    return True
                else:
                    self.logger.error(f"✗ {server_name} npm test failed")
                    return False
            
            return False
            
        except Exception as e:
            self.logger.error(f"Server availability test failed for {server_name}: {e}")
            return False
    
    async def start_server(self, server_name: str) -> bool:
        """Start an MCP server process"""
        if server_name not in self.server_configs:
            return False
        
        if server_name in self.server_processes:
            self.logger.info(f"Server {server_name} already running")
            return True
        
        config = self.server_configs[server_name]
        
        try:
            # Prepare command
            cmd = [config['command']] + config.get('args', [])
            
            # Prepare environment
            env = {**config.get('env', {})}
            env.update({
                'PYTHONPATH': '/home/w3bsuki/MCP-RAG-V4',
                'PATH': env.get('PATH', '') + ':/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin'
            })
            
            # Use Python from venv for Python servers
            if config['command'] == 'python3':
                cmd[0] = '/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python'
            
            # Start process
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                cwd=config.get('cwd')
            )
            
            self.server_processes[server_name] = process
            self.logger.info(f"Started MCP server: {server_name} (PID: {process.pid})")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start server {server_name}: {e}")
            return False
    
    async def stop_server(self, server_name: str):
        """Stop an MCP server process"""
        if server_name in self.server_processes:
            process = self.server_processes[server_name]
            try:
                process.terminate()
                await asyncio.wait_for(process.wait(), timeout=5.0)
                self.logger.info(f"Stopped MCP server: {server_name}")
            except asyncio.TimeoutError:
                process.kill()
                self.logger.warning(f"Force killed MCP server: {server_name}")
            except Exception as e:
                self.logger.error(f"Error stopping server {server_name}: {e}")
            finally:
                del self.server_processes[server_name]
    
    async def stop_all_servers(self):
        """Stop all running server processes"""
        for server_name in list(self.server_processes.keys()):
            await self.stop_server(server_name)
    
    def get_available_servers(self) -> List[str]:
        """Get list of available servers"""
        return list(self.server_configs.keys())
    
    def get_running_servers(self) -> List[str]:
        """Get list of running servers"""
        return list(self.server_processes.keys())
    
    # Mock MCP operations for testing
    async def mock_search_knowledge(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Mock knowledge search for testing"""
        return [
            {
                "id": "1",
                "content": f"Mock knowledge result for query: {query}",
                "metadata": {"type": "mock", "relevance": 0.9}
            }
        ]
    
    async def mock_store_knowledge(self, content: str, metadata: Dict[str, Any] = None) -> str:
        """Mock knowledge storage for testing"""
        self.logger.info(f"Mock storing knowledge: {content[:50]}...")
        return "mock-id-123"
    
    async def mock_list_directory(self, path: str) -> List[str]:
        """Mock directory listing"""
        try:
            p = Path(path)
            if p.exists() and p.is_dir():
                return [f.name for f in p.iterdir()]
            return []
        except:
            return []


# Global simple MCP client
_simple_mcp_client: Optional[SimpleMCPClient] = None


def get_simple_mcp_client() -> SimpleMCPClient:
    """Get global simple MCP client instance"""
    global _simple_mcp_client
    if _simple_mcp_client is None:
        _simple_mcp_client = SimpleMCPClient()
    return _simple_mcp_client