'use client'

/**
 * Wallet Error States Component
 * 
 * Provides consistent error displays with retry options for CDP failures
 */

import React from 'react'
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Clock, 
  Shield, 
  ExternalLink,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ErrorStateProps {
  className?: string
  title?: string
  message: string
  error?: any
  onRetry?: () => void
  onDismiss?: () => void
  retryable?: boolean
  showDetails?: boolean
}

interface CDPErrorStateProps extends ErrorStateProps {
  errorCode?: string
  isNetworkError?: boolean
  isTimeoutError?: boolean
  isRateLimitError?: boolean
}

/**
 * Generic error state component
 */
export function ErrorState({
  className = '',
  title = 'Something went wrong',
  message,
  error,
  onRetry,
  onDismiss,
  retryable = true,
  showDetails = false
}: ErrorStateProps) {
  return (
    <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-red-800">{title}</h4>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-red-700 mt-1">{message}</p>
          
          {showDetails && error && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                Show technical details
              </summary>
              <pre className="text-xs text-red-600 mt-1 p-2 bg-red-100 rounded overflow-auto">
                {error instanceof Error ? error.message : JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}
          
          {(retryable && onRetry) && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * CDP-specific error state with enhanced error handling
 */
export function CDPErrorState({
  className = '',
  title,
  message,
  error,
  errorCode,
  isNetworkError = false,
  isTimeoutError = false,
  isRateLimitError = false,
  onRetry,
  onDismiss,
  retryable = true,
  showDetails = false
}: CDPErrorStateProps) {
  // Determine error type and customize display
  const getErrorIcon = () => {
    if (isNetworkError) return <WifiOff className="h-4 w-4 text-red-600" />
    if (isTimeoutError) return <Clock className="h-4 w-4 text-red-600" />
    if (isRateLimitError) return <Shield className="h-4 w-4 text-red-600" />
    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  const getErrorTitle = () => {
    if (title) return title
    if (isNetworkError) return 'Network Connection Error'
    if (isTimeoutError) return 'Request Timeout'
    if (isRateLimitError) return 'Rate Limit Exceeded'
    return 'CDP Service Error'
  }

  const getRetryDelay = () => {
    if (isRateLimitError) return 'Please wait a moment before retrying'
    if (isTimeoutError) return 'Check your connection and try again'
    if (isNetworkError) return 'Check your internet connection'
    return null
  }

  return (
    <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            {getErrorIcon()}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-red-800">{getErrorTitle()}</h4>
              {errorCode && (
                <Badge variant="destructive" className="text-xs">
                  {errorCode}
                </Badge>
              )}
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <p className="text-sm text-red-700 mt-1">{message}</p>
          
          {getRetryDelay() && (
            <p className="text-xs text-red-600 mt-1">{getRetryDelay()}</p>
          )}
          
          {showDetails && error && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                Show technical details
              </summary>
              <pre className="text-xs text-red-600 mt-1 p-2 bg-red-100 rounded overflow-auto max-h-32">
                {error instanceof Error ? error.stack || error.message : JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}
          
          {(retryable && onRetry) && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {isRateLimitError ? 'Retry Later' : 'Try Again'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Balance error state
 */
export function BalanceErrorState({
  className = '',
  error,
  onRetry,
  onDismiss,
  showCachedData = false
}: {
  className?: string
  error: any
  onRetry?: () => void
  onDismiss?: () => void
  showCachedData?: boolean
}) {
  const isNetworkError = error?.message?.includes('network') || error?.message?.includes('fetch')
  const isTimeoutError = error?.message?.includes('timeout')
  const isRateLimitError = error?.message?.includes('rate limit') || error?.code === 'RATE_LIMIT'

  return (
    <Card className={`border-red-200 ${className}`}>
      <CardContent className="p-6">
        <CDPErrorState
          title="Failed to Load Balance"
          message={error?.userMessage || error?.message || 'Unable to fetch wallet balance'}
          error={error}
          errorCode={error?.code}
          isNetworkError={isNetworkError}
          isTimeoutError={isTimeoutError}
          isRateLimitError={isRateLimitError}
          onRetry={onRetry}
          onDismiss={onDismiss}
          retryable={true}
          showDetails={true}
        />
        
        {showCachedData && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                Showing cached balance data
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Transaction error state
 */
export function TransactionErrorState({
  className = '',
  error,
  transactionHash,
  onRetry,
  onDismiss,
  isUserOperation = false
}: {
  className?: string
  error: any
  transactionHash?: string
  onRetry?: () => void
  onDismiss?: () => void
  isUserOperation?: boolean
}) {
  const isNetworkError = error?.message?.includes('network') || error?.message?.includes('fetch')
  const isTimeoutError = error?.message?.includes('timeout')
  const isInsufficientFunds = error?.message?.includes('insufficient') || error?.code === 'INSUFFICIENT_FUNDS'

  return (
    <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-red-800">
              {isUserOperation ? 'User Operation Failed' : 'Transaction Failed'}
            </h4>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <p className="text-sm text-red-700 mt-1">
            {error?.userMessage || error?.message || 'Transaction could not be completed'}
          </p>
          
          {transactionHash && (
            <div className="mt-2 p-2 bg-red-100 rounded">
              <p className="text-xs text-red-600">
                Transaction Hash: 
                <span className="font-mono ml-1 break-all">{transactionHash}</span>
              </p>
            </div>
          )}
          
          {isInsufficientFunds && (
            <div className="mt-2 p-2 bg-amber-100 border border-amber-200 rounded">
              <p className="text-xs text-amber-700">
                💡 You may need more tokens to complete this transaction
              </p>
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-3">
            {onRetry && !isInsufficientFunds && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}
            
            {transactionHash && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`https://basescan.org/tx/${transactionHash}`, '_blank')}
                className="text-red-700 hover:bg-red-100"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Network error state
 */
export function NetworkErrorState({
  className = '',
  error,
  onRetry,
  onDismiss
}: {
  className?: string
  error: any
  onRetry?: () => void
  onDismiss?: () => void
}) {
  return (
    <Card className={`border-red-200 ${className}`}>
      <CardContent className="p-6">
        <CDPErrorState
          title="Network Detection Failed"
          message={error?.message || 'Unable to detect network status'}
          error={error}
          isNetworkError={true}
          onRetry={onRetry}
          onDismiss={onDismiss}
          retryable={true}
          showDetails={true}
        />
      </CardContent>
    </Card>
  )
}

/**
 * Success state for completed operations
 */
export function SuccessState({
  className = '',
  title = 'Success',
  message,
  transactionHash,
  blockNumber,
  onDismiss,
  showExplorer = true
}: {
  className?: string
  title?: string
  message: string
  transactionHash?: string
  blockNumber?: number
  onDismiss?: () => void
  showExplorer?: boolean
}) {
  return (
    <div className={`p-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-green-800">{title}</h4>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-green-600 hover:text-green-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <p className="text-sm text-green-700 mt-1">{message}</p>
          
          {blockNumber && (
            <p className="text-xs text-green-600 mt-1">
              Confirmed in block #{blockNumber}
            </p>
          )}
          
          {(transactionHash && showExplorer) && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`https://basescan.org/tx/${transactionHash}`, '_blank')}
                className="text-green-700 hover:bg-green-100"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View on Explorer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}