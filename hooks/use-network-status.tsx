'use client'

/**
 * Network Status Hook
 * 
 * Custom hook for managing network status and detection in the KAI platform.
 * Provides network information, connection status, and change notifications.
 * Enhanced with CDP integration and error handling.
 */

import { useState, useEffect, useCallback } from 'react'
import { NetworkService, NetworkInfo, NetworkStatus } from '@/lib/services/network-service'
import { WalletErrorService, WalletError } from '@/lib/services/wallet-error-service'

interface UseNetworkStatusOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onNetworkChange?: (network: NetworkInfo | null) => void;
}

interface UseNetworkStatusReturn {
  networkStatus: NetworkStatus;
  isLoading: boolean;
  error: WalletError | null;
  refresh: () => Promise<void>;
  clearError: () => void;
  retry: () => Promise<void>;
  isTestnet: boolean;
  networkName: string | null;
  chainId: number | null;
  retryCount: number;
  canRetry: boolean;
}

/**
 * Hook for managing network status
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}): UseNetworkStatusReturn {
  const {
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute
    onNetworkChange
  } = options

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    connected: false,
    currentNetwork: null,
    lastUpdated: new Date(),
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<WalletError | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  /**
   * Load network status with CDP error handling
   */
  const loadNetworkStatus = useCallback(async () => {
    try {
      setError(null)
      
      // Create error context for network operations
      const context = WalletErrorService.createContext('networkStatusDetection')
      
      const status = await NetworkService.getCurrentNetworkStatus()
      setNetworkStatus(status)
      setRetryCount(0) // Reset retry count on success
      
      // Notify callback of network change
      if (onNetworkChange) {
        onNetworkChange(status.currentNetwork)
      }
    } catch (err) {
      console.error('Failed to load network status:', err)
      
      // Use CDP error handling service
      const context = WalletErrorService.createContext('networkStatusDetection')
      const walletError = WalletErrorService.handleApiError(err, context)
      setError(walletError)
      
      // Log error for debugging
      WalletErrorService.logError(walletError, 'useNetworkStatus.loadNetworkStatus')
    }
  }, [onNetworkChange])

  /**
   * Refresh network status (with loading state)
   */
  const refresh = useCallback(async () => {
    setIsLoading(true)
    NetworkService.clearCache()
    setRetryCount(prev => prev + 1)
    await loadNetworkStatus()
    setIsLoading(false)
  }, [loadNetworkStatus])

  /**
   * Retry with exponential backoff
   */
  const retry = useCallback(async () => {
    if (!error || !WalletErrorService.shouldRetry(error, retryCount)) {
      return
    }

    const strategy = WalletErrorService.getRetryStrategy(error)
    const delay = WalletErrorService.calculateRetryDelay(retryCount, strategy)

    if (delay > 0) {
      setTimeout(() => {
        refresh()
      }, delay)
    } else {
      refresh()
    }
  }, [error, retryCount, refresh])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
    setRetryCount(0)
  }, [])

  /**
   * Initialize hook and set up auto-refresh
   */
  useEffect(() => {
    // Initial load
    refresh()

    // Set up auto-refresh interval
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh && refreshInterval > 0) {
      interval = setInterval(loadNetworkStatus, refreshInterval)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [refresh, loadNetworkStatus, autoRefresh, refreshInterval])

  /**
   * Auto-retry on network reconnection
   */
  useEffect(() => {
    const handleOnline = () => {
      if (error && WalletErrorService.isRetryable(error)) {
        // Wait a moment for connection to stabilize, then retry
        setTimeout(() => {
          refresh()
        }, 2000)
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [error, refresh])

  // Computed values
  const isTestnet = networkStatus.currentNetwork?.isTestnet ?? false
  const networkName = networkStatus.currentNetwork?.displayName ?? null
  const chainId = networkStatus.currentNetwork?.chainId ?? null
  const canRetry = error ? WalletErrorService.shouldRetry(error, retryCount) : false

  return {
    networkStatus,
    isLoading,
    error,
    refresh,
    clearError,
    retry,
    isTestnet,
    networkName,
    chainId,
    retryCount,
    canRetry,
  }
}

export default useNetworkStatus