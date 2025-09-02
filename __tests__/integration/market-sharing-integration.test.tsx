import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MarketCard } from '@/app/components/market-card'
import { Market } from '@/lib/types/database'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
})

// Mock window.open
const mockWindowOpen = jest.fn()
Object.assign(window, { open: mockWindowOpen })

const mockMarket: Market = {
  id: 'market-123',
  title: 'Will the next iPhone have a foldable screen?',
  description: 'Predicting whether Apple will release a foldable iPhone in the next product cycle',
  category: 'technology' as any,
  status: 'active' as any,
  createdBy: 'user-123',
  createdAt: new Date() as any,
  endsAt: new Date() as any,
  tags: ['apple', 'iphone', 'technology'],
  totalParticipants: 250,
  totalTokensStaked: 5000,
  featured: true,
  trending: false,
  options: [
    {
      id: 'yes',
      text: 'Yes',
      totalTokens: 3000,
      participantCount: 150
    },
    {
      id: 'no',
      text: 'No',
      totalTokens: 2000,
      participantCount: 100
    }
  ]
}

describe('Market Sharing Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('allows sharing market from market card', async () => {
    render(<MarketCard market={mockMarket} />)

    // Find and click the share button (it's the second button with the share icon)
    const buttons = screen.getAllByRole('button')
    const shareButton = buttons.find(button => button.querySelector('svg.lucide-share2'))
    expect(shareButton).toBeDefined()
    fireEvent.click(shareButton!)

    // Verify share modal opens
    await waitFor(() => {
      expect(screen.getByText('Share Market')).toBeInTheDocument()
    })

    // Verify market information is displayed in the modal
    expect(screen.getAllByText('Will the next iPhone have a foldable screen?')).toHaveLength(2) // One in card, one in modal
    expect(screen.getAllByText(/Predicting whether Apple will release a foldable iPhone/)).toHaveLength(2) // One in card, one in modal

    // Verify share text is generated correctly
    expect(screen.getByText(/Check out this prediction market: Will the next iPhone have a foldable screen\?/)).toBeInTheDocument()

    // Verify technology category hashtags are shown
    expect(screen.getByText('#Tech')).toBeInTheDocument()
    expect(screen.getByText('#Technology')).toBeInTheDocument()
    expect(screen.getByText('#Predictions')).toBeInTheDocument()
    expect(screen.getByText('#KAI')).toBeInTheDocument()
  })

  it('shares market on Twitter with correct URL and hashtags', async () => {
    render(<MarketCard market={mockMarket} />)

    // Open share modal
    const buttons = screen.getAllByRole('button')
    const shareButton = buttons.find(button => button.querySelector('svg.lucide-share2'))
    expect(shareButton).toBeDefined()
    fireEvent.click(shareButton!)

    await waitFor(() => {
      expect(screen.getByText('Share Market')).toBeInTheDocument()
    })

    // Click Twitter share button
    const twitterButton = screen.getByText('Share on Twitter')
    fireEvent.click(twitterButton)

    // Verify Twitter URL was opened with correct parameters
    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://twitter.com/intent/tweet?text='),
        '_blank',
        'width=600,height=400'
      )
    })

    const calledUrl = mockWindowOpen.mock.calls[0][0]
    expect(calledUrl).toContain('http%3A%2F%2Flocalhost%2Fmarkets%2Fmarket-123')
    expect(calledUrl).toContain('%23Tech')
    expect(calledUrl).toContain('%23Technology')
    expect(calledUrl).toContain('%23Predictions')
    expect(calledUrl).toContain('%23KAI')
  })

  it('copies market share text to clipboard', async () => {
    render(<MarketCard market={mockMarket} />)

    // Open share modal
    const buttons = screen.getAllByRole('button')
    const shareButton = buttons.find(button => button.querySelector('svg.lucide-share2'))
    expect(shareButton).toBeDefined()
    fireEvent.click(shareButton!)

    await waitFor(() => {
      expect(screen.getByText('Share Market')).toBeInTheDocument()
    })

    // Click copy link button
    const copyButton = screen.getByText('Copy Link')
    fireEvent.click(copyButton)

    // Verify clipboard was called with correct text
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'Check out this prediction market: Will the next iPhone have a foldable screen? - http://localhost/markets/market-123'
      )
    })

    // Verify success feedback
    await waitFor(() => {
      expect(screen.getByText('Link Copied!')).toBeInTheDocument()
    })
  })

  it('generates different hashtags for different market categories', async () => {
    const sportsMarket = { ...mockMarket, category: 'sports' as any }
    
    render(<MarketCard market={sportsMarket} />)

    const buttons = screen.getAllByRole('button')
    const shareButton = buttons.find(button => button.querySelector('svg.lucide-share2'))
    expect(shareButton).toBeDefined()
    fireEvent.click(shareButton!)

    await waitFor(() => {
      expect(screen.getByText('Share Market')).toBeInTheDocument()
    })

    // Verify sports category hashtags
    expect(screen.getByText('#Sports')).toBeInTheDocument()
    expect(screen.getByText('#Predictions')).toBeInTheDocument()
    expect(screen.getByText('#KAI')).toBeInTheDocument()
  })

  it('shares market on Facebook with correct parameters', async () => {
    render(<MarketCard market={mockMarket} />)

    // Open share modal
    const buttons = screen.getAllByRole('button')
    const shareButton = buttons.find(button => button.querySelector('svg.lucide-share2'))
    expect(shareButton).toBeDefined()
    fireEvent.click(shareButton!)

    await waitFor(() => {
      expect(screen.getByText('Share Market')).toBeInTheDocument()
    })

    // Click Facebook share button
    const facebookButton = screen.getByText('Share on Facebook')
    fireEvent.click(facebookButton)

    // Verify Facebook URL was opened with correct parameters
    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://www.facebook.com/sharer/sharer.php'),
        '_blank',
        'width=600,height=400'
      )
    })

    const calledUrl = mockWindowOpen.mock.calls[0][0]
    expect(calledUrl).toContain('u=http%3A%2F%2Flocalhost%2Fmarkets%2Fmarket-123')
    expect(calledUrl).toContain('quote=Check%20out%20this%20prediction%20market')
  })

  it('shares market on LinkedIn with correct URL', async () => {
    render(<MarketCard market={mockMarket} />)

    // Open share modal
    const buttons = screen.getAllByRole('button')
    const shareButton = buttons.find(button => button.querySelector('svg.lucide-share2'))
    expect(shareButton).toBeDefined()
    fireEvent.click(shareButton!)

    await waitFor(() => {
      expect(screen.getByText('Share Market')).toBeInTheDocument()
    })

    // Click LinkedIn share button
    const linkedinButton = screen.getByText('Share on LinkedIn')
    fireEvent.click(linkedinButton)

    // Verify LinkedIn URL was opened with correct parameters
    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://www.linkedin.com/sharing/share-offsite'),
        '_blank',
        'width=600,height=400'
      )
    })

    const calledUrl = mockWindowOpen.mock.calls[0][0]
    expect(calledUrl).toContain('url=http%3A%2F%2Flocalhost%2Fmarkets%2Fmarket-123')
  })
})