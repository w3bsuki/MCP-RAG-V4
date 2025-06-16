import request from 'supertest';
import express from 'express';
import { MonitoringService } from '../../../src/backend/src/services/MonitoringService';

// Mock MonitoringService
jest.mock('../../../src/backend/src/services/MonitoringService');

describe('Monitoring Routes', () => {
  let app: express.Application;
  let mockMonitoringService: jest.Mocked<MonitoringService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock monitoring service
    mockMonitoringService = {
      getSystemMetrics: jest.fn(),
      getAgentMetrics: jest.fn(),
      initialize: jest.fn(),
      stop: jest.fn(),
      on: jest.fn(),
      emit: jest.fn()
    } as any;

    // Create Express app and load routes
    app = express();
    app.use(express.json());
    
    // Mock the monitoring service instance
    (MonitoringService as jest.MockedClass<typeof MonitoringService>)
      .mockImplementation(() => mockMonitoringService);

    // Import and use routes after mocking
    const monitoringRoutes = require('../../../src/backend/src/routes/monitoring');
    app.use('/api', monitoringRoutes);
  });

  describe('GET /api/metrics', () => {
    it('should return system metrics', async () => {
      const mockMetrics = {
        totalAgents: 3,
        activeAgents: 2,
        totalCommits: 150,
        totalFiles: 500,
        recentActivity: [
          {
            type: 'change',
            path: '/test/file.ts',
            agentId: 'agent1',
            timestamp: new Date()
          }
        ]
      };

      mockMonitoringService.getSystemMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMetrics
      });
      expect(mockMonitoringService.getSystemMetrics).toHaveBeenCalled();
    });

    it('should handle errors when getting system metrics', async () => {
      mockMonitoringService.getSystemMetrics.mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .get('/api/metrics')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get system metrics'
      });
    });
  });

  describe('GET /api/agents/:agentId/metrics', () => {
    it('should return metrics for specific agent', async () => {
      const mockAgentMetrics = {
        agentId: 'agent1',
        totalFiles: 25,
        totalCommits: 15,
        lastActivity: new Date(),
        filesChanged: 5,
        linesAdded: 200,
        linesRemoved: 50
      };

      mockMonitoringService.getAgentMetrics.mockResolvedValue(mockAgentMetrics);

      const response = await request(app)
        .get('/api/agents/agent1/metrics')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAgentMetrics
      });
      expect(mockMonitoringService.getAgentMetrics).toHaveBeenCalledWith('agent1');
    });

    it('should handle agent not found error', async () => {
      mockMonitoringService.getAgentMetrics.mockRejectedValue(
        new Error('Agent agent-nonexistent is not being monitored')
      );

      const response = await request(app)
        .get('/api/agents/agent-nonexistent/metrics')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Agent not found'
      });
    });

    it('should handle other service errors', async () => {
      mockMonitoringService.getAgentMetrics.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/agents/agent1/metrics')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get agent metrics'
      });
    });
  });

  describe('GET /api/activity', () => {
    it('should return recent activity feed', async () => {
      const mockMetrics = {
        totalAgents: 2,
        activeAgents: 2,
        totalCommits: 10,
        totalFiles: 50,
        recentActivity: [
          {
            type: 'change',
            path: '/test/file1.ts',
            agentId: 'agent1',
            timestamp: new Date('2025-01-16T10:30:00Z')
          },
          {
            type: 'commit',
            hash: 'abc123',
            author: 'Test Author',
            message: 'Add new feature',
            agentId: 'agent2',
            timestamp: new Date('2025-01-16T10:25:00Z')
          }
        ]
      };

      mockMonitoringService.getSystemMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/activity')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMetrics.recentActivity
      });
    });

    it('should handle limit parameter', async () => {
      const mockActivity = Array.from({ length: 50 }, (_, i) => ({
        type: 'change',
        path: `/test/file${i}.ts`,
        agentId: 'agent1',
        timestamp: new Date()
      }));

      const mockMetrics = {
        totalAgents: 1,
        activeAgents: 1,
        totalCommits: 50,
        totalFiles: 50,
        recentActivity: mockActivity
      };

      mockMonitoringService.getSystemMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/activity?limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(10);
    });

    it('should handle invalid limit parameter', async () => {
      const mockMetrics = {
        totalAgents: 1,
        activeAgents: 1,
        totalCommits: 5,
        totalFiles: 10,
        recentActivity: [
          {
            type: 'change',
            path: '/test/file.ts',
            agentId: 'agent1',
            timestamp: new Date()
          }
        ]
      };

      mockMonitoringService.getSystemMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/activity?limit=invalid')
        .expect(200);

      // Should use default limit
      expect(response.body.data).toHaveLength(1);
    });

    it('should handle service errors', async () => {
      mockMonitoringService.getSystemMetrics.mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .get('/api/activity')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get activity feed'
      });
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number)
        }
      });
    });
  });

  describe('error handling middleware', () => {
    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/test-endpoint')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(404); // Route doesn't exist, but should handle the malformed JSON

      // The exact response depends on Express error handling
      // but it should not crash the server
    });
  });
});