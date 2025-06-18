#!/usr/bin/env python3
"""
Vector Search MCP Server
Integrates with Qdrant for semantic search across multiple collections
"""
import json
import os
from typing import Dict, List, Any, Optional, Tuple, Union
import hashlib
from datetime import datetime
import redis
import pickle
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import logging

from mcp import Server
from mcp.types import Tool, Resource, TextContent
import mcp.server.stdio

# Qdrant imports
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue, SearchRequest, NamedVector
from sentence_transformers import SentenceTransformer, CrossEncoder

# Prometheus metrics and FastAPI for health/metrics endpoints
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
from fastapi import FastAPI
from fastapi.responses import Response
import uvicorn
import threading
import time

# Import security and logging modules
import sys
sys.path.append('../')
from validation_schemas import (
    VectorSearchRequest, validate_input, TOOL_SCHEMAS
)
from logging_config import setup_logging, log_async_errors

# Initialize logging
loggers = setup_logging("vector-search", "INFO")
main_logger = loggers['main']
security_logger = loggers['security']
performance_logger = loggers['performance']

# Initialize server
server = Server("vector-search")

main_logger.info("Vector Search MCP Server starting", extra={'component': 'startup'})

# Initialize metrics
registry = CollectorRegistry()
tool_calls_total = Counter('mcp_tool_calls_total', 'Total MCP tool calls', ['tool_name', 'status'], registry=registry)
tool_call_duration = Histogram('mcp_tool_call_duration_seconds', 'MCP tool call duration', ['tool_name'], registry=registry)
server_uptime = Gauge('mcp_server_uptime_seconds', 'Server uptime in seconds', registry=registry)
vector_operations_total = Gauge('mcp_vector_operations_total', 'Total vector operations', registry=registry)

metrics_start_time = time.time()

# Metrics HTTP server
app = FastAPI()

@app.get("/metrics")
async def metrics():
    server_uptime.set(time.time() - metrics_start_time)
    return Response(generate_latest(registry), media_type="text/plain")

@app.get("/health")
async def health():
    # Check Qdrant connection
    qdrant_healthy = False
    try:
        if qdrant_client:
            qdrant_client.get_collections()
            qdrant_healthy = True
    except Exception:
        pass
    
    # Check Redis connection
    redis_healthy = False
    try:
        if redis_client:
            redis_client.ping()
            redis_healthy = True
    except Exception:
        pass
    
    return {
        "status": "healthy" if qdrant_healthy else "degraded",
        "server": "vector-search-server",
        "uptime": time.time() - metrics_start_time,
        "timestamp": datetime.now().isoformat(),
        "dependencies": {
            "qdrant": "healthy" if qdrant_healthy else "unhealthy",
            "redis": "healthy" if redis_healthy else "unavailable",
            "embedder": "healthy" if embedder else "uninitialized",
            "reranker": "healthy" if reranker else "unavailable"
        }
    }

def start_metrics_server():
    metrics_port = int(os.environ.get("PYTHON_METRICS_PORT", "9201"))
    uvicorn.run(app, host="0.0.0.0", port=metrics_port, log_level="warning")

# Start metrics server in background thread
metrics_thread = threading.Thread(target=start_metrics_server, daemon=True)
metrics_thread.start()

# Configuration
QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
RERANKER_MODEL = os.environ.get("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")
CACHE_TTL = int(os.environ.get("CACHE_TTL", "3600"))  # 1 hour
MAX_BATCH_SIZE = int(os.environ.get("MAX_BATCH_SIZE", "100"))

# Available collections
COLLECTIONS = {
    "patterns": "Architectural and implementation patterns",
    "specifications": "Technical specifications and API contracts",
    "knowledge": "General knowledge base entries",
    "code_snippets": "Reusable code snippets and examples",
    "decisions": "Architectural decisions and rationales"
}

