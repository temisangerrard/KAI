'use client'

/**
 * Enhanced Wallet State Hook
 * 
 * Provides enhanced loading, error, and retry mechanisms for CDP wallet operations
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useWalletState } from '@/app/wallet/components/wallet-state-manager'

interface RetryConfig {
  maxRetries: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
}

interface EnhancedWalletStateOptions {
  retryConfig?: Partial<RetryConfig>
  cacheTimeout?: number // milliseconds
  staleThreshold?: number // milliseconds
  autoRetryOnNetworkReconnect?: boolean
}

interface OperationState<T> {
  data: T | null
  loading: boolean
  error: any
  lastUpdated: Date | null
  retryCount: number
  isStale: boolean
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
}

export function useEnhancedWalletState<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: EnhancedWalletStateOptions = {}
) {
  const {
    retryConfig = {},
    cacheTimeout = 30000, // 30 seconds
    staleThreshold = 60000, // 1 minute
    autoRetryOnNetworkReconnect = true
  } = options

  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  const walletState = useWalletState()
  
  const [state, setState] = useState<OperationState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    retryCount: 0,
    isStale: false
  })

  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const operationRef = useRef<Promise<T> | null>(null)

  // Calculate if data is stale
  const updateStaleStatus = useCallback(() => {
    if (state.lastUpdated) {
      const isStale = Date.now() - state.lastUpdated.getTime() > staleThreshold
      if (isStale !== state.isStale) {
        setState(prev => ({ ...prev, isStale }))
        if (isStale) {
          walletState.showStaleData(state.lastUpdated, () => execute(true))
        } else {
          walletState.hideStaleData()
        }
      }
    }
  }, [state.lastUpdated, state.isStale, staleThreshold, walletState])

  // Check stale status periodically
  useEffect(() => {
    const interval = setInterval(updateStaleStatus, 10000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [updateStaleStatus])

  // Handle network reconnection
  useEffect(() => {
    if (autoRetryOnNetworkReconnect && walletState.isOnline && state.error) {
      // Retry after network reconnection
      const timer = setTimeout(() => {
        execute(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [walletState.isOnline, state.error, autoRetryOnNetworkReconnect])

  // Calculate retry delay with exponential backoff
  const calculateRetryDelay = useCallback((retryCount: number): number => {
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, retryCount),
      config.maxDelay
    )
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000
  }, [config])

  // Execute operation with retry logic
  const execute = useCallback(async (
    force = false,
    showLoading = true
  ): Promise<T | null> => {
    // Don't execute if already loading (unless forced)
    if (state.loading && !force) {
      return operationRef.current || null
    }

    // Use cached data if available and not stale (unless forced)
    if (!force && state.data && state.lastUpdated) {
      const age = Date.now() - state.lastUpdated.getTime()
      if (age < cacheTimeout) {
        return state.data
      }
    }

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    // Show loading state
    if (showLoading) {
      if (operationName.includes('balance')) {
        walletState.showBalanceLoading(true)
      } else if (operationName.includes('transaction')) {
        walletState.showTransactionLoading(true)
      } else if (operationName.includes('network')) {
        walletState.showNetworkLoading(true)
      }
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }))

    try {
      // Execute the operation
      const promise = operation()
      operationRef.current = promise
      const result = await promise

      // Success - update state
      setState(prev => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        retryCount: 0,
        isStale: false
      }))

      // Hide loading states
      walletState.showBalanceLoading(false)
      walletState.showTransactionLoading(false)
      walletState.showNetworkLoading(false)
      walletState.hideStaleData()

      operationRef.current = null
      return result

    } catch (error) {
      console.error(`${operationName} failed:`, error)

      // Update state with error
      setState(prev => ({
        ...prev,
        loading: false,
        error,
        retryCount: prev.retryCount + 1
      }))

      // Hide loading states
      walletState.showBalanceLoading(false)
      walletState.showTransactionLoading(false)
      walletState.showNetworkLoading(false)

      // Determine if we should retry
      const shouldRetry = state.retryCount < config.maxRetries && isRetryableError(error)

      if (shouldRetry) {
        // Schedule retry with exponential backoff
        const delay = calculateRetryDelay(state.retryCount)
        
        retryTimeoutRef.current = setTimeout(() => {
          execute(true, false) // Retry without showing loading again
        }, delay)

        // Show error with retry info
        walletState.showCDPError(
          {
            ...error,
            userMessage: `${error?.userMessage || error?.message || 'Operation failed'}. Retrying in ${Math.round(delay / 1000)}s...`
          },
          () => execute(true)
        )
      } else {
        // Max retries reached or non-retryable error
        if (operationName.includes('balance')) {
          walletState.showBalanceError(
            error,
            () => execute(true),
            !!state.data // Show cached data if available
          )
        } else if (operationName.includes('transaction')) {
          walletState.showTransactionError(
            error,
            undefined,
            () => execute(true)
          )
        } else if (operationName.includes('network')) {
          walletState.showNetworkError(
            error,
            () => execute(true)
          )
        } else {
          walletState.showCDPError(error, () => execute(true))
        }
      }

      operationRef.current = null
      return null
    }
  }, [
    state.loading,
    state.data,
    state.lastUpdated,
    state.retryCount,
    operation,
    operationName,
    cacheTimeout,
    config,
    walletState,
    calculateRetryDelay
  ])

  // Manual retry function
  const retry = useCallback(() => {
    setState(prev => ({ ...prev, retryCount: 0 }))
    return execute(true)
  }, [execute])

  // Clear error function
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
    walletState.clearErrors()
  }, [walletState])

  // Clear data function
  const clearData = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: null,
      retryCount: 0,
      isStale: false
    })
    walletState.clearErrors()
    walletState.hideStaleData()
  }, [walletState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return {
    ...state,
    execute,
    retry,
    clearError,
    clearData,
    isRetrying: state.retryCount > 0 && state.loading
  }
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  if (!error) return false

  const message = error.message?.toLowerCase() || ''
  const code = error.code?.toLowerCase() || ''

  // Network errors are retryable
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return true
  }

  // Rate limit errors are retryable (with backoff)
  if (message.includes('rate limit') || code === 'rate_limit') {
    return true
  }

  // Temporary server errors are retryable
  if (message.includes('server error') || message.includes('503') || message.includes('502')) {
    return true
  }

  // CDP-specific retryable errors
  if (code === 'timeout' || code === 'network_error' || code === 'temporary_error') {
    return true
  }

  // Non-retryable errors
  if (
    message.includes('invalid address') ||
    message.includes('insufficient funds') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    code === 'invalid_address' ||
    code === 'insufficient_funds' ||
    code === 'unauthorized'
  ) {
    return false
  }

  // Default to retryable for unknown errors
  return true
}

/**
 * Hook for enhanced balance operations
 */
export function useEnhancedBalance(
  balanceOperation: () => Promise<any>,
  options?: EnhancedWalletStateOptions
) {
  return useEnhancedWalletState(balanceOperation, 'balance', options)
}

/**
 * Hook for enhanced transaction operations
 */
export function useEnhancedTransactions(
  transactionOperation: () => Promise<any>,
  options?: EnhancedWalletStateOptions
) {
  return useEnhancedWalletState(transactionOperation, 'transaction', options)
}

/**
 * Hook for enhanced network operations
 */
export function useEnhancedNetwork(
  networkOperation: () => Promise<any>,
  options?: EnhancedWalletStateOptions
) {
  return useEnhancedWalletState(networkOperation, 'network', options)
}