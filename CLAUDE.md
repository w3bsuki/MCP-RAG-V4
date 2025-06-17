# MCP/RAG System Rules

## Core Principles
0. **INITIALIZE PROJECT STRUCTURE FIRST** - Can't test what doesn't exist!
1. **FRONTEND FIRST** - Build UI/UX foundation with mock data before backend
2. **Best Practices First** - Every decision must follow proven patterns
3. **Document Everything** - Use MCP tools, not direct file edits
4. **Test Before Deploy** - No code without validation
5. **Learn & Improve** - Query RAG before implementing, store after success
6. **CLEAN WORKSPACE** - Always clean up temp files, backups, duplicates
7. **STABLE INTERFACES** - NEVER change MCP tool names or APIs agents use

## Why Frontend First?
- **Clear Requirements**: UI defines exactly what data backend needs
- **Early Feedback**: Deploy UI early for user testing
- **Parallel Work**: Frontend can progress with mock data
- **Better UX**: Focus on user experience before technical implementation
- **Easier Testing**: Frontend with mocks is simpler to test

## MCP Tool Usage (MANDATORY)
- **Before ANY implementation**: `mcp__enhanced-mcp-rag-server__search` for patterns
- **After EVERY success**: `mcp__enhanced-mcp-rag-server__upsert` to store knowledge
- **Coordination updates**: Use `sync_project_state`, never edit directly
- **Context checks**: `mcp__enhanced-mcp-rag-server__get_context` at session start

## Agent Rules
- **Architect**: Plans only, no code. Updates PROJECT_PLAN.md. MUST specify initialization steps. FRONTEND tasks come FIRST in task board
- **Builder**: MUST INITIALIZE PROJECT FIRST! Build FRONTEND with mock data BEFORE backend. Create directories, install deps, THEN implement. Queries RAG first, commits often
- **Validator**: Tests everything. Can block any deployment. REJECT if no project structure. Ensure frontend works standalone

## Quality Standards
- TypeScript strict mode always
- Error handling required
- >90% test coverage
- Git commits every 30-60 minutes
- Descriptive commit messages

## Workflow
1. Read coordination docs first
2. Check task-board.json for assignments
3. INITIALIZE PROJECT STRUCTURE (npx create-next-app, npm install, directories)
4. BUILD FRONTEND FIRST - Complete UI/UX with mock data
5. Query RAG for patterns
6. Implement/test/validate
7. Backend AFTER frontend is stable
8. Update progress immediately
9. Store successful patterns

## Anti-Patterns (FORBIDDEN)
- ❌ Writing tests before initializing project structure
- ❌ Implementing without RAG search
- ❌ Skipping tests "to save time"
- ❌ Direct file edits for coordination
- ❌ Working outside assigned worktree
- ❌ Ignoring validator feedback
- ❌ Starting ANY work without npm install and working dev server
- ❌ CHANGING MCP TOOL NAMES - NEVER change tool names agents depend on!
- ❌ LEAVING DUPLICATES - No backup folders, no project-old, CLEAN UP!
- ❌ CREATING REDUNDANT FILES - Check if file exists before creating!
- ❌ CREATING MULTIPLE TASK FILES - Only use /coordination/ACTIVE_TASKS.json
- ❌ SEARCHING MULTIPLE PLACES FOR TASKS - One source of truth!
- ❌ CREATING MULTIPLE SPEC FILES - Only README.md per project!
- ❌ WRITING SEPARATE PRDs - Everything goes in README.md!

## 🚀 NEW PROJECT WORKFLOW (MANDATORY)
1. **ONE SPEC RULE**: Each project has ONLY README.md as specification
2. **FULL VISION FIRST**: Agents read complete README.md before starting
3. **INTELLIGENT BREAKDOWN**: Use your smarts to parse tasks from README.md
4. **STANDARD FLOW**: Always follow init → dependencies → frontend → backend
5. **SINGLE UPDATES**: All changes go to README.md, progress to ACTIVE_TASKS.json

### Project Structure:
```
projects/projectX/
├── README.md     # Complete product spec (THE ONLY SPEC)
├── src/          # Implementation
└── package.json  # Dependencies
```

### README.md Must Include:
- Executive summary
- Complete feature list (free/premium)
- Technical specification
- Implementation phases with time estimates
- Business model
- Success metrics

### Workflow:
1. Read README.md completely
2. Initialize project properly
3. Install all dependencies
4. Build according to phases
5. Update ACTIVE_TASKS.json regularly

