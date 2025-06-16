import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageList } from '../../../src/frontend/src/components/MessageList';

describe('MessageList Component', () => {
  const mockMessages = [
    {
      id: '1',
      role: 'user' as const,
      content: 'Hello, what is the current agent status?',
      createdAt: new Date('2025-01-16T10:00:00Z')
    },
    {
      id: '2',
      role: 'assistant' as const,
      content: 'All agents are currently active and running smoothly. Here are the details:\n\n- Agent 1: ✅ Active\n- Agent 2: ✅ Active\n- Agent 3: ✅ Active',
      createdAt: new Date('2025-01-16T10:00:05Z')
    },
    {
      id: '3',
      role: 'user' as const,
      content: 'Can you show me the recent tasks?',
      createdAt: new Date('2025-01-16T10:01:00Z')
    }
  ];

  describe('Message Rendering', () => {
    it('should render all messages', () => {
      render(<MessageList messages={mockMessages} />);
      
      expect(screen.getByText('Hello, what is the current agent status?')).toBeInTheDocument();
      expect(screen.getByText(/All agents are currently active/)).toBeInTheDocument();
      expect(screen.getByText('Can you show me the recent tasks?')).toBeInTheDocument();
    });

    it('should render empty state when no messages', () => {
      render(<MessageList messages={[]} />);
      
      expect(screen.getByText('No messages yet. Start a conversation!')).toBeInTheDocument();
    });

    it('should distinguish between user and assistant messages', () => {
      render(<MessageList messages={mockMessages} />);
      
      const userMessages = screen.getAllByTestId('user-message');
      const assistantMessages = screen.getAllByTestId('assistant-message');
      
      expect(userMessages).toHaveLength(2);
      expect(assistantMessages).toHaveLength(1);
    });
  });

  describe('Message Content Formatting', () => {
    it('should render markdown content in assistant messages', () => {
      const markdownMessage = [
        {
          id: '1',
          role: 'assistant' as const,
          content: '## Agent Status\n\n- **Agent 1**: Active\n- **Agent 2**: Inactive\n\n```json\n{"status": "ok"}\n```',
          createdAt: new Date()
        }
      ];

      render(<MessageList messages={markdownMessage} />);
      
      // Should render markdown as HTML
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Agent Status');
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
      expect(screen.getByText(/"status": "ok"/)).toBeInTheDocument();
    });

    it('should preserve line breaks in user messages', () => {
      const multilineMessage = [
        {
          id: '1',
          role: 'user' as const,
          content: 'First line\nSecond line\nThird line',
          createdAt: new Date()
        }
      ];

      render(<MessageList messages={multilineMessage} />);
      
      const messageContent = screen.getByTestId('user-message');
      expect(messageContent).toHaveTextContent('First line\nSecond line\nThird line');
    });

    it('should handle long messages appropriately', () => {
      const longMessage = [
        {
          id: '1',
          role: 'assistant' as const,
          content: 'A'.repeat(1000),
          createdAt: new Date()
        }
      ];

      render(<MessageList messages={longMessage} />);
      
      expect(screen.getByTestId('assistant-message')).toBeInTheDocument();
    });
  });

  describe('Message Metadata', () => {
    it('should display message timestamps', () => {
      render(<MessageList messages={mockMessages} />);
      
      // Should show formatted timestamps
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
      expect(screen.getByText('10:01 AM')).toBeInTheDocument();
    });

    it('should show loading indicator for streaming messages', () => {
      const streamingMessage = [
        {
          id: '1',
          role: 'assistant' as const,
          content: 'Generating response...',
          createdAt: new Date()
        }
      ];

      render(<MessageList messages={streamingMessage} isLoading={true} />);
      
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    });

    it('should show message status indicators', () => {
      const messageWithStatus = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Test message',
          createdAt: new Date(),
          status: 'sent'
        }
      ];

      render(<MessageList messages={messageWithStatus} />);
      
      expect(screen.getByTestId('message-status-sent')).toBeInTheDocument();
    });
  });

  describe('Message Ordering', () => {
    it('should display messages in chronological order', () => {
      render(<MessageList messages={mockMessages} />);
      
      const messages = screen.getAllByTestId(/message/);
      const messageTexts = messages.map(msg => msg.textContent);
      
      expect(messageTexts[0]).toContain('Hello, what is the current agent status?');
      expect(messageTexts[1]).toContain('All agents are currently active');
      expect(messageTexts[2]).toContain('Can you show me the recent tasks?');
    });

    it('should handle messages with same timestamp', () => {
      const sameTimeMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'First message',
          createdAt: new Date('2025-01-16T10:00:00Z')
        },
        {
          id: '2',
          role: 'assistant' as const,
          content: 'Second message',
          createdAt: new Date('2025-01-16T10:00:00Z')
        }
      ];

      render(<MessageList messages={sameTimeMessages} />);
      
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });
  });

  describe('Auto-scrolling', () => {
    it('should scroll to bottom when new messages are added', () => {
      const scrollIntoViewMock = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      const { rerender } = render(<MessageList messages={mockMessages.slice(0, 2)} />);
      
      // Add new message
      rerender(<MessageList messages={mockMessages} />);
      
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('should handle scroll behavior options', () => {
      const scrollIntoViewMock = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      render(<MessageList messages={mockMessages} autoScroll={true} />);
      
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'end'
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for messages', () => {
      render(<MessageList messages={mockMessages} />);
      
      const userMessages = screen.getAllByTestId('user-message');
      const assistantMessages = screen.getAllByTestId('assistant-message');
      
      userMessages.forEach(msg => {
        expect(msg).toHaveAttribute('aria-label', expect.stringContaining('User message'));
      });
      
      assistantMessages.forEach(msg => {
        expect(msg).toHaveAttribute('aria-label', expect.stringContaining('Assistant message'));
      });
    });

    it('should have proper roles for message list', () => {
      render(<MessageList messages={mockMessages} />);
      
      const messageList = screen.getByRole('log');
      expect(messageList).toHaveAttribute('aria-label', 'Chat messages');
    });

    it('should announce new messages to screen readers', () => {
      const { rerender } = render(<MessageList messages={mockMessages.slice(0, 2)} />);
      
      // Add new message
      rerender(<MessageList messages={mockMessages} />);
      
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent('New message received');
    });
  });

  describe('Message Actions', () => {
    it('should show copy button for messages', () => {
      render(<MessageList messages={mockMessages} showActions={true} />);
      
      const copyButtons = screen.getAllByRole('button', { name: /copy/i });
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('should handle copy action', async () => {
      const mockWriteText = jest.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText
        }
      });

      render(<MessageList messages={mockMessages} showActions={true} />);
      
      const copyButton = screen.getAllByRole('button', { name: /copy/i })[0];
      fireEvent.click(copyButton);
      
      expect(mockWriteText).toHaveBeenCalledWith(mockMessages[0].content);
    });

    it('should show regenerate button for assistant messages', () => {
      render(<MessageList messages={mockMessages} showActions={true} />);
      
      const regenerateButtons = screen.getAllByRole('button', { name: /regenerate/i });
      expect(regenerateButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle large number of messages efficiently', () => {
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `Message ${i}`,
        createdAt: new Date(Date.now() + i * 1000)
      }));

      const { container } = render(<MessageList messages={manyMessages} />);
      
      // Should render without performance issues
      expect(container.querySelectorAll('[data-testid*="message"]')).toHaveLength(100);
    });

    it('should implement virtual scrolling for very long conversations', () => {
      const veryManyMessages = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `Message ${i}`,
        createdAt: new Date(Date.now() + i * 1000)
      }));

      render(<MessageList messages={veryManyMessages} virtualScrolling={true} />);
      
      // Should only render visible messages
      const visibleMessages = screen.getAllByTestId(/message/);
      expect(visibleMessages.length).toBeLessThan(100);
    });
  });
});