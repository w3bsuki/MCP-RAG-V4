# Agent Monitoring Dashboard - Integration Points & Implementation

## Overview

This document outlines how the monitoring dashboard integrates with the existing MCP/RAG Multi-Agent Development System without disrupting agent operations.

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Dashboard                      │
│                     (Read-Only Access)                       │
└──────┬─────────────────┬────────────────┬──────────────────┘
       │                 │                │
       │ File Watching   │ Git Commands   │ MCP API
       │                 │                │
┌──────▼─────────────────▼────────────────▼──────────────────┐
│                    Integration Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │   Chokidar  │  │  Simple Git │  │  MCP Client      │   │
│  │   Watchers  │  │   Commands  │  │  (Read-Only)     │   │
│  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘   │
└─────────┼─────────────────┼──────────────────┼─────────────┘
          │                 │                  │
┌─────────▼─────────────────▼──────────────────▼─────────────┐
│                     System Resources                        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ Coordination│  │    Git      │  │   MCP Server     │   │
│  │    Files    │  │ Worktrees   │  │  (RAG Storage)   │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## File System Integration

### Coordination Files Monitoring

#### task-board.json
```typescript
interface TaskBoardWatcher {
  path: string = '../../../coordination/task-board.json';
  
  watch(): void {
    const watcher = chokidar.watch(this.path, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });
    
    watcher.on('change', async (path) => {
      try {
        const content = await fs.readFile(path, 'utf-8');
        const taskBoard = JSON.parse(content);
        this.emit('tasks:updated', taskBoard.tasks);
        this.detectBlockers(taskBoard.tasks);
      } catch (error) {
        logger.error('Failed to parse task-board.json', error);
      }
    });
  }
  
  private detectBlockers(tasks: Task[]) {
    const blockedTasks = tasks.filter(t => t.status === 'BLOCKED');
    if (blockedTasks.length > 0) {
      this.emit('alert:tasks:blocked', blockedTasks);
    }
  }
}
```

#### PROJECT_PLAN.md
```typescript
interface ProjectPlanWatcher {
  path: string = '../../../coordination/PROJECT_PLAN.md';
  
  watch(): void {
    const watcher = chokidar.watch(this.path, {
      persistent: true,
      ignoreInitial: false
    });
    
    watcher.on('change', async (path) => {
      const content = await fs.readFile(path, 'utf-8');
      const metadata = this.extractMetadata(content);
      this.emit('project:updated', metadata);
    });
  }
  
  private extractMetadata(content: string) {
    // Extract sprint info, status, dates
    const sprintMatch = content.match(/Sprint ID:\s*(\S+)/);
    const statusMatch = content.match(/Status:\s*(\S+)/);
    
    return {
      sprintId: sprintMatch?.[1],
      status: statusMatch?.[1],
      lastUpdated: new Date()
    };
  }
}
```

#### progress-log.md
```typescript
interface ProgressLogWatcher {
  path: string = '../../../coordination/progress-log.md';
  lastPosition: number = 0;
  
  watch(): void {
    const watcher = chokidar.watch(this.path, {
      persistent: true,
      ignoreInitial: true
    });
    
    watcher.on('change', async (path) => {
      const content = await fs.readFile(path, 'utf-8');
      const newEntries = this.parseNewEntries(content);
      
      newEntries.forEach(entry => {
        this.emit('progress:entry', entry);
      });
    });
  }
  
  private parseNewEntries(content: string): ProgressEntry[] {
    // Parse only new entries since last read
    const lines = content.split('\n');
    const newLines = lines.slice(this.lastPosition);
    this.lastPosition = lines.length;
    
    return this.parseEntries(newLines);
  }
}
```

### Git Integration

