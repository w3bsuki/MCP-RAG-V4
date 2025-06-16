# MCP/RAG Multi-Agent Development System

A production-ready 3-agent Claude Code system that converts PRDs into deployable applications through parallel development in isolated git worktrees, coordinated via shared documents and enhanced with persistent RAG memory.

## Overview

This system implements Anthropic's proven multi-agent patterns, achieving 90.2% performance improvement through:
- **Isolated Development**: Git worktrees for true parallelism
- **Document-Based Coordination**: Asynchronous communication avoiding real-time RPC issues
- **RAG Memory**: Persistent learning and pattern storage
- **MCP Integration**: Standardized tool exposure for LLM agents

## Architecture

### 3-Agent System
1. **Architect Agent**: Planning, coordination, and system design
2. **Builder Agent**: Full-stack implementation (frontend + backend + database)
3. **Validator Agent**: Quality assurance, testing, and deployment verification

### Technology Stack
- **MCP SDK**: @modelcontextprotocol/sdk@1.12.3
- **Vector Database**: Milvus Lite (local, no external dependencies)
- **Runtime**: Node.js with TypeScript
- **Coordination**: Git worktrees + document-based protocols

## Quick Start

1. **Prerequisites**
   - Node.js 18+ and npm
   - Git configured with user credentials
   - Claude Code CLI installed

2. **Setup**
   ```bash
   npm install
   npm run setup-agents
   ```

3. **Launch Agents**
   ```bash
   # Terminal 1: Architect
   cd agents/architect && claude --mcp-config ../../.mcp/config.json

   # Terminal 2: Builder  
   cd agents/builder && claude --mcp-config ../../.mcp/config.json

   # Terminal 3: Validator
   cd agents/validator && claude --mcp-config ../../.mcp/config.json
   ```

## Project Structure

```
mcp-rag-dev-system/
├── .mcp/                     # MCP server and RAG database
├── coordination/             # Shared coordination documents
├── agents/                   # Isolated git worktrees for each agent
├── shared/                   # Specifications and templates
└── scripts/                  # Automation and monitoring
```

## Success Metrics
- Setup Time: ≤60 seconds
- Performance Gain: ≥60% over single-agent
- RAG Response: ≤3 seconds
- Reliability: 12+ hours autonomous operation

## Documentation
- [Implementation Plan](todo.md)
- [Architecture Details](PRD)
- [Agent Coordination Guide](coordination/README.md)

## Based On
- Anthropic's multi-agent research findings
- Claude Code best practices
- Model Context Protocol (MCP) standards

## License
MIT