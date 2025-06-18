#!/usr/bin/env python3
"""
Knowledge Base MCP Server
Handles markdown docs, patterns, and knowledge retrieval
"""
import json
import os
import asyncio
import threading
import time
from pathlib import Path
from typing import Dict, List, Any
import hashlib
from datetime import datetime

from mcp import Server
from mcp.types import Tool, Resource, TextContent, ErrorData
import mcp.server.stdio

# Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge, start_http_server, CollectorRegistry, generate_latest
from fastapi import FastAPI
from fastapi.responses import Response
import uvicorn

# Initialize metrics
registry = CollectorRegistry()
tool_calls_total = Counter('mcp_tool_calls_total', 'Total MCP tool calls', ['tool_name', 'status'], registry=registry)
tool_call_duration = Histogram('mcp_tool_call_duration_seconds', 'MCP tool call duration', ['tool_name'], registry=registry)
server_uptime = Gauge('mcp_server_uptime_seconds', 'Server uptime in seconds', registry=registry)
knowledge_items_total = Gauge('mcp_knowledge_items_total', 'Total knowledge items stored', registry=registry)

start_time = time.time()

# Metrics HTTP server
app = FastAPI()

@app.get("/metrics")
async def metrics():
    server_uptime.set(time.time() - start_time)
    return Response(generate_latest(registry), media_type="text/plain")

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "server": "knowledge-base-server",
        "uptime": time.time() - start_time,
        "timestamp": datetime.now().isoformat()
    }

def start_metrics_server():
    metrics_port = int(os.environ.get("PYTHON_METRICS_PORT", "9200"))
    uvicorn.run(app, host="0.0.0.0", port=metrics_port, log_level="warning")

# Start metrics server in background thread
metrics_thread = threading.Thread(target=start_metrics_server, daemon=True)
metrics_thread.start()

# Initialize server
server = Server("knowledge-base")
KNOWLEDGE_ROOT = Path(os.environ.get("KNOWLEDGE_ROOT", "./knowledge"))

@server.list_tools()
async def list_tools() -> List[Tool]:
    return [
        Tool(
            name="store_knowledge",
            description="Store a knowledge item with tags and metadata",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "content": {"type": "string"},
                    "category": {"type": "string", "enum": ["pattern", "learning", "reference", "solution"]},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "source": {"type": "string"},
                },
                "required": ["title", "content", "category", "tags"]
            }
        ),
        Tool(
            name="search_knowledge",
            description="Search knowledge base by query and filters",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "category": {"type": "string", "enum": ["pattern", "learning", "reference", "solution"]},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "limit": {"type": "integer", "default": 10}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="get_knowledge",
            description="Get a specific knowledge item by ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "id": {"type": "string"}
                },
                "required": ["id"]
            }
        ),
        Tool(
            name="extract_patterns",
            description="Extract patterns from code or documentation",
            inputSchema={
                "type": "object",
                "properties": {
                    "content": {"type": "string"},
                    "language": {"type": "string"},
                    "min_frequency": {"type": "integer", "default": 2}
                },
                "required": ["content"]
            }
        )
    ]

