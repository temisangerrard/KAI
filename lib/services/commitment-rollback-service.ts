/**
 * Commitment Rollback Service
 * Handles rollback operations for failed token commitments
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
  updateDoc
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import {
  UserBalance,
  TokenTransaction,
  PredictionCommitment
} from '@/lib/types/token'

export interface RollbackRequest {
  userId: string
  commitmentId?: string
  transactionId?: string
  reason: string
  rollbackType: 'commitment_failed' | 'market_cancelled' | 'manual_refund'
}

export interface RollbackResult {
  success: boolean
  rollbackTransactionId?: string
  updatedBalance?: UserBalance
  error?: string
  details?: {
    originalCommitment?: PredictionCommitment
    originalTransaction?: TokenTransaction
    rollbackAmount?: number
  }
}

/**
 * Service for handling commitment rollbacks and refunds
 */
export class CommitmentRollbackService {
  private static readonly COLLECTIONS = {
    userBalances: 'user_balances',
    tokenTransactions: 'token_transactions',
    predictionCommitments: 'prediction_commitments'
  } as const

  /**
   * Rollback a failed commitment transaction
   */
  static async rollbackCommitment(request: RollbackRequest): Promise<RollbackResult> {
    const { userId, commitmentId, transactionId, reason, rollbackType } = request

    console.log(`[ROLLBACK_SERVICE] Starting rollback: userId=${userId}, commitmentId=${commitmentId}, reason=${reason}`)

    try {
      // Find the commitment and related transaction
      let commitment: PredictionCommitment | null = null
      let originalTransaction: TokenTransaction | null = null

      if (commitmentId) {
        const commitmentRef = doc(db, this.COLLECTIONS.predictionCommitments, commitmentId)
        const commitmentSnap = await getDoc(commitmentRef)
        
        if (commitmentSnap.exists()) {
          commitment = { id: commitmentSnap.id, ...commitmentSnap.data() } as PredictionCommitment
        }
      }

      if (transactionId) {
        const transactionRef = doc(db, this.COLLECTIONS.tokenTransactions, transactionId)
        const transactionSnap = await getDoc(transactionRef)
        
        if (transactionSnap.exists()) {
          originalTransaction = { id: transactionSnap.id, ...transactionSnap.data() } as TokenTransaction
        }
      }

      // If we have commitment but no transaction, try to find the related transaction
      if (commitment && !originalTransaction) {
        try {
          const transactionsQuery = query(
            collection(db, this.COLLECTIONS.tokenTransactions),
            where('userId', '==', userId),
            where('type', '==', 'commit'),
            where('relatedId', '==', commitment.predictionId),
            where('amount', '==', commitment.tokensCommitted)
          )
          
          const transactionsSnap = await getDocs(transactionsQuery)
          if (transactionsSnap && !transactionsSnap.empty) {
            const transactionDoc = transactionsSnap.docs[0]
            originalTransaction = { id: transactionDoc.id, ...transactionDoc.data() } as TokenTransaction
          }
        } catch (error) {
          console.warn(`[ROLLBACK_SERVICE] Could not find related transaction for commitment ${commitmentId}:`, error.message)
          // Continue without original transaction - we can still rollback using commitment data
        }
      }

      if (!commitment && !originalTransaction) {
        return {
          success: false,
          error: 'No commitment or transaction found to rollback'
        }
      }

      const rollbackAmount = commitment?.tokensCommitted || Math.abs(originalTransaction?.amount || 0)

      // Perform atomic rollback transaction
      const result = await runTransaction(db, async (transaction) => {
        // Get current user balance
        const balanceRef = doc(db, this.COLLECTIONS.userBalances, userId)
        const balanceSnap = await transaction.get(balanceRef)
        
        if (!balanceSnap.exists()) {
          throw new Error('User balance not found')
        }
        
        const currentBalance = balanceSnap.data() as UserBalance

        // Update balance: move tokens from committed back to available
        const updatedBalance: UserBalance = {
          ...currentBalance,
          availableTokens: currentBalance.availableTokens + rollbackAmount,
          committedTokens: Math.max(0, currentBalance.committedTokens - rollbackAmount),
          lastUpdated: Timestamp.now(),
          version: currentBalance.version + 1
        }

        transaction.update(balanceRef, updatedBalance)

        // Create rollback transaction record
        const rollbackTransactionRef = doc(collection(db, this.COLLECTIONS.tokenTransactions))
        const rollbackTransaction: Omit<TokenTransaction, 'id'> = {
          userId,
          type: 'refund',
          amount: rollbackAmount,
          balanceBefore: currentBalance.availableTokens,
          balanceAfter: updatedBalance.availableTokens,
          relatedId: commitment?.predictionId || originalTransaction?.relatedId,
          metadata: {
            rollbackReason: reason,
            rollbackType,
            originalCommitmentId: commitmentId,
            originalTransactionId: transactionId || originalTransaction?.id,
            ...(commitment && { predictionTitle: commitment.predictionId }),
            ...(originalTransaction?.metadata || {})
          },
          timestamp: Timestamp.now(),
          status: 'completed'
        }

        transaction.set(rollbackTransactionRef, rollbackTransaction)

        // Update commitment status if exists
        if (commitment) {
          const commitmentRef = doc(db, this.COLLECTIONS.predictionCommitments, commitment.id)
          transaction.update(commitmentRef, {
            status: 'refunded',
            resolvedAt: Timestamp.now()
          })
        }

        // Mark original transaction as rolled back if exists
        if (originalTransaction) {
          const originalTransactionRef = doc(db, this.COLLECTIONS.tokenTransactions, originalTransaction.id)
          transaction.update(originalTransactionRef, {
            status: 'rolled_back',
            metadata: {
              ...originalTransaction.metadata,
              rolledBackAt: Timestamp.now(),
              rollbackReason: reason,
              rollbackTransactionId: rollbackTransactionRef.id
            }
          })
        }

        return {
          rollbackTransactionId: rollbackTransactionRef.id,
          updatedBalance
        }
      })

      console.log(`[ROLLBACK_SERVICE] Rollback successful: userId=${userId}, amount=${rollbackAmount}, transactionId=${result.rollbackTransactionId}`)

      return {
        success: true,
        rollbackTransactionId: result.rollbackTransactionId,
        updatedBalance: result.updatedBalance,
        details: {
          originalCommitment: commitment || undefined,
          originalTransaction: originalTransaction || undefined,
          rollbackAmount
        }
      }

    } catch (error) {
      console.error(`[ROLLBACK_SERVICE] Rollback failed: userId=${userId}`, {
        error: error.message,
        stack: error.stack,
        request
      })

      return {
        success: false,
        error: `Rollback failed: ${error.message}`
      }
    }
  }

