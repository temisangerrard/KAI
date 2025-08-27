/**
 * Enhanced Token Balance Management Service
 * Provides comprehensive balance operations with atomic transactions and reconciliation
 */

import {
  doc,
  getDoc,
  runTransaction,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  increment
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import {
  UserBalance,
  TokenTransaction,
  PredictionCommitment,
  BalanceUpdateRequest
} from '@/lib/types/token'

export interface BalanceValidationResult {
  isValid: boolean
  currentBalance: UserBalance | null
  requiredAmount: number
  availableAmount: number
  errorMessage?: string
}

export interface BalanceReconciliationResult {
  userId: string
  hadInconsistencies: boolean
  previousBalance: UserBalance | null
  reconciledBalance: UserBalance
  discrepancies: string[]
}

export interface AtomicBalanceOperation {
  userId: string
  amount: number
  type: TokenTransaction['type']
  relatedId?: string
  metadata?: Record<string, any>
  validateSufficientFunds?: boolean
}

/**
 * Enhanced Token Balance Service with atomic operations and reconciliation
 */
export class TokenBalanceService {
  private static readonly COLLECTIONS = {
    userBalances: 'user_balances',
    tokenTransactions: 'token_transactions',
    predictionCommitments: 'prediction_commitments'
  } as const

  /**
   * Get user's current balance with error handling
   */
  static async getUserBalance(userId: string): Promise<UserBalance | null> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    try {
      const balanceRef = doc(db, this.COLLECTIONS.userBalances, userId)
      const balanceSnap = await getDoc(balanceRef)
      
      if (balanceSnap.exists()) {
        const balance = balanceSnap.data() as UserBalance
        
        // Validate balance data integrity
        if (balance.availableTokens < 0 || balance.committedTokens < 0) {
          console.warn(`Invalid balance detected for user ${userId}:`, balance)
          return await this.reconcileUserBalance(userId)
        }
        
        return balance
      }
      
      // If no balance exists, create initial balance
      console.log(`No balance found for user ${userId}, creating initial balance`)
      return await this.createInitialBalance(userId)
    } catch (error) {
      console.error('Error getting user balance:', error)
      throw new Error(`Failed to retrieve balance for user ${userId}: ${error.message}`)
    }
  }

  /**
   * Create initial balance for new user
   */
  static async createInitialBalance(userId: string): Promise<UserBalance> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    const initialBalance: UserBalance = {
      userId,
      availableTokens: 1000, // Give new users 1000 tokens to start
      committedTokens: 0,
      totalEarned: 1000, // Count the initial tokens as earned
      totalSpent: 0,
      lastUpdated: Timestamp.now(),
      version: 1
    }

    try {
      return await runTransaction(db, async (transaction) => {
        const balanceRef = doc(db, this.COLLECTIONS.userBalances, userId)
        const existingBalance = await transaction.get(balanceRef)
        
        if (existingBalance.exists()) {
          return existingBalance.data() as UserBalance
        }
        
        transaction.set(balanceRef, initialBalance)
        return initialBalance
      })
    } catch (error) {
      console.error('Error creating initial balance:', error)
      throw new Error(`Failed to create initial balance for user ${userId}`)
    }
  }

  /**
   * Validate if user has sufficient balance for a transaction
   */
  static async validateSufficientBalance(
    userId: string, 
    requiredAmount: number
  ): Promise<BalanceValidationResult> {
    if (!userId?.trim()) {
      return {
        isValid: false,
        currentBalance: null,
        requiredAmount,
        availableAmount: 0,
        errorMessage: 'User ID is required'
      }
    }

    if (requiredAmount <= 0) {
      return {
        isValid: false,
        currentBalance: null,
        requiredAmount,
        availableAmount: 0,
        errorMessage: 'Required amount must be positive'
      }
    }

    try {
      const balance = await this.getUserBalance(userId)
      
      if (!balance) {
        return {
          isValid: false,
          currentBalance: null,
          requiredAmount,
          availableAmount: 0,
          errorMessage: 'User balance not found'
        }
      }

      const isValid = balance.availableTokens >= requiredAmount

      return {
        isValid,
        currentBalance: balance,
        requiredAmount,
        availableAmount: balance.availableTokens,
        errorMessage: isValid ? undefined : 'Insufficient available tokens'
      }
    } catch (error) {
      console.error('Error validating balance:', error)
      return {
        isValid: false,
        currentBalance: null,
        requiredAmount,
        availableAmount: 0,
        errorMessage: 'Failed to validate balance'
      }
    }
  }

  /**
   * Perform atomic balance update with rollback capability
   */
  static async updateBalanceAtomic(request: BalanceUpdateRequest): Promise<UserBalance> {
    const { userId, amount, type, relatedId, metadata } = request

    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    if (amount === 0) {
      throw new Error('Amount cannot be zero')
    }

    try {
      return await runTransaction(db, async (transaction) => {
        const balanceRef = doc(db, this.COLLECTIONS.userBalances, userId)
        const balanceSnap = await transaction.get(balanceRef)
        
        let currentBalance: UserBalance
        
        if (balanceSnap.exists()) {
          currentBalance = balanceSnap.data() as UserBalance
        } else {
          // Create initial balance if doesn't exist
          currentBalance = {
            userId,
            availableTokens: 0,
            committedTokens: 0,
            totalEarned: 0,
            totalSpent: 0,
            lastUpdated: Timestamp.now(),
            version: 1
          }
        }
        
        // Calculate new balance based on transaction type
        const balanceBefore = currentBalance.availableTokens
        const newBalance = this.calculateNewBalance(currentBalance, amount, type)
        
        // Validate the new balance
        if (newBalance.availableTokens < 0 || newBalance.committedTokens < 0) {
          throw new Error(`Invalid balance operation: would result in negative balance`)
        }
        
        // Update balance with optimistic locking
        const updatedBalance: UserBalance = {
          ...newBalance,
          lastUpdated: Timestamp.now(),
          version: currentBalance.version + 1
        }
        
        transaction.set(balanceRef, updatedBalance)
        
        // Create transaction record
        const transactionRef = doc(collection(db, this.COLLECTIONS.tokenTransactions))
        const tokenTransaction: Omit<TokenTransaction, 'id'> = {
          userId,
          type,
          amount,
          balanceBefore,
          balanceAfter: updatedBalance.availableTokens,
          relatedId,
          metadata: metadata || {},
          timestamp: Timestamp.now(),
          status: 'completed'
        }
        
        transaction.set(transactionRef, tokenTransaction)
        
        return updatedBalance
      })
    } catch (error) {
      console.error('Error updating balance atomically:', error)
      throw new Error(`Failed to update balance for user ${userId}: ${error.message}`)
    }
  }

  /**
   * Perform multiple balance operations atomically
   */
  static async updateMultipleBalancesAtomic(
    operations: AtomicBalanceOperation[]
  ): Promise<UserBalance[]> {
    if (!operations.length) {
      throw new Error('No operations provided')
    }

    try {
      return await runTransaction(db, async (transaction) => {
        const results: UserBalance[] = []
        
        // Validate all operations first
        for (const operation of operations) {
          if (operation.validateSufficientFunds) {
            const balanceRef = doc(db, this.COLLECTIONS.userBalances, operation.userId)
            const balanceSnap = await transaction.get(balanceRef)
            
            if (balanceSnap.exists()) {
              const balance = balanceSnap.data() as UserBalance
              if (balance.availableTokens < Math.abs(operation.amount)) {
                throw new Error(`Insufficient funds for user ${operation.userId}`)
              }
            } else if (operation.amount < 0) {
              throw new Error(`Cannot debit from non-existent balance for user ${operation.userId}`)
            }
          }
        }
        
        // Execute all operations
        for (const operation of operations) {
          const balanceRef = doc(db, this.COLLECTIONS.userBalances, operation.userId)
          const balanceSnap = await transaction.get(balanceRef)
          
          let currentBalance: UserBalance
          
          if (balanceSnap.exists()) {
            currentBalance = balanceSnap.data() as UserBalance
          } else {
            currentBalance = {
              userId: operation.userId,
              availableTokens: 0,
              committedTokens: 0,
              totalEarned: 0,
              totalSpent: 0,
              lastUpdated: Timestamp.now(),
              version: 1
            }
          }
          
          const balanceBefore = currentBalance.availableTokens
          const newBalance = this.calculateNewBalance(currentBalance, operation.amount, operation.type)
          
          const updatedBalance: UserBalance = {
            ...newBalance,
            lastUpdated: Timestamp.now(),
            version: currentBalance.version + 1
          }
          
          transaction.set(balanceRef, updatedBalance)
          
          // Create transaction record
          const transactionRef = doc(collection(db, this.COLLECTIONS.tokenTransactions))
          const tokenTransaction: Omit<TokenTransaction, 'id'> = {
            userId: operation.userId,
            type: operation.type,
            amount: operation.amount,
            balanceBefore,
            balanceAfter: updatedBalance.availableTokens,
            relatedId: operation.relatedId,
            metadata: operation.metadata || {},
            timestamp: Timestamp.now(),
            status: 'completed'
          }
          
          transaction.set(transactionRef, tokenTransaction)
          results.push(updatedBalance)
        }
        
        return results
      })
    } catch (error) {
      console.error('Error updating multiple balances atomically:', error)
      throw new Error(`Failed to update multiple balances: ${error.message}`)
    }
  }

  /**
   * Calculate new balance based on transaction type
   */
  private static calculateNewBalance(
    currentBalance: UserBalance,
    amount: number,
    type: TokenTransaction['type']
  ): UserBalance {
    let newAvailableTokens = currentBalance.availableTokens
    let newCommittedTokens = currentBalance.committedTokens
    let newTotalEarned = currentBalance.totalEarned
    let newTotalSpent = currentBalance.totalSpent
    
    switch (type) {
      case 'purchase':
        newAvailableTokens += Math.abs(amount)
        newTotalEarned += Math.abs(amount)
        break
      case 'commit':
        const commitAmount = Math.abs(amount)
        if (newAvailableTokens < commitAmount) {
          throw new Error('Insufficient available tokens for commitment')
        }
        newAvailableTokens -= commitAmount
        newCommittedTokens += commitAmount
        break
      case 'win':
        const winAmount = Math.abs(amount)
        // Assume the committed amount is being returned plus winnings
        newAvailableTokens += winAmount
        newTotalEarned += winAmount
        break
      case 'loss':
        const lossAmount = Math.abs(amount)
        newTotalSpent += lossAmount
        break
      case 'refund':
        const refundAmount = Math.abs(amount)
        newAvailableTokens += refundAmount
        break
      default:
        throw new Error(`Unknown transaction type: ${type}`)
    }
    
    return {
      ...currentBalance,
      availableTokens: Math.max(0, newAvailableTokens),
      committedTokens: Math.max(0, newCommittedTokens),
      totalEarned: newTotalEarned,
      totalSpent: newTotalSpent
    }
  }

  /**
   * Reconcile user balance by recalculating from transaction history
   */
  static async reconcileUserBalance(userId: string): Promise<BalanceReconciliationResult> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    try {
      return await runTransaction(db, async (transaction) => {
        // Get current balance
        const balanceRef = doc(db, this.COLLECTIONS.userBalances, userId)
        const balanceSnap = await transaction.get(balanceRef)
        
        const previousBalance = balanceSnap.exists() ? balanceSnap.data() as UserBalance : null
        
        // Calculate actual balance from transactions
        const transactionsQuery = query(
          collection(db, this.COLLECTIONS.tokenTransactions),
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
          collection(db, this.COLLECTIONS.predictionCommitments),
          where('userId', '==', userId),
          where('status', '==', 'active')
        )
        
        const commitmentsSnap = await getDocs(commitmentsQuery)
        const activeCommitments = commitmentsSnap.docs.map(doc => doc.data() as PredictionCommitment)
        
        const calculatedCommitted = activeCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
        const calculatedAvailable = Math.max(0, calculatedEarned - calculatedSpent - calculatedCommitted)
        
        // Detect discrepancies
        const discrepancies: string[] = []
        let hadInconsistencies = false
        
        if (previousBalance) {
          if (Math.abs(previousBalance.availableTokens - calculatedAvailable) > 0.01) {
            discrepancies.push(`Available tokens: stored=${previousBalance.availableTokens}, calculated=${calculatedAvailable}`)
            hadInconsistencies = true
          }
          
          if (Math.abs(previousBalance.committedTokens - calculatedCommitted) > 0.01) {
            discrepancies.push(`Committed tokens: stored=${previousBalance.committedTokens}, calculated=${calculatedCommitted}`)
            hadInconsistencies = true
          }
          
          if (Math.abs(previousBalance.totalEarned - calculatedEarned) > 0.01) {
            discrepancies.push(`Total earned: stored=${previousBalance.totalEarned}, calculated=${calculatedEarned}`)
            hadInconsistencies = true
          }
          
          if (Math.abs(previousBalance.totalSpent - calculatedSpent) > 0.01) {
            discrepancies.push(`Total spent: stored=${previousBalance.totalSpent}, calculated=${calculatedSpent}`)
            hadInconsistencies = true
          }
        } else {
          hadInconsistencies = true
          discrepancies.push('Balance record not found')
        }
        
        // Create reconciled balance
        const reconciledBalance: UserBalance = {
          userId,
          availableTokens: calculatedAvailable,
          committedTokens: calculatedCommitted,
          totalEarned: calculatedEarned,
          totalSpent: calculatedSpent,
          lastUpdated: Timestamp.now(),
          version: (previousBalance?.version || 0) + 1
        }
        
        transaction.set(balanceRef, reconciledBalance)
        
        return {
          userId,
          hadInconsistencies,
          previousBalance,
          reconciledBalance,
          discrepancies
        }
      })
    } catch (error) {
      console.error('Error reconciling user balance:', error)
      throw new Error(`Failed to reconcile balance for user ${userId}: ${error.message}`)
    }
  }

  /**
   * Get balance summary for multiple users
   */
  static async getBalanceSummary(userIds: string[]): Promise<UserBalance[]> {
    if (!userIds.length) {
      return []
    }

    const balances: UserBalance[] = []
    
    try {
      // Process in batches to avoid Firestore limitations
      const batchSize = 10
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (userId) => {
          try {
            return await this.getUserBalance(userId)
          } catch (error) {
            console.warn(`Failed to get balance for user ${userId}:`, error)
            return null
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        balances.push(...batchResults.filter(Boolean) as UserBalance[])
      }
      
      return balances
    } catch (error) {
      console.error('Error getting balance summary:', error)
      throw new Error('Failed to retrieve balance summary')
    }
  }

  /**
   * Rollback a transaction (create compensating transaction)
   */
  static async rollbackTransaction(transactionId: string, reason: string): Promise<UserBalance> {
    if (!transactionId?.trim()) {
      throw new Error('Transaction ID is required')
    }

    try {
      // Get the original transaction
      const transactionRef = doc(db, this.COLLECTIONS.tokenTransactions, transactionId)
      const transactionSnap = await getDoc(transactionRef)
      
      if (!transactionSnap.exists()) {
        throw new Error('Transaction not found')
      }
      
      const originalTransaction = transactionSnap.data() as TokenTransaction
      
      if (originalTransaction.status !== 'completed') {
        throw new Error('Can only rollback completed transactions')
      }
      
      // Create compensating transaction
      const compensatingType = this.getCompensatingTransactionType(originalTransaction.type)
      const compensatingAmount = this.getCompensatingAmount(originalTransaction.amount, originalTransaction.type)
      
      const rollbackRequest: BalanceUpdateRequest = {
        userId: originalTransaction.userId,
        amount: compensatingAmount,
        type: compensatingType,
        relatedId: originalTransaction.id,
        metadata: {
          ...originalTransaction.metadata,
          rollbackReason: reason,
          originalTransactionId: transactionId
        }
      }
      
      return await this.updateBalanceAtomic(rollbackRequest)
    } catch (error) {
      console.error('Error rolling back transaction:', error)
      throw new Error(`Failed to rollback transaction ${transactionId}: ${error.message}`)
    }
  }

  /**
   * Get compensating transaction type for rollback
   */
  private static getCompensatingTransactionType(originalType: TokenTransaction['type']): TokenTransaction['type'] {
    switch (originalType) {
      case 'purchase':
        return 'refund'
      case 'commit':
        return 'refund'
      case 'win':
        return 'loss'
      case 'loss':
        return 'refund'
      case 'refund':
        return 'purchase'
      default:
        throw new Error(`Cannot create compensating transaction for type: ${originalType}`)
    }
  }

  /**
   * Get compensating amount for rollback
   */
  private static getCompensatingAmount(originalAmount: number, originalType: TokenTransaction['type']): number {
    switch (originalType) {
      case 'purchase':
      case 'win':
      case 'refund':
        return -Math.abs(originalAmount)
      case 'commit':
      case 'loss':
        return Math.abs(originalAmount)
      default:
        throw new Error(`Cannot calculate compensating amount for type: ${originalType}`)
    }
  }
}