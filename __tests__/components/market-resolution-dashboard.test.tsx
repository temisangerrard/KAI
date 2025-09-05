import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MarketResolutionDashboard } from '@/app/admin/components/market-resolution-dashboard'
import { ResolutionService } from '@/lib/services/resolution-service'
import { Market } from '@/lib/types/database'
// Mock Firebase Timestamp
const mockTimestamp = (date: Date) => ({
  toMillis: () => date.getTime(),
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: (date.getTime() % 1000) * 1000000
})

// Mock the ResolutionService
jest.mock('@/lib/services/resolution-service', () => ({
  ResolutionService: {
    getPendingResolutionMarkets: jest.fn()
  }
}))

// Mock the AdminResolutionActions component
jest.mock('@/app/admin/components/admin-resolution-actions', () => ({
  AdminResolutionActions: ({ market, onResolutionComplete }: any) => (
    <div data-testid="admin-resolution-actions">
      <h2>Resolving: {market.title}</h2>
      <button onClick={onResolutionComplete}>Complete Resolution</button>
    </div>
  )
}))

const mockMarkets: Market[] = [
  {
    id: 'market-1',
    title: 'Will Drake release an album in 2024?',
    description: 'Prediction about Drake\'s album release',
    category: 'music',
    status: 'pending_resolution',
    createdBy: 'user-1',
    createdAt: mockTimestamp(new Date('2024-01-01')) as any,
    endsAt: mockTimestamp(new Date('2024-12-31')) as any,
    tags: ['music', 'drake'],
    totalParticipants: 150,
    totalTokensStaked: 5000,
    featured: false,
    trending: false,
    options: [
      {
        id: 'yes',
        text: 'Yes',
        totalTokens: 3000,
        participantCount: 90
      },
      {
        id: 'no',
        text: 'No',
        totalTokens: 2000,
        participantCount: 60
      }
    ]
  },
  {
    id: 'market-2',
    title: 'Will Taylor Swift announce tour dates?',
    description: 'Prediction about Taylor Swift tour announcement',
    category: 'music',
    status: 'pending_resolution',
    createdBy: 'user-2',
    createdAt: mockTimestamp(new Date('2024-02-01')) as any,
    endsAt: mockTimestamp(new Date('2024-11-30')) as any,
    tags: ['music', 'taylor-swift'],
    totalParticipants: 200,
    totalTokensStaked: 8000,
    featured: true,
    trending: false,
    options: [
      {
        id: 'yes',
        text: 'Yes',
        totalTokens: 5000,
        participantCount: 120
      },
      {
        id: 'no',
        text: 'No',
        totalTokens: 3000,
        participantCount: 80
      }
    ]
  }
]

