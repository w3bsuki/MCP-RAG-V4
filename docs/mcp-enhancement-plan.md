# MCP Enhancement Plan for Multi-Agent System

## Current Issues
1. Only GitHub MCP server is working
2. Agents cannot communicate effectively
3. Missing task management capabilities
4. No shared state management
5. Limited debugging capabilities

## Phase 1: Core Infrastructure (Immediate)

### 1. Fix Existing MCP Servers
```bash
# Install missing dependencies
cd /home/w3bsuki/MCP-RAG-V4
source mcp-venv/bin/activate
pip install mcp pydantic fastapi uvicorn qdrant-client sentence-transformers

# Test each server individually
python mcp-servers/knowledge-base-python/server.py --test
python mcp-servers/vector-search-python/server.py --test
python mcp-servers/coordination-hub/server.py --test
```

### 2. Add Essential MCP Servers

#### Context7 (Documentation Access)
```json
"context7": {
  "command": "npx",
  "args": ["@upstash/context7"],
  "env": {
    "UPSTASH_REDIS_REST_URL": "${UPSTASH_REDIS_REST_URL}",
    "UPSTASH_REDIS_REST_TOKEN": "${UPSTASH_REDIS_REST_TOKEN}"
  },
  "description": "Real-time documentation for agents"
}
```

#### Task Manager MCP
```json
"task-manager": {
  "command": "npx",
  "args": ["task-manager-mcp", "--db-path", "./shared/tasks.db"],
  "env": {
    "TASK_DB_PATH": "./shared/tasks.db"
  },
  "description": "Persistent task management for agents"
}
```

#### MCP Inspector (Debugging)
```json
"mcp-inspector": {
  "command": "npx",
  "args": ["@modelcontextprotocol/inspector"],
  "description": "Debug MCP connections"
}
```

## Phase 2: Agent Communication Layer

### 1. Message Queue System
```json
"rabbitmq-mcp": {
  "command": "npx",
  "args": ["rabbitmq-mcp"],
  "env": {
    "RABBITMQ_URL": "amqp://localhost:5672",
    "EXCHANGE_NAME": "agent_exchange"
  },
  "description": "Inter-agent messaging"
}
```

### 2. Shared State Management
```json
"redis-mcp": {
  "command": "npx",
  "args": ["redis-mcp"],
  "env": {
    "REDIS_URL": "redis://localhost:6379"
  },
  "description": "Shared state for agents"
}
```

### 3. Git Operations
```json
"git-mcp": {
  "command": "npx",
  "args": ["git-mcp", "--repo-path", "./"],
  "description": "Git operations for agents"
}
```

## Phase 3: Testing & Validation

### 1. Testing Server
```json
"testing-tools": {
  "command": "npx",
  "args": ["@modelcontextprotocol/server-testing"],
  "description": "Testing capabilities for validator"
}
```

### 2. Security Scanner
```json
"security-scanner": {
  "command": "npx",
  "args": ["security-scanner-mcp"],
  "description": "Security validation for validator agent"
}
```

## Agent-Specific Configuration

### Architect Agent
- Needs: context7, task-manager, knowledge-base, vector-search
- Purpose: Design decisions with up-to-date documentation

### Builder Agent  
- Needs: filesystem, git-mcp, context7, task-manager, testing-tools
- Purpose: Implementation with version control

### Validator Agent
- Needs: testing-tools, security-scanner, task-manager, rabbitmq-mcp
- Purpose: Quality assurance and approval workflow

## Implementation Steps

1. **Fix Python MCP Servers**
   ```bash
   # Create proper MCP server structure
   cd mcp-servers
   
   # Each server needs:
   # - __init__.py
   # - server.py with MCP protocol implementation
   # - requirements.txt
   # - Proper async/await structure
   ```

2. **Install NPM-based MCP Servers**
   ```bash
   npm install -g @modelcontextprotocol/inspector
   npm install -g @upstash/context7
   npm install -g task-manager-mcp
   ```

3. **Update .mcp.json**
   - Add new servers
   - Configure permissions
   - Set up agent-specific access

4. **Create Communication Protocol**
   ```python
   # Example message format
   {
     "from_agent": "architect",
     "to_agent": "builder",
     "task_id": "uuid",
     "action": "implement_specification",
     "payload": {
       "specification_path": "/shared/specs/api-v2.yaml",
       "priority": "high"
     }
   }
   ```

5. **Set Up Monitoring**
   - Health checks for all MCP servers
   - Message queue monitoring
   - Task completion tracking

## Expected Outcome

- Agents can discover and claim tasks
- Architect creates specs, notifies Builder
- Builder implements, notifies Validator
- Validator tests, approves/rejects
- All communication via MCP protocols
- Full audit trail in shared storage

## Testing Plan

1. Start all MCP servers
2. Create test task in task-manager
3. Architect agent claims and designs
4. Builder agent receives notification
5. Validator agent validates result
6. Verify complete workflow

## Troubleshooting

If servers fail to start:
1. Check Python environment activation
2. Verify all dependencies installed
3. Test with MCP Inspector
4. Check port conflicts
5. Review server logs