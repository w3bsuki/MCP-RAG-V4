'use client'

import { useState } from 'react'

interface Alert {
  id: string
  type: 'price' | 'volume' | 'news' | 'technical'
  severity: 'info' | 'warning' | 'critical'
  symbol: string
  message: string
  timestamp: Date
  read: boolean
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'price',
      severity: 'warning',
      symbol: 'BTC',
      message: 'Bitcoin approaching resistance at $46,000',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      read: false,
    },
    {
      id: '2',
      type: 'volume',
      severity: 'info',
      symbol: 'ETH',
      message: 'Ethereum volume increased by 45% in last hour',
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      read: false,
    },
    {
      id: '3',
      type: 'technical',
      severity: 'critical',
      symbol: 'BTC',
      message: 'RSI overbought condition detected',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      read: true,
    },
    {
      id: '4',
      type: 'news',
      severity: 'info',
      symbol: 'SOL',
      message: 'Major partnership announcement affecting Solana',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: true,
    },
  ])

  const markAsRead = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    )
  }

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'price':
        return '💰'
      case 'volume':
        return '📊'
      case 'news':
        return '📰'
      case 'technical':
        return '📈'
      default:
        return '🔔'
    }
  }

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'info':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-800'
    }
  }

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ago`
    }
    return `${minutes}m ago`
  }

  const unreadCount = alerts.filter(alert => !alert.read).length

  return (
    <div className="space-y-4">
      {/* Header with unread count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 mr-2">
              {unreadCount} new
            </span>
          )}
        </span>
        <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
          View all
        </button>
      </div>

      {/* Alerts list */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {alerts.slice(0, 5).map((alert) => (
          <div
            key={alert.id}
            className={`border-l-4 p-3 rounded-r-lg cursor-pointer transition-opacity ${
              getSeverityColor(alert.severity)
            } ${alert.read ? 'opacity-60' : ''}`}
            onClick={() => markAsRead(alert.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2 flex-1">
                <span className="text-lg">{getAlertIcon(alert.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {alert.symbol}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      alert.severity === 'critical' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : alert.severity === 'warning'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {alert.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {getTimeAgo(alert.timestamp)}
                  </p>
                </div>
              </div>
              {!alert.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <button className="px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            Create Alert
          </button>
          <button className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Settings
          </button>
        </div>
      </div>
    </div>
  )
}