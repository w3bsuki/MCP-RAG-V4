#!/usr/bin/env python3
"""
Knowledge Base HTTP API Server
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

# Knowledge storage
KNOWLEDGE_ROOT = Path(os.environ.get("KNOWLEDGE_ROOT", "./knowledge"))
KNOWLEDGE_ROOT.mkdir(exist_ok=True)
KNOWLEDGE_DB = KNOWLEDGE_ROOT / "knowledge.json"

app = FastAPI(title="Knowledge Base API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "knowledge-base"}


@app.post("/store_knowledge")
async def store_knowledge(content: str, title: str = None, tags: List[str] = None, category: str = "reference"):
    """Store a knowledge item"""
    items = load_knowledge()
    
    new_item = {
        "id": len(items) + 1,
        "title": title or f"Knowledge Item {len(items) + 1}",
        "content": content,
        "tags": tags or [],
        "category": category,
        "created_at": datetime.now().isoformat()
    }
    
    items.append(new_item)
    save_knowledge(items)
    
    return {
        "id": new_item["id"],
        "status": "success",
        "message": "Knowledge stored successfully"
    }


@app.post("/search_knowledge")
async def search_knowledge(query: str, limit: int = 10, category: str = None):
    """Search the knowledge base"""
    items = load_knowledge()
    query_lower = query.lower()
    
    results = []
    for item in items:
        # Category filter
        if category and item.get("category") != category:
            continue
        
        # Text search
        content = item.get("content", "").lower()
        title = item.get("title", "").lower()
        tags = " ".join(item.get("tags", [])).lower()
        
        if query_lower in content or query_lower in title or query_lower in tags:
            results.append(item)
            if len(results) >= limit:
                break
    
    return {
        "results": results,
        "total": len(results),
        "query": query
    }


@app.get("/list_knowledge")
async def list_knowledge(limit: int = 20):
    """List all knowledge items"""
    items = load_knowledge()
    return {
        "items": items[:limit],
        "total": len(items)
    }


if __name__ == "__main__":
    print(f"Starting Knowledge Base API on port 8501...")
    print(f"Knowledge root: {KNOWLEDGE_ROOT}")
    uvicorn.run(app, host="0.0.0.0", port=8501)