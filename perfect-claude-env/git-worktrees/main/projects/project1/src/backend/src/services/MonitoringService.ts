import { EventEmitter } from 'events';
import { FileMonitor, FileChangeEvent, GitCommitEvent, AgentMetrics } from './FileMonitor';

export interface MonitoringConfig {
  agentWorktreesPath: string;
  pollIntervalMs?: number;
  agents: {
    id: string;
    name: string;
    worktreePath: string;
  }[];
}

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  totalCommits: number;
  totalFiles: number;
  recentActivity: Array<FileChangeEvent | GitCommitEvent>;
}

export class MonitoringService extends EventEmitter {
  private fileMonitor: FileMonitor;
  private recentActivity: Array<FileChangeEvent | GitCommitEvent> = [];
  private maxRecentItems = 100;
  private config: MonitoringConfig;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.fileMonitor = new FileMonitor(config.pollIntervalMs || 5000);
    this.setupEventHandlers();
  }

  /**
   * Initialize monitoring for all configured agents
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing monitoring service...');

    for (const agent of this.config.agents) {
      try {
        await this.fileMonitor.addAgent(agent.id, agent.worktreePath);
        console.log(`✅ Added monitoring for agent: ${agent.name} (${agent.id})`);
      } catch (error) {
        console.error(`❌ Failed to add agent ${agent.id}:`, error);
        this.emit('error', { agentId: agent.id, error });
      }
    }

    console.log('✨ Monitoring service initialized');
    this.emit('initialized');
  }

  /**
   * Get metrics for a specific agent
   */
  async getAgentMetrics(agentId: string): Promise<AgentMetrics> {
    return this.fileMonitor.getAgentMetrics(agentId);
  }

  /**
   * Get metrics for all agents
   */
  async getAllAgentMetrics(): Promise<AgentMetrics[]> {
    const agents = this.fileMonitor.getAgents();
    const metrics = await Promise.all(
      agents.map(agentId => this.fileMonitor.getAgentMetrics(agentId))
    );
    return metrics;
  }

  /**
   * Get system-wide metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const agentMetrics = await this.getAllAgentMetrics();
    
    const totalCommits = agentMetrics.reduce((sum, m) => sum + m.totalCommits, 0);
    const totalFiles = agentMetrics.reduce((sum, m) => sum + m.totalFiles, 0);
    
    return {
      totalAgents: this.config.agents.length,
      activeAgents: this.fileMonitor.getAgents().length,
      totalCommits,
      totalFiles,
      recentActivity: [...this.recentActivity]
    };
  }

  /**
   * Get recent activity
   */
  getRecentActivity(limit: number = 50): Array<FileChangeEvent | GitCommitEvent> {
    return this.recentActivity.slice(0, limit);
  }

  /**
   * Add a new agent to monitor
   */
  async addAgent(agentId: string, name: string, worktreePath: string): Promise<void> {
    // Add to config
    const existingIndex = this.config.agents.findIndex(a => a.id === agentId);
    if (existingIndex >= 0) {
      this.config.agents[existingIndex] = { id: agentId, name, worktreePath };
    } else {
      this.config.agents.push({ id: agentId, name, worktreePath });
    }

    // Add to monitor
    await this.fileMonitor.addAgent(agentId, worktreePath);
    this.emit('agentAdded', { agentId, name, worktreePath });
  }

  /**
   * Remove an agent from monitoring
   */
  async removeAgent(agentId: string): Promise<void> {
    // Remove from config
    this.config.agents = this.config.agents.filter(a => a.id !== agentId);

    // Remove from monitor
    await this.fileMonitor.removeAgent(agentId);
    this.emit('agentRemoved', { agentId });
  }

  /**
   * Stop all monitoring
   */
  async stop(): Promise<void> {
    await this.fileMonitor.stopAll();
    this.emit('stopped');
  }

  private setupEventHandlers() {
    // Forward file change events
    this.fileMonitor.on('fileChange', (event: FileChangeEvent) => {
      this.addToRecentActivity(event);
      this.emit('fileChange', event);
    });

    // Forward commit events
    this.fileMonitor.on('commit', (event: GitCommitEvent) => {
      this.addToRecentActivity(event);
      this.emit('commit', event);
    });

    // Forward error events
    this.fileMonitor.on('error', (error) => {
      this.emit('error', error);
    });

    // Forward agent events
    this.fileMonitor.on('agentAdded', (data) => {
      this.emit('agentAdded', data);
    });

    this.fileMonitor.on('agentRemoved', (data) => {
      this.emit('agentRemoved', data);
    });
  }

  private addToRecentActivity(event: FileChangeEvent | GitCommitEvent) {
    this.recentActivity.unshift(event);
    
    // Keep only the most recent items
    if (this.recentActivity.length > this.maxRecentItems) {
      this.recentActivity = this.recentActivity.slice(0, this.maxRecentItems);
    }
  }

  /**
   * Check if an event is a commit event
   */
  static isCommitEvent(event: FileChangeEvent | GitCommitEvent): event is GitCommitEvent {
    return 'hash' in event;
  }

  /**
   * Check if an event is a file change event
   */
  static isFileChangeEvent(event: FileChangeEvent | GitCommitEvent): event is FileChangeEvent {
    return 'type' in event && ['add', 'change', 'unlink'].includes(event.type);
  }
}