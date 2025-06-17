#!/bin/bash

# MCP-RAG Agent Coordination Status Checker
# Run this to see if agents are following the rules

echo "🔍 MCP-RAG AGENT COORDINATION STATUS"
echo "===================================="
echo ""

# Check if ACTIVE_TASKS.json exists and show last update
if [ -f "/home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json" ]; then
    echo "✅ ACTIVE_TASKS.json exists"
    
    # Extract last update time
    LAST_UPDATE=$(grep -o '"updated": "[^"]*"' /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json | cut -d'"' -f4)
    echo "📅 Last Updated: $LAST_UPDATE"
    
    # Count tasks by status
    TOTAL_TASKS=$(grep -o '"status": "[^"]*"' /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json | wc -l)
    COMPLETED=$(grep -o '"status": "COMPLETED"' /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json | wc -l)
    IN_PROGRESS=$(grep -o '"status": "IN_PROGRESS"' /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json | wc -l)
    TODO=$(grep -o '"status": "TODO"' /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json | wc -l)
    
    echo ""
    echo "📊 TASK STATUS BREAKDOWN:"
    echo "   Total Tasks: $TOTAL_TASKS"
    echo "   ✅ Completed: $COMPLETED"
    echo "   🔄 In Progress: $IN_PROGRESS"
    echo "   📋 To Do: $TODO"
    echo ""
    
    # Check current phase
    CURRENT_PHASE=$(grep -o '"current": "[^"]*"' /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json | head -1 | cut -d'"' -f4)
    echo "🎯 Current Phase: $CURRENT_PHASE"
    
    # Show recent completions (tasks with completedAt timestamp)
    echo ""
    echo "🕒 RECENT COMPLETIONS:"
    grep -A 3 -B 3 "completedAt.*$(date +%Y-%m-%d)" /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json | grep -E "(task|completedAt)" | tail -10
    
else
    echo "❌ ACTIVE_TASKS.json NOT FOUND!"
    echo "   Expected location: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json"
    exit 1
fi

echo ""
echo "🤖 AGENT RULE FILES:"
for agent in architect builder validator; do
    RULE_FILE="/home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/agents/$agent/CLAUDE.md"
    if [ -f "$RULE_FILE" ]; then
        echo "   ✅ $agent rules exist"
    else
        echo "   ❌ $agent rules missing"
    fi
done

echo ""
echo "💡 NEXT STEPS:"
echo "   1. Use the bootstrap prompts in AGENT-BOOTSTRAP-PROMPTS.md"
echo "   2. Send each agent their specific startup sequence"
echo "   3. Check this status again in 15 minutes"
echo "   4. If no updates, use the FORCE UPDATE PROTOCOL"
echo ""
echo "📋 QUICK COMMANDS:"
echo "   Check tasks: cat /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json | grep -A 5 -B 5 'status.*TODO'"
echo "   Watch for changes: watch -n 30 'ls -la /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json'"