# Coordination Directory

This directory contains all coordination documents used by the multi-agent system for asynchronous communication and state management.

## Files

### PROJECT_PLAN.md
- **Owner**: Architect Agent
- **Purpose**: Master planning document with technical specifications, task assignments, and design decisions
- **Update Frequency**: Daily or as needed
- **Access**: Read by all agents, write by Architect only

### task-board.json
- **Owner**: All agents (collaborative)
- **Purpose**: Current task assignments, status tracking, and progress metrics
- **Update Frequency**: Every 2 hours or on task status change
- **Access**: Read/write by all agents

### progress-log.md
- **Owner**: All agents (append-only)
- **Purpose**: Chronological log of progress updates and status reports
- **Update Frequency**: Daily or on significant milestones
- **Access**: Append by all agents, no editing of past entries

### memory-bank/
- **Owner**: MCP RAG Server
- **Purpose**: Persistent storage of successful patterns and solutions
- **Update Frequency**: On pattern discovery or solution validation
- **Access**: Managed by RAG server, queryable by all agents

## Coordination Protocol

1. **Morning Sync** (Start of each session)
   - All agents read PROJECT_PLAN.md
   - Check task-board.json for assignments
   - Query RAG for relevant context

2. **Progress Updates** (Every 2 hours)
   - Update task status in task-board.json
   - Log blockers or dependencies
   - Store successful patterns in RAG

3. **Evening Summary** (End of session)
   - Append progress to progress-log.md
   - Update metrics in task-board.json
   - Commit all changes with descriptive messages

## Best Practices

- Always use the MCP tools for updates (don't edit files directly)
- Include timestamps and agent IDs in all updates
- Be descriptive in progress logs for future reference
- Query RAG before implementing new patterns
- Resolve conflicts through PROJECT_PLAN.md updates

## Schema Validation

All JSON documents must conform to their defined schemas. The task-board.json includes its schema definition for reference.

## Synchronization

These documents are automatically synchronized across agent worktrees through git commits. Each agent should pull changes before reading and push after writing.