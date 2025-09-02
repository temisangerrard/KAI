'use client'

/**
 * CDP Retry Hook
 * 
 * Provides CDP-aware retry mechanisms and manual refresh capabilities
 * for React components
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { CDPRetryService, RetryOptions, CDPRetryResult } from '@/lib/services/cdp-retry-service'
import { WalletErrorService, WalletError, CDPErrorContext } from '@/lib/services/wallet-error-service'

export interface UseCDPRetryOptions extends RetryOptions {
  autoRetryOnNetworkReconnect?: boolean
  showRetryProgress?: boolean
  enableManualRefresh?: boolean
}

export interface UseCDPRetryState {
  isLoading: boolean
  isRetrying: boolean
  error: WalletError | null
  retryCount: number
  nextRetryAt: Date | null
  canRetry: boolean
  canManualRefresh: boolean
}

export interface UseCDPRetryActions {
  execute: <T>(operation: () => Promise<T>, context: CDPErrorContext) => Promise<T>
  retry: () => Promise<void>
  manualRefresh: () => Promise<void>
  clearError: () => void
  abort: () => void
}

export interface UseCDPRetryReturn {
  state: UseCDPRetryState
  actions: UseCDPRetryActions
}

/**
 * Hook for CDP-aware retry mechanisms
 */
export function useCDPRetry(options: UseCDPRetryOptions = {}): UseCDPRetryReturn {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    jitterEnabled = true,
    autoRetryOnNetworkReconnect = true,
    showRetryProgress = true,
    enableManualRefresh = true,
    onRetry,
    onMaxRetriesReached
  } = options

  // State
  const [state, setState] = useState<UseCDPRetryState>({
    isLoading: false,
    isRetrying: false,
    error: null,
    retryCount: 0,
    nextRetryAt: null,
    canRetry: false,
    canManualRefresh: false
  })

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastOperationRef = useRef<{
    operation: () => Promise<any>
    context: CDPErrorContext
  } | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Network status monitoring
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-retry on network reconnect
  useEffect(() => {
    if (autoRetryOnNetworkReconnect && isOnline && state.error && state.canRetry) {
      const timer = setTimeout(() => {
        retry()
      }, 2000) // Wait 2 seconds after reconnection

      return () => clearTimeout(timer)
    }
  }, [isOnline, state.error, state.canRetry, autoRetryOnNetworkReconnect])

  // Execute operation with retry logic
  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    context: CDPErrorContext
  ): Promise<T> => {
    // Store operation for potential retry
    lastOperationRef.current = { operation, context }

    // Create abort controller
    abortControllerRef.current = new AbortController()

    // Reset state
    setState(prev => ({
      ...prev,
      isLoading: true,
      isRetrying: false,
      error: null,
      retryCount: 0,
      nextRetryAt: null,
      canRetry: false,
      canManualRefresh: false
    }))

    try {
      const result = await CDPRetryService.executeWithRetry(
        operation,
        context,
        {
          maxRetries,
          baseDelay,
          maxDelay,
          backoffMultiplier,
          jitterEnabled,
          abortSignal: abortControllerRef.current.signal,
          onRetry: (attempt, error, delay) => {
            setState(prev => ({
              ...prev,
              isRetrying: true,
              error,
              retryCount: attempt,
              nextRetryAt: new Date(Date.now() + delay),
              canRetry: attempt < maxRetries,
              canManualRefresh: enableManualRefresh
            }))

            if (showRetryProgress) {
              console.log(`Retrying operation (${attempt}/${maxRetries}): ${error.userMessage}`)
            }

            if (onRetry) {
              onRetry(attempt, error, delay)
            }
          },
          onMaxRetriesReached: (error) => {
            setState(prev => ({
              ...prev,
              isLoading: false,
              isRetrying: false,
              error,
              canRetry: false,
              canManualRefresh: enableManualRefresh
            }))

            if (onMaxRetriesReached) {
              onMaxRetriesReached(error)
            }
          }
        }
      )

      if (result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isRetrying: false,
          error: null,
          retryCount: 0,
          nextRetryAt: null,
          canRetry: false,
          canManualRefresh: false
        }))

        return result.data!
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isRetrying: false,
          error: result.error || null,
          canRetry: WalletErrorService.shouldRetry(result.error!, result.retryState.attempt),
          canManualRefresh: enableManualRefresh
        }))

        throw result.error
      }
    } catch (error) {
      const walletError = error instanceof Error && 'code' in error 
        ? error as WalletError
        : WalletErrorService.handleApiError(error, context)

      setState(prev => ({
        ...prev,
        isLoading: false,
        isRetrying: false,
        error: walletError,
        canRetry: WalletErrorService.shouldRetry(walletError, prev.retryCount),
        canManualRefresh: enableManualRefresh
      }))

      throw walletError
    }
  }, [
    maxRetries,
    baseDelay,
    maxDelay,
    backoffMultiplier,
    jitterEnabled,
    showRetryProgress,
    enableManualRefresh,
    onRetry,
    onMaxRetriesReached
  ])

  // Retry last operation
  const retry = useCallback(async () => {
    if (!lastOperationRef.current || !state.canRetry) {
      return
    }

    const { operation, context } = lastOperationRef.current

    // Reset retry count for manual retry
    setState(prev => ({ ...prev, retryCount: 0 }))

    try {
      await execute(operation, context)
    } catch (error) {
      // Error is already handled in execute
    }
  }, [state.canRetry, execute])

  // Manual refresh (bypasses cache and retry logic)
  const manualRefresh = useCallback(async () => {
    if (!lastOperationRef.current || !state.canManualRefresh) {
      return
    }

    const { operation, context } = lastOperationRef.current

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      retryCount: 0,
      nextRetryAt: null,
      canRetry: false,
      canManualRefresh: false
    }))

    try {
      // Execute with manual refresh capability
      const result = await CDPRetryService.executeWithManualRefresh(
        operation,
        context,
        () => {
          console.log('Manual refresh triggered')
        }
      )

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null
      }))

      return result
    } catch (error) {
      const walletError = WalletErrorService.handleApiError(error, context)

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: walletError,
        canRetry: WalletErrorService.shouldRetry(walletError, 0),
        canManualRefresh: enableManualRefresh
      }))

      throw walletError
    }
  }, [state.canManualRefresh, enableManualRefresh])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      canRetry: false,
      canManualRefresh: enableManualRefresh && !!lastOperationRef.current
    }))
  }, [enableManualRefresh])

  // Abort current operation
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      isRetrying: false,
      canRetry: false
    }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return {
    state,
    actions: {
      execute,
      retry,
      manualRefresh,
      clearError,
      abort
    }
  }
}

/**
 * Hook for CDP balance operations with retry
 */
export function useCDPBalanceRetry(options?: UseCDPRetryOptions) {
  return useCDPRetry({
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 10000,
    ...options
  })
}

/**
 * Hook for CDP transaction operations with retry
 */
export function useCDPTransactionRetry(options?: UseCDPRetryOptions) {
  return useCDPRetry({
    maxRetries: 2,
    baseDelay: 1000,
    maxDelay: 8000,
    ...options
  })
}

/**
 * Hook for CDP network operations with retry
 */
export function useCDPNetworkRetry(options?: UseCDPRetryOptions) {
  return useCDPRetry({
    maxRetries: 4,
    baseDelay: 1500,
    maxDelay: 12000,
    ...options
  })
}

export default useCDPRetry