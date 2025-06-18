#!/bin/bash
# Monitor the MCP-RAG-V4 system

echo "👀 MCP-RAG-V4 System Monitor"
echo "============================"
echo ""
echo "Press Ctrl+C to exit"
echo ""

# Function to check if process is running
check_process() {
    if [ -f "$1" ] && kill -0 $(cat "$1") 2>/dev/null; then
        echo "✅"
    else
        echo "❌"
    fi
}

while true; do
    clear
    echo "👀 MCP-RAG-V4 System Monitor - $(date)"
    echo "=========================================="
    echo ""
    echo "🔧 MCP Servers:"
    echo "  Knowledge Base: $(check_process /tmp/mcp-kb.pid)"
    echo "  Vector Search:  $(check_process /tmp/mcp-vs.pid)"
    echo "  Coordination:   $(check_process /tmp/mcp-ch.pid)"
    echo ""
    echo "🤖 Agents:"
    echo "  Architect:      $(check_process /tmp/agent-architect.pid)"
    echo "  Builder:        $(check_process /tmp/agent-builder.pid)"
    echo "  Validator:      $(check_process /tmp/agent-validator.pid)"
    echo ""
    echo "📋 Active Tasks:"
    if [ -f shared/tasks.json ]; then
        python3 -c "
import json
with open('shared/tasks.json') as f:
    data = json.load(f)
    tasks = data.get('tasks', [])
    pending = [t for t in tasks if t.get('status') == 'pending']
    active = [t for t in tasks if t.get('status') == 'in_progress']
    completed = [t for t in tasks if t.get('status') == 'completed']
    print(f'  Pending:    {len(pending)}')
    print(f'  Active:     {len(active)}')
    print(f'  Completed:  {len(completed)}')
    print()
    if active:
        print('  Current Tasks:')
        for t in active:
            print(f\"    - [{t.get('assigned_to')}] {t.get('title')} ({t.get('progress', 0)}%)\")
"
    else
        echo "  No tasks file found"
    fi
    echo ""
    echo "📊 Recent Activity:"
    echo "-------------------"
    tail -n 5 logs/agents/*.log 2>/dev/null | grep -E "(INFO|WARNING|ERROR)" | tail -5
    
    sleep 5
done