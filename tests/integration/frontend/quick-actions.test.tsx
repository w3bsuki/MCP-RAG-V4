import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickActions } from '../../../src/frontend/src/components/QuickActions';
import type { QuickAction } from '../../../src/frontend/src/types/chat';

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  CpuChipIcon: () => <div data-testid="cpu-chip-icon" />,
  ClipboardDocumentListIcon: () => <div data-testid="clipboard-icon" />,
  CommandLineIcon: () => <div data-testid="command-line-icon" />,
  Cog6ToothIcon: () => <div data-testid="cog-icon" />
}));

describe('QuickActions Component', () => {
  const user = userEvent.setup();
  const mockOnActionClick = jest.fn();

  const mockActions: QuickAction[] = [
    {
      id: 'status',
      label: 'Show Agent Status',
      prompt: 'Show me the current status of all agents',
      icon: <div data-testid="cpu-chip-icon" />,
      category: 'monitoring'
    },
    {
      id: 'tasks',
      label: 'List Active Tasks',
      prompt: 'What tasks are currently active or pending?',
      icon: <div data-testid="clipboard-icon" />,
      category: 'tasks'
    },
    {
      id: 'create-task',
      label: 'Create New Task',
      prompt: 'I need to create a new task:',
      icon: <div data-testid="command-line-icon" />,
      category: 'tasks'
    },
    {
      id: 'performance',
      label: 'Performance Metrics',
      prompt: 'Show me performance metrics and recent activity',
      icon: <div data-testid="cog-icon" />,
      category: 'monitoring'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all quick action buttons', () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      expect(screen.getByText('Show Agent Status')).toBeInTheDocument();
      expect(screen.getByText('List Active Tasks')).toBeInTheDocument();
      expect(screen.getByText('Create New Task')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });

    it('should render action icons', () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      expect(screen.getAllByTestId('cpu-chip-icon')).toHaveLength(1);
      expect(screen.getAllByTestId('clipboard-icon')).toHaveLength(1);
      expect(screen.getAllByTestId('command-line-icon')).toHaveLength(1);
      expect(screen.getAllByTestId('cog-icon')).toHaveLength(1);
    });

    it('should group actions by category', () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      // Should have monitoring and tasks categories
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    it('should render empty state when no actions provided', () => {
      render(<QuickActions actions={[]} onActionClick={mockOnActionClick} />);
      
      expect(screen.getByText('No quick actions available')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onActionClick when action button is clicked', async () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      const statusButton = screen.getByText('Show Agent Status');
      await user.click(statusButton);
      
      expect(mockOnActionClick).toHaveBeenCalledWith(mockActions[0]);
    });

    it('should call onActionClick with correct action data', async () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      const tasksButton = screen.getByText('List Active Tasks');
      await user.click(tasksButton);
      
      expect(mockOnActionClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tasks',
          label: 'List Active Tasks',
          prompt: 'What tasks are currently active or pending?',
          category: 'tasks'
        })
      );
    });

    it('should handle multiple action clicks', async () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      await user.click(screen.getByText('Show Agent Status'));
      await user.click(screen.getByText('Create New Task'));
      
      expect(mockOnActionClick).toHaveBeenCalledTimes(2);
      expect(mockOnActionClick).toHaveBeenNthCalledWith(1, mockActions[0]);
      expect(mockOnActionClick).toHaveBeenNthCalledWith(2, mockActions[2]);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through actions', async () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      const firstButton = screen.getByText('Show Agent Status');
      firstButton.focus();
      
      expect(firstButton).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('List Active Tasks')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Create New Task')).toHaveFocus();
    });

    it('should trigger action on Enter key press', async () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      const statusButton = screen.getByText('Show Agent Status');
      statusButton.focus();
      
      await user.keyboard('{Enter}');
      
      expect(mockOnActionClick).toHaveBeenCalledWith(mockActions[0]);
    });

    it('should trigger action on Space key press', async () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      const statusButton = screen.getByText('Show Agent Status');
      statusButton.focus();
      
      await user.keyboard(' ');
      
      expect(mockOnActionClick).toHaveBeenCalledWith(mockActions[0]);
    });
  });

  describe('Category Grouping', () => {
    it('should group actions correctly by category', () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      // Check monitoring category
      const monitoringSection = screen.getByText('Monitoring').closest('[data-category="monitoring"]');
      expect(monitoringSection).toContainElement(screen.getByText('Show Agent Status'));
      expect(monitoringSection).toContainElement(screen.getByText('Performance Metrics'));
      
      // Check tasks category
      const tasksSection = screen.getByText('Tasks').closest('[data-category="tasks"]');
      expect(tasksSection).toContainElement(screen.getByText('List Active Tasks'));
      expect(tasksSection).toContainElement(screen.getByText('Create New Task'));
    });

    it('should handle actions without categories', () => {
      const actionsWithoutCategory = [
        { ...mockActions[0], category: undefined },
        { ...mockActions[1], category: 'tasks' }
      ];
      
      render(<QuickActions actions={actionsWithoutCategory} onActionClick={mockOnActionClick} />);
      
      expect(screen.getByText('Show Agent Status')).toBeInTheDocument();
      expect(screen.getByText('List Active Tasks')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should have proper button roles', () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      mockActions.forEach(action => {
        const button = screen.getByText(action.label);
        expect(button).toHaveAttribute('role', 'button');
      });
    });

    it('should support screen readers with descriptive text', () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      const statusButton = screen.getByText('Show Agent Status');
      expect(statusButton).toHaveAttribute('aria-label', 'Show Agent Status - Show me the current status of all agents');
    });
  });

  describe('Styling and Layout', () => {
    it('should apply correct CSS classes for categories', () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      const monitoringButtons = screen.getAllByText(/Show Agent Status|Performance Metrics/);
      const tasksButtons = screen.getAllByText(/List Active Tasks|Create New Task/);
      
      monitoringButtons.forEach(button => {
        expect(button.closest('.monitoring-action')).toBeInTheDocument();
      });
      
      tasksButtons.forEach(button => {
        expect(button.closest('.tasks-action')).toBeInTheDocument();
      });
    });

    it('should maintain consistent button styling', () => {
      render(<QuickActions actions={mockActions} onActionClick={mockOnActionClick} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('quick-action-button');
      });
    });
  });
});