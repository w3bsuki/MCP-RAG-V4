# Project Registry

## Active Projects

### PROJECT-001: Agent Monitoring Dashboard
- **Status**: ACTIVE
- **Started**: 2025-06-16
- **Location**: projects/project1/
- **Description**: Real-time dashboard to monitor agent health and task progress
- **Tech Stack**: React, Express, TypeScript, WebSockets
- **Agents Assigned**: All (Architect, Builder, Validator)

## Completed Projects
_None yet_

## Project Management Rules
1. Only ONE project active at a time
2. Agents can only see the active project
3. Completed projects are archived but kept for RAG learning
4. Each project gets its own git repository
5. Project worktrees are separate from agent worktrees

## Project Lifecycle
1. **PLANNING**: PRD created, awaiting Architect review
2. **ACTIVE**: Development in progress
3. **TESTING**: Validator running full test suite
4. **COMPLETED**: All tasks done, tests passing
5. **ARCHIVED**: Moved to completed, hidden from agents