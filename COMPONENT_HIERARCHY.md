# Agent Monitoring Dashboard - Component Hierarchy & Implementation Guide

## Frontend Component Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx           # Main application layout
│   │   ├── Header.tsx              # App header with title and status
│   │   ├── Sidebar.tsx             # Navigation sidebar
│   │   └── Footer.tsx              # Footer with connection status
│   │
│   ├── agents/
│   │   ├── AgentGrid.tsx           # Grid container for agent cards
│   │   ├── AgentCard.tsx           # Individual agent status card
│   │   ├── AgentMetrics.tsx        # CPU/Memory usage display
│   │   ├── AgentActivity.tsx       # Recent activity timeline
│   │   └── AgentDetails.tsx        # Detailed agent view modal
│   │
│   ├── tasks/
│   │   ├── TaskBoard.tsx           # Kanban board container
│   │   ├── TaskColumn.tsx          # Column for each status
│   │   ├── TaskCard.tsx            # Individual task card
│   │   ├── TaskFilters.tsx         # Filter controls
│   │   ├── TaskMetrics.tsx         # Velocity and metrics display
│   │   └── TaskDetails.tsx         # Task detail modal
│   │
│   ├── rag/
│   │   ├── RAGDashboard.tsx        # RAG metrics overview
│   │   ├── PatternList.tsx         # Top patterns display
│   │   ├── QueryHistory.tsx        # Recent queries
│   │   ├── MemoryChart.tsx         # Memory usage over time
│   │   └── PerformanceMetrics.tsx  # Response time charts
│   │
│   ├── git/
│   │   ├── CommitFeed.tsx          # Real-time commit stream
│   │   ├── CommitCard.tsx          # Individual commit display
│   │   ├── GitStats.tsx            # Git statistics
│   │   ├── BranchVisualizer.tsx    # Branch structure view
│   │   └── CodeMetrics.tsx         # Lines added/removed charts
│   │
│   ├── system/
│   │   ├── SystemHealth.tsx        # Overall system status
│   │   ├── ServiceStatus.tsx       # Individual service health
│   │   ├── ResourceMonitor.tsx     # CPU/Memory/Disk usage
│   │   ├── AlertPanel.tsx          # Active alerts display
│   │   └── ErrorLog.tsx            # System error viewer
│   │
│   └── common/
│       ├── Card.tsx                # Reusable card component
│       ├── Badge.tsx               # Status badges
│       ├── Chart.tsx               # Chart wrapper component
│       ├── Modal.tsx               # Modal dialog
│       ├── Tooltip.tsx             # Tooltip component
│       ├── LoadingSpinner.tsx      # Loading indicator
│       ├── ErrorBoundary.tsx       # Error boundary wrapper
│       └── ConnectionStatus.tsx    # WebSocket connection indicator
│
├── hooks/
│   ├── useWebSocket.ts             # WebSocket connection hook
│   ├── useAgentStatus.ts           # Agent status subscription
│   ├── useTaskBoard.ts             # Task board state
│   ├── useRAGMetrics.ts            # RAG metrics subscription
│   ├── useGitActivity.ts           # Git activity subscription
│   └── useSystemHealth.ts          # System health monitoring
│
├── services/
│   ├── api.ts                      # REST API client
│   ├── websocket.ts                # WebSocket client
│   ├── storage.ts                  # Local storage utilities
│   └── notifications.ts            # Alert/notification service
│
├── store/
│   ├── index.ts                    # Zustand store setup
│   ├── agentStore.ts               # Agent state slice
│   ├── taskStore.ts                # Task state slice
│   ├── ragStore.ts                 # RAG state slice
│   ├── gitStore.ts                 # Git state slice
│   └── systemStore.ts              # System state slice
│
├── types/
│   ├── agent.ts                    # Agent type definitions
│   ├── task.ts                     # Task type definitions
│   ├── rag.ts                      # RAG type definitions
│   ├── git.ts                      # Git type definitions
│   └── system.ts                   # System type definitions
│
├── utils/
│   ├── formatters.ts               # Data formatting utilities
│   ├── validators.ts               # Data validation
│   ├── constants.ts                # App constants
│   └── helpers.ts                  # General utilities
│
├── styles/
│   ├── globals.css                 # Global styles
│   ├── themes.ts                   # Theme definitions
│   └── animations.ts               # Animation utilities
│
├── App.tsx                         # Main app component
├── main.tsx                        # App entry point
└── vite-env.d.ts                   # Vite type definitions
```

## Component Implementation Details

### Core Layout Components

#### AppLayout.tsx
```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  // Main layout wrapper with header, sidebar, and content area
  // Handles responsive design and theme switching
  // Manages global keyboard shortcuts
};
```

### Agent Components

#### AgentCard.tsx
```typescript
interface AgentCardProps {
  agent: Agent;
  onSelect: (agentId: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect }) => {
  // Displays agent status, current task, and metrics
  // Shows visual indicators for status (color-coded)
  // Handles click to show details
  // Real-time updates via WebSocket
};
```

#### AgentMetrics.tsx
```typescript
interface AgentMetricsProps {
  metrics: AgentMetrics;
  compact?: boolean;
}

