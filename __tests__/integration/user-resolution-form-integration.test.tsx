import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MarketDetailView } from '@/app/markets/[id]/market-detail-view'
import { useAuth } from '@/app/auth/auth-context'
import { useTokenBalance } from '@/hooks/use-token-balance'

// Mock dependencies
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: jest.fn()
}))

jest.mock('@/hooks/use-token-balance', () => ({
  useTokenBalance: jest.fn()
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn()
  })
}))

// Mock fetch globally
global.fetch = jest.fn()

const mockMarket = {
  id: 'test-market-1',
  title: 'Will Drake release an album in 2024?',
  description: 'Prediction about Drake releasing new music',
  category: 'entertainment',
  status: 'pending_resolution',
  createdBy: 'user-123',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-15'),
  totalTokens: 5000,
  participants: 100,
  tags: ['music', 'drake'],
  options: [
    {
      id: 'yes',
      name: 'Yes, he will release an album',
      color: 'bg-green-500',
      tokens: 3000,
      percentage: 60,
      participantCount: 60
    },
    {
      id: 'no',
      name: 'No, he will not release an album',
      color: 'bg-red-500',
      tokens: 2000,
      percentage: 40,
      participantCount: 40
    }
  ]
}

describe('User Resolution Form Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
    
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' }
    })
    
    ;(useTokenBalance as jest.Mock).mockReturnValue({
      availableTokens: 1000,
      refreshBalance: jest.fn()
    })

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    })
  })

  it('shows resolution status and view details button for pending resolution market', () => {
    render(<MarketDetailView market={mockMarket} />)

    expect(screen.getByText('Awaiting Resolution')).toBeInTheDocument()
    expect(screen.getByText('View Details')).toBeInTheDocument()
  })

  it('opens resolution form modal when view details button is clicked', async () => {
    render(<MarketDetailView market={mockMarket} />)

    const viewDetailsButton = screen.getByText('View Details')
    fireEvent.click(viewDetailsButton)

    await waitFor(() => {
      expect(screen.getByText('Market Resolution')).toBeInTheDocument()
    })

    // Should show the resolution form content
    expect(screen.getByText(/This market has ended and is awaiting admin resolution/)).toBeInTheDocument()
  })

  it('closes resolution form modal when close button is clicked', async () => {
    render(<MarketDetailView market={mockMarket} />)

    // Open the modal
    const viewDetailsButton = screen.getByText('View Details')
    fireEvent.click(viewDetailsButton)

    await waitFor(() => {
      expect(screen.getByText('Market Resolution')).toBeInTheDocument()
    })

    // Close the modal
    const closeButton = screen.getByText('×')
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('Market Resolution')).not.toBeInTheDocument()
    })
  })

  it('auto-shows resolution form for ended markets on first visit', () => {
    // Mock sessionStorage to return null (first visit)
    ;(window.sessionStorage.getItem as jest.Mock).mockReturnValue(null)

    render(<MarketDetailView market={mockMarket} />)

    // Should automatically show the resolution form
    expect(screen.getByText('Market Resolution')).toBeInTheDocument()
    
    // Should set the session storage flag
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      `resolution-shown-${mockMarket.id}`,
      'true'
    )
  })

  it('does not auto-show resolution form if already shown in session', () => {
    // Mock sessionStorage to return 'true' (already shown)
    ;(window.sessionStorage.getItem as jest.Mock).mockReturnValue('true')

    render(<MarketDetailView market={mockMarket} />)

    // Should not automatically show the resolution form
    expect(screen.queryByText('Market Resolution')).not.toBeInTheDocument()
    
    // But should still show the view details button
    expect(screen.getByText('View Details')).toBeInTheDocument()
  })

  it('shows different status for resolved market', () => {
    const resolvedMarket = {
      ...mockMarket,
      status: 'resolved'
    }

    render(<MarketDetailView market={resolvedMarket} />)

    expect(screen.getByText('Market Resolved')).toBeInTheDocument()
    expect(screen.getByText('View Details')).toBeInTheDocument()
  })

  it('shows different status for resolving market', () => {
    const resolvingMarket = {
      ...mockMarket,
      status: 'resolving'
    }

    render(<MarketDetailView market={resolvingMarket} />)

    expect(screen.getByText('Resolution in Progress')).toBeInTheDocument()
    expect(screen.getByText('View Details')).toBeInTheDocument()
  })

  it('does not show resolution status for active markets', () => {
    const activeMarket = {
      ...mockMarket,
      status: 'active',
      endDate: new Date(Date.now() + 86400000) // Tomorrow
    }

    render(<MarketDetailView market={activeMarket} />)

    expect(screen.queryByText('Awaiting Resolution')).not.toBeInTheDocument()
    expect(screen.queryByText('Market Resolved')).not.toBeInTheDocument()
    expect(screen.queryByText('Resolution in Progress')).not.toBeInTheDocument()
    expect(screen.queryByText('View Details')).not.toBeInTheDocument()
  })
})