import { PredictionCommitment } from '@/lib/types/token'
import { Market, MarketOption } from '@/lib/types/database'
import { Timestamp } from 'firebase/firestore'

/**
 * Enhanced Payout Calculation Service
 * Handles accurate payout calculations for both binary and multi-option markets
 * with full backward compatibility for existing binary commitments
 */

export interface EnhancedPayoutCalculationInput {
  market: Market
  commitments: PredictionCommitment[]
  winningOptionId: string
  creatorFeePercentage: number // 1-5% (0.01-0.05)
}

export interface IndividualCommitmentPayout {
  commitmentId: string
  userId: string
  tokensCommitted: number
  odds: number
  isWinner: boolean
  payoutAmount: number
  profit: number
  winShare: number
  optionId: string
  position: 'yes' | 'no'
  // Audit trail information
  auditTrail: {
    commitmentType: 'binary' | 'multi-option'
    originalPosition?: 'yes' | 'no'
    originalOptionId?: string
    derivedPosition?: 'yes' | 'no'
    derivedOptionId?: string
    winnerIdentificationMethod: 'position-based' | 'optionId-based' | 'hybrid'
    calculationTimestamp: Timestamp
  }
}

export interface EnhancedPayoutCalculationResult {
  market: {
    id: string
    title: string
    type: 'binary' | 'multi-option'
    totalOptions: number
  }
  totalPool: number
  houseFee: number
  creatorFee: number
  totalFees: number
  winnerPool: number
  winnerCount: number
  loserCount: number
  
  // Individual commitment payouts with full audit trail
  commitmentPayouts: IndividualCommitmentPayout[]
  
  // Aggregated payout data (for backward compatibility)
  payouts: Array<{
    userId: string
    tokensStaked: number
    payoutAmount: number
    profit: number
    winShare: number
  }>
  
  // Fee breakdown
  feeBreakdown: {
    houseFeePercentage: number
    creatorFeePercentage: number
    totalFeePercentage: number
    remainingForWinners: number
  }
  
  // Audit and verification data
  auditTrail: {
    calculationTimestamp: Timestamp
    totalCommitmentsProcessed: number
    binaryCommitments: number
    multiOptionCommitments: number
    hybridCommitments: number
    winnerIdentificationSummary: {
      positionBased: number
      optionIdBased: number
      hybrid: number
    }
    verificationChecks: {
      allCommitmentsProcessed: boolean
      payoutSumsCorrect: boolean
      noDoublePayouts: boolean
      auditTrailComplete: boolean
    }
  }
}

export class EnhancedPayoutCalculationService {
  // Constants
  private static readonly HOUSE_FEE_PERCENTAGE = 0.05 // Always 5%
  private static readonly MIN_CREATOR_FEE = 0.01 // 1%
  private static readonly MAX_CREATOR_FEE = 0.05 // 5%

