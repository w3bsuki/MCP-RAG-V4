// Inter-agent communication bridge
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import WebSocket from "ws";

class BridgeServer {
  private server: Server;
  private ws: WebSocket | null = null;
  private agentName: string;
  private messageQueue: any[] = [];

  constructor(server: Server, agentName: string) {
    this.server = server;
    this.agentName = agentName;
  }

  async initialize() {
    // Connect to central hub
    this.connectToHub();

    // Set up MCP tools for communication
    this.server.setRequestHandler("tools/list", async () => ({
      tools: [
        {
          name: "send_to_agent",
          description: "Send message to another agent",
          inputSchema: {
            type: "object",
            properties: {
              to: { type: "string", enum: ["architect", "builder", "validator", "orchestrator", "all"] },
              message: { type: "string" },
              context: { type: "object" }
            },
            required: ["to", "message"]
          }
        },
        {
          name: "request_from_agent",
          description: "Request information from another agent",
          inputSchema: {
            type: "object",
            properties: {
              from: { type: "string", enum: ["architect", "builder", "validator", "orchestrator"] },
              request: { type: "string" },
              timeout: { type: "number", default: 30000 }
            },
            required: ["from", "request"]
          }
        },
        {
          name: "broadcast_status",
          description: "Broadcast current status to all agents",
          inputSchema: {
            type: "object",
            properties: {
              status: { type: "string" },
              details: { type: "object" }
            },
            required: ["status"]
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case "send_to_agent":
          return await this.sendToAgent(args);
        case "request_from_agent":
          return await this.requestFromAgent(args);
        case "broadcast_status":
          return await this.broadcastStatus(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private connectToHub() {
    try {
      this.ws = new WebSocket("ws://localhost:8765");
      
      this.ws.on("open", () => {
        console.error(`Bridge connected for agent: ${this.agentName}`);
        this.ws?.send(JSON.stringify({
          type: "register",
          agent: this.agentName
        }));
        
        // Send any queued messages
        this.messageQueue.forEach(msg => this.ws?.send(JSON.stringify(msg)));
        this.messageQueue = [];
      });

      this.ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        this.handleIncomingMessage(message);
      });

      this.ws.on("close", () => {
        console.error(`Bridge disconnected for agent: ${this.agentName}`);
        // Attempt reconnection after 5 seconds
        setTimeout(() => this.connectToHub(), 5000);
      });

      this.ws.on("error", (error) => {
        console.error(`Bridge error for agent ${this.agentName}:`, error);
      });
    } catch (error) {
      console.error(`Failed to connect to hub:`, error);
      // Retry connection after 5 seconds
      setTimeout(() => this.connectToHub(), 5000);
    }
  }

  private async sendToAgent(args: any) {
    const message = {
      type: "message",
      from: this.agentName,
      to: args.to,
      message: args.message,
      context: args.context || {},
      timestamp: new Date().toISOString()
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          sent: message,
          queued: this.ws?.readyState !== WebSocket.OPEN
        }, null, 2)
      }]
    };
  }

  private async requestFromAgent(args: any) {
    const requestId = `${this.agentName}-${Date.now()}`;
    const request = {
      type: "request",
      id: requestId,
      from: this.agentName,
      to: args.from,
      request: args.request,
      timestamp: new Date().toISOString()
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(request));
    } else {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: "Not connected to hub"
          }, null, 2)
        }]
      };
    }

    // Wait for response (with timeout)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Request timeout",
              requestId
            }, null, 2)
          }]
        });
      }, args.timeout || 30000);

      // Store resolver for when response arrives
      // This would be handled by handleIncomingMessage
    });
  }

  private async broadcastStatus(args: any) {
    const broadcast = {
      type: "broadcast",
      from: this.agentName,
      status: args.status,
      details: args.details || {},
      timestamp: new Date().toISOString()
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(broadcast));
    } else {
      this.messageQueue.push(broadcast);
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          broadcast,
          queued: this.ws?.readyState !== WebSocket.OPEN
        }, null, 2)
      }]
    };
  }

  private handleIncomingMessage(message: any) {
    // This would be extended to handle various message types
    console.error(`Received message for ${this.agentName}:`, message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let agentName = "unknown";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--agent" && i + 1 < args.length) {
    agentName = args[i + 1];
    break;
  }
}

// Initialize and start server
const transport = new StdioServerTransport();
const server = new Server(
  {
    name: `bridge-server-${agentName}`,
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const bridgeServer = new BridgeServer(server, agentName);
bridgeServer.initialize().then(() => {
  server.connect(transport);
  console.error(`Bridge server started for agent: ${agentName}`);
});