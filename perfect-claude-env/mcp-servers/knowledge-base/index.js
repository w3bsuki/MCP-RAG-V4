import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_PATH = path.join(__dirname, 'knowledge');

// Initialize knowledge base directory
await fs.mkdir(KB_PATH, { recursive: true });

const server = new Server({
  name: 'knowledge-base-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Store knowledge tool
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'store_knowledge') {
    const { category, title, content, tags = [] } = request.params.arguments;
    try {
      const categoryPath = path.join(KB_PATH, category);
      await fs.mkdir(categoryPath, { recursive: true });
      
      const fileName = `${Date.now()}-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
      const filePath = path.join(categoryPath, fileName);
      
      const knowledge = {
        id: fileName,
        category,
        title,
        content,
        tags,
        createdAt: new Date().toISOString(),
      };
      
      await fs.writeFile(filePath, JSON.stringify(knowledge, null, 2));
      
      return {
        content: [{
          type: 'text',
          text: `Knowledge stored successfully: ${fileName}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error storing knowledge: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  if (request.params.name === 'search_knowledge') {
    const { query, category, tags = [] } = request.params.arguments;
    try {
      const results = [];
      const searchPath = category ? path.join(KB_PATH, category) : KB_PATH;
      
      async function searchDir(dirPath) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            await searchDir(fullPath);
          } else if (entry.name.endsWith('.json')) {
            const content = await fs.readFile(fullPath, 'utf-8');
            const knowledge = JSON.parse(content);
            
            // Simple search logic
            const matchesQuery = !query || 
              knowledge.title.toLowerCase().includes(query.toLowerCase()) ||
              knowledge.content.toLowerCase().includes(query.toLowerCase());
            
            const matchesTags = tags.length === 0 || 
              tags.some(tag => knowledge.tags.includes(tag));
            
            if (matchesQuery && matchesTags) {
              results.push(knowledge);
            }
          }
        }
      }
      
      await searchDir(searchPath);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error searching knowledge: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  if (request.params.name === 'get_categories') {
    try {
      const entries = await fs.readdir(KB_PATH, { withFileTypes: true });
      const categories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
      
      return {
        content: [{
          type: 'text',
          text: categories.join('\n'),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error getting categories: ${error.message}`,
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
        name: 'store_knowledge',
        description: 'Store knowledge in the knowledge base',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Category for the knowledge' },
            title: { type: 'string', description: 'Title of the knowledge' },
            content: { type: 'string', description: 'Content of the knowledge' },
            tags: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Tags for categorization' 
            },
          },
          required: ['category', 'title', 'content'],
        },
      },
      {
        name: 'search_knowledge',
        description: 'Search the knowledge base',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            category: { type: 'string', description: 'Filter by category' },
            tags: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Filter by tags' 
            },
          },
        },
      },
      {
        name: 'get_categories',
        description: 'Get all knowledge categories',
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
console.error('Knowledge Base MCP server running on stdio');