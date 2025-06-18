export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon?: React.ReactNode;
  category: 'monitoring' | 'tasks' | 'agents' | 'system';
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export interface CommandRequest {
  command: string;
  context?: {
    agentId?: string;
    taskId?: string;
    projectPath?: string;
  };
}