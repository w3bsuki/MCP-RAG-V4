import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chat } from '../../../src/frontend/src/components/Chat';

// Mock the ai/react hook
jest.mock('ai/react', () => ({
  useChat: jest.fn()
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  PaperAirplaneIcon: () => <div data-testid="paper-airplane-icon" />,
  CommandLineIcon: () => <div data-testid="command-line-icon" />,
  CpuChipIcon: () => <div data-testid="cpu-chip-icon" />,
  ClipboardDocumentListIcon: () => <div data-testid="clipboard-icon" />,
  Cog6ToothIcon: () => <div data-testid="cog-icon" />
}));

describe('Chat Component Integration Tests', () => {
  const mockUseChat = require('ai/react').useChat;
  const user = userEvent.setup();

  const defaultChatState = {
    messages: [],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    isLoading: false,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChat.mockReturnValue(defaultChatState);
  });

  describe('Chat Interface Rendering', () => {
    it('should render chat interface with all essential elements', () => {
      render(<Chat />);
      
      // Check for main UI elements
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
      
      // Check for quick actions
      expect(screen.getByText('Show Agent Status')).toBeInTheDocument();
      expect(screen.getByText('List Active Tasks')).toBeInTheDocument();
      expect(screen.getByText('Create New Task')).toBeInTheDocument();
    });

    it('should display quick actions by default', () => {
      render(<Chat />);
      
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Show Agent Status')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });
  });

  describe('User Input Handling', () => {
    it('should handle text input changes', async () => {
      const mockHandleInputChange = jest.fn();
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        handleInputChange: mockHandleInputChange
      });

      render(<Chat />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, 'Hello, how are you?');
      
      expect(mockHandleInputChange).toHaveBeenCalled();
    });

    it('should handle form submission', async () => {
      const mockHandleSubmit = jest.fn();
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        input: 'Test message',
        handleSubmit: mockHandleSubmit
      });

      render(<Chat />);
      const form = screen.getByRole('form') || screen.getByTestId('chat-form');
      
      fireEvent.submit(form);
      
      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it('should handle Enter key submission', async () => {
      const mockHandleSubmit = jest.fn();
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        input: 'Test message',
        handleSubmit: mockHandleSubmit
      });

      render(<Chat />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '{enter}');
      
      expect(mockHandleSubmit).toHaveBeenCalled();
    });
  });

  describe('Quick Actions Functionality', () => {
    it('should populate input when quick action is clicked', async () => {
      const mockHandleInputChange = jest.fn();
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        handleInputChange: mockHandleInputChange
      });

      render(<Chat />);
      
      const statusButton = screen.getByText('Show Agent Status');
      await user.click(statusButton);
      
      // Should set input to the quick action prompt
      expect(mockHandleInputChange).toHaveBeenCalled();
    });

    it('should hide quick actions after first message', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'user', content: 'Hello' },
          { id: '2', role: 'assistant', content: 'Hi there!' }
        ]
      });

      render(<Chat />);
      
      // Quick actions should be hidden when messages exist
      expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should display chat messages when they exist', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello, what is the agent status?' },
        { id: '2', role: 'assistant', content: 'All agents are currently active and running smoothly.' }
      ];

      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages
      });

      render(<Chat />);
      
      expect(screen.getByText('Hello, what is the agent status?')).toBeInTheDocument();
      expect(screen.getByText('All agents are currently active and running smoothly.')).toBeInTheDocument();
    });

    it('should distinguish between user and assistant messages', () => {
      const messages = [
        { id: '1', role: 'user', content: 'User message' },
        { id: '2', role: 'assistant', content: 'Assistant response' }
      ];

      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages
      });

      render(<Chat />);
      
      const userMessage = screen.getByText('User message');
      const assistantMessage = screen.getByText('Assistant response');
      
      // Check that messages have different styling/classes
      expect(userMessage.closest('[data-role="user"]')).toBeInTheDocument();
      expect(assistantMessage.closest('[data-role="assistant"]')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading indicator when chat is processing', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isLoading: true
      });

      render(<Chat />);
      
      expect(screen.getByTestId('loading-indicator') || screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should display error message when chat error occurs', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        error: new Error('Connection failed')
      });

      render(<Chat />);
      
      expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
    });

    it('should disable input during loading', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isLoading: true
      });

      render(<Chat />);
      
      const input = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: /send/i });
      
      expect(input).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Vercel AI SDK Integration', () => {
    it('should configure chat with correct API endpoint', () => {
      render(<Chat />);
      
      expect(mockUseChat).toHaveBeenCalledWith({
        api: '/api/chat',
        onError: expect.any(Function)
      });
    });

    it('should handle streaming responses correctly', async () => {
      const messages = [
        { id: '1', role: 'user', content: 'Generate a report' },
        { id: '2', role: 'assistant', content: 'Generating report...', createdAt: new Date() }
      ];

      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages,
        isLoading: true
      });

      render(<Chat />);
      
      expect(screen.getByText('Generating report...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-indicator') || screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<Chat />);
      
      const input = screen.getByRole('textbox');
      const button = screen.getByRole('button', { name: /send/i });
      
      expect(input).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', async () => {
      render(<Chat />);
      
      const input = screen.getByRole('textbox');
      
      // Should be able to focus input
      input.focus();
      expect(input).toHaveFocus();
      
      // Should be able to navigate to submit button
      await user.tab();
      const submitButton = screen.getByRole('button', { name: /send/i });
      expect(submitButton).toHaveFocus();
    });
  });
});