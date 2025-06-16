# Agent Monitoring Dashboard - Database Schema Design

## Overview

The Agent Monitoring Dashboard requires storage for historical metrics, agent states, and time-series data. Given the read-only monitoring nature and real-time requirements, we'll use a hybrid approach with file-based storage for coordination and in-memory storage with periodic persistence for metrics.

## Storage Architecture

### Primary Storage Strategy
- **Coordination Data**: File-based (existing task-board.json, progress-log.md)
- **Real-time Metrics**: In-memory with Redis-like structure
- **Historical Data**: SQLite for lightweight time-series storage
- **Configuration**: JSON files for settings and agent configs

```
Storage Layers:
┌─────────────────────────────────────────┐
│           Application Layer              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┼───────────────────────┐
│          Data Access Layer               │
│  ┌─────────────┐ ┌─────────────────────┐ │
│  │   Memory    │ │     File System     │ │
│  │   Cache     │ │    (Coordination)   │ │
│  └─────────────┘ └─────────────────────┘ │
└─────────────────┼───────────────────────┘
                  │
┌─────────────────┼───────────────────────┐
│         Persistence Layer                │
│  ┌─────────────┐ ┌─────────────────────┐ │
│  │   SQLite    │ │      JSON Files     │ │
│  │ (Metrics)   │ │   (Configuration)   │ │
│  └─────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────┘
```

## SQLite Schema Design

### 1. Agent Metrics Table
```sql
CREATE TABLE agent_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id VARCHAR(20) NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    current_task VARCHAR(50),
    cpu_usage REAL,
    memory_usage INTEGER,
    memory_percent REAL,
    uncommitted_changes INTEGER DEFAULT 0,
    uptime_seconds INTEGER,
    last_activity DATETIME,
    branch VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_metrics_agent_time ON agent_metrics(agent_id, timestamp);
CREATE INDEX idx_agent_metrics_status ON agent_metrics(status);
```

### 2. Task Events Table
```sql
CREATE TABLE task_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(30) NOT NULL, -- created, updated, completed, blocked, assigned
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    assigned_to VARCHAR(20),
    changed_by VARCHAR(20),
    details TEXT, -- JSON object with change details
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_events_task_id ON task_events(task_id);
CREATE INDEX idx_task_events_type_time ON task_events(event_type, timestamp);
CREATE INDEX idx_task_events_assigned ON task_events(assigned_to);
```

### 3. Git Activity Table
```sql
CREATE TABLE git_commits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commit_hash VARCHAR(40) NOT NULL UNIQUE,
    short_hash VARCHAR(7) NOT NULL,
    agent_id VARCHAR(20) NOT NULL,
    author_name VARCHAR(100),
    author_email VARCHAR(100),
    message TEXT,
    branch VARCHAR(100),
    files_changed INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,
    commit_timestamp DATETIME NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_git_commits_agent_time ON git_commits(agent_id, commit_timestamp);
CREATE INDEX idx_git_commits_branch ON git_commits(branch);
CREATE INDEX idx_git_commits_hash ON git_commits(commit_hash);
```

### 4. System Health Table
```sql
CREATE TABLE system_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    overall_status VARCHAR(20) NOT NULL, -- healthy, degraded, unhealthy
    api_latency REAL,
    websocket_connections INTEGER,
    file_watch_events INTEGER,
    error_count INTEGER DEFAULT 0,
    cpu_usage REAL,
    memory_usage INTEGER,
    disk_usage INTEGER,
    details TEXT -- JSON with service-specific health data
);

CREATE INDEX idx_system_health_time ON system_health(timestamp);
CREATE INDEX idx_system_health_status ON system_health(overall_status);
```

### 5. RAG Metrics Table
```sql
CREATE TABLE rag_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_patterns INTEGER DEFAULT 0,
    total_queries INTEGER DEFAULT 0,
    average_response_time REAL,
    hit_rate REAL,
    memory_usage INTEGER,
    query_volume_last_hour INTEGER DEFAULT 0,
    top_patterns TEXT, -- JSON array of top patterns
    recent_queries TEXT -- JSON array of recent queries
);

CREATE INDEX idx_rag_metrics_time ON rag_metrics(timestamp);
```

