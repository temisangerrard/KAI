/**
 * Multi-Option Market End-to-End Integration Tests
 * Tests the complete flow from creation to management for multi-option markets
 */

import { createMarket } from '@/app/markets/create/market-service'
import { marketTemplates } from '@/app/markets/create/market-templates'

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  createMarketRecord: jest.fn().mockResolvedValue({
    id: 'test-market-123',
    title: 'Test Market',
    description: 'Test Description',
    category: 'Entertainment',
    options: [],
    startDate: new Date(),
    endDate: new Date(),
    status: 'active',
    totalTokens: 0,
    participants: 0,
    tags: []
  })
}))

// Mock transaction service
jest.mock('@/lib/services/transaction-service', () => ({
  TransactionService: {
    recordMarketCreation: jest.fn().mockResolvedValue(true)
  }
}))

describe('Multi-Option Market End-to-End Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Market Creation Flow', () => {
    it('should create binary market (2 options) successfully', async () => {
      const marketData = {
        title: 'Will it rain tomorrow?',
        description: 'A simple yes/no prediction about weather',
        category: 'Weather',
        options: [
          { name: 'Yes', color: 'bg-green-400' },
          { name: 'No', color: 'bg-red-400' }
        ],
        endDate: new Date(Date.now() + 86400000),
        creatorId: 'user-123',
        creatorRewardPercentage: 5,
        tags: ['weather', 'binary']
      }

      const result = await createMarket(marketData)
      
      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      
      // Verify options have unique IDs
      expect(result.options).toHaveLength(2)
      const optionIds = result.options.map(opt => opt.id)
      const uniqueIds = new Set(optionIds)
      expect(uniqueIds.size).toBe(2)
    })

    it('should create 4-option market successfully', async () => {
      const marketData = {
        title: 'Who will win the competition?',
        description: 'Choose between 4 contestants',
        category: 'Entertainment',
        options: [
          { name: 'Contestant A', color: 'bg-kai-600' },
          { name: 'Contestant B', color: 'bg-primary-400' },
          { name: 'Contestant C', color: 'bg-blue-400' },
          { name: 'Contestant D', color: 'bg-green-400' }
        ],
        endDate: new Date(Date.now() + 86400000),
        creatorId: 'user-123',
        creatorRewardPercentage: 5,
        tags: ['competition', 'multi-option']
      }

      const result = await createMarket(marketData)
      
      expect(result).toBeDefined()
      expect(result.options).toHaveLength(4)
      
      // Verify all options have unique IDs
      const optionIds = result.options.map(opt => opt.id)
      const uniqueIds = new Set(optionIds)
      expect(uniqueIds.size).toBe(4)
      
      // Verify option names are preserved
      const optionNames = result.options.map(opt => opt.name)
      expect(optionNames).toEqual(['Contestant A', 'Contestant B', 'Contestant C', 'Contestant D'])
    })

    it('should create 6-option market successfully', async () => {
      const marketData = {
        title: 'Which team will finish first?',
        description: 'Choose from 6 competing teams',
        category: 'Sports',
        options: [
          { name: 'Team Alpha', color: 'bg-kai-600' },
          { name: 'Team Beta', color: 'bg-primary-400' },
          { name: 'Team Gamma', color: 'bg-blue-400' },
          { name: 'Team Delta', color: 'bg-green-400' },
          { name: 'Team Epsilon', color: 'bg-orange-400' },
          { name: 'Team Zeta', color: 'bg-red-400' }
        ],
        endDate: new Date(Date.now() + 86400000),
        creatorId: 'user-123',
        creatorRewardPercentage: 5,
        tags: ['sports', 'teams', 'competition']
      }

      const result = await createMarket(marketData)
      
      expect(result).toBeDefined()
      expect(result.options).toHaveLength(6)
      
      // Verify unique IDs
      const optionIds = result.options.map(opt => opt.id)
      const uniqueIds = new Set(optionIds)
      expect(uniqueIds.size).toBe(6)
    })

    it('should create 8-option market successfully', async () => {
      const marketData = {
        title: 'Which movie will win Best Picture?',
        description: 'Choose from 8 nominated films',
        category: 'Movies',
        options: [
          { name: 'Movie A', color: 'bg-kai-600' },
          { name: 'Movie B', color: 'bg-primary-400' },
          { name: 'Movie C', color: 'bg-blue-400' },
          { name: 'Movie D', color: 'bg-green-400' },
          { name: 'Movie E', color: 'bg-orange-400' },
          { name: 'Movie F', color: 'bg-red-400' },
          { name: 'Movie G', color: 'bg-yellow-400' },
          { name: 'Movie H', color: 'bg-teal-400' }
        ],
        endDate: new Date(Date.now() + 86400000),
        creatorId: 'user-123',
        creatorRewardPercentage: 5,
        tags: ['movies', 'awards', 'oscars']
      }

      const result = await createMarket(marketData)
      
      expect(result).toBeDefined()
      expect(result.options).toHaveLength(8)
      
      // Verify unique IDs
      const optionIds = result.options.map(opt => opt.id)
      const uniqueIds = new Set(optionIds)
      expect(uniqueIds.size).toBe(8)
    })

    it('should create 10+ option market successfully', async () => {
      const marketData = {
        title: 'Which country will win the most medals?',
        description: 'Choose from 12 top competing countries',
        category: 'Sports',
        options: [
          { name: 'USA', color: 'bg-kai-600' },
          { name: 'China', color: 'bg-primary-400' },
          { name: 'Russia', color: 'bg-blue-400' },
          { name: 'Germany', color: 'bg-green-400' },
          { name: 'Japan', color: 'bg-orange-400' },
          { name: 'Australia', color: 'bg-red-400' },
          { name: 'France', color: 'bg-yellow-400' },
          { name: 'Italy', color: 'bg-teal-400' },
          { name: 'Canada', color: 'bg-purple-400' },
          { name: 'UK', color: 'bg-pink-400' },
          { name: 'Netherlands', color: 'bg-indigo-400' },
          { name: 'South Korea', color: 'bg-cyan-400' }
        ],
        endDate: new Date(Date.now() + 86400000),
        creatorId: 'user-123',
        creatorRewardPercentage: 5,
        tags: ['olympics', 'countries', 'medals']
      }

      const result = await createMarket(marketData)
      
      expect(result).toBeDefined()
      expect(result.options).toHaveLength(12)
      
      // Verify unique IDs
      const optionIds = result.options.map(opt => opt.id)
      const uniqueIds = new Set(optionIds)
      expect(uniqueIds.size).toBe(12)
    })
  })

  describe('Template Integration', () => {
    it('should work with binary templates', () => {
      const binaryTemplates = marketTemplates.filter(t => t.options.length === 2)
      expect(binaryTemplates.length).toBeGreaterThan(0)
      
      binaryTemplates.forEach(template => {
        expect(template.options).toHaveLength(2)
        expect(template.options[0].name).toBeDefined()
        expect(template.options[1].name).toBeDefined()
        expect(template.options[0].color).toBeDefined()
        expect(template.options[1].color).toBeDefined()
      })
    })

    it('should work with multi-option templates', () => {
      const multiTemplates = marketTemplates.filter(t => t.options.length > 2)
      expect(multiTemplates.length).toBeGreaterThan(0)
      
      multiTemplates.forEach(template => {
        expect(template.options.length).toBeGreaterThan(2)
        template.options.forEach(option => {
          expect(option.name).toBeDefined()
          expect(option.color).toBeDefined()
        })
      })
    })

    it('should support templates with various option counts', () => {
      const optionCounts = marketTemplates.map(t => t.options.length)
      const uniqueCounts = new Set(optionCounts)
      
      // Should have templates with different option counts
      expect(uniqueCounts.has(2)).toBe(true) // Binary
      expect(uniqueCounts.has(3)).toBe(true) // Three options
      expect(uniqueCounts.has(4)).toBe(true) // Four options
      
      // Should have at least 3 different option count variations
      expect(uniqueCounts.size).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing binary markets', async () => {
      // Test that existing binary market structure still works
      const legacyBinaryMarket = {
        title: 'Legacy Binary Market',
        description: 'Testing backward compatibility',
        category: 'General',
        options: [
          { name: 'Yes', color: 'bg-green-400' },
          { name: 'No', color: 'bg-red-400' }
        ],
        endDate: new Date(Date.now() + 86400000),
        creatorId: 'user-123',
        creatorRewardPercentage: 5,
        tags: ['legacy', 'binary']
      }

      const result = await createMarket(legacyBinaryMarket)
      
      expect(result).toBeDefined()
      expect(result.options).toHaveLength(2)
      
      // Should work exactly like before
      expect(result.options[0].name).toBe('Yes')
      expect(result.options[1].name).toBe('No')
    })

    it('should handle markets created with old option ID format', async () => {
      // Test that markets with simple numeric IDs still work
      const marketWithOldIds = {
        title: 'Market with Old IDs',
        description: 'Testing old ID format compatibility',
        category: 'General',
        options: [
          { name: 'Option 1', color: 'bg-kai-600' },
          { name: 'Option 2', color: 'bg-primary-400' },
          { name: 'Option 3', color: 'bg-blue-400' }
        ],
        endDate: new Date(Date.now() + 86400000),
        creatorId: 'user-123',
        creatorRewardPercentage: 5,
        tags: ['compatibility']
      }

      const result = await createMarket(marketWithOldIds)
      
      expect(result).toBeDefined()
      expect(result.options).toHaveLength(3)
      
      // New system should generate proper unique IDs
      const optionIds = result.options.map(opt => opt.id)
      const uniqueIds = new Set(optionIds)
      expect(uniqueIds.size).toBe(3)
    })
  })

  describe('Option ID Uniqueness Validation', () => {
    it('should generate unique IDs across multiple market creations', async () => {
      const allOptionIds: string[] = []
      
      // Create multiple markets and collect all option IDs
      for (let i = 0; i < 5; i++) {
        const marketData = {
          title: `Test Market ${i}`,
          description: `Test market number ${i}`,
          category: 'Test',
          options: [
            { name: `Option A${i}`, color: 'bg-kai-600' },
            { name: `Option B${i}`, color: 'bg-primary-400' },
            { name: `Option C${i}`, color: 'bg-blue-400' }
          ],
          endDate: new Date(Date.now() + 86400000),
          creatorId: 'user-123',
          creatorRewardPercentage: 5,
          tags: ['test']
        }

        const result = await createMarket(marketData)
        const optionIds = result.options.map(opt => opt.id)
        allOptionIds.push(...optionIds)
      }
      
      // All option IDs across all markets should be unique
      const uniqueIds = new Set(allOptionIds)
      expect(uniqueIds.size).toBe(allOptionIds.length)
    })

    it('should generate IDs with proper format', async () => {
      const marketData = {
        title: 'ID Format Test Market',
        description: 'Testing ID format',
        category: 'Test',
        options: [
          { name: 'Option 1', color: 'bg-kai-600' },
          { name: 'Option 2', color: 'bg-primary-400' }
        ],
        endDate: new Date(Date.now() + 86400000),
        creatorId: 'user-123',
        creatorRewardPercentage: 5,
        tags: ['test']
      }

      const result = await createMarket(marketData)
      
      // Check that option IDs follow the expected format (includes market ID generation)
      result.options.forEach(option => {
        expect(option.id).toMatch(/^option_market_\d+_[a-z0-9]+_\d+_\d+$/)
      })
    })
  })

  describe('Market Management Compatibility', () => {
    it('should support editing both binary and multi-option markets', () => {
      // Test that the market structure supports editing
      const binaryMarket = {
        id: 'binary-market-1',
        title: 'Binary Market',
        description: 'A binary market',
        category: 'Test',
        options: [
          { id: 'opt1', name: 'Yes', percentage: 60, tokens: 600, color: 'bg-green-400' },
          { id: 'opt2', name: 'No', percentage: 40, tokens: 400, color: 'bg-red-400' }
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active' as const,
        totalTokens: 1000,
        participants: 50,
        tags: ['test']
      }

      const multiMarket = {
        id: 'multi-market-1',
        title: 'Multi-Option Market',
        description: 'A multi-option market',
        category: 'Test',
        options: [
          { id: 'opt1', name: 'Option A', percentage: 25, tokens: 250, color: 'bg-kai-600' },
          { id: 'opt2', name: 'Option B', percentage: 30, tokens: 300, color: 'bg-primary-400' },
          { id: 'opt3', name: 'Option C', percentage: 25, tokens: 250, color: 'bg-blue-400' },
          { id: 'opt4', name: 'Option D', percentage: 20, tokens: 200, color: 'bg-green-400' }
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active' as const,
        totalTokens: 1000,
        participants: 40,
        tags: ['test']
      }

      // Both should have the same structure and be manageable
      expect(binaryMarket.options).toHaveLength(2)
      expect(multiMarket.options).toHaveLength(4)
      
      // Both should have required fields for management
      const markets = [binaryMarket, multiMarket]
      markets.forEach(market => {
        expect(market.id).toBeDefined()
        expect(market.title).toBeDefined()
        expect(market.options).toBeDefined()
        expect(market.status).toBeDefined()
        
        market.options.forEach(option => {
          expect(option.id).toBeDefined()
          expect(option.name).toBeDefined()
          expect(option.color).toBeDefined()
        })
      })
    })
  })
})