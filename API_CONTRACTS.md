# Agent Monitoring Dashboard - API Contracts & Data Models

## API Overview

Base URL: `http://localhost:3000/api`
Version: `v1`
Format: JSON
Authentication: None (internal use only)

## Data Models

### Agent Models

```typescript
// Agent status enumeration
enum AgentStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  BLOCKED = 'blocked',
  ERROR = 'error',
  OFFLINE = 'offline'
}

// Agent type enumeration
enum AgentType {
  ARCHITECT = 'architect',
  BUILDER = 'builder',
  VALIDATOR = 'validator'
}

// Agent resource metrics
interface AgentMetrics {
  cpuUsage: number;        // Percentage (0-100)
  memoryUsage: number;     // Bytes
  memoryPercent: number;   // Percentage (0-100)
  uptime: number;          // Seconds
}

// Full agent status
interface Agent {
  id: AgentType;
  name: string;
  status: AgentStatus;
  currentTask: string | null;
  lastActivity: string;    // ISO 8601 timestamp
  workingDirectory: string;
  branch: string;
  uncommittedChanges: number;
  lastCommit: {
    hash: string;
    message: string;
    timestamp: string;
  } | null;
  metrics: AgentMetrics;
  errors: string[];
}
```

### Task Models

```typescript
// Task status enumeration
enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  BLOCKED = 'BLOCKED',
  DONE = 'DONE'
}

// Task priority enumeration
enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Task blocker
interface TaskBlocker {
  reason: string;
  createdAt: string;
  createdBy: string;
}

// Task comment
interface TaskComment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

// Full task model
interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: AgentType | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  dependencies: string[];    // Task IDs
  tags: string[];
  estimatedHours: number;
  actualHours: number;
  completionCriteria: string[];
  blockers: TaskBlocker[];
  comments: TaskComment[];
}

// Task board metrics
interface TaskMetrics {
  totalTasks: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  byAgent: Record<AgentType, number>;
  completionRate: number;    // Percentage
  averageCompletionTime: number; // Hours
  blockedTasks: number;
  velocity: {
    daily: number;
    weekly: number;
  };
}
```

### RAG Models

```typescript
// RAG pattern
interface Pattern {
  id: string;
  content: string;
  description: string;
  tags: string[];
  agentId: string;
  createdAt: string;
  queryCount: number;
  lastQueried: string | null;
}

// RAG query
interface RAGQuery {
  id: string;
  query: string;
  agentId: string;
  timestamp: string;
  responseTime: number;    // Milliseconds
  resultCount: number;
  matched: boolean;
}

// RAG metrics
interface RAGMetrics {
  totalPatterns: number;
  totalQueries: number;
  averageResponseTime: number;
  hitRate: number;         // Percentage
  topPatterns: Pattern[];
  recentQueries: RAGQuery[];
  memoryUsage: number;     // Bytes
  growthRate: {
    daily: number;
    weekly: number;
  };
}
```

### Git Models

```typescript
// Git commit
interface Commit {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  message: string;
  timestamp: string;
  branch: string;
  agent: AgentType;
  stats: {
    additions: number;
    deletions: number;
    filesChanged: number;
  };
}

// Git activity metrics
interface GitMetrics {
  totalCommits: number;
  commitsByAgent: Record<AgentType, number>;
  recentCommits: Commit[];
  averageCommitsPerDay: number;
  codeChurn: {
    additions: number;
    deletions: number;
  };
  activeBranches: string[];
}
```

### System Models

```typescript
// System health status
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    api: ServiceStatus;
    fileWatcher: ServiceStatus;
    mcpServer: ServiceStatus;
    gitMonitor: ServiceStatus;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  errors: SystemError[];
}

// Service status
interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latency: number | null;
  lastCheck: string;
  error: string | null;
}

// System error
interface SystemError {
  id: string;
  service: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
}

// Alert
interface Alert {
  id: string;
  type: 'agent' | 'task' | 'system' | 'performance';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
  metadata: Record<string, any>;
}
```

## REST API Endpoints

### Agent Endpoints

#### GET /api/agents
Get all agent statuses.

**Response:**
```json
{
  "agents": Agent[],
  "timestamp": "2025-06-16T10:30:00Z"
}
```

#### GET /api/agents/:id
Get specific agent details.

**Parameters:**
- `id`: AgentType (architect | builder | validator)

**Response:**
```json
{
  "agent": Agent,
  "history": {
    "statusChanges": Array<{
      "from": AgentStatus,
      "to": AgentStatus,
      "timestamp": string,
      "reason": string
    }>,
    "recentTasks": string[]
  }
}
```

### Task Endpoints

#### GET /api/tasks
Get all tasks with optional filtering.

**Query Parameters:**
- `status`: TaskStatus (optional)
- `assignedTo`: AgentType (optional)
- `priority`: TaskPriority (optional)
- `tag`: string (optional)

**Response:**
```json
{
  "tasks": Task[],
  "total": number,
  "filtered": number
}
```

#### GET /api/tasks/metrics
Get task board metrics.

**Response:**
```json
{
  "metrics": TaskMetrics,
  "trends": {
    "velocity": Array<{
      "date": string,
      "completed": number
    }>,
    "blockageRate": Array<{
      "date": string,
      "rate": number
    }>
  }
}
```

#### GET /api/tasks/:id
Get specific task details.

**Response:**
```json
{
  "task": Task,
  "timeline": Array<{
    "event": string,
    "timestamp": string,
    "actor": string
  }>
}
```

### RAG Endpoints

