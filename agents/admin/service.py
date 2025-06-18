#!/usr/bin/env python3
"""
Admin Agent Service
Runs the Admin Agent as a standalone service with HTTP API
"""
import asyncio
import os
from typing import Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from agent_orchestrator import AdminAgent, AgentTask
from mcp_servers.logging_config import setup_logging

# Initialize logging
loggers = setup_logging("admin-agent-service", "INFO")
logger = loggers['main']

# Initialize FastAPI app
app = FastAPI(title="Admin Agent Service")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Admin Agent
config = {
    'max_concurrent_tasks': int(os.environ.get('MAX_CONCURRENT_TASKS', '10')),
    'task_timeout': int(os.environ.get('TASK_TIMEOUT', '300')),
    'coordination_interval': int(os.environ.get('COORDINATION_INTERVAL', '5'))
}

admin_agent = AdminAgent(config)

# Pydantic models
class TaskSubmission(BaseModel):
    name: str
    description: str
    dependencies: list[str] = []
    metadata: Dict[str, Any] = {}

class TaskStatusQuery(BaseModel):
    task_id: str

# API endpoints
@app.post("/api/tasks/submit")
async def submit_task(task_submission: TaskSubmission):
    """Submit a new task to the Admin Agent"""
    try:
        task = AgentTask(
            name=task_submission.name,
            description=task_submission.description,
            dependencies=task_submission.dependencies,
            metadata=task_submission.metadata
        )
        
        task_id = await admin_agent.submit_task(task)
        
        return {
            "task_id": task_id,
            "status": "submitted",
            "message": f"Task '{task.name}' submitted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to submit task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Get status of a specific task"""
    status = admin_agent.get_task_status(task_id)
    if not status:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return status

@app.get("/api/tasks")
async def get_all_tasks(status: str = None, limit: int = 100):
    """Get all tasks with optional filtering"""
    tasks = admin_agent.get_all_tasks()
    
    if status:
        tasks = [t for t in tasks if t.get('status') == status]
    
    return tasks[:limit]

@app.get("/api/agents")
async def get_agent_statuses():
    """Get status of all agents"""
    return admin_agent.get_agent_statuses()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "admin-agent",
        "active_tasks": len(admin_agent.active_tasks),
        "task_queue_size": admin_agent.task_queue.qsize()
    }

@app.get("/api/metrics")
async def get_metrics():
    """Get service metrics"""
    return {
        "tasks_submitted": admin_agent.metrics.get('tasks_submitted', 0),
        "tasks_completed": admin_agent.metrics.get('tasks_completed', 0),
        "tasks_failed": admin_agent.metrics.get('tasks_failed', 0),
        "average_task_duration": admin_agent.metrics.get('avg_task_duration', 0),
        "agent_utilization": admin_agent.get_agent_utilization()
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Admin Agent Service")
    
    # Initialize Admin Agent
    await admin_agent.initialize()
    
    # Start coordination loop
    asyncio.create_task(admin_agent.coordinate_agents())
    
    logger.info("Admin Agent Service started successfully")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Admin Agent Service")
    await admin_agent.shutdown()

# Main function
def main():
    """Run the Admin Agent service"""
    port = int(os.environ.get('PORT', '8080'))
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )

if __name__ == "__main__":
    main()