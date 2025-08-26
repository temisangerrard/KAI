/**
 * Tests for market service data loading functionality
 */

import { getAllMarkets, getMarketById, isSampleMarket } from '../../app/markets/create/market-service'
import { sampleMarkets } from '../../app/markets/create/sample-markets'

// Mock fetch for testing
global.fetch = jest.fn()

describe('Market Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllMarkets', () => {
    it('should return sample markets when API fails', async () => {
      // Mock fetch to throw an error
      ;(fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'))

      const markets = await getAllMarkets()
      
      expect(markets).toHaveLength(sampleMarkets.length)
      expect(markets.every(m => isSampleMarket(m))).toBe(true)
    })

    it('should merge real and sample markets when API succeeds', async () => {
      const mockRealMarkets = [
        {
          id: 'real-1',
          title: 'Real Market 1',
          description: 'A real market',
          category: 'Test',
          options: [],
          startDate: new Date(),
          endDate: new Date(),
          status: 'active',
          totalTokens: 1000,
          participants: 10,
          tags: []
        }
      ]

      // Mock successful API response
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRealMarkets)
      })

      const markets = await getAllMarkets()
      
      expect(markets.length).toBeGreaterThan(sampleMarkets.length)
      
      // Real markets should come first
      const firstMarket = markets[0]
      expect(isSampleMarket(firstMarket)).toBe(false)
    })

    it('should prioritize real markets over sample markets in sorting', async () => {
      const mockRealMarkets = [
        {
          id: 'real-1',
          title: 'Real Market 1',
          description: 'A real market',
          category: 'Test',
          options: [],
          startDate: new Date('2024-01-01'),
          endDate: new Date(),
          status: 'active',
          totalTokens: 1000,
          participants: 10,
          tags: []
        }
      ]

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRealMarkets)
      })

      const markets = await getAllMarkets()
      
      // Find first real and first sample market
      const firstRealIndex = markets.findIndex(m => !isSampleMarket(m))
      const firstSampleIndex = markets.findIndex(m => isSampleMarket(m))
      
      expect(firstRealIndex).toBeLessThan(firstSampleIndex)
    })
  })

  describe('getMarketById', () => {
    it('should return sample market when found', async () => {
      const sampleMarket = sampleMarkets[0]
      const market = await getMarketById(sampleMarket.id)
      
      expect(market).toBeTruthy()
      expect(market?.id).toBe(sampleMarket.id)
      expect(isSampleMarket(market!)).toBe(true)
    })

    it('should return real market when API succeeds', async () => {
      const mockRealMarket = {
        id: 'real-1',
        title: 'Real Market 1',
        description: 'A real market',
        category: 'Test',
        options: [],
        startDate: new Date(),
        endDate: new Date(),
        status: 'active',
        totalTokens: 1000,
        participants: 10,
        tags: []
      }

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRealMarket)
      })

      const market = await getMarketById('real-1')
      
      expect(market).toBeTruthy()
      expect(market?.id).toBe('real-1')
      expect(isSampleMarket(market!)).toBe(false)
    })

    it('should return null when market not found', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Not found'))

      const market = await getMarketById('non-existent')
      
      expect(market).toBeNull()
    })
  })

  describe('isSampleMarket', () => {
    it('should identify sample markets correctly', () => {
      const sampleMarket = sampleMarkets[0]
      expect(isSampleMarket(sampleMarket)).toBe(true)
    })

    it('should identify real markets correctly', () => {
      const realMarket = {
        id: 'real-1',
        title: 'Real Market',
        description: 'A real market',
        category: 'Test',
        options: [],
        startDate: new Date(),
        endDate: new Date(),
        status: 'active' as const,
        totalTokens: 1000,
        participants: 10,
        tags: []
      }
      
      expect(isSampleMarket(realMarket)).toBe(false)
    })
  })
})