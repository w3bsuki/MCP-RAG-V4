# MCP-RAG-V4 Workflow Guide

## Quick Start

### Starting the System
```bash
cd /home/w3bsuki/MCP-RAG-V4

# 1. Start the orchestrator (runs all MCP servers)
./start-swarm.sh

# 2. Launch agents in separate terminals
./launch-agent.sh architect
./launch-agent.sh builder  
./launch-agent.sh validator
```

### Stopping the System
```bash
./stop-swarm.sh
```

## Core Workflows

### 1. New Project Workflow

#### Step 1: Human Creates Project Request
```bash
# Add to ACTIVE_TASKS.json
{
  "id": "PROJECT-6-INIT",
  "task": "Create new AI chatbot project",
  "status": "TODO",
  "assigned": "orchestrator",
  "requirements": "Next.js, TypeScript, OpenAI integration"
}
```

#### Step 2: Orchestrator Delegates
The orchestrator:
1. Reads new task
2. Assigns architect for design
3. Creates workflow in `orchestration/workflows/project6-init.yaml`

#### Step 3: Architect Phase
```bash
# Architect in their worktree
cd /projects/project6

# 1. Query existing patterns
rag_query "chatbot architecture Next.js TypeScript"

# 2. Create design
cat > README.md << 'EOF'
# Project 6: AI Chatbot

## Architecture
- Next.js 14 App Router
- OpenAI GPT-4 integration  
- Streaming responses
- Message persistence

## Technical Decisions
Based on RAG pattern #chat-001:
- Use Vercel AI SDK for streaming
- PostgreSQL for message history
- Rate limiting with Redis
EOF

# 3. Create task breakdown
Update ACTIVE_TASKS.json with implementation tasks

# 4. Store pattern
rag_store {
  pattern: "AI Chatbot Architecture",
  description: "Next.js + OpenAI streaming chat",
  tags: ["chatbot", "streaming", "nextjs"],
  code: "See project6/README.md"
}
```

#### Step 4: Builder Phase
```bash
# Builder in their worktree
cd /projects/project6

# 1. Read architect's design
cat README.md

# 2. Initialize project
npx create-next-app@latest . --typescript --tailwind --app

# 3. VERIFY npm install
verify_npm_install "/projects/project6"
# Returns: { success: true, hasNodeModules: true, packageCount: 234 }

# 4. Implement features
# ... write code ...

# 5. Test locally
npm run dev

# 6. Verify server running
verify_server_running { port: 3000, healthEndpoint: "/api/health" }

# 7. Update task with PROOF
{
  "id": "PROJECT-6-IMPL",
  "status": "COMPLETED",
  "proof": {
    "nodeModules": true,
    "devServerRunning": true,
    "screenshot": "project6-running.png"
  }
}

# 8. Commit and notify
git add .
git commit -m "feat: implement AI chatbot with streaming"
send_to_agent {
  to: "validator",
  message: "Project 6 ready for testing",
  context: { branch: "builder", port: 3000 }
}
```

#### Step 5: Validator Phase
```bash
# Validator in their worktree
cd /projects/project6

# 1. Pull builder's changes
git pull origin builder

# 2. Install and test
npm install
npm test

# 3. Visual validation
screenshot "http://localhost:3000" "project6-ui-test.png"

# 4. API testing
curl http://localhost:3000/api/chat -X POST -d '{"message":"Hello"}'

# 5. Update validation results
{
  "id": "PROJECT-6-VAL", 
  "status": "COMPLETED",
  "results": {
    "tests": "15/15 passing",
    "coverage": "92%",
    "ui": "Screenshot verified",
    "api": "Endpoints responding"
  }
}

# 6. Approve or reject
send_to_agent {
  to: "orchestrator",
  message: "Project 6 APPROVED for merge",
  context: { allTestsPassing: true }
}
```

#### Step 6: Orchestrator Merge
```bash
# If approved, orchestrator merges
git checkout main
git merge builder
git push origin main
```

### 2. Bug Fix Workflow

#### Quick Fix Process
1. **Human reports bug** → ACTIVE_TASKS.json
2. **Builder investigates** in worktree
3. **Builder fixes** with test
4. **Validator verifies** fix works
5. **Orchestrator merges** if approved

### 3. Feature Addition Workflow

#### For Existing Projects
1. **Architect reviews** current architecture
2. **Architect designs** feature integration  
3. **Builder implements** in feature branch
4. **Validator tests** integration
5. **Orchestrator coordinates** deployment

## Agent Communication Patterns

### 1. Request Help
```typescript
// Builder needs architecture clarification
send_to_agent({
  to: "architect",
  message: "Need clarification on auth flow",
  context: {
    file: "lib/auth.ts",
    line: 45,
    issue: "Should we use JWT or sessions?"
  }
});
```

