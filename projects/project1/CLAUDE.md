# Project: Agent Monitoring Dashboard

## 🎯 Development Order: FRONTEND FIRST!
1. **Build UI/UX Foundation FIRST** - Complete frontend before backend
2. **Mock Data for Development** - Use fake data until backend ready
3. **Deploy Frontend Early** - Get user feedback on UI
4. **Then Build Backend** - With clear API requirements from frontend

## Current Project Context
You are working on PROJECT-001: A real-time monitoring dashboard for the MCP/RAG Multi-Agent System.

## Project Location
- Working Directory: `projects/project1/`
- PRD: `projects/project1/PRD.md`
- Source Code: `projects/project1/src/`

## Project Rules
1. Read the PRD first before any implementation
2. Follow the existing multi-agent workflow
3. Create worktrees for development if needed
4. Update task-board.json with project-specific tasks
5. Store UI component patterns in RAG

## Tech Stack (Decided by Architect)
- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript
- Styling: Tailwind CSS
- Charts: Chart.js
- Real-time: WebSockets (socket.io)

## Project Structure
```
project1/
├── PRD.md
├── CLAUDE.md
├── src/
│   ├── frontend/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   ├── backend/
│   │   ├── routes/
│   │   ├── services/
│   │   └── monitors/
│   └── shared/
│       └── types/
├── docs/
└── tests/
```

## Success Metrics
- Agents successfully collaborate to build the dashboard
- All 3 agents contribute according to their roles
- RAG patterns are queried and stored
- Tests achieve >90% coverage
- Dashboard actually works and shows real agent data

Remember: This is both a test project AND a useful tool. Build it properly!