### 6. Alerts Table
```sql
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(30) NOT NULL, -- agent, task, system, performance
    severity VARCHAR(20) NOT NULL, -- info, warning, error, critical
    title VARCHAR(200) NOT NULL,
    message TEXT,
    source VARCHAR(50),
    metadata TEXT, -- JSON with alert-specific data
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(50),
    acknowledged_at DATETIME,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_type_severity ON alerts(type, severity);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX idx_alerts_created ON alerts(created_at);
```

## Memory Storage Structure (Redis-like)

### Key Patterns
```
agents:{agent_id}:status          -> Current agent status object
agents:{agent_id}:metrics         -> Current metrics object
agents:{agent_id}:activity        -> Recent activity list

tasks:current                     -> Current task board state
tasks:{task_id}:history          -> Task change history

git:{agent_id}:recent_commits    -> Last 10 commits
git:activity:feed                -> Global commit feed

system:health:current            -> Current system health
system:alerts:active             -> Active alerts list

rag:metrics:current              -> Current RAG metrics
rag:patterns:top                 -> Top queried patterns

websocket:connections            -> Active WebSocket connections
websocket:events:queue           -> Event broadcast queue
```

### Data Structures
```typescript
// Agent Status (agents:{agent_id}:status)
interface AgentStatusCache {
  id: string;
  status: 'active' | 'idle' | 'blocked' | 'error' | 'offline';
  currentTask: string | null;
  lastActivity: string;
  branch: string;
  uncommittedChanges: number;
  lastUpdated: string;
}

// System Health (system:health:current)
interface SystemHealthCache {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceStatus>;
  resources: ResourceMetrics;
  lastCheck: string;
  errorCount: number;
}

// Task Board Cache (tasks:current)
interface TaskBoardCache {
  tasks: Task[];
  metrics: TaskMetrics;
  lastSynced: string;
  version: string;
}
```

## Data Access Patterns

### 1. Real-time Data Access
```typescript
class MemoryStore {
  private cache: Map<string, any> = new Map();
  
  // Get current agent status
  async getAgentStatus(agentId: string): Promise<AgentStatus | null> {
    return this.cache.get(`agents:${agentId}:status`);
  }
  
  // Update agent metrics
  async updateAgentMetrics(agentId: string, metrics: AgentMetrics): Promise<void> {
    this.cache.set(`agents:${agentId}:metrics`, metrics);
    this.cache.set(`agents:${agentId}:last_updated`, new Date().toISOString());
  }
  
  // Get active alerts
  async getActiveAlerts(): Promise<Alert[]> {
    return this.cache.get('system:alerts:active') || [];
  }
}
```

### 2. Historical Data Access
```typescript
class DatabaseStore {
  private db: sqlite3.Database;
  
  // Get agent metrics history
  async getAgentMetricsHistory(
    agentId: string, 
    timeRange: TimeRange
  ): Promise<AgentMetrics[]> {
    const query = `
      SELECT * FROM agent_metrics 
      WHERE agent_id = ? 
        AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC
    `;
    return this.db.all(query, [agentId, timeRange.start, timeRange.end]);
  }
  
  // Get task completion velocity
  async getTaskVelocity(days: number = 7): Promise<VelocityData[]> {
    const query = `
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as completed_tasks
      FROM task_events 
      WHERE event_type = 'completed' 
        AND timestamp >= datetime('now', '-${days} days')
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;
    return this.db.all(query);
  }
}
```

### 3. File System Integration
```typescript
class FileSystemStore {
  // Sync task board from file
  async syncTaskBoard(): Promise<TaskBoard> {
    const content = await fs.readFile('coordination/task-board.json', 'utf-8');
    const taskBoard = JSON.parse(content);
    
    // Update memory cache
    await this.memoryStore.set('tasks:current', taskBoard);
    
    return taskBoard;
  }
  
