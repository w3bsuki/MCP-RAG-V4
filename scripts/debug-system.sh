#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_debug() { echo -e "${PURPLE}🔍 $1${NC}"; }

echo "🔧 MCP-RAG-V4 System Debugger"
echo "=============================="
echo ""

# Check command line arguments
VERBOSE=false
CHECK_PROCESSES=false
CHECK_LOGS=false
CHECK_NETWORK=false
CHECK_CONFIG=false
FULL_DEBUG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -p|--processes)
            CHECK_PROCESSES=true
            shift
            ;;
        -l|--logs)
            CHECK_LOGS=true
            shift
            ;;
        -n|--network)
            CHECK_NETWORK=true
            shift
            ;;
        -c|--config)
            CHECK_CONFIG=true
            shift
            ;;
        -a|--all)
            FULL_DEBUG=true
            CHECK_PROCESSES=true
            CHECK_LOGS=true
            CHECK_NETWORK=true
            CHECK_CONFIG=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -v, --verbose     Verbose output"
            echo "  -p, --processes   Check running processes"
            echo "  -l, --logs        Check log files"
            echo "  -n, --network     Check network connectivity"
            echo "  -c, --config      Check configuration files"
            echo "  -a, --all         Run all checks"
            echo "  -h, --help        Show this help"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# If no specific checks requested, run basic checks
if [[ "$CHECK_PROCESSES" == false && "$CHECK_LOGS" == false && "$CHECK_NETWORK" == false && "$CHECK_CONFIG" == false ]]; then
    CHECK_PROCESSES=true
    CHECK_NETWORK=true
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check service health
check_service_health() {
    local service_name=$1
    local port=$2
    local path=${3:-"/health"}
    
    if command_exists curl; then
        if curl -s -f "http://localhost:$port$path" >/dev/null 2>&1; then
            log_success "$service_name (port $port) - Healthy"
            if [[ "$VERBOSE" == true ]]; then
                curl -s "http://localhost:$port$path" | head -3
            fi
        else
            log_error "$service_name (port $port) - Unhealthy"
        fi
    else
        log_warning "curl not available, skipping HTTP health checks"
    fi
}

# Function to check port
check_port() {
    local port=$1
    local service=$2
    
    if command_exists netstat; then
        if netstat -ln | grep -q ":$port "; then
            log_success "Port $port ($service) - Listening"
        else
            log_error "Port $port ($service) - Not listening"
        fi
    elif command_exists ss; then
        if ss -ln | grep -q ":$port "; then
            log_success "Port $port ($service) - Listening"
        else
            log_error "Port $port ($service) - Not listening"
        fi
    elif command_exists lsof; then
        if lsof -i ":$port" >/dev/null 2>&1; then
            log_success "Port $port ($service) - Listening"
            if [[ "$VERBOSE" == true ]]; then
                lsof -i ":$port"
            fi
        else
            log_error "Port $port ($service) - Not listening"
        fi
    else
        log_warning "No network tools available (netstat/ss/lsof)"
    fi
}

# Basic System Info
log_info "System Information"
echo "OS: $(uname -s) $(uname -r)"
echo "Arch: $(uname -m)"
echo "Date: $(date)"
echo "Uptime: $(uptime | cut -d, -f1 | cut -d' ' -f4-)"
echo ""

# Check Docker
log_info "Docker Status"
if command_exists docker; then
    if docker ps >/dev/null 2>&1; then
        log_success "Docker daemon is running"
        
        # Check MCP-RAG containers
        log_debug "MCP-RAG Docker containers:"
        docker ps --filter "name=mcp" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
    else
        log_error "Docker daemon is not accessible"
    fi
else
    log_warning "Docker not installed"
fi
echo ""

