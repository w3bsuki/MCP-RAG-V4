import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

export interface Command {
  id: string;
  type: CommandType;
  input: string;
  agentTarget?: string;
  parameters?: Record<string, any>;
  timestamp: Date;
}

export interface CommandResponse {
  id: string;
  success: boolean;
  data?: any;
  message: string;
  executedBy?: string;
  timestamp: Date;
}

export type CommandType = 
  | 'status_query'
  | 'task_list'
  | 'task_create'
  | 'task_update'
  | 'agent_status'
  | 'system_metrics'
  | 'file_operation'
  | 'git_operation'
  | 'help'
  | 'unknown';

export interface AgentCapability {
  agentId: string;
  capabilities: string[];
  isActive: boolean;
  lastSeen: Date;
}

export class CommandProcessor extends EventEmitter {
  private taskBoardPath: string;
  private agentCapabilities: Map<string, AgentCapability> = new Map();
  private commandPatterns: Map<CommandType, RegExp[]> = new Map();

  constructor(coordinationPath: string) {
    super();
    this.taskBoardPath = path.join(coordinationPath, 'task-board.json');
    this.initializeCommandPatterns();
    this.initializeAgentCapabilities();
  }

  private initializeCommandPatterns() {
    this.commandPatterns.set('agent_status', [
      /show\s+agent\s+status/i,
      /agent.*status/i,
      /show.*agents/i,
      /which\s+agents/i,
      /agent.*activity/i
    ]);

    this.commandPatterns.set('status_query', [
      /show\s+(system|current)\s+status/i,
      /what.*status/i,
      /how.*doing/i,
      /give.*status/i
    ]);

    this.commandPatterns.set('task_list', [
      /list\s+(tasks|active\s+tasks|pending\s+tasks)/i,
      /show.*tasks/i,
      /what.*tasks/i,
      /current.*tasks/i
    ]);

    this.commandPatterns.set('task_create', [
      /create\s+(a\s+)?task/i,
      /add\s+(a\s+)?task/i,
      /new\s+task/i,
      /i\s+need\s+to\s+create/i
    ]);

    this.commandPatterns.set('task_update', [
      /update\s+task/i,
      /modify\s+task/i,
      /change\s+task/i,
      /complete\s+task/i
    ]);

    this.commandPatterns.set('system_metrics', [
      /performance\s+metrics/i,
      /system\s+metrics/i,
      /show.*metrics/i,
      /recent\s+activity/i
    ]);

    this.commandPatterns.set('file_operation', [
      /file.*changes/i,
      /show.*files/i,
      /recent.*files/i,
      /file\s+activity/i
    ]);

    this.commandPatterns.set('git_operation', [
      /git.*status/i,
      /commits/i,
      /repository\s+status/i,
      /version\s+control/i
    ]);

    this.commandPatterns.set('help', [
      /help/i,
      /what\s+can\s+you\s+do/i,
      /commands/i,
      /how\s+to/i
    ]);
  }

  private initializeAgentCapabilities() {
    this.agentCapabilities.set('architect', {
      agentId: 'architect',
      capabilities: ['system_design', 'api_spec', 'database_schema', 'architecture_decisions'],
      isActive: true,
      lastSeen: new Date()
    });

    this.agentCapabilities.set('builder', {
      agentId: 'builder',
      capabilities: ['implementation', 'frontend', 'backend', 'integration', 'testing'],
      isActive: true,
      lastSeen: new Date()
    });

    this.agentCapabilities.set('validator', {
      agentId: 'validator',
      capabilities: ['testing', 'quality_assurance', 'code_review', 'validation'],
      isActive: true,
      lastSeen: new Date()
    });
  }

