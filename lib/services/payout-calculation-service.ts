import { PredictionCommitment } from '@/lib/types/token'

/**
 * Payout Calculation Service
 * Handles payout calculations with house and creator fees
 */

export interface PayoutCalculationInput {
  totalPool: number
  winningCommitments: Array<{
    userId: string
    tokensCommitted: number
  }>
  creatorFeePercentage: number // 1-5% (0.01-0.05)
}

export interface PayoutCalculationResult {
  totalPool: number
  houseFee: number
  creatorFee: number
  totalFees: number
  winnerPool: number
  winnerCount: number
  payouts: Array<{
    userId: string
    tokensStaked: number
    payoutAmount: number
    profit: number
    winShare: number
  }>
  feeBreakdown: {
    houseFeePercentage: number
    creatorFeePercentage: number
    totalFeePercentage: number
    remainingForWinners: number
  }
}

export interface PayoutPreviewResult extends PayoutCalculationResult {
  largestPayout: number
  smallestPayout: number
  averagePayout: number
  totalProfit: number
}

export class PayoutCalculationService {
  // Constants
  private static readonly HOUSE_FEE_PERCENTAGE = 0.05 // Always 5%
  private static readonly MIN_CREATOR_FEE = 0.01 // 1%
  private static readonly MAX_CREATOR_FEE = 0.05 // 5%

  /**
   * Calculate payouts with house and creator fees
   */
  static calculatePayouts(input: PayoutCalculationInput): PayoutCalculationResult {
    const { totalPool, winningCommitments, creatorFeePercentage } = input

    // Validate inputs
    this.validateInputs(input)

    // Calculate fees
    const houseFee = Math.floor(totalPool * this.HOUSE_FEE_PERCENTAGE)
    const creatorFee = Math.floor(totalPool * creatorFeePercentage)
    const totalFees = houseFee + creatorFee

    // Calculate winner pool (remaining after fees)
    const winnerPool = totalPool - totalFees

    // Calculate total winning tokens
    const totalWinningTokens = winningCommitments.reduce(
      (sum, commitment) => sum + commitment.tokensCommitted, 
      0
    )

    // Calculate individual payouts
    const payouts = winningCommitments.map(commitment => {
      const winShare = totalWinningTokens > 0 
        ? commitment.tokensCommitted / totalWinningTokens 
        : 0
      
      const payoutAmount = Math.floor(winShare * winnerPool)
      const profit = payoutAmount - commitment.tokensCommitted

      return {
        userId: commitment.userId,
        tokensStaked: commitment.tokensCommitted,
        payoutAmount,
        profit,
        winShare
      }
    })

    return {
      totalPool,
      houseFee,
      creatorFee,
      totalFees,
      winnerPool,
      winnerCount: winningCommitments.length,
      payouts,
      feeBreakdown: {
        houseFeePercentage: this.HOUSE_FEE_PERCENTAGE,
        creatorFeePercentage,
        totalFeePercentage: Math.round((this.HOUSE_FEE_PERCENTAGE + creatorFeePercentage) * 100) / 100,
        remainingForWinners: Math.round((1 - (this.HOUSE_FEE_PERCENTAGE + creatorFeePercentage)) * 100) / 100
      }
    }
  }

  /**
   * Calculate payout preview with additional statistics
   */
  static calculatePayoutPreview(input: PayoutCalculationInput): PayoutPreviewResult {
    const baseResult = this.calculatePayouts(input)
    
    const payoutAmounts = baseResult.payouts.map(p => p.payoutAmount)
    const profits = baseResult.payouts.map(p => p.profit)

    const largestPayout = payoutAmounts.length > 0 ? Math.max(...payoutAmounts) : 0
    const smallestPayout = payoutAmounts.length > 0 ? Math.min(...payoutAmounts) : 0
    const averagePayout = payoutAmounts.length > 0 
      ? Math.floor(payoutAmounts.reduce((sum, amount) => sum + amount, 0) / payoutAmounts.length)
      : 0
    const totalProfit = profits.reduce((sum, profit) => sum + profit, 0)

    return {
      ...baseResult,
      largestPayout,
      smallestPayout,
      averagePayout,
      totalProfit
    }
  }

  /**
   * Validate creator fee percentage
   */
  static validateCreatorFeePercentage(feePercentage: number): boolean {
    return feePercentage >= this.MIN_CREATOR_FEE && 
           feePercentage <= this.MAX_CREATOR_FEE
  }

  /**
   * Get fee breakdown for a given total pool and creator fee
   */
  static getFeeBreakdown(totalPool: number, creatorFeePercentage: number) {
    if (!this.validateCreatorFeePercentage(creatorFeePercentage)) {
      throw new Error(`Creator fee must be between ${this.MIN_CREATOR_FEE * 100}% and ${this.MAX_CREATOR_FEE * 100}%`)
    }

    const houseFee = Math.floor(totalPool * this.HOUSE_FEE_PERCENTAGE)
    const creatorFee = Math.floor(totalPool * creatorFeePercentage)
    const totalFees = houseFee + creatorFee
    const winnerPool = totalPool - totalFees

    return {
      totalPool,
      houseFee,
      houseFeePercentage: this.HOUSE_FEE_PERCENTAGE,
      creatorFee,
      creatorFeePercentage,
      totalFees,
      totalFeePercentage: Math.round((this.HOUSE_FEE_PERCENTAGE + creatorFeePercentage) * 100) / 100,
      winnerPool,
      winnerPoolPercentage: Math.round((1 - (this.HOUSE_FEE_PERCENTAGE + creatorFeePercentage)) * 100) / 100
    }
  }

  /**
   * Calculate proportional distribution for winners
   */
  static calculateProportionalDistribution(
    winnerPool: number,
    commitments: Array<{ userId: string; tokensCommitted: number }>
  ): Array<{ userId: string; share: number; amount: number }> {
    const totalCommitted = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
    
    if (totalCommitted === 0) {
      return commitments.map(c => ({ userId: c.userId, share: 0, amount: 0 }))
    }

    return commitments.map(commitment => {
      const share = commitment.tokensCommitted / totalCommitted
      const amount = Math.floor(share * winnerPool)
      
      return {
        userId: commitment.userId,
        share,
        amount
      }
    })
  }

  /**
   * Validate calculation inputs
   */
  private static validateInputs(input: PayoutCalculationInput): void {
    const { totalPool, winningCommitments, creatorFeePercentage } = input

    if (totalPool < 0) {
      throw new Error('Total pool cannot be negative')
    }

    if (!Array.isArray(winningCommitments)) {
      throw new Error('Winning commitments must be an array')
    }

    if (winningCommitments.some(c => c.tokensCommitted < 0)) {
      throw new Error('Token commitments cannot be negative')
    }

    if (!this.validateCreatorFeePercentage(creatorFeePercentage)) {
      throw new Error(
        `Creator fee percentage must be between ${this.MIN_CREATOR_FEE * 100}% and ${this.MAX_CREATOR_FEE * 100}%`
      )
    }

    // Validate that total committed tokens don't exceed total pool
    const totalCommitted = winningCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
    if (totalCommitted > totalPool) {
      throw new Error('Total committed tokens cannot exceed total pool')
    }
  }
}