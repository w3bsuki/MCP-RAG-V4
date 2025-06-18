# Claude Project Conventions for MCP-RAG-V4

## 🚨 Critical Development Rules

* **Never change external behaviour without explicit approval**
* **All refactors must keep tests green; tests are immutable specs**
* **Use ./mcp-servers/{python,typescript} for SDK code only**
* **Put integration tests under ./tests and unit tests next to modules**
* **Use Pydantic (Python) and Zod (TS) for schema validation**
* **No code changes without plan-review-approve cycle**

## 🎯 Quick Navigation

### Agent Instructions
@agents/architect/CLAUDE.agent.md
@agents/builder/CLAUDE.agent.md
@agents/validator/CLAUDE.agent.md

### System Configuration
@docs/system-architecture.md
@docs/mcp-configuration.md

## 🚀 Quick Start

```bash
# Start dashboard
cd ui/dashboard && python3 server.py

# Or use Docker
docker-compose up -d
```

## 🛡️ Core Principles

1. **Honesty** - Never claim false completions
2. **Verification** - Test everything
3. **Simplicity** - Avoid over-engineering
4. **Isolation** - Each agent in its workspace
5. **Plan-First** - Always plan before implementing

## 📁 Project Structure

```
MCP-RAG-V4/
├── agents/          # Agent orchestration
├── mcp-servers/     # MCP protocol servers (SDK-first design)
├── mcp-venv/        # Frozen Python environment for MCP
├── rag-system/      # Vector search & RAG
├── ui/dashboard/    # Monitoring interface
├── tests/           # Test suites
└── docker/          # Container configs
```

## 🔧 MCP Architecture

The MCP design follows SDK-first approach:
- **mcp-servers/**: Protocol implementation code
- **mcp-venv/**: Isolated Python environment
- **.mcp.json**: Machine-readable server configuration
- **Separation**: Allows SDK evolution without touching core schema

## 🔗 Key Resources

- Dashboard: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Metrics: http://localhost:9090

---
*For detailed instructions, see agent-specific files above.*