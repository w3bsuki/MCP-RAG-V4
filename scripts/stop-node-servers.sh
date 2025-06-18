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
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo "🛑 Stopping Node.js MCP Servers"
echo "==============================="

# Define server names
SERVERS=("filesystem" "git-operations" "hub" "testing-tools")

for server_name in "${SERVERS[@]}"; do
    pid_file="logs/mcp-servers/${server_name}.pid"
    
    if [[ -f "$pid_file" ]]; then
        pid=$(cat "$pid_file")
        
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping $server_name (PID: $pid)..."
            kill "$pid"
            
            # Wait for graceful shutdown
            for i in {1..10}; do
                if ! kill -0 "$pid" 2>/dev/null; then
                    break
                fi
                sleep 1
            done
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                log_warning "Force killing $server_name..."
                kill -9 "$pid"
            fi
            
            rm -f "$pid_file"
            log_success "$server_name stopped"
        else
            log_warning "$server_name was not running"
            rm -f "$pid_file"
        fi
    else
        log_warning "No PID file found for $server_name"
    fi
done

echo ""
log_success "All Node.js MCP servers stopped!"