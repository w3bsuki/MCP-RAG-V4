#!/usr/bin/env tsx
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

const AGENT_NAMES = ['architect', 'builder', 'validator'] as const;
type AgentName = typeof AGENT_NAMES[number];

interface HealthStatus {
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  details?: any;
}

interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    total: number;
    used: number;
    percentage: number;
  };
  coordination: {
    lastProjectPlanUpdate: string | null;
    lastTaskBoardUpdate: string | null;
    activeTaskCount: number;
    blockedTaskCount: number;
  };
  agents: {
    [key in AgentName]: {
      worktreeExists: boolean;
      lastCommit: string | null;
      uncommittedChanges: number;
      branch: string | null;
    };
  };
}

// Helper to execute shell commands
function exec(command: string, cwd?: string): string {
  try {
    return execSync(command, { 
      cwd, 
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
  } catch (error: any) {
    return '';
  }
}

// Check if a process is running
function isProcessRunning(processName: string): boolean {
  try {
    const result = exec(`pgrep -f "${processName}"`);
    return result.length > 0;
  } catch {
    return false;
  }
}

// Get file modification time
function getFileModTime(filePath: string): Date | null {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime;
  } catch {
    return null;
  }
}

// Check MCP server health
async function checkMcpServer(): Promise<HealthStatus> {
  try {
    // Check if server file exists
    if (!fs.existsSync('.mcp/server.ts')) {
      return {
        component: 'MCP Server',
        status: 'critical',
        message: 'Server file not found'
      };
    }
    
    // Check if built
    if (!fs.existsSync('dist/.mcp/server.js')) {
      return {
        component: 'MCP Server',
        status: 'warning',
        message: 'Server not built (run npm run build)'
      };
    }
    
    // Check if running (simplified check)
    const isRunning = isProcessRunning('mcp-rag-server');
    
    return {
      component: 'MCP Server',
      status: isRunning ? 'healthy' : 'warning',
      message: isRunning ? 'Server is running' : 'Server is not running'
    };
  } catch (error: any) {
    return {
      component: 'MCP Server',
      status: 'unknown',
      message: error.message
    };
  }
}

// Check git worktree health
async function checkWorktree(agent: AgentName): Promise<HealthStatus> {
  const worktreePath = path.join('agents', agent);
  
  try {
    // Check if worktree exists
    if (!fs.existsSync(worktreePath)) {
      return {
        component: `Worktree: ${agent}`,
        status: 'critical',
        message: 'Worktree not found'
      };
    }
    
    // Check git status
    const status = exec('git status --porcelain', worktreePath);
    const uncommitted = status ? status.split('\n').length : 0;
    
    // Get current branch
    const branch = exec('git branch --show-current', worktreePath);
    
    // Get last commit
    const lastCommit = exec('git log -1 --oneline', worktreePath);
    
    const details = {
      branch,
      uncommittedChanges: uncommitted,
      lastCommit: lastCommit.substring(0, 50)
    };
    
    // Determine health
    let health: HealthStatus['status'] = 'healthy';
    let message = 'Worktree is healthy';
    
    if (uncommitted > 10) {
      health = 'warning';
      message = `${uncommitted} uncommitted changes`;
    } else if (uncommitted > 20) {
      health = 'critical';
      message = `Too many uncommitted changes (${uncommitted})`;
    }
    
    return {
      component: `Worktree: ${agent}`,
      status: health,
      message,
      details
    };
    
  } catch (error: any) {
    return {
      component: `Worktree: ${agent}`,
      status: 'unknown',
      message: error.message
    };
  }
}

// Check coordination files health
async function checkCoordination(): Promise<HealthStatus[]> {
  const results: HealthStatus[] = [];
  
  // Check PROJECT_PLAN.md
  const projectPlanPath = 'coordination/PROJECT_PLAN.md';
  const projectPlanMod = getFileModTime(projectPlanPath);
  
  if (!projectPlanMod) {
    results.push({
      component: 'PROJECT_PLAN.md',
      status: 'critical',
      message: 'File not found'
    });
  } else {
    const hoursSinceUpdate = (Date.now() - projectPlanMod.getTime()) / (1000 * 60 * 60);
    
    results.push({
      component: 'PROJECT_PLAN.md',
      status: hoursSinceUpdate > 48 ? 'warning' : 'healthy',
      message: hoursSinceUpdate > 48 
        ? `Not updated for ${Math.round(hoursSinceUpdate)} hours`
        : `Updated ${Math.round(hoursSinceUpdate)} hours ago`,
      details: { lastUpdate: projectPlanMod.toISOString() }
    });
  }
  
  // Check task-board.json
  try {
    const taskBoard = JSON.parse(
      fs.readFileSync('coordination/task-board.json', 'utf8')
    );
    
    const totalTasks = taskBoard.tasks?.length || 0;
    const blockedTasks = taskBoard.tasks?.filter(
      (t: any) => t.status === 'BLOCKED'
    ).length || 0;
    
    results.push({
      component: 'task-board.json',
      status: blockedTasks > 3 ? 'warning' : 'healthy',
      message: `${totalTasks} tasks, ${blockedTasks} blocked`,
      details: { totalTasks, blockedTasks }
    });
  } catch {
    results.push({
      component: 'task-board.json',
      status: 'critical',
      message: 'File not found or invalid'
    });
  }
  
  // Check memory bank
  const memoryBankPath = 'coordination/memory-bank';
  try {
    const files = fs.readdirSync(memoryBankPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    results.push({
      component: 'Memory Bank',
      status: 'healthy',
      message: `${jsonFiles.length} patterns stored`,
      details: { patternCount: jsonFiles.length }
    });
  } catch {
    results.push({
      component: 'Memory Bank',
      status: 'warning',
      message: 'Directory not found or empty'
    });
  }
  
  return results;
}

// Collect system metrics
async function collectMetrics(): Promise<SystemMetrics> {
  const metrics: SystemMetrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      total: process.memoryUsage().heapTotal,
      used: process.memoryUsage().heapUsed,
      percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
    },
    coordination: {
      lastProjectPlanUpdate: null,
      lastTaskBoardUpdate: null,
      activeTaskCount: 0,
      blockedTaskCount: 0
    },
    agents: {
      architect: {
        worktreeExists: false,
        lastCommit: null,
        uncommittedChanges: 0,
        branch: null
      },
      builder: {
        worktreeExists: false,
        lastCommit: null,
        uncommittedChanges: 0,
        branch: null
      },
      validator: {
        worktreeExists: false,
        lastCommit: null,
        uncommittedChanges: 0,
        branch: null
      }
    }
  };
  
  // Coordination metrics
  const projectPlanMod = getFileModTime('coordination/PROJECT_PLAN.md');
  if (projectPlanMod) {
    metrics.coordination.lastProjectPlanUpdate = projectPlanMod.toISOString();
  }
  
  const taskBoardMod = getFileModTime('coordination/task-board.json');
  if (taskBoardMod) {
    metrics.coordination.lastTaskBoardUpdate = taskBoardMod.toISOString();
  }
  
  try {
    const taskBoard = JSON.parse(
      fs.readFileSync('coordination/task-board.json', 'utf8')
    );
    metrics.coordination.activeTaskCount = taskBoard.tasks?.filter(
      (t: any) => t.status === 'IN_PROGRESS'
    ).length || 0;
    metrics.coordination.blockedTaskCount = taskBoard.tasks?.filter(
      (t: any) => t.status === 'BLOCKED'
    ).length || 0;
  } catch {
    // Ignore
  }
  
  // Agent metrics
  for (const agent of AGENT_NAMES) {
    const worktreePath = path.join('agents', agent);
    
    if (fs.existsSync(worktreePath)) {
      metrics.agents[agent].worktreeExists = true;
      
      try {
        metrics.agents[agent].branch = exec('git branch --show-current', worktreePath);
        
        const lastCommit = exec('git log -1 --format="%H %s"', worktreePath);
        metrics.agents[agent].lastCommit = lastCommit.substring(0, 50);
        
        const status = exec('git status --porcelain', worktreePath);
        metrics.agents[agent].uncommittedChanges = status ? status.split('\n').length : 0;
      } catch {
        // Ignore
      }
    }
  }
  
  return metrics;
}

