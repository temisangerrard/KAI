import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShareModal } from '@/app/components/share-modal'
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
  title: 'Will Taylor Swift release a new album in 2024?',
  description: 'Predicting whether Taylor Swift will release a new studio album this year',
  category: 'entertainment' as any,
  status: 'active' as any,
  createdBy: 'user-123',
  createdAt: new Date() as any,
  endsAt: new Date() as any,
  tags: ['music', 'taylor-swift'],
  totalParticipants: 150,
  totalTokensStaked: 2500,
  featured: false,
  trending: true,
  options: [
    {
      id: 'yes',
      text: 'Yes',
      totalTokens: 1500,
      participantCount: 90
    },
    {
      id: 'no',
      text: 'No',
      totalTokens: 1000,
      participantCount: 60
    }
  ]
}

describe('Market Sharing Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('generates correct shareable URL for market', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        market={mockMarket}
      />
    )

    // Check that the share text contains the correct URL format
    expect(screen.getByText(/http:\/\/localhost\/markets\/market-123/)).toBeInTheDocument()
  })

  it('creates correct share text format', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        market={mockMarket}
      />
    )

    // Check for the required share text format
    const shareText = screen.getByText(/Check out this prediction market: Will Taylor Swift release a new album in 2024\? - http:\/\/localhost\/markets\/market-123/)
    expect(shareText).toBeInTheDocument()
  })

  it('generates hashtags based on market category', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        market={mockMarket}
      />
    )

    // Check for entertainment category hashtags
    expect(screen.getByText('#Entertainment')).toBeInTheDocument()
    expect(screen.getByText('#Predictions')).toBeInTheDocument()
    expect(screen.getByText('#KAI')).toBeInTheDocument()
  })

  it('handles Twitter sharing with hashtags', async () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        market={mockMarket}
      />
    )

    const twitterButton = screen.getByText('Share on Twitter')
    fireEvent.click(twitterButton)

    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://twitter.com/intent/tweet?text='),
        '_blank',
        'width=600,height=400'
      )
    })

    // Check that the URL contains hashtags and localhost URL
    const calledUrl = mockWindowOpen.mock.calls[0][0]
    expect(calledUrl).toContain('http%3A%2F%2Flocalhost%2Fmarkets%2Fmarket-123')
    expect(calledUrl).toContain('%23Entertainment')
    expect(calledUrl).toContain('%23Predictions')
    expect(calledUrl).toContain('%23KAI')
  })

  it('handles Facebook sharing with quote parameter', async () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        market={mockMarket}
      />
    )

    const facebookButton = screen.getByText('Share on Facebook')
    fireEvent.click(facebookButton)

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

  it('handles LinkedIn sharing', async () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        market={mockMarket}
      />
    )

    const linkedinButton = screen.getByText('Share on LinkedIn')
    fireEvent.click(linkedinButton)

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

  it('copies share text to clipboard', async () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        market={mockMarket}
      />
    )

    const copyButton = screen.getByText('Copy Link')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'Check out this prediction market: Will Taylor Swift release a new album in 2024? - http://localhost/markets/market-123'
      )
    })

    // Check that the button text changes to indicate success
    await waitFor(() => {
      expect(screen.getByText('Link Copied!')).toBeInTheDocument()
    })
  })

  it('generates different hashtags for different categories', () => {
    const sportsMarket = { ...mockMarket, category: 'sports' as any }
    
    const { rerender } = render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        market={sportsMarket}
      />
    )

    expect(screen.getByText('#Sports')).toBeInTheDocument()
    expect(screen.getByText('#Predictions')).toBeInTheDocument()
    expect(screen.getByText('#KAI')).toBeInTheDocument()

    const techMarket = { ...mockMarket, category: 'technology' as any }
    rerender(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        market={techMarket}
      />
    )

    expect(screen.getByText('#Tech')).toBeInTheDocument()
    expect(screen.getByText('#Technology')).toBeInTheDocument()
  })

  it('displays share text preview in modal', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        market={mockMarket}
      />
    )

    expect(screen.getByText('Share text:')).toBeInTheDocument()
    expect(screen.getByText(/Check out this prediction market: Will Taylor Swift release a new album in 2024\?/)).toBeInTheDocument()
  })
})