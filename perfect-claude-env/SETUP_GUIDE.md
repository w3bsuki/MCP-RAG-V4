# Perfect Claude Environment Setup Guide

## Architecture Overview

This setup follows o3's recommended structure with:
- **Official MCP servers** for common operations
- **Custom Python servers** for AI/RAG capabilities
- **Clean separation** between infrastructure and work
- **Agent isolation** with individual configs

## Quick Start

### 1. Install Python Dependencies

```bash
# For knowledge-base server
cd mcp-servers/knowledge-base-python
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# For vector-search server
cd ../vector-search-python
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Install Official MCP Servers

```bash
cd mcp-servers
./install-official.sh
```

### 3. Start Qdrant Vector DB

```bash
cd rag-system
docker-compose up -d
```

### 4. Configure Claude Desktop

Copy the contents of `config/claude_desktop_config.json` to your Claude Desktop MCP settings.

## Server Details

### Official Servers (Node.js)
- **filesystem** - File operations with path whitelisting
- **puppeteer** - Browser automation and screenshots
- **fetch** - HTTP requests and API testing
- **github** - GitHub API integration

### Custom Servers (Python)
- **knowledge-base** - Pattern storage, markdown docs, knowledge retrieval
- **vector-search** - Semantic search using Qdrant and embeddings

## Agent Workflows

### 1. Architect
```bash
# Uses: knowledge-base, filesystem, github
# Role: Design and specification
# Output: Tasks in shared/planning/
```

### 2. Builder
```bash
# Uses: All servers
# Role: Implementation
# Workspace: git-worktrees/builder-branch/
```

### 3. Validator
```bash
# Uses: filesystem, puppeteer, testing tools
# Role: Testing and validation
# Output: Reports in shared/status/
```

## Key Improvements Over Previous Implementation

1. **Uses official MCP servers** - No reinventing wheels
2. **Mixed language approach** - Python for AI/ML, Node for simple tools
3. **Proper isolation** - Each server has its own dependencies
4. **Clean worktrees** - No infrastructure mixed with code
5. **Structured communication** - JSON formats in shared/

## Testing the Setup

### Test Filesystem Server
```
mcp://filesystem/read_file { "path": "./README.md" }
```

### Test Knowledge Base
```
mcp://knowledge-base/store_knowledge {
  "title": "Test Pattern",
  "content": "This is a test",
  "category": "pattern",
  "tags": ["test"]
}
```

### Test Vector Search
```
mcp://vector-search/semantic_search {
  "query": "authentication patterns",
  "limit": 5
}
```

## Security Notes

- Filesystem server is whitelisted to project directory only
- No destructive git operations without confirmation (future)
- Python servers run in isolated venvs
- Qdrant runs in Docker container

## Next Steps

1. Initialize git worktrees for each agent
2. Create initial knowledge base entries
3. Set up agent-specific tools in `agents/*/tools/`
4. Configure monitoring (future)