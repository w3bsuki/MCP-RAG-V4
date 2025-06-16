#!/usr/bin/env tsx

import chokidar from 'chokidar';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import notifier from 'node-notifier';
import cron from 'node-cron';

interface TaskBoardChange {
  type: 'task_completed' | 'task_blocked' | 'task_assigned' | 'stale_task';
  taskId: string;
  agentId: string;
  timestamp: string;
  details: any;
}

class CoordinationMonitor {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private lastTaskBoard: any = null;
  private changeHistory: TaskBoardChange[] = [];

  constructor() {
    this.startFileWatching();
    this.startPeriodicChecks();
    console.log('🤖 Coordination Monitor started - watching for workflow improvements...');
  }

  private startFileWatching() {
    // Watch central coordination files
    const coordinationWatcher = chokidar.watch([
      'coordination/task-board.json',
      'coordination/progress-log.md'
    ], {
      persistent: true,
      ignoreInitial: false
    });

    coordinationWatcher.on('change', async (path) => {
      console.log(`📝 Coordination change detected: ${path}`);
      
      if (path.includes('task-board.json')) {
        await this.analyzeTaskBoardChanges();
      }
    });

    // Watch agent todo files
    const agentPaths = ['architect', 'builder', 'validator'];
    agentPaths.forEach(agent => {
      const agentWatcher = chokidar.watch([
        `agents/${agent}/TODO.md`,
        `agents/${agent}/coordination/memory-bank/*.json`
      ], {
        persistent: true,
        ignoreInitial: true
      });

      agentWatcher.on('change', (path) => {
        console.log(`🔄 ${agent} activity: ${path}`);
        this.checkAgentProductivity(agent);
      });

      this.watchers.set(agent, agentWatcher);
    });
  }

  private async analyzeTaskBoardChanges() {
    try {
      const taskBoard = JSON.parse(await readFile('coordination/task-board.json', 'utf-8'));
      
      if (this.lastTaskBoard) {
        const changes = this.detectChanges(this.lastTaskBoard, taskBoard);
        
        for (const change of changes) {
          this.processChange(change);
        }
      }
      
      this.lastTaskBoard = taskBoard;
    } catch (error) {
      console.error('Error analyzing task board:', error);
    }
  }

  private detectChanges(oldBoard: any, newBoard: any): TaskBoardChange[] {
    const changes: TaskBoardChange[] = [];
    
    // Compare tasks
    const oldTasks = new Map(oldBoard.tasks?.map((t: any) => [t.id, t]) || []);
    const newTasks = new Map(newBoard.tasks?.map((t: any) => [t.id, t]) || []);

    for (const [taskId, newTask] of newTasks) {
      const oldTask = oldTasks.get(taskId);
      
      if (!oldTask) {
        // New task
        changes.push({
          type: 'task_assigned',
          taskId,
          agentId: newTask.assignedTo,
          timestamp: new Date().toISOString(),
          details: { title: newTask.title, priority: newTask.priority }
        });
      } else if (oldTask.status !== newTask.status) {
        // Status change
        if (newTask.status === 'DONE' || newTask.status === 'VERIFIED') {
          changes.push({
            type: 'task_completed',
            taskId,
            agentId: newTask.assignedTo,
            timestamp: new Date().toISOString(),
            details: { 
              previousStatus: oldTask.status, 
              newStatus: newTask.status,
              actualHours: newTask.actualHours,
              estimatedHours: newTask.estimatedHours
            }
          });
        } else if (newTask.status === 'BLOCKED') {
          changes.push({
            type: 'task_blocked',
            taskId,
            agentId: newTask.assignedTo,
            timestamp: new Date().toISOString(),
            details: { 
              blockers: newTask.blockers,
              previousStatus: oldTask.status
            }
          });
        }
      }
    }

    return changes;
  }

  private processChange(change: TaskBoardChange) {
    this.changeHistory.push(change);
    
    switch (change.type) {
      case 'task_completed':
        this.handleTaskCompletion(change);
        break;
      case 'task_blocked':
        this.handleTaskBlocked(change);
        break;
      case 'task_assigned':
        this.handleTaskAssigned(change);
        break;
    }
  }

  private handleTaskCompletion(change: TaskBoardChange) {
    const { taskId, agentId, details } = change;
    
    console.log(`✅ Task ${taskId} completed by ${agentId}`);
    
    // Check for efficiency
    if (details.actualHours && details.estimatedHours) {
      const efficiency = details.estimatedHours / details.actualHours;
      
      if (efficiency < 0.5) {
        console.log(`⚠️  Task ${taskId} took ${details.actualHours}h vs estimated ${details.estimatedHours}h - underestimated`);
        this.suggestImprovement(agentId, 'estimation', `Consider breaking down complex tasks like ${taskId}`);
      } else if (efficiency > 2) {
        console.log(`🚀 Task ${taskId} completed faster than expected - excellent work!`);
      }
    }

    // Trigger notification
    notifier.notify({
      title: 'Task Completed',
      message: `${agentId} completed ${taskId}`,
      sound: true
    });
  }

