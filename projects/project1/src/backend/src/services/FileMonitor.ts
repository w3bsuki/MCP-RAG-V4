import { EventEmitter } from 'events';
import chokidar, { FSWatcher } from 'chokidar';
import simpleGit, { SimpleGit, DefaultLogFields } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';

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

export interface AgentMetrics {
  agentId: string;
  totalFiles: number;
  totalCommits: number;
  lastActivity: Date;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
}

export class FileMonitor extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map();
  private gitInstances: Map<string, SimpleGit> = new Map();
  private agentPaths: Map<string, string> = new Map();
  private lastCommitHashes: Map<string, string> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(private pollIntervalMs: number = 5000) {
    super();
  }

  /**
   * Start monitoring an agent's worktree
   */
  async addAgent(agentId: string, worktreePath: string): Promise<void> {
    if (this.watchers.has(agentId)) {
      throw new Error(`Agent ${agentId} is already being monitored`);
    }

    // Verify path exists
    try {
      await fs.access(worktreePath);
    } catch (error) {
      throw new Error(`Worktree path does not exist: ${worktreePath}`);
    }

    // Store agent path
    this.agentPaths.set(agentId, worktreePath);

    // Initialize git instance
    const git = simpleGit(worktreePath);
    this.gitInstances.set(agentId, git);

    // Get initial commit hash
    try {
      const log = await git.log({ maxCount: 1 });
      if (log.latest) {
        this.lastCommitHashes.set(agentId, log.latest.hash);
      }
    } catch (error) {
      console.warn(`Failed to get initial commit for ${agentId}:`, error);
    }

    // Set up file watcher
    const watcher = chokidar.watch(worktreePath, {
      ignored: [
        /(^|[\/\\])\../, // Ignore dotfiles
        /node_modules/,
        /dist/,
        /build/,
        /.git/
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    // Handle file events
    watcher
      .on('add', (filePath) => this.handleFileEvent('add', filePath, agentId))
      .on('change', (filePath) => this.handleFileEvent('change', filePath, agentId))
      .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath, agentId))
      .on('error', (error) => this.emit('error', { agentId, error }));

    this.watchers.set(agentId, watcher);

    // Start polling for git commits if not already running
    if (!this.pollInterval) {
      this.startGitPolling();
    }

    this.emit('agentAdded', { agentId, worktreePath });
  }

  /**
   * Stop monitoring an agent
   */
  async removeAgent(agentId: string): Promise<void> {
    const watcher = this.watchers.get(agentId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(agentId);
    }

    this.gitInstances.delete(agentId);
    this.agentPaths.delete(agentId);
    this.lastCommitHashes.delete(agentId);

    // Stop polling if no agents left
    if (this.watchers.size === 0 && this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.emit('agentRemoved', { agentId });
  }

  /**
   * Get current metrics for an agent
   */
  async getAgentMetrics(agentId: string): Promise<AgentMetrics> {
    const git = this.gitInstances.get(agentId);
    const worktreePath = this.agentPaths.get(agentId);

    if (!git || !worktreePath) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Get commit count
    const log = await git.log();
    const totalCommits = log.total;

    // Get file stats
    const status = await git.status();
    const filesChanged = status.files.length;

    // Get diff stats for uncommitted changes
    let linesAdded = 0;
    let linesRemoved = 0;

    try {
      const diffSummary = await git.diffSummary();
      linesAdded = diffSummary.insertions;
      linesRemoved = diffSummary.deletions;
    } catch (error) {
      // Ignore diff errors
    }

    // Count total files (excluding ignored patterns)
    const totalFiles = await this.countFiles(worktreePath);

    // Get last activity from most recent commit
    const lastActivity = log.latest ? new Date(log.latest.date) : new Date();

    return {
      agentId,
      totalFiles,
      totalCommits,
      lastActivity,
      filesChanged,
      linesAdded,
      linesRemoved
    };
  }

  /**
   * Get all monitored agents
   */
  getAgents(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * Stop monitoring all agents
   */
  async stopAll(): Promise<void> {
    const agents = this.getAgents();
    await Promise.all(agents.map(agentId => this.removeAgent(agentId)));
  }

  private handleFileEvent(type: 'add' | 'change' | 'unlink', filePath: string, agentId: string) {
    const worktreePath = this.agentPaths.get(agentId);
    if (!worktreePath) return;

    const relativePath = path.relative(worktreePath, filePath);
    
    const event: FileChangeEvent = {
      type,
      path: filePath,
      relativePath,
      agentId,
      timestamp: new Date()
    };

    this.emit('fileChange', event);
  }

  private startGitPolling() {
    this.pollInterval = setInterval(() => {
      this.checkForNewCommits();
    }, this.pollIntervalMs);
  }

  private async checkForNewCommits() {
    for (const [agentId, git] of this.gitInstances.entries()) {
      try {
        const log = await git.log({ maxCount: 10 });
        const lastKnownHash = this.lastCommitHashes.get(agentId);

        if (!log.latest) continue;

        // If we have a new commit
        if (lastKnownHash !== log.latest.hash) {
          // Find all new commits
          const newCommits: DefaultLogFields[] = [];
          for (const commit of log.all) {
            if (commit.hash === lastKnownHash) break;
            newCommits.push(commit);
          }

          // Emit events for new commits (in chronological order)
          for (const commit of newCommits.reverse()) {
            // For simple-git, files are not directly available in log
            // We'll need to get them separately if needed
            const files: string[] = [];
            
            const event: GitCommitEvent = {
              hash: commit.hash,
              author: commit.author_name,
              email: commit.author_email,
              date: new Date(commit.date),
              message: commit.message,
              agentId,
              files
            };

            this.emit('commit', event);
          }

          // Update last known hash
          this.lastCommitHashes.set(agentId, log.latest.hash);
        }
      } catch (error) {
        this.emit('error', { agentId, error, context: 'git polling' });
      }
    }
  }

  private async countFiles(dirPath: string): Promise<number> {
    let count = 0;

    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      // Skip ignored patterns
      if (item.name.startsWith('.') || 
          item.name === 'node_modules' || 
          item.name === 'dist' || 
          item.name === 'build') {
        continue;
      }

      if (item.isDirectory()) {
        count += await this.countFiles(fullPath);
      } else {
        count++;
      }
    }

    return count;
  }
}