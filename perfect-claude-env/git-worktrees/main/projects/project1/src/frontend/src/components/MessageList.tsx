import React from 'react';
import type { Message } from 'ai';
import { UserIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  return (
    <div className="space-y-4 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex space-x-3 ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {message.role === 'assistant' && (
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <CpuChipIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          )}
          
          <div
            className={`max-w-md px-4 py-2 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-600 text-white ml-auto'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            {message.createdAt && (
              <div
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {format(new Date(message.createdAt), 'HH:mm')}
              </div>
            )}
          </div>
          
          {message.role === 'user' && (
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          )}
        </div>
      ))}
      
      {isLoading && (
        <div className="flex space-x-3 justify-start">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <CpuChipIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="max-w-md px-4 py-2 rounded-lg bg-gray-100 text-gray-900">
            <div className="flex items-center space-x-2">
              <div className="animate-pulse flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs text-gray-500">Thinking...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};