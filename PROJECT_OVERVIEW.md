# MCP-RAG-V4 Project Overview

## 🎯 Quick Start

### Running the Multi-Agent System

Open 4 Claude Code terminals and run:

**Terminal 1 - Admin (Orchestrator):**
```bash
./run_agent.sh admin -i
```

**Terminal 2 - Architect:**
```bash
./run_agent.sh architect
```

**Terminal 3 - Builder:**
```bash
./run_agent.sh builder
```

**Terminal 4 - Validator:**
```bash
./run_agent.sh validator
```

## 📁 Clean Project Structure

```
MCP-RAG-V4/
├── agents/                 # Multi-agent implementations
│   ├── core/              # Base runtime (FIPA messaging)
│   ├── admin/             # Orchestrator with CLI
│   ├── architect/         # Specification creator
│   ├── builder/           # Code generator
│   └── validator/         # Quality assurance
│
├── rag-system/            # Enhanced RAG with hybrid search
│   ├── enhanced_rag.py    # Main RAG implementation
│   ├── knowledge_watcher.py # Dynamic ingestion
│   └── metrics.py         # Prometheus metrics
│
├── mcp-servers/           # MCP protocol servers
│   ├── knowledge-base-python/
│   ├── vector-search-python/
│   └── security-wrapper/
│
├── shared/                # Agent communication hub
│   ├── messages.log       # Message queue (file-based)
│   ├── specifications/    # Architect outputs
│   ├── builds/           # Builder outputs
│   └── validation-reports/ # Validator outputs
│
├── ui/dashboard/          # Monitoring interface
├── tests/                 # Test suites
├── benchmarks/           # Performance validation
└── docker/               # Container configs
```

## 🔄 How It Works

1. **Admin Agent** receives tasks and routes them
2. **Architect** creates specifications → saved to `shared/specifications/`
3. **Builder** implements code → saved to `shared/builds/`
4. **Validator** checks quality → reports to `shared/validation-reports/`

All agents communicate via `shared/messages.log` using FIPA protocol.

## ✅ Key Features Implemented

- ✅ FIPA-compliant message passing
- ✅ Redis queue with file fallback
- ✅ Haiku routing pattern (simulated)
- ✅ Cross-encoder reranking
- ✅ Dynamic knowledge ingestion
- ✅ Prometheus metrics
- ✅ Real agent implementations (not just configs!)

## 🚀 Example Workflow

In Admin terminal:
```
admin> submit
Task type: specification
Project name: Auth Service
Description: User authentication with JWT
Feature name: login
Feature description: User login endpoint
Feature name: [press enter to finish]
✓ Task submitted!
```

Watch as Architect → Builder → Validator process automatically!