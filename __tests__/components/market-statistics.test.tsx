import React from 'react'
import { render, screen } from '@testing-library/react'
import { MarketStatistics } from '@/app/markets/[id]/market-statistics'
import { Market } from '@/lib/db/database'

// Mock the market-utils module
jest.mock('@/lib/utils/market-utils', () => ({
  getRealStats: jest.fn().mockReturnValue({
    averageCommitment: 150,
    mostPopularOption: {
      id: 'yes',
      text: 'Yes',
      totalTokens: 756,
      participantCount: 4
    },
    competitiveness: 63,
    totalParticipants: 7,
    totalTokens: 1201,
    participantDistribution: {
      'yes': 4,
      'no': 3
    }
  }),
  calculateCompetitiveness: jest.fn().mockReturnValue(63),
  formatTokenAmount: jest.fn().mockImplementation((amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`
    }
    return amount.toString()
  })
}))

const mockMarket: Market = {
  id: 'test-market-1',
  title: 'Will it rain tomorrow?',
  description: 'Test market description',
  category: 'Weather',
  status: 'active',
  startDate: new Date('2024-08-27'),
  endDate: new Date('2024-08-30'),
  totalTokens: 1201,
  participants: 7,
  tags: ['weather', 'prediction'],
  options: [
    {
      id: 'yes',
      name: 'Yes',
      tokens: 756,
      percentage: 63,
      color: 'bg-green-500'
    },
    {
      id: 'no',
      name: 'No',
      tokens: 445,
      percentage: 37,
      color: 'bg-red-500'
    }
  ]
}

// Test market with percentage but no tokens (edge case)
const mockMarketWithPercentageOnly: Market = {
  id: 'test-market-2',
  title: 'Test market with percentages',
  description: 'Test market description',
  category: 'Test',
  status: 'active',
  startDate: new Date('2024-08-27'),
  endDate: new Date('2024-08-30'),
  totalTokens: 1000,
  participants: 5,
  tags: ['test'],
  options: [
    {
      id: 'yes',
      name: 'Yes',
      tokens: 0, // No tokens but has percentage
      percentage: 70,
      color: 'bg-green-500'
    },
    {
      id: 'no',
      name: 'No',
      tokens: 0, // No tokens but has percentage
      percentage: 30,
      color: 'bg-red-500'
    }
  ]
}

describe('MarketStatistics', () => {
  it('renders market statistics with token-based metrics', () => {
    render(<MarketStatistics market={mockMarket} />)
    
    // Check that the component renders
    expect(screen.getByText('Market Statistics')).toBeInTheDocument()
    
    // Check token distribution section
    expect(screen.getByText('Token Distribution')).toBeInTheDocument()
    
    // Check that token amounts are displayed correctly
    expect(screen.getByText('756 tokens')).toBeInTheDocument()
    expect(screen.getByText('445 tokens')).toBeInTheDocument()
    
    // Check percentages are calculated correctly (use getAllByText to handle multiple instances)
    const percentages63 = screen.getAllByText('63%')
    const percentages37 = screen.getAllByText('37%')
    expect(percentages63.length).toBeGreaterThan(0)
    expect(percentages37.length).toBeGreaterThan(0)
    
    // Check specific text patterns instead of just numbers
    expect(screen.getByText('unique participants')).toBeInTheDocument()
    expect(screen.getByText('total tokens committed')).toBeInTheDocument()
  })

  it('displays market activity with token focus', () => {
    render(<MarketStatistics market={mockMarket} />)
    
    // Check Market Activity section
    expect(screen.getByText('Market Activity')).toBeInTheDocument()
    
    // Check that it shows unique participants summary
    expect(screen.getByText(/unique participants/)).toBeInTheDocument()
    expect(screen.getByText(/total tokens committed/)).toBeInTheDocument()
  })

  it('shows market insights with real data', () => {
    render(<MarketStatistics market={mockMarket} />)
    
    // Check Market Insights section
    expect(screen.getByText('Market Insights')).toBeInTheDocument()
    
    // Check leading option is shown
    expect(screen.getByText('Leading option:')).toBeInTheDocument()
    
    // Check total committed and participants
    expect(screen.getByText('Total committed:')).toBeInTheDocument()
    expect(screen.getByText('Participants:')).toBeInTheDocument()
  })

  it('handles markets with zero tokens gracefully', () => {
    const emptyMarket: Market = {
      ...mockMarket,
      totalTokens: 0,
      participants: 0,
      options: [
        {
          id: 'yes',
          name: 'Yes',
          tokens: 0,
          percentage: 0,
          color: 'bg-green-500'
        },
        {
          id: 'no',
          name: 'No',
          tokens: 0,
          percentage: 0,
          color: 'bg-red-500'
        }
      ]
    }

    render(<MarketStatistics market={emptyMarket} />)
    
    // Should still render without errors
    expect(screen.getByText('Market Statistics')).toBeInTheDocument()
    expect(screen.getByText('Token Distribution')).toBeInTheDocument()
  })

  it('handles markets with percentages but no token amounts', () => {
    render(<MarketStatistics market={mockMarketWithPercentageOnly} />)
    
    // Should calculate tokens from percentages
    expect(screen.getByText('Token Distribution')).toBeInTheDocument()
    expect(screen.getByText('700 tokens')).toBeInTheDocument() // 70% of 1000
    expect(screen.getByText('300 tokens')).toBeInTheDocument() // 30% of 1000
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
  })
})