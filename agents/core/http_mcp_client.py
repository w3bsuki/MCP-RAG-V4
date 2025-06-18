#!/usr/bin/env python3
"""
HTTP MCP Client for Agents
Direct HTTP communication with MCP servers - no stdio protocol issues
"""
import aiohttp
import asyncio
import json
import logging
from typing import Dict, List, Any, Optional


class HTTPMCPClient:
    """
    HTTP-based MCP client that actually works
    Bypasses all stdio protocol issues
    """
    
    def __init__(self):
        self.logger = logging.getLogger("http_mcp_client")
        self.servers = {
            "knowledge-base": "http://localhost:8501",
            "vector-search": "http://localhost:8502",
            "coordination-hub": "http://localhost:8503"
        }
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def ensure_session(self):
        """Ensure we have an active session"""
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    async def health_check(self, server_name: str) -> bool:
        """Check if server is healthy"""
        await self.ensure_session()
        
        try:
            url = f"{self.servers[server_name]}/health"
            async with self.session.get(url, timeout=2) as resp:
                return resp.status == 200
        except:
            return False
    
    # Knowledge Base Methods
    async def store_knowledge(self, content: str, metadata: Dict[str, Any] = None) -> str:
        """Store knowledge in knowledge base"""
        await self.ensure_session()
        
        url = f"{self.servers['knowledge-base']}/store_knowledge"
        payload = {
            "content": content,
            "metadata": metadata or {}
        }
        
        try:
            async with self.session.post(url, json=payload) as resp:
                result = await resp.json()
                return result.get("id", "")
        except Exception as e:
            self.logger.error(f"Failed to store knowledge: {e}")
            raise
    
    async def search_knowledge(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search knowledge base"""
        await self.ensure_session()
        
        url = f"{self.servers['knowledge-base']}/search_knowledge"
        payload = {
            "query": query,
            "limit": limit
        }
        
        try:
            async with self.session.post(url, json=payload) as resp:
                result = await resp.json()
                return result.get("results", [])
        except Exception as e:
            self.logger.error(f"Failed to search knowledge: {e}")
            return []
    
    # Vector Search Methods
    async def store_document(self, content: str, metadata: Dict[str, Any] = None) -> str:
        """Store document for vector search"""
        await self.ensure_session()
        
        url = f"{self.servers['vector-search']}/store_document"
        payload = {
            "content": content,
            "metadata": metadata or {}
        }
        
        try:
            async with self.session.post(url, json=payload) as resp:
                result = await resp.json()
                return result.get("id", "")
        except Exception as e:
            self.logger.error(f"Failed to store document: {e}")
            raise
    
    async def vector_search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Perform vector search"""
        await self.ensure_session()
        
        url = f"{self.servers['vector-search']}/search"
        payload = {
            "query": query,
            "limit": limit
        }
        
        try:
            async with self.session.post(url, json=payload) as resp:
                result = await resp.json()
                return result.get("results", [])
        except Exception as e:
            self.logger.error(f"Failed to perform vector search: {e}")
            return []
    
    # Coordination Hub Methods
    async def get_tasks(self) -> List[Dict[str, Any]]:
        """Get active tasks"""
        await self.ensure_session()
        
        url = f"{self.servers['coordination-hub']}/tasks"
        
        try:
            async with self.session.get(url) as resp:
                result = await resp.json()
                return result.get("tasks", [])
        except Exception as e:
            self.logger.error(f"Failed to get tasks: {e}")
            return []
    
    async def update_task(self, task_id: str, status: str, data: Dict[str, Any] = None) -> bool:
        """Update task status"""
        await self.ensure_session()
        
        url = f"{self.servers['coordination-hub']}/tasks/{task_id}"
        payload = {
            "status": status,
            "data": data or {}
        }
        
        try:
            async with self.session.put(url, json=payload) as resp:
                return resp.status == 200
        except Exception as e:
            self.logger.error(f"Failed to update task: {e}")
            return False
    
    async def close(self):
        """Close the HTTP session"""
        if self.session:
            await self.session.close()


# Global client instance
_http_client: Optional[HTTPMCPClient] = None


def get_http_mcp_client() -> HTTPMCPClient:
    """Get global HTTP MCP client instance"""
    global _http_client
    if _http_client is None:
        _http_client = HTTPMCPClient()
    return _http_client