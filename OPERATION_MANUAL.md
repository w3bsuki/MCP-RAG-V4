# MCP-RAG-V4 Operation Manual

## System Overview

MCP-RAG-V4 is a production-ready multi-agent development system that uses:
- **Git Worktrees** for agent isolation
- **MCP Protocol** for inter-agent communication
- **RAG System** for knowledge management
- **Task Verification** for ensuring real work completion

## Quick Start

### 1. Start the System
```bash
# Terminal 1: Start the orchestrator
./start-swarm.sh

# Terminal 2-4: Launch agents
./launch-agent.sh architect
./launch-agent.sh builder
./launch-agent.sh validator
```

### 2. Create a New Project
Add to `/coordination/ACTIVE_TASKS.json`:
```json
{
  "id": "PROJECT-6-INIT",
  "title": "Create new e-commerce platform",
  "status": "TODO",
  "assigned": "orchestrator",
  "requirements": "Next.js, TypeScript, Stripe integration"
}
```

The orchestrator will automatically delegate to agents.

### 3. Monitor Progress
- Check `ACTIVE_TASKS.json` for task status
- View agent branches for code changes
- Monitor orchestrator logs for communication

## Architecture

### Directory Structure
```
MCP-RAG-V4/
├── .swarm/              # Orchestration configuration
├── .worktrees/          # Agent workspaces (git worktrees)
├── .mcp/                # MCP servers
├── agents/              # Agent configurations
├── coordination/        # Task management
├── knowledge/           # Shared knowledge base
├── orchestration/       # Workflows and monitors
└── projects/            # Actual project code
```

### Agent Roles
1. **Architect**: Designs systems, creates specifications
2. **Builder**: Implements code following designs
3. **Validator**: Tests and ensures quality
4. **Orchestrator**: Coordinates all agents

## Key Features

### 1. Git Worktrees
Each agent works in their own worktree:
- No file conflicts
- Full repository access
- Independent branches
- Easy merging

### 2. MCP Tools
Agents communicate and verify work through MCP:
- `rag_query`: Search for patterns
- `rag_store`: Save successful patterns
- `send_to_agent`: Inter-agent messages
- `verify_npm_install`: Ensure dependencies installed
- `verify_server_running`: Check dev servers

### 3. Task Verification
No more false completions:
```json
{
  "status": "COMPLETED",
  "verification": {
    "npm_installed": true,
    "tests_passing": "42/42",
    "dev_server": "running on :3000",
    "screenshot": "feature-working.png"
  }
}
```

## Workflows

### New Feature Development
1. Architect designs and creates tasks
2. Builder implements in their worktree
3. Validator tests thoroughly
4. Orchestrator merges if approved

### Bug Fixes
1. Create bug task in ACTIVE_TASKS.json
2. Builder investigates and fixes
3. Validator verifies fix
4. Fast-track merge for critical fixes

## Troubleshooting

### Agent Can't Find Projects
```bash
cd /home/w3bsuki/MCP-RAG-V4/.worktrees/[agent-name]
ls -la projects/
```

### MCP Server Not Responding
```bash
# Restart the swarm
./stop-swarm.sh
./start-swarm.sh
```

### Git Worktree Issues
```bash
git worktree list
git worktree prune
```

### Task Not Being Picked Up
- Check orchestrator logs
- Ensure task has "TODO" status
- Verify task format in ACTIVE_TASKS.json

## Best Practices

### For System Operators
1. Monitor orchestrator logs regularly
2. Clean up completed tasks periodically
3. Review and merge agent work promptly
4. Update knowledge base with learnings

### For Development
1. Always verify work with proof
2. Use RAG before implementing
3. Communicate blockers immediately
4. Commit work frequently

### For Maintenance
1. Prune old worktrees monthly
2. Archive completed projects
3. Update agent configurations as needed
4. Review and optimize workflows

## Advanced Operations

### Adding New Agents
1. Create branch: `git branch new-agent`
2. Add worktree: `git worktree add .worktrees/new-agent new-agent`
3. Create config: `agents/new-agent.yaml`
4. Update `.swarm/config.yaml`

### Custom Workflows
Create in `orchestration/workflows/`:
```yaml
name: "Custom Workflow"
triggers:
  - type: "task"
    pattern: "CUSTOM-*"
steps:
  - id: "step1"
    assigned: "architect"
    tasks: ["Design solution"]
```

### Performance Monitoring
- Task completion rates
- Agent efficiency metrics
- System resource usage
- Knowledge base growth

## Security Considerations

1. Agents have full repository access
2. MCP servers run locally only
3. No external API keys in configs
4. Sensitive data in .env files

## Backup and Recovery

### Daily Backups
```bash
git push origin --all
git push origin --tags
```

### Disaster Recovery
1. Clone repository fresh
2. Run setup: `npm install`
3. Recreate worktrees
4. Restore ACTIVE_TASKS.json

## Support

- GitHub Issues: Report bugs and feature requests
- Documentation: See `/knowledge/` for patterns
- Logs: Check orchestrator output for debugging

---

Remember: The system learns from every success. Always document patterns and learnings!