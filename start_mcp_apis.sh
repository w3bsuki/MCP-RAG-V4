#!/bin/bash
# Start HTTP API servers for agent MCP communication

echo "Starting MCP HTTP API servers..."

# Ensure Python environment is activated
source mcp-venv/bin/activate

# Install dependencies if needed
pip install -q fastapi uvicorn pydantic aiohttp

# Start the API servers
python mcp-servers/http-apis/start_api_servers.py