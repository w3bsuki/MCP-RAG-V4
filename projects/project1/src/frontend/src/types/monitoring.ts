export interface AgentMetrics {
  agentId: string;
  totalFiles: number;
  totalCommits: number;
  lastActivity: Date;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  relativePath: string;
  agentId: string;
  timestamp: Date;
}

export interface GitCommitEvent {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  agentId: string;
  files: string[];
}

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  totalCommits: number;
  totalFiles: number;
  recentActivity: Array<FileChangeEvent | GitCommitEvent>;
}

export interface WebSocketMessage {
  type: 'fileChange' | 'commit' | 'metrics' | 'error' | 'connected' | 'activity' | 'pong';
  data: any;
  timestamp: Date;
}

export type ActivityEvent = FileChangeEvent | GitCommitEvent;

export interface AgentInfo {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'offline';
  lastSeen: Date;
  metrics: AgentMetrics;
}