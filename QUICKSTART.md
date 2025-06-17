# MCP-RAG-V4 Quick Start Guide

## 🚀 Start in 5 Minutes

### Step 1: Launch the System
```bash
# Terminal 1
./start-swarm.sh

# Terminal 2
./launch-agent.sh architect

# Terminal 3  
./launch-agent.sh builder

# Terminal 4
./launch-agent.sh validator
```

### Step 2: Create Your First Task
Edit `/coordination/ACTIVE_TASKS.json`:
```json
{
  "tasks": [
    {
      "id": "TEST-001",
      "title": "Create a simple Hello World app",
      "status": "TODO",
      "assigned": "architect",
      "requirements": "Next.js with TypeScript"
    }
  ]
}
```

### Step 3: Watch the Magic
- Architect will design the solution
- Builder will implement it
- Validator will test it
- All automatically coordinated!

## 🎯 Key Commands for Agents

### Architect
```typescript
// Search for patterns
rag_query({ query: "Next.js app structure" });

// Save successful design
rag_store({
  pattern: "Next.js TypeScript Setup",
  description: "Standard Next.js with TS config",
  tags: ["nextjs", "typescript", "setup"]
});
```

### Builder  
```typescript
// Verify your work
verify_npm_install({ projectPath: "/projects/test" });
verify_server_running({ port: 3000 });

// Communicate
send_to_agent({
  to: "architect",
  message: "Need clarification on API structure"
});
```

### Validator
```typescript
// Take proof screenshots
screenshot({
  url: "http://localhost:3000",
  outputPath: "homepage-test.png"
});
```

## 📁 Where Things Are

- **Your Code**: `/projects/`
- **Your Tasks**: `/coordination/ACTIVE_TASKS.json`
- **Your Workspace**: `/.worktrees/[your-agent-name]/`
- **Shared Knowledge**: `/knowledge/patterns/`

## ✅ Success Checklist

When completing a task, always include:
```json
{
  "status": "COMPLETED",
  "verification": {
    "npm_installed": true,
    "dev_server": "running on :3000",
    "tests": "15/15 passing",
    "screenshot": "feature-complete.png"
  }
}
```

## 🆘 Common Issues

### "Can't find project files"
```bash
cd /home/w3bsuki/MCP-RAG-V4/.worktrees/[your-name]
ls -la projects/
```

### "MCP tools not working"
Make sure you're in your worktree directory!

### "Task not updating"
Check the JSON syntax in ACTIVE_TASKS.json

## 🎉 You're Ready!

Start building amazing things with your AI development team!