'use client'

/**
 * CDP Retry Button Component
 * 
 * Provides manual refresh and retry buttons that work with CDP services
 * Handles different error states and provides appropriate user feedback
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, Wifi, WifiOff, Clock } from 'lucide-react'
import { WalletError } from '@/lib/services/wallet-error-service'

export interface CDPRetryButtonProps {
  isLoading?: boolean
  isRetrying?: boolean
  error?: WalletError | null
  canRetry?: boolean
  canManualRefresh?: boolean
  retryCount?: number
  maxRetries?: number
  nextRetryAt?: Date | null
  onRetry?: () => void
  onManualRefresh?: () => void
  onClearError?: () => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  showRetryCount?: boolean
  showNextRetryTime?: boolean
  className?: string
}

export function CDPRetryButton({
  isLoading = false,
  isRetrying = false,
  error = null,
  canRetry = false,
  canManualRefresh = false,
  retryCount = 0,
  maxRetries = 3,
  nextRetryAt = null,
  onRetry,
  onManualRefresh,
  onClearError,
  variant = 'outline',
  size = 'sm',
  showRetryCount = true,
  showNextRetryTime = true,
  className = ''
}: CDPRetryButtonProps) {
  // Calculate time until next retry
  const timeUntilRetry = nextRetryAt ? Math.max(0, nextRetryAt.getTime() - Date.now()) : 0
  const secondsUntilRetry = Math.ceil(timeUntilRetry / 1000)

  // Determine button state and content
  const getButtonContent = () => {
    if (isLoading && !isRetrying) {
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        text: 'Loading...',
        disabled: true,
        onClick: undefined
      }
    }

    if (isRetrying) {
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        text: showNextRetryTime && secondsUntilRetry > 0 
          ? `Retrying in ${secondsUntilRetry}s...`
          : `Retrying${showRetryCount ? ` (${retryCount}/${maxRetries})` : ''}...`,
        disabled: true,
        onClick: undefined
      }
    }

    if (error) {
      // Network-related errors
      if (error.category === 'network') {
        if (error.code === 'NETWORK_OFFLINE') {
          return {
            icon: <WifiOff className="h-4 w-4" />,
            text: 'Offline',
            disabled: true,
            onClick: undefined
          }
        }

        return {
          icon: <Wifi className="h-4 w-4" />,
          text: canRetry ? 'Retry Connection' : 'Connection Failed',
          disabled: !canRetry,
          onClick: canRetry ? onRetry : undefined
        }
      }

      // CDP-specific errors
      if (error.category === 'cdp') {
        if (error.code === 'CDP_RATE_LIMIT') {
          return {
            icon: <Clock className="h-4 w-4" />,
            text: canRetry ? 'Retry (Rate Limited)' : 'Rate Limited',
            disabled: !canRetry,
            onClick: canRetry ? onRetry : undefined
          }
        }

        if (error.code === 'CDP_AUTH_ERROR') {
          return {
            icon: <AlertCircle className="h-4 w-4" />,
            text: 'Reconnect Wallet',
            disabled: false,
            onClick: onManualRefresh
          }
        }

        return {
          icon: <RefreshCw className="h-4 w-4" />,
          text: canRetry ? 'Retry CDP Call' : 'CDP Error',
          disabled: !canRetry,
          onClick: canRetry ? onRetry : undefined
        }
      }

      // Generic error with retry capability
      if (canRetry) {
        return {
          icon: <RefreshCw className="h-4 w-4" />,
          text: showRetryCount ? `Retry (${retryCount}/${maxRetries})` : 'Retry',
          disabled: false,
          onClick: onRetry
        }
      }

      // Non-retryable error but manual refresh available
      if (canManualRefresh) {
        return {
          icon: <RefreshCw className="h-4 w-4" />,
          text: 'Refresh',
          disabled: false,
          onClick: onManualRefresh
        }
      }

      // Error with no retry options
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        text: 'Error',
        disabled: true,
        onClick: undefined
      }
    }

    // Default refresh button
    return {
      icon: <RefreshCw className="h-4 w-4" />,
      text: 'Refresh',
      disabled: false,
      onClick: onManualRefresh
    }
  }

  const { icon, text, disabled, onClick } = getButtonContent()

  // Determine button styling based on error state
  const getButtonVariant = () => {
    if (error) {
      if (error.severity === 'high' || error.severity === 'critical') {
        return 'destructive'
      }
      if (error.category === 'network') {
        return 'secondary'
      }
    }
    return variant
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={getButtonVariant() as any}
        size={size}
        disabled={disabled}
        onClick={onClick}
        className={`flex items-center gap-2 ${className}`}
        title={error ? error.userMessage : 'Refresh data'}
      >
        {icon}
        {text}
      </Button>

      {/* Clear error button for persistent errors */}
      {error && !isRetrying && !canRetry && onClearError && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearError}
          className="text-gray-500 hover:text-gray-700"
          title="Dismiss error"
        >
          ✕
        </Button>
      )}
    </div>
  )
}

/**
 * Specialized retry button for balance operations
 */
export function CDPBalanceRetryButton(props: Omit<CDPRetryButtonProps, 'maxRetries'>) {
  return <CDPRetryButton {...props} maxRetries={3} />
}

/**
 * Specialized retry button for transaction operations
 */
export function CDPTransactionRetryButton(props: Omit<CDPRetryButtonProps, 'maxRetries'>) {
  return <CDPRetryButton {...props} maxRetries={2} />
}

/**
 * Specialized retry button for network operations
 */
export function CDPNetworkRetryButton(props: Omit<CDPRetryButtonProps, 'maxRetries'>) {
  return <CDPRetryButton {...props} maxRetries={4} />
}

export default CDPRetryButton