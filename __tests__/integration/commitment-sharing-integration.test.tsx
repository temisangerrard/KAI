import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShareButton } from '@/app/components/share-button'
import { ShareModal } from '@/app/components/share-modal'
import { Market, Prediction } from '@/lib/types/database'

// Mock window.open and clipboard
const mockWindowOpen = jest.fn()
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true
})

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
  origin: 'http://localhost'
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

describe('Commitment Sharing Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('completes full commitment sharing flow', () => {
    const TestComponent = () => {
      const [isModalOpen, setIsModalOpen] = React.useState(false)

      return (
        <div>
          <button onClick={() => setIsModalOpen(true)}>
            Open Share Modal
          </button>
          <ShareModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            commitment={mockCommitment}
          />
        </div>
      )
    }

    render(<TestComponent />)

    // Open the modal
    fireEvent.click(screen.getByText('Open Share Modal'))

    // Verify commitment sharing content
    expect(screen.getByText('Share Your Prediction')).toBeInTheDocument()
    expect(screen.getByText('Your prediction: Yes with 100 KAI tokens')).toBeInTheDocument()
    
    // Verify share text is generated correctly
    const expectedShareText = 'I just backed Yes with 100 KAI tokens on Will Taylor Swift release a new album in 2024? - http://localhost/markets/market-123?ref=commitment'
    expect(screen.getByText(expectedShareText)).toBeInTheDocument()

    // Test Twitter sharing
    const twitterButton = screen.getByRole('button', { name: /share on twitter/i })
    fireEvent.click(twitterButton)

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining('https://twitter.com/intent/tweet?text='),
      '_blank',
      'width=600,height=400'
    )

    // Verify the URL contains the commitment share text
    const twitterUrl = mockWindowOpen.mock.calls[0][0]
    expect(decodeURIComponent(twitterUrl)).toContain('I just backed Yes with 100 KAI tokens')
    expect(decodeURIComponent(twitterUrl)).toContain('#Entertainment #Predictions #KAI')

    // Test copy link functionality
    const copyButton = screen.getByRole('button', { name: /copy link/i })
    fireEvent.click(copyButton)

    expect(mockClipboard.writeText).toHaveBeenCalledWith(expectedShareText)
  })

  it('generates correct commitment share URL with ref parameter', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        commitment={mockCommitment}
      />
    )

    // Verify the share URL includes the ref parameter for tracking
    const shareText = screen.getByText(/I just backed Yes with 100 KAI tokens/)
    expect(shareText.textContent).toContain('?ref=commitment')
  })

  it('displays commitment-specific hashtags', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        commitment={mockCommitment}
      />
    )

    // Verify entertainment category hashtags are displayed
    expect(screen.getByText('#Entertainment')).toBeInTheDocument()
    expect(screen.getByText('#Predictions')).toBeInTheDocument()
    expect(screen.getByText('#KAI')).toBeInTheDocument()
  })

  it('shows commitment details in preview section', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        commitment={mockCommitment}
      />
    )

    // Verify market title is shown
    expect(screen.getByText('Will Taylor Swift release a new album in 2024?')).toBeInTheDocument()
    
    // Verify commitment details are highlighted
    expect(screen.getByText('Your prediction: Yes with 100 KAI tokens')).toBeInTheDocument()
    
    // Verify market description is shown
    expect(screen.getByText('Predict whether Taylor Swift will release a new studio album in 2024')).toBeInTheDocument()
  })
})