  /**
   * Calculate accurate payouts for both binary and multi-option markets
   * with full backward compatibility and comprehensive audit trails
   */
  static calculateAccuratePayouts(input: EnhancedPayoutCalculationInput): EnhancedPayoutCalculationResult {
    const { market, commitments, winningOptionId, creatorFeePercentage } = input

    // Validate inputs
    this.validateInputs(input)

    // Determine market type
    const marketType = this.determineMarketType(market)
    
    // Calculate total pool
    const totalPool = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
    
    // Calculate fees
    const houseFee = Math.floor(totalPool * this.HOUSE_FEE_PERCENTAGE)
    const creatorFee = Math.floor(totalPool * creatorFeePercentage)
    const totalFees = houseFee + creatorFee
    const winnerPool = totalPool - totalFees

    // Process each commitment individually with full audit trail
    const commitmentPayouts: IndividualCommitmentPayout[] = []
    let binaryCommitments = 0
    let multiOptionCommitments = 0
    let hybridCommitments = 0
    let positionBasedWinners = 0
    let optionIdBasedWinners = 0
    let hybridWinners = 0

    for (const commitment of commitments) {
      const payout = this.calculateIndividualCommitmentPayout(
        commitment,
        market,
        winningOptionId,
        marketType
      )
      
      commitmentPayouts.push(payout)
      
      // Track commitment types for audit
      if (payout.auditTrail.commitmentType === 'binary') {
        binaryCommitments++
      } else if (payout.auditTrail.commitmentType === 'multi-option') {
        multiOptionCommitments++
      } else {
        hybridCommitments++
      }
      
      // Track winner identification methods
      if (payout.isWinner) {
        if (payout.auditTrail.winnerIdentificationMethod === 'position-based') {
          positionBasedWinners++
        } else if (payout.auditTrail.winnerIdentificationMethod === 'optionId-based') {
          optionIdBasedWinners++
        } else {
          hybridWinners++
        }
      }
    }

    // Calculate winner pool distribution
    const winners = commitmentPayouts.filter(p => p.isWinner)
    const totalWinnerTokens = winners.reduce((sum, w) => sum + w.tokensCommitted, 0)
    
    // Distribute winner pool proportionally and update payout amounts
    for (const winner of winners) {
      if (totalWinnerTokens > 0) {
        winner.winShare = winner.tokensCommitted / totalWinnerTokens
        winner.payoutAmount = Math.floor(winner.winShare * winnerPool)
        winner.profit = winner.payoutAmount - winner.tokensCommitted
      }
    }

    // Create aggregated payouts for backward compatibility
    const userPayouts = new Map<string, {
      tokensStaked: number
      payoutAmount: number
      profit: number
      winShare: number
    }>()

    for (const payout of commitmentPayouts) {
      if (!userPayouts.has(payout.userId)) {
        userPayouts.set(payout.userId, {
          tokensStaked: 0,
          payoutAmount: 0,
          profit: 0,
          winShare: 0
        })
      }
      
      const userPayout = userPayouts.get(payout.userId)!
      userPayout.tokensStaked += payout.tokensCommitted
      userPayout.payoutAmount += payout.payoutAmount
      userPayout.profit += payout.profit
      userPayout.winShare += payout.winShare
    }

    const payouts = Array.from(userPayouts.entries()).map(([userId, payout]) => ({
      userId,
      ...payout
    }))

    // Perform verification checks
    const verificationChecks = this.performVerificationChecks(
      commitments,
      commitmentPayouts,
      totalPool,
      winnerPool
    )

    return {
      market: {
        id: market.id,
        title: market.title,
        type: marketType,
        totalOptions: market.options?.length || 2
      },
      totalPool,
      houseFee,
      creatorFee,
      totalFees,
      winnerPool,
      winnerCount: winners.length,
      loserCount: commitmentPayouts.length - winners.length,
      commitmentPayouts,
      payouts,
      feeBreakdown: {
        houseFeePercentage: this.HOUSE_FEE_PERCENTAGE,
        creatorFeePercentage,
        totalFeePercentage: this.HOUSE_FEE_PERCENTAGE + creatorFeePercentage,
        remainingForWinners: 1 - (this.HOUSE_FEE_PERCENTAGE + creatorFeePercentage)
      },
      auditTrail: {
        calculationTimestamp: Timestamp.now(),
        totalCommitmentsProcessed: commitments.length,
        binaryCommitments,
        multiOptionCommitments,
        hybridCommitments,
        winnerIdentificationSummary: {
          positionBased: positionBasedWinners,
          optionIdBased: optionIdBasedWinners,
          hybrid: hybridWinners
        },
        verificationChecks
      }
    }
  }

  /**
   * Calculate payout for an individual commitment with full audit trail
   */
  private static calculateIndividualCommitmentPayout(
    commitment: PredictionCommitment,
    market: Market,
    winningOptionId: string,
    marketType: 'binary' | 'multi-option'
  ): IndividualCommitmentPayout {
    // Determine commitment type and ensure compatibility
    const { enhancedCommitment, commitmentType, auditInfo } = this.enhanceCommitmentCompatibility(
      commitment,
      market
    )

    // Determine if this commitment is a winner
    const { isWinner, winnerIdentificationMethod } = this.determineWinner(
      enhancedCommitment,
      winningOptionId,
      market
    )

    return {
      commitmentId: commitment.id,
      userId: commitment.userId,
      tokensCommitted: commitment.tokensCommitted,
      odds: commitment.odds,
      isWinner,
      payoutAmount: 0, // Will be calculated after winner pool distribution
      profit: 0, // Will be calculated after payout amount is set
      winShare: 0, // Will be calculated after winner pool distribution
      optionId: enhancedCommitment.optionId!,
      position: enhancedCommitment.position,
      auditTrail: {
        commitmentType,
        originalPosition: commitment.position,
        originalOptionId: commitment.optionId,
        derivedPosition: auditInfo.derivedPosition,
        derivedOptionId: auditInfo.derivedOptionId,
        winnerIdentificationMethod,
        calculationTimestamp: Timestamp.now()
      }
    }
  }

