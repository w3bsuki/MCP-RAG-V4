#!/usr/bin/env python3
"""
Vector Search MCP Server
Integrates with Qdrant for semantic search
"""
import json
import os
from typing import Dict, List, Any, Optional
import hashlib
from datetime import datetime

from mcp import Server
from mcp.types import Tool, Resource, TextContent
import mcp.server.stdio

# Qdrant imports
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer

# Initialize server
server = Server("vector-search")

# Configuration
QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = os.environ.get("COLLECTION_NAME", "knowledge")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

# Initialize clients
qdrant_client = None
embedder = None

async def initialize():
    """Initialize Qdrant and embedding model"""
    global qdrant_client, embedder
    
    try:
        qdrant_client = QdrantClient(url=QDRANT_URL)
        embedder = SentenceTransformer(EMBEDDING_MODEL)
        
        # Create collection if not exists
        collections = qdrant_client.get_collections().collections
        if not any(c.name == COLLECTION_NAME for c in collections):
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE)
            )
    except Exception as e:
        print(f"Failed to initialize: {e}")

@server.list_tools()
async def list_tools() -> List[Tool]:
    return [
        Tool(
            name="embed_and_store",
            description="Embed text and store in vector database",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "metadata": {"type": "object"},
                    "id": {"type": "string"}
                },
                "required": ["text", "metadata"]
            }
        ),
        Tool(
            name="semantic_search",
            description="Search for similar content using vector similarity",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "limit": {"type": "integer", "default": 10},
                    "score_threshold": {"type": "number", "default": 0.7}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="hybrid_search",
            description="Combine semantic and keyword search",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "keywords": {"type": "array", "items": {"type": "string"}},
                    "limit": {"type": "integer", "default": 10}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="delete_vectors",
            description="Delete vectors by ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "ids": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["ids"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    if not qdrant_client:
        await initialize()
    
    try:
        if name == "embed_and_store":
            return await embed_and_store(arguments)
        elif name == "semantic_search":
            return await semantic_search(arguments)
        elif name == "hybrid_search":
            return await hybrid_search(arguments)
        elif name == "delete_vectors":
            return await delete_vectors(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")
    except Exception as e:
        return [TextContent(type="text", text=json.dumps({"error": str(e)}))]

async def embed_and_store(args: Dict[str, Any]) -> List[TextContent]:
    """Embed text and store in Qdrant"""
    text = args["text"]
    metadata = args["metadata"]
    
    # Generate ID if not provided
    point_id = args.get("id") or hashlib.sha256(text.encode()).hexdigest()[:16]
    
    # Create embedding
    embedding = embedder.encode(text).tolist()
    
    # Store in Qdrant
    qdrant_client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    **metadata,
                    "text": text,
                    "timestamp": datetime.now().isoformat()
                }
            )
        ]
    )
    
    return [TextContent(type="text", text=json.dumps({
        "success": True,
        "id": point_id,
        "vector_size": len(embedding)
    }))]

async def semantic_search(args: Dict[str, Any]) -> List[TextContent]:
    """Perform semantic search"""
    query = args["query"]
    limit = args.get("limit", 10)
    score_threshold = args.get("score_threshold", 0.7)
    
    # Create query embedding
    query_vector = embedder.encode(query).tolist()
    
    # Search
    results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        limit=limit,
        score_threshold=score_threshold
    )
    
    # Format results
    formatted_results = []
    for result in results:
        formatted_results.append({
            "id": result.id,
            "score": result.score,
            "text": result.payload.get("text", ""),
            "metadata": {k: v for k, v in result.payload.items() if k != "text"}
        })
    
    return [TextContent(type="text", text=json.dumps({
        "query": query,
        "count": len(formatted_results),
        "results": formatted_results
    }, indent=2))]

async def hybrid_search(args: Dict[str, Any]) -> List[TextContent]:
    """Combine semantic and keyword search"""
    query = args["query"]
    keywords = args.get("keywords", [])
    limit = args.get("limit", 10)
    
    # Get semantic results
    query_vector = embedder.encode(query).tolist()
    
    # Search with optional keyword filter
    filter_conditions = None
    if keywords:
        # This is simplified - real implementation would use proper filters
        filter_conditions = {
            "should": [
                {"key": "text", "match": {"text": keyword}}
                for keyword in keywords
            ]
        }
    
    results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        limit=limit * 2,  # Get more to filter
        query_filter=filter_conditions
    )
    
    # Score boost for keyword matches
    formatted_results = []
    for result in results[:limit]:
        score = result.score
        text = result.payload.get("text", "").lower()
        
        # Boost score for keyword matches
        keyword_boost = sum(1 for kw in keywords if kw.lower() in text) * 0.1
        final_score = min(score + keyword_boost, 1.0)
        
        formatted_results.append({
            "id": result.id,
            "score": final_score,
            "semantic_score": score,
            "keyword_matches": [kw for kw in keywords if kw.lower() in text],
            "text": result.payload.get("text", ""),
            "metadata": {k: v for k, v in result.payload.items() if k != "text"}
        })
    
    # Re-sort by final score
    formatted_results.sort(key=lambda x: x["score"], reverse=True)
    
    return [TextContent(type="text", text=json.dumps({
        "query": query,
        "keywords": keywords,
        "count": len(formatted_results),
        "results": formatted_results
    }, indent=2))]

async def delete_vectors(args: Dict[str, Any]) -> List[TextContent]:
    """Delete vectors by ID"""
    ids = args["ids"]
    
    qdrant_client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=ids
    )
    
    return [TextContent(type="text", text=json.dumps({
        "success": True,
        "deleted": len(ids)
    }))]

@server.list_resources()
async def list_resources() -> List[Resource]:
    """List collection info"""
    if not qdrant_client:
        await initialize()
    
    try:
        info = qdrant_client.get_collection(COLLECTION_NAME)
        return [Resource(
            uri=f"qdrant://{COLLECTION_NAME}",
            name=f"Vector Collection: {COLLECTION_NAME}",
            description=f"Points: {info.points_count}, Vectors: {info.vectors_count}",
            mimeType="application/json"
        )]
    except:
        return []

async def main():
    """Run the server"""
    await initialize()
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())