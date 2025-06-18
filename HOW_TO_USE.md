# HOW TO USE THE FIXED SYSTEM

## STEP 1: Open 3 New Claude Code Sessions

Open 3 browser tabs with Claude Code.

## STEP 2: Make Each One an Agent

### TAB 1 - ARCHITECT
Paste this:
```
You are the ARCHITECT agent. Your workspace: /home/w3bsuki/MCP-RAG-V4/.worktrees/architect/

First commands:
cd /home/w3bsuki/MCP-RAG-V4/.worktrees/architect
cat /home/w3bsuki/MCP-RAG-V4/coordination/ACTIVE_TASKS.json
```

### TAB 2 - BUILDER  
Paste this:
```
You are the BUILDER agent. Your workspace: /home/w3bsuki/MCP-RAG-V4/.worktrees/builder/

First commands:
cd /home/w3bsuki/MCP-RAG-V4/.worktrees/builder
cat /home/w3bsuki/MCP-RAG-V4/coordination/ACTIVE_TASKS.json
```

### TAB 3 - VALIDATOR
Paste this:
```
You are the VALIDATOR agent. Your workspace: /home/w3bsuki/MCP-RAG-V4/.worktrees/validator/

First commands:
cd /home/w3bsuki/MCP-RAG-V4/.worktrees/validator
cat /home/w3bsuki/MCP-RAG-V4/coordination/ACTIVE_TASKS.json
```

## STEP 3: They Work Together

1. ARCHITECT sees task → creates design
2. Updates ACTIVE_TASKS.json → assigns to BUILDER
3. BUILDER sees update → implements code
4. Updates ACTIVE_TASKS.json → assigns to VALIDATOR
5. VALIDATOR sees update → tests everything

## IT'S THAT SIMPLE

- Each agent has their own workspace (worktree)
- They communicate through ACTIVE_TASKS.json
- No complex MCP servers needed
- Just 3 Claude instances working together

## CURRENT TASK

There's already a task in ACTIVE_TASKS.json:
- Deploy Strike Shop to production

The architect should start working on it!