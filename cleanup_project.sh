#!/bin/bash
# Cleanup MCP-RAG-V4 Project

echo "🧹 Cleaning up MCP-RAG-V4 project..."

# Remove test/temporary files
echo "Removing test files..."
rm -f test_communication.py
rm -f simple_dashboard.py
rm -f start_dashboard.py

# Remove duplicate/empty mcp directory
echo "Removing duplicate mcp directory..."
rm -rf mcp/

# Remove old implementation status docs
echo "Removing outdated documentation..."
rm -f IMPLEMENTATION_STATUS.md
rm -f IMPROVEMENT_PLAN.md
rm -f HOW_TO_USE.md
rm -f SETUP_GUIDE.md

# Remove unused config directories
echo "Removing unused directories..."
rm -rf coordination/
rm -rf config/

# Clean up mcp-servers unused directories
echo "Cleaning mcp-servers..."
rm -rf mcp-servers/hub/
rm -rf mcp-servers/testing-tools/
rm -rf mcp-servers/knowledge-base/  # Keep only python version
rm -rf mcp-servers/__pycache__/

# Remove old scripts
echo "Removing old scripts..."
rm -f setup-production.sh
rm -f start_all.py
rm -f stop_all.py
rm -f validate_system.sh

# Clean up any checkpoint files
echo "Removing checkpoint files..."
rm -f shared/checkpoint-*.json

# Clean up any Python cache
echo "Removing Python cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete

echo "✅ Cleanup complete!"

# Show clean structure
echo ""
echo "📁 Clean project structure:"
tree -L 2 -d