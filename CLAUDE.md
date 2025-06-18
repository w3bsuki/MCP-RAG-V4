# MCP-RAG-V4 System Rules

## 🎯 NEW PERFECT ARCHITECTURE

O3-approved multi-agent system with proper separation and tooling.

## 📁 CLEAN STRUCTURE
```
MCP-RAG-V4/
└── perfect-claude-env/
    ├── agents/              # Individual agent configurations
    │   ├── architect/       # Design specialist
    │   ├── builder/         # Implementation specialist  
    │   └── validator/       # Quality assurance
    ├── mcp-servers/         # Modular MCP servers
    │   ├── official-servers/    # Anthropic's official servers
    │   ├── knowledge-base-python/  # Custom Python server
    │   └── vector-search-python/   # Qdrant integration
    ├── rag-system/          # Vector DB and knowledge
    ├── git-worktrees/       # Clean code branches
    ├── shared/              # Inter-agent communication
    └── config/              # System configuration
```

## 🚀 HOW TO USE

### 1. Setup Environment
```bash
cd perfect-claude-env
# Install official MCP servers
cd mcp-servers && ./install-official.sh

# Setup Python servers
cd knowledge-base-python
python -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# Start Qdrant
cd ../../rag-system && docker-compose up -d
```

### 2. Configure Claude Desktop
Copy `perfect-claude-env/config/claude_desktop_config.json` to your Claude MCP settings.

### 3. Open 3 Claude Code tabs

**TAB 1 - ARCHITECT:**
```
You are the ARCHITECT agent.
Your workspace: /home/w3bsuki/MCP-RAG-V4/perfect-claude-env/git-worktrees/architect-branch
Your role: Design systems and create specifications
Tools: mcp://knowledge-base, mcp://filesystem, mcp://github
```

**TAB 2 - BUILDER:**
```
You are the BUILDER agent.
Your workspace: /home/w3bsuki/MCP-RAG-V4/perfect-claude-env/git-worktrees/builder-branch
Your role: Implement based on architect's designs
Tools: All MCP servers available
```

**TAB 3 - VALIDATOR:**
```
You are the VALIDATOR agent.
Your workspace: /home/w3bsuki/MCP-RAG-V4/perfect-claude-env/git-worktrees/validator-branch
Your role: Test and validate all implementations
Tools: mcp://filesystem, mcp://puppeteer, mcp://fetch
```

### 4. Agents coordinate through shared/ directory

## ⚡ What Actually Works

1. **Official MCP Servers** ✅ - Using Anthropic's tested servers
2. **Python AI Servers** ✅ - Custom knowledge-base and vector search
3. **Clean Architecture** ✅ - O3-approved structure
4. **Proper Isolation** ✅ - Each component does one thing well

## 🔧 Available MCP Tools

### Official Servers (from Anthropic)
- `mcp://filesystem` - File operations with path whitelisting
- `mcp://puppeteer` - Browser automation and screenshots
- `mcp://fetch` - HTTP requests and API testing
- `mcp://github` - GitHub API integration

### Custom Python Servers
- `mcp://knowledge-base` - Store/search patterns and knowledge
- `mcp://vector-search` - Semantic search with Qdrant

### Key Capabilities
- Store and retrieve design patterns
- Semantic search across all knowledge
- Browser automation for testing
- Clean file operations
- GitHub integration for PRs/issues

## 📋 Agent Rules

### Architect
- Design only, no code
- Create clear specs
- Update tasks when done

### Builder  
- Implement designs
- Run npm install first
- Provide proof of completion

### Validator
- Test everything
- Take screenshots
- Block bad code

## 🚨 Critical Rules

1. **NO LIES** - If it doesn't work, say so
2. **VERIFY WORK** - No fake completions
3. **KEEP IT SIMPLE** - Don't overcomplicate
4. **USE WORKTREES** - Stay in your lane
5. **UPDATE TASKS** - So others know progress
6. **THINK BEFORE CLAIMING** - Is it actually "perfect" or am I lying?

## 📍 Current Status

- **Structure**: Clean and simple
- **Worktrees**: Working perfectly
- **MCP Server**: Built to spec, optional to use
- **Coordination**: Through ACTIVE_TASKS.json

---

**This is what actually works. No bullshit.**