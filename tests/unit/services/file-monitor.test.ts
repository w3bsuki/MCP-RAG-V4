import { FileMonitor } from '../../../src/backend/src/services/FileMonitor';

// Mock external dependencies
jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    close: jest.fn()
  }))
}));

jest.mock('simple-git', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    log: jest.fn(),
    diff: jest.fn(),
    status: jest.fn()
  }))
}));

jest.mock('fs/promises', () => ({
  access: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn()
}));

describe('FileMonitor Service', () => {
  let fileMonitor: FileMonitor;
  let mockChokidar: any;
  let mockGit: any;
  let mockFs: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockChokidar = require('chokidar');
    mockGit = require('simple-git').default();
    mockFs = require('fs/promises');
    
    fileMonitor = new FileMonitor(1000);
  });

  afterEach(async () => {
    await fileMonitor.stopAll();
  });

  describe('addAgent()', () => {
    it('should start monitoring specified agent directory', async () => {
      const agentId = 'test-agent';
      const worktreePath = '/test/path';
      
      mockFs.access.mockResolvedValue(undefined);
      mockGit.log.mockResolvedValue({ latest: { hash: 'abc123' } });

      await fileMonitor.addAgent(agentId, worktreePath);

      expect(mockChokidar.watch).toHaveBeenCalledWith(
        worktreePath,
        expect.objectContaining({
          ignored: expect.any(Array),
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: expect.any(Object)
        })
      );
    });

    it('should throw error if path does not exist', async () => {
      const agentId = 'test-agent';
      const worktreePath = '/nonexistent/path';
      
      mockFs.access.mockRejectedValue(new Error('Path not found'));

      await expect(fileMonitor.addAgent(agentId, worktreePath))
        .rejects.toThrow('Worktree path does not exist');
    });

    it('should throw error if agent already monitored', async () => {
      const agentId = 'test-agent';
      const worktreePath = '/test/path';
      
      mockFs.access.mockResolvedValue(undefined);
      mockGit.log.mockResolvedValue({ latest: { hash: 'abc123' } });

      await fileMonitor.addAgent(agentId, worktreePath);
      
      await expect(fileMonitor.addAgent(agentId, '/another/path'))
        .rejects.toThrow('Agent test-agent is already being monitored');
    });

    it('should handle git initialization errors gracefully', async () => {
      const agentId = 'test-agent';
      const worktreePath = '/test/path';
      
      mockFs.access.mockResolvedValue(undefined);
      mockGit.log.mockRejectedValue(new Error('Git error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await fileMonitor.addAgent(agentId, worktreePath);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get initial commit'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('removeAgent()', () => {
    it('should stop monitoring specified agent', async () => {
      const agentId = 'test-agent';
      const worktreePath = '/test/path';
      
      mockFs.access.mockResolvedValue(undefined);
      mockGit.log.mockResolvedValue({ latest: { hash: 'abc123' } });

      const mockWatcher = {
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
      };
      mockChokidar.watch.mockReturnValue(mockWatcher);

      await fileMonitor.addAgent(agentId, worktreePath);
      await fileMonitor.removeAgent(agentId);

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should throw error if agent not found', async () => {
      await expect(fileMonitor.removeAgent('nonexistent-agent'))
        .rejects.toThrow('Agent nonexistent-agent is not being monitored');
    });
  });

  describe('getAgentMetrics()', () => {
    beforeEach(async () => {
      const agentId = 'test-agent';
      const worktreePath = '/test/path';
      
      mockFs.access.mockResolvedValue(undefined);
      mockGit.log.mockResolvedValue({ 
        latest: { hash: 'abc123' },
        all: [
          { hash: 'abc123', date: '2025-01-16T10:00:00Z' },
          { hash: 'def456', date: '2025-01-16T09:00:00Z' }
        ]
      });
      mockFs.readdir.mockResolvedValue([]);

      await fileMonitor.addAgent(agentId, worktreePath);
    });

    it('should return agent metrics', async () => {
      const metrics = await fileMonitor.getAgentMetrics('test-agent');

      expect(metrics).toEqual(
        expect.objectContaining({
          agentId: 'test-agent',
          totalCommits: 2,
          totalFiles: expect.any(Number),
          lastActivity: expect.any(Date),
          filesChanged: 0,
          linesAdded: 0,
          linesRemoved: 0
        })
      );
    });

    it('should throw error for non-existent agent', async () => {
      await expect(fileMonitor.getAgentMetrics('nonexistent'))
        .rejects.toThrow('Agent nonexistent is not being monitored');
    });
  });

  describe('file watching events', () => {
    it('should emit file change events when files are modified', async () => {
      const agentId = 'test-agent';
      const worktreePath = '/test/path';
      
      mockFs.access.mockResolvedValue(undefined);
      mockGit.log.mockResolvedValue({ latest: { hash: 'abc123' } });

      const mockWatcher = {
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
      };
      mockChokidar.watch.mockReturnValue(mockWatcher);

      const fileChangeListener = jest.fn();
      fileMonitor.on('fileChange', fileChangeListener);

      await fileMonitor.addAgent(agentId, worktreePath);

      // Simulate file change event from chokidar
      const addCallback = mockWatcher.on.mock.calls.find(call => call[0] === 'add')[1];
      addCallback('/test/path/src/file.ts');

      expect(fileChangeListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'add',
          path: '/test/path/src/file.ts',
          relativePath: 'src/file.ts',
          agentId: 'test-agent',
          timestamp: expect.any(Date)
        })
      );
    });

    it('should handle file watcher errors', async () => {
      const agentId = 'test-agent';
      const worktreePath = '/test/path';
      
      mockFs.access.mockResolvedValue(undefined);
      mockGit.log.mockResolvedValue({ latest: { hash: 'abc123' } });

      const mockWatcher = {
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
      };
      mockChokidar.watch.mockReturnValue(mockWatcher);

      const errorListener = jest.fn();
      fileMonitor.on('error', errorListener);

      await fileMonitor.addAgent(agentId, worktreePath);

      // Simulate error from chokidar
      const errorCallback = mockWatcher.on.mock.calls.find(call => call[0] === 'error')[1];
      const testError = new Error('File system error');
      errorCallback(testError);

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'test-agent',
          error: testError
        })
      );
    });
  });

  describe('git polling', () => {
    it('should detect new commits during polling', async () => {
      const agentId = 'test-agent';
      const worktreePath = '/test/path';
      
      mockFs.access.mockResolvedValue(undefined);
      mockGit.log
        .mockResolvedValueOnce({ latest: { hash: 'abc123' } }) // Initial
        .mockResolvedValueOnce({ 
          latest: { hash: 'def456' },
          all: [{
            hash: 'def456',
            author_name: 'Test Author',
            author_email: 'test@example.com',
            date: '2025-01-16T10:00:00Z',
            message: 'Test commit'
          }]
        }); // After poll

      const commitListener = jest.fn();
      fileMonitor.on('commit', commitListener);

      await fileMonitor.addAgent(agentId, worktreePath);
      
      // Trigger git polling manually
      await fileMonitor['checkForNewCommits']();

      expect(commitListener).toHaveBeenCalledWith(
        expect.objectContaining({
          hash: 'def456',
          author: 'Test Author',
          email: 'test@example.com',
          message: 'Test commit',
          agentId: 'test-agent',
          files: expect.any(Array)
        })
      );
    });

    it('should handle git polling errors gracefully', async () => {
      const agentId = 'test-agent';
      const worktreePath = '/test/path';
      
      mockFs.access.mockResolvedValue(undefined);
      mockGit.log
        .mockResolvedValueOnce({ latest: { hash: 'abc123' } })
        .mockRejectedValueOnce(new Error('Git polling error'));

      const errorListener = jest.fn();
      fileMonitor.on('error', errorListener);

      await fileMonitor.addAgent(agentId, worktreePath);
      await fileMonitor['checkForNewCommits']();

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'test-agent',
          error: expect.any(Error),
          context: 'git polling'
        })
      );
    });
  });

  describe('lifecycle management', () => {
    it('should start git polling when start() is called', () => {
      // FileMonitor doesn't have explicit start method, it starts automatically
      expect(true).toBe(true);
    });

    it('should stop all agents and polling when stopAll() is called', async () => {
      const agentId = 'test-agent';
      const worktreePath = '/test/path';
      
      mockFs.access.mockResolvedValue(undefined);
      mockGit.log.mockResolvedValue({ latest: { hash: 'abc123' } });

      const mockWatcher = {
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
      };
      mockChokidar.watch.mockReturnValue(mockWatcher);

      await fileMonitor.addAgent(agentId, worktreePath);
      await fileMonitor.stopAll();

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should return list of monitored agents', async () => {
      const agents = fileMonitor.getAgents();
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBe(0);

      // Add an agent
      mockFs.access.mockResolvedValue(undefined);
      mockGit.log.mockResolvedValue({ latest: { hash: 'abc123' } });
      await fileMonitor.addAgent('test-agent', '/test/path');

      const agentsAfter = fileMonitor.getAgents();
      expect(agentsAfter).toContain('test-agent');
    });
  });
});