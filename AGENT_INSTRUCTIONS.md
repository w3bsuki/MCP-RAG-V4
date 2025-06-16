# Agent Launch Instructions - Autonomous Dashboard Build

## 🚀 Mission: Build Complete Agent Monitoring Dashboard

Each agent should follow these instructions to work autonomously for 2-3 hours building the monitoring dashboard.

## For Architect Agent

**Your Mission:**
```
1. Start by reading projects/project1/PRD.md thoroughly
2. Query RAG for dashboard architecture patterns: mcp__ragStore__search
3. Work through tasks TASK-101, TASK-102, TASK-103 in sequence
4. Create all documentation in projects/project1/docs/
5. After completing architecture tasks, create 15+ detailed implementation tasks for builder
6. Update PROJECT_PLAN.md with all architectural decisions
7. Monitor progress and update task-board.json every 30 minutes
8. Continue until all planning is complete and builder has clear tasks
```

**First Command:**
```
Read the PRD at projects/project1/PRD.md and begin with TASK-101. Query RAG for dashboard architecture patterns before designing. Create comprehensive technical documentation that builder can implement from.
```

## For Builder Agent

**Your Mission:**
```
1. Monitor task-board.json for your assigned tasks
2. Always query RAG before implementing: mcp__ragStore__search
3. Start with backend setup (TASK-201) when architect completes API design
4. Implement each task fully, testing as you go
5. Commit every 30-60 minutes with descriptive messages
6. Store successful patterns in RAG: mcp__ragStore__upsert
7. Update task status immediately when starting/completing
8. Continue through all assigned tasks sequentially
```

**First Command:**
```
Check task-board.json for your assignments. Wait for architect to complete TASK-102 (API spec), then begin with TASK-201. Query RAG for Node.js project setup patterns. Implement completely and commit frequently.
```

## For Validator Agent

**Your Mission:**
```
1. Monitor builder commits continuously
2. Start testing as soon as builder completes first service
3. Query RAG for testing patterns: mcp__ragStore__search
4. Write comprehensive tests achieving >90% coverage
5. Block any code that doesn't meet quality standards
6. Update task-board.json with test results
7. Store successful test patterns in RAG
8. Continue until all code is thoroughly tested
```

**First Command:**
```
Monitor builder progress by checking git commits and task-board.json. As soon as TASK-202 is complete, begin TASK-501. Query RAG for backend testing patterns. Achieve >90% coverage.
```

## Coordination Rules

1. **Check task-board.json** every 15 minutes
2. **Query RAG** before every new implementation
3. **Store patterns** after every success
4. **Commit code** every 30-60 minutes
5. **Update status** immediately on task changes
6. **Document blockers** in task-board.json
7. **Continue working** until all assigned tasks complete

## Expected Timeline

- **Hour 1**: Architect completes all design tasks, creates implementation tasks
- **Hour 2**: Builder implements backend services and starts frontend
- **Hour 3**: Builder completes frontend, Validator tests everything

## Success Criteria

✅ Complete working dashboard showing real agent data
✅ All architectural documentation created
✅ >90% test coverage achieved
✅ 20+ patterns stored in RAG
✅ Clean git history with frequent commits
✅ Zero blockers at end

## Emergency Protocol

If blocked:
1. Document blocker in task-board.json with details
2. Query RAG for similar issues and solutions
3. Try alternative approach
4. Move to next task if still blocked
5. Never stop working - always find next task

## Remember

- You have full autonomy with --dangerously-skip-permissions
- MCP tools are available and should be used frequently
- The goal is a REAL, WORKING dashboard
- Store everything useful in RAG for future projects
- This is both a test AND a production tool

Begin immediately after reading these instructions. Work continuously until all assigned tasks are complete.