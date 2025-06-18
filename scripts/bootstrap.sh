#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🚀 Bootstrapping MCP-RAG-V4 Environment"
echo "======================================="

# 1. Verify System Requirements
log_info "Verifying system requirements..."

# Check Git version (≥ 2.40)
GIT_VERSION=$(git --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
if ! command -v git &> /dev/null; then
    log_error "Git is not installed"
    exit 1
fi

GIT_MAJOR=$(echo $GIT_VERSION | cut -d. -f1)
GIT_MINOR=$(echo $GIT_VERSION | cut -d. -f2)
if [[ $GIT_MAJOR -lt 2 || ($GIT_MAJOR -eq 2 && $GIT_MINOR -lt 40) ]]; then
    log_error "Git version $GIT_VERSION is too old. Required: ≥ 2.40"
    exit 1
fi
log_success "Git $GIT_VERSION ✓"

# Check Node.js version (≥ 18)
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node --version | grep -oE '[0-9]+' | head -1)
if [[ $NODE_VERSION -lt 18 ]]; then
    log_error "Node.js version $NODE_VERSION is too old. Required: ≥ 18"
    exit 1
fi
log_success "Node.js $(node --version) ✓"

# Check npm
if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
fi
log_success "npm $(npm --version) ✓"

# Check Python version (≥ 3.9)
if ! command -v python3 &> /dev/null; then
    log_error "Python 3 is not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
if [[ $PYTHON_MAJOR -lt 3 || ($PYTHON_MAJOR -eq 3 && $PYTHON_MINOR -lt 9) ]]; then
    log_error "Python version $PYTHON_VERSION is too old. Required: ≥ 3.9"
    exit 1
fi
log_success "Python $(python3 --version) ✓"

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
fi
log_success "Docker $(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1) ✓"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed"
    exit 1
fi
log_success "Docker Compose $(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1) ✓"

# 2. Install Global MCP Servers
log_info "Installing global MCP servers..."

GLOBAL_SERVERS=(
    "@modelcontextprotocol/server-filesystem"
    "@modelcontextprotocol/server-puppeteer"
    "@modelcontextprotocol/server-fetch"
    "@modelcontextprotocol/server-github"
    "@modelcontextprotocol/server-git"
    "@modelcontextprotocol/server-sqlite"
)

for server in "${GLOBAL_SERVERS[@]}"; do
    log_info "Installing $server..."
    npm install -g "$server" --silent
    log_success "$server installed"
done

# 3. Setup Environment Files
log_info "Setting up environment configuration..."

# Create .env from example if it doesn't exist
if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        log_success "Created .env from .env.example"
    else
        # Create a basic .env file
        cat > .env << 'EOF'
# MCP-RAG-V4 Environment Configuration
NODE_ENV=development
PYTHON_ENV=development

# Database URLs
QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379

# Monitoring
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3000

# Generated API Keys (replace with real ones)
GITHUB_TOKEN=ghp_REPLACE_WITH_REAL_TOKEN
OPENAI_API_KEY=sk-REPLACE_WITH_REAL_KEY
ANTHROPIC_API_KEY=sk-ant-REPLACE_WITH_REAL_KEY

# Auto-generated secrets
JWT_SECRET=GENERATED_JWT_SECRET
WEBHOOK_SECRET=GENERATED_WEBHOOK_SECRET
EOF
        log_success "Created basic .env file"
    fi
else
    log_warning ".env already exists, skipping"
fi

# Generate random secrets
log_info "Generating random API keys and secrets..."

# Function to generate random string
generate_secret() {
    openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 32 | tr -d '\n'
}

# Update .env with generated secrets
if command -v sed &> /dev/null; then
    JWT_SECRET=$(generate_secret)
    WEBHOOK_SECRET=$(generate_secret)
    
    sed -i.bak "s/GENERATED_JWT_SECRET/$JWT_SECRET/" .env
    sed -i.bak "s/GENERATED_WEBHOOK_SECRET/$WEBHOOK_SECRET/" .env
    rm -f .env.bak
    
    log_success "Generated random secrets"
else
    log_warning "sed not available, keeping placeholder secrets"
fi

# 4. Create Python Virtual Environment
log_info "Setting up Python virtual environment..."

if [[ ! -d ".venv" ]]; then
    python3 -m venv .venv
    log_success "Created Python virtual environment"
else
    log_warning ".venv already exists, skipping"
fi

# Activate venv and install requirements
source .venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1

# Install requirements from all MCP servers
for req_file in perfect-claude-env/mcp-servers/*/requirements.txt; do
    if [[ -f "$req_file" ]]; then
        log_info "Installing requirements from $req_file..."
        pip install -r "$req_file" > /dev/null 2>&1
    fi
done

log_success "Python dependencies installed"

# 5. Install Node.js Dependencies
log_info "Installing Node.js dependencies..."

# Install package.json dependencies in all MCP servers
for package_file in perfect-claude-env/mcp-servers/*/package.json; do
    if [[ -f "$package_file" ]]; then
        server_dir=$(dirname "$package_file")
        log_info "Installing dependencies in $server_dir..."
        (cd "$server_dir" && npm install --silent)
    fi
done

log_success "Node.js dependencies installed"

# 6. Pull Docker Images
log_info "Pulling Docker images for RAG stack..."

cd perfect-claude-env
if [[ -f "docker-compose.yml" ]]; then
    docker-compose pull --quiet
    log_success "Docker images pulled"
else
    log_warning "docker-compose.yml not found, skipping image pull"
fi
cd ..

# 7. Create Initial Directories
log_info "Creating initial directory structure..."

mkdir -p .worktrees/{architect-branch,builder-branch,validator-branch}
mkdir -p coordination
mkdir -p shared/{communication,planning,artifacts,validation-reports}
mkdir -p projects

log_success "Directory structure created"

# 8. Set Permissions
log_info "Setting up permissions..."

chmod +x scripts/*.sh 2>/dev/null || true
chmod +x perfect-claude-env/setup-production.sh 2>/dev/null || true

log_success "Permissions set"

# Final summary
echo ""
echo "🎉 Bootstrap Complete!"
echo "====================="
echo ""
echo "Next steps:"
echo "  1. Edit .env file with your real API keys"
echo "  2. Run: docker-compose -f perfect-claude-env/docker-compose.yml up -d"
echo "  3. Run: npm run mcp:start:all"
echo "  4. Run: python start_all.py"
echo "  5. Configure Claude Desktop with .mcp.json"
echo ""
echo "Verification commands:"
echo "  • Check Docker: docker-compose -f perfect-claude-env/docker-compose.yml ps"
echo "  • Check environment: source .venv/bin/activate && python --version"
echo "  • Check MCP servers: ls perfect-claude-env/mcp-servers/"
echo ""

log_success "MCP-RAG-V4 environment bootstrapped successfully!"