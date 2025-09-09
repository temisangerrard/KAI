/**
 * Enhanced Payout Calculation Service Tests
 * Tests accurate payout calculations for both binary and multi-option markets
 * with full backward compatibility verification
 */

import { EnhancedPayoutCalculationService } from '@/lib/services/enhanced-payout-calculation-service'
import { PredictionCommitment } from '@/lib/types/token'
import { Market } from '@/lib/types/database'
import { Timestamp } from 'firebase/firestore'

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
  }
}))

describe('EnhancedPayoutCalculationService', () => {
  // Test data setup
  const createBinaryMarket = (): Market => ({
    id: 'binary-market-1',
    title: 'Will it rain tomorrow?',
    description: 'Binary market test',
    category: 'weather' as any,
    status: 'active' as any,
    createdBy: 'creator-1',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.now(),
    options: [
      { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
      { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
    ],
    totalParticipants: 0,
    totalTokensStaked: 0,
    tags: [],
    featured: false,
    trending: false
  })

  const createMultiOptionMarket = (): Market => ({
    id: 'multi-market-1',
    title: 'Which designer will win?',
    description: 'Multi-option market test',
    category: 'fashion' as any,
    status: 'active' as any,
    createdBy: 'creator-1',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.now(),
    options: [
      { id: 'designer-a', text: 'Designer A', totalTokens: 0, participantCount: 0 },
      { id: 'designer-b', text: 'Designer B', totalTokens: 0, participantCount: 0 },
      { id: 'designer-c', text: 'Designer C', totalTokens: 0, participantCount: 0 },
      { id: 'designer-d', text: 'Designer D', totalTokens: 0, participantCount: 0 }
    ],
    totalParticipants: 0,
    totalTokensStaked: 0,
    tags: [],
    featured: false,
    trending: false
  })

  const createBinaryCommitment = (
    id: string,
    userId: string,
    position: 'yes' | 'no',
    tokens: number,
    optionId?: string
  ): PredictionCommitment => ({
    id,
    userId,
    predictionId: 'binary-market-1',
    position,
    optionId,
    tokensCommitted: tokens,
    odds: 2.0,
    potentialWinning: tokens * 2,
    status: 'active',
    committedAt: Timestamp.now(),
    userEmail: `${userId}@test.com`,
    userDisplayName: `User ${userId}`,
    metadata: {
      marketStatus: 'active' as any,
      marketTitle: 'Will it rain tomorrow?',
      marketEndsAt: Timestamp.now(),
      oddsSnapshot: {
        yesOdds: 2.0,
        noOdds: 2.0,
        totalYesTokens: 500,
        totalNoTokens: 500,
        totalParticipants: 10
      },
      userBalanceAtCommitment: 1000,
      commitmentSource: 'web' as any
    }
  })

  const createMultiOptionCommitment = (
    id: string,
    userId: string,
    optionId: string,
    tokens: number,
    position?: 'yes' | 'no'
  ): PredictionCommitment => {
    // For multi-option markets, don't set position unless explicitly provided
    // This allows testing of pure optionId-based commitments
    const commitment: PredictionCommitment = {
      id,
      userId,
      predictionId: 'multi-market-1',
      position: position || ('yes' as any), // Will be derived if not provided
      optionId,
      tokensCommitted: tokens,
      odds: 3.0,
      potentialWinning: tokens * 3,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: `${userId}@test.com`,
      userDisplayName: `User ${userId}`,
      metadata: {
        marketStatus: 'active' as any,
        marketTitle: 'Which designer will win?',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 2.0,
          totalYesTokens: 500,
          totalNoTokens: 500,
          totalParticipants: 10,
          optionOdds: {
            'designer-a': 3.0,
            'designer-b': 2.5,
            'designer-c': 4.0,
            'designer-d': 5.0
          },
          optionTokens: {
            'designer-a': 300,
            'designer-b': 400,
            'designer-c': 200,
            'designer-d': 100
          }
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web' as any,
        selectedOptionText: optionId === 'designer-a' ? 'Designer A' : 
                           optionId === 'designer-b' ? 'Designer B' :
                           optionId === 'designer-c' ? 'Designer C' : 'Designer D',
        marketOptionCount: 4
      }
    }
    
    // Remove position if not explicitly provided to test pure optionId commitments
    if (!position) {
      delete (commitment as any).position
    }
    
    return commitment
  }

  describe('Binary Market Payout Calculations', () => {
    it('should calculate accurate payouts for binary market with legacy position-based commitments', () => {
      const market = createBinaryMarket()
      const commitments = [
        createBinaryCommitment('c1', 'user1', 'yes', 100),
        createBinaryCommitment('c2', 'user2', 'yes', 200),
        createBinaryCommitment('c3', 'user3', 'no', 150),
        createBinaryCommitment('c4', 'user4', 'no', 250)
      ]

      const result = EnhancedPayoutCalculationService.calculateAccuratePayouts({
        market,
        commitments,
        winningOptionId: 'yes',
        creatorFeePercentage: 0.02
      })

      // Verify basic calculations
      expect(result.totalPool).toBe(700) // 100 + 200 + 150 + 250
      expect(result.houseFee).toBe(35) // 5% of 700
      expect(result.creatorFee).toBe(14) // 2% of 700
      expect(result.winnerPool).toBe(651) // 700 - 35 - 14
      expect(result.winnerCount).toBe(2) // user1 and user2
      expect(result.loserCount).toBe(2) // user3 and user4

      // Verify individual commitment payouts
      const winnerPayouts = result.commitmentPayouts.filter(p => p.isWinner)
      expect(winnerPayouts).toHaveLength(2)
      
      const user1Payout = winnerPayouts.find(p => p.userId === 'user1')
      const user2Payout = winnerPayouts.find(p => p.userId === 'user2')
      
      expect(user1Payout).toBeDefined()
      expect(user2Payout).toBeDefined()
      
      // User1 committed 100 out of 300 total winning tokens = 1/3 share
      expect(user1Payout!.winShare).toBeCloseTo(1/3)
      expect(user1Payout!.payoutAmount).toBe(Math.floor(651 * (1/3))) // 217
      expect(user1Payout!.profit).toBe(user1Payout!.payoutAmount - 100) // 117
      
      // User2 committed 200 out of 300 total winning tokens = 2/3 share
      expect(user2Payout!.winShare).toBeCloseTo(2/3)
      expect(user2Payout!.payoutAmount).toBe(Math.floor(651 * (2/3))) // 434
      expect(user2Payout!.profit).toBe(user2Payout!.payoutAmount - 200) // 234

      // Verify audit trail
      expect(result.auditTrail.binaryCommitments).toBe(4)
      expect(result.auditTrail.multiOptionCommitments).toBe(0)
      expect(result.auditTrail.winnerIdentificationSummary.optionIdBased).toBeGreaterThanOrEqual(0)
      expect(result.auditTrail.verificationChecks.allCommitmentsProcessed).toBe(true)
      expect(result.auditTrail.verificationChecks.noDoublePayouts).toBe(true)
    })

    it('should handle binary market with optionId-based commitments', () => {
      const market = createBinaryMarket()
      const commitments = [
        createBinaryCommitment('c1', 'user1', 'yes', 100, 'yes'),
        createBinaryCommitment('c2', 'user2', 'no', 200, 'no')
      ]

      const result = EnhancedPayoutCalculationService.calculateAccuratePayouts({
        market,
        commitments,
        winningOptionId: 'yes',
        creatorFeePercentage: 0.02
      })

      expect(result.winnerCount).toBe(1)
      expect(result.commitmentPayouts[0].auditTrail.winnerIdentificationMethod).toBe('hybrid')
      expect(result.commitmentPayouts[0].auditTrail.commitmentType).toBe('hybrid')
    })
  })

  describe('Multi-Option Market Payout Calculations', () => {
    it('should calculate accurate payouts for multi-option market', () => {
      const market = createMultiOptionMarket()
      const commitments = [
        // Pure optionId-based commitments (no position field)
        { ...createMultiOptionCommitment('c1', 'user1', 'designer-a', 100), position: undefined as any },
        { ...createMultiOptionCommitment('c2', 'user2', 'designer-a', 200), position: undefined as any },
        { ...createMultiOptionCommitment('c3', 'user3', 'designer-b', 150), position: undefined as any },
        { ...createMultiOptionCommitment('c4', 'user4', 'designer-c', 250), position: undefined as any },
        { ...createMultiOptionCommitment('c5', 'user5', 'designer-d', 300), position: undefined as any }
      ]

      const result = EnhancedPayoutCalculationService.calculateAccuratePayouts({
        market,
        commitments,
        winningOptionId: 'designer-a',
        creatorFeePercentage: 0.03
      })

      // Verify basic calculations
      expect(result.totalPool).toBe(1000) // 100 + 200 + 150 + 250 + 300
      expect(result.houseFee).toBe(50) // 5% of 1000
      expect(result.creatorFee).toBe(30) // 3% of 1000
      expect(result.winnerPool).toBe(920) // 1000 - 50 - 30
      expect(result.winnerCount).toBe(2) // Only commitments to designer-a should win
      expect(result.loserCount).toBe(3) // user3, user4, user5

      // Verify market type detection
      expect(result.market.type).toBe('multi-option')
      expect(result.market.totalOptions).toBe(4)

      // Verify winner payouts
      const winnerPayouts = result.commitmentPayouts.filter(p => p.isWinner)
      expect(winnerPayouts).toHaveLength(2)
      
      const user1Payout = winnerPayouts.find(p => p.userId === 'user1')
      const user2Payout = winnerPayouts.find(p => p.userId === 'user2')
      
      // User1 committed 100 out of 300 total winning tokens = 1/3 share
      expect(user1Payout!.winShare).toBeCloseTo(1/3)
      expect(user1Payout!.payoutAmount).toBe(Math.floor(920 * (1/3))) // 306
      
      // User2 committed 200 out of 300 total winning tokens = 2/3 share
      expect(user2Payout!.winShare).toBeCloseTo(2/3)
      expect(user2Payout!.payoutAmount).toBe(Math.floor(920 * (2/3))) // 613

      // Verify audit trail for multi-option
      expect(result.auditTrail.multiOptionCommitments).toBe(5)
      expect(result.auditTrail.winnerIdentificationSummary.optionIdBased).toBeGreaterThanOrEqual(0)
    })

    it('should handle mixed commitment types in multi-option market', () => {
      const market = createMultiOptionMarket()
      const commitments = [
        // Legacy binary commitment (position only)
        { ...createMultiOptionCommitment('c1', 'user1', 'designer-a', 100), optionId: undefined },
        // New multi-option commitment (optionId only)
        { ...createMultiOptionCommitment('c2', 'user2', 'designer-b', 200), position: undefined as any },
        // Hybrid commitment (both fields)
        createMultiOptionCommitment('c3', 'user3', 'designer-a', 150, 'yes')
      ]

      const result = EnhancedPayoutCalculationService.calculateAccuratePayouts({
        market,
        commitments,
        winningOptionId: 'designer-a',
        creatorFeePercentage: 0.02
      })

      expect(result.winnerCount).toBe(2) // user1 and user3
      expect(result.auditTrail.binaryCommitments).toBe(1) // user1
      expect(result.auditTrail.multiOptionCommitments).toBe(1) // user2
      expect(result.auditTrail.hybridCommitments).toBe(1) // user3
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing binary market resolution', () => {
      const market = createBinaryMarket()
      const commitments = [
        createBinaryCommitment('c1', 'user1', 'yes', 100),
        createBinaryCommitment('c2', 'user2', 'no', 100)
      ]

      const result = EnhancedPayoutCalculationService.calculateAccuratePayouts({
        market,
        commitments,
        winningOptionId: 'yes',
        creatorFeePercentage: 0.02
      })

      // Should work exactly like legacy system for binary markets
      expect(result.payouts).toHaveLength(2) // Aggregated by user
      expect(result.payouts[0].userId).toBe('user1')
      expect(result.payouts[0].tokensStaked).toBe(100)
      expect(result.payouts[0].payoutAmount).toBeGreaterThan(100) // Winner gets payout
      
      const user2Payout = result.payouts.find(p => p.userId === 'user2')
      expect(user2Payout?.payoutAmount).toBe(0) // Loser gets nothing
    })

    it('should derive missing fields for backward compatibility', () => {
      const market = createBinaryMarket()
      const commitments = [
        // Missing optionId (legacy commitment)
        { ...createBinaryCommitment('c1', 'user1', 'yes', 100), optionId: undefined },
        // Missing position (new commitment)
        { ...createBinaryCommitment('c2', 'user2', 'no', 100), position: undefined as any, optionId: 'no' }
      ]

      const result = EnhancedPayoutCalculationService.calculateAccuratePayouts({
        market,
        commitments,
        winningOptionId: 'yes',
        creatorFeePercentage: 0.02
      })

      // Should successfully process both commitments
      expect(result.commitmentPayouts).toHaveLength(2)
      
      const c1Payout = result.commitmentPayouts.find(p => p.commitmentId === 'c1')
      const c2Payout = result.commitmentPayouts.find(p => p.commitmentId === 'c2')
      
      // Verify derived fields
      expect(c1Payout!.optionId).toBe('yes') // Derived from position
      expect(c1Payout!.position).toBe('yes') // Original
      expect(c1Payout!.auditTrail.derivedOptionId).toBe('yes')
      
      expect(c2Payout!.optionId).toBe('no') // Original
      expect(c2Payout!.position).toBe('no') // Derived from optionId
      expect(c2Payout!.auditTrail.derivedPosition).toBe('no')
    })
  })

  describe('Audit Trail and Verification', () => {
    it('should provide comprehensive audit trail', () => {
      const market = createMultiOptionMarket()
      const commitments = [
        createMultiOptionCommitment('c1', 'user1', 'designer-a', 100),
        createMultiOptionCommitment('c2', 'user2', 'designer-b', 200)
      ]

      const result = EnhancedPayoutCalculationService.calculateAccuratePayouts({
        market,
        commitments,
        winningOptionId: 'designer-a',
        creatorFeePercentage: 0.02
      })

      // Verify audit trail completeness
      expect(result.auditTrail.calculationTimestamp).toBeDefined()
      expect(result.auditTrail.totalCommitmentsProcessed).toBe(2)
      expect(result.auditTrail.verificationChecks.allCommitmentsProcessed).toBe(true)
      expect(result.auditTrail.verificationChecks.payoutSumsCorrect).toBe(true)
      expect(result.auditTrail.verificationChecks.noDoublePayouts).toBe(true)
      expect(result.auditTrail.verificationChecks.auditTrailComplete).toBe(true)

      // Verify individual commitment audit trails
      for (const payout of result.commitmentPayouts) {
        expect(payout.auditTrail.commitmentType).toBeDefined()
        expect(payout.auditTrail.winnerIdentificationMethod).toBeDefined()
        expect(payout.auditTrail.calculationTimestamp).toBeDefined()
      }
    })

    it('should detect and report verification failures', () => {
      const market = createBinaryMarket()
      const commitments = [
        createBinaryCommitment('c1', 'user1', 'yes', 100),
        createBinaryCommitment('c1', 'user2', 'yes', 100) // Duplicate ID
      ]

      const result = EnhancedPayoutCalculationService.calculateAccuratePayouts({
        market,
        commitments,
        winningOptionId: 'yes',
        creatorFeePercentage: 0.02
      })

      // Should detect duplicate commitment IDs
      expect(result.auditTrail.verificationChecks.noDoublePayouts).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should validate inputs properly', () => {
      const market = createBinaryMarket()
      const commitments = [createBinaryCommitment('c1', 'user1', 'yes', 100)]

      // Invalid creator fee
      expect(() => {
        EnhancedPayoutCalculationService.calculateAccuratePayouts({
          market,
          commitments,
          winningOptionId: 'yes',
          creatorFeePercentage: 0.1 // 10% - too high
        })
      }).toThrow('Creator fee percentage must be between 1% and 5%')

      // Invalid winning option
      expect(() => {
        EnhancedPayoutCalculationService.calculateAccuratePayouts({
          market,
          commitments,
          winningOptionId: 'invalid-option',
          creatorFeePercentage: 0.02
        })
      }).toThrow('does not exist in market options')
    })

    it('should handle empty commitments gracefully', () => {
      const market = createBinaryMarket()
      const commitments: PredictionCommitment[] = []

      const result = EnhancedPayoutCalculationService.calculateAccuratePayouts({
        market,
        commitments,
        winningOptionId: 'yes',
        creatorFeePercentage: 0.02
      })

      expect(result.totalPool).toBe(0)
      expect(result.winnerCount).toBe(0)
      expect(result.commitmentPayouts).toHaveLength(0)
      expect(result.auditTrail.verificationChecks.allCommitmentsProcessed).toBe(true)
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle user with multiple commitments to same option', () => {
      const market = createMultiOptionMarket()
      const commitments = [
        { ...createMultiOptionCommitment('c1', 'user1', 'designer-a', 100), position: undefined as any },
        { ...createMultiOptionCommitment('c2', 'user1', 'designer-a', 200), position: undefined as any }, // Same user, same option
        { ...createMultiOptionCommitment('c3', 'user2', 'designer-b', 150), position: undefined as any }
      ]

      const result = EnhancedPayoutCalculationService.calculateAccuratePayouts({
        market,
        commitments,
        winningOptionId: 'designer-a',
        creatorFeePercentage: 0.02
      })

      expect(result.winnerCount).toBe(2) // 2 winning commitments (c1 and c2 to designer-a)
      expect(result.commitmentPayouts.filter(p => p.isWinner)).toHaveLength(2)
      
      // User1 should have aggregated payout in the payouts array
      const user1Payout = result.payouts.find(p => p.userId === 'user1')
      expect(user1Payout!.tokensStaked).toBe(300) // 100 + 200
      expect(user1Payout!.payoutAmount).toBeGreaterThan(300) // Should get winner payout
    })

    it('should handle user with commitments to multiple options', () => {
      const market = createMultiOptionMarket()
      const commitments = [
        { ...createMultiOptionCommitment('c1', 'user1', 'designer-a', 100), position: undefined as any },
        { ...createMultiOptionCommitment('c2', 'user1', 'designer-b', 200), position: undefined as any }, // Same user, different option
        { ...createMultiOptionCommitment('c3', 'user2', 'designer-a', 150), position: undefined as any }
      ]

      const result = EnhancedPayoutCalculationService.calculateAccuratePayouts({
        market,
        commitments,
        winningOptionId: 'designer-a',
        creatorFeePercentage: 0.02
      })

      expect(result.winnerCount).toBe(2) // 2 winning commitments to designer-a
      
      // User1 should have mixed results - one winning, one losing commitment
      const user1Payouts = result.commitmentPayouts.filter(p => p.userId === 'user1')
      expect(user1Payouts).toHaveLength(2)
      expect(user1Payouts.filter(p => p.isWinner)).toHaveLength(1) // Only c1 wins
      expect(user1Payouts.filter(p => !p.isWinner)).toHaveLength(1) // c2 loses
    })
  })
})