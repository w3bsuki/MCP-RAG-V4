import { Router, Request, Response } from 'express';
import { CommandProcessor } from '../services/CommandProcessor';

export function createAPIRouter(commandProcessor: CommandProcessor): Router {
  const router = Router();

  // Vercel AI SDK compatible chat endpoint
  router.post('/chat', async (req: Request, res: Response): Promise<void> => {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({
          error: 'Messages array is required'
        });
        return;
      }

      // Get the latest user message
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        res.status(400).json({
          error: 'Last message must be from user'
        });
        return;
      }

      // Process the command
      const response = await commandProcessor.processCommand(lastMessage.content);

      // Set headers for streaming response (Vercel AI SDK expects text/plain for streaming)
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Format response for the UI
      let formattedResponse = response.message;
      
      // Add structured data if available
      if (response.data && response.success) {
        if (response.data.agents) {
          formattedResponse += '\n\n📊 **Agent Status:**\n';
          response.data.agents.forEach((agent: any) => {
            formattedResponse += `• **${agent.name}**: ${agent.activeTasks} active, ${agent.completedTasks} completed\n`;
          });
        }
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          // Task list formatting
          if (response.data[0].title) {
            formattedResponse += '\n\n📋 **Active Tasks:**\n';
            response.data.slice(0, 5).forEach((task: any, index: number) => {
              formattedResponse += `${index + 1}. **${task.title}** (${task.status})\n   Priority: ${task.priority} | Assigned: ${task.assignedTo}\n`;
            });
            if (response.data.length > 5) {
              formattedResponse += `\n... and ${response.data.length - 5} more tasks`;
            }
          }
        }

        if (response.data.totalTasks !== undefined) {
          formattedResponse += '\n\n📈 **System Metrics:**\n';
          formattedResponse += `• Total Tasks: ${response.data.totalTasks}\n`;
          formattedResponse += `• Completed: ${response.data.completedTasks}\n`;
          formattedResponse += `• In Progress: ${response.data.inProgressTasks}\n`;
          if (response.data.blockedTasks > 0) {
            formattedResponse += `• Blocked: ${response.data.blockedTasks}\n`;
          }
        }
      }

      // Add helpful suggestions
      if (response.success) {
        formattedResponse += '\n\n💡 **Try asking:**\n';
        formattedResponse += '• "Show system status" for overall health\n';
        formattedResponse += '• "List active tasks" for current work\n';
        formattedResponse += '• "Create a task: [description]" to add new work\n';
        formattedResponse += '• "Performance metrics" for detailed analytics\n';
      }

      // Stream the response character by character for realistic typing effect
      const chars = formattedResponse.split('');
      for (let i = 0; i < chars.length; i++) {
        res.write(chars[i]);
        
        // Add variable delay for more natural streaming
        const delay = chars[i] === '\n' ? 100 : Math.random() * 30 + 10;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      res.end();

    } catch (error) {
      console.error('API chat endpoint error:', error);
      
      // Send error response in streaming format
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      const errorMessage = `❌ Sorry, I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or ask for help to see available commands.`;
      res.write(errorMessage);
      res.end();
    }
  });

  // Options handler for CORS preflight
  router.options('/chat', (_req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
  });

  return router;
}