#### GET /api/rag/metrics
Get RAG system metrics.

**Response:**
```json
{
  "metrics": RAGMetrics,
  "performance": {
    "responseTimeHistory": Array<{
      "timestamp": string,
      "avgResponseTime": number
    }>,
    "queryVolumeHistory": Array<{
      "timestamp": string,
      "queryCount": number
    }>
  }
}
```

#### GET /api/rag/patterns
Get RAG patterns with pagination.

**Query Parameters:**
- `limit`: number (default: 20)
- `offset`: number (default: 0)
- `sortBy`: 'queryCount' | 'createdAt' (default: 'queryCount')
- `order`: 'asc' | 'desc' (default: 'desc')

**Response:**
```json
{
  "patterns": Pattern[],
  "total": number,
  "limit": number,
  "offset": number
}
```

### Git Endpoints

#### GET /api/git/commits
Get recent commits.

**Query Parameters:**
- `limit`: number (default: 50)
- `agent`: AgentType (optional)
- `since`: ISO 8601 timestamp (optional)

**Response:**
```json
{
  "commits": Commit[],
  "total": number
}
```

#### GET /api/git/activity
Get git activity metrics.

**Response:**
```json
{
  "metrics": GitMetrics,
  "timeline": Array<{
    "date": string,
    "commitCount": number,
    "linesAdded": number,
    "linesDeleted": number
  }>
}
```

### System Endpoints

#### GET /api/system/health
Get system health status.

**Response:**
```json
{
  "health": SystemHealth
}
```

#### GET /api/system/alerts
Get active alerts.

**Query Parameters:**
- `severity`: 'info' | 'warning' | 'error' | 'critical' (optional)
- `acknowledged`: boolean (optional)
- `limit`: number (default: 100)

**Response:**
```json
{
  "alerts": Alert[],
  "total": number,
  "unacknowledged": number
}
```

## WebSocket Events

### Connection Management

#### Event: connect
Emitted when client connects.

**Server -> Client:**
```json
{
  "type": "connection:established",
  "clientId": string,
  "serverTime": string
}
```

#### Event: disconnect
Emitted when client disconnects.

### Agent Events

#### Event: agent:status:changed
**Server -> Client:**
```json
{
  "type": "agent:status:changed",
  "agent": AgentType,
  "previousStatus": AgentStatus,
  "currentStatus": AgentStatus,
  "reason": string,
  "timestamp": string
}
```

#### Event: agent:task:assigned
**Server -> Client:**
```json
{
  "type": "agent:task:assigned",
  "agent": AgentType,
  "taskId": string,
  "taskTitle": string,
  "timestamp": string
}
```

#### Event: agent:metrics:updated
**Server -> Client:**
```json
{
  "type": "agent:metrics:updated",
  "agent": AgentType,
  "metrics": AgentMetrics,
  "timestamp": string
}
```

### Task Events

#### Event: task:created
**Server -> Client:**
```json
{
  "type": "task:created",
  "task": Task
}
```

#### Event: task:updated
**Server -> Client:**
```json
{
  "type": "task:updated",
  "taskId": string,
  "changes": Partial<Task>,
  "previousStatus": TaskStatus,
  "currentStatus": TaskStatus,
  "updatedBy": string,
  "timestamp": string
}
```

#### Event: task:blocked
**Server -> Client:**
```json
{
  "type": "task:blocked",
  "taskId": string,
  "blocker": TaskBlocker,
  "agent": AgentType
}
```

### Git Events

#### Event: git:commit
**Server -> Client:**
```json
{
  "type": "git:commit",
  "commit": Commit
}
```

#### Event: git:push
**Server -> Client:**
```json
{
  "type": "git:push",
  "agent": AgentType,
  "branch": string,
  "commits": number,
  "timestamp": string
}
```

### RAG Events

#### Event: rag:query
**Server -> Client:**
```json
{
  "type": "rag:query",
  "query": RAGQuery
}
```

#### Event: rag:pattern:stored
**Server -> Client:**
```json
{
  "type": "rag:pattern:stored",
  "pattern": Pattern
}
```

### System Events

#### Event: system:alert
**Server -> Client:**
```json
{
  "type": "system:alert",
  "alert": Alert
}
```

#### Event: system:health:changed
**Server -> Client:**
```json
{
  "type": "system:health:changed",
  "previousStatus": string,
  "currentStatus": string,
  "services": Record<string, ServiceStatus>,
  "timestamp": string
}
```

## Error Responses

All API errors follow this format:

```json
{
  "error": {
    "code": string,
    "message": string,
    "details": any,
    "timestamp": string,
    "requestId": string
  }
}
```

### Error Codes
- `AGENT_NOT_FOUND`: Agent with specified ID not found
- `TASK_NOT_FOUND`: Task with specified ID not found
- `INVALID_PARAMETER`: Invalid query parameter
- `INTERNAL_ERROR`: Internal server error
- `SERVICE_UNAVAILABLE`: Required service is down
- `RATE_LIMITED`: Too many requests

## Rate Limiting

- Default: 100 requests per minute per IP
- WebSocket events: No limit
- Burst allowance: 20 requests

Headers:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## CORS Configuration

```javascript
{
  origin: ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}
```

## API Versioning

- Version in URL path: `/api/v1/`
- Breaking changes require new version
- Deprecation notice: 30 days minimum
- Version sunset: 90 days after deprecation

---

This API contract provides a comprehensive interface for the Agent Monitoring Dashboard, enabling real-time monitoring and analysis of the multi-agent system.