/**
 * Prediction Payout Service
 * Handles calculation and distribution of prediction payouts
 */

import {
  doc,
  getDoc,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
  orderBy
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { TokenBalanceService } from './token-balance-service'
import {
  PredictionCommitment,
  TokenTransaction,
  UserBalance
} from '@/lib/types/token'

export interface MarketOutcome {
  predictionId: string
  winningOptionId: string
  resolvedAt: Timestamp
  totalPool: number
  winningPool: number
  losingPool: number
}

export interface PayoutCalculation {
  userId: string
  commitmentId: string
  tokensCommitted: number
  isWinner: boolean
  payoutAmount: number
  returnRatio: number
  originalOdds: number
}

export interface PayoutResult {
  predictionId: string
  totalProcessed: number
  winnersCount: number
  losersCount: number
  totalPaidOut: number
  totalCollected: number
  calculations: PayoutCalculation[]
  errors: string[]
}

export interface PayoutJobStatus {
  id: string
  predictionId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  startedAt: Timestamp
  completedAt?: Timestamp
  result?: PayoutResult
  error?: string
  retryCount: number
  maxRetries: number
}

/**
 * Prediction Payout Service
 * Manages the calculation and distribution of prediction payouts
 */
export class PredictionPayoutService {
  private static readonly COLLECTIONS = {
    predictionCommitments: 'prediction_commitments',
    payoutJobs: 'payout_jobs',
    marketOutcomes: 'market_outcomes',
    userBalances: 'user_balances',
    tokenTransactions: 'token_transactions'
  } as const

  private static readonly HOUSE_EDGE = 0.05 // 5% house edge
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY_MS = 5000

  /**
   * Calculate payouts for a resolved prediction market
   */
  static async calculatePayouts(
    predictionId: string,
    winningOptionId: string
  ): Promise<PayoutCalculation[]> {
    if (!predictionId?.trim() || !winningOptionId?.trim()) {
      throw new Error('Prediction ID and winning option ID are required')
    }

    try {
      // Get all commitments for this prediction
      const commitmentsQuery = query(
        collection(db, this.COLLECTIONS.predictionCommitments),
        where('predictionId', '==', predictionId),
        where('status', '==', 'active')
      )

      const commitmentsSnap = await getDocs(commitmentsQuery)
      const commitments = commitmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (PredictionCommitment & { id: string })[]

      if (commitments.length === 0) {
        console.warn(`No active commitments found for prediction ${predictionId}`)
        return []
      }

      // Separate winners and losers
      const winners = commitments.filter(c => c.position === winningOptionId)
      const losers = commitments.filter(c => c.position !== winningOptionId)

      // Calculate pool totals
      const totalPool = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      const winningPool = winners.reduce((sum, c) => sum + c.tokensCommitted, 0)
      const losingPool = losers.reduce((sum, c) => sum + c.tokensCommitted, 0)

      console.log(`Payout calculation for ${predictionId}:`, {
        totalCommitments: commitments.length,
        winnersCount: winners.length,
        losersCount: losers.length,
        totalPool,
        winningPool,
        losingPool
      })

      // Calculate house edge
      const houseEdgeAmount = losingPool * this.HOUSE_EDGE
      const distributablePool = losingPool - houseEdgeAmount

      // Calculate payouts
      const calculations: PayoutCalculation[] = []

      // Process winners
      for (const winner of winners) {
        const returnRatio = winningPool > 0 ? winner.tokensCommitted / winningPool : 0
        const winnings = distributablePool * returnRatio
        const totalPayout = winner.tokensCommitted + winnings // Return original + winnings

        calculations.push({
          userId: winner.userId,
          commitmentId: winner.id,
          tokensCommitted: winner.tokensCommitted,
          isWinner: true,
          payoutAmount: totalPayout,
          returnRatio: totalPayout / winner.tokensCommitted,
          originalOdds: winner.odds
        })
      }

      // Process losers (they get nothing back)
      for (const loser of losers) {
        calculations.push({
          userId: loser.userId,
          commitmentId: loser.id,
          tokensCommitted: loser.tokensCommitted,
          isWinner: false,
          payoutAmount: 0,
          returnRatio: 0,
          originalOdds: loser.odds
        })
      }

      return calculations
    } catch (error) {
      console.error('Error calculating payouts:', error)
      throw new Error(`Failed to calculate payouts for prediction ${predictionId}: ${error.message}`)
    }
  }

  /**
   * Process payouts for a resolved prediction market
   */
  static async processPayouts(
    predictionId: string,
    winningOptionId: string
  ): Promise<PayoutResult> {
    if (!predictionId?.trim() || !winningOptionId?.trim()) {
      throw new Error('Prediction ID and winning option ID are required')
    }

    try {
      // Calculate payouts first
      const calculations = await this.calculatePayouts(predictionId, winningOptionId)
      
      if (calculations.length === 0) {
        return {
          predictionId,
          totalProcessed: 0,
          winnersCount: 0,
          losersCount: 0,
          totalPaidOut: 0,
          totalCollected: 0,
          calculations: [],
          errors: []
        }
      }

      const winners = calculations.filter(c => c.isWinner)
      const losers = calculations.filter(c => !c.isWinner)
      const totalPaidOut = winners.reduce((sum, c) => sum + c.payoutAmount, 0)
      const totalCollected = losers.reduce((sum, c) => sum + c.tokensCommitted, 0)

      // Process payouts in transaction
      const errors: string[] = []
      let processedCount = 0

      await runTransaction(db, async (transaction) => {
        // Update all commitments to resolved status
        for (const calc of calculations) {
          const commitmentRef = doc(db, this.COLLECTIONS.predictionCommitments, calc.commitmentId)
          transaction.update(commitmentRef, {
            status: calc.isWinner ? 'won' : 'lost',
            resolvedAt: Timestamp.now(),
            payoutAmount: calc.payoutAmount
          })
        }

        // Process balance updates for winners
        for (const winner of winners) {
          try {
            // Update user balance - return committed tokens plus winnings
            const balanceRef = doc(db, this.COLLECTIONS.userBalances, winner.userId)
            const balanceSnap = await transaction.get(balanceRef)
            
            if (balanceSnap.exists()) {
              const currentBalance = balanceSnap.data() as UserBalance
              
              // Return committed tokens to available balance and add winnings
              const newAvailableTokens = currentBalance.availableTokens + winner.payoutAmount
              const newCommittedTokens = Math.max(0, currentBalance.committedTokens - winner.tokensCommitted)
              const newTotalEarned = currentBalance.totalEarned + (winner.payoutAmount - winner.tokensCommitted)
              
              transaction.update(balanceRef, {
                availableTokens: newAvailableTokens,
                committedTokens: newCommittedTokens,
                totalEarned: newTotalEarned,
                lastUpdated: Timestamp.now(),
                version: currentBalance.version + 1
              })

              // Create transaction record for winnings
              const transactionRef = doc(collection(db, this.COLLECTIONS.tokenTransactions))
              const tokenTransaction: Omit<TokenTransaction, 'id'> = {
                userId: winner.userId,
                type: 'win',
                amount: winner.payoutAmount,
                balanceBefore: currentBalance.availableTokens,
                balanceAfter: newAvailableTokens,
                relatedId: predictionId,
                metadata: {
                  predictionId,
                  commitmentId: winner.commitmentId,
                  tokensCommitted: winner.tokensCommitted,
                  winnings: winner.payoutAmount - winner.tokensCommitted,
                  returnRatio: winner.returnRatio
                },
                timestamp: Timestamp.now(),
                status: 'completed'
              }
              
              transaction.set(transactionRef, tokenTransaction)
              processedCount++
            }
          } catch (error) {
            console.error(`Error processing payout for winner ${winner.userId}:`, error)
            errors.push(`Failed to process payout for user ${winner.userId}: ${error.message}`)
          }
        }

        // Process balance updates for losers
        for (const loser of losers) {
          try {
            const balanceRef = doc(db, this.COLLECTIONS.userBalances, loser.userId)
            const balanceSnap = await transaction.get(balanceRef)
            
            if (balanceSnap.exists()) {
              const currentBalance = balanceSnap.data() as UserBalance
              
              // Remove committed tokens (they're lost)
              const newCommittedTokens = Math.max(0, currentBalance.committedTokens - loser.tokensCommitted)
              const newTotalSpent = currentBalance.totalSpent + loser.tokensCommitted
              
              transaction.update(balanceRef, {
                committedTokens: newCommittedTokens,
                totalSpent: newTotalSpent,
                lastUpdated: Timestamp.now(),
                version: currentBalance.version + 1
              })

              // Create transaction record for loss
              const transactionRef = doc(collection(db, this.COLLECTIONS.tokenTransactions))
              const tokenTransaction: Omit<TokenTransaction, 'id'> = {
                userId: loser.userId,
                type: 'loss',
                amount: loser.tokensCommitted,
                balanceBefore: currentBalance.availableTokens,
                balanceAfter: currentBalance.availableTokens, // Available balance unchanged
                relatedId: predictionId,
                metadata: {
                  predictionId,
                  commitmentId: loser.commitmentId,
                  tokensCommitted: loser.tokensCommitted
                },
                timestamp: Timestamp.now(),
                status: 'completed'
              }
              
              transaction.set(transactionRef, tokenTransaction)
              processedCount++
            }
          } catch (error) {
            console.error(`Error processing loss for user ${loser.userId}:`, error)
            errors.push(`Failed to process loss for user ${loser.userId}: ${error.message}`)
          }
        }

        // Record market outcome
        const outcomeRef = doc(collection(db, this.COLLECTIONS.marketOutcomes))
        const outcome: Omit<MarketOutcome, 'id'> = {
          predictionId,
          winningOptionId,
          resolvedAt: Timestamp.now(),
          totalPool: calculations.reduce((sum, c) => sum + c.tokensCommitted, 0),
          winningPool: winners.reduce((sum, c) => sum + c.tokensCommitted, 0),
          losingPool: losers.reduce((sum, c) => sum + c.tokensCommitted, 0)
        }
        
        transaction.set(outcomeRef, outcome)
      })

      return {
        predictionId,
        totalProcessed: processedCount,
        winnersCount: winners.length,
        losersCount: losers.length,
        totalPaidOut,
        totalCollected,
        calculations,
        errors
      }
    } catch (error) {
      console.error('Error processing payouts:', error)
      throw new Error(`Failed to process payouts for prediction ${predictionId}: ${error.message}`)
    }
  }

  /**
   * Create a background job for processing payouts
   */
  static async createPayoutJob(
    predictionId: string,
    winningOptionId: string
  ): Promise<PayoutJobStatus> {
    if (!predictionId?.trim() || !winningOptionId?.trim()) {
      throw new Error('Prediction ID and winning option ID are required')
    }

    try {
      const jobRef = doc(collection(db, this.COLLECTIONS.payoutJobs))
      const job: Omit<PayoutJobStatus, 'id'> = {
        predictionId,
        status: 'pending',
        startedAt: Timestamp.now(),
        retryCount: 0,
        maxRetries: this.MAX_RETRIES
      }

      await runTransaction(db, async (transaction) => {
        transaction.set(jobRef, job)
      })

      // Start processing the job asynchronously
      this.processPayoutJob(jobRef.id, predictionId, winningOptionId)
        .catch(error => {
          console.error(`Background payout job ${jobRef.id} failed:`, error)
        })

      return {
        id: jobRef.id,
        ...job
      }
    } catch (error) {
      console.error('Error creating payout job:', error)
      throw new Error(`Failed to create payout job for prediction ${predictionId}: ${error.message}`)
    }
  }

  /**
   * Process a payout job with retry logic
   */
  private static async processPayoutJob(
    jobId: string,
    predictionId: string,
    winningOptionId: string
  ): Promise<void> {
    const jobRef = doc(db, this.COLLECTIONS.payoutJobs, jobId)

    try {
      // Update job status to processing
      await runTransaction(db, async (transaction) => {
        transaction.update(jobRef, {
          status: 'processing',
          startedAt: Timestamp.now()
        })
      })

      // Process the payouts
      const result = await this.processPayouts(predictionId, winningOptionId)

      // Update job with success
      await runTransaction(db, async (transaction) => {
        transaction.update(jobRef, {
          status: 'completed',
          completedAt: Timestamp.now(),
          result
        })
      })

      console.log(`Payout job ${jobId} completed successfully`)
    } catch (error) {
      console.error(`Payout job ${jobId} failed:`, error)

      // Get current job status for retry logic
      const jobSnap = await getDoc(jobRef)
      if (jobSnap.exists()) {
        const job = jobSnap.data() as PayoutJobStatus
        
        if (job.retryCount < job.maxRetries) {
          // Schedule retry
          setTimeout(() => {
            this.retryPayoutJob(jobId, predictionId, winningOptionId, job.retryCount + 1)
              .catch(retryError => {
                console.error(`Retry failed for payout job ${jobId}:`, retryError)
              })
          }, this.RETRY_DELAY_MS * Math.pow(2, job.retryCount)) // Exponential backoff
        } else {
          // Mark as failed
          await runTransaction(db, async (transaction) => {
            transaction.update(jobRef, {
              status: 'failed',
              completedAt: Timestamp.now(),
              error: error.message
            })
          })
        }
      }
    }
  }

  /**
   * Retry a failed payout job
   */
  private static async retryPayoutJob(
    jobId: string,
    predictionId: string,
    winningOptionId: string,
    retryCount: number
  ): Promise<void> {
    const jobRef = doc(db, this.COLLECTIONS.payoutJobs, jobId)

    try {
      // Update retry count
      await runTransaction(db, async (transaction) => {
        transaction.update(jobRef, {
          status: 'processing',
          retryCount,
          startedAt: Timestamp.now()
        })
      })

      // Attempt to process again
      await this.processPayoutJob(jobId, predictionId, winningOptionId)
    } catch (error) {
      console.error(`Retry ${retryCount} failed for payout job ${jobId}:`, error)
      throw error
    }
  }

  /**
   * Get payout job status
   */
  static async getPayoutJobStatus(jobId: string): Promise<PayoutJobStatus | null> {
    if (!jobId?.trim()) {
      throw new Error('Job ID is required')
    }

    try {
      const jobRef = doc(db, this.COLLECTIONS.payoutJobs, jobId)
      const jobSnap = await getDoc(jobRef)

      if (!jobSnap.exists()) {
        return null
      }

      return {
        id: jobSnap.id,
        ...jobSnap.data()
      } as PayoutJobStatus
    } catch (error) {
      console.error('Error getting payout job status:', error)
      throw new Error(`Failed to get status for payout job ${jobId}: ${error.message}`)
    }
  }

  /**
   * Get all payout jobs for a prediction
   */
  static async getPayoutJobsForPrediction(predictionId: string): Promise<PayoutJobStatus[]> {
    if (!predictionId?.trim()) {
      throw new Error('Prediction ID is required')
    }

    try {
      const jobsQuery = query(
        collection(db, this.COLLECTIONS.payoutJobs),
        where('predictionId', '==', predictionId),
        orderBy('startedAt', 'desc')
      )

      const jobsSnap = await getDocs(jobsQuery)
      return jobsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PayoutJobStatus[]
    } catch (error) {
      console.error('Error getting payout jobs:', error)
      throw new Error(`Failed to get payout jobs for prediction ${predictionId}: ${error.message}`)
    }
  }

  /**
   * Refund all commitments for a cancelled prediction
   */
  static async refundPrediction(predictionId: string): Promise<PayoutResult> {
    if (!predictionId?.trim()) {
      throw new Error('Prediction ID is required')
    }

    try {
      // Get all active commitments
      const commitmentsQuery = query(
        collection(db, this.COLLECTIONS.predictionCommitments),
        where('predictionId', '==', predictionId),
        where('status', '==', 'active')
      )

      const commitmentsSnap = await getDocs(commitmentsQuery)
      const commitments = commitmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (PredictionCommitment & { id: string })[]

      if (commitments.length === 0) {
        return {
          predictionId,
          totalProcessed: 0,
          winnersCount: 0,
          losersCount: 0,
          totalPaidOut: 0,
          totalCollected: 0,
          calculations: [],
          errors: []
        }
      }

      const errors: string[] = []
      let processedCount = 0
      const totalRefunded = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)

      // Process refunds in transaction
      await runTransaction(db, async (transaction) => {
        for (const commitment of commitments) {
          try {
            // Update commitment status
            const commitmentRef = doc(db, this.COLLECTIONS.predictionCommitments, commitment.id)
            transaction.update(commitmentRef, {
              status: 'refunded',
              resolvedAt: Timestamp.now(),
              payoutAmount: commitment.tokensCommitted
            })

            // Update user balance
            const balanceRef = doc(db, this.COLLECTIONS.userBalances, commitment.userId)
            const balanceSnap = await transaction.get(balanceRef)
            
            if (balanceSnap.exists()) {
              const currentBalance = balanceSnap.data() as UserBalance
              
              // Return committed tokens to available balance
              const newAvailableTokens = currentBalance.availableTokens + commitment.tokensCommitted
              const newCommittedTokens = Math.max(0, currentBalance.committedTokens - commitment.tokensCommitted)
              
              transaction.update(balanceRef, {
                availableTokens: newAvailableTokens,
                committedTokens: newCommittedTokens,
                lastUpdated: Timestamp.now(),
                version: currentBalance.version + 1
              })

              // Create refund transaction record
              const transactionRef = doc(collection(db, this.COLLECTIONS.tokenTransactions))
              const tokenTransaction: Omit<TokenTransaction, 'id'> = {
                userId: commitment.userId,
                type: 'refund',
                amount: commitment.tokensCommitted,
                balanceBefore: currentBalance.availableTokens,
                balanceAfter: newAvailableTokens,
                relatedId: predictionId,
                metadata: {
                  predictionId,
                  commitmentId: commitment.id,
                  reason: 'prediction_cancelled'
                },
                timestamp: Timestamp.now(),
                status: 'completed'
              }
              
              transaction.set(transactionRef, tokenTransaction)
              processedCount++
            }
          } catch (error) {
            console.error(`Error processing refund for user ${commitment.userId}:`, error)
            errors.push(`Failed to process refund for user ${commitment.userId}: ${error.message}`)
          }
        }
      })

      const calculations: PayoutCalculation[] = commitments.map(c => ({
        userId: c.userId,
        commitmentId: c.id,
        tokensCommitted: c.tokensCommitted,
        isWinner: true, // Everyone gets their money back
        payoutAmount: c.tokensCommitted,
        returnRatio: 1.0,
        originalOdds: c.odds
      }))

      return {
        predictionId,
        totalProcessed: processedCount,
        winnersCount: commitments.length,
        losersCount: 0,
        totalPaidOut: totalRefunded,
        totalCollected: 0,
        calculations,
        errors
      }
    } catch (error) {
      console.error('Error refunding prediction:', error)
      throw new Error(`Failed to refund prediction ${predictionId}: ${error.message}`)
    }
  }
}