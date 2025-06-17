# Implementation Plan: MCP-RAG-V4 Perfect Architecture

## Pre-Implementation Checklist
- [ ] Backup current state: `git add . && git commit -m "backup: before restructure"`
- [ ] Document current working features
- [ ] Ensure main branch is clean
- [ ] Have terminal access ready

## Phase 1: Clean Current Mess (30 minutes)

### Step 1.1: Remove Broken Structures
```bash
cd /home/w3bsuki/MCP-RAG-V4

# Remove broken worktrees
rm -rf agents/*workspace*
rm -rf .worktrees  # if exists
git worktree prune

# Clean up duplicate files
rm -f AGENT_*.md MCP_*.md MONITOR.md STRUCTURE.md
rm -f setup*.sh cleanup*.sh final*.sh
rm -rf mcp-rag-dev-system

# Remove duplicate task files
find . -name "TASK*.md" -o -name "TODO*.md" -o -name "PLAN*.md" | grep -v ACTIVE_TASKS.json | xargs rm -f
```

### Step 1.2: Preserve Good Parts
```bash
# Keep these:
# - /projects/* (all project code)
# - /coordination/ACTIVE_TASKS.json
# - /coordination/memory-bank/* (RAG data)
# - /agents/*/CLAUDE.md (agent rules - will migrate to YAML)
```

## Phase 2: Create Perfect Worktree Structure (45 minutes)

### Step 2.1: Initialize Git Branches
```bash
# Create dedicated branches for each agent
git branch architect main
git branch builder main  
git branch validator main
git branch orchestrator main
```

### Step 2.2: Set Up Proper Worktrees
```bash
# Create worktree directory
mkdir -p .worktrees

# Create agent worktrees with full repo access
git worktree add .worktrees/architect architect
git worktree add .worktrees/builder builder
git worktree add .worktrees/validator validator
git worktree add .worktrees/orchestrator orchestrator

# Verify worktrees
git worktree list
# Should show:
# /home/w3bsuki/MCP-RAG-V4                    [main]
# /home/w3bsuki/MCP-RAG-V4/.worktrees/architect    [architect]
# /home/w3bsuki/MCP-RAG-V4/.worktrees/builder      [builder]
# /home/w3bsuki/MCP-RAG-V4/.worktrees/validator    [validator]
# /home/w3bsuki/MCP-RAG-V4/.worktrees/orchestrator [orchestrator]
```

### Step 2.3: Initialize Each Worktree
```bash
# For each worktree, ensure they have dependencies
for agent in architect builder validator orchestrator; do
  echo "Setting up $agent worktree..."
  cd /home/w3bsuki/MCP-RAG-V4/.worktrees/$agent
  
  # Install root dependencies if package.json exists
  if [ -f package.json ]; then
    npm install
  fi
  
  # Set up git config
  git config user.name "Agent-$agent"
  git config user.email "$agent@mcp-rag.local"
done

cd /home/w3bsuki/MCP-RAG-V4
```

## Phase 3: Implement MCP Infrastructure (1 hour)

### Step 3.1: Create Swarm Configuration
```bash
mkdir -p .swarm
```

