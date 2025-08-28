import { describe, it, expect } from '@jest/globals'
import { Timestamp } from 'firebase/firestore'
import {
  calculateOdds,
  calculatePayout,
  getRealStats,
  calculateCompetitiveness,
  previewOddsImpact,
  formatTokenAmount,
  formatOdds,
  validateMarketData
} from '../market-utils'
import { Market, MarketOption } from '@/lib/types'

// Helper function to create mock market
const createMockMarket = (options: Partial<MarketOption>[] = []): Market => ({
  id: 'test-market',
  title: 'Test Market',
  description: 'Test market description',
  category: 'entertainment',
  status: 'active',
  createdBy: 'user1',
  createdAt: Timestamp.now(),
  endsAt: Timestamp.fromDate(new Date(Date.now() + 86400000)), // 24 hours from now
  tags: ['test'],
  options: options.map((opt, index) => ({
    id: opt.id || `option${index + 1}`,
    text: opt.text || `Option ${index + 1}`,
    totalTokens: opt.totalTokens || 0,
    participantCount: opt.participantCount || 0,
    ...opt
  })),
  totalParticipants: options.reduce((sum, opt) => sum + (opt.participantCount || 0), 0),
  totalTokensStaked: options.reduce((sum, opt) => sum + (opt.totalTokens || 0), 0),
  featured: false,
  trending: false
})

