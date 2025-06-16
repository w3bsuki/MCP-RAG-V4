# Agent Monitoring Dashboard - Technical Architecture

## System Overview

The Agent Monitoring Dashboard is a real-time web application that provides comprehensive visibility into the MCP/RAG Multi-Agent Development System. It follows a modern, scalable architecture with clear separation of concerns.

## Architecture Pattern

### Overall Architecture: Layered + Event-Driven
- **Frontend**: React SPA with real-time updates
- **Backend**: Node.js API server with WebSocket support
- **Data Layer**: File system monitoring + MCP integration
- **Communication**: REST API + WebSocket for real-time events

## Technology Stack

### Frontend
- **Framework**: React 18.x with TypeScript 5.x
- **State Management**: Zustand (lightweight, TypeScript-friendly)
- **UI Components**: Tailwind CSS + HeadlessUI
- **Charts**: Recharts (React-friendly, TypeScript support)
- **Real-time**: Socket.io-client
- **Build Tool**: Vite (fast, modern)
- **Testing**: Vitest + React Testing Library

### Backend
- **Runtime**: Node.js 20.x LTS
- **Framework**: Express.js with TypeScript
- **WebSocket**: Socket.io
- **File Watching**: Chokidar
- **Process Monitoring**: Node.js child_process
- **API Documentation**: OpenAPI 3.0
- **Testing**: Jest + Supertest

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Agent     │  │    Task      │  │      RAG        │   │
│  │   Status    │  │    Board     │  │   Analytics     │   │
│  │  Component  │  │  Component   │  │   Component     │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                 │                    │            │
│  ┌──────┴─────────────────┴────────────────────┴────────┐  │
│  │              State Management (Zustand)               │  │
│  └──────────────────────┬────────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │         WebSocket Client (Socket.io-client)           │  │
│  └──────────────────────┬────────────────────────────────┘  │
└─────────────────────────┼────────────────────────────────────┘
                          │ WebSocket + REST API
┌─────────────────────────┼────────────────────────────────────┐
│                         │        Backend (Node.js)           │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │           API Gateway (Express + Socket.io)           │  │
│  └─────┬──────────┬─────────────┬──────────────┬────────┘  │
│        │          │             │              │            │
│  ┌─────┴────┐ ┌──┴──────┐ ┌───┴──────┐ ┌────┴──────┐     │
│  │  Agent   │ │  Task   │ │   RAG    │ │   Git     │     │
│  │ Monitor  │ │ Service │ │ Service  │ │  Service  │     │
│  └─────┬────┘ └────┬────┘ └─────┬────┘ └─────┬─────┘     │
│        │           │             │             │            │
│  ┌─────┴───────────┴─────────────┴─────────────┴────────┐  │
│  │              File System & Process Monitor            │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────┼───────────────────────────────┐
│                     Data Sources                               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │   Git Repos  │  │ Coordination │  │   MCP Server      │  │
│  │  (Worktrees) │  │    Files     │  │  (RAG Storage)    │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## Core Components

### Frontend Components

#### 1. Agent Status Panel
```typescript
interface AgentStatus {
  id: 'architect' | 'builder' | 'validator';
  name: string;
  status: 'active' | 'idle' | 'blocked';
  currentTask: string | null;
  lastActivity: Date;
  uncommittedChanges: number;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
  };
}
```

#### 2. Task Board
```typescript
interface Task {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  assignedTo: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  blockers: Blocker[];
  createdAt: Date;
  updatedAt: Date;
}

interface TaskBoard {
  tasks: Task[];
  metrics: {
    velocity: number;
    completionRate: number;
    blockedCount: number;
  };
}
```

#### 3. RAG Analytics
```typescript
interface RAGMetrics {
  totalPatterns: number;
  queryCount: number;
  averageResponseTime: number;
  topPatterns: Pattern[];
  memoryGrowth: TimeSeriesData[];
}
```

### Backend Services

#### 1. Agent Monitor Service
- Monitors process health via system calls
- Tracks git status in each worktree
- Detects uncommitted changes
- Monitors resource usage (CPU/Memory)

#### 2. Task Service
- Watches `task-board.json` for changes
- Calculates task metrics and velocity
- Identifies blocked tasks and patterns
- Provides task history and trends