const AgentMetrics: React.FC<AgentMetricsProps> = ({ metrics, compact }) => {
  // Displays CPU and memory usage
  // Uses circular progress indicators
  // Updates every second
  // Shows trend arrows
};
```

### Task Components

#### TaskBoard.tsx
```typescript
interface TaskBoardProps {
  tasks: Task[];
  onTaskSelect: (taskId: string) => void;
  filters: TaskFilters;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, onTaskSelect, filters }) => {
  // Implements drag-and-drop between columns
  // Groups tasks by status
  // Applies filters
  // Shows task counts per column
};
```

#### TaskCard.tsx
```typescript
interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, isDragging }) => {
  // Displays task title, assignee, and priority
  // Shows blocker indicator if blocked
  // Implements drag handle
  // Color-coded by priority
};
```

### State Management with Zustand

#### Store Structure
```typescript
// store/index.ts
interface DashboardStore {
  // Agent state
  agents: Record<string, Agent>;
  setAgents: (agents: Record<string, Agent>) => void;
  updateAgent: (agentId: string, update: Partial<Agent>) => void;
  
  // Task state
  tasks: Task[];
  taskFilters: TaskFilters;
  setTasks: (tasks: Task[]) => void;
  updateTask: (taskId: string, update: Partial<Task>) => void;
  setTaskFilters: (filters: TaskFilters) => void;
  
  // RAG state
  ragMetrics: RAGMetrics | null;
  patterns: Pattern[];
  setRAGMetrics: (metrics: RAGMetrics) => void;
  
  // Git state
  commits: Commit[];
  gitMetrics: GitMetrics | null;
  addCommit: (commit: Commit) => void;
  
  // System state
  systemHealth: SystemHealth | null;
  alerts: Alert[];
  connectionStatus: ConnectionStatus;
  setSystemHealth: (health: SystemHealth) => void;
  addAlert: (alert: Alert) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}
