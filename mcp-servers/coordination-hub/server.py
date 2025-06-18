#!/usr/bin/env python3
"""
Coordination Hub MCP Server
Handles inter-agent coordination and task management
"""
import json
import os
import asyncio
import logging
import sys
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

from mcp.server import Server
from mcp.types import Tool, TextContent
import mcp.server.stdio

# Configure logging to stderr
logging.basicConfig(stream=sys.stderr, level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize server
server = Server("coordination-hub")

# Shared directory for coordination
SHARED_DIR = Path(os.environ.get("SHARED_DIR", "./shared"))
SHARED_DIR.mkdir(exist_ok=True)

# Tasks file
TASKS_FILE = SHARED_DIR / "tasks.json"

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
        logger.error(f"Error saving tasks: {e}")

@server.list_tools()
async def list_tools() -> List[Tool]:
    """List available tools"""
    return [
        Tool(
            name="create_task",
            description="Create a new task for agent coordination",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Task title"
                    },
                    "description": {
                        "type": "string",
                        "description": "Task description"
                    },
                    "assigned_to": {
                        "type": "string",
                        "description": "Agent assigned to this task"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "critical"],
                        "description": "Task priority"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["specification", "implementation", "validation", "coordination"],
                        "description": "Task type"
                    }
                },
                "required": ["title", "description"]
            }
        ),
        Tool(
            name="get_tasks",
            description="Get all tasks or filter by status/agent",
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["pending", "in_progress", "completed", "failed"],
                        "description": "Filter by task status"
                    },
                    "assigned_to": {
                        "type": "string",
                        "description": "Filter by assigned agent"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of tasks",
                        "default": 50
                    }
                }
            }
        ),
        Tool(
            name="update_task",
            description="Update task status or details",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "Task ID to update"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["pending", "in_progress", "completed", "failed"],
                        "description": "New task status"
                    },
                    "progress": {
                        "type": "integer",
                        "description": "Progress percentage (0-100)"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Progress notes"
                    }
                },
                "required": ["task_id"]
            }
        ),
        Tool(
            name="complete_task",
            description="Mark a task as completed",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "Task ID to complete"
                    },
                    "result": {
                        "type": "string",
                        "description": "Task completion result/output"
                    }
                },
                "required": ["task_id"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle tool calls"""
    
    if name == "create_task":
        title = arguments.get("title", "")
        description = arguments.get("description", "")
        assigned_to = arguments.get("assigned_to", "")
        priority = arguments.get("priority", "medium")
        task_type = arguments.get("type", "coordination")
        
        # Create new task
        tasks = load_tasks()
        task_id = f"task-{len(tasks) + 1}-{int(datetime.now().timestamp())}"
        
        new_task = {
            "id": task_id,
            "title": title,
            "description": description,
            "assigned_to": assigned_to,
            "priority": priority,
            "type": task_type,
            "status": "pending",
            "progress": 0,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "notes": []
        }
        
        tasks.append(new_task)
        save_tasks(tasks)
        
        return [TextContent(
            type="text",
            text=json.dumps({
                "status": "success",
                "message": "Task created successfully",
                "task": new_task
            }, indent=2)
        )]
    
    elif name == "get_tasks":
        status_filter = arguments.get("status")
        agent_filter = arguments.get("assigned_to")
        limit = arguments.get("limit", 50)
        
        tasks = load_tasks()
        
        # Apply filters
        filtered_tasks = []
        for task in tasks:
            if status_filter and task.get("status") != status_filter:
                continue
            if agent_filter and task.get("assigned_to") != agent_filter:
                continue
            
            filtered_tasks.append(task)
            if len(filtered_tasks) >= limit:
                break
        
        return [TextContent(
            type="text",
            text=json.dumps({
                "tasks": filtered_tasks,
                "total": len(filtered_tasks),
                "filters": {
                    "status": status_filter,
                    "assigned_to": agent_filter
                }
            }, indent=2)
        )]
    
    elif name == "update_task":
        task_id = arguments.get("task_id", "")
        new_status = arguments.get("status")
        progress = arguments.get("progress")
        notes = arguments.get("notes")
        
        tasks = load_tasks()
        
        # Find and update task
        updated = False
        for task in tasks:
            if task.get("id") == task_id:
                if new_status:
                    task["status"] = new_status
                if progress is not None:
                    task["progress"] = progress
                if notes:
                    task["notes"].append({
                        "timestamp": datetime.now().isoformat(),
                        "note": notes
                    })
                
                task["updated_at"] = datetime.now().isoformat()
                updated = True
                break
        
        if updated:
            save_tasks(tasks)
            return [TextContent(
                type="text",
                text=json.dumps({
                    "status": "success",
                    "message": "Task updated successfully",
                    "task_id": task_id
                }, indent=2)
            )]
        else:
            return [TextContent(
                type="text",
                text=json.dumps({
                    "status": "error",
                    "message": f"Task not found: {task_id}"
                }, indent=2)
            )]
    
    elif name == "complete_task":
        task_id = arguments.get("task_id", "")
        result = arguments.get("result", "")
        
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
            return [TextContent(
                type="text",
                text=json.dumps({
                    "status": "success",
                    "message": "Task completed successfully",
                    "task_id": task_id
                }, indent=2)
            )]
        else:
            return [TextContent(
                type="text",
                text=json.dumps({
                    "status": "error",
                    "message": f"Task not found: {task_id}"
                }, indent=2)
            )]
    
    else:
        return [TextContent(
            type="text",
            text=f"Unknown tool: {name}"
        )]

async def main():
    """Run the server"""
    # Don't print to stdout - it interferes with MCP protocol
    
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            {}
        )

if __name__ == "__main__":
    asyncio.run(main())