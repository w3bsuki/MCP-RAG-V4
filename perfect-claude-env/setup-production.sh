#!/bin/bash
set -euo pipefail

echo "🚀 Setting up MCP-RAG-V4 Production Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not found. Installing via package manager..."
        # You may want to install Node.js here
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed. Please install Python 3 first."
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Setup directories
setup_directories() {
    log_info "Setting up directories..."
    
    mkdir -p logs
    mkdir -p rag-system/vector-db/{qdrant_storage,redis_data}
    mkdir -p monitoring/{prometheus_data,grafana_data}
    mkdir -p shared/{communication,planning,artifacts,validation-reports}
    
    # Set permissions
    chmod -R 755 logs shared
    
    log_success "Directories created"
}

# Install official MCP servers
install_official_servers() {
    log_info "Installing official MCP servers..."
    
    npm install -g @modelcontextprotocol/server-filesystem
    npm install -g @modelcontextprotocol/server-puppeteer
    npm install -g @modelcontextprotocol/server-fetch
    npm install -g @modelcontextprotocol/server-github
    npm install -g @modelcontextprotocol/server-git
    npm install -g @modelcontextprotocol/server-sqlite
    
    log_success "Official MCP servers installed"
}

# Install custom MCP servers dependencies
install_custom_servers() {
    log_info "Installing custom MCP server dependencies..."
    
    # Node.js servers
    for server in filesystem git-operations hub testing-tools; do
        if [ -d "mcp-servers/$server" ]; then
            log_info "Installing dependencies for $server..."
            cd "mcp-servers/$server"
            npm install
            cd - > /dev/null
        fi
    done
    
    # Python servers
    for server in knowledge-base-python vector-search-python security-wrapper coordination-hub monitoring; do
        if [ -d "mcp-servers/$server" ]; then
            log_info "Installing dependencies for $server..."
            cd "mcp-servers/$server"
            python3 -m venv venv
            source venv/bin/activate
            pip install -r requirements.txt
            deactivate
            cd - > /dev/null
        fi
    done
    
    log_success "Custom MCP servers dependencies installed"
}

# Setup secrets
setup_secrets() {
    log_info "Setting up secrets management..."
    
    if [ ! -f "config/secrets.json" ]; then
        cp config/secrets.json.example config/secrets.json
        log_warning "Please edit config/secrets.json with your actual API keys and secrets"
        log_warning "Never commit this file to version control!"
    fi
    
    # Add secrets.json to .gitignore if not already there
    if ! grep -q "config/secrets.json" .gitignore 2>/dev/null; then
        echo "config/secrets.json" >> .gitignore
        log_info "Added secrets.json to .gitignore"
    fi
    
    log_success "Secrets setup completed"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Create Prometheus data directory with correct permissions
    sudo chown -R 65534:65534 monitoring/prometheus_data 2>/dev/null || true
    
    # Create Grafana data directory with correct permissions
    sudo chown -R 472:472 monitoring/grafana_data 2>/dev/null || true
    
    log_success "Monitoring setup completed"
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    docker-compose build --parallel
    
    log_success "Docker images built"
}

# Start services
start_services() {
    log_info "Starting services..."
    
    docker-compose up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    if docker-compose ps | grep -q "healthy"; then
        log_success "Services are healthy"
    else
        log_warning "Some services may not be healthy yet. Check with 'docker-compose ps'"
    fi
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Check Qdrant
    if curl -f http://localhost:6333/health > /dev/null 2>&1; then
        log_success "Qdrant is healthy"
    else
        log_error "Qdrant health check failed"
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_success "Redis is healthy"
    else
        log_error "Redis health check failed"
    fi
    
    # Check Prometheus
    if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
        log_success "Prometheus is healthy"
    else
        log_error "Prometheus health check failed"
    fi
    
    # Check Grafana
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Grafana is healthy"
    else
        log_error "Grafana health check failed"
    fi
}

# Run tests
run_tests() {
    log_info "Running integration tests..."
    
    if [ -f "tests/test_mcp_integration.py" ]; then
        python3 tests/test_mcp_integration.py
        log_success "Integration tests passed"
    else
        log_warning "Integration tests not found"
    fi
}

# Display final information
display_info() {
    echo ""
    echo "🎉 MCP-RAG-V4 Setup Complete!"
    echo "==============================="
    echo ""
    echo "Services available at:"
    echo "  📊 Grafana Dashboard: http://localhost:3000 (admin/admin)"
    echo "  📈 Prometheus: http://localhost:9090"
    echo "  🗄️  Qdrant: http://localhost:6333"
    echo "  🔴 Redis: localhost:6379"
    echo ""
    echo "MCP Servers running on:"
    echo "  🧠 Knowledge Base: localhost:8080"
    echo "  🔍 Vector Search: localhost:8081"
    echo "  🔒 Filesystem Secure: localhost:8082"
    echo "  📝 Git Operations: localhost:8084"
    echo ""
    echo "Management commands:"
    echo "  🔧 View logs: docker-compose logs -f [service]"
    echo "  📊 Check status: docker-compose ps"
    echo "  🛑 Stop all: docker-compose down"
    echo "  🔄 Restart: docker-compose restart [service]"
    echo ""
    echo "Next steps:"
    echo "  1. Edit config/secrets.json with your API keys"
    echo "  2. Configure Claude Desktop with config/claude_desktop_config.json"
    echo "  3. Open 3 Claude Code tabs for Architect, Builder, and Validator agents"
    echo ""
}

# Main execution
main() {
    cd "$(dirname "$0")"
    
    check_prerequisites
    setup_directories
    install_official_servers
    install_custom_servers
    setup_secrets
    setup_monitoring
    build_images
    start_services
    run_health_checks
    run_tests
    display_info
}

# Run setup if this script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi