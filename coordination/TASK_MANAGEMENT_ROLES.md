# 🎯 ACTIVE_TASKS.json Management - Role Responsibilities

## 📋 CLEAR ROLE DEFINITIONS

### 🏗️ ARCHITECT
**Updates:** `architect` section ONLY
**When:** After creating tasks, completing analysis, or finishing architectural work
**Never:** Update `builder` or `validator` sections

#### Responsibilities:
- Create new tasks for Builder (add to `builder.current`)
- Update own tasks (`architect.current` → `architect.completed`)
- Add timestamps to completed tasks
- Provide architectural guidance

#### Example Update:
```json
"architect": {
  "current": [],
  "completed": [
    {
      "id": "ARCH-001",
      "task": "Design payment system architecture", 
      "status": "COMPLETED",
      "completedAt": "2025-06-17T20:00:00Z"
    }
  ]
}
```

### 🔨 BUILDER  
**Updates:** `builder` section ONLY
**When:** After EVERY task completion, status change, or progress update
**Never:** Update `architect` or `validator` sections

#### Responsibilities:
- Update task status (TODO → IN_PROGRESS → COMPLETED)
- Move completed tasks (`builder.current` → `builder.completed`)
- Add timestamps to completed tasks
- Track implementation progress

#### Example Update:
```json
"builder": {
  "current": [
    {
      "id": "AI-004",
      "task": "Implement prompt templates",
      "status": "IN_PROGRESS"
    }
  ],
  "completed": [
    {
      "id": "AI-002", 
      "task": "Create prediction API route",
      "status": "COMPLETED",
      "completedAt": "2025-06-17T19:51:00Z"
    }
  ]
}
```

### ✅ VALIDATOR
**Updates:** `validator` section ONLY  
**When:** After validating features, completing tests, or blocking/approving work
**Never:** Update `architect` or `builder` sections

#### Responsibilities:
- Update validation task status
- Move completed validations to completed array
- Add timestamps and validation results
- Document quality findings

#### Example Update:
```json
"validator": {
  "current": [],
  "completed": [
    {
      "id": "VAL-VISUAL-001",
      "task": "Screenshot validation",
      "status": "COMPLETED", 
      "completedAt": "2025-06-17T20:15:00Z",
      "result": "All pages meet retro aesthetic requirements"
    }
  ]
}
```

## 🚨 CRITICAL RULES

### ✅ DO:
- Update ONLY your own section
- Add timestamps to completed tasks
- Move tasks from `current` to `completed` 
- Use exact JSON structure shown above
- Update immediately after task completion

### ❌ NEVER:
- Update other agents' sections
- Delete tasks from other agents
- Change task IDs assigned to other agents
- Modify the overall file structure
- Update without timestamps

## 🔄 WORKFLOW EXAMPLE

1. **Architect** creates task → Adds to `builder.current`
2. **Builder** starts work → Updates task status to "IN_PROGRESS"
3. **Builder** completes work → Moves to `builder.completed` with timestamp
4. **Validator** validates → Updates `validator.current` with validation task
5. **Validator** approves → Moves validation to `validator.completed`

## 📞 COORDINATION PROTOCOL

- **Check file every 15 minutes** for updates from other agents
- **Update immediately** after completing any work
- **Use full file path**: `/home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/coordination/ACTIVE_TASKS.json`
- **Communicate through status updates** in your tasks

This system ensures each agent manages their own responsibilities while maintaining full visibility across the team.