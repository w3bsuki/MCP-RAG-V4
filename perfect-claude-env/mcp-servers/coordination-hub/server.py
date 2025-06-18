#!/usr/bin/env python3
"""
Coordination Hub MCP Server
Manages inter-agent communication, task coordination, and workflow orchestration
"""
import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import uuid
from enum import Enum

from mcp import Server
from mcp.types import Tool, Resource, TextContent
import mcp.server.stdio

# Initialize server
server = Server("coordination-hub")

# Configuration
SHARED_DIR = Path(os.environ.get("SHARED_DIR", "/home/w3bsuki/MCP-RAG-V4/perfect-claude-env/shared"))
TASKS_FILE = SHARED_DIR / "planning" / "ACTIVE_TASKS.json"
COMM_DIR = SHARED_DIR / "communication"
STATUS_DIR = SHARED_DIR / "status"

# Ensure directories exist
for dir_path in [SHARED_DIR / "planning", COMM_DIR, STATUS_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

class TaskStatus(Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    IN_REVIEW = "IN_REVIEW"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class Priority(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

@server.list_tools()
async def list_tools() -> List[Tool]:
    return [
        Tool(
            name="create_task",
            description="Create a new task with full metadata",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "type": {"type": "string", "enum": ["design", "implementation", "validation"]},
                    "assignee": {"type": "string", "enum": ["architect", "builder", "validator"]},
                    "priority": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                    "dependencies": {"type": "array", "items": {"type": "string"}},
                    "acceptance_criteria": {"type": "array", "items": {"type": "string"}},
                    "metadata": {"type": "object"}
                },
                "required": ["title", "description", "type", "priority"]
            }
        ),
        Tool(
            name="update_task",
            description="Update task status and metadata",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {"type": "string"},
                    "status": {"type": "string", "enum": ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "COMPLETED", "CANCELLED"]},
                    "progress_percentage": {"type": "integer", "minimum": 0, "maximum": 100},
                    "notes": {"type": "string"},
                    "blockers": {"type": "array", "items": {"type": "string"}},
                    "artifacts": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["task_id"]
            }
        ),
        Tool(
            name="get_tasks",
            description="Get tasks with advanced filtering",
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "COMPLETED", "CANCELLED"]},
                    "assignee": {"type": "string", "enum": ["architect", "builder", "validator"]},
                    "priority": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                    "type": {"type": "string", "enum": ["design", "implementation", "validation"]},
                    "include_completed": {"type": "boolean", "default": False}
                }
            }
        ),
        Tool(
            name="send_message",
            description="Send inter-agent message",
            inputSchema={
                "type": "object",
                "properties": {
                    "from_agent": {"type": "string"},
                    "to_agents": {"type": "array", "items": {"type": "string"}},
                    "subject": {"type": "string"},
                    "message_type": {"type": "string", "enum": ["info", "request", "response", "alert", "escalation"]},
                    "content": {"type": "string"},
                    "priority": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                    "requires_response": {"type": "boolean", "default": False},
                    "related_task": {"type": "string"}
                },
                "required": ["from_agent", "to_agents", "subject", "content", "message_type"]
            }
        ),
        Tool(
            name="get_messages",
            description="Get messages for an agent",
            inputSchema={
                "type": "object",
                "properties": {
                    "agent": {"type": "string"},
                    "unread_only": {"type": "boolean", "default": True},
                    "message_type": {"type": "string", "enum": ["info", "request", "response", "alert", "escalation"]},
                    "limit": {"type": "integer", "default": 50}
                },
                "required": ["agent"]
            }
        ),
        Tool(
            name="update_agent_status",
            description="Update agent working status",
            inputSchema={
                "type": "object",
                "properties": {
                    "agent": {"type": "string"},
                    "status": {"type": "string", "enum": ["available", "busy", "blocked", "offline"]},
                    "current_task": {"type": "string"},
                    "capacity_percentage": {"type": "integer", "minimum": 0, "maximum": 100},
                    "next_available": {"type": "string"}
                },
                "required": ["agent", "status"]
            }
        ),
        Tool(
            name="get_workflow_status",
            description="Get overall workflow status and metrics",
            inputSchema={
                "type": "object",
                "properties": {
                    "include_metrics": {"type": "boolean", "default": True},
                    "include_blockers": {"type": "boolean", "default": True}
                }
            }
        ),
        Tool(
            name="escalate_issue",
            description="Escalate a blocking issue",
            inputSchema={
                "type": "object",
                "properties": {
                    "issue_title": {"type": "string"},
                    "description": {"type": "string"},
                    "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                    "affected_tasks": {"type": "array", "items": {"type": "string"}},
                    "suggested_resolution": {"type": "string"}
                },
                "required": ["issue_title", "description", "severity"]
            }
        )
    ]

