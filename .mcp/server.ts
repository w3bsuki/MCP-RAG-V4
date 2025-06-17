#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

// Simple in-memory storage for development (replace with Milvus in production)
interface MemoryItem {
  id: string;
  content: string;
  description: string;
  tags: string[];
  agentId: string;
  embedding: number[];
  timestamp: number;
}

const memoryStore: MemoryItem[] = [];

// Configuration
const EMBEDDING_DIM = 384; // Smaller for development

// Helper functions
function generateEmbedding(text: string): number[] {
  const hash = crypto.createHash('sha256').update(text).digest();
  const embedding = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    embedding[i] = (hash[i % hash.length] / 255.0) * 2 - 1;
  }
  return embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function ensureDirectories() {
  const dirs = [
    path.join(process.cwd(), "coordination"),
    path.join(process.cwd(), "coordination", "memory-bank")
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Main server
async function main() {
  console.log("Starting MCP RAG Server...");
  
  await ensureDirectories();
  
  const server = new Server(
    {
      name: "mcp-rag-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "rag_search",
          description: "Search project memory for patterns and solutions",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query"
              },
              limit: {
                type: "number",
                description: "Maximum results (default: 5)"
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Filter by tags"
              }
            },
            required: ["query"]
          }
        },
        {
          name: "rag_upsert",
          description: "Store patterns and solutions in memory",
          inputSchema: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "Content to store"
              },
              description: {
                type: "string",
                description: "Brief description"
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Tags for categorization"
              },
              agentId: {
                type: "string",
                description: "Agent identifier"
              }
            },
            required: ["content", "description", "tags", "agentId"]
          }
        },
        {
          name: "rag_get_context",
          description: "Get full project context",
          inputSchema: {
            type: "object",
            properties: {
              scope: {
                type: "string",
                enum: ["all", "recent", "agent"],
                description: "Context scope"
              },
              agentId: {
                type: "string",
                description: "Filter by agent"
              },
              limit: {
                type: "number",
                description: "Max memories to return"
              }
            }
          }
        },
        {
          name: "sync_project_state",
          description: "Update coordination documents",
          inputSchema: {
            type: "object",
            properties: {
              documentType: {
                type: "string",
                enum: ["project_plan", "task_board", "progress_log"],
                description: "Document to update"
              },
              content: {
                type: "string",
                description: "New content"
              },
              agentId: {
                type: "string",
                description: "Agent making update"
              }
            },
            required: ["documentType", "content", "agentId"]
          }
        }
      ]
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "rag_search": {
        const query = args.query as string;
        const limit = (args.limit as number) || 5;
        const tags = args.tags as string[] | undefined;
        
        const queryEmbedding = generateEmbedding(query);
        
        // Search in memory
        let results = memoryStore.map(item => ({
          ...item,
          score: cosineSimilarity(queryEmbedding, item.embedding)
        }));
        
        // Filter by tags if provided
        if (tags && tags.length > 0) {
          results = results.filter(item => 
            item.tags.some(tag => tags.includes(tag))
          );
        }
        
        // Sort by score and limit
        results.sort((a, b) => b.score - a.score);
        results = results.slice(0, limit);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                results: results.map(({ embedding, ...rest }) => rest)
              }, null, 2)
            }
          ]
        };
      }

      case "rag_upsert": {
        const content = args.content as string;
        const description = args.description as string;
        const tags = args.tags as string[];
        const agentId = args.agentId as string;
        
        const id = crypto.randomUUID();
        const embedding = generateEmbedding(content);
        const timestamp = Date.now();
        
        // Store in memory
        const item: MemoryItem = {
          id,
          content,
          description,
          tags,
          agentId,
          embedding,
          timestamp
        };
        
        memoryStore.push(item);
        
        // Also persist to file
        const memoryDir = path.join(process.cwd(), "coordination", "memory-bank");
        const fileName = `${agentId}-${timestamp}.json`;
        await fs.writeFile(
          path.join(memoryDir, fileName),
          JSON.stringify({
            id,
            content,
            description,
            tags,
            agentId,
            timestamp: new Date(timestamp).toISOString()
          }, null, 2)
        );
        
        return {
          content: [
            {
              type: "text",
              text: "Pattern successfully stored in project memory"
            }
          ]
        };
      }

      case "rag_get_context": {
        const scope = (args.scope as string) || "all";
        const agentId = args.agentId as string | undefined;
        const limit = (args.limit as number) || 20;
        
        // Read coordination documents
        const coordinationDir = path.join(process.cwd(), "coordination");
        
        let projectPlan = "";
        let taskBoard = {};
        
        try {
          projectPlan = await fs.readFile(
            path.join(coordinationDir, "PROJECT_PLAN.md"),
            "utf-8"
          );
        } catch (e) {
          projectPlan = "# Project Plan\n\nNo plan created yet.";
        }
        
        try {
          const taskBoardContent = await fs.readFile(
            path.join(coordinationDir, "task-board.json"),
            "utf-8"
          );
          taskBoard = JSON.parse(taskBoardContent);
        } catch (e) {
          taskBoard = { tasks: [] };
        }
        
        // Get memories based on scope
        let memories = [...memoryStore];
        
        if (scope === "agent" && agentId) {
          memories = memories.filter(m => m.agentId === agentId);
        } else if (scope === "recent") {
          memories.sort((a, b) => b.timestamp - a.timestamp);
        }
        
        memories = memories.slice(0, limit);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                projectPlan,
                taskBoard,
                memories: memories.map(({ embedding, ...rest }) => rest),
                scope,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      }

      case "sync_project_state": {
        const documentType = args.documentType as string;
        const content = args.content as string;
        const agentId = args.agentId as string;
        
        const coordinationDir = path.join(process.cwd(), "coordination");
        
        const fileMap: Record<string, string> = {
          project_plan: "PROJECT_PLAN.md",
          task_board: "task-board.json",
          progress_log: "progress-log.md"
        };
        
        const fileName = fileMap[documentType];
        if (!fileName) {
          throw new Error(`Unknown document type: ${documentType}`);
        }
        
        const filePath = path.join(coordinationDir, fileName);
        
        if (documentType === "progress_log") {
          // Append to progress log
          const timestamp = new Date().toISOString();
          const entry = `\n\n## ${timestamp} - ${agentId}\n${content}`;
          await fs.appendFile(filePath, entry);
        } else {
          // Overwrite other documents
          await fs.writeFile(filePath, content);
        }
        
        return {
          content: [
            {
              type: "text",
              text: `Successfully updated ${fileName}`
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // Create transport
  const transport = new StdioServerTransport();
  
  // Connect
  await server.connect(transport);
  console.log("MCP RAG Server is running");
}

// Error handling
process.on("SIGINT", () => {
  console.log("\nShutting down MCP RAG Server...");
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

// Start server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});