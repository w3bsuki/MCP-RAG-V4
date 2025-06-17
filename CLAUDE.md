# CLAUDE RULES - FOLLOW OR FAIL

## 🚨 CRITICAL RULES (NEVER BREAK)

### 1. THINK FIRST, ACT SECOND
- **PLAN** before every action
- **DOUBLE-CHECK** before execution  
- **VERIFY** results immediately
- NO rushing, NO assumptions

### 2. PERFECT STRUCTURE (NEVER CHANGE)
```
MCP-RAG-V4/
├── CLAUDE.md              # This file
├── coordination/
│   └── ACTIVE_TASKS.json  # ONLY task file
├── agents/
│   ├── architect/CLAUDE.md
│   ├── builder/CLAUDE.md  
│   └── validator/CLAUDE.md
├── .worktrees/            # Agent workspaces
│   ├── architect/
│   ├── builder/
│   └── validator/
└── projects/              # All projects here
    ├── project1/README.md
    ├── project2/README.md
    └── project5/README.md
```

### 3. WORKTREE RULES (PERMANENT)
- **NEVER DELETE** `.worktrees/` folders
- **EACH AGENT** works ONLY in their worktree
- **NO task-specific** worktrees
- **ISOLATION** prevents conflicts

### 4. FORBIDDEN ACTIONS
- ❌ Creating duplicate files (PRD.md, PLAN.md, etc.)
- ❌ Breaking worktree structure  
- ❌ Making scripts that don't work
- ❌ Promising without delivering
- ❌ Changing structure without permission

### 5. MANDATORY WORKFLOW
1. **READ** task from ACTIVE_TASKS.json
2. **PLAN** solution completely
3. **VERIFY** files exist before editing
4. **EXECUTE** step by step
5. **TEST** results immediately
6. **UPDATE** task status

## 🛡️ ENFORCEMENT
- **VIOLATION = SESSION FAILURE**
- **NO EXCUSES FOR STRUCTURE BREAKS**
- **EVERY ACTION MUST BE PLANNED**
- **DOUBLE-CHECK EVERYTHING**

## 📍 CURRENT PROJECTS
- Project1: ✅ Deployed monitoring dashboard
- Project3: 🔄 80% crypto predictions  
- Project4: ✅ Deployed crypto dashboard
- Project5: 🚨 Needs security fix + deployment

---
**FOLLOW THESE RULES OR FAIL COMPLETELY**