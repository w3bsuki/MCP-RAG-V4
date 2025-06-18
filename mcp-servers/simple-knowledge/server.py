#!/usr/bin/env python3
"""
Simple Knowledge Base MCP Server
Minimal implementation that actually works with Claude's MCP client
"""
import asyncio
import json
import os
from pathlib import Path
from typing import Any, Dict, List

from mcp import Server
from mcp.types import (
    Tool,
    TextContent,
    CallToolRequest,
    ListToolsRequest,
)
import mcp.server.stdio


# Initialize server
server = Server("knowledge-base")

# Knowledge storage
KNOWLEDGE_ROOT = Path(os.getenv("KNOWLEDGE_ROOT", "./knowledge"))
KNOWLEDGE_ROOT.mkdir(exist_ok=True)
KNOWLEDGE_DB = KNOWLEDGE_ROOT / "db.json"

# Initialize knowledge database
if not KNOWLEDGE_DB.exists():
    with open(KNOWLEDGE_DB, 'w') as f:
        json.dump({"items": []}, f)


def load_knowledge() -> List[Dict[str, Any]]:
    """Load knowledge from JSON file"""
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
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="store_knowledge",
            description="Store new knowledge in the knowledge base",
            inputSchema={
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "Knowledge content to store"
                    },
                    "title": {
                        "type": "string",
                        "description": "Title for the knowledge item"
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tags for categorization"
                    }
                },
                "required": ["content"]
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
                        "description": "Maximum number of items to return",
                        "default": 20
                    }
                }
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle tool calls"""
    
    if name == "search_knowledge":
        query = arguments.get("query", "")
        limit = arguments.get("limit", 10)
        
        # Load knowledge
        items = load_knowledge()
        
        # Simple text search
        results = []
        for item in items:
            content = item.get("content", "").lower()
            title = item.get("title", "").lower()
            
            if query.lower() in content or query.lower() in title:
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
    
    elif name == "store_knowledge":
        content = arguments.get("content", "")
        title = arguments.get("title", f"Knowledge Item {len(load_knowledge()) + 1}")
        tags = arguments.get("tags", [])
        
        # Create new knowledge item
        new_item = {
            "id": len(load_knowledge()) + 1,
            "title": title,
            "content": content,
            "tags": tags,
            "created_at": str(asyncio.get_event_loop().time())
        }
        
        # Store it
        items = load_knowledge()
        items.append(new_item)
        save_knowledge(items)
        
        return [TextContent(
            type="text",
            text=json.dumps({
                "status": "success",
                "item": new_item
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


async def main():
    """Run the server"""
    print("Starting Knowledge Base MCP Server...")
    print(f"Knowledge root: {KNOWLEDGE_ROOT}")
    
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())