'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type: Toast['type'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'], duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const getToastColors = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-terminal-green text-terminal-black border-terminal-green';
      case 'error':
        return 'bg-terminal-red text-terminal-white border-terminal-red';
      case 'warning':
        return 'bg-yellow-500 text-terminal-black border-yellow-500';
      case 'info':
      default:
        return 'bg-terminal-gray text-terminal-black border-terminal-gray';
    }
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              ${getToastColors(toast.type)}
              border-2 p-4 shadow-raised font-mono text-sm
              animate-in slide-in-from-right duration-300
            `}
          >
            <div className="flex items-start justify-between space-x-3">
              <div className="flex items-start space-x-2">
                <span className="font-bold text-lg leading-none">
                  {getIcon(toast.type)}
                </span>
                <div className="flex-1 leading-tight">
                  {toast.message}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeToast(toast.id)}
                className="h-auto p-1 text-xs leading-none hover:bg-black/20"
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}