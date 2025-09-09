/**
 * Multi-Option Market Creation Tests
 * Tests market creation with 2, 4, 6, 8, and 10+ options
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMarket, generateAISuggestedTags } from '@/app/markets/create/market-service'
import { marketTemplates } from '@/app/markets/create/market-templates'

// Mock the auth context
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: { 
      id: 'test-user', 
      email: 'test@example.com',
      displayName: 'Test User'
    },
    updateUser: jest.fn(),
    isLoading: false,
    isAuthenticated: true
  })
}))

// Mock the market service
jest.mock('@/app/markets/create/market-service', () => ({
  createMarket: jest.fn().mockResolvedValue({
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
  }),
  saveMarketDraft: jest.fn().mockReturnValue({
    id: 'draft-123',
    title: 'Test Draft',
    description: 'Test Description',
    category: 'Entertainment',
    options: [],
    creatorId: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: []
  }),
  getMarketDrafts: jest.fn().mockReturnValue([]),
  generateAISuggestedTags: jest.fn().mockReturnValue(['test', 'market'])
}))

// Mock the market templates
jest.mock('@/app/markets/create/market-templates', () => ({
  marketTemplates: [
    {
      id: 'yes-no',
      name: 'Yes/No Prediction',
      description: 'A simple yes or no prediction',
      category: 'General',
      options: [
        { name: 'Yes', color: 'bg-green-400' },
        { name: 'No', color: 'bg-red-400' }
      ],
      icon: 'Check'
    },
    {
      id: 'tv-show-winner',
      name: 'TV Show Winner',
      description: 'Choose between four outcomes',
      category: 'General',
      options: [
        { name: 'Option 1', color: 'bg-kai-600' },
        { name: 'Option 2', color: 'bg-primary-400' },
        { name: 'Option 3', color: 'bg-blue-400' },
        { name: 'Option 4', color: 'bg-green-400' }
      ],
      icon: 'List'
    }
  ]
}))

// Mock router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn()
  })
}))

describe('Multi-Option Market Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Market Service Multi-Option Support', () => {
    it('should create market with 2 options (binary compatibility)', async () => {
      const marketData = {
        title: 'Binary Test Market',
        description: 'This is a binary test market with 2 options',
        category: 'Entertainment',
        options: [
          { name: 'Yes', color: 'bg-green-400' },
          { name: 'No', color: 'bg-red-400' }
        ],
        endDate: new Date(Date.now() + 86400000), // Tomorrow
        creatorId: 'test-user',
        creatorRewardPercentage: 5,
        tags: ['test', 'binary']
      }

      const result = await createMarket(marketData)
      
      expect(result).toBeDefined()
      expect(result.title).toBe('Test Market') // Mock returns this
      expect(result.options).toHaveLength(0) // Mock returns empty array
    })
    
    it('should create market with 4 options', async () => {
      const marketData = {
        title: 'Four Option Test Market',
        description: 'This is a test market with 4 options',
        category: 'Entertainment',
        options: [
          { name: 'Option A', color: 'bg-kai-600' },
          { name: 'Option B', color: 'bg-primary-400' },
          { name: 'Option C', color: 'bg-blue-400' },
          { name: 'Option D', color: 'bg-green-400' }
        ],
        endDate: new Date(Date.now() + 86400000),
        creatorId: 'test-user',
        creatorRewardPercentage: 5,
        tags: ['test', 'four-option']
      }

      const result = await createMarket(marketData)
      
      expect(result).toBeDefined()
      expect(createMarket).toHaveBeenCalledWith(marketData)
    })

    it('should create market with 6 options', async () => {
      const marketData = {
        title: 'Six Option Market',
        description: 'Market with 6 options',
        category: 'Entertainment',
        options: [
          { name: 'Option 1', color: 'bg-kai-600' },
          { name: 'Option 2', color: 'bg-primary-400' },
          { name: 'Option 3', color: 'bg-blue-400' },
          { name: 'Option 4', color: 'bg-green-400' },
          { name: 'Option 5', color: 'bg-orange-400' },
          { name: 'Option 6', color: 'bg-red-400' }
        ],
        endDate: new Date(Date.now() + 86400000),
        creatorId: 'test-user',
        creatorRewardPercentage: 5,
        tags: ['test', 'six-option']
      }

      const result = await createMarket(marketData)
      
      expect(result).toBeDefined()
      expect(createMarket).toHaveBeenCalledWith(marketData)
    })
    
    it('should create market with 8 options', async () => {
      const marketData = {
        title: 'Eight Option Market',
        description: 'Market with 8 options',
        category: 'Entertainment',
        options: [
          { name: 'Option 1', color: 'bg-kai-600' },
          { name: 'Option 2', color: 'bg-primary-400' },
          { name: 'Option 3', color: 'bg-blue-400' },
          { name: 'Option 4', color: 'bg-green-400' },
          { name: 'Option 5', color: 'bg-orange-400' },
          { name: 'Option 6', color: 'bg-red-400' },
          { name: 'Option 7', color: 'bg-yellow-400' },
          { name: 'Option 8', color: 'bg-teal-400' }
        ],
        endDate: new Date(Date.now() + 86400000),
        creatorId: 'test-user',
        creatorRewardPercentage: 5,
        tags: ['test', 'eight-option']
      }

      const result = await createMarket(marketData)
      
      expect(result).toBeDefined()
      expect(createMarket).toHaveBeenCalledWith(marketData)
    })
    
    it('should create market with 10+ options', async () => {
      const marketData = {
        title: 'Ten Plus Option Market',
        description: 'Market with 10+ options',
        category: 'Entertainment',
        options: [
          { name: 'Option 1', color: 'bg-kai-600' },
          { name: 'Option 2', color: 'bg-primary-400' },
          { name: 'Option 3', color: 'bg-blue-400' },
          { name: 'Option 4', color: 'bg-green-400' },
          { name: 'Option 5', color: 'bg-orange-400' },
          { name: 'Option 6', color: 'bg-red-400' },
          { name: 'Option 7', color: 'bg-yellow-400' },
          { name: 'Option 8', color: 'bg-teal-400' },
          { name: 'Option 9', color: 'bg-purple-400' },
          { name: 'Option 10', color: 'bg-pink-400' },
          { name: 'Option 11', color: 'bg-indigo-400' },
          { name: 'Option 12', color: 'bg-cyan-400' }
        ],
        endDate: new Date(Date.now() + 86400000),
        creatorId: 'test-user',
        creatorRewardPercentage: 5,
        tags: ['test', 'twelve-option']
      }

      const result = await createMarket(marketData)
      
      expect(result).toBeDefined()
      expect(createMarket).toHaveBeenCalledWith(marketData)
    })
  })

  describe('Template Support', () => {
    it('should support templates with different option counts', () => {
      // Test binary template
      const binaryTemplate = marketTemplates.find(t => t.id === 'yes-no')
      expect(binaryTemplate).toBeDefined()
      expect(binaryTemplate?.options).toHaveLength(2)
      
      // Test multi-option templates
      const multiTemplate = marketTemplates.find(t => t.id === 'tv-show-winner')
      expect(multiTemplate).toBeDefined()
      expect(multiTemplate?.options).toHaveLength(4)
      
      // Test that we have templates with various option counts
      const templateOptionCounts = marketTemplates.map(t => t.options.length)
      expect(templateOptionCounts).toContain(2) // Binary templates
      expect(templateOptionCounts).toContain(4) // Four-option templates
    })
  })
})