import { describe, it, expect } from '@jest/globals'
import { Timestamp } from 'firebase/firestore'
import {
  calculateOdds,
  calculatePotentialWinnings,
  batchProcessCommitments,
  calculateCommitmentTrends,
  calculateMarketMomentum,
  validateCommitmentData,
  formatAnalyticsForDisplay
} from '../market-analytics-utils'
import { PredictionCommitment } from '@/lib/types/token'

// Mock Timestamp for testing
const mockTimestamp = (ms: number) => ({
  toMillis: () => ms
}) as Timestamp

describe('Market Analytics Utils', () => {
  describe('calculateOdds', () => {
    it('should calculate correct odds for balanced market', () => {
      const result = calculateOdds(100, 100)
      
      expect(result.yesOdds).toBe(2.0)
      expect(result.noOdds).toBe(2.0)
      expect(result.impliedYesProbability).toBe(0.5)
      expect(result.impliedNoProbability).toBe(0.5)
    })

    it('should calculate correct odds for unbalanced market', () => {
      const result = calculateOdds(150, 50) // 75% yes, 25% no
      
      expect(result.yesOdds).toBeCloseTo(1.33, 2)
      expect(result.noOdds).toBe(4.0)
      expect(result.impliedYesProbability).toBe(0.75)
      expect(result.impliedNoProbability).toBe(0.25)
    })

    it('should handle zero tokens case', () => {
      const result = calculateOdds(0, 0)
      
      expect(result.yesOdds).toBe(2.0)
      expect(result.noOdds).toBe(2.0)
      expect(result.impliedYesProbability).toBe(0.5)
      expect(result.impliedNoProbability).toBe(0.5)
    })

    it('should cap odds at reasonable limits', () => {
      const result = calculateOdds(1000, 1) // Very unbalanced
      
      expect(result.yesOdds).toBeGreaterThanOrEqual(1.01)
      expect(result.noOdds).toBeLessThanOrEqual(999)
    })
  })

  describe('calculatePotentialWinnings', () => {
    it('should calculate correct winnings for balanced market', () => {
      const winnings = calculatePotentialWinnings(100, 'yes', 100, 100)
      expect(winnings).toBe(200) // Gets back stake + equal share of losing pool
    })

    it('should calculate correct winnings for unbalanced market', () => {
      const winnings = calculatePotentialWinnings(100, 'yes', 150, 50)
      // 100 stake + (100/150) * 50 losing pool = 100 + 33.33 = 133.33
      expect(winnings).toBeCloseTo(133.33, 2)
    })

    it('should handle zero total tokens', () => {
      const winnings = calculatePotentialWinnings(100, 'yes', 0, 0)
      expect(winnings).toBe(200) // Default 2x multiplier
    })

    it('should handle winner takes all scenario', () => {
      const winnings = calculatePotentialWinnings(100, 'yes', 0, 200)
      expect(winnings).toBe(300) // Gets stake back + all losing tokens
    })
  })

  describe('batchProcessCommitments', () => {
    const mockCommitments: PredictionCommitment[] = Array.from({ length: 250 }, (_, i) => ({
      id: `commitment_${i}`,
      userId: `user_${i}`,
      predictionId: 'market1',
      tokensCommitted: 100,
      position: i % 2 === 0 ? 'yes' : 'no',
      odds: 2.0,
      potentialWinning: 200,
      status: 'active',
      committedAt: mockTimestamp(Date.now())
    }))

    it('should calculate correct number of batches', () => {
      const result = batchProcessCommitments(mockCommitments, 100)
      expect(result.totalBatches).toBe(3) // 250 items / 100 per batch = 3 batches
    })

    it('should process batches correctly', () => {
      const result = batchProcessCommitments(mockCommitments, 100)
      
      const firstBatch = result.processBatch(0)
      expect(firstBatch).toHaveLength(100)
      expect(firstBatch[0].id).toBe('commitment_0')
      
      const lastBatch = result.processBatch(2)
      expect(lastBatch).toHaveLength(50) // Remaining items
      expect(lastBatch[0].id).toBe('commitment_200')
    })
  })

  describe('calculateMarketMomentum', () => {
    const baseTime = Date.now()
    const mockCommitments: PredictionCommitment[] = [
      {
        id: '1',
        userId: 'user1',
        predictionId: 'market1',
        tokensCommitted: 100,
        position: 'yes',
        odds: 2.0,
        potentialWinning: 200,
        status: 'active',
        committedAt: mockTimestamp(baseTime - 1000) // 1 second ago
      },
      {
        id: '2',
        userId: 'user2',
        predictionId: 'market1',
        tokensCommitted: 200,
        position: 'yes',
        odds: 2.0,
        potentialWinning: 400,
        status: 'active',
        committedAt: mockTimestamp(baseTime - 2000) // 2 seconds ago
      },
      {
        id: '3',
        userId: 'user3',
        predictionId: 'market1',
        tokensCommitted: 50,
        position: 'no',
        odds: 1.5,
        potentialWinning: 75,
        status: 'active',
        committedAt: mockTimestamp(baseTime - 3000) // 3 seconds ago
      }
    ]

    it('should calculate bullish momentum', () => {
      const result = calculateMarketMomentum(mockCommitments, 24)
      
      expect(result.momentum).toBe('bullish')
      expect(result.recentYesPercentage).toBeCloseTo(85.7, 1) // 300/(300+50) * 100
      expect(result.recentNoPercentage).toBeCloseTo(14.3, 1)
      expect(result.recentCommitmentCount).toBe(3)
      expect(result.momentumScore).toBeGreaterThan(0)
    })

    it('should handle no recent commitments', () => {
      const result = calculateMarketMomentum([], 24)
      
      expect(result.momentum).toBe('neutral')
      expect(result.recentYesPercentage).toBe(0)
      expect(result.recentNoPercentage).toBe(0)
      expect(result.recentCommitmentCount).toBe(0)
      expect(result.momentumScore).toBe(0)
    })
  })

  describe('validateCommitmentData', () => {
    const validCommitment: PredictionCommitment = {
      id: 'commitment1',
      userId: 'user1',
      predictionId: 'market1',
      tokensCommitted: 100,
      position: 'yes',
      odds: 2.0,
      potentialWinning: 200,
      status: 'active',
      committedAt: mockTimestamp(Date.now())
    }

    it('should validate correct commitment data', () => {
      const result = validateCommitmentData(validCommitment)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing required fields', () => {
      const invalidCommitment = { ...validCommitment, id: '', userId: '' }
      const result = validateCommitmentData(invalidCommitment)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Commitment ID is required')
      expect(result.errors).toContain('User ID is required')
    })

    it('should detect invalid token amount', () => {
      const invalidCommitment = { ...validCommitment, tokensCommitted: -10 }
      const result = validateCommitmentData(invalidCommitment)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Tokens committed must be positive')
    })

    it('should detect invalid position', () => {
      const invalidCommitment = { ...validCommitment, position: 'invalid' as any }
      const result = validateCommitmentData(invalidCommitment)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Position must be either "yes" or "no"')
    })
  })

  describe('formatAnalyticsForDisplay', () => {
    it('should format large numbers correctly', () => {
      const analytics = {
        totalTokensCommitted: 1500000,
        participantCount: 100,
        yesPercentage: 65.5,
        noPercentage: 34.5,
        averageCommitment: 15000,
        largestCommitment: 50000,
        smallestCommitment: 100
      }

      const result = formatAnalyticsForDisplay(analytics)
      
      expect(result.formattedTotalTokens).toBe('1.5M')
      expect(result.formattedAverageCommitment).toBe('15.0K')
      expect(result.formattedLargestCommitment).toBe('50.0K')
      expect(result.formattedSmallestCommitment).toBe('100')
      expect(result.yesPercentageDisplay).toBe('65.5%')
      expect(result.noPercentageDisplay).toBe('34.5%')
    })

    it('should format small numbers correctly', () => {
      const analytics = {
        totalTokensCommitted: 500,
        participantCount: 5,
        yesPercentage: 60.0,
        noPercentage: 40.0,
        averageCommitment: 100,
        largestCommitment: 200,
        smallestCommitment: 50
      }

      const result = formatAnalyticsForDisplay(analytics)
      
      expect(result.formattedTotalTokens).toBe('500')
      expect(result.formattedAverageCommitment).toBe('100')
      expect(result.formattedLargestCommitment).toBe('200')
      expect(result.formattedSmallestCommitment).toBe('50')
    })
  })
})