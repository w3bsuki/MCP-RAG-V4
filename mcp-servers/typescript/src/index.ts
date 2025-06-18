#!/usr/bin/env node
/**
 * MCP-RAG-V4 TypeScript Server
 * Implements MCP protocol with strict type safety and security
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode,
  Tool,
  Resource,
  TextContent,
  ImageContent,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import winston from 'winston';
import jwt from 'jsonwebtoken';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import PQueue from 'p-queue';

// Import our modules
import { SecurityManager } from './security/SecurityManager.js';
import { RAGManager } from './rag/RAGManager.js';
import { AgentCoordinator } from './agents/AgentCoordinator.js';
import { createLogger } from './utils/logger.js';
import { validateToolInput } from './utils/validation.js';
import { config } from './config/index.js';

// Initialize logger
const logger = createLogger('mcp-server');

// Initialize server
const server = new Server(
  {
    name: 'mcp-rag-v4',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Initialize managers
const securityManager = new SecurityManager(config.security);
const ragManager = new RAGManager(config.rag);
const agentCoordinator = new AgentCoordinator(config.agents);

// Rate limiter
const rateLimiter = new RateLimiterMemory({
  points: config.rateLimit.points,
  duration: config.rateLimit.duration,
});

// Task queue for parallel processing
const taskQueue = new PQueue({ 
  concurrency: config.performance.maxConcurrentTasks,
  timeout: config.performance.taskTimeout,
});

// Tool schemas with comprehensive validation
const toolSchemas = {
  rag_search: z.object({
    query: z.string().min(1).max(500).describe('Search query'),
    collections: z.array(z.string()).optional().describe('Collections to search'),
    limit: z.number().int().min(1).max(20).default(5).describe('Maximum results'),
    includeMetadata: z.boolean().default(true).describe('Include document metadata'),
  }),
  
  agent_execute: z.object({
    task: z.string().min(1).max(1000).describe('Task description'),
    agentRole: z.enum(['frontend', 'backend', 'rag', 'testing', 'validator']).describe('Agent role'),
    context: z.record(z.any()).optional().describe('Additional context'),
    timeout: z.number().int().min(1000).max(300000).default(30000).describe('Timeout in milliseconds'),
  }),
  
  document_ingest: z.object({
    content: z.string().min(1).max(1000000).describe('Document content'),
    metadata: z.object({
      title: z.string(),
      source: z.string(),
      tags: z.array(z.string()),
      category: z.enum(['technical', 'reference', 'tutorial', 'api']),
    }).describe('Document metadata'),
    chunkingStrategy: z.enum(['document-aware', 'fixed', 'semantic']).default('document-aware'),
  }),
  
  security_scan: z.object({
    target: z.string().describe('Target to scan'),
    scanType: z.enum(['input-validation', 'dependencies', 'code', 'all']).default('all'),
    severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  }),
};

// Tool definitions
const tools: Tool[] = [
  {
    name: 'rag_search',
    description: 'Search documents using advanced RAG with hybrid search and reranking',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        collections: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Collections to search (optional)'
        },
        limit: { 
          type: 'number', 
          minimum: 1, 
          maximum: 20, 
          default: 5,
          description: 'Maximum results'
        },
        includeMetadata: {
          type: 'boolean',
          default: true,
          description: 'Include document metadata'
        }
      },
      required: ['query'],
    },
  },
  {
    name: 'agent_execute',
    description: 'Execute a task using the multi-agent orchestration system',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description' },
        agentRole: { 
          type: 'string',
          enum: ['frontend', 'backend', 'rag', 'testing', 'validator'],
          description: 'Agent role to execute task'
        },
        context: {
          type: 'object',
          description: 'Additional context for the task'
        },
        timeout: {
          type: 'number',
          minimum: 1000,
          maximum: 300000,
          default: 30000,
          description: 'Timeout in milliseconds'
        }
      },
      required: ['task', 'agentRole'],
    },
  },
  {
    name: 'document_ingest',
    description: 'Ingest documents into the RAG system with smart chunking',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Document content' },
        metadata: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            source: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            category: { 
              type: 'string',
              enum: ['technical', 'reference', 'tutorial', 'api']
            }
          },
          required: ['title', 'source', 'tags', 'category']
        },
        chunkingStrategy: {
          type: 'string',
          enum: ['document-aware', 'fixed', 'semantic'],
          default: 'document-aware'
        }
      },
      required: ['content', 'metadata'],
    },
  },
  {
    name: 'security_scan',
    description: 'Perform security scan on code or dependencies',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target to scan' },
        scanType: {
          type: 'string',
          enum: ['input-validation', 'dependencies', 'code', 'all'],
          default: 'all'
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium'
        }
      },
      required: ['target'],
    },
  },
];

// Middleware for authentication and rate limiting
async function authenticateRequest(request: any): Promise<string> {
  const authHeader = request.headers?.authorization;
  if (!authHeader) {
    throw new McpError(ErrorCode.Unauthorized, 'Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const clientId = await securityManager.validateToken(token);
  
  if (!clientId) {
    throw new McpError(ErrorCode.Unauthorized, 'Invalid token');
  }

  return clientId;
}

async function checkRateLimit(clientId: string): Promise<void> {
  try {
    await rateLimiter.consume(clientId);
  } catch (error) {
    throw new McpError(ErrorCode.TooManyRequests, 'Rate limit exceeded');
  }
}

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Authenticate
  const clientId = await authenticateRequest(request);
  await checkRateLimit(clientId);

  const { name, arguments: args } = request.params;
  
  logger.info('Tool call received', { 
    tool: name, 
    clientId,
    timestamp: new Date().toISOString() 
  });

  try {
    // Validate input
    const schema = toolSchemas[name as keyof typeof toolSchemas];
    if (!schema) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    const validatedArgs = await validateToolInput(schema, args);

    // Sanitize input to prevent injection attacks
    const sanitizedArgs = securityManager.sanitizeInput(validatedArgs);

    // Execute tool with proper error handling
    let result: TextContent | ImageContent;

    switch (name) {
      case 'rag_search':
        result = await executeRAGSearch(sanitizedArgs, clientId);
        break;
      
      case 'agent_execute':
        result = await executeAgentTask(sanitizedArgs, clientId);
        break;
      
      case 'document_ingest':
        result = await executeDocumentIngest(sanitizedArgs, clientId);
        break;
      
      case 'security_scan':
        result = await executeSecurityScan(sanitizedArgs, clientId);
        break;
      
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    // Log successful execution
    logger.info('Tool executed successfully', {
      tool: name,
      clientId,
      duration: Date.now() - request.timestamp,
    });

    return { content: [result] };

  } catch (error) {
    logger.error('Tool execution failed', {
      tool: name,
      clientId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

// Tool execution functions
async function executeRAGSearch(args: any, clientId: string): Promise<TextContent> {
  const { query, collections, limit, includeMetadata } = args;

  // Add to task queue for parallel processing
  const result = await taskQueue.add(async () => {
    // Perform hybrid search with reranking
    const searchResults = await ragManager.hybridSearch({
      query,
      collections,
      limit,
      includeMetadata,
    });

    return searchResults;
  });

  return {
    type: 'text',
    text: JSON.stringify(result, null, 2),
  };
}

async function executeAgentTask(args: any, clientId: string): Promise<TextContent> {
  const { task, agentRole, context, timeout } = args;

  // Submit task to agent coordinator
  const taskResult = await agentCoordinator.submitTask({
    description: task,
    agentRole,
    context,
    timeout,
    clientId,
  });

  // Wait for completion with timeout
  const result = await agentCoordinator.waitForCompletion(taskResult.taskId, timeout);

  return {
    type: 'text',
    text: JSON.stringify(result, null, 2),
  };
}

async function executeDocumentIngest(args: any, clientId: string): Promise<TextContent> {
  const { content, metadata, chunkingStrategy } = args;

  // Ingest document with smart chunking
  const ingestResult = await ragManager.ingestDocument({
    content,
    metadata,
    chunkingStrategy,
    clientId,
  });

  return {
    type: 'text',
    text: JSON.stringify({
      success: true,
      documentId: ingestResult.documentId,
      chunks: ingestResult.chunks.length,
      message: 'Document ingested successfully',
    }, null, 2),
  };
}

async function executeSecurityScan(args: any, clientId: string): Promise<TextContent> {
  const { target, scanType, severity } = args;

  // Perform security scan
  const scanResult = await securityManager.performScan({
    target,
    scanType,
    severity,
    clientId,
  });

  return {
    type: 'text',
    text: JSON.stringify(scanResult, null, 2),
  };
}

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Resource handlers
const resources: Resource[] = [
  {
    uri: 'rag://knowledge-base',
    name: 'RAG Knowledge Base',
    description: 'Access to the vector knowledge base',
    mimeType: 'application/json',
  },
  {
    uri: 'agent://orchestrator',
    name: 'Agent Orchestrator',
    description: 'Multi-agent task coordination system',
    mimeType: 'application/json',
  },
];

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'rag://knowledge-base':
      const stats = await ragManager.getStats();
      return {
        contents: [{
          type: 'text',
          text: JSON.stringify(stats, null, 2),
        }],
      };
    
    case 'agent://orchestrator':
      const agentStatus = await agentCoordinator.getStatus();
      return {
        contents: [{
          type: 'text',
          text: JSON.stringify(agentStatus, null, 2),
        }],
      };
    
    default:
      throw new McpError(ErrorCode.ResourceNotFound, `Resource not found: ${uri}`);
  }
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down server...');
  
  // Stop accepting new tasks
  taskQueue.pause();
  
  // Wait for pending tasks
  await taskQueue.onIdle();
  
  // Close connections
  await ragManager.close();
  await agentCoordinator.close();
  
  logger.info('Server shutdown complete');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Main function
async function main() {
  logger.info('Starting MCP-RAG-V4 TypeScript server...');
  
  // Initialize components
  await securityManager.initialize();
  await ragManager.initialize();
  await agentCoordinator.initialize();
  
  // Create transport
  const transport = new StdioServerTransport();
  
  // Connect and run server
  await server.connect(transport);
  
  logger.info('MCP-RAG-V4 server started successfully');
  
  // Keep process alive
  process.stdin.resume();
}

// Start server
main().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});