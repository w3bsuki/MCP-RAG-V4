#!/bin/bash
# Comprehensive test runner for MCP-RAG-V4 system

set -e

echo "🧪 Running MCP-RAG-V4 Test Suite"
echo "================================="

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Create virtual environment for testing
echo "📦 Setting up test environment..."
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate || . venv/Scripts/activate  # Windows compatibility

# Install test dependencies
pip install -r requirements.txt

echo "✅ Test environment ready"
echo ""

# Run different test categories
echo "🔧 Running Unit Tests..."
pytest test_mcp_integration.py::TestMCPIntegration -v --tb=short

echo ""
echo "📋 Running Configuration Tests..."
pytest test_mcp_integration.py::TestMCPServerStartup -v --tb=short

echo ""
echo "📚 Running Documentation Tests..."
pytest test_mcp_integration.py::TestDocumentationAndSetup -v --tb=short

echo ""
echo "🌐 Running Integration Tests (requires services)..."
if [ "$1" = "--integration" ]; then
    echo "   Running with actual services..."
    pytest test_mcp_integration.py::TestRealSystemIntegration -v --tb=short -m integration
else
    echo "   Skipping integration tests (use --integration flag to run)"
    echo "   These tests require Qdrant, Redis, and Docker to be running"
fi

echo ""
echo "📊 Generating Test Report..."

# Generate coverage report if coverage is installed
if pip list | grep -q coverage; then
    echo "   Running with coverage..."
    coverage run -m pytest test_mcp_integration.py -v
    coverage report --include="*/mcp-servers/*"
    coverage html --include="*/mcp-servers/*"
    echo "   Coverage report saved to htmlcov/index.html"
else
    echo "   Install 'coverage' package for coverage reports"
fi

echo ""
echo "🎯 Test Summary:"
echo "   Unit Tests: ✅ Basic functionality"
echo "   Config Tests: ✅ Configuration validation"
echo "   Doc Tests: ✅ Documentation completeness"
if [ "$1" = "--integration" ]; then
    echo "   Integration Tests: ✅ Service connectivity"
else
    echo "   Integration Tests: ⏭️  Skipped (use --integration)"
fi

echo ""
echo "🔍 Additional Checks:"

# Check for Python syntax errors
echo "   Checking Python syntax..."
find "$PROJECT_ROOT/mcp-servers" -name "*.py" -exec python -m py_compile {} \; 2>/dev/null && echo "   ✅ Python syntax OK" || echo "   ❌ Python syntax errors found"

# Check for JSON syntax
echo "   Checking JSON syntax..."
JSON_OK=true
for json_file in $(find "$PROJECT_ROOT" -name "*.json" -not -path "*/node_modules/*" -not -path "*/.next/*"); do
    if ! python -m json.tool "$json_file" > /dev/null 2>&1; then
        echo "   ❌ JSON syntax error in: $json_file"
        JSON_OK=false
    fi
done

if [ "$JSON_OK" = true ]; then
    echo "   ✅ JSON syntax OK"
fi

# Check for executable permissions on scripts
echo "   Checking script permissions..."
PERMS_OK=true
for script in $(find "$PROJECT_ROOT" -name "*.sh"); do
    if [ ! -x "$script" ]; then
        echo "   ⚠️  Script not executable: $script"
        PERMS_OK=false
    fi
done

if [ "$PERMS_OK" = true ]; then
    echo "   ✅ Script permissions OK"
fi

echo ""
echo "✅ Test suite completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Review any failed tests above"
echo "   2. Run integration tests with: ./run_tests.sh --integration"
echo "   3. Check services are running: docker-compose ps"
echo "   4. Validate MCP servers in Claude Desktop"