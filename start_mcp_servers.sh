#!/bin/bash
# Start all MCP servers

echo "🚀 Starting MCP Servers..."

# Start Knowledge Base Server
echo "Starting Knowledge Base Server..."
/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python /home/w3bsuki/MCP-RAG-V4/mcp-servers/knowledge-base-python/server.py &
KB_PID=$!
echo "Knowledge Base Server PID: $KB_PID"

# Start Vector Search Server
echo "Starting Vector Search Server..."
/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python /home/w3bsuki/MCP-RAG-V4/mcp-servers/vector-search-python/server.py &
VS_PID=$!
echo "Vector Search Server PID: $VS_PID"

# Start Coordination Hub Server
echo "Starting Coordination Hub Server..."
/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python /home/w3bsuki/MCP-RAG-V4/mcp-servers/coordination-hub/server.py &
CH_PID=$!
echo "Coordination Hub Server PID: $CH_PID"

# Save PIDs to file for later shutdown
echo $KB_PID > /tmp/mcp-kb.pid
echo $VS_PID > /tmp/mcp-vs.pid
echo $CH_PID > /tmp/mcp-ch.pid

echo "✅ All MCP servers started!"
echo ""
echo "To stop servers, run: ./stop_mcp_servers.sh"
echo ""
echo "Server logs will appear here. Press Ctrl+C to stop all servers."

# Wait for all background processes
wait