#### Worktree Monitoring
```typescript
interface GitWorktreeMonitor {
  worktrees: Map<AgentType, string> = new Map([
    ['architect', '../architect'],
    ['builder', '../builder'],
    ['validator', '../validator']
  ]);
  
  async monitorAll() {
    for (const [agent, path] of this.worktrees) {
      this.monitorWorktree(agent, path);
    }
  }
  
  private monitorWorktree(agent: AgentType, path: string) {
    // Watch .git directory for changes
    const gitPath = path.join(path, '.git');
    
    const watcher = chokidar.watch(gitPath, {
      persistent: true,
      ignoreInitial: true,
      depth: 2
    });
    
    watcher.on('change', async (filePath) => {
      if (filePath.includes('HEAD') || filePath.includes('index')) {
        const status = await this.getGitStatus(agent, path);
        this.emit('git:status:changed', { agent, status });
      }
    });
    
    // Also watch for new commits
    this.watchCommits(agent, path);
  }
  
  private async getGitStatus(agent: AgentType, path: string) {
    const status = await simpleGit(path).status();
    
    return {
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      modified: status.modified.length,
      staged: status.staged.length,
      untracked: status.not_added.length,
      total: status.files.length
    };
  }
  
  private async watchCommits(agent: AgentType, path: string) {
    let lastCommit = await this.getLastCommit(path);
    
    setInterval(async () => {
      const currentCommit = await this.getLastCommit(path);
      
      if (currentCommit.hash !== lastCommit.hash) {
        this.emit('git:new:commit', {
          agent,
          commit: currentCommit
        });
        lastCommit = currentCommit;
      }
    }, 5000); // Check every 5 seconds
  }
  
  private async getLastCommit(path: string): Promise<Commit> {
    const log = await simpleGit(path).log({ n: 1 });
    const latest = log.latest;
    
    return {
      hash: latest.hash,
      shortHash: latest.hash.substring(0, 7),
      author: latest.author_name,
      email: latest.author_email,
      message: latest.message,
      timestamp: latest.date,
      branch: await this.getCurrentBranch(path),
      stats: {
        additions: 0, // Would need diff for accurate stats
        deletions: 0,
        filesChanged: 0
      }
    };
  }
}
```

### Process Monitoring

#### Agent Process Monitor
```typescript
interface ProcessMonitor {
  agents: Map<AgentType, ProcessInfo> = new Map();
  
  async initialize() {
    // Detect Claude Code processes
    await this.detectAgentProcesses();
    
    // Monitor process health
    setInterval(() => this.checkProcessHealth(), 10000);
  }
  
  private async detectAgentProcesses() {
    // Look for processes with Claude Code in the command
    // Match with agent worktree paths
    const processes = await psList();
    
    processes.forEach(proc => {
      if (proc.cmd?.includes('claude') || proc.cmd?.includes('code')) {
        const agent = this.matchProcessToAgent(proc);
        if (agent) {
          this.agents.set(agent, {
            pid: proc.pid,
            name: proc.name,
            cpu: proc.cpu,
            memory: proc.memory,
            startTime: new Date()
          });
        }
      }
    });
  }
  
  private async checkProcessHealth() {
    for (const [agent, info] of this.agents) {
      try {
        const isRunning = await processExists(info.pid);
        
        if (!isRunning) {
          this.emit('agent:process:down', { agent });
          this.agents.delete(agent);
        } else {
          // Update metrics
          const metrics = await this.getProcessMetrics(info.pid);
          this.emit('agent:metrics:updated', { agent, metrics });
        }
      } catch (error) {
        logger.error(`Failed to check process ${agent}`, error);
      }
    }
  }
  
  private async getProcessMetrics(pid: number): Promise<AgentMetrics> {
    const usage = await pidusage(pid);
    
    return {
      cpuUsage: usage.cpu,
      memoryUsage: usage.memory,
      memoryPercent: (usage.memory / os.totalmem()) * 100,
      uptime: usage.elapsed / 1000
    };
  }
}
```

## MCP Server Integration

