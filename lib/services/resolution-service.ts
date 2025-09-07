import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  increment,
  DocumentSnapshot,
  runTransaction
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import {
  Market,
  MarketResolution,
  Evidence,
  ResolutionPayout,
  CreatorPayout,
  HousePayout,
  PayoutPreview,
  ResolutionValidation,
  ResolutionError,
  ResolutionWarning,
  MarketStatus
} from '@/lib/types/database'
import { PredictionCommitment } from '@/lib/types/token'
import { TokenBalanceService } from './token-balance-service'
import { AdminAuthService } from '@/lib/auth/admin-auth'

// Collection references
const COLLECTIONS = {
  markets: 'markets',
  predictionCommitments: 'prediction_commitments', // Fixed: use underscore like AdminCommitmentService
  marketResolutions: 'marketResolutions',
  resolutionPayouts: 'resolutionPayouts',
  creatorPayouts: 'creatorPayouts',
  housePayouts: 'housePayouts',
  resolutionEvidence: 'resolutionEvidence',
  users: 'users',
  transactions: 'transactions',
  resolutionLogs: 'resolutionLogs'
} as const

// Enhanced error types for resolution workflow
export enum ResolutionErrorType {
  MARKET_NOT_FOUND = 'market_not_found',
  MARKET_ALREADY_RESOLVED = 'market_already_resolved',
  MARKET_NOT_READY = 'market_not_ready',
  INSUFFICIENT_EVIDENCE = 'insufficient_evidence',
  INVALID_WINNER_SELECTION = 'invalid_winner_selection',
  PAYOUT_CALCULATION_FAILED = 'payout_calculation_failed',
  TOKEN_DISTRIBUTION_FAILED = 'token_distribution_failed',
  DATABASE_TRANSACTION_FAILED = 'database_transaction_failed',
  ROLLBACK_FAILED = 'rollback_failed',
  VALIDATION_FAILED = 'validation_failed',
  UNAUTHORIZED = 'unauthorized'
}

export class ResolutionServiceError extends Error {
  constructor(
    public type: ResolutionErrorType,
    public message: string,
    public marketId?: string,
    public details?: any,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'ResolutionServiceError'
  }
}

// Resolution status tracking
export interface ResolutionLog {
  id: string
  marketId: string
  action: 'resolution_started' | 'evidence_validated' | 'payouts_calculated' | 'tokens_distributed' | 'resolution_completed' | 'resolution_failed' | 'rollback_initiated' | 'rollback_completed'
  adminId: string
  timestamp: Timestamp
  details?: any
  error?: string
}

/**
 * Resolution Service
 * Handles market resolution, payout calculation, and token distribution
 */
export class ResolutionService {
  
