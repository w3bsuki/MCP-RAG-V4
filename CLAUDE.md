# MCP-RAG-V4

Multi-agent orchestration system with advanced RAG capabilities.

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

## 📁 Project Structure

```
MCP-RAG-V4/
├── agents/          # Agent orchestration
├── mcp-servers/     # MCP protocol servers  
├── rag-system/      # Vector search & RAG
├── ui/dashboard/    # Monitoring interface
├── tests/           # Test suites
└── docker/          # Container configs
```

## 🔗 Key Resources

- Dashboard: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Metrics: http://localhost:9090

---
*For detailed instructions, see agent-specific files above.*