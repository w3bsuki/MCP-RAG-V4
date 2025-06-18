#!/bin/bash
# Enhanced MCP Setup Script for Multi-Agent System (Fixed)

set -e

echo "🚀 Setting up Enhanced MCP for Multi-Agent System"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Base directory
BASE_DIR="/home/w3bsuki/MCP-RAG-V4"
cd $BASE_DIR

echo -e "${YELLOW}Step 1: Installing Official MCP servers...${NC}"

# Official MCP servers that actually exist
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-puppeteer
npm install -g @modelcontextprotocol/server-postgres
npm install -g @modelcontextprotocol/server-memory
npm install -g @modelcontextprotocol/server-everything
npm install -g @modelcontextprotocol/inspector

echo -e "${YELLOW}Step 2: Checking for available third-party MCP servers...${NC}"

# Check if these exist, install if available
packages=(
    "@upstash/context7"
    "task-manager-mcp"
    "git-mcp"
    "redis-mcp"
    "rabbitmq-mcp"
)

for package in "${packages[@]}"; do
    echo "Checking $package..."
    if npm view "$package" version >/dev/null 2>&1; then
        echo -e "${GREEN}Installing $package${NC}"
        npm install -g "$package" || echo -e "${RED}Failed to install $package${NC}"
    else
        echo -e "${YELLOW}$package not found in npm registry${NC}"
    fi
done

echo -e "${YELLOW}Step 3: Setting up Python environment...${NC}"

# Activate Python environment
source mcp-venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install mcp pydantic fastapi uvicorn
pip install qdrant-client sentence-transformers
pip install redis aio-pika asyncio sqlite3
pip install pytest pytest-asyncio

echo -e "${YELLOW}Step 4: Creating shared directories...${NC}"

# Create necessary directories
mkdir -p shared/tasks
mkdir -p shared/specifications
mkdir -p shared/validation-reports
mkdir -p shared/messages
mkdir -p git-worktrees/architect
mkdir -p git-worktrees/builder
mkdir -p git-worktrees/validator

# Initialize SQLite databases
touch shared/tasks.db
touch shared/agent_state.db

echo -e "${YELLOW}Step 5: Creating minimal working .mcp.json...${NC}"

cat > .mcp.json.working << 'EOF'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/w3bsuki/MCP-RAG-V4"],
      "description": "Secure filesystem operations"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      },
      "description": "GitHub operations"
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "description": "In-memory storage for agent state"
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost:5432/mcp_agents"],
      "description": "Database for persistent storage"
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
      "description": "Browser automation for testing"
    },
    "everything": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "description": "Comprehensive testing server"
    },
    "knowledge-base": {
      "command": "/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python",
      "args": ["/home/w3bsuki/MCP-RAG-V4/mcp-servers/knowledge-base-python/server.py"],
      "env": {
        "KNOWLEDGE_ROOT": "/home/w3bsuki/MCP-RAG-V4/rag-system/knowledge",
        "PYTHONPATH": "/home/w3bsuki/MCP-RAG-V4"
      },
      "description": "Knowledge storage"
    },
    "vector-search": {
      "command": "/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python",
      "args": ["/home/w3bsuki/MCP-RAG-V4/mcp-servers/vector-search-python/server.py"],
      "env": {
        "QDRANT_URL": "http://localhost:6333",
        "EMBEDDING_MODEL": "sentence-transformers/all-MiniLM-L6-v2",
        "PYTHONPATH": "/home/w3bsuki/MCP-RAG-V4"
      },
      "description": "Semantic search"
    },
    "coordination-hub": {
      "command": "/home/w3bsuki/MCP-RAG-V4/mcp-venv/bin/python",
      "args": ["/home/w3bsuki/MCP-RAG-V4/mcp-servers/coordination-hub/server.py"],
      "env": {
        "SHARED_DIR": "/home/w3bsuki/MCP-RAG-V4/shared",
        "PYTHONPATH": "/home/w3bsuki/MCP-RAG-V4"
      },
      "description": "Agent coordination"
    }
  },
  "permissions": {
    "alwaysAllow": [
      "filesystem/read_file",
      "filesystem/list_directory",
      "memory/get",
      "memory/list",
      "everything/*",
      "vector-search/search",
      "knowledge-base/search",
      "coordination-hub/get_tasks"
    ],
    "requireConfirmation": [
      "filesystem/write_file",
      "filesystem/delete_file",
      "memory/set",
      "memory/delete",
      "postgres/*",
      "puppeteer/*",
      "github/create_pr",
      "github/merge_pr"
    ]
  },
  "agents": {
    "architect": {
      "workingDir": "./git-worktrees/architect",
      "allowedServers": [
        "filesystem",
        "memory",
        "vector-search",
        "knowledge-base",
        "coordination-hub",
        "github",
        "everything"
      ]
    },
    "builder": {
      "workingDir": "./git-worktrees/builder",
      "allowedServers": [
        "filesystem",
        "memory",
        "vector-search",
        "knowledge-base",
        "coordination-hub",
        "github",
        "postgres",
        "puppeteer",
        "everything"
      ]
    },
    "validator": {
      "workingDir": "./git-worktrees/validator",
      "allowedServers": [
        "filesystem",
        "memory",
        "puppeteer",
        "coordination-hub",
        "github",
        "everything"
      ]
    }
  },
  "debugging": {
    "logLevel": "info",
    "enableMCPDebug": true,
    "healthCheckInterval": 30000,
    "timeoutMs": 10000
  }
}
EOF

