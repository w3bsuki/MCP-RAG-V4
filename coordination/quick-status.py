#!/usr/bin/env python3
"""
Quick Agent Coordination Status Dashboard
Shows real-time status of all agents and their tasks
"""

import json
import os
from datetime import datetime

TASKS_FILE = "/home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json"

def load_tasks():
    if not os.path.exists(TASKS_FILE):
        print(f"❌ ACTIVE_TASKS.json not found at {TASKS_FILE}")
        return None
    
    with open(TASKS_FILE, 'r') as f:
        return json.load(f)

def print_agent_status(agent_name, agent_data):
    print(f"\n🤖 {agent_name.upper()} AGENT:")
    print("=" * 40)
    
    current_tasks = agent_data.get('current', [])
    completed_tasks = agent_data.get('completed', [])
    
    print(f"📋 Current Tasks: {len(current_tasks)}")
    for task in current_tasks:
        status_icon = "🔄" if task.get('status') == 'IN_PROGRESS' else "📋"
        print(f"   {status_icon} {task.get('id', 'N/A')}: {task.get('task', 'N/A')[:50]}...")
        print(f"      Priority: {task.get('priority', 'N/A')} | Status: {task.get('status', 'N/A')}")
    
    print(f"✅ Completed Tasks: {len(completed_tasks)}")
    # Show last 3 completed tasks
    recent_completed = sorted(completed_tasks, 
                            key=lambda x: x.get('completedAt', ''), 
                            reverse=True)[:3]
    
    for task in recent_completed:
        completed_at = task.get('completedAt', 'N/A')
        print(f"   ✅ {task.get('id', 'N/A')}: {task.get('task', 'N/A')[:40]}...")
        print(f"      Completed: {completed_at}")

def main():
    print("🚀 MCP-RAG AGENT COORDINATION DASHBOARD")
    print("=" * 50)
    
    tasks_data = load_tasks()
    if not tasks_data:
        return
    
    # Show overall status
    print(f"📅 Last Updated: {tasks_data.get('updated', 'Unknown')}")
    print(f"👤 Updated By: {tasks_data.get('updatedBy', 'Unknown')}")
    print(f"🎯 Current Phase: {tasks_data.get('phases', {}).get('current', 'Unknown')}")
    print(f"⏱️  Timeline: {tasks_data.get('phases', {}).get('timeline', 'Unknown')}")
    
    # Show progress
    phases = tasks_data.get('phases', {})
    progress = phases.get('completedTasks', 'Unknown')
    print(f"📊 Overall Progress: {progress}")
    
    # Show each agent's status
    agents = tasks_data.get('tasks', {})
    for agent_name, agent_data in agents.items():
        print_agent_status(agent_name, agent_data)
    
    # Show communication status
    comm = tasks_data.get('communication', {})
    print(f"\n💬 COMMUNICATION STATUS:")
    print("=" * 40)
    print(f"Last Message: {comm.get('lastMessage', 'None')}")
    
    # Show critical updates
    updates = comm.get('criticalUpdates', [])
    if updates:
        print("\n🚨 Critical Updates:")
        for update in updates[-3:]:  # Show last 3
            print(f"   • {update}")
    
    print(f"\n⏰ Status Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n💡 TO SEND TO AGENTS:")
    print("=" * 40)
    print("1. Copy bootstrap prompts from AGENT-BOOTSTRAP-PROMPTS.md")
    print("2. Paste the appropriate prompt for each agent")
    print("3. Check this dashboard again in 15 minutes")
    print("4. Run ./check-status.sh for detailed file checks")

if __name__ == "__main__":
    main()