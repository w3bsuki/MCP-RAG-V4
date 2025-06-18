#!/usr/bin/env python3
"""
MCP HTTP Bridge Service
Provides HTTP API interface to stdio-based MCP servers
"""
import asyncio
import json
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Request/Response models
class MCPRequest(BaseModel):
    """Generic MCP request"""
    tool: str
    arguments: Dict[str, Any] = Field(default_factory=dict)


class MCPResponse(BaseModel):
    """Generic MCP response"""
    success: bool
    result: Optional[Any] = None
    error: Optional[str] = None


class MCPServerConfig(BaseModel):
    """Configuration for an MCP server"""
    name: str
    command: str
    args: List[str]
    env: Dict[str, str] = Field(default_factory=dict)
    port: int
    description: str = ""


class MCPBridge:
    """Bridge between HTTP and stdio MCP servers"""
    
    def __init__(self, config: MCPServerConfig):
        self.config = config
        self.process: Optional[subprocess.Popen] = None
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self._lock = asyncio.Lock()
        self._message_id = 0
        
    async def start(self):
        """Start the MCP server process"""
        try:
            # Build environment
            env = os.environ.copy()
            env.update(self.config.env)
            
            # Start MCP server process
            self.process = await asyncio.create_subprocess_exec(
                self.config.command,
                *self.config.args,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env
            )
            
            logger.info(f"Started MCP server: {self.config.name}")
            
        except Exception as e:
            logger.error(f"Failed to start MCP server {self.config.name}: {e}")
            raise
    
    async def stop(self):
        """Stop the MCP server process"""
        if self.process:
            self.process.terminate()
            await self.process.wait()
            logger.info(f"Stopped MCP server: {self.config.name}")
    
    async def send_request(self, method: str, params: Dict[str, Any]) -> Any:
        """Send request to MCP server via stdio"""
        async with self._lock:
            if not self.process:
                raise RuntimeError("MCP server not started")
            
            # Create JSON-RPC request
            self._message_id += 1
            request = {
                "jsonrpc": "2.0",
                "method": method,
                "params": params,
                "id": self._message_id
            }
            
            # Send request
            request_str = json.dumps(request) + "\n"
            self.process.stdin.write(request_str.encode())
            await self.process.stdin.drain()
            
            # Read response
            response_line = await self.process.stdout.readline()
            if not response_line:
                raise RuntimeError("No response from MCP server")
            
            response = json.loads(response_line.decode())
            
            # Check for errors
            if "error" in response:
                raise RuntimeError(f"MCP error: {response['error']}")
            
            return response.get("result")
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Call a tool on the MCP server"""
        return await self.send_request("tools/call", {
            "name": tool_name,
            "arguments": arguments
        })
    
    async def list_tools(self) -> List[Dict[str, Any]]:
        """List available tools from the MCP server"""
        return await self.send_request("tools/list", {})


# HTTP API setup
def create_app(bridge: MCPBridge) -> FastAPI:
    """Create FastAPI app for a specific MCP bridge"""
    
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup
        await bridge.start()
        yield
        # Shutdown
        await bridge.stop()
    
    app = FastAPI(
        title=f"{bridge.config.name} HTTP API",
        description=bridge.config.description,
        lifespan=lifespan
    )
    
    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        return {"status": "healthy", "server": bridge.config.name}
    
    @app.get("/tools")
    async def list_tools():
        """List available tools"""
        try:
            tools = await bridge.list_tools()
            return {"tools": tools}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/call")
    async def call_tool(request: MCPRequest):
        """Call an MCP tool"""
        try:
            result = await bridge.call_tool(request.tool, request.arguments)
            return MCPResponse(success=True, result=result)
        except Exception as e:
            logger.error(f"Tool call failed: {e}")
            return MCPResponse(success=False, error=str(e))
    
    # Add server-specific endpoints
    if bridge.config.name == "knowledge-base":
        
        @app.post("/store_knowledge")
        async def store_knowledge(content: str, title: str = None, tags: List[str] = None, category: str = "reference"):
            """Store knowledge item"""
            try:
                result = await bridge.call_tool("store_knowledge", {
                    "content": content,
                    "title": title,
                    "tags": tags or [],
                    "category": category
                })
                return {"id": result.get("item", {}).get("id"), "status": "success"}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @app.post("/search_knowledge")
        async def search_knowledge(query: str, limit: int = 10, category: str = None):
            """Search knowledge base"""
            try:
                result = await bridge.call_tool("search_knowledge", {
                    "query": query,
                    "limit": limit,
                    "category": category
                })
                return result
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
    
    elif bridge.config.name == "vector-search":
        
        @app.post("/store_document")
        async def store_document(content: str, title: str = None, metadata: Dict[str, Any] = None):
            """Store document for vector search"""
            try:
                result = await bridge.call_tool("store_document", {
                    "content": content,
                    "title": title,
                    "metadata": metadata or {}
                })
                return {"id": result.get("document", {}).get("id"), "status": "success"}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @app.post("/search")
        async def vector_search(query: str, limit: int = 10, filters: Dict[str, Any] = None):
            """Perform vector search"""
            try:
                result = await bridge.call_tool("search", {
                    "query": query,
                    "limit": limit,
                    "filters": filters or {}
                })
                return result
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
    
    elif bridge.config.name == "coordination-hub":
        
        @app.get("/tasks")
        async def get_tasks(status: str = None, assigned_to: str = None, limit: int = 50):
            """Get tasks"""
            try:
                result = await bridge.call_tool("get_tasks", {
                    "status": status,
                    "assigned_to": assigned_to,
                    "limit": limit
                })
                return result
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @app.put("/tasks/{task_id}")
        async def update_task(task_id: str, status: str, data: Dict[str, Any] = None):
            """Update task"""
            try:
                result = await bridge.call_tool("update_task", {
                    "task_id": task_id,
                    "status": status,
                    "notes": data.get("notes") if data else None,
                    "progress": data.get("progress") if data else None
                })
                return {"status": "success"}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
    
    return app


# Server configurations
SERVER_CONFIGS = [
    MCPServerConfig(
        name="knowledge-base",
        command=str(Path(__file__).parent.parent / "mcp-venv" / "bin" / "python"),
        args=[str(Path(__file__).parent.parent / "knowledge-base-python" / "server.py")],
        env={
            "KNOWLEDGE_ROOT": str(Path(__file__).parent.parent.parent / "rag-system" / "knowledge"),
            "PYTHONPATH": str(Path(__file__).parent.parent.parent)
        },
        port=8501,
        description="Knowledge storage and pattern extraction"
    ),
    MCPServerConfig(
        name="vector-search",
        command=str(Path(__file__).parent.parent / "mcp-venv" / "bin" / "python"),
        args=[str(Path(__file__).parent.parent / "vector-search-python" / "server.py")],
        env={
            "QDRANT_URL": "http://localhost:6333",
            "EMBEDDING_MODEL": "sentence-transformers/all-MiniLM-L6-v2",
            "PYTHONPATH": str(Path(__file__).parent.parent.parent),
            "STORAGE_DIR": str(Path(__file__).parent.parent.parent / "vectors")
        },
        port=8502,
        description="Semantic search with Qdrant"
    ),
    MCPServerConfig(
        name="coordination-hub",
        command=str(Path(__file__).parent.parent / "mcp-venv" / "bin" / "python"),
        args=[str(Path(__file__).parent.parent / "coordination-hub" / "server.py")],
        env={
            "SHARED_DIR": str(Path(__file__).parent.parent.parent / "shared"),
            "PYTHONPATH": str(Path(__file__).parent.parent.parent)
        },
        port=8503,
        description="Inter-agent coordination and task management"
    )
]


async def run_all_servers():
    """Run all HTTP bridge servers"""
    tasks = []
    
    for config in SERVER_CONFIGS:
        bridge = MCPBridge(config)
        app = create_app(bridge)
        
        # Create server task
        server = uvicorn.Server(
            uvicorn.Config(
                app,
                host="0.0.0.0",
                port=config.port,
                log_level="info"
            )
        )
        
        task = asyncio.create_task(server.serve())
        tasks.append(task)
        
        logger.info(f"Starting HTTP bridge for {config.name} on port {config.port}")
    
    # Wait for all servers
    try:
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        logger.info("Shutting down...")


if __name__ == "__main__":
    asyncio.run(run_all_servers())