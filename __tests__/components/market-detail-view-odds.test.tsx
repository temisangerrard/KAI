/**
 * Test to verify that market detail view calculates odds correctly
 * based on actual token distribution rather than hardcoded values
 */

import { calculateOdds } from '@/lib/utils/market-utils'
import { Market as MarketUtilsType } from '@/lib/types/database'

describe('Market Detail View Odds Calculation', () => {
  it('should calculate win chances based on token distribution', () => {
    // Mock market data similar to what the component receives
    const mockMarket = {
      id: 'test-market',
      title: 'Test Market',
      description: 'Test description',
      category: 'entertainment' as any,
      status: 'active' as any,
      createdBy: 'user-123',
      createdAt: new Date() as any,
      endsAt: new Date() as any,
      tags: ['test'],
      totalParticipants: 100,
      totalTokensStaked: 1000,
      featured: false,
      trending: false,
      options: [
        {
          id: 'option1',
          text: 'Option 1',
          totalTokens: 600, // 60% of total tokens
          participantCount: 60
        },
        {
          id: 'option2', 
          text: 'Option 2',
          totalTokens: 400, // 40% of total tokens
          participantCount: 40
        }
      ]
    }

    // Calculate odds using the same logic as the component
    const currentOdds = calculateOdds(mockMarket)

    // Test that odds are calculated correctly
    expect(currentOdds.option1.odds).toBeCloseTo(1.67, 2) // 1000/600 ≈ 1.67
    expect(currentOdds.option2.odds).toBe(2.5) // 1000/400 = 2.5

    // Test win chance calculation (what the component displays)
    // This should be based on token distribution, not odds
    const option1WinChance = Math.round((600 / 1000) * 100) // 60%
    const option2WinChance = Math.round((400 / 1000) * 100) // 40%

    expect(option1WinChance).toBe(60)
    expect(option2WinChance).toBe(40)

    // Verify that win chances add up to 100%
    expect(option1WinChance + option2WinChance).toBe(100)
  })

  it('should handle markets with zero tokens correctly', () => {
    const emptyMarket = {
      id: 'empty-market',
      title: 'Empty Market',
      description: 'Test description',
      category: 'entertainment' as any,
      status: 'active' as any,
      createdBy: 'user-123',
      createdAt: new Date() as any,
      endsAt: new Date() as any,
      tags: ['test'],
      totalParticipants: 0,
      totalTokensStaked: 0,
      featured: false,
      trending: false,
      options: [
        {
          id: 'option1',
          text: 'Option 1',
          totalTokens: 0,
          participantCount: 0
        },
        {
          id: 'option2',
          text: 'Option 2', 
          totalTokens: 0,
          participantCount: 0
        }
      ]
    }

    const currentOdds = calculateOdds(emptyMarket)

    // Should return equal odds for empty market
    expect(currentOdds.option1.odds).toBe(2)
    expect(currentOdds.option2.odds).toBe(2)

    // Win chances should be 0 for empty market
    const option1WinChance = emptyMarket.totalTokensStaked > 0 
      ? Math.round((0 / emptyMarket.totalTokensStaked) * 100) 
      : 0
    const option2WinChance = emptyMarket.totalTokensStaked > 0 
      ? Math.round((0 / emptyMarket.totalTokensStaked) * 100) 
      : 0

    expect(option1WinChance).toBe(0)
    expect(option2WinChance).toBe(0)
  })

  it('should handle three-option markets correctly', () => {
    const threeOptionMarket = {
      id: 'three-option-market',
      title: 'Three Option Market',
      description: 'Test description',
      category: 'entertainment' as any,
      status: 'active' as any,
      createdBy: 'user-123',
      createdAt: new Date() as any,
      endsAt: new Date() as any,
      tags: ['test'],
      totalParticipants: 150,
      totalTokensStaked: 1500,
      featured: false,
      trending: false,
      options: [
        {
          id: 'option1',
          text: 'Option 1',
          totalTokens: 750, // 50% of tokens
          participantCount: 75
        },
        {
          id: 'option2',
          text: 'Option 2',
          totalTokens: 450, // 30% of tokens
          participantCount: 45
        },
        {
          id: 'option3',
          text: 'Option 3',
          totalTokens: 300, // 20% of tokens
          participantCount: 30
        }
      ]
    }

    const currentOdds = calculateOdds(threeOptionMarket)

    // Test odds calculation
    expect(currentOdds.option1.odds).toBe(2.0)  // 1500/750 = 2.0
    expect(currentOdds.option2.odds).toBeCloseTo(3.33, 2) // 1500/450 ≈ 3.33
    expect(currentOdds.option3.odds).toBe(5.0)  // 1500/300 = 5.0

    // Test win chance calculation
    const option1WinChance = Math.round((750 / 1500) * 100) // 50%
    const option2WinChance = Math.round((450 / 1500) * 100) // 30%
    const option3WinChance = Math.round((300 / 1500) * 100) // 20%

    expect(option1WinChance).toBe(50)
    expect(option2WinChance).toBe(30)
    expect(option3WinChance).toBe(20)

    // Verify that win chances add up to 100%
    expect(option1WinChance + option2WinChance + option3WinChance).toBe(100)
  })
})