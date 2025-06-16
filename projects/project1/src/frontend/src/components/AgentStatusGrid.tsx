import React from 'react';
import { 
  CpuChipIcon, 
  DocumentTextIcon, 
  CodeBracketIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import type { AgentMetrics } from '../types/monitoring';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface AgentStatusGridProps {
  agents: AgentMetrics[];
}

const getAgentStatus = (lastActivity: Date): 'active' | 'idle' | 'offline' => {
  const timeDiff = new Date().getTime() - new Date(lastActivity).getTime();
  const minutes = Math.floor(timeDiff / 60000);
  
  if (minutes < 5) return 'active';
  if (minutes < 30) return 'idle';
  return 'offline';
};

const statusColors = {
  active: 'bg-green-100 text-green-800',
  idle: 'bg-yellow-100 text-yellow-800',
  offline: 'bg-gray-100 text-gray-800'
};

const statusDots = {
  active: 'bg-green-400',
  idle: 'bg-yellow-400',
  offline: 'bg-gray-400'
};

const agentNames: Record<string, string> = {
  architect: 'System Architect',
  builder: 'Full-Stack Builder',
  validator: 'Quality Validator'
};

export const AgentStatusGrid: React.FC<AgentStatusGridProps> = ({ agents }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Agent Status</h2>
        <span className="text-sm text-gray-500">{agents.length} agents</span>
      </div>

      <div className="space-y-4">
        {agents.map((agent) => {
          const status = getAgentStatus(agent.lastActivity);
          const name = agentNames[agent.agentId] || agent.agentId;
          
          return (
            <div
              key={agent.agentId}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="flex items-center">
                    <CpuChipIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="font-medium text-gray-900">{name}</h3>
                  </div>
                  <div className="ml-3 flex items-center">
                    <div className={clsx('w-2 h-2 rounded-full mr-1', statusDots[status])}></div>
                    <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', statusColors[status])}>
                      {status}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(agent.lastActivity), { addSuffix: true })}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center text-sm">
                  <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Commits:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {agent.totalCommits}
                  </span>
                </div>
                
                <div className="flex items-center text-sm">
                  <CodeBracketIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Files:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {agent.totalFiles}
                  </span>
                </div>
                
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">+</span>
                  <span className="text-gray-600">Added:</span>
                  <span className="ml-1 font-medium text-green-700">
                    {agent.linesAdded}
                  </span>
                </div>
                
                <div className="flex items-center text-sm">
                  <span className="text-red-500 mr-2">-</span>
                  <span className="text-gray-600">Removed:</span>
                  <span className="ml-1 font-medium text-red-700">
                    {agent.linesRemoved}
                  </span>
                </div>
              </div>

              {agent.filesChanged > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center text-sm text-yellow-700">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    <span>{agent.filesChanged} files with uncommitted changes</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-12">
          <CpuChipIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agents detected</h3>
          <p className="text-gray-500">
            Make sure the monitoring service is running and agents are configured.
          </p>
        </div>
      )}
    </div>
  );
};