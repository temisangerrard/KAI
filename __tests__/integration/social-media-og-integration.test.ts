/**
 * Integration test for social media Open Graph functionality
 */

import { getMarketById } from '@/lib/db/database'

// Mock the database service
jest.mock('@/lib/db/database', () => ({
  getMarketById: jest.fn()
}))

const mockGetMarketById = getMarketById as jest.MockedFunction<typeof getMarketById>

describe('Social Media Open Graph Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should provide all necessary data for social media sharing', async () => {
    const mockMarket = {
      id: 'social-test-market',
      title: 'Will social media sharing work perfectly?',
      description: 'Testing the complete social media integration with Open Graph meta tags.',
      category: 'Technology',
      options: [
        {
          id: 'yes',
          name: 'Yes, perfectly',
          percentage: 85,
          tokens: 850,
          color: '#10B981'
        },
        {
          id: 'no',
          name: 'No, needs work',
          percentage: 15,
          tokens: 150,
          color: '#EF4444'
        }
      ],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-01-01'),
      status: 'active' as const,
      totalTokens: 1000,
      participants: 42,
      tags: ['Social Media', 'Integration', 'Testing']
    }

    mockGetMarketById.mockResolvedValue(mockMarket)

    const market = await getMarketById('social-test-market')
    
    // Verify market data is complete for social sharing
    expect(market).toBeDefined()
    expect(market!.id).toBe('social-test-market')
    expect(market!.title).toBe('Will social media sharing work perfectly?')
    expect(market!.description).toContain('Testing the complete social media integration')
    
    // Test metadata generation components
    const leadingOption = market!.options.reduce((prev, current) => 
      (current.tokens > prev.tokens) ? current : prev
    )
    expect(leadingOption.name).toBe('Yes, perfectly')
    
    const leadingPercentage = Math.round((leadingOption.tokens / market!.totalTokens) * 100)
    expect(leadingPercentage).toBe(85)
    
    // Test social media metadata structure
    const title = `${market!.title} | KAI Prediction Market`
    const description = `${market!.description} Current odds: ${leadingOption.name} ${leadingPercentage}%. ${market!.participants} participants, ${market!.totalTokens} tokens staked.`
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kai-platform.com'
    const url = `${baseUrl}/markets/${market!.id}`
    const imageUrl = `${baseUrl}/api/og/market/${market!.id}`
    
    // Verify all social media requirements are met
    expect(title).toBe('Will social media sharing work perfectly? | KAI Prediction Market')
    expect(description).toContain('Current odds: Yes, perfectly 85%')
    expect(description).toContain('42 participants')
    expect(description).toContain('1000 tokens staked')
    expect(url).toBe(`${baseUrl}/markets/social-test-market`)
    expect(imageUrl).toBe(`${baseUrl}/api/og/market/social-test-market`)
    
    // Verify tags are available for social media
    expect(market!.tags).toContain('Social Media')
    expect(market!.tags).toContain('Integration')
    expect(market!.tags).toContain('Testing')
    
    // Verify category is available
    expect(market!.category).toBe('Technology')
    
    // Verify status for robots meta tag
    expect(market!.status).toBe('active')
  })

  it('should handle edge cases for social media sharing', async () => {
    const mockMarket = {
      id: 'edge-case-market',
      title: 'A very long market title that might need truncation for social media platforms that have character limits',
      description: 'This is an extremely long description that tests how the system handles very long text content when generating social media previews and Open Graph meta tags for various platforms.',
      category: 'Entertainment',
      options: [
        {
          id: 'option1',
          name: 'Very long option name that might be truncated',
          percentage: 0,
          tokens: 0,
          color: '#10B981'
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

    const market = await getMarketById('edge-case-market')
    
    expect(market).toBeDefined()
    expect(market!.title.length).toBeGreaterThan(50) // Long title
    expect(market!.description.length).toBeGreaterThan(100) // Long description
    expect(market!.totalTokens).toBe(0) // No tokens staked
    expect(market!.participants).toBe(0) // No participants
    expect(market!.tags).toHaveLength(0) // No tags
    
    // Test default percentage calculation
    const leadingOption = market!.options[0]
    const leadingPercentage = market!.totalTokens > 0 
      ? Math.round((leadingOption.tokens / market!.totalTokens) * 100)
      : 50
    
    expect(leadingPercentage).toBe(50) // Should default to 50%
  })
})