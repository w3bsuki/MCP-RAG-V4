# Admin Agent with Haiku Routing

## Overview

The Admin Agent uses a two-tier model system for optimal cost and performance:

1. **Haiku** (claude-3-haiku-20240307) - For quick routing decisions
2. **Opus/Sonnet** (claude-3-opus-20240229) - For complex orchestration

## How It Works

### Simple Tasks (90% of requests)
```
User Request → Admin Agent → Haiku (50ms) → Route to Agent → Done
```

### Complex Tasks (10% of requests)
```
User Request → Admin Agent → Check Complexity → Opus (500ms) → Multi-Agent Plan → Execute
```

## Decision Criteria

### Uses Haiku (Fast & Cheap)
- Single agent tasks
- No dependencies
- Clear task type (design, implement, validate)
- Standard workflows

### Uses Opus/Sonnet (Powerful)
- Multi-agent coordination
- Tasks with dependencies
- Resource conflict resolution
- System architecture decisions
- Complex planning requirements

## Cost Savings

- Haiku: $0.25/1M tokens (input)
- Opus: $15/1M tokens (input)
- **60x cost reduction** for routing

## Configuration

Set in `.env`:
```env
ENABLE_HAIKU_ROUTING=true
ADMIN_ROUTING_MODEL=claude-3-haiku-20240307
ADMIN_ORCHESTRATION_MODEL=claude-3-opus-20240229
```

## Example Routing

### Haiku handles:
- "Create login form" → Frontend Agent
- "Fix database query" → Backend Agent  
- "Run security audit" → Validator Agent
- "Search documentation" → RAG Agent

### Opus handles:
- "Design and implement complete auth system with tests"
- "Coordinate frontend and backend for new feature"
- "Resolve database migration conflicts"

## Performance Metrics

- Haiku routing: ~50ms average
- Opus orchestration: ~500ms average
- Fallback routing: ~10ms (keyword matching)

## Worker Agent Independence

**Important**: Worker agents (Architect, Builder, Validator) are NOT affected by Haiku routing. They continue to use:
- Full Opus model for complex tasks
- Full Sonnet model when Opus unavailable
- Complete reasoning capabilities

The Haiku optimization is ONLY for the Admin Agent's routing decisions.