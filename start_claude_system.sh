#!/bin/bash
#
# MCP-RAG-V4 Claude Code System Launcher
# Opens separate terminals for each agent with Claude Code integration
#

set -e

PROJECT_ROOT="/home/w3bsuki/MCP-RAG-V4"
VENV_PATH="$PROJECT_ROOT/mcp-venv"

echo "🎛️  MCP-RAG-V4 Claude Code System Launcher"
echo "=========================================="

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check virtual environment
if [ ! -d "$VENV_PATH" ]; then
    echo "❌ Virtual environment not found: $VENV_PATH"
    echo "   Run: python3 -m venv mcp-venv && source mcp-venv/bin/activate && pip install mcp"
    exit 1
fi

# Check Claude Code
if ! command -v claude &> /dev/null; then
    echo "❌ Claude Code not found in PATH"
    echo "   Install from: https://github.com/anthropics/claude-code" 
    exit 1
fi

# Check X11 for terminals
if [ -z "$DISPLAY" ]; then
    echo "⚠️  X11 DISPLAY not set - setting to :0"
    export DISPLAY=:0
fi

echo "✓ Prerequisites checked"

# Function to launch agent terminal
launch_agent() {
    local agent_type="$1"
    local script_path="agents/$agent_type/${agent_type}_agent.py"
    local window_title="MCP-RAG-V4 ${agent_type^} Agent"
    
    echo "🖥️  Launching $agent_type agent terminal..."
    
    # Commands to run in terminal
    local commands="cd '$PROJECT_ROOT' && \
source mcp-venv/bin/activate && \
export PYTHONPATH=\$PWD && \
echo '🚀 Starting ${agent_type^} Agent with Claude Code' && \
echo '📁 Project: $PROJECT_ROOT' && \
echo '🤖 Agent: $agent_type' && \
echo '⚙️  Script: $script_path' && \
echo '' && \
claude --dangerously-skip-permissions $script_path"
    
    # Try gnome-terminal first
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal \
            --title "$window_title" \
            --geometry "120x30" \
            -- bash -c "$commands; exec bash" &
    elif command -v xterm &> /dev/null; then
        xterm \
            -title "$window_title" \
            -geometry "120x30" \
            -e bash -c "$commands; exec bash" &
    else
        echo "❌ No suitable terminal emulator found (tried gnome-terminal, xterm)"
        echo "   Please install: sudo apt install gnome-terminal"
        return 1
    fi
    
    echo "✓ $agent_type agent terminal launched"
    sleep 2
}

# Launch dashboard terminal (optional)
launch_dashboard() {
    echo "📊 Launching dashboard terminal..."
    
    local commands="cd '$PROJECT_ROOT' && \
source mcp-venv/bin/activate && \
export PYTHONPATH=\$PWD && \
echo '📊 Starting MCP-RAG-V4 Dashboard' && \
echo '📁 Project: $PROJECT_ROOT' && \
echo '🌐 Dashboard will be available at: http://localhost:8000' && \
echo '' && \
if [ -f 'ui/dashboard/server.py' ]; then \
    python ui/dashboard/server.py; \
else \
    echo 'Dashboard not available'; \
fi"
    
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal \
            --title "MCP-RAG-V4 Dashboard" \
            --geometry "100x25" \
            -- bash -c "$commands; exec bash" &
    elif command -v xterm &> /dev/null; then
        xterm \
            -title "MCP-RAG-V4 Dashboard" \
            -geometry "100x25" \
            -e bash -c "$commands; exec bash" &
    fi
    
    echo "✓ Dashboard terminal launched"
}

# Parse arguments
AGENTS=("admin" "architect" "builder")
INCLUDE_DASHBOARD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --agents)
            shift
            AGENTS=()
            while [[ $# -gt 0 && ! "$1" =~ ^-- ]]; do
                AGENTS+=("$1")
                shift
            done
            ;;
        --dashboard)
            INCLUDE_DASHBOARD=true
            shift
            ;;
        --help)
            echo "Usage: $0 [--agents agent1 agent2 ...] [--dashboard]"
            echo ""
            echo "Options:"
            echo "  --agents AGENTS    Space-separated list of agents to launch"
            echo "                     (choices: admin, architect, builder, validator)"
            echo "                     (default: admin architect builder)"
            echo "  --dashboard        Also launch dashboard terminal"
            echo "  --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Launch default agents"
            echo "  $0 --dashboard                        # Launch with dashboard"
            echo "  $0 --agents admin architect           # Launch specific agents"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate agents
for agent in "${AGENTS[@]}"; do
    if [[ ! "$agent" =~ ^(admin|architect|builder|validator)$ ]]; then
        echo "❌ Invalid agent: $agent"
        echo "   Valid agents: admin, architect, builder, validator"
        exit 1
    fi
    
    script_path="$PROJECT_ROOT/agents/$agent/${agent}_agent.py"
    if [ ! -f "$script_path" ]; then
        echo "❌ Agent script not found: $script_path"
        exit 1
    fi
done

echo ""
echo "🚀 Launching ${#AGENTS[@]} agents: ${AGENTS[*]}"
echo ""
echo "🎯 System Overview:"
echo "   • Each agent runs in its own terminal with Claude Code"
echo "   • Agents communicate via shared file system"
echo "   • Use --dangerously-skip-permissions for full MCP access"
echo ""

# Change to project directory
cd "$PROJECT_ROOT"

# Create necessary directories
mkdir -p shared/{specifications,adrs,builds,reports}
mkdir -p logs

# Launch agents
success_count=0
for i in "${!AGENTS[@]}"; do
    agent="${AGENTS[$i]}"
    echo "($((i+1))/${#AGENTS[@]}) Launching $agent agent..."
    
    if launch_agent "$agent"; then
        ((success_count++))
    else
        echo "❌ Failed to launch $agent agent"
    fi
done

# Launch dashboard if requested
if [ "$INCLUDE_DASHBOARD" = true ]; then
    echo "$((${#AGENTS[@]}+1))/$((${#AGENTS[@]}+1)) Launching dashboard..."
    launch_dashboard
fi

echo ""
echo "🎉 System launch complete!"
echo "   ✓ $success_count/${#AGENTS[@]} agents launched successfully"

if [ $success_count -gt 0 ]; then
    echo ""
    echo "📋 Next steps:"
    echo "   1. Wait for all terminals to load Claude Code"
    echo "   2. In each terminal, Claude will start with agent capabilities"
    echo "   3. Use the Admin agent to submit tasks and coordinate work"
    echo "   4. Watch agents collaborate through the shared/ directory"
    echo ""
    echo "💡 Tips:"
    echo "   • Use Ctrl+C in any terminal to stop that agent"
    echo "   • Check logs/ directory for detailed agent logs"
    echo "   • shared/ directory contains specifications, builds, etc."
    echo "   • Each agent has MCP access for enhanced capabilities"
    echo ""
    echo "⏳ System running... Terminals should be opening now."
    echo "   Press Ctrl+C here to exit this launcher (won't affect agents)"
    
    # Wait for user interrupt
    trap 'echo ""; echo "🛑 Launcher stopped. Agents continue running in their terminals."; exit 0' INT
    
    while true; do
        sleep 1
    done
else
    echo ""
    echo "❌ No agents launched successfully"
    exit 1
fi