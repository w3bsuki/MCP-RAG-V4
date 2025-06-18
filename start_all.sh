#!/bin/bash
# Complete MCP-RAG-V4 System Startup Script

echo "🚀 Starting MCP-RAG-V4 System..."
echo "================================"

# Create required directories
echo "📁 Creating directories..."
mkdir -p shared/specifications shared/adrs shared/builds shared/reports shared/tasks
mkdir -p knowledge vectors logs/agents logs/mcp
mkdir -p git-worktrees/architect git-worktrees/builder git-worktrees/validator

# Start MCP Servers
echo ""
echo "🔧 Starting MCP Servers..."
echo "-------------------------"

# Knowledge Base Server
echo "  → Starting Knowledge Base Server..."
PYTHONPATH=/home/w3bsuki/MCP-RAG-V4 \
KNOWLEDGE_ROOT=/home/w3bsuki/MCP-RAG-V4/knowledge \
/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python \
/home/w3bsuki/MCP-RAG-V4/mcp-servers/knowledge-base-python/server.py \
> logs/mcp/knowledge-base.log 2>&1 &
KB_PID=$!
echo "    ✓ Knowledge Base Server (PID: $KB_PID)"

# Vector Search Server
echo "  → Starting Vector Search Server..."
PYTHONPATH=/home/w3bsuki/MCP-RAG-V4 \
STORAGE_DIR=/home/w3bsuki/MCP-RAG-V4/vectors \
/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python \
/home/w3bsuki/MCP-RAG-V4/mcp-servers/vector-search-python/server.py \
> logs/mcp/vector-search.log 2>&1 &
VS_PID=$!
echo "    ✓ Vector Search Server (PID: $VS_PID)"

# Coordination Hub Server
echo "  → Starting Coordination Hub Server..."
PYTHONPATH=/home/w3bsuki/MCP-RAG-V4 \
SHARED_DIR=/home/w3bsuki/MCP-RAG-V4/shared \
/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python \
/home/w3bsuki/MCP-RAG-V4/mcp-servers/coordination-hub/server.py \
> logs/mcp/coordination-hub.log 2>&1 &
CH_PID=$!
echo "    ✓ Coordination Hub Server (PID: $CH_PID)"

# Save PIDs
echo $KB_PID > /tmp/mcp-kb.pid
echo $VS_PID > /tmp/mcp-vs.pid
echo $CH_PID > /tmp/mcp-ch.pid

# Give servers time to start
sleep 3

# Initialize shared task file
echo ""
echo "📋 Initializing task system..."
cat > shared/tasks.json << 'EOF'
{
  "tasks": [],
  "agents": {
    "architect": {"status": "ready", "current_task": null},
    "builder": {"status": "ready", "current_task": null},
    "validator": {"status": "ready", "current_task": null}
  }
}
EOF
echo "  ✓ Task system initialized"

# Start Agents
echo ""
echo "🤖 Starting Agents..."
echo "-------------------"

# Architect Agent
echo "  → Starting Architect Agent..."
cd /home/w3bsuki/MCP-RAG-V4
PYTHONPATH=/home/w3bsuki/MCP-RAG-V4 \
/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python \
agents/architect/architect_agent.py \
--id architect-01 \
--shared-dir shared \
> logs/agents/architect.log 2>&1 &
ARCH_PID=$!
echo "    ✓ Architect Agent (PID: $ARCH_PID)"

# Builder Agent
echo "  → Starting Builder Agent..."
PYTHONPATH=/home/w3bsuki/MCP-RAG-V4 \
/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python \
agents/builder/builder_agent.py \
--id builder-01 \
--shared-dir shared \
> logs/agents/builder.log 2>&1 &
BUILD_PID=$!
echo "    ✓ Builder Agent (PID: $BUILD_PID)"

# Validator Agent
echo "  → Starting Validator Agent..."
PYTHONPATH=/home/w3bsuki/MCP-RAG-V4 \
/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python \
agents/validator/validator_agent.py \
--id validator-01 \
--shared-dir shared \
> logs/agents/validator.log 2>&1 &
VAL_PID=$!
echo "    ✓ Validator Agent (PID: $VAL_PID)"

# Save agent PIDs
echo $ARCH_PID > /tmp/agent-architect.pid
echo $BUILD_PID > /tmp/agent-builder.pid
echo $VAL_PID > /tmp/agent-validator.pid

# Status Summary
echo ""
echo "✅ System Started Successfully!"
echo "=============================="
echo ""
echo "📊 Running Services:"
echo "  MCP Servers:"
echo "    - Knowledge Base: PID $KB_PID"
echo "    - Vector Search:  PID $VS_PID"
echo "    - Coordination:   PID $CH_PID"
echo ""
echo "  Agents:"
echo "    - Architect:      PID $ARCH_PID"
echo "    - Builder:        PID $BUILD_PID"
echo "    - Validator:      PID $VAL_PID"
echo ""
echo "📁 Log Files:"
echo "    - MCP Logs:       logs/mcp/*.log"
echo "    - Agent Logs:     logs/agents/*.log"
echo ""
echo "🛑 To stop all services: ./stop_all.sh"
echo "📝 To create a task:     ./create_task.sh"
echo "👀 To monitor:           tail -f logs/agents/*.log"
echo ""
echo "System is ready for tasks!"