import { Router, Request, Response } from 'express';
import { CommandProcessor } from '../services/CommandProcessor';

export function createChatRouter(commandProcessor: CommandProcessor): Router {
  const router = Router();

  // Chat endpoint for processing natural language commands
  router.post('/chat', async (req: Request, res: Response): Promise<void> => {
    try {
      const { message, stream = true } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          error: 'Message is required and must be a string'
        });
        return;
      }

      // Process the command
      const response = await commandProcessor.processCommand(message);

      if (stream) {
        // Set headers for streaming response
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Stream the response
        const chunks = response.message.split(' ');
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i] + (i < chunks.length - 1 ? ' ' : '');
          res.write(chunk);
          
          // Add small delay for streaming effect
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        res.end();
      } else {
        // Return full response
        res.json({
          id: response.id,
          message: response.message,
          success: response.success,
          data: response.data,
          timestamp: response.timestamp,
          executedBy: response.executedBy
        });
      }
    } catch (error) {
      console.error('Chat endpoint error:', error);
      res.status(500).json({
        error: 'Internal server error processing command',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get command history
  router.get('/chat/history', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      
      // In a real implementation, this would fetch from a database
      // For now, return empty array as we don't persist chat history
      res.json({
        messages: [],
        total: 0,
        limit
      });
    } catch (error) {
      console.error('Chat history error:', error);
      res.status(500).json({
        error: 'Failed to fetch chat history'
      });
    }
  });

  // Get available commands
  router.get('/chat/commands', (_req: Request, res: Response) => {
    try {
      const availableCommands = [
        {
          category: 'Status & Monitoring',
          commands: [
            { pattern: 'Show system status', description: 'Get overall system status' },
            { pattern: 'Show agent status', description: 'List all agents and capabilities' },
            { pattern: 'Performance metrics', description: 'View system metrics and activity' }
          ]
        },
        {
          category: 'Task Management', 
          commands: [
            { pattern: 'List active tasks', description: 'Show current tasks' },
            { pattern: 'Create a task: [description]', description: 'Create new task' },
            { pattern: 'What tasks are pending?', description: 'Show pending work' }
          ]
        },
        {
          category: 'Agent Operations',
          commands: [
            { pattern: 'Which agents are available?', description: 'List all agents' },
            { pattern: 'Show recent activity', description: 'View recent changes' }
          ]
        }
      ];

      res.json({
        commands: availableCommands,
        total: availableCommands.reduce((sum, cat) => sum + cat.commands.length, 0)
      });
    } catch (error) {
      console.error('Commands endpoint error:', error);
      res.status(500).json({
        error: 'Failed to fetch available commands'
      });
    }
  });

  // Health check for chat service
  router.get('/chat/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'chat-api',
      timestamp: new Date().toISOString(),
      features: {
        commandProcessing: true,
        naturalLanguageParsing: true,
        agentRouting: true,
        taskCreation: true
      }
    });
  });

  return router;
}