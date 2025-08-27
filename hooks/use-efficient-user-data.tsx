"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { EfficientDataService } from '@/lib/services/efficient-data-service'
import { TokenTransaction, PredictionCommitment, UserBalance } from '@/lib/types/token'
import { useAuth } from '@/app/auth/auth-context'

interface UseEfficientBalanceOptions {
  useRealtime?: boolean
  preload?: boolean
}

interface UseEfficientTransactionsOptions {
  pageSize?: number
  preload?: boolean
}

interface UseEfficientCommitmentsOptions {
  pageSize?: number
  useActiveListener?: boolean
  preload?: boolean
}

/**
 * Efficient hook for user balance with caching and optional real-time updates
 */
export function useEfficientBalance(options: UseEfficientBalanceOptions = {}) {
  const { user } = useAuth()
  const { useRealtime = false, preload = true } = options
  
  const [balance, setBalance] = useState<UserBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchBalance = useCallback(async () => {
    if (!user?.id) {
      setBalance(null)
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const userBalance = await EfficientDataService.getUserBalance(user.id, useRealtime)
      setBalance(userBalance)
    } catch (err) {
      console.error('[USE_EFFICIENT_BALANCE] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load balance')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, useRealtime])

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true)
      fetchBalance()
      
      // Preload other data if requested
      if (preload) {
        EfficientDataService.preloadUserData(user.id).catch(console.warn)
      }
    } else {
      setBalance(null)
      setIsLoading(false)
    }
  }, [user?.id, fetchBalance, preload])

  const refreshBalance = useCallback(async () => {
    if (!user?.id) return
    
    // Invalidate cache and refetch
    EfficientDataService.invalidateUserCache(user.id)
    await fetchBalance()
  }, [user?.id, fetchBalance])

  return {
    balance,
    isLoading,
    error,
    refreshBalance,
    // Convenience getters
    availableTokens: balance?.availableTokens || 0,
    committedTokens: balance?.committedTokens || 0,
    totalTokens: (balance?.availableTokens || 0) + (balance?.committedTokens || 0),
    totalEarned: balance?.totalEarned || 0,
    totalSpent: balance?.totalSpent || 0
  }
}

/**
 * Efficient hook for paginated transaction history with caching
 */
export function useEfficientTransactions(options: UseEfficientTransactionsOptions = {}) {
  const { user } = useAuth()
  const { pageSize = 20, preload = true } = options
  
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  
  const loadTransactions = useCallback(async (loadMore: boolean = false) => {
    if (!user?.id) {
      setTransactions([])
      setIsLoading(false)
      return
    }

    try {
      if (loadMore) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }
      setError(null)
      
      const result = await EfficientDataService.getUserTransactions(user.id, pageSize, loadMore)
      
      if (loadMore) {
        setTransactions(prev => [...prev, ...result.transactions])
      } else {
        setTransactions(result.transactions)
      }
      
      setHasMore(result.pagination.hasMore)
    } catch (err) {
      console.error('[USE_EFFICIENT_TRANSACTIONS] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [user?.id, pageSize])

  useEffect(() => {
    if (user?.id) {
      loadTransactions(false)
    } else {
      setTransactions([])
      setIsLoading(false)
    }
  }, [user?.id, loadTransactions])

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && user?.id) {
      loadTransactions(true)
    }
  }, [isLoadingMore, hasMore, user?.id, loadTransactions])

  const refresh = useCallback(async () => {
    if (!user?.id) return
    
    // Reset pagination and invalidate cache
    EfficientDataService.resetPagination(user.id)
    EfficientDataService.invalidateUserCache(user.id)
    await loadTransactions(false)
  }, [user?.id, loadTransactions])

  return {
    transactions,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh
  }
}

/**
 * Efficient hook for user commitments with caching and optional real-time updates
 */
export function useEfficientCommitments(options: UseEfficientCommitmentsOptions = {}) {
  const { user } = useAuth()
  const { pageSize = 20, useActiveListener = false, preload = true } = options
  
  const [commitments, setCommitments] = useState<PredictionCommitment[]>([])
  const [activeCommitments, setActiveCommitments] = useState<PredictionCommitment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  
  const activeListenerRef = useRef<(() => void) | null>(null)

  const loadCommitments = useCallback(async (loadMore: boolean = false) => {
    if (!user?.id) {
      setCommitments([])
      setIsLoading(false)
      return
    }

    try {
      if (loadMore) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }
      setError(null)
      
      const result = await EfficientDataService.getUserCommitments(user.id, pageSize, loadMore)
      
      if (loadMore) {
        setCommitments(prev => [...prev, ...result.commitments])
      } else {
        setCommitments(result.commitments)
      }
      
      setHasMore(result.pagination.hasMore)
    } catch (err) {
      console.error('[USE_EFFICIENT_COMMITMENTS] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load commitments')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [user?.id, pageSize])

  // Set up active commitments listener if requested
  useEffect(() => {
    if (useActiveListener && user?.id) {
      console.log('[USE_EFFICIENT_COMMITMENTS] Setting up active commitments listener')
      
      const cleanup = EfficientDataService.setupActiveCommitmentsListener(
        user.id,
        (activeCommits) => {
          setActiveCommitments(activeCommits)
        }
      )
      
      activeListenerRef.current = cleanup
      
      return () => {
        if (activeListenerRef.current) {
          activeListenerRef.current()
          activeListenerRef.current = null
        }
      }
    }
  }, [useActiveListener, user?.id])

  useEffect(() => {
    if (user?.id) {
      loadCommitments(false)
    } else {
      setCommitments([])
      setActiveCommitments([])
      setIsLoading(false)
    }
  }, [user?.id, loadCommitments])

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && user?.id) {
      loadCommitments(true)
    }
  }, [isLoadingMore, hasMore, user?.id, loadCommitments])

  const refresh = useCallback(async () => {
    if (!user?.id) return
    
    // Reset pagination and invalidate cache
    EfficientDataService.resetPagination(user.id)
    EfficientDataService.invalidateUserCache(user.id)
    await loadCommitments(false)
  }, [user?.id, loadCommitments])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeListenerRef.current) {
        activeListenerRef.current()
      }
    }
  }, [])

  return {
    commitments,
    activeCommitments: useActiveListener ? activeCommitments : [],
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh
  }
}

/**
 * Hook for managing efficient data service lifecycle
 */
export function useEfficientDataLifecycle() {
  const { user } = useAuth()

  // Preload data when user logs in
  useEffect(() => {
    if (user?.id) {
      EfficientDataService.preloadUserData(user.id).catch(console.warn)
    }
  }, [user?.id])

  // Cleanup when user logs out
  useEffect(() => {
    if (!user) {
      EfficientDataService.cleanup()
    }
  }, [user])

  const invalidateCache = useCallback(() => {
    if (user?.id) {
      EfficientDataService.invalidateUserCache(user.id)
    }
  }, [user?.id])

  const getCacheStats = useCallback(() => {
    return EfficientDataService.getCacheStats()
  }, [])

  return {
    invalidateCache,
    getCacheStats
  }
}