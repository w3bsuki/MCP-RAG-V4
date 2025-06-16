import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { MonitoringService } from './MonitoringService';
import { FileChangeEvent, GitCommitEvent } from './FileMonitor';

export interface WebSocketMessage {
  type: 'fileChange' | 'commit' | 'metrics' | 'error' | 'connected' | 'activity' | 'pong';
  data: any;
  timestamp: Date;
}

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private monitoringService: MonitoringService;

  constructor(server: Server, monitoringService: MonitoringService) {
    this.monitoringService = monitoringService;
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
    this.setupMonitoringListeners();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket client connected');
      this.clients.add(ws);

      // Send initial connection message
      this.sendToClient(ws, {
        type: 'connected',
        data: { message: 'Connected to monitoring service' },
        timestamp: new Date()
      });

      // Send current metrics on connection
      this.sendCurrentMetrics(ws);

      // Handle client messages
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private setupMonitoringListeners() {
    // Listen for file changes
    this.monitoringService.on('fileChange', (event: FileChangeEvent) => {
      this.broadcast({
        type: 'fileChange',
        data: event,
        timestamp: new Date()
      });
    });

    // Listen for commits
    this.monitoringService.on('commit', (event: GitCommitEvent) => {
      this.broadcast({
        type: 'commit',
        data: event,
        timestamp: new Date()
      });
    });

    // Listen for errors
    this.monitoringService.on('error', (error: any) => {
      this.broadcast({
        type: 'error',
        data: error,
        timestamp: new Date()
      });
    });

    // Periodically send metrics updates
    setInterval(() => {
      this.broadcastMetrics();
    }, 10000); // Every 10 seconds
  }

  private async handleClientMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'getMetrics':
        await this.sendCurrentMetrics(ws);
        break;
      case 'getActivity':
        const limit = message.limit || 50;
        const activity = this.monitoringService.getRecentActivity(limit);
        this.sendToClient(ws, {
          type: 'activity',
          data: activity,
          timestamp: new Date()
        });
        break;
      case 'ping':
        this.sendToClient(ws, {
          type: 'pong',
          data: { timestamp: new Date() },
          timestamp: new Date()
        });
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private async sendCurrentMetrics(ws: WebSocket) {
    try {
      const metrics = await this.monitoringService.getSystemMetrics();
      this.sendToClient(ws, {
        type: 'metrics',
        data: metrics,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending metrics:', error);
    }
  }

  private async broadcastMetrics() {
    try {
      const metrics = await this.monitoringService.getSystemMetrics();
      this.broadcast({
        type: 'metrics',
        data: metrics,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error broadcasting metrics:', error);
    }
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }
}