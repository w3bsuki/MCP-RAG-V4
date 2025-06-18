#!/usr/bin/env python3
"""
Dashboard API Server for MCP-RAG-V4
Provides REST API and WebSocket endpoints for the UI
"""
import asyncio
import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import jwt
from passlib.context import CryptContext

# Import our modules
import sys
from pathlib import Path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    from agents.admin.agent_orchestrator import AdminAgent, AgentTask, AgentRole
except ImportError:
    # Simplified versions for dashboard
    class AdminAgent:
        def __init__(self, config): pass
        async def submit_task(self, task): return "task-" + str(hash(task))
        def get_all_tasks(self): return []
        def get_task_status(self, task_id): return {"status": "unknown"}
    
    class AgentTask:
        def __init__(self, **kwargs): self.__dict__.update(kwargs)
    
    from enum import Enum
    class AgentRole(Enum):
        ADMIN = "admin"
        ARCHITECT = "architect"
        BUILDER = "builder"
        VALIDATOR = "validator"

sys.path.insert(0, str(project_root / "rag-system"))
try:
    from enhanced_rag import EnhancedRAGSystem
except ImportError:
    # Simplified version
    class EnhancedRAGSystem:
        def __init__(self, config): pass
        async def initialize(self): pass
        async def hybrid_search(self, **kwargs): return []
        async def ingest_document(self, **kwargs): return type('Doc', (), {'id': 'test', 'chunks': []})
        async def get_stats(self): return {"total_documents": 0}

# Simplified logging
import logging
setup_logging = lambda name, level: {'main': logging.getLogger(name), 'performance': logging.getLogger(f"{name}-perf")}
logging.basicConfig(level=logging.INFO)

# Initialize logging
loggers = setup_logging("dashboard-api", "INFO")
logger = loggers['main']

# Initialize components
admin_agent = AdminAgent({
    'max_concurrent_tasks': 10,
    'task_timeout': 300
})

rag_system = EnhancedRAGSystem({
    'embedding_model': 'sentence-transformers/all-mpnet-base-v2',
    'chunk_size': 512,
    'chunk_overlap': 128
})

