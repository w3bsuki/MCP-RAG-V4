import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  CodeBracketIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import type { ActivityEvent, FileChangeEvent, GitCommitEvent } from '../types/monitoring';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

export const ActivityFeed: React.FC = () => {
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/v1/monitoring/activity?limit=20');
        if (response.ok) {
          const data = await response.json();
          setActivity(data);
        }
      } catch (error) {
        console.error('Failed to fetch activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const isCommitEvent = (event: ActivityEvent): event is GitCommitEvent => {
    return 'hash' in event;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'add':
        return <PlusIcon className="h-4 w-4 text-green-500" />;
      case 'change':
        return <PencilIcon className="h-4 w-4 text-yellow-500" />;
      case 'unlink':
        return <TrashIcon className="h-4 w-4 text-red-500" />;
      default:
        return <CodeBracketIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventColor = (event: ActivityEvent) => {
    if (isCommitEvent(event)) {
      return 'border-l-blue-400';
    }
    
    const fileEvent = event as FileChangeEvent;
    switch (fileEvent.type) {
      case 'add':
        return 'border-l-green-400';
      case 'change':
        return 'border-l-yellow-400';
      case 'unlink':
        return 'border-l-red-400';
      default:
        return 'border-l-gray-400';
    }
  };

  const agentNames: Record<string, string> = {
    architect: 'Architect',
    builder: 'Builder',
    validator: 'Validator'
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h2>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="w-3/4 h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <span className="text-sm text-gray-500">Live feed</span>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activity.map((event, index) => {
          const isCommit = isCommitEvent(event);
          const timestamp = new Date(isCommit ? event.date : event.timestamp);
          const agentName = agentNames[event.agentId] || event.agentId;
          
          return (
            <div
              key={`${event.agentId}-${index}`}
              className={clsx(
                'border-l-4 pl-4 py-2',
                getEventColor(event)
              )}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {isCommit ? (
                    <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                  ) : (
                    getFileIcon((event as FileChangeEvent).type)
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {agentName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  
                  {isCommit ? (
                    <div>
                      <p className="text-sm text-gray-600 mt-1">
                        Committed: {event.message.slice(0, 50)}
                        {event.message.length > 50 && '...'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {event.hash.slice(0, 8)} • {event.files.length} files
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mt-1">
                        {(event as FileChangeEvent).type === 'add' && 'Added '}
                        {(event as FileChangeEvent).type === 'change' && 'Modified '}
                        {(event as FileChangeEvent).type === 'unlink' && 'Deleted '}
                        {(event as FileChangeEvent).relativePath}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activity.length === 0 && !loading && (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
          <p className="text-gray-500">
            Activity will appear here as agents work on tasks.
          </p>
        </div>
      )}
    </div>
  );
};