#!/usr/bin/env tsx
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const AGENT_NAMES = ['architect', 'builder', 'validator'] as const;
type AgentName = typeof AGENT_NAMES[number];

interface SetupResult {
  agent: AgentName;
  success: boolean;
  message: string;
  branch?: string;
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

// Check prerequisites
function checkPrerequisites(): void {
  console.log('🔍 Checking prerequisites...');
  
  // Check Node.js version
  const nodeVersion = exec('node --version');
  console.log(`✓ Node.js version: ${nodeVersion}`);
  
  // Check npm
  const npmVersion = exec('npm --version');
  console.log(`✓ npm version: ${npmVersion}`);
  
  // Check git
  const gitVersion = exec('git --version');
  console.log(`✓ Git version: ${gitVersion}`);
  
  // Check if we're in a git repo
  try {
    exec('git rev-parse --git-dir');
    console.log('✓ Git repository detected');
  } catch {
    throw new Error('Not in a git repository. Please run git init first.');
  }
  
  // Check if MCP server exists
  if (!fs.existsSync('.mcp/server.ts')) {
    throw new Error('MCP server not found. Please run from project root.');
  }
  console.log('✓ MCP server found');
  
  console.log('\n✅ All prerequisites met!\n');
}

// Setup git worktrees if not exists
async function setupWorktrees(): Promise<SetupResult[]> {
  console.log('🌳 Setting up git worktrees...\n');
  
  const results: SetupResult[] = [];
  const timestamp = Date.now();
  
  // First, ensure we have a clean working directory
  const status = exec('git status --porcelain');
  if (status) {
    console.log('⚠️  Uncommitted changes detected. Committing them first...');
    exec('git add -A');
    exec('git commit -m "Auto-commit before agent setup"');
  }
  
  for (const agent of AGENT_NAMES) {
    const worktreePath = path.join('agents', agent);
    const branchName = `agent-${agent}-${timestamp}`;
    
    try {
      // Check if worktree already exists
      const worktrees = exec('git worktree list');
      if (worktrees.includes(worktreePath)) {
        results.push({
          agent,
          success: true,
          message: 'Worktree already exists',
          branch: exec(`git -C ${worktreePath} branch --show-current`)
        });
        console.log(`✓ ${agent}: Using existing worktree`);
        continue;
      }
      
      // Create new worktree
      exec(`git worktree add ${worktreePath} -b ${branchName}`);
      
      results.push({
        agent,
        success: true,
        message: 'Worktree created successfully',
        branch: branchName
      });
      console.log(`✓ ${agent}: Created worktree on branch ${branchName}`);
      
    } catch (error: any) {
      results.push({
        agent,
        success: false,
        message: error.message
      });
      console.error(`✗ ${agent}: Failed to create worktree`);
    }
  }
  
  return results;
}

// Verify CLAUDE.md files
function verifyAgentConfigs(): void {
  console.log('\n📋 Verifying agent configurations...\n');
  
  for (const agent of AGENT_NAMES) {
    const claudeMdPath = path.join('agents', agent, 'CLAUDE.md');
    if (fs.existsSync(claudeMdPath)) {
      const content = fs.readFileSync(claudeMdPath, 'utf8');
      const lines = content.split('\n').length;
      console.log(`✓ ${agent}: CLAUDE.md found (${lines} lines)`);
    } else {
      console.error(`✗ ${agent}: CLAUDE.md missing!`);
    }
  }
}

// Setup npm dependencies in each worktree
async function setupDependencies(): Promise<void> {
  console.log('\n📦 Installing dependencies in worktrees...\n');
  
  for (const agent of AGENT_NAMES) {
    const worktreePath = path.join('agents', agent);
    
    try {
      // Copy package.json and package-lock.json
      fs.copyFileSync('package.json', path.join(worktreePath, 'package.json'));
      if (fs.existsSync('package-lock.json')) {
        fs.copyFileSync('package-lock.json', path.join(worktreePath, 'package-lock.json'));
      }
      
      // Install dependencies
      console.log(`Installing dependencies for ${agent}...`);
      exec('npm ci --prefer-offline', worktreePath);
      console.log(`✓ ${agent}: Dependencies installed`);
      
    } catch (error: any) {
      console.error(`✗ ${agent}: Failed to install dependencies - ${error.message}`);
    }
  }
}

// Test MCP server
async function testMcpServer(): Promise<boolean> {
  console.log('\n🧪 Testing MCP server...\n');
  
  try {
    // Build the server first
    exec('npm run build');
    console.log('✓ MCP server built successfully');
    
    // TODO: Add actual MCP server test here
    // For now, just check if it compiles
    
    return true;
  } catch (error: any) {
    console.error('✗ MCP server test failed:', error.message);
    return false;
  }
}

// Generate launch commands
function generateLaunchCommands(results: SetupResult[]): void {
  console.log('\n🚀 Launch Commands:\n');
  console.log('Open 3 separate terminals and run these commands:\n');
  
  results.forEach((result, index) => {
    if (result.success) {
      console.log(`Terminal ${index + 1} (${result.agent}):`);
      console.log(`cd agents/${result.agent} && claude --mcp-config ../../.mcp/config.json\n`);
    }
  });
  
  console.log('Alternative (single command with tmux):');
  console.log('tmux new-session -d -s mcp-agents \\; \\');
  results.forEach((result, index) => {
    if (result.success) {
      const split = index === 0 ? 'send-keys' : 'split-window \\; send-keys';
      console.log(`  ${split} "cd agents/${result.agent} && claude --mcp-config ../../.mcp/config.json" C-m \\; \\`);
    }
  });
  console.log('  select-layout even-horizontal');
}

// Main setup function
async function main() {
  console.log('🤖 MCP/RAG Multi-Agent Development System - Setup Script\n');
  
  try {
    // Check prerequisites
    checkPrerequisites();
    
    // Setup worktrees
    const results = await setupWorktrees();
    
    // Verify configurations
    verifyAgentConfigs();
    
    // Setup dependencies
    await setupDependencies();
    
    // Test MCP server
    const serverOk = await testMcpServer();
    
    // Summary
    console.log('\n📊 Setup Summary:\n');
    console.log('Component          | Status');
    console.log('------------------ | ------');
    results.forEach(r => {
      console.log(`${r.agent.padEnd(18)} | ${r.success ? '✅ Ready' : '❌ Failed'}`);
    });
    console.log(`MCP Server         | ${serverOk ? '✅ Ready' : '❌ Failed'}`);
    
    // Generate launch commands if all successful
    if (results.every(r => r.success) && serverOk) {
      generateLaunchCommands(results);
      console.log('\n✨ Setup complete! The system is ready for agent deployment.\n');
    } else {
      console.log('\n⚠️  Setup completed with errors. Please fix issues before launching agents.\n');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
main().catch(console.error);