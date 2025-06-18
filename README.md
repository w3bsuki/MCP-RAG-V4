# Perfect Claude Environment

O3-approved structure for multi-agent Claude development.

## Structure

```
perfect-claude-env/
├── agents/              # Individual agent configurations
├── mcp-servers/         # Modular MCP servers
├── rag-system/          # Vector DB and knowledge storage
├── git-worktrees/       # Isolated development branches
├── shared/              # Inter-agent communication
└── config/              # System configuration
```

## Quick Start

### 1. Install MCP Servers
```bash
cd mcp-servers
./install-all.sh
```

### 2. Start RAG System
```bash
cd rag-system
docker-compose up -d
```

### 3. Initialize Git Worktrees
```bash
cd git-worktrees/main
git init
git add .
git commit -m "Initial commit"
cd ..
git worktree add architect-branch -b architect-work
git worktree add builder-branch -b builder-work
git worktree add validator-branch -b validator-work
```

### 4. Configure Claude Desktop
Copy `config/claude_desktop_config.json` to your Claude Desktop settings.

## Agent Usage

Each agent has:
- Isolated memory in `agents/{name}/memory/`
- Custom tools in `agents/{name}/tools/`
- Role-specific MCP server access

## Key Differences from Previous Implementation
- Modular MCP servers (not one monolithic server)
- Clean separation of concerns
- No infrastructure in worktrees
- Individual agent isolation
- Proper RAG system with vector DB