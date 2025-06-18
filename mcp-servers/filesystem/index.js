import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { promises as fs } from 'fs';
import path from 'path';

const server = new Server({
  name: 'filesystem-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Read file tool
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'read_file') {
    const { path: filePath } = request.params.arguments;
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        content: [{
          type: 'text',
          text: content,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error reading file: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  if (request.params.name === 'write_file') {
    const { path: filePath, content } = request.params.arguments;
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      return {
        content: [{
          type: 'text',
          text: `File written successfully: ${filePath}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error writing file: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  if (request.params.name === 'list_directory') {
    const { path: dirPath } = request.params.arguments;
    try {
      const files = await fs.readdir(dirPath);
      return {
        content: [{
          type: 'text',
          text: files.join('\n'),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error listing directory: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  if (request.params.name === 'delete_file') {
    const { path: filePath } = request.params.arguments;
    try {
      await fs.unlink(filePath);
      return {
        content: [{
          type: 'text',
          text: `File deleted successfully: ${filePath}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error deleting file: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// List available tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'read_file',
        description: 'Read contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' },
            content: { type: 'string', description: 'Content to write' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'list_directory',
        description: 'List files in a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the directory' },
          },
          required: ['path'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' },
          },
          required: ['path'],
        },
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Filesystem MCP server running on stdio');