# Metrics decorator for tool calls
def with_metrics(tool_name):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                tool_calls_total.labels(tool_name=tool_name, status='success').inc()
                tool_call_duration.labels(tool_name=tool_name).observe(duration)
                return result
            except Exception as e:
                duration = time.time() - start_time
                tool_calls_total.labels(tool_name=tool_name, status='error').inc()
                tool_call_duration.labels(tool_name=tool_name).observe(duration)
                raise e
        return wrapper
    return decorator

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    # Wrap with metrics
    @with_metrics(name)
    async def handle_tool_call():
        try:
        if name == "store_knowledge":
            return await store_knowledge(arguments)
        elif name == "search_knowledge":
            return await search_knowledge(arguments)
        elif name == "get_knowledge":
            return await get_knowledge(arguments)
        elif name == "extract_patterns":
            return await extract_patterns(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")
        except Exception as e:
            return [TextContent(type="text", text=json.dumps({"error": str(e)}))]
    
    # Execute the wrapped function
    return await handle_tool_call()

async def store_knowledge(args: Dict[str, Any]) -> List[TextContent]:
    """Store a knowledge item"""
    category_dir = KNOWLEDGE_ROOT / args["category"]
    category_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate ID
    content_hash = hashlib.sha256(args["content"].encode()).hexdigest()[:8]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    item_id = f"{args['category']}_{timestamp}_{content_hash}"
    
    # Create knowledge item
    knowledge_item = {
        "id": item_id,
        "title": args["title"],
        "content": args["content"],
        "category": args["category"],
        "tags": args["tags"],
        "source": args.get("source", "unknown"),
        "created_at": datetime.now().isoformat(),
        "metadata": {
            "word_count": len(args["content"].split()),
            "char_count": len(args["content"]),
            "hash": content_hash
        }
    }
    
    # Save as JSON and Markdown
    json_path = category_dir / f"{item_id}.json"
    md_path = category_dir / f"{item_id}.md"
    
    json_path.write_text(json.dumps(knowledge_item, indent=2))
    
    # Create markdown version
    md_content = f"""# {args['title']}

**Category:** {args['category']}
**Tags:** {', '.join(args['tags'])}
**Source:** {args.get('source', 'unknown')}
**Created:** {knowledge_item['created_at']}

## Content

{args['content']}

---
*ID: {item_id}*
"""
    md_path.write_text(md_content)
    
    return [TextContent(type="text", text=json.dumps({
        "success": True,
        "id": item_id,
        "path": str(json_path)
    }))]

async def search_knowledge(args: Dict[str, Any]) -> List[TextContent]:
    """Search knowledge base"""
    results = []
    query = args["query"].lower()
    category_filter = args.get("category")
    tag_filter = set(args.get("tags", []))
    limit = args.get("limit", 10)
    
    # Search through all categories or specific one
    search_dirs = [KNOWLEDGE_ROOT / category_filter] if category_filter else KNOWLEDGE_ROOT.glob("*/")
    
    for category_dir in search_dirs:
        if not category_dir.is_dir():
            continue
            
        for json_file in category_dir.glob("*.json"):
            try:
                item = json.loads(json_file.read_text())
                
                # Check query match
                if query not in item["title"].lower() and query not in item["content"].lower():
                    continue
                
                # Check tag filter
                if tag_filter and not tag_filter.intersection(set(item["tags"])):
                    continue
                
                # Calculate relevance score
                title_matches = item["title"].lower().count(query)
                content_matches = item["content"].lower().count(query)
                score = (title_matches * 3) + content_matches
                
                results.append({
                    "id": item["id"],
                    "title": item["title"],
                    "category": item["category"],
                    "tags": item["tags"],
                    "score": score,
                    "preview": item["content"][:200] + "..." if len(item["content"]) > 200 else item["content"]
                })
            except Exception:
                continue
    
    # Sort by score and limit
    results.sort(key=lambda x: x["score"], reverse=True)
    results = results[:limit]
    
    return [TextContent(type="text", text=json.dumps({
        "query": args["query"],
        "count": len(results),
        "results": results
    }, indent=2))]

async def get_knowledge(args: Dict[str, Any]) -> List[TextContent]:
    """Get specific knowledge item"""
    item_id = args["id"]
    
    # Search all categories
    for category_dir in KNOWLEDGE_ROOT.glob("*/"):
        json_path = category_dir / f"{item_id}.json"
        if json_path.exists():
            item = json.loads(json_path.read_text())
            return [TextContent(type="text", text=json.dumps(item, indent=2))]
    
    return [TextContent(type="text", text=json.dumps({
        "error": f"Knowledge item {item_id} not found"
    }))]

async def extract_patterns(args: Dict[str, Any]) -> List[TextContent]:
    """Extract patterns from content"""
    content = args["content"]
    language = args.get("language", "unknown")
    min_frequency = args.get("min_frequency", 2)
    
    patterns = []
    
    # Simple pattern extraction (can be enhanced with AST parsing)
    lines = content.split("\n")
    
    # Extract imports/includes
    import_patterns = {}
    for line in lines:
        if "import" in line or "require" in line or "#include" in line:
            import_patterns[line.strip()] = import_patterns.get(line.strip(), 0) + 1
    
    # Extract function definitions
    function_patterns = {}
    for line in lines:
        if "function" in line or "def " in line or "func " in line:
            function_patterns[line.strip()] = function_patterns.get(line.strip(), 0) + 1
    
    # Extract common code blocks (simplified)
    code_blocks = {}
    for i in range(len(lines) - 2):
        block = "\n".join(lines[i:i+3])
        if len(block.strip()) > 20:  # Meaningful blocks only
            code_blocks[block] = code_blocks.get(block, 0) + 1
    
    # Filter by frequency
    for pattern_type, pattern_dict in [
        ("import", import_patterns),
        ("function", function_patterns),
        ("code_block", code_blocks)
    ]:
        for pattern, count in pattern_dict.items():
            if count >= min_frequency:
                patterns.append({
                    "type": pattern_type,
                    "pattern": pattern,
                    "frequency": count,
                    "language": language
                })
    
    return [TextContent(type="text", text=json.dumps({
        "language": language,
        "total_patterns": len(patterns),
        "patterns": sorted(patterns, key=lambda x: x["frequency"], reverse=True)
    }, indent=2))]

@server.list_resources()
async def list_resources() -> List[Resource]:
    """List available knowledge categories"""
    resources = []
    
    for category_dir in KNOWLEDGE_ROOT.glob("*/"):
        if category_dir.is_dir():
            count = len(list(category_dir.glob("*.json")))
            resources.append(Resource(
                uri=f"knowledge://{category_dir.name}",
                name=f"{category_dir.name.title()} Knowledge",
                description=f"{count} items in {category_dir.name} category",
                mimeType="application/json"
            ))
    
    return resources

async def main():
    """Run the server"""
    KNOWLEDGE_ROOT.mkdir(parents=True, exist_ok=True)
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())