  /**
   * Rollback multiple commitments (e.g., when a market is cancelled)
   */
  static async rollbackMultipleCommitments(
    predictionId: string,
    reason: string
  ): Promise<RollbackResult[]> {
    console.log(`[ROLLBACK_SERVICE] Rolling back all commitments for prediction: ${predictionId}`)

    try {
      // Get all active commitments for the prediction
      const commitmentsQuery = query(
        collection(db, this.COLLECTIONS.predictionCommitments),
        where('predictionId', '==', predictionId),
        where('status', '==', 'active')
      )

      const commitmentsSnap = await getDocs(commitmentsQuery)
      const commitments = commitmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[]

      console.log(`[ROLLBACK_SERVICE] Found ${commitments.length} commitments to rollback`)

      // Rollback each commitment
      const rollbackPromises = commitments.map(commitment =>
        this.rollbackCommitment({
          userId: commitment.userId,
          commitmentId: commitment.id,
          reason,
          rollbackType: 'market_cancelled'
        })
      )

      const results = await Promise.all(rollbackPromises)
      
      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length

      console.log(`[ROLLBACK_SERVICE] Batch rollback completed: ${successCount} successful, ${failureCount} failed`)

      return results

    } catch (error) {
      console.error(`[ROLLBACK_SERVICE] Batch rollback failed for prediction ${predictionId}:`, error)
      throw new Error(`Failed to rollback commitments for prediction ${predictionId}: ${error.message}`)
    }
  }

  /**
   * Get rollback history for a user
   */
  static async getRollbackHistory(userId: string): Promise<TokenTransaction[]> {
    try {
      const rollbackQuery = query(
        collection(db, this.COLLECTIONS.tokenTransactions),
        where('userId', '==', userId),
        where('type', '==', 'refund')
      )

      const rollbackSnap = await getDocs(rollbackQuery)
      return rollbackSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TokenTransaction[]

    } catch (error) {
      console.error(`[ROLLBACK_SERVICE] Error fetching rollback history for user ${userId}:`, error)
      throw new Error(`Failed to fetch rollback history: ${error.message}`)
    }
  }

  /**
   * Validate if a commitment can be rolled back
   */
  static async canRollback(commitmentId: string): Promise<{
    canRollback: boolean
    reason?: string
    commitment?: PredictionCommitment
  }> {
    try {
      const commitmentRef = doc(db, this.COLLECTIONS.predictionCommitments, commitmentId)
      const commitmentSnap = await getDoc(commitmentRef)

      if (!commitmentSnap.exists()) {
        return {
          canRollback: false,
          reason: 'Commitment not found'
        }
      }

      const commitment = commitmentSnap.data() as PredictionCommitment

      if (commitment.status !== 'active') {
        return {
          canRollback: false,
          reason: `Commitment is already ${commitment.status}`,
          commitment
        }
      }

      // Check if commitment is too old (optional business rule)
      const commitmentAge = Date.now() - commitment.committedAt.toMillis()
      const maxRollbackAge = 24 * 60 * 60 * 1000 // 24 hours
      
      if (commitmentAge > maxRollbackAge) {
        return {
          canRollback: false,
          reason: 'Commitment is too old to rollback',
          commitment
        }
      }

      return {
        canRollback: true,
        commitment
      }

    } catch (error) {
      console.error(`[ROLLBACK_SERVICE] Error checking rollback eligibility for commitment ${commitmentId}:`, error)
      return {
        canRollback: false,
        reason: `Error checking eligibility: ${error.message}`
      }
    }
  }
}