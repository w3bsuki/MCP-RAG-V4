# 🏗️ MCP-RAG SYSTEM STRUCTURE

## ✅ CLEAN STRUCTURE ACHIEVED

### **Root Level**
```
mcp-rag-dev-system/
├── CLAUDE.md           # System-wide rules
├── MONITOR.md          # Agent monitoring
├── README.md           # System documentation
├── STRUCTURE.md        # This file
├── coordination/       # Central coordination
│   ├── ACTIVE_TASKS.json    # SINGLE source of truth for tasks
│   └── memory-bank/         # Consolidated agent memories (14 files)
├── agents/            # Agent configurations
│   ├── architect/
│   │   └── CLAUDE.md       # Architect rules only
│   ├── builder/
│   │   └── CLAUDE.md       # Builder rules only
│   └── validator/
│       └── CLAUDE.md       # Validator rules only
└── projects/          # Project implementations
    ├── PROJECT_REGISTRY.md
    ├── project1/      # Completed (deployed)
    ├── project2/      # Completed
    ├── project3/      # 80% complete
    └── project4/      # Active (Claude Predictor)
        └── README.md  # ONLY spec for project4
```

## 🎯 KEY PRINCIPLES

### **1. Single Source of Truth**
- **Tasks**: `/coordination/ACTIVE_TASKS.json` ONLY
- **Project Specs**: `/projects/projectX/README.md` ONLY
- **Agent Rules**: `/agents/[agent]/CLAUDE.md` ONLY

### **2. No Duplication**
- NO PROJECT_PLAN.md files
- NO task-board.json files (except UI display in project1)
- NO duplicate coordination folders
- NO archive folders

### **3. Clean Agent Folders**
- ONLY contain CLAUDE.md
- NO coordination folders
- NO project files
- NO scripts or configs

### **4. Central Coordination**
- ALL tasks in ACTIVE_TASKS.json
- ALL memories in central memory-bank
- NO agent-specific coordination

## 📝 WHAT WE CLEANED UP

### **Removed:**
- 4 duplicate coordination folders → 1 central
- 5 PROJECT_PLAN.md files → 0
- Multiple task-board.json → kept only UI display
- Empty memory banks → consolidated to central
- Archive folder → deleted
- Agent coordination folders → deleted
- Root-level cruft (dist/, scripts/, etc) → deleted

### **Consolidated:**
- 14 agent memory files → central memory-bank
- Multiple task systems → ACTIVE_TASKS.json only
- Scattered specs → README.md per project

## 🚀 BENEFITS

1. **No Confusion**: Agents know exactly where to look
2. **Single Sources**: One file for each purpose
3. **Clean Structure**: Easy to navigate
4. **Scalable**: Same pattern for all projects
5. **Maintainable**: No duplicate updates needed

## 📋 FOR NEW PROJECTS

1. Create `/projects/projectX/` folder
2. Add ONLY `README.md` with full spec
3. Update `ACTIVE_TASKS.json` with tasks
4. Agents read README.md and build
5. Track progress in ACTIVE_TASKS.json

**NO OTHER FILES NEEDED!**