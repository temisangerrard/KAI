import { PayoutCalculationService, PayoutPreviewResult } from './payout-calculation-service'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { PredictionCommitment } from '@/lib/types/token'
import { Market } from '@/lib/types/database'

/**
 * Payout Preview Service
 * Provides payout preview functionality for market resolution
 */
export class PayoutPreviewService {
  
  /**
   * Generate payout preview for a market resolution
   */
  static async generatePayoutPreview(
    market: Market,
    winningOptionId: string,
    creatorFeePercentage: number = 0.02
  ): Promise<PayoutPreviewResult & { 
    marketInfo: {
      id: string
      title: string
      totalPool: number
      winningOption: string
    }
    creatorInfo: {
      creatorId: string
      feeAmount: number
      feePercentage: number
    }
  }> {
    // Validate creator fee percentage
    if (!PayoutCalculationService.validateCreatorFeePercentage(creatorFeePercentage)) {
      throw new Error('Creator fee percentage must be between 1% and 5%')
    }

    // Get all commitments for this market
    const allCommitmentsQuery = query(
      collection(db, 'predictionCommitments'),
      where('predictionId', '==', market.id),
      where('status', '==', 'active')
    )
    
    const allCommitmentsSnapshot = await getDocs(allCommitmentsQuery)
    const allCommitments = allCommitmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PredictionCommitment[]

    // Calculate total market pool
    const totalPool = allCommitments.reduce((sum, commitment) => 
      sum + commitment.tokensCommitted, 0
    )

    // Get winning commitments based on the winning option
    let winningPosition: 'yes' | 'no' | null = null
    if (winningOptionId === 'yes') {
      winningPosition = 'yes'
    } else if (winningOptionId === 'no') {
      winningPosition = 'no'
    } else {
      // For markets with custom options, find the matching option
      const winningOption = market.options.find(opt => opt.id === winningOptionId)
      if (!winningOption) {
        throw new Error(`Invalid winning option ID: ${winningOptionId}`)
      }
      // For now, assume binary markets (yes/no)
      winningPosition = winningOptionId === market.options[0]?.id ? 'yes' : 'no'
    }
    
    const winningCommitments = winningPosition 
      ? allCommitments.filter(c => c.position === winningPosition)
      : []

    // Transform to the format expected by PayoutCalculationService
    const calculationInput = {
      totalPool,
      winningCommitments: winningCommitments.map(c => ({
        userId: c.userId,
        tokensCommitted: c.tokensCommitted
      })),
      creatorFeePercentage
    }

    // Calculate payout preview
    const payoutResult = PayoutCalculationService.calculatePayoutPreview(calculationInput)

    // Get winning option text
    const winningOption = market.options.find(opt => opt.id === winningOptionId)
    const winningOptionText = winningOption?.text || winningOptionId

    return {
      ...payoutResult,
      marketInfo: {
        id: market.id,
        title: market.title,
        totalPool,
        winningOption: winningOptionText
      },
      creatorInfo: {
        creatorId: market.createdBy,
        feeAmount: payoutResult.creatorFee,
        feePercentage: creatorFeePercentage * 100
      }
    }
  }

  /**
   * Get fee breakdown for a market without calculating full payouts
   */
  static async getFeeBreakdownForMarket(
    marketId: string,
    creatorFeePercentage: number = 0.02
  ): Promise<{
    totalPool: number
    houseFee: number
    houseFeePercentage: number
    creatorFee: number
    creatorFeePercentage: number
    totalFees: number
    totalFeePercentage: number
    winnerPool: number
    winnerPoolPercentage: number
  }> {
    // Get all commitments for this market
    const allCommitmentsQuery = query(
      collection(db, 'predictionCommitments'),
      where('predictionId', '==', marketId),
      where('status', '==', 'active')
    )
    
    const allCommitmentsSnapshot = await getDocs(allCommitmentsQuery)
    const allCommitments = allCommitmentsSnapshot.docs.map(doc => doc.data()) as PredictionCommitment[]

    // Calculate total market pool
    const totalPool = allCommitments.reduce((sum, commitment) => 
      sum + commitment.tokensCommitted, 0
    )

    return PayoutCalculationService.getFeeBreakdown(totalPool, creatorFeePercentage)
  }

  /**
   * Validate if a market can be resolved with the given parameters
   */
  static validateResolutionParameters(
    market: Market,
    winningOptionId: string,
    creatorFeePercentage: number
  ): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check market status
    if (market.status === 'resolved') {
      errors.push('Market is already resolved')
    }

    if (market.status !== 'pending_resolution' && market.status !== 'active') {
      errors.push('Market is not ready for resolution')
    }

    // Check winning option exists
    const winningOption = market.options.find(opt => opt.id === winningOptionId)
    if (!winningOption) {
      errors.push(`Invalid winning option: ${winningOptionId}`)
    }

    // Check creator fee percentage
    if (!PayoutCalculationService.validateCreatorFeePercentage(creatorFeePercentage)) {
      errors.push('Creator fee percentage must be between 1% and 5%')
    }

    // Check if market has ended
    const now = new Date()
    const endsAt = market.endsAt.toDate()
    if (endsAt > now) {
      warnings.push('Market has not yet reached its end date')
    }

    // Check if there are any participants
    if (market.totalParticipants === 0) {
      warnings.push('Market has no participants - no payouts will be distributed')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Calculate potential profit for a user if they win
   */
  static calculateUserPotentialProfit(
    userCommitment: number,
    totalWinningPool: number,
    totalWinnerTokens: number,
    creatorFeePercentage: number = 0.02
  ): {
    potentialPayout: number
    potentialProfit: number
    winShare: number
    feesPaid: number
  } {
    if (totalWinnerTokens === 0) {
      return {
        potentialPayout: 0,
        potentialProfit: 0,
        winShare: 0,
        feesPaid: 0
      }
    }

    // Calculate fees that will be deducted
    const houseFee = Math.floor(totalWinningPool * 0.05)
    const creatorFee = Math.floor(totalWinningPool * creatorFeePercentage)
    const winnerPool = totalWinningPool - houseFee - creatorFee

    // Calculate user's share
    const winShare = userCommitment / totalWinnerTokens
    const potentialPayout = Math.floor(winShare * winnerPool)
    const potentialProfit = potentialPayout - userCommitment
    const feesPaid = Math.floor(winShare * (houseFee + creatorFee))

    return {
      potentialPayout,
      potentialProfit,
      winShare,
      feesPaid
    }
  }
}