describe('Market Utils', () => {
  describe('calculateOdds', () => {
    it('should return equal odds for empty market', () => {
      const market = createMockMarket([
        { totalTokens: 0 },
        { totalTokens: 0 }
      ])
      
      const odds = calculateOdds(market)
      
      expect(odds.option1).toBe(2) // Equal odds for 2 options
      expect(odds.option2).toBe(2)
    })

    it('should calculate correct odds for balanced market', () => {
      const market = createMockMarket([
        { totalTokens: 100 },
        { totalTokens: 100 }
      ])
      
      const odds = calculateOdds(market)
      
      expect(odds.option1).toBe(2.0) // 200 total / 100 = 2.0
      expect(odds.option2).toBe(2.0)
    })

    it('should calculate correct odds for unbalanced market', () => {
      const market = createMockMarket([
        { totalTokens: 150 }, // 75% of tokens
        { totalTokens: 50 }   // 25% of tokens
      ])
      
      const odds = calculateOdds(market)
      
      expect(odds.option1).toBeCloseTo(1.33, 2) // 200/150 = 1.33
      expect(odds.option2).toBe(4.0) // 200/50 = 4.0
    })

    it('should handle three-option market', () => {
      const market = createMockMarket([
        { totalTokens: 100 },
        { totalTokens: 100 },
        { totalTokens: 100 }
      ])
      
      const odds = calculateOdds(market)
      
      expect(odds.option1).toBe(3.0) // 300/100 = 3.0
      expect(odds.option2).toBe(3.0)
      expect(odds.option3).toBe(3.0)
    })

    it('should handle option with zero tokens', () => {
      const market = createMockMarket([
        { totalTokens: 100 },
        { totalTokens: 0 }
      ])
      
      const odds = calculateOdds(market)
      
      expect(odds.option1).toBe(1.01) // 100/100 = 1.0, but clamped to 1.01
      expect(odds.option2).toBe(100) // High odds for zero tokens
    })

    it('should cap odds at reasonable limits', () => {
      const market = createMockMarket([
        { totalTokens: 1000 },
        { totalTokens: 1 }
      ])
      
      const odds = calculateOdds(market)
      
      expect(odds.option1).toBeGreaterThanOrEqual(1.01)
      expect(odds.option2).toBeLessThanOrEqual(999)
    })
  })

  describe('calculatePayout', () => {
    it('should return zero for zero commitment', () => {
      const market = createMockMarket([{ totalTokens: 100 }])
      
      const payout = calculatePayout(0, 'option1', market)
      
      expect(payout.grossPayout).toBe(0)
      expect(payout.netProfit).toBe(0)
      expect(payout.roi).toBe(0)
    })

    it('should calculate correct payout for balanced market', () => {
      const market = createMockMarket([
        { totalTokens: 100 },
        { totalTokens: 100 }
      ])
      
      const payout = calculatePayout(50, 'option1', market)
      
      expect(payout.grossPayout).toBe(100) // 50 * 2.0 = 100
      expect(payout.netProfit).toBe(50)    // 100 - 50 = 50
      expect(payout.roi).toBe(100)         // (50/50) * 100 = 100%
    })

    it('should calculate correct payout for unbalanced market', () => {
      const market = createMockMarket([
        { totalTokens: 50 },  // Underdog
        { totalTokens: 150 }  // Favorite
      ])
      
      const payout = calculatePayout(25, 'option1', market)
      
      expect(payout.grossPayout).toBe(100) // 25 * 4.0 = 100
      expect(payout.netProfit).toBe(75)    // 100 - 25 = 75
      expect(payout.roi).toBe(300)         // (75/25) * 100 = 300%
    })

    it('should handle non-existent option', () => {
      const market = createMockMarket([{ totalTokens: 100 }])
      
      const payout = calculatePayout(50, 'nonexistent', market)
      
      expect(payout.grossPayout).toBe(100) // Uses default 2.0 odds
      expect(payout.netProfit).toBe(50)
      expect(payout.roi).toBe(100)
    })
  })

  describe('getRealStats', () => {
    it('should handle empty market', () => {
      const market = createMockMarket([])
      
      const stats = getRealStats(market)
      
      expect(stats.averageCommitment).toBe(0)
      expect(stats.competitiveness).toBe(0)
      expect(stats.totalParticipants).toBe(0)
      expect(stats.totalTokens).toBe(0)
    })

    it('should calculate correct stats for active market', () => {
      const market = createMockMarket([
        { totalTokens: 150, participantCount: 3 },
        { totalTokens: 100, participantCount: 2 },
        { totalTokens: 50, participantCount: 1 }
      ])
      
      const stats = getRealStats(market)
      
      expect(stats.averageCommitment).toBe(50) // 300 tokens / 6 participants = 50
      expect(stats.mostPopularOption.id).toBe('option1') // 150 tokens
      expect(stats.totalParticipants).toBe(6)
      expect(stats.totalTokens).toBe(300)
      expect(stats.participantDistribution.option1).toBe(3)
      expect(stats.participantDistribution.option2).toBe(2)
      expect(stats.participantDistribution.option3).toBe(1)
    })

    it('should calculate competitiveness correctly', () => {
      // Perfectly balanced market should have high competitiveness
      const balancedMarket = createMockMarket([
        { totalTokens: 100, participantCount: 1 },
        { totalTokens: 100, participantCount: 1 },
        { totalTokens: 100, participantCount: 1 }
      ])
      
      const balancedStats = getRealStats(balancedMarket)
      expect(balancedStats.competitiveness).toBe(100)

      // Unbalanced market should have lower competitiveness
      const unbalancedMarket = createMockMarket([
        { totalTokens: 250, participantCount: 1 },
        { totalTokens: 25, participantCount: 1 },
        { totalTokens: 25, participantCount: 1 }
      ])
      
      const unbalancedStats = getRealStats(unbalancedMarket)
      expect(unbalancedStats.competitiveness).toBeLessThan(50)
    })
  })

  describe('calculateCompetitiveness', () => {
    it('should return 0 for single option market', () => {
      const market = createMockMarket([{ totalTokens: 100 }])
      
      const competitiveness = calculateCompetitiveness(market)
      
      expect(competitiveness).toBe(0)
    })

    it('should return 100 for perfectly balanced market', () => {
      const market = createMockMarket([
        { totalTokens: 100 },
        { totalTokens: 100 }
      ])
      
      const competitiveness = calculateCompetitiveness(market)
      
      expect(competitiveness).toBe(100)
    })

    it('should return 0 for completely unbalanced market', () => {
      const market = createMockMarket([
        { totalTokens: 100, participantCount: 1 },
        { totalTokens: 0, participantCount: 0 }
      ])
      
      const competitiveness = calculateCompetitiveness(market)
      
      expect(competitiveness).toBe(0)
    })

    it('should calculate intermediate values correctly', () => {
      const market = createMockMarket([
        { totalTokens: 60 },
        { totalTokens: 40 }
      ])
      
      const competitiveness = calculateCompetitiveness(market)
      
      expect(competitiveness).toBeGreaterThan(50)
      expect(competitiveness).toBeLessThan(100)
    })
  })

  describe('previewOddsImpact', () => {
    it('should show minimal impact for small commitment', () => {
      const market = createMockMarket([
        { totalTokens: 1000 },
        { totalTokens: 1000 }
      ])
      
      const preview = previewOddsImpact(10, 'option1', market)
      
      expect(preview.impactLevel).toBe('minimal')
      expect(preview.currentOdds.option1).toBe(2.0)
      expect(preview.projectedOdds.option1).toBeLessThan(2.0)
    })

    it('should show significant impact for large commitment', () => {
      const market = createMockMarket([
        { totalTokens: 100 },
        { totalTokens: 100 }
      ])
      
      const preview = previewOddsImpact(100, 'option1', market)
      
      expect(preview.impactLevel).toBe('significant')
      expect(preview.currentOdds.option1).toBe(2.0)
      expect(preview.projectedOdds.option1).toBeCloseTo(1.5, 1) // 300/200 = 1.5
    })

    it('should update participant counts correctly', () => {
      const market = createMockMarket([
        { totalTokens: 100, participantCount: 2 },
        { totalTokens: 100, participantCount: 2 }
      ])
      
      const preview = previewOddsImpact(50, 'option1', market)
      
      // The function should simulate adding 1 participant and 50 tokens
      expect(preview.projectedOdds.option1).toBeCloseTo(1.67, 2) // 250/150 ≈ 1.67
    })
  })

  describe('formatTokenAmount', () => {
    it('should format small amounts correctly', () => {
      expect(formatTokenAmount(100)).toBe('100')
      expect(formatTokenAmount(999)).toBe('999')
    })

    it('should format thousands correctly', () => {
      expect(formatTokenAmount(1000)).toBe('1.0K')
      expect(formatTokenAmount(1500)).toBe('1.5K')
      expect(formatTokenAmount(999999)).toBe('1000.0K')
    })

    it('should format millions correctly', () => {
      expect(formatTokenAmount(1000000)).toBe('1.0M')
      expect(formatTokenAmount(2500000)).toBe('2.5M')
    })
  })

  describe('formatOdds', () => {
    it('should format even odds correctly', () => {
      expect(formatOdds(2.0)).toBe('Even')
      expect(formatOdds(1.95)).toBe('Even')
      expect(formatOdds(2.05)).toBe('Even')
    })

    it('should format other odds correctly', () => {
      expect(formatOdds(1.5)).toBe('1.5:1')
      expect(formatOdds(3.2)).toBe('3.2:1')
      expect(formatOdds(10.0)).toBe('10.0:1')
    })
  })

  describe('validateMarketData', () => {
    it('should validate correct market data', () => {
      const market = createMockMarket([
        { totalTokens: 100, participantCount: 2 },
        { totalTokens: 100, participantCount: 2 }
      ])
      
      const result = validateMarketData(market)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing market ID', () => {
      const market = createMockMarket([])
      market.id = ''
      
      const result = validateMarketData(market)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Market ID is required')
    })

    it('should detect missing options', () => {
      const market = createMockMarket([])
      
      const result = validateMarketData(market)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Market must have at least one option')
    })

    it('should detect negative values', () => {
      const market = createMockMarket([
        { totalTokens: -10, participantCount: -1 }
      ])
      market.totalTokensStaked = -10
      market.totalParticipants = -1
      
      const result = validateMarketData(market)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Total tokens staked cannot be negative')
      expect(result.errors).toContain('Total participants cannot be negative')
      expect(result.errors).toContain('Option 1 cannot have negative tokens')
      expect(result.errors).toContain('Option 1 cannot have negative participant count')
    })

    it('should detect inconsistent totals', () => {
      const market = createMockMarket([
        { totalTokens: 100 },
        { totalTokens: 100 }
      ])
      market.totalTokensStaked = 150 // Should be 200
      
      const result = validateMarketData(market)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Sum of option tokens does not match total tokens staked')
    })

    it('should detect missing option data', () => {
      const market = createMockMarket([
        { id: '', text: '', totalTokens: 100 }
      ])
      
      const result = validateMarketData(market)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Option 1 must have an ID')
      expect(result.errors).toContain('Option 1 must have text')
    })
  })
})