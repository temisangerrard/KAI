/**
 * Tests for market service data loading functionality
 */

import { getAllMarkets, getMarketById, isSampleMarket } from '../../app/markets/create/market-service'

// Mock fetch for testing
global.fetch = jest.fn()

describe('Market Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllMarkets', () => {
    it('should return empty array when API fails', async () => {
      // Mock fetch to throw an error
      ;(fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'))

      const markets = await getAllMarkets()
      
      expect(markets).toHaveLength(0)
    })

    it('should return live markets when API succeeds', async () => {
      const mockLiveMarkets = [
        {
          id: 'live-1',
          title: 'Live Market 1',
          description: 'A live market from Firestore',
          category: 'Test',
          options: [],
          startDate: new Date(),
          endDate: new Date(),
          status: 'active',
          totalTokens: 1000,
          participants: 10,
          tags: []
        },
        {
          id: 'live-2',
          title: 'Live Market 2',
          description: 'Another live market from Firestore',
          category: 'Test',
          options: [],
          startDate: new Date('2024-01-01'),
          endDate: new Date(),
          status: 'active',
          totalTokens: 2000,
          participants: 20,
          tags: []
        }
      ]

      // Mock successful API response
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockLiveMarkets)
      })

      const markets = await getAllMarkets()
      
      expect(markets).toHaveLength(2)
      expect(markets.every(m => !isSampleMarket(m))).toBe(true)
    })

    it('should sort markets by start date (newest first)', async () => {
      const mockLiveMarkets = [
        {
          id: 'live-1',
          title: 'Older Market',
          description: 'An older market',
          category: 'Test',
          options: [],
          startDate: new Date('2024-01-01'),
          endDate: new Date(),
          status: 'active',
          totalTokens: 1000,
          participants: 10,
          tags: []
        },
        {
          id: 'live-2',
          title: 'Newer Market',
          description: 'A newer market',
          category: 'Test',
          options: [],
          startDate: new Date('2024-02-01'),
          endDate: new Date(),
          status: 'active',
          totalTokens: 2000,
          participants: 20,
          tags: []
        }
      ]

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockLiveMarkets)
      })

      const markets = await getAllMarkets()
      
      expect(markets[0].title).toBe('Newer Market')
      expect(markets[1].title).toBe('Older Market')
    })
  })

  describe('getMarketById', () => {
    it('should return live market when API succeeds', async () => {
      const mockLiveMarket = {
        id: 'live-1',
        title: 'Live Market 1',
        description: 'A live market from Firestore',
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
        json: () => Promise.resolve(mockLiveMarket)
      })

      const market = await getMarketById('live-1')
      
      expect(market).toBeTruthy()
      expect(market?.id).toBe('live-1')
      expect(isSampleMarket(market!)).toBe(false)
    })

    it('should return null when market not found', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Not found'))

      const market = await getMarketById('non-existent')
      
      expect(market).toBeNull()
    })
  })

  describe('isSampleMarket', () => {
    it('should always return false for all markets (no more sample markets)', () => {
      const liveMarket = {
        id: 'live-1',
        title: 'Live Market',
        description: 'A live market from Firestore',
        category: 'Test',
        options: [],
        startDate: new Date(),
        endDate: new Date(),
        status: 'active' as const,
        totalTokens: 1000,
        participants: 10,
        tags: []
      }
      
      expect(isSampleMarket(liveMarket)).toBe(false)
    })

    it('should return false even for markets with sample tag (legacy)', () => {
      const marketWithSampleTag = {
        id: 'legacy-1',
        title: 'Legacy Market',
        description: 'A market with sample tag',
        category: 'Test',
        options: [],
        startDate: new Date(),
        endDate: new Date(),
        status: 'active' as const,
        totalTokens: 1000,
        participants: 10,
        tags: ['sample']
      }
      
      expect(isSampleMarket(marketWithSampleTag)).toBe(false)
    })
  })
})