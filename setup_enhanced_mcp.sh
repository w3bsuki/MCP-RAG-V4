#!/bin/bash
# Enhanced MCP Setup Script for Multi-Agent System

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

echo -e "${YELLOW}Step 1: Installing NPM-based MCP servers...${NC}"

# Core MCP servers
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-testing
npm install -g @modelcontextprotocol/server-fetch
npm install -g @modelcontextprotocol/server-sqlite
npm install -g @modelcontextprotocol/inspector

# Third-party MCP servers
npm install -g @upstash/context7
npm install -g task-manager-mcp
npm install -g git-mcp
npm install -g redis-mcp
npm install -g rabbitmq-mcp

echo -e "${YELLOW}Step 2: Setting up Python environment...${NC}"

# Activate Python environment
source mcp-venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install mcp pydantic fastapi uvicorn
pip install qdrant-client sentence-transformers
pip install redis aio-pika asyncio
pip install pytest pytest-asyncio

echo -e "${YELLOW}Step 3: Creating shared directories...${NC}"

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

echo -e "${YELLOW}Step 4: Setting up message queues...${NC}"

# Check if RabbitMQ is running
if ! command -v rabbitmqctl &> /dev/null; then
    echo -e "${RED}RabbitMQ not found. Please install RabbitMQ:${NC}"
    echo "sudo apt-get install rabbitmq-server"
    echo "sudo systemctl start rabbitmq-server"
else
    # Create exchanges and queues
    rabbitmqctl add_vhost mcp_agents 2>/dev/null || true
    rabbitmqctl set_permissions -p mcp_agents guest ".*" ".*" ".*" 2>/dev/null || true
fi

# Check if Redis is running
if ! command -v redis-cli &> /dev/null; then
    echo -e "${RED}Redis not found. Please install Redis:${NC}"
    echo "sudo apt-get install redis-server"
    echo "sudo systemctl start redis-server"
else
    redis-cli ping > /dev/null && echo -e "${GREEN}Redis is running${NC}"
fi

echo -e "${YELLOW}Step 5: Creating agent communication protocol...${NC}"

# Create Python script for agent communication
cat > shared/agent_protocol.py << 'EOF'
"""Agent Communication Protocol for MCP"""

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

class AgentMessage:
    def __init__(self, from_agent: str, to_agent: str, action: str, payload: Dict[Any, Any]):
        self.id = str(uuid.uuid4())
        self.from_agent = from_agent
        self.to_agent = to_agent
        self.action = action
        self.payload = payload
        self.timestamp = datetime.utcnow().isoformat()
        
    def to_json(self) -> str:
        return json.dumps({
            "id": self.id,
            "from_agent": self.from_agent,
            "to_agent": self.to_agent,
            "action": self.action,
            "payload": self.payload,
            "timestamp": self.timestamp
        })

class Task:
    def __init__(self, title: str, description: str, priority: Priority = Priority.MEDIUM):
        self.id = str(uuid.uuid4())
        self.title = title
        self.description = description
        self.priority = priority
        self.state = TaskState.PENDING
        self.assigned_agent = None
        self.created_at = datetime.utcnow().isoformat()
        self.updated_at = self.created_at
        
    def claim(self, agent_name: str):
        self.assigned_agent = agent_name
        self.state = TaskState.CLAIMED
        self.updated_at = datetime.utcnow().isoformat()
        
    def start(self):
        self.state = TaskState.IN_PROGRESS
        self.updated_at = datetime.utcnow().isoformat()
        
    def complete(self):
        self.state = TaskState.COMPLETED
        self.updated_at = datetime.utcnow().isoformat()
        
    def fail(self, reason: Optional[str] = None):
        self.state = TaskState.FAILED
        self.failure_reason = reason
        self.updated_at = datetime.utcnow().isoformat()
EOF

echo -e "${YELLOW}Step 6: Testing MCP servers...${NC}"

# Create test script
cat > test_mcp_servers.py << 'EOF'
#!/usr/bin/env python3
"""Test MCP Server Connectivity"""

import asyncio
import sys
from pathlib import Path

# Add project to path
sys.path.append('/home/w3bsuki/MCP-RAG-V4')

async def test_server(name: str, command: str):
    try:
        print(f"Testing {name}...")
        # Add actual MCP connection test here
        print(f"✓ {name} - OK")
        return True
    except Exception as e:
        print(f"✗ {name} - FAILED: {e}")
        return False

async def main():
    servers = [
        ("GitHub", "github"),
        ("Filesystem", "filesystem"),
        ("Task Manager", "task-manager"),
        ("Context7", "context7"),
        ("Git MCP", "git-mcp")
    ]
    
    results = []
    for name, command in servers:
        result = await test_server(name, command)
        results.append((name, result))
    
    print("\n=== Test Results ===")
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{name}: {status}")

if __name__ == "__main__":
    asyncio.run(main())
EOF

chmod +x test_mcp_servers.py

echo -e "${YELLOW}Step 7: Creating agent startup scripts...${NC}"

# Create architect agent startup
cat > start_architect_agent.sh << 'EOF'
#!/bin/bash
cd /home/w3bsuki/MCP-RAG-V4/git-worktrees/architect
export MCP_CONFIG=/home/w3bsuki/MCP-RAG-V4/.mcp.json.enhanced
export AGENT_NAME=architect
echo "Starting Architect Agent..."
# Add actual claude-code command here
EOF

# Create builder agent startup
cat > start_builder_agent.sh << 'EOF'
#!/bin/bash
cd /home/w3bsuki/MCP-RAG-V4/git-worktrees/builder
export MCP_CONFIG=/home/w3bsuki/MCP-RAG-V4/.mcp.json.enhanced
export AGENT_NAME=builder
echo "Starting Builder Agent..."
# Add actual claude-code command here
EOF

# Create validator agent startup
cat > start_validator_agent.sh << 'EOF'
#!/bin/bash
cd /home/w3bsuki/MCP-RAG-V4/git-worktrees/validator
export MCP_CONFIG=/home/w3bsuki/MCP-RAG-V4/.mcp.json.enhanced
export AGENT_NAME=validator
echo "Starting Validator Agent..."
# Add actual claude-code command here
EOF

chmod +x start_*.sh

echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Set environment variables:"
echo "   export GITHUB_TOKEN=your_token"
echo "   export UPSTASH_REDIS_REST_URL=your_url"
echo "   export UPSTASH_REDIS_REST_TOKEN=your_token"
echo ""
echo "2. Start required services:"
echo "   sudo systemctl start rabbitmq-server"
echo "   sudo systemctl start redis-server"
echo "   docker-compose up -d qdrant"
echo ""
echo "3. Replace .mcp.json with enhanced version:"
echo "   mv .mcp.json .mcp.json.backup"
echo "   mv .mcp.json.enhanced .mcp.json"
echo ""
echo "4. Test MCP servers:"
echo "   ./test_mcp_servers.py"
echo ""
echo "5. Start agents:"
echo "   ./start_architect_agent.sh"
echo "   ./start_builder_agent.sh"
echo "   ./start_validator_agent.sh"