Create `.swarm/config.yaml`:
```yaml
version: "1.0"
swarm:
  name: "mcp-rag-v4"
  
  orchestrator:
    name: "orchestrator"
    description: "Lead coordinator managing all agents"
    workspace: ".worktrees/orchestrator"
    mcp_servers:
      - name: "task-server"
        command: "npx tsx .mcp/task-server.ts"
      - name: "rag-server"
        command: "npx tsx .mcp/rag-server.ts"
    connections:
      - architect
      - builder
      - validator

  agents:
    - name: "architect"
      description: "System design and architecture planning"
      workspace: ".worktrees/architect"
      branch: "architect"
      mcp_servers:
        - name: "rag-server"
          command: "npx tsx ../../.mcp/rag-server.ts"
        - name: "bridge-server"
          command: "npx tsx ../../.mcp/bridge-server.ts"
          args: ["--agent", "architect"]
      allowed_tools:
        - read
        - write
        - search
        - ragQuery
        - ragStore
      system_prompt: |
        You are the system architect for MCP-RAG-V4.
        - Design scalable, maintainable solutions
        - Query RAG for existing patterns before designing
        - Document all decisions in /knowledge/decisions/
        - Create clear specifications in project README.md
        - Never implement code, only design

    - name: "builder"
      description: "Implementation and coding"
      workspace: ".worktrees/builder"
      branch: "builder"
      mcp_servers:
        - name: "rag-server"
          command: "npx tsx ../../.mcp/rag-server.ts"
        - name: "task-server"
          command: "npx tsx ../../.mcp/task-server.ts"
        - name: "bridge-server"
          command: "npx tsx ../../.mcp/bridge-server.ts"
          args: ["--agent", "builder"]
      allowed_tools:
        - all
      system_prompt: |
        You are the implementation specialist.
        - Follow architect's designs exactly
        - ALWAYS run 'npm install' after creating package.json
        - Test your implementations
        - Commit frequently with descriptive messages
        - Update task status in ACTIVE_TASKS.json with proof of completion

    - name: "validator" 
      description: "Testing and quality assurance"
      workspace: ".worktrees/validator"
      branch: "validator"
      mcp_servers:
        - name: "task-server"
          command: "npx tsx ../../.mcp/task-server.ts"
        - name: "bridge-server"
          command: "npx tsx ../../.mcp/bridge-server.ts"
          args: ["--agent", "validator"]
      allowed_tools:
        - read
        - bash
        - test
        - screenshot
      system_prompt: |
        You are the quality gatekeeper.
        - Test all implementations thoroughly
        - Verify deployments actually work
        - Take screenshots of UI features
        - Block any merge with failing tests
        - Document test results in task updates
```

### Step 3.2: Implement MCP Servers

Create `.mcp/rag-server.ts`:
```typescript
// Enhanced RAG server with vector search
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ChromaClient } from "chromadb";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

class RagServer {
  private server: Server;
  private chroma: ChromaClient;
  private collection: any;

  async initialize() {
    // Initialize vector DB
    this.chroma = new ChromaClient();
    this.collection = await this.chroma.getOrCreateCollection({
      name: "mcp_rag_patterns"
    });

    // Load existing patterns from memory-bank
    await this.loadExistingPatterns();

    // Set up MCP tools
    this.server.setRequestHandler("tools/list", async () => ({
      tools: [
        {
          name: "rag_query",
          description: "Search for patterns and solutions",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              tags: { type: "array", items: { type: "string" } }
            }
          }
        },
        {
          name: "rag_store",
          description: "Store successful pattern",
          inputSchema: {
            type: "object",
            properties: {
              pattern: { type: "string" },
              description: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              code: { type: "string" }
            }
          }
        }
      ]
    }));
  }

  private async loadExistingPatterns() {
    const memoryBankPath = join(process.cwd(), "coordination", "memory-bank");
    const files = await readdir(memoryBankPath);
    
    for (const file of files) {
      if (file.endsWith(".json")) {
        const content = await readFile(join(memoryBankPath, file), "utf-8");
        const pattern = JSON.parse(content);
        
        // Add to vector DB
        await this.collection.add({
          ids: [pattern.id],
          documents: [pattern.content],
          metadatas: [{ tags: pattern.tags.join(","), agent: pattern.agentId }]
        });
      }
    }
  }
}
```

