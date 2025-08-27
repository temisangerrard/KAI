/**
 * Token Database Utilities
 * Additional utility functions for token database operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import {
  UserBalance,
  TokenTransaction,
  PredictionCommitment
} from '@/lib/types/token'

/**
 * Balance reconciliation utilities
 */
export class BalanceReconciliationUtils {
  /**
   * Detect balance inconsistencies for a user
   */
  static async detectBalanceInconsistencies(userId: string): Promise<{
    hasInconsistencies: boolean;
    currentBalance: UserBalance | null;
    calculatedBalance: {
      availableTokens: number;
      committedTokens: number;
      totalEarned: number;
      totalSpent: number;
    };
    discrepancies: string[];
  }> {
    try {
      // Get current balance
      const balanceRef = doc(db, 'user_balances', userId)
      const balanceSnap = await getDoc(balanceRef)
      const currentBalance = balanceSnap.exists() ? balanceSnap.data() as UserBalance : null
      
      // Calculate balance from transactions
      const transactionsQuery = query(
        collection(db, 'token_transactions'),
        where('userId', '==', userId),
        where('status', '==', 'completed')
      )
      
      const transactionsSnap = await getDocs(transactionsQuery)
      const transactions = transactionsSnap.docs.map(doc => doc.data() as TokenTransaction)
      
      // Calculate totals from transactions
      let calculatedEarned = 0
      let calculatedSpent = 0
      
      transactions.forEach(tx => {
        if (tx.type === 'purchase' || tx.type === 'win' || tx.type === 'refund') {
          calculatedEarned += Math.abs(tx.amount)
        } else if (tx.type === 'loss') {
          calculatedSpent += Math.abs(tx.amount)
        }
      })
      
      // Get committed tokens from active commitments
      const commitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      )
      
      const commitmentsSnap = await getDocs(commitmentsQuery)
      const activeCommitments = commitmentsSnap.docs.map(doc => doc.data() as PredictionCommitment)
      
      const calculatedCommitted = activeCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      const calculatedAvailable = calculatedEarned - calculatedSpent - calculatedCommitted
      
      const calculatedBalance = {
        availableTokens: Math.max(0, calculatedAvailable),
        committedTokens: calculatedCommitted,
        totalEarned: calculatedEarned,
        totalSpent: calculatedSpent
      }
      
      // Detect discrepancies
      const discrepancies: string[] = []
      let hasInconsistencies = false
      
      if (currentBalance) {
        if (Math.abs(currentBalance.availableTokens - calculatedBalance.availableTokens) > 0.01) {
          discrepancies.push(`Available tokens: stored=${currentBalance.availableTokens}, calculated=${calculatedBalance.availableTokens}`)
          hasInconsistencies = true
        }
        
        if (Math.abs(currentBalance.committedTokens - calculatedBalance.committedTokens) > 0.01) {
          discrepancies.push(`Committed tokens: stored=${currentBalance.committedTokens}, calculated=${calculatedBalance.committedTokens}`)
          hasInconsistencies = true
        }
        
        if (Math.abs(currentBalance.totalEarned - calculatedBalance.totalEarned) > 0.01) {
          discrepancies.push(`Total earned: stored=${currentBalance.totalEarned}, calculated=${calculatedBalance.totalEarned}`)
          hasInconsistencies = true
        }
        
        if (Math.abs(currentBalance.totalSpent - calculatedBalance.totalSpent) > 0.01) {
          discrepancies.push(`Total spent: stored=${currentBalance.totalSpent}, calculated=${calculatedBalance.totalSpent}`)
          hasInconsistencies = true
        }
      } else {
        hasInconsistencies = true
        discrepancies.push('Balance record not found')
      }
      
      return {
        hasInconsistencies,
        currentBalance,
        calculatedBalance,
        discrepancies
      }
    } catch (error) {
      console.error('Error detecting balance inconsistencies:', error)
      throw new Error('Failed to detect balance inconsistencies')
    }
  }

  /**
   * Fix balance inconsistencies for a user
   */
  static async fixBalanceInconsistencies(userId: string): Promise<UserBalance> {
    const inconsistencies = await this.detectBalanceInconsistencies(userId)
    
    if (!inconsistencies.hasInconsistencies) {
      if (inconsistencies.currentBalance) {
        return inconsistencies.currentBalance
      }
      throw new Error('No balance found and no inconsistencies detected')
    }
    
    return await runTransaction(db, async (transaction) => {
      const balanceRef = doc(db, 'user_balances', userId)
      
      const correctedBalance: UserBalance = {
        userId,
        availableTokens: inconsistencies.calculatedBalance.availableTokens,
        committedTokens: inconsistencies.calculatedBalance.committedTokens,
        totalEarned: inconsistencies.calculatedBalance.totalEarned,
        totalSpent: inconsistencies.calculatedBalance.totalSpent,
        lastUpdated: Timestamp.now(),
        version: (inconsistencies.currentBalance?.version || 0) + 1
      }
      
      transaction.set(balanceRef, correctedBalance)
      
      return correctedBalance
    })
  }

  /**
   * Run balance reconciliation for all users
   */
  static async reconcileAllBalances(): Promise<{
    totalUsers: number;
    usersWithInconsistencies: number;
    fixedUsers: number;
    errors: string[];
  }> {
    const results = {
      totalUsers: 0,
      usersWithInconsistencies: 0,
      fixedUsers: 0,
      errors: [] as string[]
    }
    
    try {
      // Get all user balances
      const balancesQuery = query(collection(db, 'user_balances'))
      const balancesSnap = await getDocs(balancesQuery)
      
      results.totalUsers = balancesSnap.size
      
      for (const balanceDoc of balancesSnap.docs) {
        const userId = balanceDoc.id
        
        try {
          const inconsistencies = await this.detectBalanceInconsistencies(userId)
          
          if (inconsistencies.hasInconsistencies) {
            results.usersWithInconsistencies++
            
            try {
              await this.fixBalanceInconsistencies(userId)
              results.fixedUsers++
            } catch (fixError) {
              results.errors.push(`Failed to fix balance for user ${userId}: ${fixError.message}`)
            }
          }
        } catch (checkError) {
          results.errors.push(`Failed to check balance for user ${userId}: ${checkError.message}`)
        }
      }
      
      return results
    } catch (error) {
      console.error('Error during balance reconciliation:', error)
      throw new Error('Failed to reconcile balances')
    }
  }
}

