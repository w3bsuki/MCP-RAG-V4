import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import {
  PaperAirplaneIcon,
  CommandLineIcon,
  CpuChipIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import type { QuickAction } from '../types/chat';
import { QuickActions } from './QuickActions';
import { MessageList } from './MessageList';

export const Chat: React.FC = () => {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  const [showQuickActions, setShowQuickActions] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions: QuickAction[] = [
    {
      id: 'status',
      label: 'Show Agent Status',
      prompt: 'Show me the current status of all agents',
      icon: <CpuChipIcon className="h-4 w-4" />,
      category: 'monitoring'
    },
    {
      id: 'tasks',
      label: 'List Active Tasks',
      prompt: 'What tasks are currently active or pending?',
      icon: <ClipboardDocumentListIcon className="h-4 w-4" />,
      category: 'tasks'
    },
    {
      id: 'create-task',
      label: 'Create New Task',
      prompt: 'I need to create a new task:',
      icon: <CommandLineIcon className="h-4 w-4" />,
      category: 'tasks'
    },
    {
      id: 'performance',
      label: 'Performance Metrics',
      prompt: 'Show me performance metrics and recent activity',
      icon: <Cog6ToothIcon className="h-4 w-4" />,
      category: 'monitoring'
    }
  ];

  const handleQuickAction = (action: QuickAction) => {
    const syntheticEvent = {
      target: { value: action.prompt },
      preventDefault: () => {}
    } as React.ChangeEvent<HTMLInputElement>;
    
    handleInputChange(syntheticEvent);
    setShowQuickActions(false);
    
    // Focus input after action selection
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    handleSubmit(e);
    setShowQuickActions(false);
  };

  // Show quick actions when input is empty and no messages
  useEffect(() => {
    setShowQuickActions(input.length === 0 && messages.length === 0);
  }, [input, messages.length]);

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <CommandLineIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium text-gray-900">AI Assistant</h3>
          <span className="text-xs text-gray-500">Ask me about agents, tasks, or system status</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {messages.length === 0 && showQuickActions ? (
          <div className="flex-1 p-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CommandLineIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Welcome to Agent Command Center</h4>
              <p className="text-sm text-gray-500 mb-6">
                I can help you monitor agents, manage tasks, and control the system. Try one of these quick actions:
              </p>
            </div>
            <QuickActions actions={quickActions} onActionSelect={handleQuickAction} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <MessageList messages={messages} isLoading={isLoading} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            Error: {error.message}
          </div>
        )}
        
        <form onSubmit={onSubmit} className="flex space-x-2">
          <input
            ref={inputRef}
            value={input}
            placeholder="Ask about agents, tasks, or system status..."
            onChange={handleInputChange}
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <PaperAirplaneIcon className="h-4 w-4" />
            )}
          </button>
        </form>
        
        {!showQuickActions && messages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {quickActions.slice(0, 2).map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="inline-flex items-center px-2 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                {action.icon}
                <span className="ml-1">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};