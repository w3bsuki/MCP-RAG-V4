'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="bg-terminal-black border-terminal-red text-terminal-white">
          <CardHeader>
            <CardTitle className="text-terminal-red font-mono">
              ⚠ SYSTEM ERROR ⚠
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="font-mono text-sm">
              <div className="text-terminal-red mb-2">ERROR CODE: {this.state.error?.name || 'UNKNOWN'}</div>
              <div className="text-terminal-darkgray">
                MESSAGE: {this.state.error?.message || 'An unexpected error occurred'}
              </div>
            </div>
            
            <div className="border-2 border-terminal-darkgray p-3 bg-terminal-black shadow-sunken">
              <div className="text-xs text-terminal-darkgray font-mono">
                ► POSSIBLE CAUSES:<br />
                • API rate limiting (429 error)<br />
                • Network connectivity issues<br />
                • Server maintenance<br />
                ► SOLUTION: Retry or contact support
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="font-mono"
              >
                RETRY
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                variant="destructive"
                size="sm"
                className="font-mono"
              >
                RELOAD PAGE
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook-based error fallback component
export function ErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) {
  return (
    <Card className="bg-terminal-black border-terminal-red text-terminal-white">
      <CardHeader>
        <CardTitle className="text-terminal-red font-mono">
          ⚠ COMPONENT ERROR ⚠
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="font-mono text-sm">
          <div className="text-terminal-red mb-2">ERROR: {error.name}</div>
          <div className="text-terminal-darkgray">MESSAGE: {error.message}</div>
        </div>
        
        <Button 
          onClick={resetErrorBoundary}
          variant="outline"
          size="sm"
          className="font-mono"
        >
          TRY AGAIN
        </Button>
      </CardContent>
    </Card>
  );
}