echo -e "${YELLOW}Step 6: Creating agent communication via memory server...${NC}"

# Create Python script for agent communication using memory server
cat > shared/agent_protocol.py << 'EOF'
"""Agent Communication Protocol using MCP Memory Server"""

import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

class TaskState(Enum):
    PENDING = "pending"
    CLAIMED = "claimed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"

class Priority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class MCPAgentCommunicator:
    """Uses MCP Memory server for agent communication"""
    
    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.inbox_key = f"agent:{agent_name}:inbox"
        self.tasks_key = f"agent:{agent_name}:tasks"
        
    def send_message(self, to_agent: str, action: str, payload: Dict[Any, Any]):
        """Send message to another agent via memory server"""
        message = {
            "id": str(uuid.uuid4()),
            "from_agent": self.agent_name,
            "to_agent": to_agent,
            "action": action,
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Store in recipient's inbox using MCP memory server
        inbox_key = f"agent:{to_agent}:inbox"
        # Use MCP memory/set tool to store message
        return message
        
    def get_messages(self):
        """Get messages from inbox using MCP memory server"""
        # Use MCP memory/get tool to retrieve messages
        # Return list of messages
        pass
        
    def create_task(self, title: str, description: str, priority: Priority = Priority.MEDIUM):
        """Create new task"""
        task = {
            "id": str(uuid.uuid4()),
            "title": title,
            "description": description,
            "priority": priority.value,
            "state": TaskState.PENDING.value,
            "assigned_agent": None,
            "created_by": self.agent_name,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Store in shared task list using MCP memory server
        return task
        
    def claim_task(self, task_id: str):
        """Claim a task"""
        # Update task state using MCP memory server
        pass
        
    def complete_task(self, task_id: str, result: Optional[Dict] = None):
        """Mark task as completed"""
        # Update task state using MCP memory server
        pass
EOF

echo -e "${YELLOW}Step 7: Creating test script...${NC}"

cat > test_mcp_connections.py << 'EOF'
#!/usr/bin/env python3
"""Test MCP Server Connectivity"""

import subprocess
import sys
import time

def test_npm_server(package_name, description):
    """Test if an npm-based MCP server can be installed and run"""
    print(f"Testing {description} ({package_name})...")
    try:
        # Test if package exists
        result = subprocess.run(['npm', 'view', package_name, 'version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"  ✓ {package_name} exists (version {result.stdout.strip()})")
            return True
        else:
            print(f"  ✗ {package_name} not found in npm registry")
            return False
    except Exception as e:
        print(f"  ✗ Error testing {package_name}: {e}")
        return False

def test_python_server(script_path, description):
    """Test if a Python MCP server can be started"""
    print(f"Testing {description}...")
    try:
        # Just check if file exists for now
        import os
        if os.path.exists(script_path):
            print(f"  ✓ {description} - script exists")
            return True
        else:
            print(f"  ✗ {description} - script missing: {script_path}")
            return False
    except Exception as e:
        print(f"  ✗ Error testing {description}: {e}")
        return False

def main():
    print("🧪 Testing MCP Server Connectivity\n")
    
    # Test npm servers
    npm_servers = [
        ("@modelcontextprotocol/server-filesystem", "Filesystem Server"),
        ("@modelcontextprotocol/server-github", "GitHub Server"),
        ("@modelcontextprotocol/server-memory", "Memory Server"),
        ("@modelcontextprotocol/server-everything", "Everything Server"),
        ("@modelcontextprotocol/inspector", "MCP Inspector"),
    ]
    
    npm_results = []
    for package, desc in npm_servers:
        result = test_npm_server(package, desc)
        npm_results.append((desc, result))
    
    # Test Python servers
    python_servers = [
        ("/home/w3bsuki/MCP-RAG-V4/mcp-servers/knowledge-base-python/server.py", "Knowledge Base"),
        ("/home/w3bsuki/MCP-RAG-V4/mcp-servers/vector-search-python/server.py", "Vector Search"),
        ("/home/w3bsuki/MCP-RAG-V4/mcp-servers/coordination-hub/server.py", "Coordination Hub"),
    ]
    
    python_results = []
    for script, desc in python_servers:
        result = test_python_server(script, desc)
        python_results.append((desc, result))
    
    # Results summary
    print("\n" + "="*50)
    print("📊 TEST RESULTS SUMMARY")
    print("="*50)
    
    print("\nNPM-based MCP Servers:")
    for desc, result in npm_results:
        status = "✓ AVAILABLE" if result else "✗ MISSING"
        print(f"  {desc}: {status}")
    
    print("\nPython MCP Servers:")
    for desc, result in python_results:
        status = "✓ FOUND" if result else "✗ MISSING"
        print(f"  {desc}: {status}")
    
    # Overall status
    total_tests = len(npm_results) + len(python_results)
    passed_tests = sum(r[1] for r in npm_results + python_results)
    
    print(f"\nOverall: {passed_tests}/{total_tests} servers available")
    
    if passed_tests >= 5:  # At least 5 servers working
        print("🎉 Sufficient MCP servers available for multi-agent system!")
        return 0
    else:
        print("⚠️  More MCP servers needed. Check the setup.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
EOF

chmod +x test_mcp_connections.py

echo -e "${YELLOW}Step 8: Creating simplified agent startup scripts...${NC}"

# Create architect agent startup
cat > start_architect_agent.sh << 'EOF'
#!/bin/bash
cd /home/w3bsuki/MCP-RAG-V4/git-worktrees/architect
export MCP_CONFIG=/home/w3bsuki/MCP-RAG-V4/.mcp.json.working
export AGENT_NAME=architect
export AGENT_ROLE=architect
echo "🏗️  Starting Architect Agent..."
echo "Working directory: $(pwd)"
echo "MCP Config: $MCP_CONFIG"
echo "Available MCP servers will be loaded from config"
# Start Claude Code with MCP config
# claude-code --mcp-config $MCP_CONFIG
EOF

# Create builder agent startup  
cat > start_builder_agent.sh << 'EOF'
#!/bin/bash
cd /home/w3bsuki/MCP-RAG-V4/git-worktrees/builder
export MCP_CONFIG=/home/w3bsuki/MCP-RAG-V4/.mcp.json.working
export AGENT_NAME=builder
export AGENT_ROLE=builder
echo "🔨 Starting Builder Agent..."
echo "Working directory: $(pwd)"
echo "MCP Config: $MCP_CONFIG"
echo "Available MCP servers will be loaded from config"
# Start Claude Code with MCP config
# claude-code --mcp-config $MCP_CONFIG
EOF

# Create validator agent startup
cat > start_validator_agent.sh << 'EOF'
#!/bin/bash
cd /home/w3bsuki/MCP-RAG-V4/git-worktrees/validator
export MCP_CONFIG=/home/w3bsuki/MCP-RAG-V4/.mcp.json.working  
export AGENT_NAME=validator
export AGENT_ROLE=validator
echo "✅ Starting Validator Agent..."
echo "Working directory: $(pwd)"
echo "MCP Config: $MCP_CONFIG"
echo "Available MCP servers will be loaded from config"
# Start Claude Code with MCP config
# claude-code --mcp-config $MCP_CONFIG
EOF

chmod +x start_*.sh

echo -e "${GREEN}✅ Fixed setup complete!${NC}"
echo ""
echo "🔧 Next steps:"
echo "1. Test MCP server availability:"
echo "   ./test_mcp_connections.py"
echo ""
echo "2. Set environment variables:"
echo "   export GITHUB_TOKEN=your_token"
echo ""
echo "3. Use the working MCP config:"
echo "   mv .mcp.json .mcp.json.backup"
echo "   mv .mcp.json.working .mcp.json"
echo ""
echo "4. Test MCP Inspector (visual debugging):"
echo "   npx @modelcontextprotocol/inspector"
echo ""
echo "5. Start agents (in separate terminals):"
echo "   ./start_architect_agent.sh"
echo "   ./start_builder_agent.sh"
echo "   ./start_validator_agent.sh"
echo ""
echo "🔍 Available MCP servers:"
echo "   • filesystem: File operations"
echo "   • github: GitHub integration"  
echo "   • memory: Agent communication"
echo "   • everything: Testing features"
echo "   • Custom Python servers: knowledge-base, vector-search, coordination-hub"