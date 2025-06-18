#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, writeFile, readdir, mkdir, access } from "fs/promises";
import { join } from "path";
import { constants } from "fs";

// Simple agent coordination server following MCP best practices
const server = new McpServer({
  name: "mcp-rag-agent-server",
  version: "1.0.0",
  description: "MCP server for multi-agent coordination with task management and pattern storage"
});

// Define paths
const COORDINATION_PATH = join(process.cwd(), "coordination");
const TASKS_PATH = join(COORDINATION_PATH, "ACTIVE_TASKS.json");
const PATTERNS_PATH = join(COORDINATION_PATH, "patterns");

// Ensure directories exist
async function ensureDirectories() {
  try {
    await access(PATTERNS_PATH, constants.F_OK);
  } catch {
    await mkdir(PATTERNS_PATH, { recursive: true });
  }
}

// TOOL 1: Get current tasks
server.tool(
  "get_tasks",
  {}, // No parameters needed
  async () => {
    try {
      const content = await readFile(TASKS_PATH, "utf-8");
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Could not read tasks file" }) }]
      };
    }
  },
  {
    description: "Get the current task list from ACTIVE_TASKS.json"
  }
);

// TOOL 2: Update task status
server.tool(
  "update_task",
  {
    taskId: z.string().describe("The task ID to update"),
    status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "BLOCKED"]),
    notes: z.string().optional().describe("Additional notes or verification")
  },
  async ({ taskId, status, notes }) => {
    try {
      const content = await readFile(TASKS_PATH, "utf-8");
      const data = JSON.parse(content);
      
      // Find and update the task
      let updated = false;
      if (data.tasks) {
        for (const task of data.tasks) {
          if (task.id === taskId) {
            task.status = status;
            task.updated = new Date().toISOString();
            if (notes) {
              task.notes = notes;
            }
            updated = true;
            break;
          }
        }
      }
      
      if (updated) {
        await writeFile(TASKS_PATH, JSON.stringify(data, null, 2));
        return {
          content: [{ type: "text", text: `Task ${taskId} updated to ${status}` }]
        };
      } else {
        return {
          content: [{ type: "text", text: `Task ${taskId} not found` }]
        };
      }
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error updating task: ${error.message}` }]
      };
    }
  },
  {
    description: "Update the status of a task in ACTIVE_TASKS.json"
  }
);

// TOOL 3: Store a successful pattern
server.tool(
  "store_pattern",
  {
    name: z.string().describe("Name of the pattern"),
    description: z.string().describe("What this pattern does"),
    code: z.string().describe("The actual code or configuration"),
    tags: z.array(z.string()).describe("Tags for searching")
  },
  async ({ name, description, code, tags }) => {
    try {
      const pattern = {
        id: `pattern-${Date.now()}`,
        name,
        description,
        code,
        tags,
        created: new Date().toISOString(),
        agent: process.env.AGENT_NAME || "unknown"
      };
      
      const filename = `${pattern.id}.json`;
      await writeFile(
        join(PATTERNS_PATH, filename),
        JSON.stringify(pattern, null, 2)
      );
      
      return {
        content: [{ type: "text", text: `Pattern stored: ${pattern.id}` }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error storing pattern: ${error.message}` }]
      };
    }
  },
  {
    description: "Store a successful implementation pattern for future reuse"
  }
);

// TOOL 4: Search patterns
server.tool(
  "search_patterns",
  {
    query: z.string().describe("Search query"),
    tags: z.array(z.string()).optional().describe("Filter by tags")
  },
  async ({ query, tags }) => {
    try {
      const files = await readdir(PATTERNS_PATH);
      const patterns = [];
      
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = await readFile(join(PATTERNS_PATH, file), "utf-8");
          const pattern = JSON.parse(content);
          
          // Simple search logic
          const matchesQuery = 
            pattern.name.toLowerCase().includes(query.toLowerCase()) ||
            pattern.description.toLowerCase().includes(query.toLowerCase());
          
          const matchesTags = !tags || tags.some(tag => 
            pattern.tags.includes(tag)
          );
          
          if (matchesQuery && matchesTags) {
            patterns.push(pattern);
          }
        }
      }
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(patterns, null, 2) 
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error searching patterns: ${error.message}` }]
      };
    }
  },
  {
    description: "Search for previously stored patterns"
  }
);

// TOOL 5: Verify task completion (simple version)
server.tool(
  "verify_completion",
  {
    projectPath: z.string().describe("Path to the project"),
    checks: z.array(z.enum(["npm_installed", "tests_pass", "server_runs"]))
  },
  async ({ projectPath, checks }) => {
    const results = {};
    
    for (const check of checks) {
      switch (check) {
        case "npm_installed":
          try {
            await access(join(projectPath, "node_modules"), constants.F_OK);
            results[check] = true;
          } catch {
            results[check] = false;
          }
          break;
          
        case "tests_pass":
          // Simple check - would need actual test runner integration
          results[check] = "not_implemented";
          break;
          
        case "server_runs":
          // Simple check - would need actual server check
          results[check] = "not_implemented";
          break;
      }
    }
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          projectPath,
          timestamp: new Date().toISOString(),
          results
        }, null, 2)
      }]
    };
  },
  {
    description: "Verify that work is actually completed"
  }
);

// RESOURCE: View patterns
server.resource(
  "patterns",
  "List all stored patterns",
  async () => {
    try {
      const files = await readdir(PATTERNS_PATH);
      const patterns = [];
      
      for (const file of files) {
        if (file.endsWith(".json")) {
          patterns.push({
            uri: `pattern://${file}`,
            name: file,
            mimeType: "application/json"
          });
        }
      }
      
      return { resources: patterns };
    } catch {
      return { resources: [] };
    }
  }
);

// PROMPT: Agent coordination prompt
server.prompt(
  "coordinate",
  {
    agent: z.enum(["architect", "builder", "validator"]).describe("Which agent role")
  },
  async ({ agent }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are the ${agent} agent. Check tasks with get_tasks(), update your progress with update_task(), and use search_patterns() before implementing new solutions.`
        }
      }
    ]
  }),
  {
    description: "Prompt for agent coordination"
  }
);

// Main server startup
async function main() {
  await ensureDirectories();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("MCP Agent Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});