Create `.mcp/task-server.ts`:
```typescript
// Task verification and tracking server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

class TaskServer {
  private server: Server;

  async initialize() {
    this.server.setRequestHandler("tools/list", async () => ({
      tools: [
        {
          name: "verify_npm_install",
          description: "Verify npm install was actually run",
          inputSchema: {
            type: "object",
            properties: {
              projectPath: { type: "string" }
            }
          }
        },
        {
          name: "verify_server_running",
          description: "Check if dev server is actually running",
          inputSchema: {
            type: "object",
            properties: {
              port: { type: "number" },
              healthEndpoint: { type: "string" }
            }
          }
        },
        {
          name: "track_real_progress",
          description: "Track actual vs reported progress",
          inputSchema: {
            type: "object",
            properties: {
              taskId: { type: "string" },
              expectedOutput: { type: "string" },
              actualCheck: { type: "string" }
            }
          }
        }
      ]
    }));

    // Implement verification logic
    this.server.setRequestHandler("tools/call", async (request) => {
      switch (request.params.name) {
        case "verify_npm_install":
          return await this.verifyNpmInstall(request.params.arguments);
        case "verify_server_running":
          return await this.verifyServerRunning(request.params.arguments);
        case "track_real_progress":
          return await this.trackRealProgress(request.params.arguments);
      }
    });
  }

  private async verifyNpmInstall(args: any) {
    try {
      const { stdout } = await execAsync(`ls -la ${args.projectPath}/node_modules`);
      return {
        success: true,
        hasNodeModules: stdout.includes("node_modules"),
        packageCount: stdout.split("\\n").length - 3
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

Create `.mcp/bridge-server.ts`:
```typescript
// Inter-agent communication bridge
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebSocket } from "ws";

class BridgeServer {
  private server: Server;
  private connections: Map<string, WebSocket> = new Map();
  private agentName: string;

  constructor(agentName: string) {
    this.agentName = agentName;
  }

  async initialize() {
    // Connect to central hub
    const ws = new WebSocket("ws://localhost:8765");
    
    ws.on("open", () => {
      ws.send(JSON.stringify({
        type: "register",
        agent: this.agentName
      }));
    });

    // Set up MCP tools for communication
    this.server.setRequestHandler("tools/list", async () => ({
      tools: [
        {
          name: "send_to_agent",
          description: "Send message to another agent",
          inputSchema: {
            type: "object",
            properties: {
              to: { type: "string" },
              message: { type: "string" },
              context: { type: "object" }
            }
          }
        },
        {
          name: "request_from_agent",
          description: "Request information from another agent",
          inputSchema: {
            type: "object",
            properties: {
              from: { type: "string" },
              request: { type: "string" }
            }
          }
        }
      ]
    }));
  }
}
```

### Step 3.3: Create Orchestration Layer

Create `.swarm/orchestrator.ts`:
```typescript
// Main orchestration logic
import { spawn } from "child_process";
import { WebSocketServer } from "ws";

class Orchestrator {
  private agents: Map<string, any> = new Map();
  private wss: WebSocketServer;

