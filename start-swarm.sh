#!/bin/bash
# Start the MCP-RAG-V4 swarm

echo "Starting MCP-RAG-V4 Swarm..."

# Ensure we're in the right directory
cd /home/w3bsuki/MCP-RAG-V4

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start orchestrator
echo "Starting orchestrator..."
npx tsx .swarm/orchestrator.ts &
ORCHESTRATOR_PID=$!

echo "Orchestrator started with PID: $ORCHESTRATOR_PID"
echo "Waiting for orchestrator to initialize..."
sleep 3

echo ""
echo "Swarm started successfully!"
echo ""
echo "To launch agents, run in separate terminals:"
echo "  ./launch-agent.sh architect"
echo "  ./launch-agent.sh builder"
echo "  ./launch-agent.sh validator"
echo ""
echo "To stop the swarm, run: ./stop-swarm.sh"
echo ""

# Keep script running
wait $ORCHESTRATOR_PID