# Initialize clients
qdrant_client = None
redis_client = None
embedder = None
reranker = None
executor = ThreadPoolExecutor(max_workers=4)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def initialize():
    """Initialize all clients and models"""
    global qdrant_client, redis_client, embedder, reranker
    
    try:
        # Initialize Qdrant client
        qdrant_client = QdrantClient(url=QDRANT_URL)
        logger.info(f"Connected to Qdrant at {QDRANT_URL}")
        
        # Initialize Redis client for caching
        try:
            redis_client = redis.from_url(REDIS_URL, decode_responses=False)
            redis_client.ping()
            logger.info(f"Connected to Redis at {REDIS_URL}")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Continuing without cache.")
            redis_client = None
        
        # Initialize embedder
        embedder = SentenceTransformer(EMBEDDING_MODEL)
        logger.info(f"Loaded embedding model: {EMBEDDING_MODEL}")
        
        # Initialize reranker
        try:
            reranker = CrossEncoder(RERANKER_MODEL)
            logger.info(f"Loaded reranker model: {RERANKER_MODEL}")
        except Exception as e:
            logger.warning(f"Reranker initialization failed: {e}. Continuing without reranking.")
            reranker = None
        
        # Ensure all collections exist
        existing_collections = {c.name for c in qdrant_client.get_collections().collections}
        vector_size = embedder.get_sentence_embedding_dimension()
        
        for collection_name in COLLECTIONS:
            if collection_name not in existing_collections:
                qdrant_client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
                )
                logger.info(f"Created collection: {collection_name}")
            else:
                logger.info(f"Collection already exists: {collection_name}")
                
    except Exception as e:
        logger.error(f"Failed to initialize: {e}")
        raise

# Caching utilities
def get_cache_key(text: str, prefix: str = "embed") -> str:
    """Generate cache key for text"""
    return f"{prefix}:{hashlib.sha256(text.encode()).hexdigest()}"

def get_cached_embedding(text: str) -> Optional[List[float]]:
    """Get cached embedding if available"""
    if not redis_client:
        return None
    
    try:
        key = get_cache_key(text)
        cached = redis_client.get(key)
        if cached:
            return pickle.loads(cached)
    except Exception as e:
        logger.warning(f"Cache retrieval error: {e}")
    return None

def cache_embedding(text: str, embedding: List[float]):
    """Cache embedding"""
    if not redis_client:
        return
    
    try:
        key = get_cache_key(text)
        redis_client.setex(key, CACHE_TTL, pickle.dumps(embedding))
    except Exception as e:
        logger.warning(f"Cache storage error: {e}")

def get_embedding(text: str) -> List[float]:
    """Get embedding with caching"""
    # Check cache first
    cached = get_cached_embedding(text)
    if cached:
        return cached
    
    # Generate embedding
    embedding = embedder.encode(text).tolist()
    
    # Cache for future use
    cache_embedding(text, embedding)
    
    return embedding