### RAG Metrics Collection
```typescript
interface MCPIntegration {
  serverUrl: string = process.env.MCP_SERVER_URL || 'http://localhost:3001';
  
  async getRAGMetrics(): Promise<RAGMetrics> {
    try {
      // Query MCP server for metrics
      const [patterns, queries, stats] = await Promise.all([
        this.getPatternCount(),
        this.getRecentQueries(),
        this.getServerStats()
      ]);
      
      return {
        totalPatterns: patterns.count,
        totalQueries: queries.total,
        averageResponseTime: stats.avgResponseTime,
        hitRate: stats.hitRate,
        topPatterns: patterns.top,
        recentQueries: queries.recent,
        memoryUsage: stats.memoryUsage,
        growthRate: {
          daily: patterns.dailyGrowth,
          weekly: patterns.weeklyGrowth
        }
      };
    } catch (error) {
      logger.error('Failed to get RAG metrics', error);
      return this.getEmptyMetrics();
    }
  }
  
  async monitorRAGActivity() {
    // Poll for new queries
    setInterval(async () => {
      const queries = await this.getRecentQueries();
      
      queries.recent.forEach(query => {
        if (!this.seenQueries.has(query.id)) {
          this.emit('rag:query', query);
          this.seenQueries.add(query.id);
        }
      });
    }, 5000);
  }
  
  private async getPatternCount() {
    // Query MCP server for pattern statistics
    const response = await fetch(`${this.serverUrl}/api/patterns/stats`);
    return response.json();
  }
  
  private async getRecentQueries() {
    // Get recent RAG queries
    const response = await fetch(`${this.serverUrl}/api/queries?limit=50`);
    return response.json();
  }
}
```

## Alert Detection System

### Alert Rules Engine
```typescript
interface AlertEngine {
  rules: AlertRule[] = [
    {
      id: 'agent-blocked',
      condition: (state) => state.agents.some(a => a.status === 'blocked'),
      severity: 'warning',
      message: 'Agent is blocked and needs attention'
    },
    {
      id: 'task-blocked-long',
      condition: (state) => {
        const blocked = state.tasks.filter(t => t.status === 'BLOCKED');
        return blocked.some(t => 
          Date.now() - new Date(t.updatedAt).getTime() > 3600000 // 1 hour
        );
      },
      severity: 'error',
      message: 'Task has been blocked for over 1 hour'
    },
    {
      id: 'high-memory-usage',
      condition: (state) => state.agents.some(a => a.metrics.memoryPercent > 80),
      severity: 'warning',
      message: 'Agent memory usage exceeds 80%'
    },
    {
      id: 'no-commits',
      condition: (state) => {
        const lastCommit = Math.max(...state.agents.map(a => 
          new Date(a.lastCommit?.timestamp || 0).getTime()
        ));
        return Date.now() - lastCommit > 7200000; // 2 hours
      },
      severity: 'info',
      message: 'No commits in the last 2 hours'
    },
    {
      id: 'mcp-server-down',
      condition: (state) => state.services.mcpServer.status === 'down',
      severity: 'critical',
      message: 'MCP server is not responding'
    }
  ];
  
  evaluate(state: SystemState) {
    const alerts: Alert[] = [];
    
    this.rules.forEach(rule => {
      if (rule.condition(state)) {
        alerts.push({
          id: uuidv4(),
          type: this.getAlertType(rule.id),
          severity: rule.severity,
          title: rule.message,
          message: this.getDetailedMessage(rule.id, state),
          source: 'alert-engine',
          timestamp: new Date().toISOString(),
          acknowledged: false,
          metadata: this.getAlertMetadata(rule.id, state)
        });
      }
    });
    
    return alerts;
  }
}
```

## Performance Monitoring

