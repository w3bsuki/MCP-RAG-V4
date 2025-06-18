#!/bin/bash

# Install dependencies for all MCP servers

echo "Installing dependencies for MCP servers..."

servers=("filesystem" "knowledge-base" "testing-tools" "git-operations" "hub")

for server in "${servers[@]}"; do
    echo "Installing dependencies for $server server..."
    cd "$server" && npm install
    cd ..
done

echo "All dependencies installed!"