  /**
   * Enhance commitment with backward compatibility fields
   */
  private static enhanceCommitmentCompatibility(
    commitment: PredictionCommitment,
    market: Market
  ): {
    enhancedCommitment: PredictionCommitment
    commitmentType: 'binary' | 'multi-option' | 'hybrid'
    auditInfo: {
      derivedPosition?: 'yes' | 'no'
      derivedOptionId?: string
    }
  } {
    const enhanced = { ...commitment }
    const auditInfo: { derivedPosition?: 'yes' | 'no'; derivedOptionId?: string } = {}
    
    // Determine commitment type
    let commitmentType: 'binary' | 'multi-option' | 'hybrid'
    
    if (commitment.position && !commitment.optionId) {
      commitmentType = 'binary'
      // Derive optionId from position
      if (market.options && market.options.length >= 2) {
        enhanced.optionId = commitment.position === 'yes' 
          ? market.options[0].id 
          : market.options[1].id
        auditInfo.derivedOptionId = enhanced.optionId
      } else {
        // Fallback for markets without proper options array
        enhanced.optionId = commitment.position
        auditInfo.derivedOptionId = enhanced.optionId
      }
    } else if (commitment.optionId && !commitment.position) {
      commitmentType = 'multi-option'
      // Derive position from optionId
      if (market.options && market.options.length >= 2) {
        enhanced.position = commitment.optionId === market.options[0].id ? 'yes' : 'no'
        auditInfo.derivedPosition = enhanced.position
      } else {
        // Fallback for markets without proper options array
        enhanced.position = commitment.optionId === 'yes' ? 'yes' : 'no'
        auditInfo.derivedPosition = enhanced.position
      }
    } else if (commitment.position && commitment.optionId) {
      commitmentType = 'hybrid'
      // Both fields present, verify consistency
      const expectedPosition = market.options && market.options.length >= 2
        ? (commitment.optionId === market.options[0].id ? 'yes' : 'no')
        : (commitment.optionId === 'yes' ? 'yes' : 'no')
      
      if (commitment.position !== expectedPosition) {
        console.warn(`Commitment ${commitment.id} has inconsistent position/optionId`, {
          position: commitment.position,
          optionId: commitment.optionId,
          expectedPosition
        })
      }
    } else {
      // Neither field present - use defaults
      commitmentType = 'binary'
      enhanced.position = 'yes'
      enhanced.optionId = market.options?.[0]?.id || 'yes'
      auditInfo.derivedPosition = enhanced.position
      auditInfo.derivedOptionId = enhanced.optionId
    }

    return {
      enhancedCommitment: enhanced,
      commitmentType,
      auditInfo
    }
  }

  /**
   * Determine if a commitment is a winner using multiple identification methods
   */
  private static determineWinner(
    commitment: PredictionCommitment,
    winningOptionId: string,
    market: Market
  ): {
    isWinner: boolean
    winnerIdentificationMethod: 'position-based' | 'optionId-based' | 'hybrid'
  } {
    // Method 1: Direct optionId comparison (preferred for multi-option markets)
    const optionIdMatch = commitment.optionId === winningOptionId
    
    // Method 2: Position-based comparison (for binary markets)
    const positionMatch = commitment.position === winningOptionId
    
    // Method 3: Hybrid approach - check if winning option corresponds to position
    let hybridMatch = false
    if (market.options && market.options.length >= 2 && commitment.position) {
      const winningOption = market.options.find(opt => opt.id === winningOptionId)
      if (winningOption) {
        const expectedPosition = winningOption.id === market.options[0].id ? 'yes' : 'no'
        hybridMatch = commitment.position === expectedPosition
      }
    }

    // Determine winner and method used
    if (optionIdMatch && positionMatch) {
      return { isWinner: true, winnerIdentificationMethod: 'hybrid' }
    } else if (optionIdMatch && hybridMatch) {
      return { isWinner: true, winnerIdentificationMethod: 'hybrid' }
    } else if (optionIdMatch) {
      return { isWinner: true, winnerIdentificationMethod: 'optionId-based' }
    } else if (positionMatch) {
      return { isWinner: true, winnerIdentificationMethod: 'position-based' }
    } else if (hybridMatch) {
      return { isWinner: true, winnerIdentificationMethod: 'hybrid' }
    } else {
      // Not a winner - determine which method would have been used
      let method: 'position-based' | 'optionId-based' | 'hybrid'
      if (commitment.optionId && commitment.position) {
        method = 'hybrid'
      } else if (commitment.optionId) {
        method = 'optionId-based'
      } else {
        method = 'position-based'
      }
      return { isWinner: false, winnerIdentificationMethod: method }
    }
  }

