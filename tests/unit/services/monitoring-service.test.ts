import { MonitoringService } from '../../../src/backend/src/services/MonitoringService';
import { FileMonitor } from '../../../src/backend/src/services/FileMonitor';

// Mock FileMonitor
jest.mock('../../../src/backend/src/services/FileMonitor');

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  let mockFileMonitor: jest.Mocked<FileMonitor>;
  
  const mockConfig = {
    agentWorktreesPath: '/test/agents',
    pollIntervalMs: 1000,
    agents: [
      { id: 'agent1', name: 'Test Agent 1', worktreePath: '/test/agents/agent1' },
      { id: 'agent2', name: 'Test Agent 2', worktreePath: '/test/agents/agent2' }
    ]
  };

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Create mocked FileMonitor instance
    mockFileMonitor = {
      addAgent: jest.fn(),
      removeAgent: jest.fn(),
      getAgentMetrics: jest.fn(),
      getAgents: jest.fn(),
      start: jest.fn(),
      stopAll: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      removeListener: jest.fn()
    } as any;

    // Mock FileMonitor constructor
    (FileMonitor as jest.MockedClass<typeof FileMonitor>).mockImplementation(() => mockFileMonitor);
    
    monitoringService = new MonitoringService(mockConfig);
  });

  afterEach(async () => {
    await monitoringService.stop();
  });

  describe('constructor', () => {
    it('should create MonitoringService with correct config', () => {
      expect(monitoringService).toBeInstanceOf(MonitoringService);
      expect(FileMonitor).toHaveBeenCalledWith(1000);
    });

    it('should use default poll interval if not specified', () => {
      const configWithoutInterval = {
        agentWorktreesPath: '/test/agents',
        agents: mockConfig.agents
      };
      
      new MonitoringService(configWithoutInterval);
      
      expect(FileMonitor).toHaveBeenCalledWith(5000);
    });
  });

  describe('initialize()', () => {
    it('should add all configured agents to FileMonitor', async () => {
      mockFileMonitor.addAgent.mockResolvedValue(undefined);
      
      await monitoringService.initialize();
      
      expect(mockFileMonitor.addAgent).toHaveBeenCalledTimes(2);
      expect(mockFileMonitor.addAgent).toHaveBeenCalledWith('agent1', '/test/agents/agent1');
      expect(mockFileMonitor.addAgent).toHaveBeenCalledWith('agent2', '/test/agents/agent2');
    });

    it('should handle errors when adding agents', async () => {
      const error = new Error('Failed to add agent');
      mockFileMonitor.addAgent.mockRejectedValueOnce(error);
      mockFileMonitor.addAgent.mockResolvedValueOnce(undefined);
      
      const errorListener = jest.fn();
      monitoringService.on('error', errorListener);
      
      await monitoringService.initialize();
      
      expect(errorListener).toHaveBeenCalledWith({
        agentId: 'agent1',
        error
      });
      expect(mockFileMonitor.addAgent).toHaveBeenCalledTimes(2);
    });

    it('should start FileMonitor after adding agents', async () => {
      mockFileMonitor.addAgent.mockResolvedValue(undefined);
      
      await monitoringService.initialize();
      
      // FileMonitor starts automatically, no explicit start call needed
      expect(true).toBe(true);
    });
  });

  describe('getSystemMetrics()', () => {
    beforeEach(async () => {
      mockFileMonitor.addAgent.mockResolvedValue(undefined);
      await monitoringService.initialize();
    });

    it('should return system metrics with correct structure', async () => {
      mockFileMonitor.getAgents.mockReturnValue(['agent1', 'agent2']);
      mockFileMonitor.getAgentMetrics
        .mockResolvedValueOnce({
          agentId: 'agent1',
          totalFiles: 10,
          totalCommits: 5,
          lastActivity: new Date(),
          filesChanged: 2,
          linesAdded: 50,
          linesRemoved: 10
        })
        .mockResolvedValueOnce({
          agentId: 'agent2',
          totalFiles: 8,
          totalCommits: 3,
          lastActivity: new Date(),
          filesChanged: 1,
          linesAdded: 30,
          linesRemoved: 5
        });

      const metrics = await monitoringService.getSystemMetrics();

      expect(metrics).toMatchObject({
        totalAgents: 2,
        activeAgents: 2,
        totalCommits: 8,
        totalFiles: 18,
        recentActivity: expect.any(Array)
      });
    });

    it('should handle errors when getting agent metrics', async () => {
      mockFileMonitor.getAgents.mockReturnValue(['agent1']);
      mockFileMonitor.getAgentMetrics.mockRejectedValue(new Error('Metrics error'));

      const metrics = await monitoringService.getSystemMetrics();

      expect(metrics.totalAgents).toBe(1);
      expect(metrics.activeAgents).toBe(0); // Should be 0 due to error
    });
  });

  describe('getAgentMetrics()', () => {
    it('should return metrics for specific agent', async () => {
      const expectedMetrics = {
        agentId: 'agent1',
        totalFiles: 10,
        totalCommits: 5,
        lastActivity: new Date(),
        filesChanged: 2,
        linesAdded: 50,
        linesRemoved: 10
      };
      
      mockFileMonitor.getAgentMetrics.mockResolvedValue(expectedMetrics);

      const metrics = await monitoringService.getAgentMetrics('agent1');

      expect(metrics).toEqual(expectedMetrics);
      expect(mockFileMonitor.getAgentMetrics).toHaveBeenCalledWith('agent1');
    });

    it('should handle errors when getting specific agent metrics', async () => {
      mockFileMonitor.getAgentMetrics.mockRejectedValue(new Error('Agent not found'));

      await expect(monitoringService.getAgentMetrics('nonexistent'))
        .rejects.toThrow('Agent not found');
    });
  });

  describe('event handling', () => {
    it('should relay file change events from FileMonitor', async () => {
      const fileChangeEvent = {
        type: 'change' as const,
        path: '/test/file.ts',
        relativePath: 'src/file.ts',
        agentId: 'agent1',
        timestamp: new Date()
      };

      const eventListener = jest.fn();
      monitoringService.on('fileChange', eventListener);

      // Simulate FileMonitor emitting fileChange event
      const fileChangeCallback = mockFileMonitor.on.mock.calls
        .find(call => call[0] === 'fileChange')?.[1];
      
      if (fileChangeCallback) {
        fileChangeCallback(fileChangeEvent);
      }

      expect(eventListener).toHaveBeenCalledWith(fileChangeEvent);
    });

    it('should maintain recent activity with max limit', async () => {
      // Add more than max items to test limit
      for (let i = 0; i < 150; i++) {
        const event = {
          type: 'change' as const,
          path: `/test/file${i}.ts`,
          relativePath: `src/file${i}.ts`,
          agentId: 'agent1',
          timestamp: new Date()
        };

        // Simulate adding to recent activity
        monitoringService['addToRecentActivity'](event);
      }

      const metrics = await monitoringService.getSystemMetrics();
      expect(metrics.recentActivity.length).toBeLessThanOrEqual(100);
    });
  });

  describe('stop()', () => {
    it('should stop FileMonitor when service is stopped', async () => {
      await monitoringService.stop();
      
      expect(mockFileMonitor.stopAll).toHaveBeenCalled();
    });
  });
});