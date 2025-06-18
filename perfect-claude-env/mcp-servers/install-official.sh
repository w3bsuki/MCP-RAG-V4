#!/bin/bash
# Install official MCP servers

echo "Installing official MCP servers..."

# Create directories
mkdir -p official-servers/{filesystem,puppeteer,fetch,github}

# Install filesystem server
cd official-servers/filesystem
npm init -y
npm install @modelcontextprotocol/server-filesystem
echo "✓ Filesystem server installed"

# Install puppeteer server
cd ../puppeteer
npm init -y
npm install @modelcontextprotocol/server-puppeteer
echo "✓ Puppeteer server installed"

# Install fetch server
cd ../fetch
npm init -y
npm install @modelcontextprotocol/server-fetch
echo "✓ Fetch server installed"

# Install GitHub server
cd ../github
npm init -y
npm install @modelcontextprotocol/server-github
echo "✓ GitHub server installed"

echo "All official servers installed!"