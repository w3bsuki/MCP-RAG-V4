# System Architecture

## Overview

MCP-RAG-V4 implements a hierarchical multi-agent system with advanced RAG capabilities.

## Components

### 1. Admin Agent (Orchestrator)
- Routes tasks to appropriate worker agents
- Manages task dependencies and conflicts
- Uses Haiku for quick routing decisions (planned)

### 2. Worker Agents
- **Architect**: Creates system designs and specifications
- **Builder**: Implements code based on specifications
- **Validator**: Tests and validates implementations

### 3. RAG System
- **Vector Search**: Qdrant for semantic search
- **Hybrid Search**: Combines vector + BM25 keyword matching
- **Cross-Encoder**: Reranks results for relevance (implementing)

### 4. MCP Servers
- TypeScript server with Zod validation
- Python servers for knowledge base and vector search
- Full MCP protocol compliance

## Communication Flow

```
User Request → Admin Agent → Task Planning → Worker Assignment
                                ↓
                          Worker Execution
                                ↓
                          Validation Check
                                ↓
                           Task Complete
```

## Data Flow

1. Documents ingested into RAG system
2. Agents query knowledge base during execution
3. Results stored in shared workspace
4. Dashboard monitors all activity

## Security Layers

- JWT authentication
- Rate limiting (100 req/min)
- Input validation (Pydantic/Zod)
- Path traversal protection
- Audit logging