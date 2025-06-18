#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🚀 Starting Node.js MCP Servers"
echo "==============================="

# Load environment
if [[ -f ".env" ]]; then
    source .env
    log_info "Loaded environment from .env"
else
    log_error ".env file not found. Run ./scripts/bootstrap.sh first"
    exit 1
fi

# Create logs directory
mkdir -p logs/mcp-servers

# Define Node.js MCP servers with their configurations
declare -A NODE_SERVERS=(
    ["filesystem"]="perfect-claude-env/mcp-servers/filesystem"
    ["git-operations"]="perfect-claude-env/mcp-servers/git-operations" 
    ["hub"]="perfect-claude-env/mcp-servers/hub"
    ["testing-tools"]="perfect-claude-env/mcp-servers/testing-tools"
)

# Start each Node.js server
for server_name in "${!NODE_SERVERS[@]}"; do
    server_path="${NODE_SERVERS[$server_name]}"
    
    if [[ -d "$server_path" && -f "$server_path/package.json" ]]; then
        log_info "Starting $server_name server..."
        
        # Set specific port for each server
        case $server_name in
            "filesystem")
                export MCP_SERVER_PORT=8083
                ;;
            "git-operations")
                export MCP_SERVER_PORT=8084
                ;;
            "hub")
                export MCP_SERVER_PORT=8085
                ;;
            "testing-tools")
                export MCP_SERVER_PORT=8086
                ;;
        esac
        
        # Start the server in background
        cd "$server_path"
        nohup npm start > "../../logs/mcp-servers/${server_name}.log" 2>&1 &
        echo $! > "../../logs/mcp-servers/${server_name}.pid"
        cd - > /dev/null
        
        log_success "$server_name started on port $MCP_SERVER_PORT (PID: $(cat logs/mcp-servers/${server_name}.pid))"
        
        # Wait a moment for the server to start
        sleep 2
        
        # Check if server is still running
        if ! kill -0 "$(cat logs/mcp-servers/${server_name}.pid)" 2>/dev/null; then
            log_error "$server_name failed to start. Check logs/mcp-servers/${server_name}.log"
        fi
    else
        log_error "Server directory not found: $server_path"
    fi
done

echo ""
log_success "All Node.js MCP servers started!"
echo ""
echo "📊 Server Status:"
echo "  • Filesystem:    http://localhost:8083/health"
echo "  • Git Operations: http://localhost:8084/health"
echo "  • Hub:           http://localhost:8085/health"
echo "  • Testing Tools: http://localhost:8086/health"
echo ""
echo "📝 Logs available at: logs/mcp-servers/"
echo "🛑 Stop servers with: npm run mcp:stop:all"