import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShareModal } from '@/app/components/share-modal'
import { Market, Prediction } from '@/lib/types/database'

// Mock window.open
const mockWindowOpen = jest.fn()
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true
})

// Mock navigator.clipboard
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined)
}
Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true
})

// Mock window.location
delete (window as any).location
window.location = {
  origin: 'https://kai-platform.com'
} as any

const mockMarket: Market = {
  id: 'market-123',
  title: 'Will Taylor Swift release a new album in 2024?',
  description: 'Predict whether Taylor Swift will release a new studio album in 2024',
  category: 'entertainment' as any,
  status: 'active' as any,
  createdBy: 'user-123',
  createdAt: new Date() as any,
  endsAt: new Date() as any,
  tags: ['music', 'taylor-swift'],
  totalParticipants: 150,
  totalTokensStaked: 2500,
  featured: false,
  trending: false,
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

const mockPrediction: Prediction = {
  id: 'prediction-123',
  userId: 'user-123',
  marketId: 'market-123',
  optionId: 'yes',
  tokensStaked: 100,
  createdAt: new Date() as any
}

const mockCommitment = {
  prediction: mockPrediction,
  market: mockMarket,
  optionText: 'Yes'
}

describe('ShareModal - Commitment Sharing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('displays commitment sharing title and description', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        commitment={mockCommitment}
      />
    )

    expect(screen.getByText('Share Your Prediction')).toBeInTheDocument()
    expect(screen.getByText('Share your prediction with your friends and followers')).toBeInTheDocument()
  })

  it('displays commitment information in preview', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        commitment={mockCommitment}
      />
    )

    expect(screen.getByText('Will Taylor Swift release a new album in 2024?')).toBeInTheDocument()
    expect(screen.getByText('Your prediction: Yes with 100 KAI tokens')).toBeInTheDocument()
  })

  it('generates correct commitment share text', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        commitment={mockCommitment}
      />
    )

    const expectedText = 'I just backed Yes with 100 KAI tokens on Will Taylor Swift release a new album in 2024? - http://localhost/markets/market-123?ref=commitment'
    expect(screen.getByText(expectedText)).toBeInTheDocument()
  })

  it('copies commitment share text to clipboard', async () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        commitment={mockCommitment}
      />
    )

    const copyButton = screen.getByRole('button', { name: /copy link/i })
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        'I just backed Yes with 100 KAI tokens on Will Taylor Swift release a new album in 2024? - http://localhost/markets/market-123?ref=commitment'
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Link Copied!')).toBeInTheDocument()
    })
  })

  it('opens Twitter with commitment share text', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        commitment={mockCommitment}
      />
    )

    const twitterButton = screen.getByRole('button', { name: /share on twitter/i })
    fireEvent.click(twitterButton)

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining('https://twitter.com/intent/tweet?text='),
      '_blank',
      'width=600,height=400'
    )

    const callArgs = mockWindowOpen.mock.calls[0][0]
    expect(decodeURIComponent(callArgs)).toContain('I just backed Yes with 100 KAI tokens on Will Taylor Swift release a new album in 2024?')
    expect(decodeURIComponent(callArgs)).toContain('#Entertainment #Predictions #KAI')
  })

  it('falls back to market sharing when no commitment provided', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        market={mockMarket}
      />
    )

    expect(screen.getByText('Share Market')).toBeInTheDocument()
    expect(screen.getByText('Share this prediction market with your friends and followers')).toBeInTheDocument()
    
    const expectedText = 'Check out this prediction market: Will Taylor Swift release a new album in 2024? - http://localhost/markets/market-123'
    expect(screen.getByText(expectedText)).toBeInTheDocument()
  })

  it('does not render when neither market nor commitment provided', () => {
    const { container } = render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
      />
    )

    expect(container.firstChild).toBeNull()
  })
})