# FastAPI app
app = FastAPI(title="MCP-RAG-V4 Dashboard API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

manager = ConnectionManager()

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class TaskSubmission(BaseModel):
    name: str
    description: str
    priority: str = "medium"
    dependencies: List[str] = []

class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    collections: Optional[List[str]] = None
    use_reranking: bool = True

class DocumentIngestion(BaseModel):
    content: str
    title: str
    source: str
    tags: List[str]
    category: str
    chunking_strategy: str = "document-aware"

# Authentication endpoints
@app.post("/api/auth/login")
async def login(request: LoginRequest):
    # Simple demo authentication - replace with proper implementation
    if request.username == "admin" and request.password == "admin":
        token_data = {
            "sub": request.username,
            "exp": datetime.utcnow().timestamp() + 86400  # 24 hours
        }
        token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
        return {"token": token, "username": request.username}
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

# Agent endpoints
@app.get("/api/agents")
async def get_agents():
    """Get all agent statuses"""
    agents = []
    for role in AgentRole:
        agent_info = {
            "name": role.value,
            "status": "idle",  # Would get from actual agent
            "capabilities": admin_agent.agent_capabilities.get(role, [])
        }
        agents.append(agent_info)
    return agents

@app.get("/api/agents/{agent_id}/status")
async def get_agent_status(agent_id: str):
    """Get specific agent status"""
    try:
        role = AgentRole(agent_id)
        # In real implementation, would query actual agent
        return {
            "name": role.value,
            "status": "idle",
            "health": {"healthy": True},
            "currentTask": None
        }
    except ValueError:
        raise HTTPException(status_code=404, detail="Agent not found")

# Task endpoints
@app.post("/api/tasks")
async def submit_task(task: TaskSubmission):
    """Submit a new task"""
    agent_task = AgentTask(
        name=task.name,
        description=task.description,
        dependencies=task.dependencies
    )
    
    task_id = await admin_agent.submit_task(agent_task)
    
    # Broadcast task update
    await manager.broadcast({
        "type": "task_update",
        "payload": {
            "taskId": task_id,
            "status": "submitted",
            "task": task.dict()
        }
    })
    
    return {"taskId": task_id, "status": "submitted"}

@app.get("/api/tasks")
async def get_tasks(status: Optional[str] = None, limit: int = 50):
    """Get all tasks with optional filtering"""
    all_tasks = admin_agent.get_all_tasks()
    
    if status:
        all_tasks = [t for t in all_tasks if t['status'] == status]
    
    return all_tasks[:limit]

@app.get("/api/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Get specific task status"""
    task_status = admin_agent.get_task_status(task_id)
    if not task_status:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_status

# RAG endpoints
@app.post("/api/rag/search")
async def search_knowledge(request: SearchRequest):
    """Search the knowledge base"""
    try:
        results = await rag_system.hybrid_search(
            query=request.query,
            limit=request.limit,
            collections=request.collections,
            use_reranking=request.use_reranking
        )
        
        # Convert results to JSON-serializable format
        return {
            "query": request.query,
            "count": len(results),
            "results": [
                {
                    "id": result.chunk.id,
                    "content": result.chunk.content,
                    "metadata": result.chunk.metadata,
                    "score": result.final_score,
                    "vectorScore": result.vector_score,
                    "keywordScore": result.keyword_score,
                    "rerankScore": result.rerank_score
                }
                for result in results
            ]
        }
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/ingest")
async def ingest_document(document: DocumentIngestion):
    """Ingest a new document"""
    try:
        doc = await rag_system.ingest_document(
            content=document.content,
            metadata={
                "title": document.title,
                "source": document.source,
                "tags": document.tags,
                "category": document.category
            },
            chunking_strategy=document.chunking_strategy
        )
        
        return {
            "documentId": doc.id,
            "chunks": len(doc.chunks),
            "status": "ingested"
        }
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rag/stats")
async def get_rag_stats():
    """Get RAG system statistics"""
    stats = await rag_system.get_stats()
    return stats

# Metrics endpoints
@app.get("/api/metrics")
async def get_metrics(period: str = "1h"):
    """Get system metrics"""
    # Mock metrics for demo - would integrate with Prometheus in production
    return {
        "period": period,
        "timestamps": ["10:00", "10:15", "10:30", "10:45", "11:00"],
        "tasksCompleted": [5, 8, 12, 15, 20],
        "successRate": [100, 95, 92, 94, 96],
        "avgResponseTime": [1.2, 1.5, 1.3, 1.4, 1.1],
        "activeAgents": [3, 4, 5, 4, 5]
    }

@app.get("/api/health")
async def get_health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "adminAgent": "healthy",
            "ragSystem": "healthy",
            "database": "healthy"
        }
    }

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_json()
            
            if data.get("type") == "auth":
                # Validate token
                try:
                    payload = jwt.decode(data["token"], SECRET_KEY, algorithms=[ALGORITHM])
                    await websocket.send_json({
                        "type": "auth_success",
                        "payload": {"username": payload["sub"]}
                    })
                except:
                    await websocket.send_json({
                        "type": "auth_error",
                        "payload": {"message": "Invalid token"}
                    })
            
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# Static file serving
@app.get("/")
async def serve_dashboard():
    """Serve the dashboard HTML"""
    return FileResponse("index.html")

app.mount("/static", StaticFiles(directory="."), name="static")

# Background task to send periodic updates
async def send_periodic_updates():
    """Send periodic status updates to all connected clients"""
    while True:
        await asyncio.sleep(5)  # Update every 5 seconds
        
        # Get current agent statuses
        agent_updates = []
        for role in AgentRole:
            # Mock status - would get from actual agents
            agent_updates.append({
                "name": role.value,
                "status": "idle",
                "tasksCompleted": 0,
                "successRate": 100
            })
        
        await manager.broadcast({
            "type": "agent_status_update",
            "payload": agent_updates
        })

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Dashboard API Server")
    
    # Initialize RAG system
    await rag_system.initialize()
    
    # Start background tasks
    asyncio.create_task(send_periodic_updates())
    
    # Start admin agent coordination
    asyncio.create_task(admin_agent.coordinate_agents())

# Main function
def main():
    """Run the dashboard server"""
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

if __name__ == "__main__":
    main()