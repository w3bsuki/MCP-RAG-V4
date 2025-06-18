#!/bin/bash
#
# Agent Runner Script for MCP-RAG-V4
# Usage: ./run_agent.sh [admin|architect|builder|validator] [additional_args...]
#

set -e

# Project root
PROJECT_ROOT="/home/w3bsuki/MCP-RAG-V4"
VENV_PATH="$PROJECT_ROOT/mcp-venv"

# Check if virtual environment exists
if [ ! -d "$VENV_PATH" ]; then
    echo "❌ Virtual environment not found at $VENV_PATH"
    echo "   Run: python3 -m venv mcp-venv && source mcp-venv/bin/activate && pip install mcp"
    exit 1
fi

# Agent type
AGENT_TYPE=${1:-admin}
shift || true  # Remove first argument, ignore error if no arguments

# Validate agent type
case $AGENT_TYPE in
    admin|architect|builder|validator)
        echo "🚀 Starting $AGENT_TYPE agent..."
        ;;
    *)
        echo "❌ Invalid agent type: $AGENT_TYPE"
        echo "   Valid types: admin, architect, builder, validator"
        exit 1
        ;;
esac

# Change to project directory
cd "$PROJECT_ROOT"

# Activate virtual environment
source "$VENV_PATH/bin/activate"

# Set environment variables
export PYTHONPATH="$PROJECT_ROOT"
export MCP_CONFIG_PATH="$PROJECT_ROOT/.mcp.json"

# Default configuration
DEFAULT_SHARED_DIR="$PROJECT_ROOT/shared"
DEFAULT_AGENT_ID="${AGENT_TYPE}-01"

# Ensure shared directory exists
mkdir -p "$DEFAULT_SHARED_DIR"
mkdir -p "$DEFAULT_SHARED_DIR/specifications"
mkdir -p "$DEFAULT_SHARED_DIR/adrs"
mkdir -p "$DEFAULT_SHARED_DIR/builds"
mkdir -p "$DEFAULT_SHARED_DIR/reports"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Agent-specific configurations
case $AGENT_TYPE in
    admin)
        AGENT_SCRIPT="agents/admin/admin_agent.py"
        ;;
    architect)
        AGENT_SCRIPT="agents/architect/architect_agent.py"
        ;;
    builder)
        AGENT_SCRIPT="agents/builder/builder_agent.py"
        ;;
    validator)
        AGENT_SCRIPT="agents/validator/validator_agent.py"
        ;;
esac

# Check if agent script exists
if [ ! -f "$AGENT_SCRIPT" ]; then
    echo "❌ Agent script not found: $AGENT_SCRIPT"
    exit 1
fi

echo "📁 Project: $PROJECT_ROOT"
echo "🤖 Agent: $AGENT_TYPE ($DEFAULT_AGENT_ID)"
echo "📂 Shared: $DEFAULT_SHARED_DIR"
echo "⚙️  Script: $AGENT_SCRIPT"

# Run the agent
echo "▶️  Launching agent..."
echo ""

python "$AGENT_SCRIPT" \
    --id "$DEFAULT_AGENT_ID" \
    --shared-dir "$DEFAULT_SHARED_DIR" \
    "$@"