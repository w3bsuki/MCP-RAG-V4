import { WebSocketHandler } from '../../../src/backend/src/services/WebSocketHandler';
import { Server as HTTPServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

// Mock ws module
jest.mock('ws', () => ({
  WebSocketServer: jest.fn(),
  WebSocket: {
    OPEN: 1,
    CLOSED: 3
  }
}));

describe('WebSocketHandler', () => {
  let webSocketHandler: WebSocketHandler;
  let mockServer: HTTPServer;
  let mockWss: jest.Mocked<WebSocketServer>;
  let mockWebSocket: jest.Mocked<WebSocket>;

  beforeEach(() => {
    mockServer = {} as HTTPServer;
    
    mockWebSocket = {
      readyState: 1, // WebSocket.OPEN
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn()
    } as any;

    mockWss = {
      on: jest.fn(),
      clients: new Set([mockWebSocket]),
      close: jest.fn()
    } as any;

    (WebSocketServer as jest.MockedClass<typeof WebSocketServer>).mockImplementation(() => mockWss);
    
    webSocketHandler = new WebSocketHandler(mockServer);
  });

  afterEach(() => {
    webSocketHandler.close();
  });

  describe('constructor', () => {
    it('should create WebSocketServer with correct options', () => {
      expect(WebSocketServer).toHaveBeenCalledWith({
        server: mockServer,
        path: '/ws'
      });
    });

    it('should set up connection event handler', () => {
      expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('connection handling', () => {
    it('should handle new WebSocket connections', () => {
      const connectionHandler = mockWss.on.mock.calls
        .find(call => call[0] === 'connection')?.[1];

      if (connectionHandler) {
        connectionHandler(mockWebSocket);
      }

      expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should send welcome message on connection', () => {
      const connectionHandler = mockWss.on.mock.calls
        .find(call => call[0] === 'connection')?.[1];

      if (connectionHandler) {
        connectionHandler(mockWebSocket);
      }

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'welcome',
          message: 'Connected to monitoring WebSocket'
        })
      );
    });
  });

  describe('message handling', () => {
    beforeEach(() => {
      // Simulate connection
      const connectionHandler = mockWss.on.mock.calls
        .find(call => call[0] === 'connection')?.[1];
      if (connectionHandler) {
        connectionHandler(mockWebSocket);
      }
    });

    it('should handle ping messages', () => {
      const messageHandler = mockWebSocket.on.mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        messageHandler(Buffer.from(JSON.stringify({ type: 'ping' })));
      }

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'pong' })
      );
    });

    it('should handle subscribe messages', () => {
      const messageHandler = mockWebSocket.on.mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        messageHandler(Buffer.from(JSON.stringify({ 
          type: 'subscribe',
          channel: 'fileChanges'
        })));
      }

      // Should add client to subscription
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribed',
          channel: 'fileChanges'
        })
      );
    });

    it('should handle invalid JSON messages gracefully', () => {
      const messageHandler = mockWebSocket.on.mock.calls
        .find(call => call[0] === 'message')?.[1];

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      if (messageHandler) {
        messageHandler(Buffer.from('invalid json'));
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid WebSocket message format:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('broadcasting', () => {
    beforeEach(() => {
      const connectionHandler = mockWss.on.mock.calls
        .find(call => call[0] === 'connection')?.[1];
      if (connectionHandler) {
        connectionHandler(mockWebSocket);
      }
    });

    it('should broadcast file change events', () => {
      const fileChangeEvent = {
        type: 'change',
        path: '/test/file.ts',
        relativePath: 'src/file.ts',
        agentId: 'agent1',
        timestamp: new Date()
      };

      webSocketHandler.broadcastFileChange(fileChangeEvent);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'fileChange',
          data: fileChangeEvent
        })
      );
    });

    it('should broadcast git commit events', () => {
      const commitEvent = {
        hash: 'abc123',
        author: 'Test Author',
        email: 'test@example.com',
        date: new Date(),
        message: 'Test commit',
        agentId: 'agent1',
        files: ['src/file.ts']
      };

      webSocketHandler.broadcastGitCommit(commitEvent);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'gitCommit',
          data: commitEvent
        })
      );
    });

    it('should broadcast system metrics', () => {
      const metrics = {
        totalAgents: 2,
        activeAgents: 2,
        totalCommits: 10,
        totalFiles: 25,
        recentActivity: []
      };

      webSocketHandler.broadcastSystemMetrics(metrics);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'systemMetrics',
          data: metrics
        })
      );
    });

    it('should only send to open WebSocket connections', () => {
      // Create a closed WebSocket
      const closedWebSocket = {
        ...mockWebSocket,
        readyState: 3 // WebSocket.CLOSED
      };

      mockWss.clients = new Set([mockWebSocket, closedWebSocket]);

      webSocketHandler.broadcastSystemMetrics({
        totalAgents: 1,
        activeAgents: 1,
        totalCommits: 1,
        totalFiles: 1,
        recentActivity: []
      });

      // Should only send to open connection
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
      expect(closedWebSocket.send).not.toHaveBeenCalled();
    });

    it('should handle send errors gracefully', () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Connection error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      webSocketHandler.broadcastSystemMetrics({
        totalAgents: 1,
        activeAgents: 1,
        totalCommits: 1,
        totalFiles: 1,
        recentActivity: []
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send WebSocket message:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('close()', () => {
    it('should close WebSocket server', () => {
      webSocketHandler.close();
      
      expect(mockWss.close).toHaveBeenCalled();
    });
  });
});