#!/bin/bash
# Stop all MCP servers

echo "🛑 Stopping MCP Servers..."

# Kill servers using saved PIDs
if [ -f /tmp/mcp-kb.pid ]; then
    kill $(cat /tmp/mcp-kb.pid) 2>/dev/null
    rm /tmp/mcp-kb.pid
    echo "Stopped Knowledge Base Server"
fi

if [ -f /tmp/mcp-vs.pid ]; then
    kill $(cat /tmp/mcp-vs.pid) 2>/dev/null
    rm /tmp/mcp-vs.pid
    echo "Stopped Vector Search Server"
fi

if [ -f /tmp/mcp-ch.pid ]; then
    kill $(cat /tmp/mcp-ch.pid) 2>/dev/null
    rm /tmp/mcp-ch.pid
    echo "Stopped Coordination Hub Server"
fi

# Also kill any stragglers
pkill -f "knowledge-base-python/server.py" 2>/dev/null
pkill -f "vector-search-python/server.py" 2>/dev/null
pkill -f "coordination-hub/server.py" 2>/dev/null

echo "✅ All MCP servers stopped!"