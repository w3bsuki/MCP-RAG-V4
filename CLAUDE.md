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

## Emergency Protocol
If blocked: Document in task-board.json immediately
If failing: Query RAG for similar issues
If unclear: Get full context before proceeding

## Critical Rules for Human Supervisor (ME!)
- **ALWAYS CLEAN UP** - No backups, no duplicates, no old folders
- **NEVER CHANGE MCP NAMES** - Tools must stay consistent for agents
- **NO REDUNDANT WORK** - Check if something exists before creating
- **KEEP WORKSPACE CLEAN** - One source of truth, no confusion
- **If changing tools**: Delete old → Create new with SAME NAME

Remember: Good architecture enables good implementation. The system learns from every success.