describe('MarketResolutionDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders dashboard header and stats', async () => {
    ;(ResolutionService.getPendingResolutionMarkets as jest.Mock).mockResolvedValue(mockMarkets)

    render(<MarketResolutionDashboard />)

    expect(screen.getByText('Market Resolution')).toBeInTheDocument()
    expect(screen.getByText('Resolve markets that have ended and distribute payouts to winners')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument() // Pending Resolution count
      expect(screen.getByText('350')).toBeInTheDocument() // Total Participants
      expect(screen.getByText('13,000')).toBeInTheDocument() // Total Tokens
    })
  })

  it('displays pending markets list', async () => {
    ;(ResolutionService.getPendingResolutionMarkets as jest.Mock).mockResolvedValue(mockMarkets)

    render(<MarketResolutionDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Will Drake release an album in 2024?')).toBeInTheDocument()
      expect(screen.getByText('Will Taylor Swift announce tour dates?')).toBeInTheDocument()
      expect(screen.getByText('150 participants')).toBeInTheDocument()
      expect(screen.getByText('5,000 tokens')).toBeInTheDocument()
    })
  })

  it('filters markets by search term', async () => {
    ;(ResolutionService.getPendingResolutionMarkets as jest.Mock).mockResolvedValue(mockMarkets)

    render(<MarketResolutionDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Will Drake release an album in 2024?')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search markets...')
    fireEvent.change(searchInput, { target: { value: 'Drake' } })

    await waitFor(() => {
      expect(screen.getByText('Will Drake release an album in 2024?')).toBeInTheDocument()
      expect(screen.queryByText('Will Taylor Swift announce tour dates?')).not.toBeInTheDocument()
    })
  })

  it('filters markets by category', async () => {
    ;(ResolutionService.getPendingResolutionMarkets as jest.Mock).mockResolvedValue([
      ...mockMarkets,
      {
        ...mockMarkets[0],
        id: 'market-3',
        title: 'Sports prediction',
        category: 'sports'
      }
    ])

    render(<MarketResolutionDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Will Drake release an album in 2024?')).toBeInTheDocument()
    })

    // Open category filter and select sports
    const categorySelect = screen.getByDisplayValue('All Categories')
    fireEvent.click(categorySelect)
    
    const sportsOption = screen.getByText('Sports')
    fireEvent.click(sportsOption)

    await waitFor(() => {
      expect(screen.queryByText('Will Drake release an album in 2024?')).not.toBeInTheDocument()
      expect(screen.getByText('Sports prediction')).toBeInTheDocument()
    })
  })

  it('opens resolution form when resolve button is clicked', async () => {
    ;(ResolutionService.getPendingResolutionMarkets as jest.Mock).mockResolvedValue(mockMarkets)

    render(<MarketResolutionDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Will Drake release an album in 2024?')).toBeInTheDocument()
    })

    const resolveButtons = screen.getAllByText('Resolve Market')
    fireEvent.click(resolveButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('admin-resolution-actions')).toBeInTheDocument()
      expect(screen.getByText('Resolving: Will Drake release an album in 2024?')).toBeInTheDocument()
    })
  })

  it('returns to dashboard after resolution completion', async () => {
    ;(ResolutionService.getPendingResolutionMarkets as jest.Mock).mockResolvedValue(mockMarkets)

    render(<MarketResolutionDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Will Drake release an album in 2024?')).toBeInTheDocument()
    })

    // Open resolution form
    const resolveButtons = screen.getAllByText('Resolve Market')
    fireEvent.click(resolveButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('admin-resolution-actions')).toBeInTheDocument()
    })

    // Complete resolution
    const completeButton = screen.getByText('Complete Resolution')
    fireEvent.click(completeButton)

    await waitFor(() => {
      expect(screen.queryByTestId('admin-resolution-actions')).not.toBeInTheDocument()
      expect(screen.getByText('Market Resolution')).toBeInTheDocument()
    })
  })

  it('displays loading state', () => {
    ;(ResolutionService.getPendingResolutionMarkets as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<MarketResolutionDashboard />)

    expect(screen.getByText('Loading pending markets...')).toBeInTheDocument()
  })

  it('displays error state', async () => {
    ;(ResolutionService.getPendingResolutionMarkets as jest.Mock).mockRejectedValue(
      new Error('Failed to load markets')
    )

    render(<MarketResolutionDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load pending markets')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  it('displays empty state when no markets need resolution', async () => {
    ;(ResolutionService.getPendingResolutionMarkets as jest.Mock).mockResolvedValue([])

    render(<MarketResolutionDashboard />)

    await waitFor(() => {
      expect(screen.getByText('No markets need resolution')).toBeInTheDocument()
      expect(screen.getByText('All markets are up to date!')).toBeInTheDocument()
    })
  })

  it('refreshes markets when refresh button is clicked', async () => {
    ;(ResolutionService.getPendingResolutionMarkets as jest.Mock).mockResolvedValue(mockMarkets)

    render(<MarketResolutionDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Will Drake release an album in 2024?')).toBeInTheDocument()
    })

    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    expect(ResolutionService.getPendingResolutionMarkets).toHaveBeenCalledTimes(2)
  })

  it('sorts markets by different criteria', async () => {
    const marketsWithDifferentDates = [
      {
        ...mockMarkets[0],
        endsAt: mockTimestamp(new Date('2024-12-01')) as any,
        totalParticipants: 100,
        totalTokensStaked: 3000
      },
      {
        ...mockMarkets[1],
        endsAt: mockTimestamp(new Date('2024-11-01')) as any,
        totalParticipants: 200,
        totalTokensStaked: 5000
      }
    ]

    ;(ResolutionService.getPendingResolutionMarkets as jest.Mock).mockResolvedValue(marketsWithDifferentDates)

    render(<MarketResolutionDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Will Taylor Swift announce tour dates?')).toBeInTheDocument()
    })

    // Test sorting by participants
    const sortSelect = screen.getByDisplayValue('End Date')
    fireEvent.click(sortSelect)
    
    const participantsOption = screen.getByText('Participants')
    fireEvent.click(participantsOption)

    // Markets should now be sorted by participants (descending)
    const marketTitles = screen.getAllByText(/Will (Drake|Taylor Swift)/)
    expect(marketTitles[0]).toHaveTextContent('Taylor Swift') // 200 participants
    expect(marketTitles[1]).toHaveTextContent('Drake') // 100 participants
  })

  it('calculates days overdue correctly', async () => {
    const overdueMarket = {
      ...mockMarkets[0],
      endsAt: mockTimestamp(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)) as any // 5 days ago
    }

    ;(ResolutionService.getPendingResolutionMarkets as jest.Mock).mockResolvedValue([overdueMarket])

    render(<MarketResolutionDashboard />)

    await waitFor(() => {
      expect(screen.getByText('5 days overdue')).toBeInTheDocument()
    })
  })
})