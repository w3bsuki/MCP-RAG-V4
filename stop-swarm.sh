#!/bin/bash
# Stop the MCP-RAG-V4 swarm

echo "Stopping MCP-RAG-V4 Swarm..."

# Kill orchestrator
pkill -f "orchestrator.ts"

# Kill any MCP servers
pkill -f "rag-server.ts"
pkill -f "task-server.ts"
pkill -f "bridge-server.ts"

echo "Swarm stopped."