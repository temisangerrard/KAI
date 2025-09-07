"use client"

import { useState, useEffect, useCallback } from 'react'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { UserBalance } from '@/lib/types/token'
import { useAuth } from '@/app/auth/auth-context'
import { onSnapshot, doc } from 'firebase/firestore'
import { db } from '@/lib/db/database'

export function useTokenBalance() {
  const { user, isAuthenticated } = useAuth()
  const [balance, setBalance] = useState<UserBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    if (!user?.id) return null

    try {
      console.log('[TOKEN_BALANCE_HOOK] Fetching balance for user:', user.id)
      
      let userBalance = await TokenBalanceService.getUserBalance(user.id)
      console.log('[TOKEN_BALANCE_HOOK] Retrieved balance:', userBalance)
      
      // If no balance exists, create initial balance
      if (!userBalance) {
        console.log('[TOKEN_BALANCE_HOOK] No balance found, creating initial balance')
        userBalance = await TokenBalanceService.createInitialBalance(user.id)
        console.log('[TOKEN_BALANCE_HOOK] Created initial balance:', userBalance)
      }
      
      return userBalance
    } catch (err) {
      console.error('Error fetching token balance:', err)
      throw err
    }
  }, [user?.id])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setBalance(null)
      setIsLoading(false)
      return
    }

    let unsubscribe: (() => void) | null = null

    const initializeBalance = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch initial balance
        const userBalance = await fetchBalance()
        if (userBalance) {
          setBalance(userBalance)
        }

        // Set up real-time listener for balance updates
        const balanceRef = doc(db, 'user_balances', user.id)
        unsubscribe = onSnapshot(
          balanceRef,
          (doc) => {
            if (doc.exists()) {
              const updatedBalance = { id: doc.id, ...doc.data() } as UserBalance
              console.log('[TOKEN_BALANCE_HOOK] Real-time balance update:', updatedBalance)
              setBalance(updatedBalance)
            }
          },
          (error) => {
            console.error('[TOKEN_BALANCE_HOOK] Real-time listener error:', error)
            // Don't set error state for listener errors, just log them
          }
        )
        
      } catch (err) {
        console.error('Error initializing token balance:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch balance')
      } finally {
        setIsLoading(false)
      }
    }

    initializeBalance()

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user?.id, isAuthenticated, fetchBalance])

  const refreshBalance = useCallback(async () => {
    if (!user?.id) {
      console.log('[TOKEN_BALANCE_HOOK] Cannot refresh - no user ID')
      throw new Error('No user ID available for balance refresh')
    }
    
    try {
      console.log('[TOKEN_BALANCE_HOOK] Manually refreshing balance for user:', user.id)
      setError(null)
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Balance refresh timeout')), 10000)
      })
      
      const balancePromise = fetchBalance()
      
      const userBalance = await Promise.race([balancePromise, timeoutPromise])
      console.log('[TOKEN_BALANCE_HOOK] Manually refreshed balance:', userBalance)
      if (userBalance) {
        setBalance(userBalance)
      }
    } catch (err) {
      console.error('[TOKEN_BALANCE_HOOK] Error refreshing balance:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh balance'
      setError(errorMessage)
      throw err // Re-throw so the caller can handle it
    }
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