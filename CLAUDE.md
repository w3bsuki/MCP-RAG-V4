# MCP-RAG-V4 System Rules

## 🎯 System Purpose
Production-ready multi-agent development system using git worktrees, MCP communication, and RAG knowledge management.

## 🏗️ Architecture Overview
```
Orchestrator (coordinator)
    ├── Architect (designer) 
    ├── Builder (implementer)
    └── Validator (tester)
```

## 📁 Perfect Structure (v2.0)
```
MCP-RAG-V4/
├── .swarm/              # Orchestration config
│   ├── config.yaml      # Agent topology
│   └── orchestrator.ts  # Coordination logic
├── .worktrees/          # Agent workspaces
│   ├── architect/       # Full repo on architect branch
│   ├── builder/         # Full repo on builder branch
│   ├── validator/       # Full repo on validator branch
│   └── orchestrator/    # Full repo on orchestrator branch
├── .mcp/                # MCP servers
│   ├── rag-server.ts    # Pattern search & storage
│   ├── task-server.ts   # Task verification
│   └── bridge-server.ts # Inter-agent communication
├── agents/              # Agent configs (YAML format)
│   ├── architect.yaml
│   ├── builder.yaml
│   ├── validator.yaml
│   └── orchestrator.yaml
├── coordination/        # Task management
│   ├── ACTIVE_TASKS.json
│   └── memory-bank/     # RAG patterns
├── knowledge/           # Shared knowledge
│   ├── patterns/        # Reusable solutions
│   ├── decisions/       # Architecture decisions  
│   └── learnings/       # Post-mortems
├── orchestration/       # Workflows
│   ├── workflows/       # Automated processes
│   └── monitors/        # Health checks
└── projects/            # Actual code
    ├── project1/        # Monitoring dashboard
    ├── project3/        # Crypto predictions
    ├── project4/        # Crypto dashboard
    └── project5/        # Strike Shop e-commerce
```

## 🚀 Quick Start
```bash
# Terminal 1: Start orchestrator
./start-swarm.sh

# Terminals 2-4: Launch agents
./launch-agent.sh architect
./launch-agent.sh builder
./launch-agent.sh validator
```

## ⚡ Key Innovations

### 1. Git Worktrees = Full Access
- Each agent has complete repo access
- Work on separate branches safely
- Can run npm install, dev servers, tests
- No more "permission denied" errors!

### 2. MCP Tools = Real Communication
```typescript
// Search before building
rag_query({ query: "auth patterns", tags: ["security"] });

// Talk to teammates
send_to_agent({ to: "architect", message: "Need help with API design" });

// Prove work is done
verify_npm_install({ projectPath: "/projects/project5" });

// Visual proof
screenshot({ url: "http://localhost:3000", outputPath: "proof.png" });
```

### 3. Task Verification = Trust but Verify
```json
{
  "status": "COMPLETED",
  "verification": {
    "npm_installed": true,
    "server_running": true,
    "tests": "42/42 passing",
    "build_success": true,
    "screenshot": "feature-working.png"
  }
}
```

## 📋 Agent Responsibilities

### Architect
- Design scalable systems
- Create clear specifications
- Break down complex tasks
- Store patterns for reuse
- NEVER write implementation code

### Builder
- Implement architect's designs exactly
- ALWAYS run npm install first
- Test as you build
- Commit every 30-60 minutes
- Verify everything works

### Validator
- Test all implementations
- Take screenshots as proof
- Run security scans
- Block bad code merges
- Ensure production readiness

### Orchestrator
- Assign tasks to agents
- Route inter-agent messages
- Monitor task progress
- Resolve conflicts
- Merge approved work

## 🛠️ Workflows

### New Project Workflow
1. Human adds task to ACTIVE_TASKS.json
2. Orchestrator assigns to architect
3. Architect designs solution
4. Builder implements in worktree
5. Validator tests thoroughly
6. Orchestrator merges if approved

### Daily Development
1. Check ACTIVE_TASKS.json for work
2. Query RAG for existing patterns
3. Work in your worktree branch
4. Communicate via MCP tools
5. Update task with verification

## 🚨 Critical Rules

1. **ALWAYS VERIFY**: No "COMPLETED" without proof
2. **USE RAG FIRST**: Don't reinvent the wheel
3. **COMMUNICATE BLOCKERS**: Use send_to_agent
4. **TEST EVERYTHING**: Quality over speed
5. **RESPECT STRUCTURE**: Don't break what works

## 📚 Documentation
- **Quick Start**: `QUICKSTART.md`
- **Full Manual**: `OPERATION_MANUAL.md`
- **Agent Guide**: `agents/ONBOARDING.md`
- **Workflows**: `WORKFLOW_GUIDE.md`
- **Architecture**: `PERFECT_ARCHITECTURE.md`

## 📍 Current Projects
- **Project1**: ✅ Deployed - Agent monitoring dashboard
- **Project3**: 🔄 80% done - Crypto AI predictions
- **Project4**: ✅ Deployed - Crypto price dashboard  
- **Project5**: 🚧 Ready - Strike Shop e-commerce (needs deployment)

## 🎉 Success Metrics
- ✅ Agents have full repo access via worktrees
- ✅ MCP tools enable real communication
- ✅ Task verification prevents false completions
- ✅ RAG system captures and shares knowledge
- ✅ Clean structure scales to any project

---

**Remember**: Good architecture enables good implementation. Every agent success makes the system smarter!