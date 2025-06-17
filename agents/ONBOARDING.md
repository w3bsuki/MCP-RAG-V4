# Agent Onboarding Guide

Welcome to the MCP-RAG-V4 multi-agent development system! This guide will help you understand your role and how to work effectively.

## System Overview

We use a swarm architecture where specialized agents collaborate through:
- **Git Worktrees**: Each agent has their own isolated workspace
- **MCP Tools**: Inter-agent communication and task verification
- **RAG System**: Shared knowledge and pattern library
- **Task Coordination**: Central task management via ACTIVE_TASKS.json

## Your Workspace

Each agent works in their own git worktree:
```
/home/w3bsuki/MCP-RAG-V4/.worktrees/[agent-name]/
```

You have full access to:
- All project files
- Package management (npm, yarn)
- Git operations
- Development servers

## Key MCP Tools

### 1. RAG Tools
```typescript
// Search for patterns before implementing
rag_query({
  query: "authentication flow patterns",
  tags: ["auth", "security"]
});

// Store successful patterns
rag_store({
  pattern: "JWT refresh token flow",
  description: "Secure token refresh implementation",
  tags: ["auth", "jwt", "security"],
  code: "See implementation in lib/auth.ts"
});
```

### 2. Communication Tools
```typescript
// Send message to another agent
send_to_agent({
  to: "architect",
  message: "Need clarification on API design",
  context: { file: "api/routes.ts", line: 45 }
});

// Request information
request_from_agent({
  from: "validator",
  request: "Please review the auth implementation"
});
```

### 3. Verification Tools
```typescript
// Verify npm install completed
verify_npm_install({
  projectPath: "/projects/project5"
});

// Check if server is running
verify_server_running({
  port: 3000,
  healthEndpoint: "/api/health"
});
```

## Task Management

### Reading Tasks
Check `/coordination/ACTIVE_TASKS.json` regularly:
```json
{
  "id": "TASK-123",
  "title": "Implement user authentication",
  "assigned": "builder",
  "status": "TODO",
  "requirements": "..."
}
```

### Updating Tasks
Always include verification proof:
```json
{
  "id": "TASK-123",
  "status": "COMPLETED",
  "verification": {
    "npm_installed": true,
    "tests_passing": "15/15",
    "dev_server": "running on :3000",
    "screenshot": "auth-working.png"
  }
}
```

## Git Workflow

### For Builders
```bash
# Work in your branch
git checkout builder

# Commit frequently
git add .
git commit -m "feat: implement user authentication"

# Push to your branch
git push origin builder
```

### For All Agents
- Commit every 30-60 minutes
- Use conventional commits (feat:, fix:, docs:, etc.)
- Keep commits focused and atomic

## Best Practices

### 1. Always Verify Work
❌ Bad:
```json
{ "status": "COMPLETED" }
```

✅ Good:
```json
{
  "status": "COMPLETED",
  "verification": {
    "npm_installed": true,
    "build_success": true,
    "tests": "42/42 passing"
  }
}
```

### 2. Use RAG Before Building
Always search for existing patterns:
1. Query RAG for similar implementations
2. Review returned patterns
3. Adapt to current needs
4. Store new patterns after success

### 3. Communicate Proactively
- Blocked? Message the relevant agent
- Found an issue? Alert the team
- Completed a task? Update immediately

### 4. Test Everything
- Unit tests for logic
- Integration tests for features
- E2E tests for workflows
- Screenshot proof for UI

## Common Workflows

### Starting a New Feature
1. Read task from ACTIVE_TASKS.json
2. Query RAG for patterns
3. Review architect's design
4. Implement incrementally
5. Test thoroughly
6. Update task with proof

### Debugging Issues
1. Check error logs
2. Verify dependencies installed
3. Ensure dev server running
4. Take screenshots of errors
5. Communicate with team

### Completing Work
1. Run all tests
2. Verify build succeeds
3. Take success screenshots
4. Update task status
5. Commit and push
6. Notify validator

## Troubleshooting

### Can't find project files?
```bash
pwd  # Should be in your worktree
ls -la projects/
```

### MCP tools not working?
```bash
# Check if in correct directory
cd /home/w3bsuki/MCP-RAG-V4/.worktrees/[your-agent]
```

### Git issues?
```bash
git status
git branch  # Should show your agent branch
```

## Remember

- You're part of a team - communicate!
- Verify everything - trust but verify
- Use existing patterns - don't reinvent
- Document successes - help future agents
- Ask for help - we're here to succeed together

Welcome to the swarm! 🐝