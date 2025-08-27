"use client"

import { useState, useEffect } from 'react'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { UserBalance } from '@/lib/types/token'
import { useAuth } from '@/app/auth/auth-context'

export function useTokenBalance() {
  const { user, isAuthenticated } = useAuth()
  const [balance, setBalance] = useState<UserBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setBalance(null)
      setIsLoading(false)
      return
    }

    const fetchBalance = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('[TOKEN_BALANCE_HOOK] Fetching balance for user:', user.id)
        
        let userBalance = await TokenBalanceService.getUserBalance(user.id)
        console.log('[TOKEN_BALANCE_HOOK] Retrieved balance:', userBalance)
        
        // If no balance exists, create initial balance
        if (!userBalance) {
          console.log('[TOKEN_BALANCE_HOOK] No balance found, creating initial balance')
          userBalance = await TokenBalanceService.createInitialBalance(user.id)
          console.log('[TOKEN_BALANCE_HOOK] Created initial balance:', userBalance)
        }
        
        setBalance(userBalance)
        console.log('[TOKEN_BALANCE_HOOK] Balance set in state:', userBalance)
      } catch (err) {
        console.error('Error fetching token balance:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch balance')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalance()
  }, [user?.id, isAuthenticated])

  const refreshBalance = async () => {
    if (!user?.id) {
      console.log('[TOKEN_BALANCE_HOOK] Cannot refresh - no user ID')
      throw new Error('No user ID available for balance refresh')
    }
    
    try {
      console.log('[TOKEN_BALANCE_HOOK] Refreshing balance for user:', user.id)
      setError(null)
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Balance refresh timeout')), 10000)
      })
      
      const balancePromise = TokenBalanceService.getUserBalance(user.id)
      
      const userBalance = await Promise.race([balancePromise, timeoutPromise])
      console.log('[TOKEN_BALANCE_HOOK] Refreshed balance:', userBalance)
      setBalance(userBalance)
    } catch (err) {
      console.error('[TOKEN_BALANCE_HOOK] Error refreshing balance:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh balance'
      setError(errorMessage)
      throw err // Re-throw so the caller can handle it
    }
  }

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