## 🧹 CLEANLINESS RULES (CRITICAL)
**KEEP THE SYSTEM CLEAN OR FACE AGENT CONFUSION!**

### **File Creation Rules:**
- ✅ ONE README.md per project (complete spec)
- ✅ ONE ACTIVE_TASKS.json for all coordination
- ✅ ONE CLAUDE.md per agent (rules only)
- ❌ NO PRD.md, PLAN.md, TODO.md, TASKS.md files
- ❌ NO duplicate specs or task files
- ❌ NO archive folders - delete old stuff
- ❌ NO agent coordination folders

### **Clean Structure Must Be:**
```
mcp-rag-dev-system/
├── CLAUDE.md              # System rules (this file)
├── MONITOR.md             # Monitoring only
├── STRUCTURE.md           # Structure reference
├── coordination/          # Central coordination
│   ├── ACTIVE_TASKS.json  # ONLY task file
│   └── memory-bank/       # RAG memories
├── agents/                # Agent rules ONLY
│   ├── architect/CLAUDE.md
│   ├── builder/CLAUDE.md
│   └── validator/CLAUDE.md
└── projects/              # Project folders
    └── projectX/README.md # ONLY spec per project
```

### **Cleanliness Enforcement:**
1. **Before creating ANY file** - Check if it already exists
2. **Before creating ANY MD** - Is it README.md? If not, DON'T
3. **Before creating task files** - Use ACTIVE_TASKS.json ONLY
4. **If tempted to archive** - Just DELETE instead
5. **If structure unclear** - Read STRUCTURE.md

**REMEMBER: A messy system = confused agents = failed projects!**

## Task Management (CRITICAL)
- **SINGLE SOURCE**: /coordination/ACTIVE_TASKS.json
- **NO OTHER FILES**: Don't create TODO.md, task-board.json, etc.
- **CHECK REGULARLY**: Every 15 minutes
- **UPDATE STATUS**: TODO → IN_PROGRESS → DONE

## Emergency Protocol
If blocked: Update ACTIVE_TASKS.json with blocker details
If failing: Query RAG for similar issues
If unclear: Get full context before proceeding

## Critical Rules for Human Supervisor (ME!)
- **ALWAYS CLEAN UP** - No backups, no duplicates, no old folders
- **NEVER CHANGE MCP NAMES** - Tools must stay consistent for agents
- **NO REDUNDANT WORK** - Check if something exists before creating
- **KEEP WORKSPACE CLEAN** - One source of truth, no confusion
- **If changing tools**: Delete old → Create new with SAME NAME

Remember: Good architecture enables good implementation. The system learns from every success.

---

## 📁 CURRENT PROJECTS STATUS

### **Project1**: Agent Monitoring Dashboard
- **Status**: ✅ **DEPLOYED** (https://vercel.app)
- **Tech Stack**: Vite + React + TypeScript + Tailwind CSS + Heroicons
- **Purpose**: Real-time monitoring of MCP agent activity and performance
- **Features**: Agent metrics, activity feed, chat interface, real-time updates
- **Location**: `/projects/project1/src/frontend/`
- **Deployment**: Vercel (auto-deploy from git)

### **Project3**: Crypto Vision AI Predictions  
- **Status**: 🔄 **80% COMPLETE** (Expected completion: 1-2 days)
- **Tech Stack**: Next.js 15 + TypeScript + Tailwind CSS + TradingView + Binance API
- **Purpose**: AI-powered cryptocurrency price predictions and market analysis
- **Features**: Real-time prices, AI predictions, trading charts, market insights
- **Location**: `/projects/project3/`
- **Database**: PostgreSQL (pending setup)
- **UI**: ✅ Complete dashboard implemented
- **Backend**: ✅ Prediction engine + price service
- **Tests**: 51/65 passing, ~80% coverage
- **Missing**: Database integration, authentication system

### **Project2**: [AVAILABLE SLOT]
- **Status**: 🆕 **READY FOR NEW PROJECT**
- **Purpose**: TBD based on next requirements

---

## 📋 FILE ORGANIZATION

### **Core System Files**
- `CLAUDE.md` - Main system rules and project status (THIS FILE)
- `TODO.md` - Active task tracking for all projects
- `MONITOR.md` - Agent performance monitoring and workflow analysis
- `original-prd.md` - Project requirements reference

### **Archive/Reference**
- `launch-summary.md` - Historical launch notes (reference only)
- `implementation-template.md` - Template patterns (reference only)