  async processCommand(input: string): Promise<CommandResponse> {
    const command: Command = {
      id: this.generateCommandId(),
      type: this.parseCommandType(input),
      input: input.trim(),
      timestamp: new Date()
    };

    try {
      const response = await this.executeCommand(command);
      this.emit('commandProcessed', { command, response });
      return response;
    } catch (error) {
      const errorResponse: CommandResponse = {
        id: command.id,
        success: false,
        message: `Error processing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      this.emit('commandError', { command, error: errorResponse });
      return errorResponse;
    }
  }

  private parseCommandType(input: string): CommandType {
    for (const [type, patterns] of this.commandPatterns.entries()) {
      if (patterns.some(pattern => pattern.test(input))) {
        return type;
      }
    }
    return 'unknown';
  }

  private async executeCommand(command: Command): Promise<CommandResponse> {
    switch (command.type) {
      case 'status_query':
        return await this.handleStatusQuery(command);
      
      case 'task_list':
        return await this.handleTaskList(command);
      
      case 'task_create':
        return await this.handleTaskCreate(command);
      
      case 'agent_status':
        return await this.handleAgentStatus(command);
      
      case 'system_metrics':
        return await this.handleSystemMetrics(command);
      
      case 'help':
        return this.handleHelp(command);
      
      default:
        return {
          id: command.id,
          success: false,
          message: `I don't understand that command. Try asking for help to see available commands.`,
          timestamp: new Date()
        };
    }
  }

