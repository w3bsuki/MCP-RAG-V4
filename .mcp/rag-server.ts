// Enhanced RAG server with vector search
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ChromaClient } from "chromadb";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

class RagServer {
  private server: Server;
  private chroma: ChromaClient;
  private collection: any;

  async initialize() {
    // Initialize vector DB
    this.chroma = new ChromaClient();
    this.collection = await this.chroma.getOrCreateCollection({
      name: "mcp_rag_patterns"
    });

    // Load existing patterns from memory-bank
    await this.loadExistingPatterns();

    // Set up MCP tools
    this.server.setRequestHandler("tools/list", async () => ({
      tools: [
        {
          name: "rag_query",
          description: "Search for patterns and solutions",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              tags: { type: "array", items: { type: "string" } }
            }
          }
        },
        {
          name: "rag_store",
          description: "Store successful pattern",
          inputSchema: {
            type: "object",
            properties: {
              pattern: { type: "string" },
              description: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              code: { type: "string" }
            }
          }
        }
      ]
    }));
  }

  private async loadExistingPatterns() {
    const memoryBankPath = join(process.cwd(), "coordination", "memory-bank");
    const files = await readdir(memoryBankPath);
    
    for (const file of files) {
      if (file.endsWith(".json")) {
        const content = await readFile(join(memoryBankPath, file), "utf-8");
        const pattern = JSON.parse(content);
        
        // Add to vector DB
        await this.collection.add({
          ids: [pattern.id],
          documents: [pattern.content],
          metadatas: [{ tags: pattern.tags.join(","), agent: pattern.agentId }]
        });
      }
    }
  }
}

// Initialize and start server
const ragServer = new RagServer();
const transport = new StdioServerTransport();
const server = new Server(
  {
    name: "enhanced-mcp-rag-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

ragServer.initialize().then(() => {
  server.connect(transport);
  console.error("RAG server started");
});