  // Watch for coordination file changes
  watchCoordinationFiles(): void {
    chokidar.watch('coordination/*.json').on('change', async (path) => {
      if (path.includes('task-board.json')) {
        await this.syncTaskBoard();
        this.emit('taskboard:updated');
      }
    });
  }
}
```

## Data Retention Policy

### Memory Storage
- **Current State**: Keep indefinitely while system running
- **Recent Activity**: Last 100 events per agent
- **Commit Feed**: Last 50 commits globally
- **Alerts**: Active alerts only, resolved alerts moved to DB

### Database Storage
- **Agent Metrics**: Keep 30 days of detailed data, 1 year of daily aggregates
- **Task Events**: Keep all events (they're small and valuable for analysis)
- **Git Commits**: Keep all commits (source of truth)
- **System Health**: Keep 7 days of detailed data, 30 days of hourly aggregates
- **RAG Metrics**: Keep 30 days of detailed data
- **Alerts**: Keep 90 days, then archive critical alerts only

### Cleanup Procedures
```sql
-- Daily cleanup job
DELETE FROM agent_metrics 
WHERE timestamp < datetime('now', '-30 days');

DELETE FROM system_health 
WHERE timestamp < datetime('now', '-7 days')
  AND id NOT IN (
    SELECT id FROM system_health 
    WHERE strftime('%M', timestamp) = '00' -- Keep hourly samples
  );

-- Weekly aggregation
CREATE TABLE agent_metrics_daily AS
SELECT 
  agent_id,
  date(timestamp) as date,
  AVG(cpu_usage) as avg_cpu,
  AVG(memory_percent) as avg_memory,
  COUNT(*) as sample_count
FROM agent_metrics 
WHERE timestamp < datetime('now', '-30 days')
GROUP BY agent_id, date(timestamp);
```

## Performance Considerations

### Indexing Strategy
- **Time-based queries**: Always index on timestamp for time-series data
- **Agent-specific queries**: Composite indexes on (agent_id, timestamp)
- **Status filtering**: Indexes on status and type fields
- **Foreign key lookups**: Indexes on all foreign key columns

### Query Optimization
```sql
-- Efficient time-range queries
EXPLAIN QUERY PLAN 
SELECT * FROM agent_metrics 
WHERE agent_id = 'builder' 
  AND timestamp BETWEEN '2025-06-16 00:00:00' AND '2025-06-16 23:59:59'
ORDER BY timestamp DESC 
LIMIT 100;

-- Aggregate queries with proper indexing
CREATE INDEX idx_agent_metrics_hour ON agent_metrics(
  agent_id, 
  strftime('%Y-%m-%d %H', timestamp)
);
```

### Memory Usage Optimization
- Use efficient data structures (Maps instead of Objects for frequent lookups)
- Implement LRU cache for frequently accessed data
- Lazy load historical data only when requested
- Compress stored JSON data for large objects

## Backup and Recovery

### Backup Strategy
```bash
# Daily SQLite backup
sqlite3 dashboard.db ".backup dashboard_backup_$(date +%Y%m%d).db"

# Configuration backup
tar -czf config_backup_$(date +%Y%m%d).tar.gz coordination/ config/

# Weekly full backup
tar -czf full_backup_$(date +%Y%m%d).tar.gz dashboard.db coordination/ config/ logs/
```

### Recovery Procedures
1. **Database corruption**: Restore from latest backup, replay coordination files
2. **Configuration loss**: Restore config files, restart services
3. **Memory cache loss**: Rebuild from database and coordination files
4. **Coordination file corruption**: Restore from git history

## Schema Migration

### Version Management
```sql
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_version (version, description) 
VALUES (1, 'Initial dashboard schema');
```

### Migration Scripts
```typescript
class DatabaseMigrator {
  async migrate(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const targetVersion = this.getTargetVersion();
    
    for (let v = currentVersion + 1; v <= targetVersion; v++) {
      await this.applyMigration(v);
    }
  }
  
  private async applyMigration(version: number): Promise<void> {
    const migration = await import(`./migrations/v${version}.js`);
    await migration.up(this.db);
    
    await this.db.run(
      'INSERT INTO schema_version (version, description) VALUES (?, ?)',
      [version, migration.description]
    );
  }
}
```

## Security Considerations

### Access Control
- Read-only database access for dashboard components
- Separate write permissions for metric collection services
- No direct database access from frontend
- API-level access control and rate limiting

### Data Protection
- No sensitive data stored (API keys, passwords)
- Sanitize all stored text data
- Encrypt database file if required
- Secure backup storage location

---

This database schema provides a robust foundation for storing and querying monitoring data while maintaining performance and data integrity for the Agent Monitoring Dashboard.