#!/usr/bin/env tsx
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const AGENT_NAMES = ['architect', 'builder', 'validator'] as const;
type AgentName = typeof AGENT_NAMES[number];

const COORDINATION_FILES = [
  'coordination/PROJECT_PLAN.md',
  'coordination/task-board.json',
  'coordination/progress-log.md',
  'coordination/README.md'
];

const PROJECT_DIRECTORIES = [
  'projects/'
];

interface SyncResult {
  agent: AgentName;
  files: {
    file: string;
    status: 'synced' | 'conflict' | 'error';
    message?: string;
  }[];
  commits: string[];
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
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

// Get uncommitted changes in a worktree
function getUncommittedChanges(worktreePath: string): string[] {
  try {
    const status = exec('git status --porcelain', worktreePath);
    if (!status) return [];
    
    return status.split('\n')
      .map(line => line.substring(3).trim())
      .filter(file => file.length > 0);
  } catch {
    return [];
  }
}

// Get recent commits from an agent
function getRecentCommits(worktreePath: string, since: string = '24 hours ago'): string[] {
  try {
    const commits = exec(
      `git log --oneline --since="${since}" --pretty=format:"%h %s"`,
      worktreePath
    );
    
    return commits ? commits.split('\n') : [];
  } catch {
    return [];
  }
}

// Sync coordination files from main to worktree
async function syncCoordinationFiles(agent: AgentName): Promise<SyncResult['files']> {
  const worktreePath = path.join('agents', agent);
  const results: SyncResult['files'] = [];
  
  for (const file of COORDINATION_FILES) {
    try {
      const sourcePath = path.join(process.cwd(), file);
      const destPath = path.join(worktreePath, file);
      const destDir = path.dirname(destPath);
      
      // Ensure directory exists
      exec(`mkdir -p ${destDir}`, worktreePath);
      
      // Check if file exists in source
      if (!fs.existsSync(sourcePath)) {
        results.push({
          file,
          status: 'error',
          message: 'Source file not found'
        });
        continue;
      }
      
      // Check for local modifications
      const localChanges = getUncommittedChanges(worktreePath);
      if (localChanges.includes(file)) {
        results.push({
          file,
          status: 'conflict',
          message: 'Local modifications detected'
        });
        continue;
      }
      
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
      
      // Stage the change in worktree
      exec(`git add ${file}`, worktreePath);
      
      results.push({
        file,
        status: 'synced'
      });
      
    } catch (error: any) {
      results.push({
        file,
        status: 'error',
        message: error.message
      });
    }
  }
  
  return results;
}

// Collect changes from worktrees back to main
async function collectChanges(): Promise<void> {
  console.log('📥 Collecting changes from agent worktrees...\n');
  
  for (const agent of AGENT_NAMES) {
    const worktreePath = path.join('agents', agent);
    
    // Get uncommitted changes
    const uncommitted = getUncommittedChanges(worktreePath);
    if (uncommitted.length > 0) {
      console.log(`⚠️  ${agent} has uncommitted changes:`);
      uncommitted.forEach(file => console.log(`   - ${file}`));
      console.log('');
    }
    
    // Look for updates to coordination files
    try {
      const modifiedFiles = exec(
        `git diff --name-only HEAD -- ${COORDINATION_FILES.join(' ')}`,
        worktreePath
      );
      
      if (modifiedFiles) {
        console.log(`📝 ${agent} modified coordination files:`);
        modifiedFiles.split('\n').forEach(file => {
          if (file) console.log(`   - ${file}`);
        });
      }
    } catch {
      // No modifications
    }
  }
}

// Generate sync report
function generateReport(results: SyncResult[]): void {
  console.log('\n📊 Synchronization Report:\n');
  
  // File sync status
  console.log('File Synchronization Status:');
  console.log('----------------------------');
  
  for (const result of results) {
    console.log(`\n${result.agent}:`);
    for (const file of result.files) {
      const status = file.status === 'synced' ? '✅' : 
                    file.status === 'conflict' ? '⚠️ ' : '❌';
      console.log(`  ${status} ${file.file} ${file.message ? `(${file.message})` : ''}`);
    }
  }
  
  // Recent commits
  console.log('\n\nRecent Commits (last 24 hours):');
  console.log('--------------------------------');
  
  for (const result of results) {
    if (result.commits.length > 0) {
      console.log(`\n${result.agent}:`);
      result.commits.forEach(commit => {
        console.log(`  ${commit}`);
      });
    }
  }
  
  // Recommendations
  console.log('\n\n💡 Recommendations:');
  console.log('-------------------');
  
  const hasConflicts = results.some(r => 
    r.files.some(f => f.status === 'conflict')
  );
  
  if (hasConflicts) {
    console.log('- Resolve conflicts in worktrees before syncing');
    console.log('- Commit or stash local changes');
  }
  
  console.log('- Run this sync script regularly (every 2-4 hours)');
  console.log('- Always commit coordination file changes with descriptive messages');
  console.log('- Use MCP tools for coordination file updates when possible');
}

// Main sync function
async function main() {
  console.log('🔄 MCP/RAG Multi-Agent Worktree Synchronization\n');
  
  try {
    // Check if we're in the main worktree
    const currentBranch = exec('git branch --show-current');
    if (currentBranch.startsWith('agent-')) {
      throw new Error('Please run this script from the main worktree, not an agent worktree');
    }
    
    // Collect changes from agents first
    await collectChanges();
    
    // Sync to each agent
    const results: SyncResult[] = [];
    
    console.log('\n📤 Synchronizing coordination files to agents...\n');
    
    for (const agent of AGENT_NAMES) {
      console.log(`Syncing ${agent}...`);
      
      const worktreePath = path.join('agents', agent);
      
      // Check if worktree exists
      if (!fs.existsSync(worktreePath)) {
        console.error(`✗ ${agent}: Worktree not found`);
        continue;
      }
      
      // Sync files
      const files = await syncCoordinationFiles(agent);
      
      // Get recent commits
      const commits = getRecentCommits(worktreePath);
      
      results.push({
        agent,
        files,
        commits
      });
      
      // Commit if there are staged changes
      try {
        const staged = exec('git diff --cached --name-only', worktreePath);
        if (staged) {
          exec(
            `git commit -m "Sync coordination files from main"`,
            worktreePath
          );
          console.log(`✓ ${agent}: Committed synchronized files`);
        } else {
          console.log(`✓ ${agent}: No changes to commit`);
        }
      } catch {
        console.log(`✓ ${agent}: No changes to commit`);
      }
    }
    
    // Generate report
    generateReport(results);
    
    console.log('\n✨ Synchronization complete!\n');
    
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run sync
main().catch(console.error);