# AGENT BOOTSTRAP PROMPTS

## How to Start Each Agent Properly

### For BUILDER Agent:
```
🔨 BUILDER STARTUP SEQUENCE

1. FIRST: Read your rules: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/agents/builder/CLAUDE.md

2. SECOND: Read current tasks: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json

3. THIRD: Update your status to "ACTIVE" and pick your next task from "builder.current" array

4. CRITICAL: After EVERY task completion, immediately update ACTIVE_TASKS.json by moving your completed task from "current" to "completed" with timestamp

Your working directory: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/projects/project4/

START NOW: What is your next task from ACTIVE_TASKS.json?
```

### For ARCHITECT Agent:
```
🏗️ ARCHITECT STARTUP SEQUENCE

1. FIRST: Read your rules: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/agents/architect/CLAUDE.md

2. SECOND: Read current tasks: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json

3. THIRD: Review project status and identify if any architectural decisions are needed

4. CRITICAL: Only update the "architect" section of ACTIVE_TASKS.json, never touch builder/validator sections

Your working directory: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/

START NOW: Review ACTIVE_TASKS.json and identify any architectural tasks you need to complete.
```

### For VALIDATOR Agent:
```
✅ VALIDATOR STARTUP SEQUENCE

1. FIRST: Read your rules: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/agents/validator/CLAUDE.md

2. SECOND: Read current tasks: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json

3. THIRD: Check what needs validation from the "validator.current" array

4. CRITICAL: Test and validate completed work, update only your section in ACTIVE_TASKS.json

Your working directory: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/

START NOW: What validation tasks are waiting in ACTIVE_TASKS.json?
```

## AGENT RESTART COMMANDS

When you need to restart an agent or get them back on track:

### Builder Restart:
```
🚨 BUILDER SYNC CHECK:

1. Read ACTIVE_TASKS.json now: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json

2. Check your current task status in "builder.current" array

3. If you completed any tasks since last update, IMMEDIATELY move them to "builder.completed" with timestamp

4. Pick your next highest priority task and mark it "IN_PROGRESS"

5. REPORT: What task are you working on RIGHT NOW?
```

### Coordination Check Command:
```
🔄 SYSTEM STATUS CHECK:

All agents: Read ACTIVE_TASKS.json and report:
1. Your agent type (architect/builder/validator)
2. Your current active task (if any)
3. Tasks you completed today but haven't marked as completed yet
4. Any blockers preventing you from updating the file

This is a coordination sync - update your status NOW.
```

## HOW TO USE THESE PROMPTS

1. **Copy and paste exactly** - These prompts force agents to read their rules first
2. **Send to each agent separately** - Each agent needs their specific bootstrap
3. **Use restart commands** - When agents get out of sync
4. **Check coordination file** - Look at ACTIVE_TASKS.json to see if updates are happening

## TROUBLESHOOTING

### If Agent Won't Update ACTIVE_TASKS.json:
```
🛠️ FORCE UPDATE PROTOCOL:

The file path is: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json

Read it first, then edit your section ONLY:
- architect: Only touch "architect" section
- builder: Only touch "builder" section  
- validator: Only touch "validator" section

Show me the edit you're making BEFORE you save it.
```

### If Agent Claims File Doesn't Exist:
```
🔍 FILE CHECK:

1. Use ls to check: /home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/
2. Your current working directory should be within the mcp-rag-dev-system
3. Use ABSOLUTE paths, not relative paths
4. If you can't find it, show me your current directory with pwd
```