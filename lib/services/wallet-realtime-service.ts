/**
 * Real-time Wallet Service
 * Provides real-time updates for wallet balance and transactions using Firebase listeners
 */

import {
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { UserBalance, TokenTransaction } from '@/lib/types/token'

export interface WalletRealtimeCallbacks {
  onBalanceUpdate: (balance: UserBalance | null) => void
  onTransactionsUpdate: (transactions: TokenTransaction[]) => void
  onError: (error: Error) => void
}

export class WalletRealtimeService {
  private balanceUnsubscribe: Unsubscribe | null = null
  private transactionsUnsubscribe: Unsubscribe | null = null

  /**
   * Start listening to real-time wallet updates
   */
  startListening(userId: string, callbacks: WalletRealtimeCallbacks): void {
    if (!userId?.trim()) {
      callbacks.onError(new Error('User ID is required'))
      return
    }

    this.stopListening() // Clean up any existing listeners

    try {
      // Listen to balance changes
      const balanceRef = doc(db, 'user_balances', userId)
      this.balanceUnsubscribe = onSnapshot(
        balanceRef,
        (doc) => {
          if (doc.exists()) {
            const balance = doc.data() as UserBalance
            callbacks.onBalanceUpdate(balance)
          } else {
            callbacks.onBalanceUpdate(null)
          }
        },
        (error) => {
          console.error('Error listening to balance changes:', error)
          callbacks.onError(new Error(`Failed to listen to balance updates: ${error.message}`))
        }
      )

      // Listen to transaction changes
      const transactionsQuery = query(
        collection(db, 'token_transactions'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(50)
      )

      this.transactionsUnsubscribe = onSnapshot(
        transactionsQuery,
        (snapshot) => {
          const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as TokenTransaction[]
          callbacks.onTransactionsUpdate(transactions)
        },
        (error) => {
          console.error('Error listening to transaction changes:', error)
          callbacks.onError(new Error(`Failed to listen to transaction updates: ${error.message}`))
        }
      )
    } catch (error) {
      console.error('Error setting up real-time listeners:', error)
      callbacks.onError(new Error(`Failed to setup real-time updates: ${error.message}`))
    }
  }

  /**
   * Stop listening to real-time updates
   */
  stopListening(): void {
    if (this.balanceUnsubscribe) {
      this.balanceUnsubscribe()
      this.balanceUnsubscribe = null
    }

    if (this.transactionsUnsubscribe) {
      this.transactionsUnsubscribe()
      this.transactionsUnsubscribe = null
    }
  }

  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this.balanceUnsubscribe !== null || this.transactionsUnsubscribe !== null
  }
}

/**
 * Hook for using wallet real-time updates in React components
 */
export function useWalletRealtime(
  userId: string | null,
  callbacks: WalletRealtimeCallbacks
): WalletRealtimeService {
  const service = new WalletRealtimeService()

  // Start listening when userId is available
  if (userId) {
    service.startListening(userId, callbacks)
  }

  // Cleanup on unmount
  const cleanup = () => {
    service.stopListening()
  }

  // Return service and cleanup function
  return service
}