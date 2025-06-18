#!/usr/bin/env python3
"""
Task Creator for Multi-Agent System
Creates tasks that agents can pick up via MCP memory server
"""
import json
import uuid
from datetime import datetime


def create_task(name: str, description: str, features: list, tech_stack: dict = None):
    """Create a new task for the agent system"""
    
    task = {
        "id": f"task-{str(uuid.uuid4())[:8]}",
        "type": "create_specification",
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "requirements": {
            "name": name,
            "description": description,
            "features": features,
            "tech_stack": tech_stack or {"language": "python", "framework": "fastapi"}
        }
    }
    
    # Save to shared tasks file
    tasks_file = "shared/tasks.json"
    
    try:
        with open(tasks_file, 'r') as f:
            tasks = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        tasks = {"tasks": []}
    
    tasks["tasks"].append(task)
    
    with open(tasks_file, 'w') as f:
        json.dump(tasks, f, indent=2)
    
    print(f"✅ Created task: {task['id']}")
    print(f"📝 Name: {name}")
    print(f"🎯 Features: {', '.join(features)}")
    print(f"📁 Saved to: {tasks_file}")
    print(f"\nAgents can pick this up via:")
    print(f"memory get task_queue")
    
    return task


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python create_task.py 'Task Name' 'Description' feature1,feature2,feature3")
        print("Example: python create_task.py 'User Auth API' 'JWT authentication system' login,register,refresh")
        sys.exit(1)
    
    name = sys.argv[1]
    description = sys.argv[2]
    features = sys.argv[3].split(',') if len(sys.argv) > 3 else []
    
    create_task(name, description, features)