### 2. Share Context
```typescript
// Architect shares design decision
send_to_agent({
  to: "all",
  message: "Decision: Using JWT for stateless auth",
  context: {
    reasoning: "Microservices compatibility",
    pattern: "jwt-auth-pattern-001"
  }
});
```

### 3. Request Review
```typescript
// Builder requests code review
request_from_agent({
  from: "validator",
  request: "Please review auth implementation",
  files: ["lib/auth.ts", "middleware/auth.ts"]
});
```

## Task Verification Protocol

### Always Verify Actual Completion
```typescript
// Bad (just status update)
{
  "status": "COMPLETED"
}

// Good (verified completion)
{
  "status": "COMPLETED",
  "verification": {
    "npm_installed": true,
    "tests_passing": "45/45",
    "dev_server": "running on :3000",
    "build_success": true,
    "screenshot": "feature-working.png"
  }
}
```

### Verification Tools
- `verify_npm_install` - Check node_modules exists
- `verify_server_running` - Check dev server is up
- `track_real_progress` - Compare claimed vs actual
- `screenshot` - Visual proof of UI features

## Troubleshooting

### Agent Can't Access Projects
```bash
# Ensure agent is in their worktree
pwd  # Should be /home/w3bsuki/MCP-RAG-V4/.worktrees/[agent]

# Check projects exist
ls -la projects/
```

### MCP Tools Not Working
```bash
# Restart MCP servers
./restart-mcp-servers.sh

# Check logs
tail -f logs/rag-server.log
tail -f logs/task-server.log
```

### Agent Communication Failed
```bash
# Check bridge server
ps aux | grep bridge-server

# Restart orchestrator
./restart-orchestrator.sh
```

## Best Practices

### For Architects
1. **Always query RAG first** - Don't reinvent patterns
2. **Document every decision** - Future agents need context
3. **Create clear task breakdowns** - Enable parallel work
4. **Think about testing** - Design for testability

### For Builders  
1. **Read the full spec** - Understand before coding
2. **Install dependencies first** - Always run npm install
3. **Test as you go** - Don't wait until the end
4. **Commit frequently** - Small, focused commits
5. **Verify everything** - Prove your work is done

### For Validators
1. **Test comprehensively** - Unit, integration, E2E
2. **Take screenshots** - Visual proof is powerful
3. **Test error cases** - Not just happy paths
4. **Performance matters** - Check bundle sizes
5. **Security first** - Scan for vulnerabilities

### For Orchestrators
1. **Monitor actively** - Watch agent progress
2. **Facilitate communication** - Route requests
3. **Enforce standards** - Maintain quality
4. **Manage conflicts** - Resolve disputes
5. **Optimize workflows** - Improve processes

## Advanced Workflows

### Parallel Development
```yaml
# orchestration/workflows/parallel-features.yaml
workflow:
  name: "Parallel Feature Development"
  tasks:
    - id: "auth-system"
      assigned: "builder-1"
      branch: "feature/auth"
    - id: "payment-integration"  
      assigned: "builder-2"
      branch: "feature/payments"
    - id: "ui-redesign"
      assigned: "builder-3"
      branch: "feature/new-ui"
  
  coordination:
    - type: "daily-sync"
      time: "10:00"
      participants: ["all"]
    - type: "merge-check"
      frequency: "on-completion"
      validator: "required"
```

### Emergency Hotfix
```yaml
# orchestration/workflows/emergency-hotfix.yaml
workflow:
  name: "Emergency Hotfix"
  priority: "CRITICAL"
  steps:
    1. Create hotfix branch from production
    2. Builder fixes issue immediately
    3. Validator runs minimal test suite
    4. Orchestrator deploys directly
    5. Full test suite runs post-deploy
```

## Metrics & Monitoring

### Track Success
- Task completion rate
- Verification accuracy
- Agent collaboration frequency  
- Pattern reuse rate
- Bug escape rate

### Dashboard View
```
┌─────────────────────────────────────┐
│        MCP-RAG-V4 Dashboard         │
├─────────────────────────────────────┤
│ Active Agents: 🟢 3/3               │
│ Tasks Today: 12 ✓ | 3 ⏳ | 1 ✗      │
│ Pattern Queries: 47                 │
│ Verifications: 15/16 accurate       │
│                                     │
│ Current Focus: Project 5 Deployment │
│ └─ Architect: ✓ Design complete    │
│ └─ Builder: ⏳ Implementing...      │
│ └─ Validator: ⏸️  Waiting          │
└─────────────────────────────────────┘
```

This workflow ensures reliable, verifiable multi-agent development!