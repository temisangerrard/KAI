"use client"

import { useState, useEffect, useCallback } from 'react'
import { EfficientDataService } from '@/lib/services/efficient-data-service'
import { TokenTransaction } from '@/lib/types/token'
import { useAuth } from '@/app/auth/auth-context'

interface UseEfficientTransactionsOptions {
  pageSize?: number
  autoLoad?: boolean
}

export function useEfficientTransactions(options: UseEfficientTransactionsOptions = {}) {
  const { user } = useAuth()
  const { pageSize = 20, autoLoad = true } = options
  
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadTransactions = useCallback(async (loadMore: boolean = false) => {
    if (!user?.id) {
      setTransactions([])
      setIsLoading(false)
      setHasMore(false)
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
        setTransactions(prev => {
          const existingIds = new Set(prev.map(t => t.id))
          const newTransactions = result.transactions.filter(t => !existingIds.has(t.id))
          return [...prev, ...newTransactions]
        })
      } else {
        setTransactions(result.transactions)
      }
      
      setHasMore(result.pagination.hasMore)
    } catch (err) {
      console.error('[USE_EFFICIENT_TRANSACTIONS] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
      
      if (!loadMore) {
        setTransactions([])
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [user?.id, pageSize])

  useEffect(() => {
    if (autoLoad) {
      loadTransactions(false)
    }
  }, [autoLoad, loadTransactions])

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && user?.id) {
      loadTransactions(true)
    }
  }, [isLoadingMore, hasMore, user?.id, loadTransactions])

  const refresh = useCallback(async () => {
    if (!user?.id) return
    
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