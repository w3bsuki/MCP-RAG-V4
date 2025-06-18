#!/usr/bin/env python3
"""
Vector Search HTTP API Server
Simple HTTP API that agents can connect to
"""
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Storage configuration
STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", "./vectors"))
STORAGE_DIR.mkdir(exist_ok=True)
DOCUMENTS_FILE = STORAGE_DIR / "documents.json"

app = FastAPI(title="Vector Search API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "vector-search"}


@app.post("/store_document")
async def store_document(content: str, title: str = None, metadata: Dict[str, Any] = None):
    """Store a document for search"""
    documents = load_documents()
    
    new_doc = {
        "id": len(documents) + 1,
        "title": title or f"Document {len(documents) + 1}",
        "content": content,
        "metadata": metadata or {},
        "created_at": datetime.now().isoformat()
    }
    
    documents.append(new_doc)
    save_documents(documents)
    
    return {
        "id": new_doc["id"],
        "status": "success",
        "message": "Document stored successfully"
    }


@app.post("/search")
async def search(query: str, limit: int = 10, filters: Dict[str, Any] = None):
    """Search documents"""
    documents = load_documents()
    query_lower = query.lower()
    
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
        
        if query_lower in content or query_lower in title:
            # Calculate simple relevance score
            score = 0.0
            if query_lower in title:
                score += 0.8
            if query_lower in content:
                score += 0.5
            
            result = doc.copy()
            result["score"] = score
            results.append(result)
    
    # Sort by score
    results.sort(key=lambda x: x["score"], reverse=True)
    results = results[:limit]
    
    return {
        "results": results,
        "total": len(results),
        "query": query
    }


@app.get("/list_documents")
async def list_documents(limit: int = 20):
    """List all documents"""
    documents = load_documents()
    return {
        "documents": documents[:limit],
        "total": len(documents)
    }


if __name__ == "__main__":
    print(f"Starting Vector Search API on port 8502...")
    print(f"Storage directory: {STORAGE_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=8502)