// Display health dashboard
function displayDashboard(statuses: HealthStatus[], metrics: SystemMetrics): void {
  console.clear();
  console.log('🏥 MCP/RAG System Health Dashboard');
  console.log('==================================\n');
  
  // System overview
  console.log(`📅 Timestamp: ${metrics.timestamp}`);
  console.log(`⏱️  Uptime: ${Math.round(metrics.uptime / 60)} minutes`);
  console.log(`💾 Memory: ${Math.round(metrics.memory.percentage)}% used\n`);
  
  // Health status table
  console.log('Component Health Status:');
  console.log('------------------------');
  
  const statusEmoji = {
    healthy: '✅',
    warning: '⚠️ ',
    critical: '❌',
    unknown: '❓'
  };
  
  statuses.forEach(status => {
    const emoji = statusEmoji[status.status];
    console.log(`${emoji} ${status.component.padEnd(20)} | ${status.message}`);
    
    if (status.details && process.env.VERBOSE) {
      console.log(`   Details: ${JSON.stringify(status.details)}`);
    }
  });
  
  // Coordination summary
  console.log('\n\nCoordination Summary:');
  console.log('---------------------');
  console.log(`Active Tasks: ${metrics.coordination.activeTaskCount}`);
  console.log(`Blocked Tasks: ${metrics.coordination.blockedTaskCount}`);
  
  if (metrics.coordination.lastProjectPlanUpdate) {
    const planAge = (Date.now() - new Date(metrics.coordination.lastProjectPlanUpdate).getTime()) / (1000 * 60 * 60);
    console.log(`PROJECT_PLAN age: ${Math.round(planAge)} hours`);
  }
  
  // Agent summary
  console.log('\n\nAgent Summary:');
  console.log('--------------');
  
  for (const agent of AGENT_NAMES) {
    const agentData = metrics.agents[agent];
    if (agentData.worktreeExists) {
      console.log(`\n${agent}:`);
      console.log(`  Branch: ${agentData.branch || 'unknown'}`);
      console.log(`  Uncommitted: ${agentData.uncommittedChanges} files`);
      if (agentData.lastCommit) {
        console.log(`  Last commit: ${agentData.lastCommit}`);
      }
    }
  }
  
  // Recommendations
  const criticalCount = statuses.filter(s => s.status === 'critical').length;
  const warningCount = statuses.filter(s => s.status === 'warning').length;
  
  if (criticalCount > 0 || warningCount > 0) {
    console.log('\n\n⚠️  Recommendations:');
    console.log('-------------------');
    
    if (criticalCount > 0) {
      console.log(`- ${criticalCount} critical issues need immediate attention`);
    }
    
    if (warningCount > 0) {
      console.log(`- ${warningCount} warnings should be addressed soon`);
    }
    
    if (metrics.coordination.blockedTaskCount > 0) {
      console.log('- Review and unblock tasks in task-board.json');
    }
  } else {
    console.log('\n\n✨ All systems healthy!');
  }
}

// Main health check function
async function main() {
  const continuous = process.argv.includes('--watch');
  
  if (continuous) {
    console.log('Starting continuous health monitoring (Ctrl+C to stop)...\n');
  }
  
  const runHealthCheck = async () => {
    const statuses: HealthStatus[] = [];
    
    // Check all components
    statuses.push(await checkMcpServer());
    
    for (const agent of AGENT_NAMES) {
      statuses.push(await checkWorktree(agent));
    }
    
    statuses.push(...await checkCoordination());
    
    // Collect metrics
    const metrics = await collectMetrics();
    
    // Display dashboard
    displayDashboard(statuses, metrics);
    
    // Write to log file if requested
    if (process.argv.includes('--log')) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        statuses,
        metrics
      };
      
      fs.appendFileSync(
        'health-check.log',
        JSON.stringify(logEntry) + '\n'
      );
    }
  };
  
  if (continuous) {
    // Run every 30 seconds
    setInterval(runHealthCheck, 30000);
    await runHealthCheck(); // Run immediately
  } else {
    await runHealthCheck();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nStopping health check...');
  process.exit(0);
});

// Run health check
main().catch(console.error);