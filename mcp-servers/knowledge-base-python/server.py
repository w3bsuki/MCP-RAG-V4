#!/usr/bin/env python3
"""
Knowledge Base MCP Server with HTTP API
Handles markdown docs, patterns, and knowledge retrieval
"""
import json
import os
import asyncio
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime
from aiohttp import web
import threading

from mcp.server import Server
from mcp.types import Tool, TextContent
import mcp.server.stdio

# Initialize server
server = Server("knowledge-base")

# HTTP API for agents
app = web.Application()
routes = web.RouteTableDef()

# Knowledge storage
KNOWLEDGE_ROOT = Path(os.environ.get("KNOWLEDGE_ROOT", "./knowledge"))
KNOWLEDGE_ROOT.mkdir(exist_ok=True)

# Simple JSON database
KNOWLEDGE_DB = KNOWLEDGE_ROOT / "knowledge.json"

def load_knowledge() -> List[Dict[str, Any]]:
    """Load knowledge from JSON file"""
    if not KNOWLEDGE_DB.exists():
        return []
    
    try:
        with open(KNOWLEDGE_DB, 'r') as f:
            data = json.load(f)
        return data.get("items", [])
    except:
        return []

def save_knowledge(items: List[Dict[str, Any]]):
    """Save knowledge to JSON file"""
    try:
        with open(KNOWLEDGE_DB, 'w') as f:
            json.dump({"items": items}, f, indent=2)
    except Exception as e:
        print(f"Error saving knowledge: {e}")

@server.list_tools()
async def list_tools() -> List[Tool]:
    """List available tools"""
    return [
        Tool(
            name="store_knowledge",
            description="Store a knowledge item with content and metadata",
            inputSchema={
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "The knowledge content to store"
                    },
                    "title": {
                        "type": "string", 
                        "description": "Title for the knowledge item"
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tags for categorization"
                    },
                    "category": {
                        "type": "string",
                        "enum": ["pattern", "learning", "reference", "solution"],
                        "description": "Knowledge category"
                    }
                },
                "required": ["content"]
            }
        ),
        Tool(
            name="search_knowledge",
            description="Search the knowledge base for relevant information",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results",
                        "default": 10
                    },
                    "category": {
                        "type": "string",
                        "enum": ["pattern", "learning", "reference", "solution"],
                        "description": "Filter by category"
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="list_knowledge",
            description="List all knowledge items",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of items",
                        "default": 20
                    }
                }
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle tool calls"""
    
    if name == "store_knowledge":
        content = arguments.get("content", "")
        title = arguments.get("title", f"Knowledge Item {len(load_knowledge()) + 1}")
        tags = arguments.get("tags", [])
        category = arguments.get("category", "reference")
        
        # Create new knowledge item
        new_item = {
            "id": len(load_knowledge()) + 1,
            "title": title,
            "content": content,
            "tags": tags,
            "category": category,
            "created_at": datetime.now().isoformat()
        }
        
        # Store it
        items = load_knowledge()
        items.append(new_item)
        save_knowledge(items)
        
        return [TextContent(
            type="text",
            text=json.dumps({
                "status": "success",
                "message": "Knowledge stored successfully",
                "item": new_item
            }, indent=2)
        )]
    
    elif name == "search_knowledge":
        query = arguments.get("query", "").lower()
        limit = arguments.get("limit", 10)
        category_filter = arguments.get("category")
        
        # Load knowledge
        items = load_knowledge()
        
        # Filter and search
        results = []
        for item in items:
            # Category filter
            if category_filter and item.get("category") != category_filter:
                continue
            
            # Text search
            content = item.get("content", "").lower()
            title = item.get("title", "").lower()
            tags = " ".join(item.get("tags", [])).lower()
            
            if query in content or query in title or query in tags:
                results.append(item)
                if len(results) >= limit:
                    break
        
        return [TextContent(
            type="text",
            text=json.dumps({
                "results": results,
                "total": len(results),
                "query": query
            }, indent=2)
        )]
    
    elif name == "list_knowledge":
        limit = arguments.get("limit", 20)
        items = load_knowledge()
        
        return [TextContent(
            type="text",
            text=json.dumps({
                "items": items[:limit],
                "total": len(items)
            }, indent=2)
        )]
    
    else:
        return [TextContent(
            type="text",
            text=f"Unknown tool: {name}"
        )]

# HTTP API Endpoints
@routes.post('/store_knowledge')
async def http_store_knowledge(request):
    """HTTP endpoint for storing knowledge"""
    data = await request.json()
    content = data.get('content', '')
    metadata = data.get('metadata', {})
    
    # Use the existing store logic
    items = load_knowledge()
    new_item = {
        "id": len(items) + 1,
        "title": metadata.get('title', f"Knowledge Item {len(items) + 1}"),
        "content": content,
        "tags": metadata.get('tags', []),
        "category": metadata.get('category', 'reference'),
        "created_at": datetime.now().isoformat()
    }
    items.append(new_item)
    save_knowledge(items)
    
    return web.json_response({"status": "success", "id": new_item["id"]})

@routes.post('/search_knowledge')
async def http_search_knowledge(request):
    """HTTP endpoint for searching knowledge"""
    data = await request.json()
    query = data.get('query', '').lower()
    limit = data.get('limit', 10)
    
    # Use the existing search logic
    items = load_knowledge()
    results = []
    for item in items:
        content = item.get("content", "").lower()
        title = item.get("title", "").lower()
        if query in content or query in title:
            results.append(item)
            if len(results) >= limit:
                break
    
    return web.json_response({"results": results})

@routes.get('/health')
async def health_check(request):
    """Health check endpoint"""
    return web.json_response({"status": "ok", "service": "knowledge-base"})

app.add_routes(routes)

async def start_http_server():
    """Start HTTP server on port 8501"""
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8501)
    await site.start()
    print("HTTP API running on http://localhost:8501")

async def main():
    """Run both MCP and HTTP servers"""
    print(f"Starting Knowledge Base MCP Server...")
    print(f"Knowledge root: {KNOWLEDGE_ROOT}")
    
    # Start HTTP server in background
    asyncio.create_task(start_http_server())
    
    # Run MCP server
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            {}
        )

if __name__ == "__main__":
    asyncio.run(main())