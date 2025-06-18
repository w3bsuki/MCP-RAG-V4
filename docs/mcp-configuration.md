# MCP Configuration Guide

## MCP Servers

The system uses multiple MCP servers configured in `.mcp.json`:

### Core Servers

1. **filesystem-secure** - Safe file operations
   - Port: 8001
   - Features: Path whitelisting, audit logging

2. **vector-search** - Semantic search with Qdrant
   - Port: 8002
   - Features: Hybrid search, reranking

3. **knowledge-base** - Document storage
   - Port: 8003
   - Features: Pattern storage, retrieval

4. **coordination-hub** - Agent coordination
   - Port: 8004
   - Features: Task routing, shared state

### Configuration

All servers configured in `.mcp.json` with:
- Command paths
- Environment variables
- Permission settings
- Health check endpoints

## Environment Setup

Required environment variables:

```bash
QDRANT_HOST=localhost
QDRANT_PORT=6333
JWT_SECRET_KEY=your-secret-key
PYTHONPATH=/path/to/project
```

## Permission Model

### Always Allowed
- Read operations in project directory
- Search operations
- Health checks

### Requires Confirmation
- Write operations
- External API calls
- System commands

## Adding New Servers

1. Create server implementation
2. Add to `.mcp.json`
3. Configure permissions
4. Add health check endpoint
5. Document in this file