#### 3. RAG Service
- Integrates with MCP server
- Collects usage statistics
- Monitors query performance
- Tracks pattern effectiveness

#### 4. Git Service
- Monitors all three worktrees
- Streams commit activity
- Calculates code metrics
- Tracks branch status

## Data Flow

### Real-time Updates
1. File system changes detected by Chokidar
2. Service processes change and emits event
3. WebSocket broadcasts to connected clients
4. Frontend updates relevant components
5. State management ensures consistency

### REST API Endpoints
```
GET  /api/agents           - Get all agent statuses
GET  /api/agents/:id       - Get specific agent details
GET  /api/tasks            - Get task board state
GET  /api/tasks/metrics    - Get task metrics
GET  /api/rag/metrics      - Get RAG analytics
GET  /api/git/commits      - Get recent commits
GET  /api/git/activity     - Get git activity metrics
GET  /api/system/health    - Get system health status
```

### WebSocket Events
```
agent:status:changed     - Agent status update
task:created            - New task added
task:updated            - Task status changed
task:blocked            - Task blocked
git:commit              - New commit detected
rag:query               - RAG query executed
system:alert            - System issue detected
```

## State Management

### Frontend State Structure
```typescript
interface DashboardState {
  agents: Record<string, AgentStatus>;
  tasks: Task[];
  ragMetrics: RAGMetrics;
  gitActivity: Commit[];
  systemHealth: SystemHealth;
  alerts: Alert[];
  connection: {
    status: 'connected' | 'disconnected' | 'reconnecting';
    lastPing: Date;
  };
}
```

### Update Strategy
- Optimistic updates for user actions
- Real-time sync via WebSocket
- Periodic full sync (every 60s)
- Error recovery with exponential backoff

## Security Considerations

### Access Control
- Read-only file system access
- No write operations to agent files
- API rate limiting (100 req/min)
- WebSocket connection limits

### Data Privacy
- No sensitive data exposure
- Sanitized error messages
- Secure WebSocket connections
- Environment variable protection

## Performance Requirements

### Frontend
- Initial load: <2 seconds
- Update latency: <100ms
- 60 FPS animations
- <50MB memory usage

### Backend
- API response: <200ms
- WebSocket latency: <50ms
- File watch efficiency
- <100MB memory footprint

## Deployment Architecture

### Development
```
Frontend: http://localhost:5173 (Vite dev server)
Backend:  http://localhost:3000 (Express + nodemon)
```

### Production
```
Frontend: Static files served via Nginx
Backend:  Node.js process with PM2
Reverse Proxy: Nginx with WebSocket support
```

## Error Handling

### Frontend
- Global error boundary
- Retry logic for failed requests
- Graceful WebSocket reconnection
- User-friendly error messages

### Backend
- Structured error logging
- Circuit breaker pattern
- Health check endpoints
- Graceful shutdown handling

## Testing Strategy

### Frontend Tests
- Component unit tests
- Integration tests for state
- E2E tests with Playwright
- Visual regression tests

### Backend Tests
- Service unit tests
- API integration tests
- WebSocket event tests
- File watcher tests

## Monitoring & Observability

### Metrics to Track
- Page load performance
- API response times
- WebSocket connection stability
- Error rates by component
- User interaction patterns

### Logging
- Structured JSON logs
- Log levels: ERROR, WARN, INFO, DEBUG
- Correlation IDs for request tracking
- Centralized log aggregation

## Future Enhancements

### Phase 2
- Historical data persistence
- Advanced analytics and ML insights
- Multi-project support
- Custom alert rules

### Phase 3
- Mobile app companion
- API for external integrations
- Plugin system for extensions
- Advanced visualization options

## Implementation Timeline

### Week 1: Foundation
- Backend API structure
- Basic frontend setup
- File monitoring implementation
- WebSocket integration

### Week 2: Core Features
- Agent status monitoring
- Task board visualization
- Basic git integration
- Real-time updates

### Week 3: Advanced Features
- RAG analytics
- System health monitoring
- Alert system
- Performance optimization

### Week 4: Polish & Deploy
- UI/UX refinement
- Testing & bug fixes
- Documentation
- Deployment setup

---

This architecture provides a solid foundation for the Agent Monitoring Dashboard while maintaining flexibility for future enhancements. The design prioritizes real-time updates, system performance, and user experience.