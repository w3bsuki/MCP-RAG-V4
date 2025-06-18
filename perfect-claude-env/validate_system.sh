#!/bin/bash
# Complete system validation for MCP-RAG-V4

echo "🔍 MCP-RAG-V4 System Validation"
echo "==============================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERRORS=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

check_item() {
    local name="$1"
    local command="$2"
    local required="$3"
    
    echo -n "   $name: "
    
    if eval "$command" &>/dev/null; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}❌ MISSING (REQUIRED)${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠️ MISSING (OPTIONAL)${NC}"
        fi
    fi
}

echo ""
echo "${BLUE}📦 Dependencies${NC}"
check_item "Python 3" "python3 --version" "required"
check_item "Node.js" "node --version" "required"
check_item "npm" "npm --version" "required"
check_item "Docker" "docker --version" "required"
check_item "Docker Compose" "docker-compose --version" "required"
check_item "Git" "git --version" "required"

echo ""
echo "${BLUE}📁 Directory Structure${NC}"
check_item "agents/" "[ -d '$PROJECT_ROOT/agents' ]" "required"
check_item "mcp-servers/" "[ -d '$PROJECT_ROOT/mcp-servers' ]" "required"
check_item "rag-system/" "[ -d '$PROJECT_ROOT/rag-system' ]" "required"
check_item "git-worktrees/" "[ -d '$PROJECT_ROOT/git-worktrees' ]" "required"
check_item "shared/" "[ -d '$PROJECT_ROOT/shared' ]" "required"
check_item "config/" "[ -d '$PROJECT_ROOT/config' ]" "required"
check_item "tests/" "[ -d '$PROJECT_ROOT/tests' ]" "required"
check_item "logs/" "[ -d '$PROJECT_ROOT/logs' ]" "required"

echo ""
echo "${BLUE}🔧 Configuration Files${NC}"
check_item "Claude Desktop Config" "[ -f '$PROJECT_ROOT/config/claude_desktop_config.json' ]" "required"
check_item "Environment Config" "[ -f '$PROJECT_ROOT/config/environment.env' ]" "required"
check_item "Security Config" "[ -f '$PROJECT_ROOT/mcp-servers/security-wrapper/security-config.json' ]" "required"
check_item "Tasks Template" "[ -f '$PROJECT_ROOT/shared/planning/ACTIVE_TASKS.json' ]" "required"

echo ""
echo "${BLUE}🤖 Agent Configurations${NC}"
for agent in architect builder validator; do
    check_item "$agent config" "[ -f '$PROJECT_ROOT/agents/$agent/claude_config.json' ]" "required"
done

echo ""
echo "${BLUE}🖥️ MCP Server Files${NC}"
check_item "Coordination Hub" "[ -f '$PROJECT_ROOT/mcp-servers/coordination-hub/server.py' ]" "required"
check_item "Knowledge Base" "[ -f '$PROJECT_ROOT/mcp-servers/knowledge-base-python/server.py' ]" "required"
check_item "Vector Search" "[ -f '$PROJECT_ROOT/mcp-servers/vector-search-python/server.py' ]" "required"
check_item "Security Wrapper" "[ -f '$PROJECT_ROOT/mcp-servers/security-wrapper/filesystem-secure.py' ]" "required"
check_item "Health Monitor" "[ -f '$PROJECT_ROOT/mcp-servers/monitoring/health-monitor.py' ]" "required"
check_item "Official Servers Install" "[ -f '$PROJECT_ROOT/mcp-servers/install-official.sh' ]" "required"

echo ""
echo "${BLUE}📋 Setup Scripts${NC}"
check_item "RAG Setup Script" "[ -f '$PROJECT_ROOT/rag-system/setup.sh' ]" "required"
check_item "Qdrant Init Script" "[ -f '$PROJECT_ROOT/rag-system/init_qdrant.py' ]" "required"
check_item "Test Runner" "[ -f '$PROJECT_ROOT/tests/run_tests.sh' ]" "required"
check_item "Docker Compose" "[ -f '$PROJECT_ROOT/rag-system/docker-compose.yml' ]" "required"

echo ""
echo "${BLUE}🔒 Security Features${NC}"
check_item "API Keys Configured" "grep -q 'api_keys' '$PROJECT_ROOT/mcp-servers/security-wrapper/security-config.json'" "required"
check_item "Path Whitelisting" "grep -q 'whitelist_paths' '$PROJECT_ROOT/mcp-servers/security-wrapper/security-config.json'" "required"
check_item "Audit Logging" "grep -q 'enable_audit' '$PROJECT_ROOT/mcp-servers/security-wrapper/security-config.json'" "required"

echo ""
echo "${BLUE}📚 Documentation${NC}"
check_item "Main README" "[ -f '$PROJECT_ROOT/README.md' ]" "required"
check_item "Setup Guide" "[ -f '$PROJECT_ROOT/SETUP_GUIDE.md' ]" "required"

echo ""
echo "${BLUE}🐳 Docker Services (if running)${NC}"
if command -v docker-compose &>/dev/null; then
    cd "$PROJECT_ROOT/rag-system"
    if [ -f "docker-compose.yml" ]; then
        check_item "Qdrant Container" "docker-compose ps | grep -q qdrant" "optional"
        check_item "Redis Container" "docker-compose ps | grep -q redis" "optional"
    fi
fi

echo ""
echo "${BLUE}🌐 Service Connectivity (if running)${NC}"
check_item "Qdrant API" "curl -s http://localhost:6333/health" "optional"
check_item "Redis Connection" "redis-cli ping" "optional"

echo ""
echo "${BLUE}📊 Python Dependencies${NC}"
PYTHON_SERVERS=("coordination-hub" "knowledge-base-python" "vector-search-python" "security-wrapper" "monitoring")

for server in "${PYTHON_SERVERS[@]}"; do
    check_item "$server requirements.txt" "[ -f '$PROJECT_ROOT/mcp-servers/$server/requirements.txt' ]" "required"
done

echo ""
echo "${BLUE}🧪 Testing Infrastructure${NC}"
check_item "Test Files" "[ -f '$PROJECT_ROOT/tests/test_mcp_integration.py' ]" "required"
check_item "Test Requirements" "[ -f '$PROJECT_ROOT/tests/requirements.txt' ]" "required"
check_item "Test Runner Executable" "[ -x '$PROJECT_ROOT/tests/run_tests.sh' ]" "required"

echo ""
echo "=============================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ System Validation Passed!${NC}"
    echo ""
    echo "🚀 Your MCP-RAG-V4 system is properly configured."
    echo ""
    echo "Next steps:"
    echo "1. Install official MCP servers: cd mcp-servers && ./install-official.sh"
    echo "2. Set up RAG system: cd rag-system && ./setup.sh"
    echo "3. Run tests: cd tests && ./run_tests.sh"
    echo "4. Configure Claude Desktop with config/claude_desktop_config.json"
    echo "5. Start using the system with agents!"
else
    echo -e "${RED}❌ System Validation Failed!${NC}"
    echo ""
    echo "Found $ERRORS critical issues that need to be resolved."
    echo "Please fix the issues marked as 'MISSING (REQUIRED)' and run validation again."
    exit 1
fi