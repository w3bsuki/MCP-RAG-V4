import React from 'react';
import type { QuickAction } from '../types/chat';

interface QuickActionsProps {
  actions: QuickAction[];
  onActionSelect: (action: QuickAction) => void;
}

const categoryColors = {
  monitoring: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700',
  tasks: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-700',
  agents: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700',
  system: 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-700'
};

export const QuickActions: React.FC<QuickActionsProps> = ({ actions, onActionSelect }) => {
  const groupedActions = actions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  const categoryLabels = {
    monitoring: 'Monitoring',
    tasks: 'Tasks',
    agents: 'Agents',
    system: 'System'
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedActions).map(([category, categoryActions]) => (
        <div key={category}>
          <h5 className="text-sm font-medium text-gray-700 mb-2">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categoryActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onActionSelect(action)}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  categoryColors[action.category]
                }`}
              >
                <div className="flex items-center space-x-2">
                  {action.icon}
                  <span className="font-medium text-sm">{action.label}</span>
                </div>
                <p className="text-xs mt-1 opacity-80">
                  "{action.prompt}"
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};