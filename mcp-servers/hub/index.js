import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, 'registry.json');

// Initialize registry
const defaultRegistry = {
  servers: {
    filesystem: {
      name: 'filesystem-server',
      status: 'available',
      tools: ['read_file', 'write_file', 'list_directory', 'delete_file'],
      lastPing: null,
    },
    'knowledge-base': {
      name: 'knowledge-base-server',
      status: 'available',
      tools: ['store_knowledge', 'search_knowledge', 'get_categories'],
      lastPing: null,
    },
    'testing-tools': {
      name: 'testing-tools-server',
      status: 'available',
      tools: ['run_tests', 'check_coverage', 'lint_code', 'validate_types', 'benchmark'],
      lastPing: null,
    },
    'git-operations': {
      name: 'git-operations-server',
      status: 'available',
      tools: ['git_status', 'git_log', 'git_diff', 'git_branch', 'git_current_branch', 'git_remote', 'git_stash_list', 'git_worktree_list'],
      lastPing: null,
    },
  },
  metrics: {
    totalRequests: 0,
    requestsByServer: {},
    errors: [],
  },
};

// Load or create registry
let registry;
try {
  const data = await fs.readFile(REGISTRY_PATH, 'utf-8');
  registry = JSON.parse(data);
} catch {
  registry = defaultRegistry;
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

const server = new Server({
  name: 'hub-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Save registry helper
async function saveRegistry() {
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

// Hub operations handler
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'list_servers') {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(registry.servers, null, 2),
      }],
    };
  }

  if (request.params.name === 'server_status') {
    const { serverName } = request.params.arguments;
    const serverInfo = registry.servers[serverName];
    
    if (!serverInfo) {
      return {
        content: [{
          type: 'text',
          text: `Server not found: ${serverName}`,
        }],
        isError: true,
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(serverInfo, null, 2),
      }],
    };
  }

  if (request.params.name === 'find_tool') {
    const { toolName } = request.params.arguments;
    const servers = [];
    
    for (const [key, server] of Object.entries(registry.servers)) {
      if (server.tools.includes(toolName)) {
        servers.push({
          server: key,
          ...server,
        });
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: servers.length > 0 
          ? JSON.stringify(servers, null, 2)
          : `No server found for tool: ${toolName}`,
      }],
    };
  }

  if (request.params.name === 'get_metrics') {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(registry.metrics, null, 2),
      }],
    };
  }

  if (request.params.name === 'record_request') {
    const { serverName, success = true, error = null } = request.params.arguments;
    
    registry.metrics.totalRequests++;
    registry.metrics.requestsByServer[serverName] = 
      (registry.metrics.requestsByServer[serverName] || 0) + 1;
    
    if (!success && error) {
      registry.metrics.errors.push({
        server: serverName,
        error,
        timestamp: new Date().toISOString(),
      });
      
      // Keep only last 100 errors
      if (registry.metrics.errors.length > 100) {
        registry.metrics.errors = registry.metrics.errors.slice(-100);
      }
    }
    
    await saveRegistry();
    
    return {
      content: [{
        type: 'text',
        text: 'Request recorded successfully',
      }],
    };
  }

  if (request.params.name === 'health_check') {
    const healthStatus = {
      hub: 'healthy',
      servers: {},
      timestamp: new Date().toISOString(),
    };
    
    for (const [key, server] of Object.entries(registry.servers)) {
      healthStatus.servers[key] = {
        status: server.status,
        lastPing: server.lastPing,
        toolCount: server.tools.length,
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(healthStatus, null, 2),
      }],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// List available tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'list_servers',
        description: 'List all available MCP servers',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'server_status',
        description: 'Get status of a specific server',
        inputSchema: {
          type: 'object',
          properties: {
            serverName: { type: 'string', description: 'Name of the server' },
          },
          required: ['serverName'],
        },
      },
      {
        name: 'find_tool',
        description: 'Find which server provides a specific tool',
        inputSchema: {
          type: 'object',
          properties: {
            toolName: { type: 'string', description: 'Name of the tool to find' },
          },
          required: ['toolName'],
        },
      },
      {
        name: 'get_metrics',
        description: 'Get hub metrics and statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'record_request',
        description: 'Record a request for metrics',
        inputSchema: {
          type: 'object',
          properties: {
            serverName: { type: 'string', description: 'Server that handled the request' },
            success: { type: 'boolean', description: 'Whether the request succeeded' },
            error: { type: 'string', description: 'Error message if failed' },
          },
          required: ['serverName'],
        },
      },
      {
        name: 'health_check',
        description: 'Perform health check on all servers',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Hub MCP server running on stdio');