// Main orchestration logic
import { spawn, ChildProcess } from "child_process";
import { WebSocketServer, WebSocket } from "ws";
import { readFile } from "fs/promises";
import { join } from "path";
import { parse } from "yaml";

interface Agent {
  name: string;
  process?: ChildProcess;
  config: any;
  connection?: WebSocket;
}

class Orchestrator {
  private agents: Map<string, Agent> = new Map();
  private wss: WebSocketServer;
  private config: any;
  private connections: Map<string, WebSocket> = new Map();

  async initialize() {
    // Load configuration
    await this.loadConfig();
    
    // Start WebSocket server for agent communication
    this.wss = new WebSocketServer({ port: 8765 });
    console.log("Orchestrator WebSocket server started on port 8765");
    
    this.wss.on("connection", (ws) => {
      ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        this.handleAgentMessage(message, ws);
      });

      ws.on("close", () => {
        // Remove connection
        for (const [agent, connection] of this.connections.entries()) {
          if (connection === ws) {
            this.connections.delete(agent);
            console.log(`Agent disconnected: ${agent}`);
            break;
          }
        }
      });
    });

    // Start monitoring task progress
    this.startTaskMonitoring();
  }

  private async loadConfig() {
    const configPath = join(process.cwd(), ".swarm", "config.yaml");
    const configContent = await readFile(configPath, "utf-8");
    this.config = parse(configContent);
  }

  private handleAgentMessage(message: any, ws: WebSocket) {
    console.log(`Received message:`, message);
    
    switch (message.type) {
      case "register":
        this.connections.set(message.agent, ws);
        console.log(`Agent registered: ${message.agent}`);
        break;
        
      case "message":
        this.routeMessage(message);
        break;
        
      case "request":
        this.handleRequest(message);
        break;
        
      case "task_complete":
        this.verifyTaskCompletion(message);
        break;
        
      case "broadcast":
        this.broadcastToAgents(message);
        break;
    }
  }

  private routeMessage(message: any) {
    if (message.to === "all") {
      // Broadcast to all agents except sender
      for (const [agent, connection] of this.connections.entries()) {
        if (agent !== message.from) {
          connection.send(JSON.stringify({
            ...message,
            routed: true,
            routedAt: new Date().toISOString()
          }));
        }
      }
    } else {
      // Route to specific agent
      const targetConnection = this.connections.get(message.to);
      if (targetConnection) {
        targetConnection.send(JSON.stringify({
          ...message,
          routed: true,
          routedAt: new Date().toISOString()
        }));
      } else {
        console.log(`Target agent not connected: ${message.to}`);
      }
    }
  }

  private handleRequest(request: any) {
    // Route request to target agent
    const targetConnection = this.connections.get(request.to);
    if (targetConnection) {
      targetConnection.send(JSON.stringify({
        ...request,
        needsResponse: true
      }));
    }
  }

  private async verifyTaskCompletion(message: any) {
    console.log(`Verifying task completion from ${message.agent}:`, message.taskId);
    
    // This would integrate with task-server to verify actual completion
    // For now, just log
    console.log(`Task ${message.taskId} marked as complete by ${message.agent}`);
  }

  private broadcastToAgents(message: any) {
    for (const [agent, connection] of this.connections.entries()) {
      if (agent !== message.from) {
        connection.send(JSON.stringify(message));
      }
    }
  }

  private async startTaskMonitoring() {
    // Monitor ACTIVE_TASKS.json for changes
    setInterval(async () => {
      try {
        const tasksPath = join(process.cwd(), "coordination", "ACTIVE_TASKS.json");
        const tasksContent = await readFile(tasksPath, "utf-8");
        const tasks = JSON.parse(tasksContent);
        
        // Check for unassigned tasks
        const unassignedTasks = tasks.tasks.filter((t: any) => 
          t.status === "TODO" && !t.assigned
        );
        
        if (unassignedTasks.length > 0) {
          console.log(`Found ${unassignedTasks.length} unassigned tasks`);
          // This would trigger task assignment logic
        }
      } catch (error) {
        // Tasks file might not exist yet
      }
    }, 5000); // Check every 5 seconds
  }

  async startAgentProcesses() {
    console.log("Starting agent processes...");
    
    for (const agent of this.config.swarm.agents) {
      console.log(`Starting agent: ${agent.name}`);
      
      // Start MCP servers for this agent
      for (const mcpServer of agent.mcp_servers) {
        const serverProcess = spawn("npx", ["tsx", mcpServer.command], {
          cwd: agent.workspace,
          env: {
            ...process.env,
            AGENT_NAME: agent.name
          }
        });
        
        serverProcess.stderr.on("data", (data) => {
          console.log(`[${agent.name}/${mcpServer.name}] ${data}`);
        });
      }
      
      this.agents.set(agent.name, {
        name: agent.name,
        config: agent
      });
    }
    
    console.log("All agent processes started");
  }

  async shutdown() {
    console.log("Shutting down orchestrator...");
    
    // Close WebSocket connections
    for (const connection of this.connections.values()) {
      connection.close();
    }
    
    this.wss.close();
    
    // Stop agent processes
    for (const agent of this.agents.values()) {
      if (agent.process) {
        agent.process.kill();
      }
    }
  }
}

// Start orchestrator
const orchestrator = new Orchestrator();

orchestrator.initialize().then(() => {
  console.log("Orchestrator initialized successfully");
  
  // Handle shutdown
  process.on("SIGINT", async () => {
    await orchestrator.shutdown();
    process.exit(0);
  });
});

// Export for use in scripts
export { Orchestrator };