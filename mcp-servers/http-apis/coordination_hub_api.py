#!/usr/bin/env python3
"""
Coordination Hub HTTP API Server
Simple HTTP API that agents can connect to
"""
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Shared directory for coordination
SHARED_DIR = Path(os.environ.get("SHARED_DIR", "./shared"))
SHARED_DIR.mkdir(exist_ok=True)
TASKS_FILE = SHARED_DIR / "tasks.json"

app = FastAPI(title="Coordination Hub API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request models
class TaskUpdate(BaseModel):
    status: str
    data: Optional[Dict[str, Any]] = None


def load_tasks() -> List[Dict[str, Any]]:
    """Load tasks from JSON file"""
    if not TASKS_FILE.exists():
        return []
    
    try:
        with open(TASKS_FILE, 'r') as f:
            data = json.load(f)
        return data.get("tasks", [])
    except:
        return []


def save_tasks(tasks: List[Dict[str, Any]]):
    """Save tasks to JSON file"""
    try:
        with open(TASKS_FILE, 'w') as f:
            json.dump({"tasks": tasks}, f, indent=2)
    except Exception as e:
        print(f"Error saving tasks: {e}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "coordination-hub"}


@app.post("/create_task")
async def create_task(
    title: str,
    description: str,
    assigned_to: str = "",
    priority: str = "medium",
    type: str = "coordination"
):
    """Create a new task"""
    tasks = load_tasks()
    task_id = f"task-{len(tasks) + 1}-{int(datetime.now().timestamp())}"
    
    new_task = {
        "id": task_id,
        "title": title,
        "description": description,
        "assigned_to": assigned_to,
        "priority": priority,
        "type": type,
        "status": "pending",
        "progress": 0,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "notes": []
    }
    
    tasks.append(new_task)
    save_tasks(tasks)
    
    return {
        "task_id": task_id,
        "status": "success",
        "message": "Task created successfully"
    }


@app.get("/tasks")
async def get_tasks(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    limit: int = 50
):
    """Get tasks with optional filters"""
    tasks = load_tasks()
    
    # Apply filters
    filtered_tasks = []
    for task in tasks:
        if status and task.get("status") != status:
            continue
        if assigned_to and task.get("assigned_to") != assigned_to:
            continue
        
        filtered_tasks.append(task)
        if len(filtered_tasks) >= limit:
            break
    
    return {
        "tasks": filtered_tasks,
        "total": len(filtered_tasks)
    }


@app.put("/tasks/{task_id}")
async def update_task(task_id: str, update: TaskUpdate):
    """Update a task"""
    tasks = load_tasks()
    
    # Find and update task
    updated = False
    for task in tasks:
        if task.get("id") == task_id:
            task["status"] = update.status
            
            if update.data:
                if "notes" in update.data:
                    task["notes"].append({
                        "timestamp": datetime.now().isoformat(),
                        "note": update.data["notes"]
                    })
                if "progress" in update.data:
                    task["progress"] = update.data["progress"]
            
            task["updated_at"] = datetime.now().isoformat()
            updated = True
            break
    
    if updated:
        save_tasks(tasks)
        return {"status": "success", "message": "Task updated"}
    else:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")


@app.post("/complete_task")
async def complete_task(task_id: str, result: str = ""):
    """Mark a task as completed"""
    tasks = load_tasks()
    
    # Find and complete task
    completed = False
    for task in tasks:
        if task.get("id") == task_id:
            task["status"] = "completed"
            task["progress"] = 100
            task["result"] = result
            task["completed_at"] = datetime.now().isoformat()
            task["updated_at"] = datetime.now().isoformat()
            completed = True
            break
    
    if completed:
        save_tasks(tasks)
        return {"status": "success", "message": "Task completed"}
    else:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")


if __name__ == "__main__":
    print(f"Starting Coordination Hub API on port 8503...")
    print(f"Shared directory: {SHARED_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=8503)