def batch_get_embeddings(texts: List[str]) -> List[List[float]]:
    """Get embeddings for multiple texts with caching"""
    embeddings = []
    texts_to_embed = []
    cached_indices = []
    
    # Check cache for each text
    for i, text in enumerate(texts):
        cached = get_cached_embedding(text)
        if cached:
            embeddings.append(cached)
        else:
            texts_to_embed.append(text)
            cached_indices.append(i)
            embeddings.append(None)  # Placeholder
    
    # Generate embeddings for uncached texts
    if texts_to_embed:
        new_embeddings = embedder.encode(texts_to_embed)
        
        # Fill in placeholders and cache
        for i, (idx, text) in enumerate(zip(cached_indices, texts_to_embed)):
            embedding = new_embeddings[i].tolist()
            embeddings[idx] = embedding
            cache_embedding(text, embedding)
    
    return embeddings

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
                    "collection": {"type": "string", "enum": list(COLLECTIONS.keys())},
                    "id": {"type": "string"}
                },
                "required": ["text", "metadata", "collection"]
            }
        ),
        Tool(
            name="batch_embed_and_store",
            description="Embed and store multiple texts efficiently",
            inputSchema={
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "metadata": {"type": "object"},
                                "id": {"type": "string"}
                            },
                            "required": ["text", "metadata"]
                        }
                    },
                    "collection": {"type": "string", "enum": list(COLLECTIONS.keys())}
                },
                "required": ["items", "collection"]
            }
        ),
        Tool(
            name="semantic_search",
            description="Search for similar content using vector similarity",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "collections": {
                        "type": "array", 
                        "items": {"type": "string", "enum": list(COLLECTIONS.keys())},
                        "description": "Collections to search. If empty, searches all collections."
                    },
                    "limit": {"type": "integer", "default": 10},
                    "score_threshold": {"type": "number", "default": 0.7},
                    "agent": {"type": "string"}
                },
                "required": ["query", "agent"]
            }
        ),
        Tool(
            name="cross_collection_search",
            description="Search across multiple collections and aggregate results",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "collections": {
                        "type": "array",
                        "items": {"type": "string", "enum": list(COLLECTIONS.keys())}
                    },
                    "limit_per_collection": {"type": "integer", "default": 5},
                    "total_limit": {"type": "integer", "default": 20},
                    "rerank": {"type": "boolean", "default": True}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="hybrid_search",
            description="Combine semantic and keyword search with reranking",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "keywords": {"type": "array", "items": {"type": "string"}},
                    "collections": {
                        "type": "array",
                        "items": {"type": "string", "enum": list(COLLECTIONS.keys())}
                    },
                    "limit": {"type": "integer", "default": 10},
                    "rerank": {"type": "boolean", "default": True}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="delete_vectors",
            description="Delete vectors by ID from specified collection",
            inputSchema={
                "type": "object",
                "properties": {
                    "ids": {"type": "array", "items": {"type": "string"}},
                    "collection": {"type": "string", "enum": list(COLLECTIONS.keys())}
                },
                "required": ["ids", "collection"]
            }
        ),
        Tool(
            name="get_collection_info",
            description="Get information about collections",
            inputSchema={
                "type": "object",
                "properties": {
                    "collections": {
                        "type": "array",
                        "items": {"type": "string", "enum": list(COLLECTIONS.keys())},
                        "description": "Collections to get info for. If empty, returns info for all."
                    }
                }
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    if not qdrant_client:
        await initialize()
    
    # Validate input if schema exists
    if name in TOOL_SCHEMAS:
        try:
            validated_args = validate_input(TOOL_SCHEMAS[name], arguments)
            arguments = validated_args.dict()
            main_logger.info(f"Input validation passed for {name}", extra={'tool_name': name})
        except ValueError as e:
            security_logger.log_security_violation(
                agent=arguments.get('agent', 'unknown'),
                violation_type='invalid_input',
                details={'tool': name, 'error': str(e), 'args': arguments}
            )
            return [TextContent(type="text", text=json.dumps({"error": f"Validation failed: {str(e)}"}))]
    
    try:
        if name == "embed_and_store":
            return await embed_and_store(arguments)
        elif name == "batch_embed_and_store":
            return await batch_embed_and_store(arguments)
        elif name == "semantic_search":
            return await semantic_search(arguments)
        elif name == "cross_collection_search":
            return await cross_collection_search(arguments)
        elif name == "hybrid_search":
            return await hybrid_search(arguments)
        elif name == "delete_vectors":
            return await delete_vectors(arguments)
        elif name == "get_collection_info":
            return await get_collection_info(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")
    except Exception as e:
        main_logger.error(f"Tool execution failed: {name}", extra={'tool_name': name, 'error': str(e)}, exc_info=True)
        return [TextContent(type="text", text=json.dumps({"error": str(e)}))]

@log_async_errors(main_logger)
async def embed_and_store(args: Dict[str, Any]) -> List[TextContent]:
    """Embed text and store in specified collection"""
    text = args["text"]
    metadata = args["metadata"]
    collection = args["collection"]
    
    # Validate collection
    if collection not in COLLECTIONS:
        raise ValueError(f"Invalid collection: {collection}")
    
    # Generate ID if not provided
    point_id = args.get("id") or hashlib.sha256(f"{collection}:{text}".encode()).hexdigest()[:16]
    
    # Get embedding with caching
    embedding = get_embedding(text)
    
    # Store in Qdrant
    qdrant_client.upsert(
        collection_name=collection,
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
    
    # Log successful storage
    security_logger.log_access(
        agent=args.get('agent', 'unknown'),
        tool_name='embed_and_store',
        args={'collection': collection, 'id': point_id},
        result='success'
    )
    
    main_logger.info(f"Vector stored successfully", extra={'collection': collection, 'vector_id': point_id})
    
    return [TextContent(type="text", text=json.dumps({
        "success": True,
        "collection": collection,
        "id": point_id,
        "vector_size": len(embedding)
    }))]

async def batch_embed_and_store(args: Dict[str, Any]) -> List[TextContent]:
    """Batch embed and store multiple texts efficiently"""
    items = args["items"]
    collection = args["collection"]
    
    # Validate collection
    if collection not in COLLECTIONS:
        raise ValueError(f"Invalid collection: {collection}")
    
    # Process in batches
    results = []
    for i in range(0, len(items), MAX_BATCH_SIZE):
        batch = items[i:i + MAX_BATCH_SIZE]
        texts = [item["text"] for item in batch]
        
        # Get embeddings with caching
        embeddings = batch_get_embeddings(texts)
        
        # Prepare points
        points = []
        for j, (item, embedding) in enumerate(zip(batch, embeddings)):
            point_id = item.get("id") or hashlib.sha256(
                f"{collection}:{item['text']}".encode()
            ).hexdigest()[:16]
            
            points.append(PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    **item["metadata"],
                    "text": item["text"],
                    "timestamp": datetime.now().isoformat()
                }
            ))
            
            results.append({
                "id": point_id,
                "index": i + j
            })
        
        # Store batch in Qdrant
        qdrant_client.upsert(
            collection_name=collection,
            points=points
        )
    
    return [TextContent(type="text", text=json.dumps({
        "success": True,
        "collection": collection,
        "processed": len(items),
        "results": results
    }))]

@log_async_errors(main_logger)
async def semantic_search(args: Dict[str, Any]) -> List[TextContent]:
    """Perform semantic search in specified collections"""
    query = args["query"]
    collections = args.get("collections", list(COLLECTIONS.keys()))
    limit = args.get("limit", 10)
    score_threshold = args.get("score_threshold", 0.7)
    
    # Validate collections
    collections = [c for c in collections if c in COLLECTIONS]
    if not collections:
        collections = list(COLLECTIONS.keys())
    
    # Get query embedding with caching
    query_vector = get_embedding(query)
    
    # Search each collection
    all_results = []
    for collection in collections:
        try:
            results = qdrant_client.search(
                collection_name=collection,
                query_vector=query_vector,
                limit=limit,
                score_threshold=score_threshold
            )
            
            for result in results:
                all_results.append({
                    "collection": collection,
                    "id": result.id,
                    "score": result.score,
                    "text": result.payload.get("text", ""),
                    "metadata": {k: v for k, v in result.payload.items() if k != "text"}
                })
        except Exception as e:
            logger.warning(f"Search failed for collection {collection}: {e}")
    
    # Sort by score
    all_results.sort(key=lambda x: x["score"], reverse=True)
    
    # Log search operation
    security_logger.log_access(
        agent=args.get('agent', 'unknown'),
        tool_name='semantic_search',
        args={'query': query, 'collections': collections},
        result=f'found_{len(all_results)}_items'
    )
    
    main_logger.info(f"Semantic search completed", extra={'query': query, 'results_count': len(all_results)})
    
    return [TextContent(type="text", text=json.dumps({
        "query": query,
        "collections_searched": collections,
        "count": len(all_results),
        "results": all_results[:limit]
    }, indent=2))]

async def cross_collection_search(args: Dict[str, Any]) -> List[TextContent]:
    """Search across multiple collections with aggregation and reranking"""
    query = args["query"]
    collections = args.get("collections", list(COLLECTIONS.keys()))
    limit_per_collection = args.get("limit_per_collection", 5)
    total_limit = args.get("total_limit", 20)
    use_rerank = args.get("rerank", True)
    
    # Validate collections
    collections = [c for c in collections if c in COLLECTIONS]
    if not collections:
        collections = list(COLLECTIONS.keys())
    
    # Get query embedding with caching
    query_vector = get_embedding(query)
    
    # Search each collection in parallel
    from concurrent.futures import as_completed
    all_results = []
    
    def search_collection(collection):
        try:
            results = qdrant_client.search(
                collection_name=collection,
                query_vector=query_vector,
                limit=limit_per_collection
            )
            return [(collection, r) for r in results]
        except Exception as e:
            logger.warning(f"Search failed for collection {collection}: {e}")
            return []
    
    # Execute searches in parallel
    with ThreadPoolExecutor(max_workers=len(collections)) as executor:
        future_to_collection = {
            executor.submit(search_collection, col): col 
            for col in collections
        }
        
        for future in as_completed(future_to_collection):
            results = future.result()
            for collection, result in results:
                all_results.append({
                    "collection": collection,
                    "id": result.id,
                    "score": result.score,
                    "text": result.payload.get("text", ""),
                    "metadata": {k: v for k, v in result.payload.items() if k != "text"}
                })
    
    # Rerank if requested and reranker is available
    if use_rerank and reranker and all_results:
        try:
            # Prepare texts for reranking
            texts = [r["text"] for r in all_results]
            
            # Rerank
            rerank_scores = reranker.predict([(query, text) for text in texts])
            
            # Update scores
            for i, result in enumerate(all_results):
                result["original_score"] = result["score"]
                result["rerank_score"] = float(rerank_scores[i])
                # Combine scores (weighted average)
                result["score"] = 0.7 * result["rerank_score"] + 0.3 * result["original_score"]
        except Exception as e:
            logger.warning(f"Reranking failed: {e}")
    
    # Sort by final score
    all_results.sort(key=lambda x: x["score"], reverse=True)
    
    # Aggregate by collection
    collection_counts = {}
    for result in all_results:
        col = result["collection"]
        collection_counts[col] = collection_counts.get(col, 0) + 1
    
    return [TextContent(type="text", text=json.dumps({
        "query": query,
        "collections_searched": collections,
        "total_results": len(all_results),
        "results": all_results[:total_limit],
        "collection_distribution": collection_counts,
        "reranked": use_rerank and reranker is not None
    }, indent=2))]

async def hybrid_search(args: Dict[str, Any]) -> List[TextContent]:
    """Combine semantic and keyword search with reranking"""
    query = args["query"]
    keywords = args.get("keywords", [])
    collections = args.get("collections", list(COLLECTIONS.keys()))
    limit = args.get("limit", 10)
    use_rerank = args.get("rerank", True)
    
    # Validate collections
    collections = [c for c in collections if c in COLLECTIONS]
    if not collections:
        collections = list(COLLECTIONS.keys())
    
    # Get query embedding with caching
    query_vector = get_embedding(query)
    
    # Search each collection
    all_results = []
    for collection in collections:
        try:
            # Build filter for keywords if provided
            filter_conditions = None
            if keywords:
                # Create OR conditions for each keyword
                conditions = []
                for keyword in keywords:
                    conditions.append(
                        FieldCondition(
                            key="text",
                            match=MatchValue(value=keyword)
                        )
                    )
                
                if conditions:
                    filter_conditions = Filter(
                        should=conditions
                    )
            
            # Search with keyword filter
            results = qdrant_client.search(
                collection_name=collection,
                query_vector=query_vector,
                limit=limit * 2,  # Get more for filtering
                query_filter=filter_conditions
            )
            
            # Process results
            for result in results:
                text = result.payload.get("text", "").lower()
                
                # Calculate keyword matches
                keyword_matches = [kw for kw in keywords if kw.lower() in text]
                keyword_boost = len(keyword_matches) * 0.1
                
                all_results.append({
                    "collection": collection,
                    "id": result.id,
                    "semantic_score": result.score,
                    "keyword_boost": keyword_boost,
                    "score": min(result.score + keyword_boost, 1.0),
                    "keyword_matches": keyword_matches,
                    "text": result.payload.get("text", ""),
                    "metadata": {k: v for k, v in result.payload.items() if k != "text"}
                })
        except Exception as e:
            logger.warning(f"Hybrid search failed for collection {collection}: {e}")
    
    # Rerank if requested
    if use_rerank and reranker and all_results:
        try:
            texts = [r["text"] for r in all_results]
            rerank_scores = reranker.predict([(query, text) for text in texts])
            
            for i, result in enumerate(all_results):
                result["rerank_score"] = float(rerank_scores[i])
                # Combine all scores
                result["score"] = (
                    0.5 * result["rerank_score"] + 
                    0.3 * result["semantic_score"] + 
                    0.2 * result["keyword_boost"]
                )
        except Exception as e:
            logger.warning(f"Reranking failed: {e}")
    
    # Sort by final score
    all_results.sort(key=lambda x: x["score"], reverse=True)
    
    return [TextContent(type="text", text=json.dumps({
        "query": query,
        "keywords": keywords,
        "collections_searched": collections,
        "count": len(all_results),
        "results": all_results[:limit],
        "reranked": use_rerank and reranker is not None
    }, indent=2))]

async def delete_vectors(args: Dict[str, Any]) -> List[TextContent]:
    """Delete vectors by ID from specified collection"""
    ids = args["ids"]
    collection = args["collection"]
    
    # Validate collection
    if collection not in COLLECTIONS:
        raise ValueError(f"Invalid collection: {collection}")
    
    try:
        qdrant_client.delete(
            collection_name=collection,
            points_selector=ids
        )
        
        return [TextContent(type="text", text=json.dumps({
            "success": True,
            "collection": collection,
            "deleted": len(ids)
        }))]
    except Exception as e:
        raise Exception(f"Failed to delete vectors: {e}")

async def get_collection_info(args: Dict[str, Any]) -> List[TextContent]:
    """Get information about collections"""
    requested_collections = args.get("collections", list(COLLECTIONS.keys()))
    
    # Validate collections
    requested_collections = [c for c in requested_collections if c in COLLECTIONS]
    if not requested_collections:
        requested_collections = list(COLLECTIONS.keys())
    
    info = {}
    for collection in requested_collections:
        try:
            collection_info = qdrant_client.get_collection(collection)
            info[collection] = {
                "description": COLLECTIONS[collection],
                "points_count": collection_info.points_count,
                "vectors_count": collection_info.vectors_count,
                "indexed_vectors_count": collection_info.indexed_vectors_count,
                "segments_count": collection_info.segments_count,
                "status": collection_info.status,
                "config": {
                    "vector_size": collection_info.config.params.vectors.size,
                    "distance": collection_info.config.params.vectors.distance
                }
            }
        except Exception as e:
            info[collection] = {"error": str(e)}
    
    return [TextContent(type="text", text=json.dumps({
        "collections": info,
        "cache_enabled": redis_client is not None,
        "reranker_enabled": reranker is not None
    }, indent=2))]

@server.list_resources()
async def list_resources() -> List[Resource]:
    """List all collection resources"""
    if not qdrant_client:
        await initialize()
    
    resources = []
    try:
        for collection_name, description in COLLECTIONS.items():
            try:
                info = qdrant_client.get_collection(collection_name)
                resources.append(Resource(
                    uri=f"qdrant://{collection_name}",
                    name=f"Vector Collection: {collection_name}",
                    description=f"{description} | Points: {info.points_count}",
                    mimeType="application/json"
                ))
            except Exception as e:
                logger.warning(f"Failed to get info for collection {collection_name}: {e}")
                
        # Add cache resource if available
        if redis_client:
            try:
                redis_client.ping()
                resources.append(Resource(
                    uri="redis://cache",
                    name="Embedding Cache",
                    description=f"Redis cache for embeddings (TTL: {CACHE_TTL}s)",
                    mimeType="application/json"
                ))
            except:
                pass
                
    except Exception as e:
        logger.error(f"Failed to list resources: {e}")
        
    return resources

async def cleanup():
    """Cleanup connections"""
    global executor
    
    try:
        # Close Redis connection
        if redis_client:
            redis_client.close()
            
        # Shutdown executor
        executor.shutdown(wait=True)
        
        logger.info("Cleanup completed")
    except Exception as e:
        logger.error(f"Cleanup error: {e}")

async def main():
    """Run the server with proper error handling"""
    try:
        await initialize()
        
        async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream)
    except KeyboardInterrupt:
        logger.info("Server interrupted by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise
    finally:
        await cleanup()

if __name__ == "__main__":
    import asyncio
    
    # Set up better asyncio error handling
    asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass