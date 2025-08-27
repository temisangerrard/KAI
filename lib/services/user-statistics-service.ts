/**
 * Simple User Statistics Service
 * Fetches real user data from Firebase for profile and wallet pages
 */

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { TokenTransaction, PredictionCommitment } from '@/lib/types/token'

export interface UserStatistics {
  predictionsCount: number
  marketsCreated: number
  winRate: number
  tokensEarned: number
  totalSpent: number
  recentTransactions: TokenTransaction[]
  activeCommitments: PredictionCommitment[]
}

export class UserStatisticsService {
  /**
   * Get comprehensive user statistics
   */
  static async getUserStatistics(userId: string): Promise<UserStatistics> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    try {
      console.log('[USER_STATS] Fetching statistics for user:', userId)

      // Fetch user transactions (simplified query to avoid index requirements)
      const transactionsQuery = query(
        collection(db, 'token_transactions'),
        where('userId', '==', userId),
        limit(50)
      )
      
      const transactionsSnap = await getDocs(transactionsQuery)
      const allTransactions = transactionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TokenTransaction[]
      
      // Filter and sort on client side to avoid index requirements
      const transactions = allTransactions
        .filter(tx => tx.status === 'completed')
        .sort((a, b) => {
          const aTime = a.timestamp?.toMillis?.() || 0
          const bTime = b.timestamp?.toMillis?.() || 0
          return bTime - aTime
        })
        .slice(0, 20)

      console.log('[USER_STATS] Found transactions:', transactions.length)

      // Fetch user commitments (simplified query)
      const commitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('userId', '==', userId)
      )
      
      const commitmentsSnap = await getDocs(commitmentsQuery)
      const allCommitments = commitmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[]
      
      // Sort on client side
      const commitments = allCommitments
        .sort((a, b) => {
          const aTime = a.timestamp?.toMillis?.() || 0
          const bTime = b.timestamp?.toMillis?.() || 0
          return bTime - aTime
        })

      console.log('[USER_STATS] Found commitments:', commitments.length)

      // Calculate statistics
      const stats = this.calculateStatistics(transactions, commitments)
      
      console.log('[USER_STATS] Calculated statistics:', stats)

      return {
        ...stats,
        recentTransactions: transactions.slice(0, 10), // Last 10 transactions
        activeCommitments: commitments.filter(c => c.status === 'active')
      }
    } catch (error) {
      console.error('[USER_STATS] Error fetching user statistics:', error)
      throw new Error(`Failed to fetch user statistics: ${error.message}`)
    }
  }

  /**
   * Get recent transactions for wallet page
   */
  static async getRecentTransactions(userId: string, limit: number = 20): Promise<TokenTransaction[]> {
    if (!userId?.trim()) {
      return []
    }

    try {
      const transactionsQuery = query(
        collection(db, 'token_transactions'),
        where('userId', '==', userId)
      )
      
      const transactionsSnap = await getDocs(transactionsQuery)
      const allTransactions = transactionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TokenTransaction[]
      
      // Filter and sort on client side
      const transactions = allTransactions
        .filter(tx => tx.status === 'completed')
        .sort((a, b) => {
          const aTime = a.timestamp?.toMillis?.() || 0
          const bTime = b.timestamp?.toMillis?.() || 0
          return bTime - aTime
        })
        .slice(0, limit)

      console.log('[USER_STATS] Fetched recent transactions:', transactions.length)
      return transactions
    } catch (error) {
      console.error('[USER_STATS] Error fetching transactions:', error)
      return []
    }
  }

  /**
   * Get user commitments
   */
  static async getUserCommitments(userId: string): Promise<PredictionCommitment[]> {
    if (!userId?.trim()) {
      return []
    }

    try {
      const commitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('userId', '==', userId)
      )
      
      const commitmentsSnap = await getDocs(commitmentsQuery)
      const allCommitments = commitmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[]
      
      // Sort on client side
      const commitments = allCommitments
        .sort((a, b) => {
          const aTime = a.timestamp?.toMillis?.() || 0
          const bTime = b.timestamp?.toMillis?.() || 0
          return bTime - aTime
        })

      console.log('[USER_STATS] Fetched user commitments:', commitments.length)
      return commitments
    } catch (error) {
      console.error('[USER_STATS] Error fetching commitments:', error)
      return []
    }
  }

  /**
   * Calculate user statistics from transactions and commitments
   */
  private static calculateStatistics(
    transactions: TokenTransaction[], 
    commitments: PredictionCommitment[]
  ): Omit<UserStatistics, 'recentTransactions' | 'activeCommitments'> {
    
    // Count predictions (commitments)
    const predictionsCount = commitments.length

    // Calculate tokens earned and spent
    let tokensEarned = 0
    let totalSpent = 0

    transactions.forEach(tx => {
      if (tx.type === 'purchase' || tx.type === 'win' || tx.type === 'refund') {
        tokensEarned += Math.abs(tx.amount)
      } else if (tx.type === 'commit' || tx.type === 'loss') {
        totalSpent += Math.abs(tx.amount)
      }
    })

    // Calculate win rate from commitments
    const resolvedCommitments = commitments.filter(c => c.status === 'won' || c.status === 'lost')
    const wonCommitments = commitments.filter(c => c.status === 'won')
    const winRate = resolvedCommitments.length > 0 
      ? Math.round((wonCommitments.length / resolvedCommitments.length) * 100)
      : 0

    // For now, set markets created to 0 (we can implement this later)
    const marketsCreated = 0

    return {
      predictionsCount,
      marketsCreated,
      winRate,
      tokensEarned,
      totalSpent
    }
  }

  /**
   * Format transaction for display
   */
  static formatTransactionForDisplay(transaction: TokenTransaction) {
    const formatDate = (timestamp: Timestamp) => {
      const date = timestamp.toDate()
      const now = new Date()
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
      
      if (diffInHours < 1) return 'Just now'
      if (diffInHours < 24) return `${diffInHours} hours ago`
      if (diffInHours < 48) return '1 day ago'
      return `${Math.floor(diffInHours / 24)} days ago`
    }

    const getTransactionDescription = (tx: TokenTransaction) => {
      switch (tx.type) {
        case 'purchase':
          return 'Token purchase'
        case 'commit':
          return tx.metadata?.marketTitle 
            ? `Backed opinion on ${tx.metadata.marketTitle}`
            : 'Backed opinion on market'
        case 'win':
          return tx.metadata?.marketTitle 
            ? `Won prediction: ${tx.metadata.marketTitle}`
            : 'Won prediction'
        case 'loss':
          return tx.metadata?.marketTitle 
            ? `Lost prediction: ${tx.metadata.marketTitle}`
            : 'Lost prediction'
        case 'refund':
          return 'Refund received'
        default:
          return 'Transaction'
      }
    }

    const getTransactionIcon = (type: string) => {
      switch (type) {
        case 'purchase':
          return 'plus'
        case 'commit':
          return 'arrow-down'
        case 'win':
          return 'arrow-up'
        case 'loss':
          return 'arrow-down'
        case 'refund':
          return 'arrow-up'
        default:
          return 'circle'
      }
    }

    return {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      description: getTransactionDescription(transaction),
      date: formatDate(transaction.timestamp),
      status: transaction.status,
      icon: getTransactionIcon(transaction.type),
      isPositive: ['purchase', 'win', 'refund'].includes(transaction.type)
    }
  }
}