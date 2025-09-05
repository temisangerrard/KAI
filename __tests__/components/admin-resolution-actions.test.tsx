import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminResolutionActions } from '@/app/admin/components/admin-resolution-actions'
import { Market } from '@/lib/types/database'

// Mock Firebase Timestamp
const mockTimestamp = (date: Date) => ({
  toMillis: () => date.getTime(),
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: (date.getTime() % 1000) * 1000000
})

// Mock the MarketResolutionForm component
jest.mock('@/app/admin/components/market-resolution-form', () => ({
  MarketResolutionForm: ({ market, onComplete, onCancel }: any) => (
    <div data-testid="market-resolution-form">
      <h2>Resolution Form for: {market.title}</h2>
      <button onClick={onComplete}>Complete Resolution</button>
      <button onClick={onCancel}>Cancel Resolution</button>
    </div>
  )
}))

const mockPendingMarket: Market = {
  id: 'market-1',
  title: 'Will Drake release an album in 2024?',
  description: 'Prediction about Drake\'s album release',
  category: 'music',
  status: 'pending_resolution',
  createdBy: 'creator-1',
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
}

const mockResolvingMarket: Market = {
  ...mockPendingMarket,
  status: 'resolving'
}

const mockResolvedMarket: Market = {
  ...mockPendingMarket,
  status: 'resolved',
  resolvedAt: mockTimestamp(new Date('2025-01-01')) as any,
  resolution: {
    id: 'resolution-1',
    marketId: 'market-1',
    winningOptionId: 'yes',
    resolvedBy: 'admin-1',
    resolvedAt: mockTimestamp(new Date('2025-01-01')) as any,
    evidence: [],
    totalPayout: 4500,
    winnerCount: 90,
    status: 'completed',
    creatorFeeAmount: 100,
    houseFeeAmount: 250
  },
  options: [
    {
      id: 'yes',
      text: 'Yes',
      totalTokens: 3000,
      participantCount: 90,
      isCorrect: true
    },
    {
      id: 'no',
      text: 'No',
      totalTokens: 2000,
      participantCount: 60,
      isCorrect: false
    }
  ]
}

