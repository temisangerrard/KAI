"use client"

import { useState, useEffect } from 'react'
import { UserStatisticsService, UserStatistics } from '@/lib/services/user-statistics-service'
import { useAuth } from '@/app/auth/auth-context'

export function useUserStatistics() {
  const { user, isAuthenticated } = useAuth()
  const [statistics, setStatistics] = useState<UserStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Fix hydration mismatch by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !isAuthenticated || !user?.id) {
      setStatistics(null)
      setIsLoading(false)
      return
    }

    const fetchStatistics = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('[USER_STATS_HOOK] Fetching statistics for user:', user.id)
        const stats = await UserStatisticsService.getUserStatistics(user.id)
        console.log('[USER_STATS_HOOK] Retrieved statistics:', stats)
        
        setStatistics(stats)
      } catch (err) {
        console.error('[USER_STATS_HOOK] Error fetching statistics:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
        
        // Set default empty statistics on error
        setStatistics({
          predictionsCount: 0,
          marketsCreated: 0,
          winRate: 0,
          tokensEarned: 0,
          totalSpent: 0,
          recentTransactions: [],
          activeCommitments: []
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchStatistics()
  }, [user?.id, isAuthenticated, isClient])

  const refreshStatistics = async () => {
    if (!user?.id) {
      console.log('[USER_STATS_HOOK] Cannot refresh - no user ID')
      return
    }
    
    try {
      console.log('[USER_STATS_HOOK] Refreshing statistics for user:', user.id)
      setError(null)
      const stats = await UserStatisticsService.getUserStatistics(user.id)
      console.log('[USER_STATS_HOOK] Refreshed statistics:', stats)
      setStatistics(stats)
    } catch (err) {
      console.error('[USER_STATS_HOOK] Error refreshing statistics:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh statistics')
    }
  }

  return {
    statistics,
    isLoading: isLoading || !isClient,
    error,
    refreshStatistics,
    // Convenience getters - always return consistent values
    predictionsCount: isClient && statistics ? statistics.predictionsCount : 0,
    marketsCreated: isClient && statistics ? statistics.marketsCreated : 0,
    winRate: isClient && statistics ? statistics.winRate : 0,
    tokensEarned: isClient && statistics ? statistics.tokensEarned : 0,
    totalSpent: isClient && statistics ? statistics.totalSpent : 0,
    recentTransactions: isClient && statistics ? statistics.recentTransactions : [],
    activeCommitments: isClient && statistics ? statistics.activeCommitments : []
  }
}