  /**
   * Determine market type based on options
   */
  private static determineMarketType(market: Market): 'binary' | 'multi-option' {
    if (!market.options || market.options.length <= 2) {
      return 'binary'
    }
    return 'multi-option'
  }

  /**
   * Perform verification checks on calculation results
   */
  private static performVerificationChecks(
    originalCommitments: PredictionCommitment[],
    calculatedPayouts: IndividualCommitmentPayout[],
    totalPool: number,
    winnerPool: number
  ): {
    allCommitmentsProcessed: boolean
    payoutSumsCorrect: boolean
    noDoublePayouts: boolean
    auditTrailComplete: boolean
  } {
    // Check 1: All commitments processed
    const allCommitmentsProcessed = originalCommitments.length === calculatedPayouts.length

    // Check 2: Payout sums are correct
    const totalPayouts = calculatedPayouts.reduce((sum, p) => sum + p.payoutAmount, 0)
    const payoutSumsCorrect = Math.abs(totalPayouts - winnerPool) <= calculatedPayouts.length // Allow for rounding

    // Check 3: No double payouts (each commitment ID appears exactly once)
    const commitmentIds = calculatedPayouts.map(p => p.commitmentId)
    const uniqueCommitmentIds = new Set(commitmentIds)
    const noDoublePayouts = commitmentIds.length === uniqueCommitmentIds.size

    // Check 4: Audit trail complete (all payouts have audit information)
    const auditTrailComplete = calculatedPayouts.every(p => 
      p.auditTrail && 
      p.auditTrail.commitmentType && 
      p.auditTrail.winnerIdentificationMethod &&
      p.auditTrail.calculationTimestamp
    )

    return {
      allCommitmentsProcessed,
      payoutSumsCorrect,
      noDoublePayouts,
      auditTrailComplete
    }
  }

  /**
   * Validate calculation inputs
   */
  private static validateInputs(input: EnhancedPayoutCalculationInput): void {
    const { market, commitments, winningOptionId, creatorFeePercentage } = input

    if (!market || !market.id) {
      throw new Error('Valid market is required')
    }

    if (!Array.isArray(commitments)) {
      throw new Error('Commitments must be an array')
    }

    if (!winningOptionId?.trim()) {
      throw new Error('Winning option ID is required')
    }

    if (creatorFeePercentage < this.MIN_CREATOR_FEE || creatorFeePercentage > this.MAX_CREATOR_FEE) {
      throw new Error(
        `Creator fee percentage must be between ${this.MIN_CREATOR_FEE * 100}% and ${this.MAX_CREATOR_FEE * 100}%`
      )
    }

    // Validate that winning option exists in market
    if (market.options && market.options.length > 0) {
      const winningOptionExists = market.options.some(opt => opt.id === winningOptionId)
      if (!winningOptionExists && winningOptionId !== 'yes' && winningOptionId !== 'no') {
        throw new Error(`Winning option ID '${winningOptionId}' does not exist in market options`)
      }
    }

    // Validate commitments have required fields
    for (const commitment of commitments) {
      if (!commitment.id) {
        throw new Error('All commitments must have an ID')
      }
      if (!commitment.userId) {
        throw new Error('All commitments must have a user ID')
      }
      if (typeof commitment.tokensCommitted !== 'number' || commitment.tokensCommitted < 0) {
        throw new Error('All commitments must have valid token amounts')
      }
    }
  }

  /**
   * Get payout preview with enhanced audit information
   */
  static getPayoutPreview(input: EnhancedPayoutCalculationInput): EnhancedPayoutCalculationResult {
    return this.calculateAccuratePayouts(input)
  }

  /**
   * Validate creator fee percentage
   */
  static validateCreatorFeePercentage(feePercentage: number): boolean {
    return feePercentage >= this.MIN_CREATOR_FEE && 
           feePercentage <= this.MAX_CREATOR_FEE
  }
}