describe('AdminResolutionActions', () => {
  const mockOnResolutionComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders market status for pending resolution', () => {
    render(
      <AdminResolutionActions
        market={mockPendingMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('Needs Resolution')).toBeInTheDocument()
    expect(screen.getByText('Market has ended and requires admin resolution')).toBeInTheDocument()
    expect(screen.getByText('Start Resolution')).toBeInTheDocument()
  })

  it('renders market status for resolving market', () => {
    render(
      <AdminResolutionActions
        market={mockResolvingMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('Resolving')).toBeInTheDocument()
    expect(screen.getByText('Resolution is currently in progress')).toBeInTheDocument()
    expect(screen.queryByText('Start Resolution')).not.toBeInTheDocument()
  })

  it('renders market status for resolved market', () => {
    render(
      <AdminResolutionActions
        market={mockResolvedMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.getByText('Market has been resolved and payouts distributed')).toBeInTheDocument()
    expect(screen.queryByText('Start Resolution')).not.toBeInTheDocument()
  })

  it('displays market summary statistics', () => {
    render(
      <AdminResolutionActions
        market={mockPendingMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('Participants')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()

    expect(screen.getByText('Total Staked')).toBeInTheDocument()
    expect(screen.getByText('5,000 tokens')).toBeInTheDocument()

    expect(screen.getByText('Ended')).toBeInTheDocument()
    expect(screen.getByText('Dec 31, 2024')).toBeInTheDocument()
  })

  it('displays market options', () => {
    render(
      <AdminResolutionActions
        market={mockPendingMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('Market Options')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('90 participants • 3,000 tokens')).toBeInTheDocument()
    expect(screen.getByText('60 participants • 2,000 tokens')).toBeInTheDocument()
  })

  it('shows winner badge for resolved market', () => {
    render(
      <AdminResolutionActions
        market={mockResolvedMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('Winner')).toBeInTheDocument()
  })

  it('displays resolution details for resolved market', () => {
    render(
      <AdminResolutionActions
        market={mockResolvedMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('Resolution Details')).toBeInTheDocument()
    expect(screen.getByText('Market Resolved')).toBeInTheDocument()
    expect(screen.getByText('Resolved on 1/1/2025')).toBeInTheDocument()
    expect(screen.getByText('Winners: 90')).toBeInTheDocument()
    expect(screen.getByText('Total Payout: 4,500 tokens')).toBeInTheDocument()
    expect(screen.getByText('Creator Fee: 100 tokens')).toBeInTheDocument()
    expect(screen.getByText('House Fee: 250 tokens')).toBeInTheDocument()
  })

  it('opens resolution form when start resolution is clicked', async () => {
    render(
      <AdminResolutionActions
        market={mockPendingMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    const startButton = screen.getByText('Start Resolution')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByTestId('market-resolution-form')).toBeInTheDocument()
      expect(screen.getByText('Resolution Form for: Will Drake release an album in 2024?')).toBeInTheDocument()
    })
  })

  it('returns to main view after resolution completion', async () => {
    render(
      <AdminResolutionActions
        market={mockPendingMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    // Open resolution form
    const startButton = screen.getByText('Start Resolution')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByTestId('market-resolution-form')).toBeInTheDocument()
    })

    // Complete resolution
    const completeButton = screen.getByText('Complete Resolution')
    fireEvent.click(completeButton)

    await waitFor(() => {
      expect(screen.queryByTestId('market-resolution-form')).not.toBeInTheDocument()
      expect(screen.getByText('Needs Resolution')).toBeInTheDocument()
      expect(mockOnResolutionComplete).toHaveBeenCalled()
    })
  })

  it('returns to main view when resolution is cancelled', async () => {
    render(
      <AdminResolutionActions
        market={mockPendingMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    // Open resolution form
    const startButton = screen.getByText('Start Resolution')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByTestId('market-resolution-form')).toBeInTheDocument()
    })

    // Cancel resolution
    const cancelButton = screen.getByText('Cancel Resolution')
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByTestId('market-resolution-form')).not.toBeInTheDocument()
      expect(screen.getByText('Needs Resolution')).toBeInTheDocument()
    })
  })

  it('displays action buttons', () => {
    render(
      <AdminResolutionActions
        market={mockPendingMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('View Details')).toBeInTheDocument()
  })

  it('displays evidence button for resolved market', () => {
    render(
      <AdminResolutionActions
        market={mockResolvedMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('View Details')).toBeInTheDocument()
    expect(screen.getByText('View Evidence')).toBeInTheDocument()
  })

  it('handles market without resolution details gracefully', () => {
    const marketWithoutResolution = {
      ...mockResolvedMarket,
      resolution: undefined
    }

    render(
      <AdminResolutionActions
        market={marketWithoutResolution}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.queryByText('Resolution Details')).not.toBeInTheDocument()
  })

  it('handles market with missing end date', () => {
    const marketWithoutEndDate = {
      ...mockPendingMarket,
      endsAt: undefined as any
    }

    render(
      <AdminResolutionActions
        market={marketWithoutEndDate}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('formats token amounts with commas', () => {
    const marketWithLargeAmounts = {
      ...mockPendingMarket,
      totalTokensStaked: 1234567,
      options: [
        {
          id: 'yes',
          text: 'Yes',
          totalTokens: 987654,
          participantCount: 500
        },
        {
          id: 'no',
          text: 'No',
          totalTokens: 246913,
          participantCount: 300
        }
      ]
    }

    render(
      <AdminResolutionActions
        market={marketWithLargeAmounts}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('1,234,567 tokens')).toBeInTheDocument()
    expect(screen.getByText('500 participants • 987,654 tokens')).toBeInTheDocument()
    expect(screen.getByText('300 participants • 246,913 tokens')).toBeInTheDocument()
  })

  it('handles different market statuses correctly', () => {
    const draftMarket = { ...mockPendingMarket, status: 'draft' as const }

    render(
      <AdminResolutionActions
        market={draftMarket}
        onResolutionComplete={mockOnResolutionComplete}
      />
    )

    expect(screen.getByText('draft')).toBeInTheDocument()
    expect(screen.getByText('Market status')).toBeInTheDocument()
  })
})