/**
 * Database maintenance utilities
 */
export class DatabaseMaintenanceUtils {
  /**
   * Clean up old completed transactions (keep last 1000 per user)
   */
  static async cleanupOldTransactions(keepCount = 1000): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    const results = {
      deletedCount: 0,
      errors: [] as string[]
    }
    
    try {
      // Get all users with transactions
      const transactionsQuery = query(collection(db, 'token_transactions'))
      const transactionsSnap = await getDocs(transactionsQuery)
      
      // Group transactions by user
      const userTransactions = new Map<string, TokenTransaction[]>()
      
      transactionsSnap.docs.forEach(doc => {
        const transaction = { id: doc.id, ...doc.data() } as TokenTransaction
        
        if (!userTransactions.has(transaction.userId)) {
          userTransactions.set(transaction.userId, [])
        }
        
        userTransactions.get(transaction.userId)!.push(transaction)
      })
      
      // Process each user's transactions
      for (const [userId, transactions] of userTransactions) {
        try {
          // Sort by timestamp (newest first)
          transactions.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
          
          // Keep only the newest transactions
          const transactionsToDelete = transactions.slice(keepCount)
          
          if (transactionsToDelete.length > 0) {
            const batch = writeBatch(db)
            
            transactionsToDelete.forEach(tx => {
              const txRef = doc(db, 'token_transactions', tx.id)
              batch.delete(txRef)
            })
            
            await batch.commit()
            results.deletedCount += transactionsToDelete.length
          }
        } catch (userError) {
          results.errors.push(`Failed to cleanup transactions for user ${userId}: ${userError.message}`)
        }
      }
      
      return results
    } catch (error) {
      console.error('Error during transaction cleanup:', error)
      throw new Error('Failed to cleanup old transactions')
    }
  }

  /**
   * Archive resolved prediction commitments older than specified days
   */
  static async archiveOldCommitments(olderThanDays = 90): Promise<{
    archivedCount: number;
    errors: string[];
  }> {
    const results = {
      archivedCount: 0,
      errors: [] as string[]
    }
    
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate)
      
      // Get old resolved commitments
      const commitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('status', 'in', ['won', 'lost', 'refunded']),
        where('resolvedAt', '<', cutoffTimestamp)
      )
      
      const commitmentsSnap = await getDocs(commitmentsQuery)
      
      if (commitmentsSnap.size > 0) {
        const batch = writeBatch(db)
        
        commitmentsSnap.docs.forEach(doc => {
          // Move to archived collection
          const archivedRef = doc(collection(db, 'prediction_commitments_archived'), doc.id)
          batch.set(archivedRef, { ...doc.data(), archivedAt: Timestamp.now() })
          
          // Delete from main collection
          batch.delete(doc.ref)
        })
        
        await batch.commit()
        results.archivedCount = commitmentsSnap.size
      }
      
      return results
    } catch (error) {
      console.error('Error during commitment archival:', error)
      throw new Error('Failed to archive old commitments')
    }
  }

  /**
   * Generate database health report
   */
  static async generateHealthReport(): Promise<{
    userBalances: {
      totalUsers: number;
      usersWithInconsistencies: number;
      totalTokensInCirculation: number;
    };
    transactions: {
      totalTransactions: number;
      pendingTransactions: number;
      failedTransactions: number;
    };
    commitments: {
      activeCommitments: number;
      resolvedCommitments: number;
      totalTokensCommitted: number;
    };
    packages: {
      activePackages: number;
      inactivePackages: number;
    };
  }> {
    try {
      // User balances stats
      const balancesQuery = query(collection(db, 'user_balances'))
      const balancesSnap = await getDocs(balancesQuery)
      const balances = balancesSnap.docs.map(doc => doc.data() as UserBalance)
      
      let usersWithInconsistencies = 0
      const totalTokensInCirculation = balances.reduce((sum, b) => sum + b.availableTokens + b.committedTokens, 0)
      
      // Check for inconsistencies (sample check)
      for (const balance of balances.slice(0, 10)) {
        const inconsistencies = await BalanceReconciliationUtils.detectBalanceInconsistencies(balance.userId)
        if (inconsistencies.hasInconsistencies) {
          usersWithInconsistencies++
        }
      }
      
      // Transaction stats
      const transactionsQuery = query(collection(db, 'token_transactions'))
      const transactionsSnap = await getDocs(transactionsQuery)
      const transactions = transactionsSnap.docs.map(doc => doc.data() as TokenTransaction)
      
      const pendingTransactions = transactions.filter(tx => tx.status === 'pending').length
      const failedTransactions = transactions.filter(tx => tx.status === 'failed').length
      
      // Commitment stats
      const commitmentsQuery = query(collection(db, 'prediction_commitments'))
      const commitmentsSnap = await getDocs(commitmentsQuery)
      const commitments = commitmentsSnap.docs.map(doc => doc.data() as PredictionCommitment)
      
      const activeCommitments = commitments.filter(c => c.status === 'active').length
      const resolvedCommitments = commitments.filter(c => c.status !== 'active').length
      const totalTokensCommitted = commitments
        .filter(c => c.status === 'active')
        .reduce((sum, c) => sum + c.tokensCommitted, 0)
      
      // Package stats
      const packagesQuery = query(collection(db, 'token_packages'))
      const packagesSnap = await getDocs(packagesQuery)
      const packages = packagesSnap.docs.map(doc => doc.data())
      
      const activePackages = packages.filter(p => p.isActive).length
      const inactivePackages = packages.filter(p => !p.isActive).length
      
      return {
        userBalances: {
          totalUsers: balances.length,
          usersWithInconsistencies,
          totalTokensInCirculation
        },
        transactions: {
          totalTransactions: transactions.length,
          pendingTransactions,
          failedTransactions
        },
        commitments: {
          activeCommitments,
          resolvedCommitments,
          totalTokensCommitted
        },
        packages: {
          activePackages,
          inactivePackages
        }
      }
    } catch (error) {
      console.error('Error generating health report:', error)
      throw new Error('Failed to generate database health report')
    }
  }
}