  async initialize() {
    // Start WebSocket server for agent communication
    this.wss = new WebSocketServer({ port: 8765 });
    
    this.wss.on("connection", (ws) => {
      ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        this.handleAgentMessage(message, ws);
      });
    });

    // Start all agents
    await this.startAgents();
  }

  private async startAgents() {
    const config = await this.loadConfig();
    
    for (const agent of config.swarm.agents) {
      console.log(`Starting agent: ${agent.name}`);
      
      // Start agent in its worktree
      const agentProcess = spawn("claude", ["--continue-session"], {
        cwd: agent.workspace,
        env: {
          ...process.env,
          AGENT_NAME: agent.name,
          AGENT_PROMPT: agent.system_prompt
        }
      });

      this.agents.set(agent.name, {
        process: agentProcess,
        config: agent
      });
    }
  }

  private handleAgentMessage(message: any, ws: WebSocket) {
    switch (message.type) {
      case "register":
        console.log(`Agent registered: ${message.agent}`);
        break;
      case "task_complete":
        this.verifyTaskCompletion(message);
        break;
      case "request_help":
        this.routeHelpRequest(message);
        break;
    }
  }
}
```

## Phase 4: Create Knowledge Structure (30 minutes)

### Step 4.1: Set Up Knowledge Directories
```bash
mkdir -p knowledge/patterns
mkdir -p knowledge/decisions
mkdir -p knowledge/learnings
mkdir -p orchestration/workflows
mkdir -p orchestration/monitors
mkdir -p orchestration/verifiers
```

### Step 4.2: Migrate Existing Knowledge
```bash
# Move memory-bank patterns to knowledge/patterns
cp coordination/memory-bank/*.json knowledge/patterns/

# Create index for patterns
cat > knowledge/patterns/index.md << 'EOF'
# Pattern Library

## Categories
- Architecture Patterns
- Implementation Patterns
- Testing Patterns
- Deployment Patterns

## Usage
Agents should query these patterns via RAG before implementing new solutions.
EOF
```

## Phase 5: Agent Configuration Migration (20 minutes)

### Step 5.1: Convert CLAUDE.md to YAML
```bash
# Create new agent configs
mkdir -p agents

# Convert existing rules to new format
cat > agents/architect.yaml << 'EOF'
name: architect
role: System Architect
description: Designs scalable solutions and system architecture

skills:
  - System design
  - Architecture patterns
  - Technology selection
  - Documentation

tools:
  allowed:
    - read
    - write
    - search
    - web_search
    - rag_query
    - rag_store
    
rules:
  - Always query RAG before designing new solutions
  - Document decisions in knowledge/decisions/
  - Create comprehensive README.md for each project
  - Never write implementation code
  - Focus on scalability and maintainability

workflow:
  1. Analyze requirements
  2. Research existing patterns
  3. Design solution
  4. Document architecture
  5. Create task breakdown for builder
EOF

# Similar for builder.yaml and validator.yaml
```

## Phase 6: Testing & Verification (45 minutes)

### Step 6.1: Test Worktree Access
```bash
# Test each agent can access projects
for agent in architect builder validator; do
  echo "Testing $agent worktree..."
  cd /home/w3bsuki/MCP-RAG-V4/.worktrees/$agent
  
  # Verify projects exist
  ls -la projects/
  
  # Test npm install capability
  cd projects/project5
  npm install
  
  # Verify it worked
  ls -la node_modules/ | head -5
done
```

### Step 6.2: Test MCP Communication
```bash
# Start MCP servers
cd /home/w3bsuki/MCP-RAG-V4
npm install @modelcontextprotocol/sdk ws chromadb

# Start orchestrator
npx tsx .swarm/orchestrator.ts &

# Test RAG server
npx tsx .mcp/rag-server.ts &

# Test task verification
npx tsx .mcp/task-server.ts &
```

### Step 6.3: Launch Test Agents
```bash
# Start an agent session
cd /home/w3bsuki/MCP-RAG-V4/.worktrees/builder
claude --continue-session

# In Claude, test:
# 1. Can you see projects/project5?
# 2. Can you run npm install?
# 3. Can you use rag_query tool?
# 4. Can you communicate with architect?
```

## Phase 7: Documentation & Training (30 minutes)

### Step 7.1: Create Operation Manual
Create `OPERATION_MANUAL.md` with:
- How to start the swarm
- How to add new agents
- How to create workflows
- Troubleshooting guide

### Step 7.2: Create Agent Onboarding
Create `agents/ONBOARDING.md` with:
- Agent roles and responsibilities
- Tool usage examples
- Communication protocols
- Task verification requirements

## Success Criteria

- [ ] Each agent can access full project structure
- [ ] Agents can run npm install and start dev servers
- [ ] RAG queries return relevant patterns
- [ ] Task verification catches false completions
- [ ] Agents can communicate via MCP bridge
- [ ] No more nested folder confusion
- [ ] Clean git history with proper branches

## Rollback Plan

If something goes wrong:
```bash
# Remove worktrees
git worktree remove --force .worktrees/architect
git worktree remove --force .worktrees/builder
git worktree remove --force .worktrees/validator

# Reset to backup
git reset --hard HEAD
```

## Next Steps After Implementation

1. Test Project 5 deployment with new structure
2. Migrate all existing projects to use new workflow
3. Train agents on new communication protocols
4. Set up monitoring dashboard
5. Create automated workflow templates

This plan transforms the broken system into a professional multi-agent development environment!