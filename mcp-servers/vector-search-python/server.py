#!/usr/bin/env python3
"""
Vector Search MCP Server
Integrates with Qdrant for semantic search across multiple collections
"""
import json
import os
import asyncio
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

from mcp.server import Server
from mcp.types import Tool, TextContent
import mcp.server.stdio

# Try to import Qdrant
try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False
    print("Warning: Qdrant not available, using simple text search fallback")

# Try to import sentence transformers for embeddings
try:
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    print("Warning: sentence-transformers not available")

# Initialize server
server = Server("vector-search")

# Qdrant configuration
QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
COLLECTION_NAME = "documents"

# Fallback storage for when Qdrant is not available
STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", "./vectors"))
STORAGE_DIR.mkdir(exist_ok=True)
DOCUMENTS_FILE = STORAGE_DIR / "documents.json"

# Initialize Qdrant client and embedding model
qdrant_client = None
embedding_model = None

def init_qdrant():
    """Initialize Qdrant client"""
    global qdrant_client
    if QDRANT_AVAILABLE:
        try:
            qdrant_client = QdrantClient(url=QDRANT_URL)
            # Create collection if it doesn't exist
            try:
                qdrant_client.get_collection(COLLECTION_NAME)
            except:
                qdrant_client.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(size=384, distance=Distance.COSINE)
                )
            print(f"Qdrant initialized successfully at {QDRANT_URL}")
            return True
        except Exception as e:
            print(f"Failed to initialize Qdrant: {e}")
            return False
    return False

def init_embeddings():
    """Initialize embedding model"""
    global embedding_model
    if EMBEDDINGS_AVAILABLE:
        try:
            embedding_model = SentenceTransformer(EMBEDDING_MODEL)
            print(f"Embedding model loaded: {EMBEDDING_MODEL}")
            return True
        except Exception as e:
            print(f"Failed to load embedding model: {e}")
            return False
    return False

def load_documents() -> List[Dict[str, Any]]:
    """Load documents from JSON file"""
    if not DOCUMENTS_FILE.exists():
        return []
    
    try:
        with open(DOCUMENTS_FILE, 'r') as f:
            data = json.load(f)
        return data.get("documents", [])
    except:
        return []

def save_documents(documents: List[Dict[str, Any]]):
    """Save documents to JSON file"""
    try:
        with open(DOCUMENTS_FILE, 'w') as f:
            json.dump({"documents": documents}, f, indent=2)
    except Exception as e:
        print(f"Error saving documents: {e}")

@server.list_tools()
async def list_tools() -> List[Tool]:
    """List available tools"""
    return [
        Tool(
            name="store_document",
            description="Store a document for search",
            inputSchema={
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "Document content"
                    },
                    "title": {
                        "type": "string",
                        "description": "Document title"
                    },
                    "metadata": {
                        "type": "object",
                        "description": "Additional metadata"
                    }
                },
                "required": ["content"]
            }
        ),
        Tool(
            name="search",
            description="Search documents using text matching",
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
                    "filters": {
                        "type": "object",
                        "description": "Filter criteria"
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="list_documents",
            description="List all stored documents",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of documents",
                        "default": 20
                    }
                }
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle tool calls"""
    
    if name == "store_document":
        content = arguments.get("content", "")
        title = arguments.get("title", f"Document {len(load_documents()) + 1}")
        metadata = arguments.get("metadata", {})
        
        # Create new document
        documents = load_documents()
        doc_id = len(documents) + 1
        
        new_doc = {
            "id": doc_id,
            "title": title,
            "content": content,
            "metadata": metadata,
            "created_at": datetime.now().isoformat()
        }
        
        documents.append(new_doc)
        save_documents(documents)
        
        return [TextContent(
            type="text",
            text=json.dumps({
                "status": "success",
                "message": "Document stored successfully",
                "document": new_doc
            }, indent=2)
        )]
    
    elif name == "search":
        query = arguments.get("query", "").lower()
        limit = arguments.get("limit", 10)
        filters = arguments.get("filters", {})
        
        documents = load_documents()
        
        # Simple text search
        results = []
        for doc in documents:
            # Apply filters
            if filters:
                skip = False
                for key, value in filters.items():
                    if key in doc.get("metadata", {}) and doc["metadata"][key] != value:
                        skip = True
                        break
                if skip:
                    continue
            
            # Text search
            content = doc.get("content", "").lower()
            title = doc.get("title", "").lower()
            
            if query in content or query in title:
                # Calculate simple relevance score
                score = 0.0
                if query in title:
                    score += 0.8
                if query in content:
                    score += 0.5
                
                result = doc.copy()
                result["score"] = score
                results.append(result)
        
        # Sort by score
        results.sort(key=lambda x: x["score"], reverse=True)
        results = results[:limit]
        
        return [TextContent(
            type="text",
            text=json.dumps({
                "results": results,
                "total": len(results),
                "query": query
            }, indent=2)
        )]
    
    elif name == "list_documents":
        limit = arguments.get("limit", 20)
        documents = load_documents()
        
        return [TextContent(
            type="text",
            text=json.dumps({
                "documents": documents[:limit],
                "total": len(documents)
            }, indent=2)
        )]
    
    else:
        return [TextContent(
            type="text",
            text=f"Unknown tool: {name}"
        )]

async def main():
    """Run the server"""
    print(f"Starting Vector Search MCP Server...")
    print(f"Storage directory: {STORAGE_DIR}")
    
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            {}
        )

if __name__ == "__main__":
    asyncio.run(main())
