#!/bin/bash
# Stop all MCP-RAG-V4 services

echo "🛑 Stopping MCP-RAG-V4 System..."
echo "================================"

# Stop Agents
echo ""
echo "Stopping Agents..."
for pid_file in /tmp/agent-*.pid; do
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        kill $PID 2>/dev/null && echo "  ✓ Stopped agent PID $PID"
        rm "$pid_file"
    fi
done

# Stop MCP Servers
echo ""
echo "Stopping MCP Servers..."
for pid_file in /tmp/mcp-*.pid; do
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        kill $PID 2>/dev/null && echo "  ✓ Stopped server PID $PID"
        rm "$pid_file"
    fi
done

# Kill any stragglers
pkill -f "architect_agent.py" 2>/dev/null
pkill -f "builder_agent.py" 2>/dev/null
pkill -f "validator_agent.py" 2>/dev/null
pkill -f "knowledge-base-python/server.py" 2>/dev/null
pkill -f "vector-search-python/server.py" 2>/dev/null
pkill -f "coordination-hub/server.py" 2>/dev/null

echo ""
echo "✅ All services stopped!"