# Process Checks
if [[ "$CHECK_PROCESSES" == true ]]; then
    log_info "Process Checks"
    
    # Check for Python MCP servers
    log_debug "Python MCP server processes:"
    if command_exists pgrep; then
        pgrep -f "python.*server\.py" | while read pid; do
            if command_exists ps; then
                ps -p "$pid" -o pid,comm,args --no-headers || true
            fi
        done
    fi
    
    # Check for Node.js MCP servers  
    log_debug "Node.js MCP server processes:"
    if command_exists pgrep; then
        pgrep -f "node.*index\.js" | while read pid; do
            if command_exists ps; then
                ps -p "$pid" -o pid,comm,args --no-headers || true
            fi
        done
    fi
    
    # Check PID files
    if [[ -d "logs/mcp-servers" ]]; then
        log_debug "MCP server PID files:"
        for pidfile in logs/mcp-servers/*.pid; do
            if [[ -f "$pidfile" ]]; then
                pid=$(cat "$pidfile" 2>/dev/null || echo "invalid")
                service=$(basename "$pidfile" .pid)
                
                if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
                    log_success "$service (PID: $pid) - Running"
                else
                    log_error "$service (PID: $pid) - Not running"
                fi
            fi
        done
    else
        log_warning "No PID files found in logs/mcp-servers/"
    fi
    echo ""
fi

# Network Checks
if [[ "$CHECK_NETWORK" == true ]]; then
    log_info "Network Connectivity Checks"
    
    # Core infrastructure ports
    check_port 6333 "Qdrant"
    check_port 6379 "Redis"
    check_port 9090 "Prometheus"
    check_port 3000 "Grafana"
    
    # MCP server ports
    check_port 8080 "Knowledge Base"
    check_port 8081 "Vector Search"
    check_port 8082 "Filesystem Secure"
    check_port 8086 "Testing Tools"
    
    # Metrics ports
    check_port 9100 "Node Metrics"
    check_port 9200 "Python Metrics"
    
    echo ""
    
    # Health checks
    log_info "Service Health Checks"
    check_service_health "Qdrant" 6333 "/health"
    check_service_health "Prometheus" 9090 "/-/healthy"
    check_service_health "Grafana" 3000 "/api/health"
    check_service_health "Node Metrics" 9100 "/health"
    check_service_health "Python Metrics" 9200 "/health"
    
    echo ""
fi

# Configuration Checks
if [[ "$CHECK_CONFIG" == true ]]; then
    log_info "Configuration File Checks"
    
    # Check critical files
    config_files=(
        ".env:Environment variables"
        ".mcp.json:MCP server configuration"
        "package.json:Node.js dependencies"
        "coordination/ACTIVE_TASKS.json:Task coordination"
        "perfect-claude-env/docker-compose.yml:Docker stack"
    )
    
    for config_entry in "${config_files[@]}"; do
        IFS=':' read -r file desc <<< "$config_entry"
        
        if [[ -f "$file" ]]; then
            log_success "$desc - Found ($file)"
            
            if [[ "$VERBOSE" == true ]]; then
                echo "  Size: $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "unknown") bytes"
                echo "  Modified: $(stat -f%Sm "$file" 2>/dev/null || stat -c%y "$file" 2>/dev/null || echo "unknown")"
            fi
        else
            log_error "$desc - Missing ($file)"
        fi
    done
    
    # Check JSON validity
    json_files=(".mcp.json" "coordination/ACTIVE_TASKS.json")
    
    log_debug "JSON file validation:"
    for json_file in "${json_files[@]}"; do
        if [[ -f "$json_file" ]]; then
            if command_exists jq; then
                if jq empty "$json_file" >/dev/null 2>&1; then
                    log_success "$json_file - Valid JSON"
                else
                    log_error "$json_file - Invalid JSON"
                fi
            elif command_exists python3; then
                if python3 -m json.tool "$json_file" >/dev/null 2>&1; then
                    log_success "$json_file - Valid JSON"
                else
                    log_error "$json_file - Invalid JSON"
                fi
            else
                log_warning "$json_file - Cannot validate (no jq or python3)"
            fi
        fi
    done
    
    echo ""
fi

# Log Checks
if [[ "$CHECK_LOGS" == true ]]; then
    log_info "Log File Analysis"
    
    # Check log directories
    log_dirs=("logs" "logs/mcp-servers")
    
    for log_dir in "${log_dirs[@]}"; do
        if [[ -d "$log_dir" ]]; then
            log_count=$(find "$log_dir" -name "*.log" | wc -l)
            log_success "$log_dir - Found $log_count log files"
            
            if [[ "$VERBOSE" == true ]]; then
                find "$log_dir" -name "*.log" -exec ls -lh {} \;
            fi
        else
            log_warning "$log_dir - Directory not found"
        fi
    done
    
    # Check for recent errors in logs
    log_debug "Recent errors in logs:"
    if [[ -d "logs" ]]; then
        find logs -name "*.log" -type f -exec grep -l -i "error\|fail\|exception" {} \; 2>/dev/null | head -5 | while read logfile; do
            echo "  ⚠️  Errors found in: $logfile"
            if [[ "$VERBOSE" == true ]]; then
                tail -3 "$logfile" | grep -i "error\|fail\|exception" | head -1 | sed 's/^/    /'
            fi
        done
    fi
    
    echo ""
fi

# Disk Space Check
log_info "Disk Space Check"
if command_exists df; then
    current_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ "$current_usage" -gt 90 ]]; then
        log_error "Disk usage critical: ${current_usage}%"
    elif [[ "$current_usage" -gt 80 ]]; then
        log_warning "Disk usage high: ${current_usage}%"
    else
        log_success "Disk usage normal: ${current_usage}%"
    fi
    
    if [[ "$VERBOSE" == true ]]; then
        df -h .
    fi
else
    log_warning "df command not available"
fi

echo ""

# Memory Check
log_info "Memory Usage"
if command_exists free; then
    memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    log_debug "Memory usage: ${memory_usage}%"
    
    if [[ "$VERBOSE" == true ]]; then
        free -h
    fi
elif command_exists vm_stat; then
    # macOS
    log_debug "Memory info (macOS):"
    if [[ "$VERBOSE" == true ]]; then
        vm_stat | head -5
    fi
else
    log_warning "Memory check tools not available"
fi

echo ""

# Summary and recommendations
log_info "Troubleshooting Recommendations"
echo ""

echo "🚀 Quick fixes:"
echo "  • Restart services: make restart"
echo "  • Check logs: make logs"
echo "  • Check status: make status"
echo "  • Health check: make health"
echo ""

echo "🔧 Debugging commands:"
echo "  • Full debug: $0 --all --verbose"
echo "  • Check processes: $0 --processes --verbose"
echo "  • Check logs: $0 --logs --verbose"
echo "  • Check network: $0 --network --verbose"
echo ""

echo "📊 Monitoring:"
echo "  • Prometheus: http://localhost:9090"
echo "  • Grafana: http://localhost:3000"
echo "  • Qdrant: http://localhost:6333/dashboard"
echo ""

echo "📝 Get help:"
echo "  • View README: cat README.md"
echo "  • View tasks: jq . coordination/ACTIVE_TASKS.json"
echo "  • System status: make status"

echo ""
log_success "Debug complete! Check above for any issues."