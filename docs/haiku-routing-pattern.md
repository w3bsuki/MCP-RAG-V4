# Haiku Sub-Agent Routing Pattern

## Overview

The Haiku sub-agent pattern is used **ONLY** by the Admin Agent for quick routing decisions. Worker agents (Architect, Builder, Validator) continue using Claude Opus/Sonnet.

## Architecture

```
User Request
    ↓
Admin Agent
    ├── Haiku (Fast Routing) - "Which agent should handle this?"
    │   └── Returns: agent_name, priority, estimated_complexity
    │
    └── Opus/Sonnet (Complex Orchestration) - Only when needed:
        - Multi-agent coordination
        - Dependency resolution
        - Conflict handling
        - Complex planning

Worker Agents (Always use Opus/Sonnet)
    ├── Architect - Full Opus/Sonnet for design
    ├── Builder - Full Opus/Sonnet for implementation  
    └── Validator - Full Opus/Sonnet for validation
```

## Implementation

```python
class AdminAgent:
    def __init__(self):
        # Haiku for quick decisions (10x cheaper)
        self.router = anthropic.Client()  # Uses Haiku
        self.orchestrator = anthropic.Client()  # Uses Opus/Sonnet
    
    async def route_task(self, task):
        # Quick routing with Haiku (~50ms, $0.25/1M tokens)
        routing = await self.router.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=50,  # Very short response
            messages=[{
                "role": "user", 
                "content": f"Route this task to the best agent: {task.name}\nRespond with: agent_name"
            }]
        )
        
        # Complex orchestration still uses Opus/Sonnet
        if task.requires_orchestration:
            plan = await self.orchestrator.messages.create(
                model="claude-3-opus-20240229",  # or sonnet
                max_tokens=1000,
                messages=[{"role": "user", "content": f"Create execution plan: {task}"}]
            )
```

## Cost Savings

- Haiku: $0.25/1M input tokens
- Opus: $15/1M input tokens
- **60x cheaper** for routing decisions

## Example Routing Decisions

Haiku handles these simple decisions:
- "API design task" → Architect
- "Bug fix" → Builder
- "Security audit" → Validator
- "Documentation" → Architect
- "Performance test" → Validator

## What Haiku NEVER Does

- Never writes code
- Never creates designs
- Never validates implementations
- Never makes complex decisions
- Never interacts with worker agents

## Worker Agent Independence

Worker agents are completely unaffected:
- Architect uses full Opus/Sonnet for designs
- Builder uses full Opus/Sonnet for code
- Validator uses full Opus/Sonnet for audits

They don't even know Haiku exists!