  private async handleStatusQuery(command: Command): Promise<CommandResponse> {
    try {
      const taskBoard = await this.loadTaskBoard();
      const activeTasks = taskBoard.tasks.filter((task: any) => 
        task.status === 'IN_PROGRESS' || task.status === 'TODO'
      );
      
      const summary = {
        totalTasks: taskBoard.tasks.length,
        activeTasks: activeTasks.length,
        completedTasks: taskBoard.tasks.filter((task: any) => task.status === 'DONE').length,
        agents: Object.keys(taskBoard.agents).map(agentId => ({
          id: agentId,
          name: taskBoard.agents[agentId].name,
          activeTasks: taskBoard.agents[agentId].activeTasks.length,
          completedTasks: taskBoard.agents[agentId].completedTasks.length
        }))
      };

      return {
        id: command.id,
        success: true,
        data: summary,
        message: `System Status: ${summary.activeTasks} active tasks, ${summary.completedTasks} completed. All ${summary.agents.length} agents operational.`,
        executedBy: 'system',
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to fetch system status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleTaskList(command: Command): Promise<CommandResponse> {
    try {
      const taskBoard = await this.loadTaskBoard();
      const activeTasks = taskBoard.tasks.filter((task: any) => 
        task.status === 'IN_PROGRESS' || task.status === 'TODO'
      );

      const taskSummary = activeTasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo,
        estimatedHours: task.estimatedHours
      }));

      return {
        id: command.id,
        success: true,
        data: taskSummary,
        message: `Found ${activeTasks.length} active tasks. See data for details.`,
        executedBy: 'system',
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to load task list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleTaskCreate(command: Command): Promise<CommandResponse> {
    // Extract task details from natural language
    const taskTitle = this.extractTaskTitle(command.input);
    const assignedAgent = this.determineOptimalAgent(command.input);

    if (!taskTitle) {
      return {
        id: command.id,
        success: false,
        message: 'I need more details to create a task. Please specify what task you want to create.',
        timestamp: new Date()
      };
    }

    try {
      const taskBoard = await this.loadTaskBoard();
      const newTaskId = `TASK-${String(taskBoard.tasks.length + 101).padStart(3, '0')}`;
      
      const newTask = {
        id: newTaskId,
        title: taskTitle,
        description: `Task created from AI command: ${command.input}`,
        status: 'TODO',
        priority: 'MEDIUM',
        assignedTo: assignedAgent,
        createdBy: 'ai-assistant',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dependencies: [],
        tags: ['ai-created'],
        estimatedHours: 1,
        actualHours: 0,
        completionCriteria: ['Task implementation complete'],
        blockers: [],
        comments: []
      };

      taskBoard.tasks.push(newTask);
      taskBoard.agents[assignedAgent].activeTasks.push(newTaskId);
      taskBoard.lastUpdated = new Date().toISOString();
      taskBoard.updatedBy = 'ai-assistant';

      await this.saveTaskBoard(taskBoard);

      return {
        id: command.id,
        success: true,
        data: newTask,
        message: `Created task ${newTaskId}: "${taskTitle}" assigned to ${assignedAgent}`,
        executedBy: 'system',
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleAgentStatus(command: Command): Promise<CommandResponse> {
    const agents = Array.from(this.agentCapabilities.values()).map(agent => ({
      id: agent.agentId,
      capabilities: agent.capabilities,
      isActive: agent.isActive,
      lastSeen: agent.lastSeen
    }));

    return {
      id: command.id,
      success: true,
      data: agents,
      message: `${agents.length} agents available: ${agents.map(a => a.id).join(', ')}`,
      executedBy: 'system',
      timestamp: new Date()
    };
  }

  private async handleSystemMetrics(command: Command): Promise<CommandResponse> {
    try {
      const taskBoard = await this.loadTaskBoard();
      const metrics = {
        totalTasks: taskBoard.tasks.length,
        completedTasks: taskBoard.tasks.filter((task: any) => task.status === 'DONE').length,
        inProgressTasks: taskBoard.tasks.filter((task: any) => task.status === 'IN_PROGRESS').length,
        blockedTasks: taskBoard.tasks.filter((task: any) => task.status === 'BLOCKED').length,
        averageCompletionTime: taskBoard.metrics?.averageCompletionTime || 0,
        totalAgents: Object.keys(taskBoard.agents).length,
        lastUpdated: taskBoard.lastUpdated
      };

      return {
        id: command.id,
        success: true,
        data: metrics,
        message: `System metrics: ${metrics.completedTasks}/${metrics.totalTasks} tasks completed, ${metrics.inProgressTasks} in progress`,
        executedBy: 'system',
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to fetch system metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private handleHelp(command: Command): CommandResponse {
    const helpText = `Available commands:
    
🔍 **Status & Monitoring:**
- "Show system status" - Get overall system status
- "Show agent status" - List all agents and their capabilities  
- "Performance metrics" - View system metrics and activity

📋 **Task Management:**
- "List active tasks" - Show current tasks
- "Create a task: [description]" - Create new task
- "What tasks are pending?" - Show pending work

🤖 **Agent Operations:**
- "Which agents are available?" - List all agents
- "Show recent activity" - View recent changes

💡 **Tips:**
- Be specific about what you want to know
- I can create tasks and route them to the right agents
- Ask for status updates anytime`;

    return {
      id: command.id,
      success: true,
      data: { helpText },
      message: helpText,
      executedBy: 'system',
      timestamp: new Date()
    };
  }

  private extractTaskTitle(input: string): string | null {
    // Look for patterns like "create task: title" or "add task to do X"
    const patterns = [
      /create\s+(?:a\s+)?task:?\s*(.+)/i,
      /add\s+(?:a\s+)?task:?\s*(.+)/i,
      /new\s+task:?\s*(.+)/i,
      /i\s+need\s+to\s+create\s+(?:a\s+task\s+)?(?:to\s+)?(.+)/i
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private determineOptimalAgent(input: string): string {
    const inputLower = input.toLowerCase();
    
    // Check for frontend/UI keywords
    if (inputLower.includes('frontend') || inputLower.includes('ui') || 
        inputLower.includes('component') || inputLower.includes('react')) {
      return 'builder';
    }
    
    // Check for backend keywords  
    if (inputLower.includes('backend') || inputLower.includes('api') || 
        inputLower.includes('server') || inputLower.includes('database')) {
      return 'builder';
    }
    
    // Check for architecture keywords
    if (inputLower.includes('design') || inputLower.includes('architecture') || 
        inputLower.includes('plan') || inputLower.includes('spec')) {
      return 'architect';
    }
    
    // Check for testing keywords
    if (inputLower.includes('test') || inputLower.includes('validation') || 
        inputLower.includes('quality') || inputLower.includes('review')) {
      return 'validator';
    }
    
    // Default to builder for implementation tasks
    return 'builder';
  }

  private async loadTaskBoard(): Promise<any> {
    try {
      const content = await fs.readFile(this.taskBoardPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load task board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async saveTaskBoard(taskBoard: any): Promise<void> {
    try {
      await fs.writeFile(this.taskBoardPath, JSON.stringify(taskBoard, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save task board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateCommandId(): string {
    return `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Route command to specific agent
  async routeToAgent(command: Command, agentId: string): Promise<CommandResponse> {
    const agent = this.agentCapabilities.get(agentId);
    if (!agent || !agent.isActive) {
      return {
        id: command.id,
        success: false,
        message: `Agent ${agentId} is not available`,
        timestamp: new Date()
      };
    }

    // Emit event for agent to process
    this.emit('routeToAgent', { command, agentId });
    
    return {
      id: command.id,
      success: true,
      message: `Command routed to ${agentId}`,
      executedBy: agentId,
      timestamp: new Date()
    };
  }
}