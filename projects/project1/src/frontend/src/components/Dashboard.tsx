import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  CpuChipIcon, 
  ClockIcon, 
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import type { AgentMetrics } from '../types/monitoring';
import { MetricsCard } from './MetricsCard';
import { ActivityFeed } from './ActivityFeed';
import { AgentStatusGrid } from './AgentStatusGrid';
import { Chat } from './Chat';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AgentMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/v1/monitoring/agents`);
        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        console.warn('Failed to fetch metrics, using demo data:', err);
        // Use demo data for deployment preview
        setMetrics([
          {
            agentId: 'architect',
            totalFiles: 12,
            totalCommits: 12,
            lastActivity: new Date(),
            filesChanged: 8,
            linesAdded: 250,
            linesRemoved: 50
          },
          {
            agentId: 'builder',
            totalFiles: 45,
            totalCommits: 28,
            lastActivity: new Date(),
            filesChanged: 32,
            linesAdded: 1200,
            linesRemoved: 300
          },
          {
            agentId: 'validator',
            totalFiles: 20,
            totalCommits: 15,
            lastActivity: new Date(),
            filesChanged: 18,
            linesAdded: 800,
            linesRemoved: 100
          }
        ]);
        setIsDemoMode(true);
        console.warn('Using demo data - backend not connected');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const totalCommits = metrics.reduce((sum, agent) => sum + agent.totalCommits, 0);
  const totalFiles = metrics.reduce((sum, agent) => sum + agent.totalFiles, 0);
  const activeAgents = metrics.filter(agent => 
    new Date().getTime() - new Date(agent.lastActivity).getTime() < 300000 // 5 minutes
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agent Monitoring Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Real-time monitoring of MCP agent activity and performance
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">System Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Demo Data Warning */}
      {isDemoMode && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Demo mode - Backend not connected. Showing sample data for preview.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricsCard
            title="Active Agents"
            value={activeAgents}
            total={metrics.length}
            icon={<CpuChipIcon className="h-6 w-6" />}
            color="primary"
          />
          <MetricsCard
            title="Total Commits"
            value={totalCommits}
            icon={<DocumentTextIcon className="h-6 w-6" />}
            color="success"
          />
          <MetricsCard
            title="Total Files"
            value={totalFiles}
            icon={<ChartBarIcon className="h-6 w-6" />}
            color="warning"
          />
          <MetricsCard
            title="Last Update"
            value={new Date().toLocaleTimeString()}
            icon={<ClockIcon className="h-6 w-6" />}
            color="info"
          />
        </div>

        {/* Agent Status Grid, Activity Feed, and AI Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Agent Status */}
          <div className="lg:col-span-2">
            <AgentStatusGrid agents={metrics} />
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-1">
            <ActivityFeed />
          </div>
        </div>

        {/* AI Chat Interface */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">AI Command Center</h2>
              <p className="text-sm text-gray-500">
                Chat with the AI to monitor agents, manage tasks, and control the system
              </p>
            </div>
            <Chat />
          </div>
        </div>
      </main>
    </div>
  );
};