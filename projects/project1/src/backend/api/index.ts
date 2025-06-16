import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { MonitoringService } from '../src/services/MonitoringService';
import { CommandProcessor } from '../src/services/CommandProcessor';
import { createMonitoringRouter } from '../src/routes/monitoring';
import { createChatRouter } from '../src/routes/chat';
import { createAPIRouter } from '../src/routes/api';

// Load environment variables
dotenv.config();

// Create Express app
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://your-frontend.vercel.app',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API version endpoint
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    version: '1.0.0',
    endpoints: {
      health: '/health',
      agents: '/api/v1/monitoring/agents',
      metrics: '/api/v1/monitoring/metrics',
      events: '/api/v1/monitoring/events',
      chat: '/api/chat'
    }
  });
});

// Initialize services (simplified for serverless)
let monitoringService: MonitoringService | null = null;
let commandProcessor: CommandProcessor | null = null;

async function initializeServices() {
  if (!monitoringService) {
    console.log('🔧 Initializing monitoring service...');
    monitoringService = new MonitoringService();
    
    // For serverless, we'll use a simplified setup without file monitoring
    console.log('✓ Monitoring service initialized (serverless mode)');
    
    // Initialize command processor
    commandProcessor = new CommandProcessor();
    console.log('✓ Command processor initialized');
  }
}

// Initialize services on first request
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (!monitoringService || !commandProcessor) {
    await initializeServices();
  }
  next();
});

// Routes
app.use('/api/v1/monitoring', (req, res, next) => {
  if (monitoringService) {
    createMonitoringRouter(monitoringService)(req, res, next);
  } else {
    res.status(503).json({ error: 'Service not initialized' });
  }
});

app.use('/api/v1', (req, res, next) => {
  if (commandProcessor) {
    createChatRouter(commandProcessor)(req, res, next);
  } else {
    res.status(503).json({ error: 'Service not initialized' });
  }
});

app.use('/api', (req, res, next) => {
  if (commandProcessor) {
    createAPIRouter(commandProcessor)(req, res, next);
  } else {
    res.status(503).json({ error: 'Service not initialized' });
  }
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

export default app;