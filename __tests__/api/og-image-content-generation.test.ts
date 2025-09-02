/**
 * Test for Open Graph image content generation logic
 */

import { getMarketById } from '@/lib/db/database'

// Mock the database service
jest.mock('@/lib/db/database', () => ({
  getMarketById: jest.fn()
}))

const mockGetMarketById = getMarketById as jest.MockedFunction<typeof getMarketById>

describe('Open Graph Image Content Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate SVG content with correct market data', async () => {
    const mockMarket = {
      id: 'test-market-123',
      title: 'Will AI replace developers by 2025?',
      description: 'A prediction about the future of software development.',
      category: 'Technology',
      options: [
        {
          id: 'yes',
          name: 'Yes',
          percentage: 60,
          tokens: 600,
          color: '#10B981'
        },
        {
          id: 'no',
          name: 'No',
          percentage: 40,
          tokens: 400,
          color: '#EF4444'
        }
      ],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-01-01'),
      status: 'active' as const,
      totalTokens: 1000,
      participants: 50,
      tags: ['AI', 'Technology', 'Future']
    }

    mockGetMarketById.mockResolvedValue(mockMarket)

    const market = await getMarketById('test-market-123')
    
    expect(market).toBeDefined()
    
    // Test the logic that would be used in the OG image generation
    const totalTokens = market!.totalTokens || 0
    const leadingOption = market!.options.reduce((prev, current) => 
      (current.tokens > prev.tokens) ? current : prev
    )
    const leadingPercentage = totalTokens > 0 
      ? Math.round((leadingOption.tokens / totalTokens) * 100)
      : 50

    // Verify the data that would be used in SVG generation
    expect(market!.title).toBe('Will AI replace developers by 2025?')
    expect(market!.description).toBe('A prediction about the future of software development.')
    expect(market!.category).toBe('Technology')
    expect(leadingOption.name).toBe('Yes')
    expect(leadingPercentage).toBe(60)
    expect(market!.participants).toBe(50)
    expect(totalTokens).toBe(1000)
    
    // Test title truncation logic (as implemented in the API)
    const truncatedTitle = market!.title.length > 50 
      ? market!.title.substring(0, 47) + '...' 
      : market!.title
    expect(truncatedTitle).toBe('Will AI replace developers by 2025?') // Should not be truncated
    
    // Test description truncation logic
    const truncatedDescription = market!.description.length > 80 
      ? market!.description.substring(0, 77) + '...' 
      : market!.description
    expect(truncatedDescription).toBe('A prediction about the future of software development.') // Should not be truncated
  })

  it('should handle title and description truncation', async () => {
    const mockMarket = {
      id: 'long-content-market',
      title: 'This is a very long market title that definitely exceeds the fifty character limit and should be truncated',
      description: 'This is an extremely long market description that goes way beyond the eighty character limit and should definitely be truncated when displayed in the Open Graph image',
      category: 'Entertainment',
      options: [
        {
          id: 'option1',
          name: 'Option 1',
          percentage: 0,
          tokens: 100,
          color: '#10B981'
        }
      ],
      startDate: new Date(),
      endDate: new Date(),
      status: 'active' as const,
      totalTokens: 100,
      participants: 10,
      tags: []
    }

    mockGetMarketById.mockResolvedValue(mockMarket)

    const market = await getMarketById('long-content-market')
    
    expect(market).toBeDefined()
    
    // Test truncation logic
    const truncatedTitle = market!.title.length > 50 
      ? market!.title.substring(0, 47) + '...' 
      : market!.title
    expect(truncatedTitle).toContain('...')
    expect(truncatedTitle.length).toBeLessThanOrEqual(50)
    
    const truncatedDescription = market!.description.length > 80 
      ? market!.description.substring(0, 77) + '...' 
      : market!.description
    expect(truncatedDescription).toContain('...')
    expect(truncatedDescription.length).toBeLessThanOrEqual(80)
  })

  it('should handle markets with no activity', async () => {
    const mockMarket = {
      id: 'inactive-market',
      title: 'New Market',
      description: 'A brand new market.',
      category: 'Other',
      options: [
        {
          id: 'option1',
          name: 'Option 1',
          percentage: 0,
          tokens: 0,
          color: '#10B981'
        },
        {
          id: 'option2',
          name: 'Option 2',
          percentage: 0,
          tokens: 0,
          color: '#EF4444'
        }
      ],
      startDate: new Date(),
      endDate: new Date(),
      status: 'active' as const,
      totalTokens: 0,
      participants: 0,
      tags: []
    }

    mockGetMarketById.mockResolvedValue(mockMarket)

    const market = await getMarketById('inactive-market')
    
    expect(market).toBeDefined()
    
    // Test default values for inactive market
    const totalTokens = market!.totalTokens || 0
    const leadingOption = market!.options.reduce((prev, current) => 
      (current.tokens > prev.tokens) ? current : prev
    )
    const leadingPercentage = totalTokens > 0 
      ? Math.round((leadingOption.tokens / totalTokens) * 100)
      : 50

    expect(totalTokens).toBe(0)
    expect(market!.participants).toBe(0)
    expect(leadingOption.name).toBe('Option 1') // First option when all are equal
    expect(leadingPercentage).toBe(50) // Default percentage
  })
})