### Metrics Collection
```typescript
interface PerformanceMonitor {
  metrics: Map<string, MetricCollector> = new Map();
  
  initialize() {
    // API response times
    this.addMetric('api.response.time', new HistogramCollector());
    
    // WebSocket latency
    this.addMetric('websocket.latency', new HistogramCollector());
    
    // File watch events
    this.addMetric('file.watch.events', new CounterCollector());
    
    // Git operations
    this.addMetric('git.operations', new HistogramCollector());
  }
  
  recordApiCall(endpoint: string, duration: number) {
    this.metrics.get('api.response.time').record(duration, { endpoint });
  }
  
  recordWebSocketEvent(event: string, latency: number) {
    this.metrics.get('websocket.latency').record(latency, { event });
  }
  
  getMetricsSummary() {
    const summary = {};
    
    this.metrics.forEach((collector, name) => {
      summary[name] = collector.getSummary();
    });
    
    return summary;
  }
}
```

## Data Aggregation Pipeline

### Event Aggregator
```typescript
interface EventAggregator {
  private eventBuffer: Map<string, Event[]> = new Map();
  private flushInterval: number = 1000; // 1 second
  
  initialize() {
    // Set up flush timer
    setInterval(() => this.flush(), this.flushInterval);
  }
  
  addEvent(type: string, data: any) {
    if (!this.eventBuffer.has(type)) {
      this.eventBuffer.set(type, []);
    }
    
    this.eventBuffer.get(type).push({
      timestamp: Date.now(),
      data
    });
  }
  
  private flush() {
    this.eventBuffer.forEach((events, type) => {
      if (events.length > 0) {
        // Batch emit events
        this.emit(`batch:${type}`, events);
        this.eventBuffer.set(type, []);
      }
    });
  }
}
```

## Security & Isolation

### Read-Only Enforcement
```typescript
interface SecurityLayer {
  // Ensure all file operations are read-only
  async readFile(path: string): Promise<string> {
    // Validate path is within allowed directories
    if (!this.isPathAllowed(path)) {
      throw new Error('Access denied: Path outside allowed directories');
    }
    
    // Read with read-only flag
    return fs.readFile(path, { encoding: 'utf-8', flag: 'r' });
  }
  
  private isPathAllowed(path: string): boolean {
    const allowed = [
      '/coordination/',
      '/agents/architect/',
      '/agents/builder/',
      '/agents/validator/'
    ];
    
    return allowed.some(dir => path.includes(dir));
  }
  
  // Prevent any write operations
  preventWrites() {
    // Override fs write methods in monitoring context
    const writeOps = ['writeFile', 'writeFileSync', 'appendFile', 'appendFileSync'];
    
    writeOps.forEach(op => {
      fs[op] = () => {
        throw new Error('Write operations are not allowed in monitoring mode');
      };
    });
  }
}
```

## Error Handling & Recovery

### Resilient File Watching
```typescript
interface ResilientWatcher {
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries: number = 5;
  
  async watchWithRetry(path: string, handler: Function) {
    try {
      const watcher = chokidar.watch(path, {
        persistent: true,
        ignoreInitial: false
      });
      
      watcher.on('error', (error) => {
        this.handleWatchError(path, error, handler);
      });
      
      watcher.on('change', handler);
      
      // Reset retry count on successful watch
      this.retryAttempts.delete(path);
      
    } catch (error) {
      this.handleWatchError(path, error, handler);
    }
  }
  
  private handleWatchError(path: string, error: Error, handler: Function) {
    const attempts = this.retryAttempts.get(path) || 0;
    
    if (attempts < this.maxRetries) {
      logger.warn(`Watch error for ${path}, retrying... (${attempts + 1}/${this.maxRetries})`);
      
      this.retryAttempts.set(path, attempts + 1);
      
      setTimeout(() => {
        this.watchWithRetry(path, handler);
      }, Math.pow(2, attempts) * 1000); // Exponential backoff
      
    } else {
      logger.error(`Failed to watch ${path} after ${this.maxRetries} attempts`, error);
      this.emit('watch:failed', { path, error });
    }
  }
}
```

---

This comprehensive integration design ensures the monitoring dashboard can observe all aspects of the multi-agent system without interfering with agent operations, while maintaining performance and reliability.