  /**
   * Verify admin privileges for critical operations
   */
  private static async verifyAdminPrivileges(adminId: string): Promise<void> {
    console.log('🔐 Verifying admin privileges for user:', adminId)
    
    if (!adminId) {
      console.error('❌ No admin ID provided')
      throw new ResolutionServiceError(
        ResolutionErrorType.UNAUTHORIZED,
        'User identification required for admin operations'
      )
    }
    
    try {
      const isAdmin = await AdminAuthService.checkUserIsAdmin(adminId)
      console.log('🔐 Admin check result for', adminId, ':', isAdmin)
      
      if (!isAdmin) {
        console.error('❌ Admin check failed for user:', adminId)
        throw new ResolutionServiceError(
          ResolutionErrorType.UNAUTHORIZED,
          'Admin privileges required for this operation'
        )
      }
      
      console.log('✅ Admin privileges verified for user:', adminId)
    } catch (error) {
      console.error('❌ Error during admin verification:', error)
      throw new ResolutionServiceError(
        ResolutionErrorType.UNAUTHORIZED,
        `Admin verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
  
  /**
   * Get markets that are past their end date and need resolution
   */
  static async getPendingResolutionMarkets(): Promise<Market[]> {
    try {
      const now = Timestamp.now()
      const q = query(
        collection(db, COLLECTIONS.markets),
        where('status', '==', 'active'),
        where('endsAt', '<=', now),
        orderBy('endsAt', 'asc')
      )
      
      const querySnapshot = await getDocs(q)
      const markets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Market[]
      
      // Update status to pending_resolution for markets that need it
      const batch = writeBatch(db)
      markets.forEach(market => {
        if (market.status === 'active') {
          const marketRef = doc(db, COLLECTIONS.markets, market.id)
          batch.update(marketRef, {
            status: 'pending_resolution' as MarketStatus,
            pendingResolution: true
          })
        }
      })
      
      if (markets.length > 0) {
        await batch.commit()
      }
      
      return markets.map(market => ({
        ...market,
        status: 'pending_resolution' as MarketStatus,
        pendingResolution: true
      }))
      
    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error getting pending markets:', error)
      throw new Error('Failed to retrieve pending resolution markets')
    }
  }

  /**
   * Get user bets for a specific market and option
   */
  static async getUserBets(marketId: string, optionId: string): Promise<Array<{
    userId: string
    tokensStaked: number
    userEmail?: string
    userDisplayName?: string
  }>> {
    try {
      // Get all commitments for this market
      const q = query(
        collection(db, COLLECTIONS.predictionCommitments),
        where('predictionId', '==', marketId),
        where('position', '==', optionId === 'yes' ? 'yes' : 'no'),
        where('status', '==', 'active')
      )
      
      const querySnapshot = await getDocs(q)
      const commitments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[]
      
      // Transform to the expected format
      return commitments.map(commitment => ({
        userId: commitment.userId,
        tokensStaked: commitment.tokensCommitted,
        userEmail: commitment.userEmail,
        userDisplayName: commitment.userDisplayName
      }))
      
    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error getting user bets:', error)
      throw new Error('Failed to retrieve user bets')
    }
  }

  /**
   * Calculate payout preview for a market resolution
   */
  static async calculatePayoutPreview(
    marketId: string, 
    winningOptionId: string,
    creatorFeePercentage: number = 0.02 // Default 2%
  ): Promise<PayoutPreview> {
    try {
      const market = await this.getMarket(marketId)
      if (!market) {
        throw new Error('Market not found')
      }

      // Get all commitments for this market
      console.log('🔍 Fetching commitments for market:', marketId)
      console.log('🔍 Using collection:', COLLECTIONS.predictionCommitments)
      
      // First, let's see what's actually in the collection
      console.log('🔍 Checking what exists in prediction_commitments collection...')
      try {
        const allDocsQuery = query(collection(db, COLLECTIONS.predictionCommitments), limit(5))
        const allDocsSnapshot = await getDocs(allDocsQuery)
        console.log('🔍 Sample documents in collection:', allDocsSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        })))
      } catch (error) {
        console.error('❌ Error fetching sample documents:', error)
      }
      
      let allCommitmentsSnapshot
      try {
        const allCommitmentsQuery = query(
          collection(db, COLLECTIONS.predictionCommitments),
          where('predictionId', '==', marketId),
          where('status', '==', 'active')
        )
        
        allCommitmentsSnapshot = await getDocs(allCommitmentsQuery)
        console.log('🔍 Found', allCommitmentsSnapshot.docs.length, 'commitments')
      } catch (error) {
        console.error('❌ Error fetching commitments:', error)
        // Return empty preview if query fails
        return {
          totalPool: 0,
          houseFee: 0,
          creatorFee: 0,
          winnerPool: 0,
          winnerCount: 0,
          largestPayout: 0,
          smallestPayout: 0,
          creatorPayout: {
            userId: market.createdBy,
            feeAmount: 0,
            feePercentage: creatorFeePercentage
          },
          payouts: []
        }
      }
      
      const allCommitments = allCommitmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[]
      
      console.log('🔍 Processed commitments:', allCommitments.map(c => ({
        id: c.id,
        userId: c.userId,
        tokensCommitted: c.tokensCommitted,
        position: c.position,
        status: c.status
      })))

      // If no commitments found, try alternative query with marketId field
      if (allCommitments.length === 0) {
        console.log('⚠️ No commitments found with predictionId, trying marketId field...')
        
        const altCommitmentsQuery = query(
          collection(db, COLLECTIONS.predictionCommitments),
          where('marketId', '==', marketId),
          where('status', '==', 'active')
        )
        
        const altCommitmentsSnapshot = await getDocs(altCommitmentsQuery)
        console.log('🔍 Found', altCommitmentsSnapshot.docs.length, 'commitments with marketId field')
        
        const altCommitments = altCommitmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PredictionCommitment[]
        
        if (altCommitments.length > 0) {
          allCommitments.push(...altCommitments)
        }
        console.log('🔍 Total commitments after fallback:', allCommitments.length)
      }

      // If still no commitments, try without status filter
      if (allCommitments.length === 0) {
        console.log('⚠️ No active commitments found, trying without status filter...')
        
        const noStatusQuery = query(
          collection(db, COLLECTIONS.predictionCommitments),
          where('predictionId', '==', marketId)
        )
        
        const noStatusSnapshot = await getDocs(noStatusQuery)
        console.log('🔍 Found', noStatusSnapshot.docs.length, 'commitments without status filter')
        
        const noStatusCommitments = noStatusSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PredictionCommitment[]
        
        if (noStatusCommitments.length > 0) {
          allCommitments.push(...noStatusCommitments)
        }
        console.log('🔍 Total commitments after no-status fallback:', allCommitments.length)
      }

      // Calculate total market pool
      const totalMarketPool = allCommitments.reduce((sum, commitment) => 
        sum + commitment.tokensCommitted, 0
      )

      // Get winning commitments
      console.log('🔍 Market options:', market.options)
      console.log('🔍 Winning option ID:', winningOptionId)
      
      // Find the winning option in the market
      const winningOption = market.options?.find(option => option.id === winningOptionId)
      console.log('🔍 Winning option:', winningOption)
      
      let winningPosition: 'yes' | 'no' | null = null
      if (winningOptionId === 'yes') {
        winningPosition = 'yes'
      } else if (winningOptionId === 'no') {
        winningPosition = 'no'
      } else {
        // For non-binary markets, we need to handle differently
        console.log('🔍 Non-binary market detected, using option ID as position')
        winningPosition = winningOptionId as any
      }
      
      const winningCommitments = winningPosition 
        ? allCommitments.filter(c => c.position === winningPosition)
        : []
      const totalWinnerTokens = winningCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)

      // Calculate fees
      const houseFeePercentage = 0.05 // Always 5%
      const houseFee = Math.floor(totalMarketPool * houseFeePercentage)
      const creatorFee = Math.floor(totalMarketPool * creatorFeePercentage)
      
      // Remaining pool for winners after both fees
      const winnerPool = totalMarketPool - houseFee - creatorFee

      // Calculate individual payouts
      const payouts = winningCommitments.map(commitment => {
        const userShare = totalWinnerTokens > 0 ? commitment.tokensCommitted / totalWinnerTokens : 0
        const projectedPayout = Math.floor(userShare * winnerPool)
        const projectedProfit = projectedPayout - commitment.tokensCommitted

        return {
          userId: commitment.userId,
          currentStake: commitment.tokensCommitted,
          projectedPayout,
          projectedProfit
        }
      })

      // Calculate min/max payouts
      const payoutAmounts = payouts.map(p => p.projectedPayout)
      const largestPayout = payoutAmounts.length > 0 ? Math.max(...payoutAmounts) : 0
      const smallestPayout = payoutAmounts.length > 0 ? Math.min(...payoutAmounts) : 0

      return {
        totalPool: totalMarketPool,
        houseFee,
        creatorFee,
        winnerPool,
        winnerCount: winningCommitments.length,
        largestPayout,
        smallestPayout,
        creatorPayout: {
          userId: market.createdBy,
          feeAmount: creatorFee,
          feePercentage: creatorFeePercentage * 100
        },
        payouts
      }

    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error calculating payout preview:', error)
      throw new Error('Failed to calculate payout preview')
    }
  }

  /**
   * Validate evidence for market resolution
   */
  static validateEvidence(evidence: Evidence[]): ResolutionValidation {
    const errors: ResolutionError[] = []
    const warnings: ResolutionWarning[] = []

    if (!evidence || evidence.length === 0) {
      errors.push({
        field: 'evidence',
        message: 'At least one piece of evidence is required for resolution',
        code: 'NO_EVIDENCE'
      })
    }

    // Check for at least one URL or description
    const hasUrl = evidence.some(e => e.type === 'url' && e.content.trim())
    const hasDescription = evidence.some(e => e.type === 'description' && e.content.trim())
    
    if (!hasUrl && !hasDescription) {
      errors.push({
        field: 'evidence',
        message: 'Resolution must include either a source URL or detailed description',
        code: 'INSUFFICIENT_EVIDENCE'
      })
    }

    // Validate URLs
    evidence.forEach((item, index) => {
      if (item.type === 'url') {
        try {
          new URL(item.content)
        } catch {
          errors.push({
            field: `evidence[${index}]`,
            message: 'Invalid URL format',
            code: 'INVALID_URL'
          })
        }
      }

      if (item.content.trim().length < 10) {
        warnings.push({
          field: `evidence[${index}]`,
          message: 'Evidence content is very short. Consider adding more detail.',
          code: 'SHORT_EVIDENCE'
        })
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Resolve a market with evidence and distribute payouts (with rollback support)
   */
  static async resolveMarket(
    marketId: string,
    winningOptionId: string,
    evidence: Evidence[],
    adminId: string,
    creatorFeePercentage: number = 0.02
  ): Promise<{ success: boolean; resolutionId: string }> {
    let resolutionId: string | null = null
    
    try {
      // Verify admin privileges before any operations
      await this.verifyAdminPrivileges(adminId)
      
      // Log resolution start
      await this.logResolutionAction(marketId, 'resolution_started', adminId, {
        winningOptionId,
        evidenceCount: evidence.length,
        creatorFeePercentage
      })

      // Validate evidence
      const evidenceValidation = this.validateEvidence(evidence)
      if (!evidenceValidation.isValid) {
        throw new ResolutionServiceError(
          ResolutionErrorType.INSUFFICIENT_EVIDENCE,
          `Invalid evidence: ${evidenceValidation.errors.map(e => e.message).join(', ')}`,
          marketId,
          { errors: evidenceValidation.errors }
        )
      }

      await this.logResolutionAction(marketId, 'evidence_validated', adminId, {
        validationResult: evidenceValidation
      })

      // Validate market can be resolved
      const market = await this.getMarket(marketId)
      if (!market) {
        throw new ResolutionServiceError(
          ResolutionErrorType.MARKET_NOT_FOUND,
          'Market not found',
          marketId
        )
      }

      if (market.status === 'resolved') {
        throw new ResolutionServiceError(
          ResolutionErrorType.MARKET_ALREADY_RESOLVED,
          'Market is already resolved',
          marketId
        )
      }

      if (market.status !== 'pending_resolution' && market.status !== 'active') {
        throw new ResolutionServiceError(
          ResolutionErrorType.MARKET_NOT_READY,
          'Market is not ready for resolution',
          marketId,
          { currentStatus: market.status }
        )
      }

      // Update market to resolving status
      await this.updateMarketStatus(marketId, 'resolving')

      // Calculate payouts
      const payoutPreview = await this.calculatePayoutPreview(marketId, winningOptionId, creatorFeePercentage)
      
      await this.logResolutionAction(marketId, 'payouts_calculated', adminId, {
        payoutPreview: {
          totalPool: payoutPreview.totalPool,
          winnerCount: payoutPreview.winnerCount,
          houseFee: payoutPreview.houseFee,
          creatorFee: payoutPreview.creatorFee,
          winnerPool: payoutPreview.winnerPool
        }
      })

      // Execute resolution in transaction for atomicity
      resolutionId = await runTransaction(db, async (transaction) => {
        // Create resolution record
        const resolutionRef = doc(collection(db, COLLECTIONS.marketResolutions))
        const resolutionData: Omit<MarketResolution, 'id'> = {
          marketId,
          winningOptionId,
          resolvedBy: adminId,
          resolvedAt: Timestamp.now(),
          evidence,
          totalPayout: payoutPreview.winnerPool,
          winnerCount: payoutPreview.winnerCount,
          status: 'completed',
          creatorFeeAmount: payoutPreview.creatorFee,
          houseFeeAmount: payoutPreview.houseFee
        }
        transaction.set(resolutionRef, resolutionData)

        // Update market status
        const marketRef = doc(db, COLLECTIONS.markets, marketId)
        transaction.update(marketRef, {
          status: 'resolved' as MarketStatus,
          resolvedAt: Timestamp.now(),
          resolution: {
            ...resolutionData,
            id: resolutionRef.id
          }
        })

        // Create individual winner payouts and update balances
        for (const payout of payoutPreview.payouts) {
          const payoutRef = doc(collection(db, COLLECTIONS.resolutionPayouts))
          const payoutData: Omit<ResolutionPayout, 'id'> = {
            resolutionId: resolutionRef.id,
            userId: payout.userId,
            optionId: winningOptionId,
            tokensStaked: payout.currentStake,
            payoutAmount: payout.projectedPayout,
            profit: payout.projectedProfit,
            processedAt: Timestamp.now(),
            status: 'completed'
          }
          transaction.set(payoutRef, payoutData)

          // Update user balance in users collection (legacy)
          const userRef = doc(db, COLLECTIONS.users, payout.userId)
          transaction.update(userRef, {
            tokenBalance: increment(payout.projectedPayout)
          })

          // Create transaction record
          const transactionRef = doc(collection(db, COLLECTIONS.transactions))
          transaction.set(transactionRef, {
            userId: payout.userId,
            type: 'prediction_win',
            amount: payout.projectedPayout,
            description: `Won prediction: ${market.title}`,
            createdAt: Timestamp.now(),
            marketId,
            metadata: {
              resolutionId: resolutionRef.id,
              tokensStaked: payout.currentStake,
              profit: payout.projectedProfit
            }
          })
        }

        // Create creator payout if there's a fee
        if (payoutPreview.creatorFee > 0) {
          const creatorPayoutRef = doc(collection(db, COLLECTIONS.creatorPayouts))
          const creatorPayoutData: Omit<CreatorPayout, 'id'> = {
            resolutionId: resolutionRef.id,
            creatorId: market.createdBy,
            feeAmount: payoutPreview.creatorFee,
            feePercentage: creatorFeePercentage,
            processedAt: Timestamp.now(),
            status: 'completed'
          }
          transaction.set(creatorPayoutRef, creatorPayoutData)

          // Update creator balance
          const creatorRef = doc(db, COLLECTIONS.users, market.createdBy)
          transaction.update(creatorRef, {
            tokenBalance: increment(payoutPreview.creatorFee)
          })

          // Create creator transaction record
          const creatorTransactionRef = doc(collection(db, COLLECTIONS.transactions))
          transaction.set(creatorTransactionRef, {
            userId: market.createdBy,
            type: 'creator_fee',
            amount: payoutPreview.creatorFee,
            description: `Creator fee from market: ${market.title}`,
            createdAt: Timestamp.now(),
            marketId,
            metadata: {
              resolutionId: resolutionRef.id,
              feePercentage: creatorFeePercentage * 100
            }
          })
        }

        // Create house payout record (no balance update - goes to platform)
        const housePayoutRef = doc(collection(db, COLLECTIONS.housePayouts))
        const housePayoutData: Omit<HousePayout, 'id'> = {
          resolutionId: resolutionRef.id,
          feeAmount: payoutPreview.houseFee,
          feePercentage: 5.0, // Always 5%
          processedAt: Timestamp.now(),
          status: 'completed'
        }
        transaction.set(housePayoutRef, housePayoutData)

        return resolutionRef.id
      })

      // Update token balance service for all payout recipients (non-critical but important for UI)
      try {
        // Update winner balances
        for (const payout of payoutPreview.payouts) {
          await TokenBalanceService.updateBalanceAtomic({
            userId: payout.userId,
            amount: payout.projectedPayout,
            type: 'win',
            relatedId: resolutionId,
            metadata: {
              marketId,
              marketTitle: market.title,
              tokensStaked: payout.currentStake,
              profit: payout.projectedProfit,
              resolutionId
            }
          })
        }

        // Update creator balance if there's a fee
        if (payoutPreview.creatorFee > 0) {
          await TokenBalanceService.updateBalanceAtomic({
            userId: market.createdBy,
            amount: payoutPreview.creatorFee,
            type: 'win',
            relatedId: resolutionId,
            metadata: {
              marketId,
              marketTitle: market.title,
              feeType: 'creator_fee',
              feePercentage: creatorFeePercentage * 100,
              resolutionId
            }
          })
        }
      } catch (error) {
        console.warn('[RESOLUTION_SERVICE] Non-critical error updating token balance service:', error)
        // Don't fail the resolution for this, but log it for monitoring
      }

      // Update commitment statuses in separate transaction (non-critical)
      try {
        await this.updateCommitmentStatuses(marketId, winningOptionId)
        
        await this.logResolutionAction(marketId, 'tokens_distributed', adminId, {
          resolutionId,
          payoutsProcessed: payoutPreview.payouts.length
        })
      } catch (error) {
        console.warn('[RESOLUTION_SERVICE] Non-critical error updating commitment statuses:', error)
        // Don't fail the resolution for this
      }

      await this.logResolutionAction(marketId, 'resolution_completed', adminId, {
        resolutionId,
        success: true
      })

      return {
        success: true,
        resolutionId
      }

    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error resolving market:', error)
      
      // Log the failure
      await this.logResolutionAction(marketId, 'resolution_failed', adminId, {
        error: error instanceof Error ? error.message : 'Unknown error',
        resolutionId
      })

      // Attempt rollback if we have a resolution ID
      if (resolutionId) {
        try {
          await this.rollbackResolution(marketId, resolutionId, adminId)
        } catch (rollbackError) {
          console.error('[RESOLUTION_SERVICE] Rollback failed:', rollbackError)
          throw new ResolutionServiceError(
            ResolutionErrorType.ROLLBACK_FAILED,
            'Resolution failed and rollback also failed',
            marketId,
            { originalError: error, rollbackError },
            error instanceof Error ? error : new Error(String(error))
          )
        }
      } else {
        // Just reset market status if no resolution was created
        try {
          await this.updateMarketStatus(marketId, 'pending_resolution')
        } catch (statusError) {
          console.error('[RESOLUTION_SERVICE] Failed to reset market status:', statusError)
        }
      }

      // Re-throw the original error
      if (error instanceof ResolutionServiceError) {
        throw error
      } else {
        throw new ResolutionServiceError(
          ResolutionErrorType.DATABASE_TRANSACTION_FAILED,
          'Failed to resolve market',
          marketId,
          { originalError: error },
          error instanceof Error ? error : new Error(String(error))
        )
      }
    }
  }

  /**
   * Rollback a failed resolution (public for testing)
   */
  static async rollbackResolution(
    marketId: string,
    resolutionId: string,
    adminId: string
  ): Promise<void> {
    // Verify admin privileges before rollback operations (outside try-catch to allow auth errors to bubble up)
    await this.verifyAdminPrivileges(adminId)
    
    try {
      await this.logResolutionAction(marketId, 'rollback_initiated', adminId, {
        resolutionId
      })

      await runTransaction(db, async (transaction) => {
        // Get resolution data to reverse operations
        const resolutionRef = doc(db, COLLECTIONS.marketResolutions, resolutionId)
        const resolutionDoc = await transaction.get(resolutionRef)
        
        if (!resolutionDoc.exists()) {
          throw new Error('Resolution record not found for rollback')
        }

        const resolutionData = resolutionDoc.data() as MarketResolution

        // Reset market status
        const marketRef = doc(db, COLLECTIONS.markets, marketId)
        transaction.update(marketRef, {
          status: 'pending_resolution' as MarketStatus,
          resolvedAt: null,
          resolution: null
        })

        // Get all payouts to reverse
        const payoutsQuery = query(
          collection(db, COLLECTIONS.resolutionPayouts),
          where('resolutionId', '==', resolutionId)
        )
        const payoutsSnapshot = await getDocs(payoutsQuery)

        // Reverse winner payouts
        for (const payoutDoc of payoutsSnapshot.docs) {
          const payout = payoutDoc.data() as ResolutionPayout
          
          // Reverse user balance in users collection
          const userRef = doc(db, COLLECTIONS.users, payout.userId)
          transaction.update(userRef, {
            tokenBalance: increment(-payout.payoutAmount)
          })

          // Mark payout as failed
          transaction.update(payoutDoc.ref, {
            status: 'failed'
          })
        }

        // Get and reverse creator payout
        const creatorPayoutsQuery = query(
          collection(db, COLLECTIONS.creatorPayouts),
          where('resolutionId', '==', resolutionId)
        )
        const creatorPayoutsSnapshot = await getDocs(creatorPayoutsQuery)

        for (const creatorPayoutDoc of creatorPayoutsSnapshot.docs) {
          const creatorPayout = creatorPayoutDoc.data() as CreatorPayout
          
          // Reverse creator balance in users collection
          const creatorRef = doc(db, COLLECTIONS.users, creatorPayout.creatorId)
          transaction.update(creatorRef, {
            tokenBalance: increment(-creatorPayout.feeAmount)
          })

          // Mark creator payout as failed
          transaction.update(creatorPayoutDoc.ref, {
            status: 'failed'
          })
        }

        // Mark resolution as cancelled
        transaction.update(resolutionRef, {
          status: 'cancelled'
        })

        // Reset commitment statuses
        const commitmentsQuery = query(
          collection(db, COLLECTIONS.predictionCommitments),
          where('predictionId', '==', marketId)
        )
        const commitmentsSnapshot = await getDocs(commitmentsQuery)

        for (const commitmentDoc of commitmentsSnapshot.docs) {
          transaction.update(commitmentDoc.ref, {
            status: 'active',
            resolvedAt: null
          })
        }
      })

      // Rollback token balance service updates (non-critical but important for UI consistency)
      try {
        // Rollback winner payouts from token balance service
        for (const payoutDoc of payoutsSnapshot.docs) {
          const payout = payoutDoc.data() as ResolutionPayout
          
          await TokenBalanceService.rollbackTransaction(
            `resolution_payout_${payout.id}`,
            `Rollback resolution ${resolutionId}`
          )
        }

        // Rollback creator payouts from token balance service
        for (const creatorPayoutDoc of creatorPayoutsSnapshot.docs) {
          const creatorPayout = creatorPayoutDoc.data() as CreatorPayout
          
          await TokenBalanceService.rollbackTransaction(
            `creator_payout_${creatorPayout.id}`,
            `Rollback resolution ${resolutionId}`
          )
        }
      } catch (error) {
        console.warn('[RESOLUTION_SERVICE] Non-critical error rolling back token balance service:', error)
        // Don't fail the rollback for this
      }

      await this.logResolutionAction(marketId, 'rollback_completed', adminId, {
        resolutionId,
        success: true
      })

    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Rollback failed:', error)
      throw new ResolutionServiceError(
        ResolutionErrorType.ROLLBACK_FAILED,
        'Failed to rollback resolution',
        marketId,
        { resolutionId, error },
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Update market status
   */
  private static async updateMarketStatus(marketId: string, status: MarketStatus): Promise<void> {
    try {
      const marketRef = doc(db, COLLECTIONS.markets, marketId)
      await updateDoc(marketRef, {
        status,
        ...(status === 'pending_resolution' && { pendingResolution: true })
      })
    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error updating market status:', error)
      throw error
    }
  }

  /**
   * Update commitment statuses after resolution
   */
  private static async updateCommitmentStatuses(marketId: string, winningOptionId: string): Promise<void> {
    try {
      const allCommitmentsQuery = query(
        collection(db, COLLECTIONS.predictionCommitments),
        where('predictionId', '==', marketId),
        where('status', '==', 'active')
      )
      
      const allCommitmentsSnapshot = await getDocs(allCommitmentsQuery)
      const batch = writeBatch(db)
      
      allCommitmentsSnapshot.docs.forEach(doc => {
        const commitment = doc.data() as PredictionCommitment
        const newStatus = commitment.position === (winningOptionId === 'yes' ? 'yes' : 'no') ? 'won' : 'lost'
        
        batch.update(doc.ref, {
          status: newStatus,
          resolvedAt: Timestamp.now()
        })
      })

      await batch.commit()
    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error updating commitment statuses:', error)
      throw error
    }
  }

  /**
   * Log resolution actions for audit trail
   */
  private static async logResolutionAction(
    marketId: string,
    action: ResolutionLog['action'],
    adminId: string,
    details?: any
  ): Promise<void> {
    try {
      const logRef = doc(collection(db, COLLECTIONS.resolutionLogs))
      const logData: Omit<ResolutionLog, 'id'> = {
        marketId,
        action,
        adminId,
        timestamp: Timestamp.now(),
        details
      }
      await addDoc(collection(db, COLLECTIONS.resolutionLogs), logData)
    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error logging resolution action:', error)
      // Don't throw - logging failures shouldn't break resolution
    }
  }

  /**
   * Get market by ID
   */
  private static async getMarket(marketId: string): Promise<Market | null> {
    try {
      const docRef = doc(db, COLLECTIONS.markets, marketId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Market
      }
      return null
    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error getting market:', error)
      throw new Error('Failed to retrieve market')
    }
  }

  /**
   * Get resolution details for a market
   */
  static async getMarketResolution(marketId: string): Promise<MarketResolution | null> {
    try {
      const q = query(
        collection(db, COLLECTIONS.marketResolutions),
        where('marketId', '==', marketId)
      )
      
      const querySnapshot = await getDocs(q)
      if (querySnapshot.empty) {
        return null
      }

      const doc = querySnapshot.docs[0]
      return { id: doc.id, ...doc.data() } as MarketResolution

    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error getting market resolution:', error)
      throw new Error('Failed to retrieve market resolution')
    }
  }

  /**
   * Get user's resolution payouts
   */
  static async getUserResolutionPayouts(userId: string): Promise<{
    winnerPayouts: ResolutionPayout[]
    creatorPayouts: CreatorPayout[]
  }> {
    try {
      // Get winner payouts
      const winnerPayoutsQuery = query(
        collection(db, COLLECTIONS.resolutionPayouts),
        where('userId', '==', userId),
        orderBy('processedAt', 'desc')
      )
      
      const winnerPayoutsSnapshot = await getDocs(winnerPayoutsQuery)
      const winnerPayouts = winnerPayoutsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ResolutionPayout[]

      // Get creator payouts
      const creatorPayoutsQuery = query(
        collection(db, COLLECTIONS.creatorPayouts),
        where('creatorId', '==', userId),
        orderBy('processedAt', 'desc')
      )
      
      const creatorPayoutsSnapshot = await getDocs(creatorPayoutsQuery)
      const creatorPayouts = creatorPayoutsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CreatorPayout[]

      return {
        winnerPayouts,
        creatorPayouts
      }

    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error getting user payouts:', error)
      throw new ResolutionServiceError(
        ResolutionErrorType.DATABASE_TRANSACTION_FAILED,
        'Failed to retrieve user payouts',
        undefined,
        { userId },
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Get resolution logs for a market (audit trail)
   */
  static async getResolutionLogs(marketId: string): Promise<ResolutionLog[]> {
    try {
      const logsQuery = query(
        collection(db, COLLECTIONS.resolutionLogs),
        where('marketId', '==', marketId),
        orderBy('timestamp', 'asc')
      )
      
      const logsSnapshot = await getDocs(logsQuery)
      return logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ResolutionLog[]

    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error getting resolution logs:', error)
      throw new ResolutionServiceError(
        ResolutionErrorType.DATABASE_TRANSACTION_FAILED,
        'Failed to retrieve resolution logs',
        marketId,
        {},
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Get resolution status for a market
   */
  static async getResolutionStatus(marketId: string): Promise<{
    status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'rolled_back'
    logs: ResolutionLog[]
    lastAction?: ResolutionLog
    error?: string
  }> {
    try {
      const logs = await this.getResolutionLogs(marketId)
      
      if (logs.length === 0) {
        return {
          status: 'not_started',
          logs: []
        }
      }

      const lastLog = logs[logs.length - 1]
      let status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'rolled_back'

      switch (lastLog.action) {
        case 'resolution_completed':
          status = 'completed'
          break
        case 'resolution_failed':
          status = 'failed'
          break
        case 'rollback_completed':
          status = 'rolled_back'
          break
        case 'resolution_started':
        case 'evidence_validated':
        case 'payouts_calculated':
        case 'tokens_distributed':
        case 'rollback_initiated':
          status = 'in_progress'
          break
        default:
          status = 'not_started'
      }

      return {
        status,
        logs,
        lastAction: lastLog,
        error: lastLog.error
      }

    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error getting resolution status:', error)
      throw new ResolutionServiceError(
        ResolutionErrorType.DATABASE_TRANSACTION_FAILED,
        'Failed to retrieve resolution status',
        marketId,
        {},
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Cancel an unresolvable market and refund tokens
   */
  static async cancelMarket(
    marketId: string,
    reason: string,
    adminId: string,
    refundTokens: boolean = true
  ): Promise<{ success: boolean; refundsProcessed: number }> {
    try {
      // Verify admin privileges before market cancellation
      await this.verifyAdminPrivileges(adminId)
      
      await this.logResolutionAction(marketId, 'resolution_started', adminId, {
        action: 'cancel_market',
        reason,
        refundTokens
      })

      const market = await this.getMarket(marketId)
      if (!market) {
        throw new ResolutionServiceError(
          ResolutionErrorType.MARKET_NOT_FOUND,
          'Market not found',
          marketId
        )
      }

      if (market.status === 'resolved' || market.status === 'cancelled') {
        throw new ResolutionServiceError(
          ResolutionErrorType.MARKET_ALREADY_RESOLVED,
          'Market is already resolved or cancelled',
          marketId,
          { currentStatus: market.status }
        )
      }

      let refundsProcessed = 0

      await runTransaction(db, async (transaction) => {
        // Update market status
        const marketRef = doc(db, COLLECTIONS.markets, marketId)
        transaction.update(marketRef, {
          status: 'cancelled' as MarketStatus,
          resolvedAt: Timestamp.now(),
          cancellationReason: reason
        })

        if (refundTokens) {
          // Get all active commitments
          const commitmentsQuery = query(
            collection(db, COLLECTIONS.predictionCommitments),
            where('predictionId', '==', marketId),
            where('status', '==', 'active')
          )
          
          const commitmentsSnapshot = await getDocs(commitmentsQuery)
          
          for (const commitmentDoc of commitmentsSnapshot.docs) {
            const commitment = commitmentDoc.data() as PredictionCommitment
            
            // Refund tokens to user
            const userRef = doc(db, COLLECTIONS.users, commitment.userId)
            transaction.update(userRef, {
              tokenBalance: increment(commitment.tokensCommitted)
            })

            // Update commitment status
            transaction.update(commitmentDoc.ref, {
              status: 'refunded',
              resolvedAt: Timestamp.now()
            })

            // Create refund transaction record
            const transactionRef = doc(collection(db, COLLECTIONS.transactions))
            transaction.set(transactionRef, {
              userId: commitment.userId,
              type: 'admin_adjustment',
              amount: commitment.tokensCommitted,
              description: `Refund for cancelled market: ${market.title}`,
              createdAt: Timestamp.now(),
              marketId,
              metadata: {
                reason: 'market_cancelled',
                originalCommitment: commitment.tokensCommitted,
                cancellationReason: reason
              }
            })

            refundsProcessed++
          }
        }
      })

      await this.logResolutionAction(marketId, 'resolution_completed', adminId, {
        action: 'market_cancelled',
        reason,
        refundsProcessed,
        success: true
      })

      return {
        success: true,
        refundsProcessed
      }

    } catch (error) {
      console.error('[RESOLUTION_SERVICE] Error cancelling market:', error)
      
      await this.logResolutionAction(marketId, 'resolution_failed', adminId, {
        action: 'market_cancellation_failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      if (error instanceof ResolutionServiceError) {
        throw error
      } else {
        throw new ResolutionServiceError(
          ResolutionErrorType.DATABASE_TRANSACTION_FAILED,
          'Failed to cancel market',
          marketId,
          { reason, refundTokens },
          error instanceof Error ? error : new Error(String(error))
        )
      }
    }
  }
}