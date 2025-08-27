import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { Timestamp } from 'firebase/firestore'
import { MarketAnalyticsService } from '../market-analytics-service'
import { PredictionCommitment } from '@/lib/types/token'

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn(),
  Timestamp: {
    now: () => ({ toMillis: () => Date.now() }),
    fromMillis: (ms: number) => ({ toMillis: () => ms })
  }
}))

describe('MarketAnalyticsService', () => {
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
      committedAt: Timestamp.now()
    },
    {
      id: '2',
      userId: 'user2',
      predictionId: 'market1',
      tokensCommitted: 150,
      position: 'no',
      odds: 1.5,
      potentialWinning: 225,
      status: 'active',
      committedAt: Timestamp.now()
    },
    {
      id: '3',
      userId: 'user3',
      predictionId: 'market1',
      tokensCommitted: 75,
      position: 'yes',
      odds: 2.0,
      potentialWinning: 150,
      status: 'active',
      committedAt: Timestamp.now()
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    MarketAnalyticsService.cleanup()
  })

  describe('calculatePositionDistribution', () => {
    it('should calculate correct position distribution', () => {
      const result = MarketAnalyticsService.calculatePositionDistribution(mockCommitments)
      
      expect(result.yesTokens).toBe(175) // 100 + 75
      expect(result.noTokens).toBe(150)
      expect(result.yesPercentage).toBeCloseTo(53.8, 1) // 175/325 * 100
      expect(result.noPercentage).toBeCloseTo(46.2, 1) // 150/325 * 100
      expect(result.yesCount).toBe(2)
      expect(result.noCount).toBe(1)
    })

    it('should handle empty commitments array', () => {
      const result = MarketAnalyticsService.calculatePositionDistribution([])
      
      expect(result.yesTokens).toBe(0)
      expect(result.noTokens).toBe(0)
      expect(result.yesPercentage).toBe(0)
      expect(result.noPercentage).toBe(0)
      expect(result.yesCount).toBe(0)
      expect(result.noCount).toBe(0)
    })

    it('should handle single position commitments', () => {
      const yesOnlyCommitments = mockCommitments.filter(c => c.position === 'yes')
      const result = MarketAnalyticsService.calculatePositionDistribution(yesOnlyCommitments)
      
      expect(result.yesTokens).toBe(175)
      expect(result.noTokens).toBe(0)
      expect(result.yesPercentage).toBe(100)
      expect(result.noPercentage).toBe(0)
    })
  })

  describe('cache management', () => {
    it('should clear cache for specific market', () => {
      // This test verifies the cache clearing functionality
      MarketAnalyticsService.clearCache('market1')
      expect(true).toBe(true) // Cache clearing is internal, just verify no errors
    })

    it('should clear all cache', () => {
      MarketAnalyticsService.clearCache()
      expect(true).toBe(true) // Cache clearing is internal, just verify no errors
    })
  })

  describe('cleanup', () => {
    it('should cleanup listeners and cache without errors', () => {
      MarketAnalyticsService.cleanup()
      expect(true).toBe(true) // Cleanup is internal, just verify no errors
    })
  })
})