  private handleTaskBlocked(change: TaskBoardChange) {
    const { taskId, agentId, details } = change;
    
    console.log(`🚫 Task ${taskId} blocked for ${agentId}: ${details.blockers?.join(', ')}`);
    
    // High priority notification for blockers
    notifier.notify({
      title: 'Task Blocked',
      message: `${taskId} blocked - immediate attention needed`,
      sound: true,
      wait: true
    });
    
    this.suggestImprovement(agentId, 'blocker', `Task ${taskId} blocked - consider parallel work or escalation`);
  }

  private handleTaskAssigned(change: TaskBoardChange) {
    console.log(`📋 New task ${change.taskId} assigned to ${change.agentId}`);
  }

  private async checkAgentProductivity(agentId: string) {
    const recentChanges = this.changeHistory
      .filter(c => c.agentId === agentId && 
               new Date(c.timestamp) > new Date(Date.now() - 2 * 60 * 60 * 1000)) // Last 2 hours
      .length;

    if (recentChanges === 0) {
      console.log(`💤 ${agentId} has been quiet for 2+ hours - might need check-in`);
    }
  }

  private suggestImprovement(agentId: string, type: string, suggestion: string) {
    console.log(`💡 Improvement suggestion for ${agentId} (${type}): ${suggestion}`);
    
    // Could store these suggestions for periodic review
    const improvement = {
      agentId,
      type,
      suggestion,
      timestamp: new Date().toISOString()
    };
    
    // Add to improvement log
    this.saveImprovement(improvement);
  }

  private async saveImprovement(improvement: any) {
    try {
      const improvementLog = join('coordination', 'improvement-suggestions.json');
      let suggestions = [];
      
      try {
        suggestions = JSON.parse(await readFile(improvementLog, 'utf-8'));
      } catch {
        // File doesn't exist yet
      }
      
      suggestions.push(improvement);
      
      // Keep only last 50 suggestions
      if (suggestions.length > 50) {
        suggestions = suggestions.slice(-50);
      }
      
      await writeFile(improvementLog, JSON.stringify(suggestions, null, 2));
    } catch (error) {
      console.error('Error saving improvement:', error);
    }
  }

  private startPeriodicChecks() {
    // Check for stale tasks every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      await this.checkForStaleActivities();
    });

    // Generate daily summary
    cron.schedule('0 0 * * *', async () => {
      await this.generateDailySummary();
    });
  }

  private async checkForStaleActivities() {
    try {
      const taskBoard = JSON.parse(await readFile('coordination/task-board.json', 'utf-8'));
      const now = new Date();
      
      taskBoard.tasks?.forEach((task: any) => {
        if (task.status === 'IN_PROGRESS') {
          const lastUpdate = new Date(task.updatedAt);
          const staleMins = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
          
          if (staleMins > 60) {
            console.log(`⏰ Stale task detected: ${task.id} (${Math.round(staleMins)} mins since update)`);
            
            notifier.notify({
              title: 'Stale Task Alert',
              message: `${task.id} needs status update`,
              sound: true
            });
          }
        }
      });
    } catch (error) {
      console.error('Error checking stale activities:', error);
    }
  }

  private async generateDailySummary() {
    const today = new Date().toISOString().split('T')[0];
    const todayChanges = this.changeHistory.filter(c => 
      c.timestamp.startsWith(today)
    );

    const summary = {
      date: today,
      totalChanges: todayChanges.length,
      tasksCompleted: todayChanges.filter(c => c.type === 'task_completed').length,
      tasksBlocked: todayChanges.filter(c => c.type === 'task_blocked').length,
      agentActivity: {
        architect: todayChanges.filter(c => c.agentId === 'architect').length,
        builder: todayChanges.filter(c => c.agentId === 'builder').length,
        validator: todayChanges.filter(c => c.agentId === 'validator').length
      }
    };

    console.log(`📊 Daily Summary (${today}):`, summary);
    
    // Save to progress log
    const progressLog = await readFile('coordination/progress-log.md', 'utf-8');
    const summaryText = `\n## ${today} - Daily Activity Summary\n\n- Tasks completed: ${summary.tasksCompleted}\n- Tasks blocked: ${summary.tasksBlocked}\n- Most active agent: ${Object.entries(summary.agentActivity).sort(([,a], [,b]) => b - a)[0][0]}\n- Total coordination events: ${summary.totalChanges}\n\n---\n`;
    
    await writeFile('coordination/progress-log.md', progressLog + summaryText);
  }

  stop() {
    this.watchers.forEach(watcher => watcher.close());
    console.log('Coordination monitor stopped');
  }
}

// Start the monitor
const monitor = new CoordinationMonitor();

// Handle graceful shutdown
process.on('SIGINT', () => {
  monitor.stop();
  process.exit(0);
});

export default CoordinationMonitor;