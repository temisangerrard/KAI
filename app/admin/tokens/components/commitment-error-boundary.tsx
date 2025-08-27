"use client"

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Database, Wifi } from 'lucide-react';

interface CommitmentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface CommitmentErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

export class CommitmentErrorBoundary extends React.Component<
  CommitmentErrorBoundaryProps,
  CommitmentErrorBoundaryState
> {
  constructor(props: CommitmentErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<CommitmentErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[COMMITMENT_ERROR_BOUNDARY] Component error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message?.includes('fetch') || 
                            this.state.error?.message?.includes('network') ||
                            this.state.error?.message?.includes('Failed to fetch');
      
      const isDatabaseError = this.state.error?.message?.includes('database') ||
                             this.state.error?.message?.includes('Firestore') ||
                             this.state.error?.message?.includes('connection');

      return (
        <Card className="p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              {isNetworkError ? (
                <Wifi className="w-16 h-16 text-red-400" />
              ) : isDatabaseError ? (
                <Database className="w-16 h-16 text-red-400" />
              ) : (
                <AlertTriangle className="w-16 h-16 text-red-400" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {isNetworkError ? 'Network Connection Error' :
                 isDatabaseError ? 'Database Connection Error' :
                 'Something went wrong'}
              </h3>
              
              <p className="text-gray-600 max-w-md mx-auto">
                {isNetworkError ? 
                  'Unable to connect to the server. Please check your internet connection and try again.' :
                 isDatabaseError ?
                  'Unable to connect to the database. The service may be temporarily unavailable.' :
                  'An unexpected error occurred while loading the commitment data.'
                }
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
                    <div className="font-semibold mb-1">Error:</div>
                    <div className="mb-2">{this.state.error.message}</div>
                    {this.state.errorInfo && (
                      <>
                        <div className="font-semibold mb-1">Stack:</div>
                        <div>{this.state.errorInfo.componentStack}</div>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </Button>
            </div>

            {(isNetworkError || isDatabaseError) && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Troubleshooting Tips:</h4>
                <ul className="text-sm text-blue-800 space-y-1 text-left max-w-md mx-auto">
                  {isNetworkError && (
                    <>
                      <li>• Check your internet connection</li>
                      <li>• Disable any VPN or proxy settings</li>
                      <li>• Try refreshing the page</li>
                    </>
                  )}
                  {isDatabaseError && (
                    <>
                      <li>• The database service may be temporarily down</li>
                      <li>• Try again in a few minutes</li>
                      <li>• Contact support if the issue persists</li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useCommitmentErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('[COMMITMENT_ERROR_HANDLER] Handled error:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retryWithErrorHandling = React.useCallback(async (
    operation: () => Promise<void>,
    onSuccess?: () => void
  ) => {
    try {
      setError(null);
      await operation();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Unknown error occurred'));
    }
  }, [handleError]);

  return {
    error,
    handleError,
    clearError,
    retryWithErrorHandling
  };
}