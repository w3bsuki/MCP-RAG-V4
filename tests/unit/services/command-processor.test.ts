import { CommandProcessor, Command } from '../../../src/backend/src/services/CommandProcessor';
import fs from 'fs/promises';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('CommandProcessor Service', () => {
  let commandProcessor: CommandProcessor;
  const mockCoordinationPath = '/test/coordination';

  // Mock task board data
  const mockTaskBoard = {
    version: '1.0.0',
    lastUpdated: '2025-06-16T21:30:00Z',
    updatedBy: 'test',
    tasks: [
      {
        id: 'TASK-001',
        title: 'Test Task 1',
        status: 'TODO',
        priority: 'HIGH',
        assignedTo: 'builder',
        estimatedHours: 2
      },
      {
        id: 'TASK-002',
        title: 'Test Task 2', 
        status: 'DONE',
        priority: 'MEDIUM',
        assignedTo: 'architect',
        estimatedHours: 1
      },
      {
        id: 'TASK-003',
        title: 'Test Task 3',
        status: 'IN_PROGRESS',
        priority: 'LOW',
        assignedTo: 'validator',
        estimatedHours: 3
      }
    ],
    agents: {
      architect: {
        name: 'System Architect',
        activeTasks: [],
        completedTasks: ['TASK-002']
      },
      builder: {
        name: 'Full-Stack Builder',
        activeTasks: ['TASK-001'],
        completedTasks: []
      },
      validator: {
        name: 'Quality Validator',
        activeTasks: ['TASK-003'],
        completedTasks: []
      }
    },
    metrics: {
      totalTasks: 3,
      completedTasks: 1,
      inProgressTasks: 1,
      averageCompletionTime: 2.5
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.readFile.mockResolvedValue(JSON.stringify(mockTaskBoard));
    mockFs.writeFile.mockResolvedValue(undefined);
    commandProcessor = new CommandProcessor(mockCoordinationPath);
  });

  describe('Command Processing for TASK-303', () => {
    it('should process natural language status queries', async () => {
      const response = await commandProcessor.processCommand('show system status');
      
      expect(response.success).toBe(true);
      expect(response.message).toContain('System Status');
      expect(response.data).toMatchObject({
        totalTasks: 3,
        activeTasks: 2,
        completedTasks: 1
      });
    });

    it('should handle task creation with natural language', async () => {
      const response = await commandProcessor.processCommand('create a task: implement user authentication');
      
      expect(response.success).toBe(true);
      expect(response.message).toContain('Created task');
      expect(response.data.title).toBe('implement user authentication');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should provide agent routing capabilities', async () => {
      const response = await commandProcessor.processCommand('which agents are available?');
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(3);
      expect(response.message).toContain('agents available');
    });

    it('should generate proper help responses', async () => {
      const response = await commandProcessor.processCommand('help');
      
      expect(response.success).toBe(true);
      expect(response.message).toContain('Available commands');
      expect(response.message).toContain('Status & Monitoring');
      expect(response.message).toContain('Task Management');
    });

    it('should emit events for command processing', async () => {
      const eventSpy = jest.fn();
      commandProcessor.on('commandProcessed', eventSpy);

      await commandProcessor.processCommand('show system status');
      
      expect(eventSpy).toHaveBeenCalledWith({
        command: expect.objectContaining({
          type: 'status_query',
          input: 'show system status'
        }),
        response: expect.objectContaining({
          success: true
        })
      });
    });

    it('should route commands to specific agents', async () => {
      const mockCommand: Command = {
        id: 'test-cmd-123',
        type: 'task_create',
        input: 'create frontend component',
        timestamp: new Date()
      };

      const response = await commandProcessor.routeToAgent(mockCommand, 'builder');
      expect(response.success).toBe(true);
      expect(response.message).toContain('routed to builder');
      expect(response.executedBy).toBe('builder');
    });

    it('should handle errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      const response = await commandProcessor.processCommand('show system status');
      expect(response.success).toBe(false);
      expect(response.message).toContain('Error processing command');
    });
  });
});