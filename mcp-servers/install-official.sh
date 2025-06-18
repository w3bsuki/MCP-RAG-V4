#!/bin/bash
# Install official MCP servers with proper configuration

set -e  # Exit on error

echo "🚀 Installing official MCP servers..."

# Base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OFFICIAL_DIR="$BASE_DIR/official-servers"

# Create directories
mkdir -p "$OFFICIAL_DIR"/{filesystem,puppeteer,fetch,github,git,sqlite}

# Function to install server
install_server() {
    local name=$1
    local package=$2
    local dir="$OFFICIAL_DIR/$name"
    
    echo "📦 Installing $name server..."
    cd "$dir"
    
    # Create package.json with proper config
    cat > package.json << EOF
{
  "name": "mcp-$name-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "$package": "latest"
  },
  "scripts": {
    "start": "node node_modules/$package/dist/index.js"
  }
}
EOF
    
    npm install
    echo "✅ $name server installed"
}

# Install all official servers
install_server "filesystem" "@modelcontextprotocol/server-filesystem"
install_server "puppeteer" "@modelcontextprotocol/server-puppeteer"
install_server "fetch" "@modelcontextprotocol/server-fetch"
install_server "github" "@modelcontextprotocol/server-github"
install_server "git" "@modelcontextprotocol/server-git"
install_server "sqlite" "@modelcontextprotocol/server-sqlite"

# Create wrapper scripts for each server
echo "📝 Creating wrapper scripts..."

for server in filesystem puppeteer fetch github git sqlite; do
    cat > "$OFFICIAL_DIR/$server/run.sh" << EOF
#!/bin/bash
cd "\$(dirname "\$0")"
exec node node_modules/@modelcontextprotocol/server-$server/dist/index.js "\$@"
EOF
    chmod +x "$OFFICIAL_DIR/$server/run.sh"
done

# Special configuration for filesystem server with security
cat > "$OFFICIAL_DIR/filesystem/config.json" << EOF
{
  "allowedPaths": [
    "/home/w3bsuki/MCP-RAG-V4/perfect-claude-env/git-worktrees",
    "/home/w3bsuki/MCP-RAG-V4/perfect-claude-env/shared"
  ],
  "blockedPaths": [
    "/etc",
    "/usr",
    "/bin",
    "/sbin",
    "/home/w3bsuki/.ssh"
  ],
  "readOnly": false,
  "requireConfirmation": ["delete", "move"]
}
EOF

echo "
✅ All official MCP servers installed successfully!

📂 Location: $OFFICIAL_DIR
🔧 Servers installed:
   - filesystem (with path security)
   - puppeteer (browser automation)
   - fetch (HTTP requests)
   - github (GitHub API)
   - git (version control)
   - sqlite (database)

💡 Next steps:
   1. Update claude_desktop_config.json with server paths
   2. Test each server individually
   3. Configure agent-specific permissions
"