import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { UserResolutionForm } from '@/app/components/user-resolution-form'
import { useAuth } from '@/app/auth/auth-context'

// Mock the auth context
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: jest.fn()
}))

// Mock fetch globally
global.fetch = jest.fn()

const mockMarket = {
  id: 'test-market-1',
  title: 'Will Drake release an album in 2024?',
  description: 'Prediction about Drake releasing new music',
  category: 'entertainment' as any,
  status: 'pending_resolution' as any,
  createdBy: 'user-123',
  createdAt: new Date('2024-01-01') as any,
  endsAt: new Date('2024-01-15') as any,
  tags: ['music', 'drake'],
  totalParticipants: 100,
  totalTokensStaked: 5000,
  featured: false,
  trending: false,
  options: [
    {
      id: 'yes',
      text: 'Yes, he will release an album',
      totalTokens: 3000,
      participantCount: 60
    },
    {
      id: 'no',
      text: 'No, he will not release an album',
      totalTokens: 2000,
      participantCount: 40
    }
  ]
}

const mockResolution = {
  id: 'resolution-1',
  marketId: 'test-market-1',
  winningOptionId: 'yes',
  resolvedBy: 'admin-1',
  resolvedAt: new Date('2024-01-16'),
  evidence: [
    {
      id: 'evidence-1',
      type: 'url' as const,
      content: 'https://example.com/album-announcement',
      description: 'Official album announcement',
      uploadedAt: new Date('2024-01-16')
    }
  ],
  totalPayout: 4500,
  winnerCount: 60,
  status: 'completed' as const
}

const mockUserPayout = {
  id: 'payout-1',
  resolutionId: 'resolution-1',
  userId: 'test-user',
  optionId: 'yes',
  tokensStaked: 100,
  payoutAmount: 150,
  profit: 50,
  processedAt: new Date('2024-01-16'),
  status: 'completed' as const
}

describe('UserResolutionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  it('renders pending resolution status correctly', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' }
    })

    render(<UserResolutionForm market={mockMarket} />)

    expect(screen.getByText('Awaiting Resolution')).toBeInTheDocument()
    expect(screen.getByText(/This market has ended and is awaiting admin resolution/)).toBeInTheDocument()
  })

  it('renders resolving status correctly', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' }
    })

    const resolvingMarket = { ...mockMarket, status: 'resolving' as any }
    render(<UserResolutionForm market={resolvingMarket} />)

    expect(screen.getByText('Resolution in Progress')).toBeInTheDocument()
    expect(screen.getByText(/An administrator is currently reviewing evidence/)).toBeInTheDocument()
  })

  it('fetches and displays resolution data for resolved market', async () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' }
    })

    // Mock API responses
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResolution)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ winnerPayouts: [mockUserPayout], creatorPayouts: [] })
      })

    const resolvedMarket = { 
      ...mockMarket, 
      status: 'resolved' as any,
      resolution: mockResolution
    }

    render(<UserResolutionForm market={resolvedMarket} />)

    await waitFor(() => {
      expect(screen.getByText('Market Resolved')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Winning Outcome')).toBeInTheDocument()
      expect(screen.getByText('Yes, he will release an album')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Your Result')).toBeInTheDocument()
      expect(screen.getByText('Congratulations! You won!')).toBeInTheDocument()
    })
  })

  it('displays evidence correctly', async () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' }
    })

    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResolution)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ winnerPayouts: [mockUserPayout], creatorPayouts: [] })
      })

    const resolvedMarket = { 
      ...mockMarket, 
      status: 'resolved' as any,
      resolution: mockResolution
    }

    render(<UserResolutionForm market={resolvedMarket} />)

    await waitFor(() => {
      expect(screen.getByText('Resolution Evidence')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('https://example.com/album-announcement')).toBeInTheDocument()
      expect(screen.getByText('Official album announcement')).toBeInTheDocument()
    })
  })

  it('shows no payout message for non-winning users', async () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'different-user', email: 'different@example.com' }
    })

    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResolution)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ winnerPayouts: [], creatorPayouts: [] })
      })

    const resolvedMarket = { 
      ...mockMarket, 
      status: 'resolved' as any,
      resolution: mockResolution
    }

    render(<UserResolutionForm market={resolvedMarket} />)

    await waitFor(() => {
      expect(screen.getByText('Your Result')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(/You did not win this market, or you did not participate/)).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' }
    })

    ;(fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

    const resolvedMarket = { 
      ...mockMarket, 
      status: 'resolved' as any,
      resolution: mockResolution
    }

    render(<UserResolutionForm market={resolvedMarket} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load resolution details')).toBeInTheDocument()
    })
  })

  it('does not render for active markets', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' }
    })

    const activeMarket = { ...mockMarket, status: 'active' as any }
    const { container } = render(<UserResolutionForm market={activeMarket} />)

    expect(container.firstChild).toBeNull()
  })

  it('calls onClose when close button is clicked', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' }
    })

    const mockOnClose = jest.fn()
    render(<UserResolutionForm market={mockMarket} onClose={mockOnClose} />)

    const closeButton = screen.getByText('×')
    closeButton.click()

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('displays market summary information', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' }
    })

    render(<UserResolutionForm market={mockMarket} />)

    expect(screen.getByText(mockMarket.title)).toBeInTheDocument()
    expect(screen.getByText('100 participants')).toBeInTheDocument()
  })
})