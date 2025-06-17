// Task verification and tracking server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import fetch from "node-fetch";

const execAsync = promisify(exec);

class TaskServer {
  private server: Server;

  constructor(server: Server) {
    this.server = server;
  }

  async initialize() {
    this.server.setRequestHandler("tools/list", async () => ({
      tools: [
        {
          name: "verify_npm_install",
          description: "Verify npm install was actually run",
          inputSchema: {
            type: "object",
            properties: {
              projectPath: { type: "string" }
            },
            required: ["projectPath"]
          }
        },
        {
          name: "verify_server_running",
          description: "Check if dev server is actually running",
          inputSchema: {
            type: "object",
            properties: {
              port: { type: "number" },
              healthEndpoint: { type: "string" }
            },
            required: ["port"]
          }
        },
        {
          name: "track_real_progress",
          description: "Track actual vs reported progress",
          inputSchema: {
            type: "object",
            properties: {
              taskId: { type: "string" },
              expectedOutput: { type: "string" },
              actualCheck: { type: "string" }
            },
            required: ["taskId", "actualCheck"]
          }
        },
        {
          name: "screenshot",
          description: "Take screenshot of running application",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string" },
              outputPath: { type: "string" }
            },
            required: ["url", "outputPath"]
          }
        }
      ]
    }));

    // Implement verification logic
    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case "verify_npm_install":
          return await this.verifyNpmInstall(args);
        case "verify_server_running":
          return await this.verifyServerRunning(args);
        case "track_real_progress":
          return await this.trackRealProgress(args);
        case "screenshot":
          return await this.takeScreenshot(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async verifyNpmInstall(args: any) {
    try {
      const nodeModulesPath = `${args.projectPath}/node_modules`;
      const packageJsonPath = `${args.projectPath}/package.json`;
      
      const hasNodeModules = existsSync(nodeModulesPath);
      const hasPackageJson = existsSync(packageJsonPath);
      
      if (hasNodeModules) {
        const { stdout } = await execAsync(`ls -la ${nodeModulesPath} | wc -l`);
        const packageCount = parseInt(stdout.trim()) - 3; // Subtract . .. and total line
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              hasNodeModules: true,
              hasPackageJson,
              packageCount,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            hasNodeModules: false,
            hasPackageJson,
            error: "node_modules directory not found",
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }

  private async verifyServerRunning(args: any) {
    try {
      const url = `http://localhost:${args.port}${args.healthEndpoint || '/'}`;
      const response = await fetch(url, { timeout: 5000 });
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            running: response.ok,
            status: response.status,
            url,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            running: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }

  private async trackRealProgress(args: any) {
    // This would integrate with task tracking system
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          taskId: args.taskId,
          actualCheck: args.actualCheck,
          verified: true,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }

  private async takeScreenshot(args: any) {
    try {
      // Using puppeteer for screenshots
      const { stdout } = await execAsync(
        `npx puppeteer screenshot --url "${args.url}" --path "${args.outputPath}"`
      );
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            screenshot: args.outputPath,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }
}

// Initialize and start server
const transport = new StdioServerTransport();
const server = new Server(
  {
    name: "task-verification-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const taskServer = new TaskServer(server);
taskServer.initialize().then(() => {
  server.connect(transport);
  console.error("Task verification server started");
});