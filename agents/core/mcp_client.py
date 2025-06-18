#!/usr/bin/env python3
"""
MCP Client Integration for Agents
Provides seamless access to MCP servers from agent runtime
"""
import asyncio
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import subprocess
import tempfile
from dataclasses import dataclass

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


@dataclass
class MCPServerConfig:
    """Configuration for an MCP server"""
    name: str
    command: str
    args: List[str]
    env: Dict[str, str] = None
    cwd: str = None
    description: str = ""


class MCPClient:
    """
    MCP Client for agent integration
    Manages connections to multiple MCP servers
    """
    
    def __init__(self, config_path: str = None):
        self.logger = logging.getLogger("mcp_client")
        self.sessions: Dict[str, ClientSession] = {}
        self.server_configs: Dict[str, MCPServerConfig] = {}
        self.config_path = config_path or "/home/w3bsuki/MCP-RAG-V4/.mcp.json"
        
        # Load server configurations
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
            
            servers = config.get('mcpServers', {})
            for name, server_config in servers.items():
                self.server_configs[name] = MCPServerConfig(
                    name=name,
                    command=server_config['command'],
                    args=server_config.get('args', []),
                    env=server_config.get('env', {}),
                    cwd=server_config.get('cwd'),
                    description=server_config.get('description', '')
                )
                
            self.logger.info(f"Loaded {len(self.server_configs)} MCP server configs")
            
        except Exception as e:
            self.logger.error(f"Failed to load MCP config: {e}")
    
    async def connect_server(self, server_name: str) -> bool:
        """Connect to an MCP server"""
        if server_name not in self.server_configs:
            self.logger.error(f"Unknown server: {server_name}")
            return False
        
        if server_name in self.sessions:
            self.logger.debug(f"Already connected to {server_name}")
            return True
        
        config = self.server_configs[server_name]
        
        try:
            # Prepare environment
            env = {**config.env} if config.env else {}
            if 'PYTHONPATH' not in env:
                env['PYTHONPATH'] = '/home/w3bsuki/MCP-RAG-V4'
            
            # Create server parameters
            server_params = StdioServerParameters(
                command=config.command,
                args=config.args,
                env=env,
                cwd=config.cwd
            )
            
            # Connect via stdio using context manager properly
            async with stdio_client(server_params) as (read, write):
                session = ClientSession(read, write)
                
                # Initialize session
                await session.initialize()
                
                self.sessions[server_name] = session
                self.logger.info(f"Connected to MCP server: {server_name}")
                return True
            
        except Exception as e:
            self.logger.error(f"Failed to connect to {server_name}: {e}")
            return False
    
    async def disconnect_server(self, server_name: str):
        """Disconnect from an MCP server"""
        if server_name in self.sessions:
            try:
                session = self.sessions[server_name]
                await session.close()
                del self.sessions[server_name]
                self.logger.info(f"Disconnected from {server_name}")
            except Exception as e:
                self.logger.error(f"Error disconnecting from {server_name}: {e}")
    
    async def disconnect_all(self):
        """Disconnect from all MCP servers"""
        for server_name in list(self.sessions.keys()):
            await self.disconnect_server(server_name)
    
    async def call_tool(self, server_name: str, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Call a tool on an MCP server"""
        if server_name not in self.sessions:
            if not await self.connect_server(server_name):
                raise RuntimeError(f"Cannot connect to server: {server_name}")
        
        session = self.sessions[server_name]
        
        try:
            result = await session.call_tool(tool_name, arguments)
            self.logger.debug(f"Tool call successful: {server_name}.{tool_name}")
            return result
            
        except Exception as e:
            self.logger.error(f"Tool call failed: {server_name}.{tool_name} - {e}")
            raise
    
    async def list_tools(self, server_name: str) -> List[Dict[str, Any]]:
        """List available tools on a server"""
        if server_name not in self.sessions:
            if not await self.connect_server(server_name):
                raise RuntimeError(f"Cannot connect to server: {server_name}")
        
        session = self.sessions[server_name]
        
        try:
            result = await session.list_tools()
            return [tool.dict() for tool in result.tools]
        except Exception as e:
            self.logger.error(f"Failed to list tools for {server_name}: {e}")
            return []
    
    async def list_resources(self, server_name: str) -> List[Dict[str, Any]]:
        """List available resources on a server"""
        if server_name not in self.sessions:
            if not await self.connect_server(server_name):
                raise RuntimeError(f"Cannot connect to server: {server_name}")
        
        session = self.sessions[server_name]
        
        try:
            result = await session.list_resources()
            return [resource.dict() for resource in result.resources]
        except Exception as e:
            self.logger.error(f"Failed to list resources for {server_name}: {e}")
            return []
    
    async def read_resource(self, server_name: str, uri: str) -> Any:
        """Read a resource from a server"""
        if server_name not in self.sessions:
            if not await self.connect_server(server_name):
                raise RuntimeError(f"Cannot connect to server: {server_name}")
        
        session = self.sessions[server_name]
        
        try:
            result = await session.read_resource(uri)
            return result
        except Exception as e:
            self.logger.error(f"Failed to read resource {uri} from {server_name}: {e}")
            raise
    
    # Convenience methods for common operations
    async def search_knowledge(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search knowledge base"""
        return await self.call_tool(
            'knowledge-base',
            'search_knowledge',
            {'query': query, 'limit': limit}
        )
    
    async def store_knowledge(self, content: str, metadata: Dict[str, Any] = None) -> str:
        """Store knowledge in knowledge base"""
        return await self.call_tool(
            'knowledge-base',
            'store_knowledge',
            {'content': content, 'metadata': metadata or {}}
        )
    
    async def vector_search(self, query: str, limit: int = 10, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Perform vector search"""
        return await self.call_tool(
            'vector-search',
            'search',
            {'query': query, 'limit': limit, 'filters': filters or {}}
        )
    
    async def store_document(self, content: str, metadata: Dict[str, Any] = None) -> str:
        """Store document for vector search"""
        return await self.call_tool(
            'vector-search',
            'store_document',
            {'content': content, 'metadata': metadata or {}}
        )
    
    async def get_tasks(self) -> List[Dict[str, Any]]:
        """Get active tasks from coordination hub"""
        return await self.call_tool(
            'coordination-hub',
            'get_tasks',
            {}
        )
    
    async def update_task(self, task_id: str, status: str, data: Dict[str, Any] = None) -> bool:
        """Update task status in coordination hub"""
        return await self.call_tool(
            'coordination-hub',
            'update_task',
            {'task_id': task_id, 'status': status, 'data': data or {}}
        )
    
    async def read_file(self, path: str) -> str:
        """Read file using filesystem server"""
        return await self.call_tool(
            'filesystem',
            'read_file',
            {'path': path}
        )
    
    async def write_file(self, path: str, content: str) -> bool:
        """Write file using filesystem server"""
        return await self.call_tool(
            'filesystem',
            'write_file',
            {'path': path, 'content': content}
        )
    
    async def list_directory(self, path: str) -> List[str]:
        """List directory using filesystem server"""
        return await self.call_tool(
            'filesystem',
            'list_directory',
            {'path': path}
        )
    
    async def run_tests(self, test_path: str = None) -> Dict[str, Any]:
        """Run tests using testing tools server"""
        return await self.call_tool(
            'testing-tools',
            'run_tests',
            {'test_path': test_path} if test_path else {}
        )
    
    async def lint_code(self, file_path: str) -> Dict[str, Any]:
        """Lint code using testing tools server"""
        return await self.call_tool(
            'testing-tools',
            'lint_code',
            {'file_path': file_path}
        )
    
    def get_connected_servers(self) -> List[str]:
        """Get list of connected servers"""
        return list(self.sessions.keys())
    
    def get_available_servers(self) -> List[str]:
        """Get list of available servers"""
        return list(self.server_configs.keys())


# Global MCP client instance for agents
_mcp_client: Optional[MCPClient] = None


def get_mcp_client() -> MCPClient:
    """Get global MCP client instance"""
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = MCPClient()
    return _mcp_client


async def initialize_mcp_client(config_path: str = None) -> MCPClient:
    """Initialize and return MCP client"""
    global _mcp_client
    _mcp_client = MCPClient(config_path)
    return _mcp_client


async def shutdown_mcp_client():
    """Shutdown global MCP client"""
    global _mcp_client
    if _mcp_client:
        await _mcp_client.disconnect_all()
        _mcp_client = None