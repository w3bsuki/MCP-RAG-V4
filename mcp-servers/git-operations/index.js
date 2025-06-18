import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const server = new Server({
  name: 'git-operations-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Execute git command helper
async function executeGitCommand(command, cwd = process.cwd()) {
  try {
    const { stdout, stderr } = await execAsync(`git ${command}`, { cwd });
    return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return { 
      success: false, 
      stdout: error.stdout?.trim() || '', 
      stderr: error.stderr?.trim() || error.message 
    };
  }
}

// Git operations handler
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'git_status') {
    const { directory } = request.params.arguments;
    const result = await executeGitCommand('status --porcelain', directory);
    
    return {
      content: [{
        type: 'text',
        text: result.success 
          ? `Git Status:\n${result.stdout || 'Working tree clean'}`
          : `Error: ${result.stderr}`,
      }],
      isError: !result.success,
    };
  }

  if (request.params.name === 'git_log') {
    const { directory, limit = 10, format = 'oneline' } = request.params.arguments;
    const result = await executeGitCommand(`log -${limit} --${format}`, directory);
    
    return {
      content: [{
        type: 'text',
        text: result.success 
          ? `Git Log:\n${result.stdout}`
          : `Error: ${result.stderr}`,
      }],
      isError: !result.success,
    };
  }

  if (request.params.name === 'git_diff') {
    const { directory, staged = false, nameOnly = false } = request.params.arguments;
    const command = `diff ${staged ? '--staged' : ''} ${nameOnly ? '--name-only' : ''}`;
    const result = await executeGitCommand(command, directory);
    
    return {
      content: [{
        type: 'text',
        text: result.success 
          ? `Git Diff:\n${result.stdout || 'No changes'}`
          : `Error: ${result.stderr}`,
      }],
      isError: !result.success,
    };
  }

  if (request.params.name === 'git_branch') {
    const { directory, all = false } = request.params.arguments;
    const command = all ? 'branch -a' : 'branch';
    const result = await executeGitCommand(command, directory);
    
    return {
      content: [{
        type: 'text',
        text: result.success 
          ? `Git Branches:\n${result.stdout}`
          : `Error: ${result.stderr}`,
      }],
      isError: !result.success,
    };
  }

  if (request.params.name === 'git_current_branch') {
    const { directory } = request.params.arguments;
    const result = await executeGitCommand('rev-parse --abbrev-ref HEAD', directory);
    
    return {
      content: [{
        type: 'text',
        text: result.success 
          ? result.stdout
          : `Error: ${result.stderr}`,
      }],
      isError: !result.success,
    };
  }

  if (request.params.name === 'git_remote') {
    const { directory } = request.params.arguments;
    const result = await executeGitCommand('remote -v', directory);
    
    return {
      content: [{
        type: 'text',
        text: result.success 
          ? `Git Remotes:\n${result.stdout || 'No remotes configured'}`
          : `Error: ${result.stderr}`,
      }],
      isError: !result.success,
    };
  }

  if (request.params.name === 'git_stash_list') {
    const { directory } = request.params.arguments;
    const result = await executeGitCommand('stash list', directory);
    
    return {
      content: [{
        type: 'text',
        text: result.success 
          ? `Git Stashes:\n${result.stdout || 'No stashes'}`
          : `Error: ${result.stderr}`,
      }],
      isError: !result.success,
    };
  }

  if (request.params.name === 'git_worktree_list') {
    const { directory } = request.params.arguments;
    const result = await executeGitCommand('worktree list', directory);
    
    return {
      content: [{
        type: 'text',
        text: result.success 
          ? `Git Worktrees:\n${result.stdout}`
          : `Error: ${result.stderr}`,
      }],
      isError: !result.success,
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// List available tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'git_status',
        description: 'Get git status of a repository',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Repository directory' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'git_log',
        description: 'Get git commit history',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Repository directory' },
            limit: { type: 'number', description: 'Number of commits to show (default: 10)' },
            format: { type: 'string', description: 'Log format (oneline, short, medium, full)' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'git_diff',
        description: 'Show git differences',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Repository directory' },
            staged: { type: 'boolean', description: 'Show staged changes' },
            nameOnly: { type: 'boolean', description: 'Show only file names' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'git_branch',
        description: 'List git branches',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Repository directory' },
            all: { type: 'boolean', description: 'Show all branches including remotes' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'git_current_branch',
        description: 'Get current git branch name',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Repository directory' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'git_remote',
        description: 'List git remotes',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Repository directory' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'git_stash_list',
        description: 'List git stashes',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Repository directory' },
          },
          required: ['directory'],
        },
      },
      {
        name: 'git_worktree_list',
        description: 'List git worktrees',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Repository directory' },
          },
          required: ['directory'],
        },
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Git Operations MCP server running on stdio');