```

### Custom Hooks

#### useWebSocket.ts
```typescript
export const useWebSocket = () => {
  const { setConnectionStatus, updateAgent, updateTask, addCommit, addAlert } = useStore();
  
  useEffect(() => {
    const socket = io(WS_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    socket.on('connect', () => {
      setConnectionStatus('connected');
    });
    
    socket.on('agent:status:changed', (data) => {
      updateAgent(data.agent, { status: data.currentStatus });
    });
    
    socket.on('task:updated', (data) => {
      updateTask(data.taskId, data.changes);
    });
    
    socket.on('git:commit', (data) => {
      addCommit(data.commit);
    });
    
    socket.on('system:alert', (data) => {
      addAlert(data.alert);
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);
};
```

#### useAgentStatus.ts
```typescript
export const useAgentStatus = (agentId?: string) => {
  const agents = useStore((state) => state.agents);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await api.get('/agents');
        useStore.getState().setAgents(response.data.agents);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000); // Refresh every 30s
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    agents: agentId ? agents[agentId] : agents,
    loading
  };
};
```

## Backend Service Implementation

### File Structure
```
src/
├── controllers/
│   ├── agentController.ts
│   ├── taskController.ts
│   ├── ragController.ts
│   ├── gitController.ts
│   └── systemController.ts
│
├── services/
│   ├── agentMonitor.ts
│   ├── taskService.ts
│   ├── ragService.ts
│   ├── gitService.ts
│   ├── fileWatcher.ts
│   └── websocketService.ts
│
├── models/
│   ├── agent.ts
│   ├── task.ts
│   ├── rag.ts
│   └── git.ts
│
├── utils/
│   ├── logger.ts
│   ├── errors.ts
│   └── validators.ts
│
├── config/
│   ├── index.ts
│   └── paths.ts
│
├── app.ts
└── server.ts
```

### Key Service Implementations

#### AgentMonitor Service
```typescript
export class AgentMonitor {
  private agents: Map<AgentType, AgentStatus> = new Map();
  private watchers: Map<string, FSWatcher> = new Map();
  
  async initialize() {
    // Set up file watchers for each agent's worktree
    // Monitor git status and process health
    // Emit events on status changes
  }
  
  async checkAgentStatus(agentId: AgentType): Promise<Agent> {
    // Check if git process is running
    // Get current branch and uncommitted changes
    // Read current task from task-board.json
    // Get system metrics (CPU/Memory)
    // Return aggregated status
  }
  
  private setupGitWatcher(worktreePath: string, agentId: AgentType) {
    // Watch .git directory for changes
    // Detect new commits
    // Monitor branch switches
    // Track uncommitted changes
  }
}
```

#### TaskService
```typescript
export class TaskService {
  private taskBoardPath: string;
  private watcher: FSWatcher;
  
  async initialize() {
    // Watch task-board.json for changes
    // Parse and validate on change
    // Emit events for task updates
  }
  
  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    // Read task-board.json
    // Apply filters if provided
    // Calculate metrics
    // Return filtered tasks
  }
  
  async getTaskMetrics(): Promise<TaskMetrics> {
    // Calculate completion rates
    // Compute velocity
    // Count blocked tasks
    // Aggregate by status/priority/agent
  }
}
```

## Deployment Configuration

### Frontend (Vite)
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
```

### Backend (Express)
```typescript
// app.ts
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(compression());
app.use(helmet());

// Routes
app.use('/api/agents', agentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/git', gitRoutes);
app.use('/api/system', systemRoutes);

// WebSocket setup
websocketService.initialize(io);

// Error handling
app.use(errorHandler);
```

## Testing Strategy

### Frontend Tests
```typescript
// AgentCard.test.tsx
describe('AgentCard', () => {
  it('displays agent status correctly', () => {
    const agent = createMockAgent({ status: 'active' });
    render(<AgentCard agent={agent} onSelect={jest.fn()} />);
    expect(screen.getByText('Active')).toHaveClass('text-green-500');
  });
  
  it('shows current task when assigned', () => {
    const agent = createMockAgent({ currentTask: 'TASK-123' });
    render(<AgentCard agent={agent} onSelect={jest.fn()} />);
    expect(screen.getByText('TASK-123')).toBeInTheDocument();
  });
});
```

### Backend Tests
```typescript
// agentMonitor.test.ts
describe('AgentMonitor', () => {
  it('detects uncommitted changes', async () => {
    mockGitStatus({ modified: 3, untracked: 2 });
    const status = await agentMonitor.checkAgentStatus('builder');
    expect(status.uncommittedChanges).toBe(5);
  });
  
  it('emits event on status change', async () => {
    const spy = jest.fn();
    agentMonitor.on('status:changed', spy);
    await simulateGitCommit();
    expect(spy).toHaveBeenCalledWith({
      agent: 'builder',
      event: 'commit'
    });
  });
});
```

## Performance Optimizations

### Frontend
- Virtual scrolling for long lists
- Memoization of expensive computations
- Debounced filter inputs
- Lazy loading of chart libraries
- Service worker for offline support

### Backend
- In-memory caching of git status
- Batch WebSocket events
- Connection pooling for file operations
- Graceful degradation on high load
- Circuit breaker for external services

---

This component hierarchy provides a clear structure for implementing the Agent Monitoring Dashboard with proper separation of concerns and maintainability.