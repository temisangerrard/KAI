import React from 'react'
import { render, screen } from '@testing-library/react'
import { MarketDetailView } from '@/app/markets/[id]/market-detail-view'
import { Market } from '@/lib/db/database'

// Mock the auth context
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' }
  })
}))

// Mock the token balance hook
jest.mock('@/hooks/use-token-balance', () => ({
  useTokenBalance: () => ({
    availableTokens: 1000,
    refreshBalance: jest.fn()
  })
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn()
  })
}))

// Mock market utils
jest.mock('@/lib/utils/market-utils', () => ({
  calculateOdds: jest.fn(() => ({
    yes: { odds: 2.5, percentage: 40, totalTokens: 7000, participantCount: 70 },
    no: { odds: 1.8, percentage: 56, totalTokens: 3000, participantCount: 30 }
  })),
  formatTokenAmount: jest.fn((amount) => amount.toLocaleString()),
  formatOdds: jest.fn((odds) => `${odds.toFixed(1)}:1`),
  getRealStats: jest.fn(() => ({
    averageCommitment: 100,
    mostPopularOption: { id: 'yes', text: 'Yes', totalTokens: 7000, participantCount: 70 },
    competitiveness: 60,
    totalParticipants: 100,
    totalTokens: 10000,
    participantDistribution: { 'yes': 70, 'no': 30 }
  }))
}))

const { calculateOdds: mockCalculateOdds } = require('@/lib/utils/market-utils') as { calculateOdds: jest.Mock }

const mockMarket: Market = {
  id: 'test-market',
  title: 'Test Market',
  description: 'Test market description',
  category: 'entertainment',
  status: 'active',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  participants: 100,
  totalTokens: 10000,
  tags: ['test'],
  options: [
    {
      id: 'yes',
      name: 'Yes',
      color: 'bg-green-500',
      tokens: 7000, // 70% - highly committed
      percentage: 70
    },
    {
      id: 'no', 
      name: 'No',
      color: 'bg-red-500',
      tokens: 3000, // 30% - moderate support
      percentage: 30
    }
  ]
}

describe('MarketDetailView - Commitment Display', () => {
  it('should display clear win percentages instead of confusing odds', () => {
    render(<MarketDetailView market={mockMarket} />)
    
    // Check that win percentages are displayed (calculated from odds)
    // 2.5 odds = 40% chance, 1.8 odds = 56% chance
    expect(screen.getByText('40%')).toBeInTheDocument() // Yes option
    expect(screen.getByText('56%')).toBeInTheDocument() // No option
    expect(screen.getAllByText('chance to win')).toHaveLength(2)
  })

  it('should show commitment data in plain English', () => {
    render(<MarketDetailView market={mockMarket} />)
    
    // Should show token amounts in natural language
    expect(screen.getByText('7,000 tokens committed')).toBeInTheDocument()
    expect(screen.getByText('3,000 tokens committed')).toBeInTheDocument()
  })

  it('should handle edge case with zero supporters', () => {
    const marketWithZeroTokens: Market = {
      ...mockMarket,
      options: [
        {
          id: 'yes',
          name: 'Yes',
          color: 'bg-green-500',
          tokens: 0,
          percentage: 0
        },
        {
          id: 'no',
          name: 'No',
          color: 'bg-red-500',
          tokens: 0,
          percentage: 0
        }
      ],
      totalTokens: 0,
      participants: 0
    }

    mockCalculateOdds.mockReturnValueOnce({
      yes: { odds: 2, percentage: 0, totalTokens: 0, participantCount: 0 },
      no: { odds: 2, percentage: 0, totalTokens: 0, participantCount: 0 }
    })

    render(<MarketDetailView market={marketWithZeroTokens} />)

    expect(screen.getAllByText('No tokens committed')).toHaveLength(2)
  })

  it('should show clear action buttons', () => {
    render(<MarketDetailView market={mockMarket} />)
    
    // Should have simple "Back This" buttons
    expect(screen.getAllByText('Back This')).toHaveLength(2)
  })

  it('should display progress bars for visual comparison', () => {
    render(<MarketDetailView market={mockMarket} />)
    
    // Progress bars should be present for visual comparison (there are other progress bars in the component)
    const progressBars = document.querySelectorAll('[role="progressbar"]')
    expect(progressBars.length).toBeGreaterThanOrEqual(2)
  })
})