async def load_tasks() -> Dict[str, Any]:
    """Load tasks from file"""
    if TASKS_FILE.exists():
        return json.loads(TASKS_FILE.read_text())
    else:
        # Initialize with default structure
        default_tasks = {
            "version": "2.0.0",
            "lastUpdated": datetime.now().isoformat(),
            "metadata": {
                "totalTasks": 0,
                "completedTasks": 0,
                "activeTasks": 0,
                "blockedTasks": 0
            },
            "tasks": []
        }
        TASKS_FILE.write_text(json.dumps(default_tasks, indent=2))
        return default_tasks

async def save_tasks(data: Dict[str, Any]):
    """Save tasks to file"""
    data["lastUpdated"] = datetime.now().isoformat()
    
    # Update metadata
    tasks = data.get("tasks", [])
    data["metadata"]["totalTasks"] = len(tasks)
    data["metadata"]["completedTasks"] = len([t for t in tasks if t.get("status") == "COMPLETED"])
    data["metadata"]["activeTasks"] = len([t for t in tasks if t.get("status") == "IN_PROGRESS"])
    data["metadata"]["blockedTasks"] = len([t for t in tasks if t.get("status") == "BLOCKED"])
    
    TASKS_FILE.write_text(json.dumps(data, indent=2))

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    try:
        if name == "create_task":
            return await create_task(arguments)
        elif name == "update_task":
            return await update_task(arguments)
        elif name == "get_tasks":
            return await get_tasks(arguments)
        elif name == "send_message":
            return await send_message(arguments)
        elif name == "get_messages":
            return await get_messages(arguments)
        elif name == "update_agent_status":
            return await update_agent_status(arguments)
        elif name == "get_workflow_status":
            return await get_workflow_status(arguments)
        elif name == "escalate_issue":
            return await escalate_issue(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")
    except Exception as e:
        return [TextContent(type="text", text=json.dumps({"error": str(e)}))]

async def create_task(args: Dict[str, Any]) -> List[TextContent]:
    """Create a new task"""
    data = await load_tasks()
    
    # Generate task ID based on type
    task_type = args.get("type", "general")
    prefix = {"design": "DESIGN", "implementation": "IMPL", "validation": "VAL"}.get(task_type, "TASK")
    task_id = f"{prefix}-{str(uuid.uuid4())[:8].upper()}"
    
    # Create task object
    task = {
        "id": task_id,
        "title": args["title"],
        "description": args["description"],
        "type": task_type,
        "status": "TODO",
        "priority": args["priority"],
        "assignee": args.get("assignee", None),
        "creator": args.get("metadata", {}).get("creator", "unknown"),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "dependencies": args.get("dependencies", []),
        "acceptance_criteria": args.get("acceptance_criteria", []),
        "progress_percentage": 0,
        "artifacts": [],
        "notes": [],
        "blockers": [],
        "metadata": args.get("metadata", {})
    }
    
    # Calculate SLA based on priority
    priority_sla = {"critical": 4, "high": 24, "medium": 72, "low": 168}
    task["due_date"] = (datetime.now() + timedelta(hours=priority_sla.get(args["priority"], 72))).isoformat()
    
    # Add to tasks
    data["tasks"].append(task)
    await save_tasks(data)
    
    # Send notification to assignee if specified
    if task["assignee"]:
        await send_message({
            "from_agent": "coordination-hub",
            "to_agents": [task["assignee"]],
            "subject": f"New task assigned: {task['title']}",
            "message_type": "info",
            "content": f"You have been assigned task {task_id}: {task['title']}. Priority: {task['priority']}. Due: {task['due_date']}",
            "priority": task["priority"],
            "related_task": task_id
        })
    
    return [TextContent(type="text", text=json.dumps({
        "success": True,
        "task_id": task_id,
        "task": task
    }, indent=2))]

async def update_task(args: Dict[str, Any]) -> List[TextContent]:
    """Update task status and metadata"""
    data = await load_tasks()
    task_id = args["task_id"]
    
    # Find task
    task = None
    for t in data["tasks"]:
        if t["id"] == task_id:
            task = t
            break
    
    if not task:
        return [TextContent(type="text", text=json.dumps({
            "error": f"Task {task_id} not found"
        }))]
    
    # Update fields
    if "status" in args:
        old_status = task["status"]
        task["status"] = args["status"]
        
        # Auto-update progress based on status
        status_progress = {
            "TODO": 0,
            "IN_PROGRESS": 30,
            "BLOCKED": task.get("progress_percentage", 30),
            "IN_REVIEW": 90,
            "COMPLETED": 100,
            "CANCELLED": task.get("progress_percentage", 0)
        }
        task["progress_percentage"] = status_progress.get(args["status"], task.get("progress_percentage", 0))
        
        # Send status change notification
        if task.get("assignee"):
            await send_message({
                "from_agent": "coordination-hub",
                "to_agents": ["all"],
                "subject": f"Task {task_id} status changed",
                "message_type": "info",
                "content": f"Task '{task['title']}' status changed from {old_status} to {args['status']}",
                "priority": "medium",
                "related_task": task_id
            })
    
    if "progress_percentage" in args:
        task["progress_percentage"] = args["progress_percentage"]
    
    if "notes" in args:
        task["notes"].append({
            "timestamp": datetime.now().isoformat(),
            "note": args["notes"]
        })
    
    if "blockers" in args:
        task["blockers"] = args["blockers"]
        if args["blockers"] and task["status"] != "BLOCKED":
            task["status"] = "BLOCKED"
    
    if "artifacts" in args:
        task["artifacts"].extend(args["artifacts"])
    
    task["updated_at"] = datetime.now().isoformat()
    
    await save_tasks(data)
    
    return [TextContent(type="text", text=json.dumps({
        "success": True,
        "task": task
    }, indent=2))]

async def get_tasks(args: Dict[str, Any]) -> List[TextContent]:
    """Get tasks with filtering"""
    data = await load_tasks()
    tasks = data["tasks"]
    
    # Apply filters
    if "status" in args:
        tasks = [t for t in tasks if t["status"] == args["status"]]
    
    if "assignee" in args:
        tasks = [t for t in tasks if t.get("assignee") == args["assignee"]]
    
    if "priority" in args:
        tasks = [t for t in tasks if t["priority"] == args["priority"]]
    
    if "type" in args:
        tasks = [t for t in tasks if t["type"] == args["type"]]
    
    if not args.get("include_completed", False):
        tasks = [t for t in tasks if t["status"] != "COMPLETED"]
    
    # Sort by priority and due date
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    tasks.sort(key=lambda t: (priority_order.get(t["priority"], 3), t.get("due_date", "")))
    
    return [TextContent(type="text", text=json.dumps({
        "count": len(tasks),
        "tasks": tasks
    }, indent=2))]

async def send_message(args: Dict[str, Any]) -> List[TextContent]:
    """Send inter-agent message"""
    message_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    message = {
        "id": message_id,
        "from": args["from_agent"],
        "to": args["to_agents"],
        "subject": args["subject"],
        "type": args["message_type"],
        "content": args["content"],
        "priority": args.get("priority", "medium"),
        "timestamp": timestamp,
        "read_by": [],
        "requires_response": args.get("requires_response", False),
        "related_task": args.get("related_task"),
        "responses": []
    }
    
    # Save message for each recipient
    for recipient in args["to_agents"]:
        if recipient == "all":
            # Broadcast to all agents
            for agent in ["architect", "builder", "validator"]:
                agent_file = COMM_DIR / f"{agent}_messages.json"
                messages = []
                if agent_file.exists():
                    messages = json.loads(agent_file.read_text())
                messages.append(message)
                agent_file.write_text(json.dumps(messages, indent=2))
        else:
            agent_file = COMM_DIR / f"{recipient}_messages.json"
            messages = []
            if agent_file.exists():
                messages = json.loads(agent_file.read_text())
            messages.append(message)
            agent_file.write_text(json.dumps(messages, indent=2))
    
    return [TextContent(type="text", text=json.dumps({
        "success": True,
        "message_id": message_id
    }))]

async def get_messages(args: Dict[str, Any]) -> List[TextContent]:
    """Get messages for an agent"""
    agent = args["agent"]
    agent_file = COMM_DIR / f"{agent}_messages.json"
    
    if not agent_file.exists():
        return [TextContent(type="text", text=json.dumps({
            "messages": []
        }))]
    
    messages = json.loads(agent_file.read_text())
    
    # Filter by unread
    if args.get("unread_only", True):
        messages = [m for m in messages if agent not in m.get("read_by", [])]
    
    # Filter by type
    if "message_type" in args:
        messages = [m for m in messages if m["type"] == args["message_type"]]
    
    # Sort by timestamp and priority
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    messages.sort(key=lambda m: (priority_order.get(m.get("priority", "medium"), 2), m["timestamp"]), reverse=True)
    
    # Limit results
    messages = messages[:args.get("limit", 50)]
    
    # Mark as read
    if args.get("unread_only", True):
        all_messages = json.loads(agent_file.read_text())
        for msg in all_messages:
            if msg["id"] in [m["id"] for m in messages]:
                if "read_by" not in msg:
                    msg["read_by"] = []
                if agent not in msg["read_by"]:
                    msg["read_by"].append(agent)
        agent_file.write_text(json.dumps(all_messages, indent=2))
    
    return [TextContent(type="text", text=json.dumps({
        "count": len(messages),
        "messages": messages
    }, indent=2))]

async def update_agent_status(args: Dict[str, Any]) -> List[TextContent]:
    """Update agent working status"""
    status_file = STATUS_DIR / "agent_status.json"
    
    # Load existing status
    status_data = {}
    if status_file.exists():
        status_data = json.loads(status_file.read_text())
    
    # Update agent status
    agent = args["agent"]
    status_data[agent] = {
        "status": args["status"],
        "current_task": args.get("current_task"),
        "capacity_percentage": args.get("capacity_percentage", 100),
        "next_available": args.get("next_available"),
        "last_update": datetime.now().isoformat()
    }
    
    status_file.write_text(json.dumps(status_data, indent=2))
    
    return [TextContent(type="text", text=json.dumps({
        "success": True,
        "agent_status": status_data[agent]
    }))]

async def get_workflow_status(args: Dict[str, Any]) -> List[TextContent]:
    """Get overall workflow status and metrics"""
    data = await load_tasks()
    status_file = STATUS_DIR / "agent_status.json"
    
    result = {
        "timestamp": datetime.now().isoformat(),
        "task_summary": data["metadata"],
        "tasks_by_status": {},
        "tasks_by_priority": {},
        "tasks_by_assignee": {}
    }
    
    # Calculate task distributions
    for task in data["tasks"]:
        # By status
        status = task["status"]
        result["tasks_by_status"][status] = result["tasks_by_status"].get(status, 0) + 1
        
        # By priority
        priority = task["priority"]
        result["tasks_by_priority"][priority] = result["tasks_by_priority"].get(priority, 0) + 1
        
        # By assignee
        assignee = task.get("assignee", "unassigned")
        result["tasks_by_assignee"][assignee] = result["tasks_by_assignee"].get(assignee, 0) + 1
    
    # Add agent status
    if status_file.exists():
        result["agent_status"] = json.loads(status_file.read_text())
    
    # Calculate metrics if requested
    if args.get("include_metrics", True):
        completed_tasks = [t for t in data["tasks"] if t["status"] == "COMPLETED"]
        if completed_tasks:
            # Average completion time
            completion_times = []
            for task in completed_tasks:
                if "created_at" in task and "updated_at" in task:
                    created = datetime.fromisoformat(task["created_at"])
                    updated = datetime.fromisoformat(task["updated_at"])
                    completion_times.append((updated - created).total_seconds() / 3600)
            
            if completion_times:
                result["metrics"] = {
                    "average_completion_hours": sum(completion_times) / len(completion_times),
                    "total_completed": len(completed_tasks),
                    "completion_rate": len(completed_tasks) / len(data["tasks"]) if data["tasks"] else 0
                }
    
    # Find blockers if requested
    if args.get("include_blockers", True):
        blocked_tasks = [t for t in data["tasks"] if t["status"] == "BLOCKED"]
        result["blockers"] = [
            {
                "task_id": t["id"],
                "title": t["title"],
                "blockers": t.get("blockers", []),
                "assignee": t.get("assignee", "unassigned")
            }
            for t in blocked_tasks
        ]
    
    return [TextContent(type="text", text=json.dumps(result, indent=2))]

async def escalate_issue(args: Dict[str, Any]) -> List[TextContent]:
    """Escalate a blocking issue"""
    escalation_id = f"ESC-{str(uuid.uuid4())[:8].upper()}"
    
    escalation = {
        "id": escalation_id,
        "title": args["issue_title"],
        "description": args["description"],
        "severity": args["severity"],
        "affected_tasks": args.get("affected_tasks", []),
        "suggested_resolution": args.get("suggested_resolution"),
        "created_at": datetime.now().isoformat(),
        "status": "open"
    }
    
    # Save escalation
    escalation_file = STATUS_DIR / "escalations.json"
    escalations = []
    if escalation_file.exists():
        escalations = json.loads(escalation_file.read_text())
    escalations.append(escalation)
    escalation_file.write_text(json.dumps(escalations, indent=2))
    
    # Send urgent message to all agents
    await send_message({
        "from_agent": "coordination-hub",
        "to_agents": ["all"],
        "subject": f"ESCALATION: {args['issue_title']}",
        "message_type": "escalation",
        "content": f"Severity: {args['severity'].upper()}\n\n{args['description']}\n\nAffected tasks: {', '.join(args.get('affected_tasks', []))}",
        "priority": "critical" if args["severity"] in ["high", "critical"] else "high"
    })
    
    return [TextContent(type="text", text=json.dumps({
        "success": True,
        "escalation_id": escalation_id
    }))]

@server.list_resources()
async def list_resources() -> List[Resource]:
    """List available coordination resources"""
    resources = []
    
    # Task board resource
    if TASKS_FILE.exists():
        data = await load_tasks()
        resources.append(Resource(
            uri="coordination://tasks",
            name="Active Task Board",
            description=f"Tasks: {data['metadata']['totalTasks']} total, {data['metadata']['activeTasks']} active",
            mimeType="application/json"
        ))
    
    # Agent status resource
    status_file = STATUS_DIR / "agent_status.json"
    if status_file.exists():
        resources.append(Resource(
            uri="coordination://agent-status",
            name="Agent Status Dashboard",
            description="Current status of all agents",
            mimeType="application/json"
        ))
    
    # Escalations resource
    escalation_file = STATUS_DIR / "escalations.json"
    if escalation_file.exists():
        escalations = json.loads(escalation_file.read_text())
        open_escalations = len([e for e in escalations if e.get("status") == "open"])
        resources.append(Resource(
            uri="coordination://escalations",
            name="Escalation Board",
            description=f"{open_escalations} open escalations",
            mimeType="application/json"
        ))
    
    return resources

async def main():
    """Run the server"""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())