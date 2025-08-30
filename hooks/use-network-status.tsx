'use client'

/**
 * Network Status Hook
 * 
 * Custom hook for managing network status and detection in the KAI platform.
 * Provides network information, connection status, and change notifications.
 */

import { useState, useEffect, useCallback } from 'react'
import { NetworkService, NetworkInfo, NetworkStatus } from '@/lib/services/network-service'

interface UseNetworkStatusOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onNetworkChange?: (network: NetworkInfo | null) => void;
}

interface UseNetworkStatusReturn {
  networkStatus: NetworkStatus;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearError: () => void;
  isTestnet: boolean;
  networkName: string | null;
  chainId: number | null;
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
  const [error, setError] = useState<string | null>(null)

  /**
   * Load network status
   */
  const loadNetworkStatus = useCallback(async () => {
    try {
      setError(null)
      const status = await NetworkService.getCurrentNetworkStatus()
      setNetworkStatus(status)
      
      // Notify callback of network change
      if (onNetworkChange) {
        onNetworkChange(status.currentNetwork)
      }
    } catch (err) {
      console.error('Failed to load network status:', err)
      setError(err instanceof Error ? err.message : 'Failed to detect network')
    }
  }, [onNetworkChange])

  /**
   * Refresh network status (with loading state)
   */
  const refresh = useCallback(async () => {
    setIsLoading(true)
    NetworkService.clearCache()
    await loadNetworkStatus()
    setIsLoading(false)
  }, [loadNetworkStatus])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
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

  // Computed values
  const isTestnet = networkStatus.currentNetwork?.isTestnet ?? false
  const networkName = networkStatus.currentNetwork?.displayName ?? null
  const chainId = networkStatus.currentNetwork?.chainId ?? null

  return {
    networkStatus,
    isLoading,
    error,
    refresh,
    clearError,
    isTestnet,
    networkName,
    chainId,
  }
}

export default useNetworkStatus