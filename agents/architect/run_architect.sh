#!/bin/bash
# Architect Agent Runner Script
# This script sets up the environment and runs the architect agent

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

echo "====================================="
echo "   ARCHITECT AGENT RUNNER"
echo "====================================="
echo "Project Root: $PROJECT_ROOT"
echo "Script Dir: $SCRIPT_DIR"

# Set up environment variables
export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"
export ARCHITECT_AGENT_ID="${ARCHITECT_AGENT_ID:-architect-01}"
export SHARED_DIR="${SHARED_DIR:-$PROJECT_ROOT/shared}"
export ENABLE_REDIS="${ENABLE_REDIS:-false}"
export MCP_API_BASE="${MCP_API_BASE:-http://localhost:8000}"
export COORDINATION_HUB_URL="${COORDINATION_HUB_URL:-http://localhost:8503}"
export KNOWLEDGE_BASE_URL="${KNOWLEDGE_BASE_URL:-http://localhost:8501}"
export VECTOR_SEARCH_URL="${VECTOR_SEARCH_URL:-http://localhost:8502}"

echo ""
echo "Configuration:"
echo "  Agent ID: $ARCHITECT_AGENT_ID"
echo "  Shared Dir: $SHARED_DIR"
echo "  Redis Enabled: $ENABLE_REDIS"
echo "  MCP API Base: $MCP_API_BASE"
echo "  Coordination Hub: $COORDINATION_HUB_URL"
echo "  Knowledge Base: $KNOWLEDGE_BASE_URL"
echo "  Vector Search: $VECTOR_SEARCH_URL"
echo ""

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p "$SHARED_DIR/specifications"
mkdir -p "$SHARED_DIR/adrs"
mkdir -p "$SHARED_DIR/communication"
mkdir -p "$SHARED_DIR/planning"
mkdir -p "$SCRIPT_DIR/logs"

# Check if MCP servers are running (optional)
check_service() {
    local name=$1
    local url=$2
    if curl -s -f "$url/health" > /dev/null 2>&1; then
        echo "✓ $name is running at $url"
    else
        echo "✗ $name is not available at $url (agent will use fallback)"
    fi
}

echo ""
echo "Checking MCP services..."
check_service "Coordination Hub" "$COORDINATION_HUB_URL"
check_service "Knowledge Base" "$KNOWLEDGE_BASE_URL"
check_service "Vector Search" "$VECTOR_SEARCH_URL"

# Run the agent
echo ""
echo "Starting Architect Agent..."
echo "====================================="
echo ""

# Change to agent directory
cd "$SCRIPT_DIR"

# Run with Python from project virtual environment if available
if [ -f "$PROJECT_ROOT/mcp-venv/bin/python" ]; then
    echo "Using project virtual environment..."
    exec "$PROJECT_ROOT/mcp-venv/bin/python" start_architect.py
else
    echo "Using system Python..."
    exec python3 start_architect.py
fi