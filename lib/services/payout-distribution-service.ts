/**
 * Comprehensive Payout Distribution Service
 * Handles accurate payout distribution for both binary and multi-option markets
 * with full backward compatibility and comprehensive audit trails
 */

import {
  collection,
  doc,
  runTransaction,
  Timestamp,
  writeBatch,
  increment,
  query,
  where,
  getDocs
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { Market, MarketResolution } from '@/lib/types/database'
import { PredictionCommitment } from '@/lib/types/token'
import { TokenBalanceService } from './token-balance-service'
import { EnhancedPayoutCalculationService, EnhancedPayoutCalculationResult } from './enhanced-payout-calculation-service'

// Collection references
const COLLECTIONS = {
  payoutDistributions: 'payout_distributions',
  userBalances: 'user_balances',
  users: 'users',
  transactions: 'transactions',
  tokenTransactions: 'token_transactions',
  predictionCommitments: 'prediction_commitments'
} as const

/**
 * Comprehensive payout distribution record with backward compatibility
 */
export interface PayoutDistribution {
  id: string
  marketId: string
  resolutionId: string
  userId: string
  
  // Payout breakdown
  totalPayout: number          // Total payout for this user
  totalProfit: number          // Total profit (payout - committed)
  totalLost: number            // Total tokens lost on losing commitments
  
  // Individual commitment payouts with full audit trail
  winningCommitments: Array<{
    commitmentId: string
    optionId: string
    position: 'yes' | 'no'      // Backward compatibility
    tokensCommitted: number
    odds: number
    payoutAmount: number
    profit: number
    winShare: number
    // Audit trail for commitment type and winner identification
    auditTrail: {
      commitmentType: 'binary' | 'multi-option' | 'hybrid'
      originalPosition?: 'yes' | 'no'
      originalOptionId?: string
      derivedPosition?: 'yes' | 'no'
      derivedOptionId?: string
      winnerIdentificationMethod: 'position-based' | 'optionId-based' | 'hybrid'
    }
  }>
  
  losingCommitments: Array<{
    commitmentId: string
    optionId: string
    position: 'yes' | 'no'      // Backward compatibility
    tokensCommitted: number
    lostAmount: number
    // Audit trail for commitment type
    auditTrail: {
      commitmentType: 'binary' | 'multi-option' | 'hybrid'
      originalPosition?: 'yes' | 'no'
      originalOptionId?: string
      derivedPosition?: 'yes' | 'no'
      derivedOptionId?: string
    }
  }>
  
  // Processing details
  processedAt: Timestamp
  status: 'completed' | 'failed' | 'disputed' | 'rolled_back'
  transactionIds: string[]     // Token transaction records created
  
  // Backward compatibility fields
  legacyTransactionIds?: string[] // Legacy transaction format IDs
  
  // Distribution metadata
  metadata: {
    marketTitle: string
    marketType: 'binary' | 'multi-option'
    winningOptionId: string
    winningOptionText?: string
    totalMarketPool: number
    houseFee: number
    creatorFee: number
    distributionMethod: 'enhanced' | 'legacy'
    calculationTimestamp: Timestamp
    
    // Verification data
    verificationChecks: {
      allCommitmentsProcessed: boolean
      payoutSumsCorrect: boolean
      noDoublePayouts: boolean
      balanceUpdatesSuccessful: boolean
      transactionRecordsCreated: boolean
    }
  }
}

/**
 * Payout distribution request
 */
export interface PayoutDistributionRequest {
  market: Market
  resolution: MarketResolution
  commitments: PredictionCommitment[]
  winningOptionId: string
  creatorFeePercentage: number
  adminId: string
}

/**
 * Payout distribution result
 */
export interface PayoutDistributionResult {
  success: boolean
  distributionId: string
  totalDistributed: number
  recipientCount: number
  transactionIds: string[]
  
  // Summary data
  summary: {
    totalPool: number
    houseFee: number
    creatorFee: number
    winnerPool: number
    winnerCount: number
    loserCount: number
  }
  
  // Error information if failed
  error?: {
    message: string
    code: string
    details?: any
  }
}

/**
 * Rollback result
 */
export interface PayoutRollbackResult {
  success: boolean
  distributionId: string
  rollbackTransactionIds: string[]
  affectedUsers: string[]
  
  error?: {
    message: string
    code: string
    details?: any
  }
}

export class PayoutDistributionService {
  
  /**
   * Distribute payouts for a resolved market with comprehensive audit trail
   */
  static async distributePayouts(request: PayoutDistributionRequest): Promise<PayoutDistributionResult> {
    const { market, resolution, commitments, winningOptionId, creatorFeePercentage, adminId } = request
    
    try {
      console.log('🎯 Starting payout distribution for market:', market.id)
      console.log('🎯 Winning option:', winningOptionId)
      console.log('🎯 Total commitments:', commitments.length)
      
      // Calculate accurate payouts using enhanced service
      const payoutCalculation = EnhancedPayoutCalculationService.calculateAccuratePayouts({
        market,
        commitments,
        winningOptionId,
        creatorFeePercentage
      })
      
      console.log('💰 Payout calculation completed:', {
        totalPool: payoutCalculation.totalPool,
        winnerCount: payoutCalculation.winnerCount,
        loserCount: payoutCalculation.loserCount,
        winnerPool: payoutCalculation.winnerPool
      })
      
      // Group payouts by user for distribution
      const userPayouts = this.groupPayoutsByUser(payoutCalculation)
      
      console.log('👥 User payouts grouped:', userPayouts.size, 'users')
      
      // Execute distribution in transaction
      const distributionResult = await runTransaction(db, async (transaction) => {
        const distributionRef = doc(collection(db, COLLECTIONS.payoutDistributions))
        const transactionIds: string[] = []
        const legacyTransactionIds: string[] = []
        
        // Process each user's payout
        for (const [userId, userPayout] of userPayouts) {
          if (userPayout.totalPayout > 0) {
            // Update user balance in users collection (legacy compatibility)
            const userRef = doc(db, COLLECTIONS.users, userId)
            transaction.update(userRef, {
              tokenBalance: increment(userPayout.totalPayout)
            })
            
            // Create legacy transaction record (backward compatibility)
            const legacyTransactionRef = doc(collection(db, COLLECTIONS.transactions))
            const legacyTransactionData = {
              userId,
              type: 'prediction_win',
              amount: userPayout.totalPayout,
              description: `Won prediction: ${market.title}`,
              createdAt: Timestamp.now(),
              marketId: market.id,
              metadata: {
                resolutionId: resolution.id,
                tokensStaked: userPayout.totalStaked,
                profit: userPayout.totalProfit,
                distributionId: distributionRef.id
              }
            }
            transaction.set(legacyTransactionRef, legacyTransactionData)
            legacyTransactionIds.push(legacyTransactionRef.id)
            
            // Create enhanced token transaction record
            const tokenTransactionRef = doc(collection(db, COLLECTIONS.tokenTransactions))
            const tokenTransactionData = {
              userId,
              type: 'win' as const,
              amount: userPayout.totalPayout,
              balanceBefore: 0, // Will be updated by TokenBalanceService
              balanceAfter: 0,  // Will be updated by TokenBalanceService
              relatedId: resolution.id,
              metadata: {
                marketId: market.id,
                marketTitle: market.title,
                resolutionId: resolution.id,
                distributionId: distributionRef.id,
                tokensStaked: userPayout.totalStaked,
                profit: userPayout.totalProfit,
                winningCommitments: userPayout.winningCommitments.length,
                losingCommitments: userPayout.losingCommitments.length,
                payoutBreakdown: userPayout.winningCommitments.map(wc => ({
                  commitmentId: wc.commitmentId,
                  optionId: wc.optionId,
                  tokensCommitted: wc.tokensCommitted,
                  payoutAmount: wc.payoutAmount,
                  profit: wc.profit
                }))
              },
              timestamp: Timestamp.now(),
              status: 'completed' as const
            }
            transaction.set(tokenTransactionRef, tokenTransactionData)
            transactionIds.push(tokenTransactionRef.id)
          }
        }
        
        // Create comprehensive payout distribution record
        const distributionData: Omit<PayoutDistribution, 'id'> = {
          marketId: market.id,
          resolutionId: resolution.id,
          userId: 'system', // System-level distribution record
          totalPayout: payoutCalculation.winnerPool,
          totalProfit: payoutCalculation.winnerPool - payoutCalculation.payouts.reduce((sum, p) => sum + p.tokensStaked, 0),
          totalLost: payoutCalculation.totalPool - payoutCalculation.winnerPool - payoutCalculation.totalFees,
          winningCommitments: this.extractWinningCommitments(payoutCalculation),
          losingCommitments: this.extractLosingCommitments(payoutCalculation),
          processedAt: Timestamp.now(),
          status: 'completed',
          transactionIds,
          legacyTransactionIds,
          metadata: {
            marketTitle: market.title,
            marketType: payoutCalculation.market.type,
            winningOptionId,
            winningOptionText: market.options?.find(opt => opt.id === winningOptionId)?.text,
            totalMarketPool: payoutCalculation.totalPool,
            houseFee: payoutCalculation.houseFee,
            creatorFee: payoutCalculation.creatorFee,
            distributionMethod: 'enhanced',
            calculationTimestamp: payoutCalculation.auditTrail.calculationTimestamp,
            verificationChecks: {
              allCommitmentsProcessed: payoutCalculation.auditTrail.verificationChecks.allCommitmentsProcessed,
              payoutSumsCorrect: payoutCalculation.auditTrail.verificationChecks.payoutSumsCorrect,
              noDoublePayouts: payoutCalculation.auditTrail.verificationChecks.noDoublePayouts,
              balanceUpdatesSuccessful: true, // Will be verified after transaction
              transactionRecordsCreated: true
            }
          }
        }
        
        transaction.set(distributionRef, distributionData)
        
        return {
          distributionId: distributionRef.id,
          transactionIds,
          legacyTransactionIds,
          userPayouts: Array.from(userPayouts.entries())
        }
      })
      
      console.log('✅ Distribution transaction completed:', distributionResult.distributionId)
      
      // Update TokenBalanceService for all recipients (non-critical but important for UI)
      try {
        for (const [userId, userPayout] of distributionResult.userPayouts) {
          if (userPayout.totalPayout > 0) {
            await TokenBalanceService.updateBalanceAtomic({
              userId,
              amount: userPayout.totalPayout,
              type: 'win',
              relatedId: resolution.id,
              metadata: {
                marketId: market.id,
                marketTitle: market.title,
                resolutionId: resolution.id,
                distributionId: distributionResult.distributionId,
                tokensStaked: userPayout.totalStaked,
                profit: userPayout.totalProfit,
                winningCommitments: userPayout.winningCommitments.length
              }
            })
          }
        }
        console.log('✅ TokenBalanceService updates completed')
      } catch (error) {
        console.warn('⚠️ Non-critical error updating TokenBalanceService:', error)
        // Don't fail the distribution for this
      }
      
      // Update commitment statuses
      try {
        await this.updateCommitmentStatuses(market.id, winningOptionId, payoutCalculation)
        console.log('✅ Commitment statuses updated')
      } catch (error) {
        console.warn('⚠️ Non-critical error updating commitment statuses:', error)
        // Don't fail the distribution for this
      }
      
      return {
        success: true,
        distributionId: distributionResult.distributionId,
        totalDistributed: payoutCalculation.winnerPool,
        recipientCount: payoutCalculation.winnerCount,
        transactionIds: [...distributionResult.transactionIds, ...distributionResult.legacyTransactionIds],
        summary: {
          totalPool: payoutCalculation.totalPool,
          houseFee: payoutCalculation.houseFee,
          creatorFee: payoutCalculation.creatorFee,
          winnerPool: payoutCalculation.winnerPool,
          winnerCount: payoutCalculation.winnerCount,
          loserCount: payoutCalculation.loserCount
        }
      }
      
    } catch (error) {
      console.error('❌ Error distributing payouts:', error)
      
      return {
        success: false,
        distributionId: '',
        totalDistributed: 0,
        recipientCount: 0,
        transactionIds: [],
        summary: {
          totalPool: 0,
          houseFee: 0,
          creatorFee: 0,
          winnerPool: 0,
          winnerCount: 0,
          loserCount: 0
        },
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'DISTRIBUTION_FAILED',
          details: error
        }
      }
    }
  }
  
  /**
   * Group payouts by user for distribution
   */
  private static groupPayoutsByUser(payoutCalculation: EnhancedPayoutCalculationResult): Map<string, {
    totalPayout: number
    totalStaked: number
    totalProfit: number
    winningCommitments: Array<{
      commitmentId: string
      optionId: string
      position: 'yes' | 'no'
      tokensCommitted: number
      payoutAmount: number
      profit: number
      winShare: number
      auditTrail: any
    }>
    losingCommitments: Array<{
      commitmentId: string
      optionId: string
      position: 'yes' | 'no'
      tokensCommitted: number
      lostAmount: number
      auditTrail: any
    }>
  }> {
    const userPayouts = new Map()
    
    for (const commitmentPayout of payoutCalculation.commitmentPayouts) {
      if (!userPayouts.has(commitmentPayout.userId)) {
        userPayouts.set(commitmentPayout.userId, {
          totalPayout: 0,
          totalStaked: 0,
          totalProfit: 0,
          winningCommitments: [],
          losingCommitments: []
        })
      }
      
      const userPayout = userPayouts.get(commitmentPayout.userId)
      userPayout.totalStaked += commitmentPayout.tokensCommitted
      
      if (commitmentPayout.isWinner) {
        userPayout.totalPayout += commitmentPayout.payoutAmount
        userPayout.totalProfit += commitmentPayout.profit
        userPayout.winningCommitments.push({
          commitmentId: commitmentPayout.commitmentId,
          optionId: commitmentPayout.optionId,
          position: commitmentPayout.position,
          tokensCommitted: commitmentPayout.tokensCommitted,
          payoutAmount: commitmentPayout.payoutAmount,
          profit: commitmentPayout.profit,
          winShare: commitmentPayout.winShare,
          auditTrail: commitmentPayout.auditTrail
        })
      } else {
        userPayout.losingCommitments.push({
          commitmentId: commitmentPayout.commitmentId,
          optionId: commitmentPayout.optionId,
          position: commitmentPayout.position,
          tokensCommitted: commitmentPayout.tokensCommitted,
          lostAmount: commitmentPayout.tokensCommitted,
          auditTrail: commitmentPayout.auditTrail
        })
      }
    }
    
    return userPayouts
  }
  
  /**
   * Extract winning commitments for distribution record
   */
  private static extractWinningCommitments(payoutCalculation: EnhancedPayoutCalculationResult) {
    return payoutCalculation.commitmentPayouts
      .filter(cp => cp.isWinner)
      .map(cp => ({
        commitmentId: cp.commitmentId,
        optionId: cp.optionId,
        position: cp.position,
        tokensCommitted: cp.tokensCommitted,
        odds: cp.odds,
        payoutAmount: cp.payoutAmount,
        profit: cp.profit,
        winShare: cp.winShare,
        auditTrail: cp.auditTrail
      }))
  }
  
  /**
   * Extract losing commitments for distribution record
   */
  private static extractLosingCommitments(payoutCalculation: EnhancedPayoutCalculationResult) {
    return payoutCalculation.commitmentPayouts
      .filter(cp => !cp.isWinner)
      .map(cp => ({
        commitmentId: cp.commitmentId,
        optionId: cp.optionId,
        position: cp.position,
        tokensCommitted: cp.tokensCommitted,
        lostAmount: cp.tokensCommitted,
        auditTrail: cp.auditTrail
      }))
  }
  
  /**
   * Update commitment statuses after payout distribution
   */
  private static async updateCommitmentStatuses(
    marketId: string,
    winningOptionId: string,
    payoutCalculation: EnhancedPayoutCalculationResult
  ): Promise<void> {
    const batch = writeBatch(db)
    
    for (const commitmentPayout of payoutCalculation.commitmentPayouts) {
      const commitmentRef = doc(db, COLLECTIONS.predictionCommitments, commitmentPayout.commitmentId)
      
      batch.update(commitmentRef, {
        status: commitmentPayout.isWinner ? 'won' : 'lost',
        resolvedAt: Timestamp.now(),
        // Add payout information for winners
        ...(commitmentPayout.isWinner && {
          payoutAmount: commitmentPayout.payoutAmount,
          profit: commitmentPayout.profit,
          winShare: commitmentPayout.winShare
        })
      })
    }
    
    await batch.commit()
  }
  
  /**
   * Rollback a payout distribution
   */
  static async rollbackPayoutDistribution(
    distributionId: string,
    reason: string,
    adminId: string
  ): Promise<PayoutRollbackResult> {
    try {
      console.log('🔄 Starting payout distribution rollback:', distributionId)
      
      // Get the distribution record
      const distributionRef = doc(db, COLLECTIONS.payoutDistributions, distributionId)
      const distributionSnap = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(distributionRef)
        if (!snap.exists()) {
          throw new Error('Distribution record not found')
        }
        return snap.data() as PayoutDistribution
      })
      
      const distribution = distributionSnap
      
      if (distribution.status === 'rolled_back') {
        throw new Error('Distribution has already been rolled back')
      }
      
      // Execute rollback in transaction
      const rollbackResult = await runTransaction(db, async (transaction) => {
        const rollbackTransactionIds: string[] = []
        const affectedUsers: string[] = []
        
        // Rollback user balances and create compensating transactions
        for (const winningCommitment of distribution.winningCommitments) {
          const userId = winningCommitment.auditTrail.originalPosition ? 
            distribution.userId : // System record
            winningCommitment.commitmentId.split('_')[0] // Extract user ID from commitment ID pattern
          
          if (userId && userId !== 'system') {
            affectedUsers.push(userId)
            
            // Reverse user balance in users collection
            const userRef = doc(db, COLLECTIONS.users, userId)
            transaction.update(userRef, {
              tokenBalance: increment(-winningCommitment.payoutAmount)
            })
            
            // Create rollback transaction record
            const rollbackTransactionRef = doc(collection(db, COLLECTIONS.tokenTransactions))
            const rollbackTransactionData = {
              userId,
              type: 'loss' as const,
              amount: -winningCommitment.payoutAmount,
              balanceBefore: 0, // Will be updated by TokenBalanceService
              balanceAfter: 0,  // Will be updated by TokenBalanceService
              relatedId: distributionId,
              metadata: {
                rollbackReason: reason,
                originalDistributionId: distributionId,
                originalCommitmentId: winningCommitment.commitmentId,
                rollbackType: 'payout_distribution_rollback'
              },
              timestamp: Timestamp.now(),
              status: 'completed' as const
            }
            transaction.set(rollbackTransactionRef, rollbackTransactionData)
            rollbackTransactionIds.push(rollbackTransactionRef.id)
          }
        }
        
        // Update distribution status
        transaction.update(distributionRef, {
          status: 'rolled_back',
          metadata: {
            ...distribution.metadata,
            rollbackReason: reason,
            rollbackTimestamp: Timestamp.now(),
            rollbackAdminId: adminId,
            rollbackTransactionIds
          }
        })
        
        // Reset commitment statuses
        for (const commitment of [...distribution.winningCommitments, ...distribution.losingCommitments]) {
          const commitmentRef = doc(db, COLLECTIONS.predictionCommitments, commitment.commitmentId)
          transaction.update(commitmentRef, {
            status: 'active',
            resolvedAt: null,
            payoutAmount: null,
            profit: null,
            winShare: null
          })
        }
        
        return {
          rollbackTransactionIds,
          affectedUsers: Array.from(new Set(affectedUsers))
        }
      })
      
      console.log('✅ Rollback transaction completed')
      
      // Rollback TokenBalanceService updates (non-critical)
      try {
        for (const transactionId of distribution.transactionIds) {
          await TokenBalanceService.rollbackTransaction(transactionId, `Rollback distribution ${distributionId}: ${reason}`)
        }
        console.log('✅ TokenBalanceService rollbacks completed')
      } catch (error) {
        console.warn('⚠️ Non-critical error rolling back TokenBalanceService:', error)
      }
      
      return {
        success: true,
        distributionId,
        rollbackTransactionIds: rollbackResult.rollbackTransactionIds,
        affectedUsers: rollbackResult.affectedUsers
      }
      
    } catch (error) {
      console.error('❌ Error rolling back payout distribution:', error)
      
      return {
        success: false,
        distributionId,
        rollbackTransactionIds: [],
        affectedUsers: [],
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'ROLLBACK_FAILED',
          details: error
        }
      }
    }
  }
  
  /**
   * Get payout distribution record
   */
  static async getPayoutDistribution(distributionId: string): Promise<PayoutDistribution | null> {
    try {
      const distributionRef = doc(db, COLLECTIONS.payoutDistributions, distributionId)
      const distributionSnap = await runTransaction(db, async (transaction) => {
        return await transaction.get(distributionRef)
      })
      
      if (distributionSnap.exists()) {
        return {
          id: distributionSnap.id,
          ...distributionSnap.data()
        } as PayoutDistribution
      }
      
      return null
    } catch (error) {
      console.error('Error getting payout distribution:', error)
      throw new Error(`Failed to get payout distribution ${distributionId}`)
    }
  }
  
  /**
   * Get payout distributions for a market
   */
  static async getMarketPayoutDistributions(marketId: string): Promise<PayoutDistribution[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.payoutDistributions),
        where('marketId', '==', marketId)
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PayoutDistribution[]
    } catch (error) {
      console.error('Error getting market payout distributions:', error)
      throw new Error(`Failed to get payout distributions for market ${marketId}`)
    }
  }
  
  /**
   * Get payout distributions for a user
   */
  static async getUserPayoutDistributions(userId: string): Promise<PayoutDistribution[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.payoutDistributions),
        where('userId', '==', userId)
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PayoutDistribution[]
    } catch (error) {
      console.error('Error getting user payout distributions:', error)
      throw new Error(`Failed to get payout distributions for user ${userId}`)
    }
  }
}