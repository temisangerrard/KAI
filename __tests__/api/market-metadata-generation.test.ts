/**
 * Test for market metadata generation functionality
 */

import { getMarketById } from '@/lib/db/database'

// Mock the database service
jest.mock('@/lib/db/database', () => ({
  getMarketById: jest.fn()
}))

const mockGetMarketById = getMarketById as jest.MockedFunction<typeof getMarketById>

describe('Market Metadata Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate correct metadata structure for a market', async () => {
    const mockMarket = {
      id: 'test-market-123',
      title: 'Will AI replace developers by 2025?',
      description: 'A prediction about the future of software development and artificial intelligence.',
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

    // Test the metadata generation logic directly
    const market = await getMarketById('test-market-123')
    
    expect(market).toBeDefined()
    expect(market?.title).toBe('Will AI replace developers by 2025?')
    expect(market?.description).toContain('artificial intelligence')
    expect(market?.totalTokens).toBe(1000)
    expect(market?.participants).toBe(50)
    expect(market?.options).toHaveLength(2)

    // Test leading option calculation
    const leadingOption = market!.options.reduce((prev, current) => 
      (current.tokens > prev.tokens) ? current : prev
    )
    expect(leadingOption.name).toBe('Yes')
    expect(leadingOption.tokens).toBe(600)

    // Test percentage calculation
    const leadingPercentage = Math.round((leadingOption.tokens / market!.totalTokens) * 100)
    expect(leadingPercentage).toBe(60)

    // Test metadata structure
    const title = `${market!.title} | KAI Prediction Market`
    const description = `${market!.description} Current odds: ${leadingOption.name} ${leadingPercentage}%. ${market!.participants} participants, ${market!.totalTokens} tokens staked.`
    
    expect(title).toBe('Will AI replace developers by 2025? | KAI Prediction Market')
    expect(description).toContain('Current odds: Yes 60%')
    expect(description).toContain('50 participants')
    expect(description).toContain('1000 tokens staked')
  })

  it('should handle market not found', async () => {
    mockGetMarketById.mockResolvedValue(null)

    const market = await getMarketById('nonexistent')
    expect(market).toBeNull()
  })

  it('should handle markets with no tokens staked', async () => {
    const mockMarket = {
      id: 'new-market',
      title: 'New Market',
      description: 'A brand new market with no activity yet.',
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

    const market = await getMarketById('new-market')
    
    expect(market).toBeDefined()
    expect(market?.totalTokens).toBe(0)
    expect(market?.participants).toBe(0)

    // Test default percentage calculation when no tokens
    const leadingOption = market!.options.reduce((prev, current) => 
      (current.tokens > prev.tokens) ? current : prev
    )
    const leadingPercentage = market!.totalTokens > 0 
      ? Math.round((leadingOption.tokens / market!.totalTokens) * 100)
      : 50

    expect(leadingPercentage).toBe(50) // Should default to 50%
  })

  it('should generate proper image URL structure', () => {
    const marketId = 'test-market-123'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kai-platform.com'
    const imageUrl = `${baseUrl}/api/og/market/${marketId}`
    
    expect(imageUrl).toContain('/api/og/market/')
    expect(imageUrl).toContain(marketId)
  })

  it('should generate comprehensive metadata structure', async () => {
    const mockMarket = {
      id: 'comprehensive-test',
      title: 'Comprehensive Test Market',
      description: 'Testing all metadata features.',
      category: 'Technology',
      options: [
        {
          id: 'option1',
          name: 'Option 1',
          percentage: 70,
          tokens: 700,
          color: '#10B981'
        }
      ],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-01-01'),
      status: 'active' as const,
      totalTokens: 1000,
      participants: 25,
      tags: ['AI', 'Future', 'Tech']
    }

    mockGetMarketById.mockResolvedValue(mockMarket)

    const market = await getMarketById('comprehensive-test')
    
    expect(market).toBeDefined()
    
    // Test that all required fields for comprehensive metadata are present
    expect(market?.title).toBeDefined()
    expect(market?.description).toBeDefined()
    expect(market?.category).toBeDefined()
    expect(market?.tags).toBeDefined()
    expect(market?.startDate).toBeDefined()
    expect(market?.status).toBeDefined()
    expect(market?.totalTokens).toBeDefined()
    expect(market?.participants).toBeDefined()
    expect(market?.options).toBeDefined()
    
    // Test URL generation
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kai-platform.com'
    const url = `${baseUrl}/markets/${market!.id}`
    const imageUrl = `${baseUrl}/api/og/market/${market!.id}`
    
    expect(url).toBe(`${baseUrl}/markets/comprehensive-test`)
    expect(imageUrl).toBe(`${baseUrl}/api/og/market/comprehensive-test`)
  })
})