import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { MonitoringService } from './services/MonitoringService';
import { WebSocketHandler } from './services/WebSocketHandler';
import { createMonitoringRouter } from './routes/monitoring';

// Load environment variables
dotenv.config();

// Create Express app
const app: Express = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API version endpoint
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    version: '1.0.0',
    endpoints: {
      health: '/health',
      agents: '/api/v1/agents',
      metrics: '/api/v1/metrics',
      events: '/api/v1/events'
    }
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Not found',
      path: req.path
    }
  });
});

// Initialize monitoring service
let monitoringService: MonitoringService | null = null;

async function startServer() {
  try {
    // Configure monitoring
    const agentWorktreesPath = process.env.AGENT_WORKTREE_PATH || path.join(__dirname, '../../../../agents');
    
    monitoringService = new MonitoringService({
      agentWorktreesPath,
      pollIntervalMs: 5000,
      agents: [
        {
          id: 'architect',
          name: 'System Architect',
          worktreePath: path.join(agentWorktreesPath, 'architect')
        },
        {
          id: 'builder',
          name: 'Full-Stack Builder',
          worktreePath: path.join(agentWorktreesPath, 'builder')
        },
        {
          id: 'validator',
          name: 'Quality Validator',
          worktreePath: path.join(agentWorktreesPath, 'validator')
        }
      ]
    });

    // Initialize monitoring
    await monitoringService.initialize();

    // Set up WebSocket handler
    new WebSocketHandler(server, monitoringService);

    // Add monitoring routes
    app.use('/api/v1/monitoring', createMonitoringRouter(monitoringService));

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔍 Monitoring ${monitoringService!.getSystemMetrics().then(m => m.totalAgents)} agents`);
      console.log(`🌐 WebSocket server ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (monitoringService) {
    await monitoringService.stop();
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();