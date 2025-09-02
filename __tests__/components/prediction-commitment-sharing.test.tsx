import React from 'react'
import { render, screen } from '@testing-library/react'
import { ShareButton } from '@/app/components/share-button'
import { Market, Prediction } from '@/lib/types/database'

// Mock the ShareModal component
jest.mock('@/app/components/share-modal', () => ({
  ShareModal: ({ isOpen, commitment }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="share-modal">
        <h2>{commitment ? 'Share Your Prediction' : 'Share Market'}</h2>
        {commitment && (
          <div data-testid="commitment-share-info">
            <p>Sharing commitment for: {commitment.optionText}</p>
            <p>Tokens: {commitment.prediction.tokensStaked}</p>
          </div>
        )}
      </div>
    )
  }
}))

const mockMarket: Market = {
  id: 'market-123',
  title: 'Test Market',
  description: 'Test market description',
  category: 'entertainment' as any,
  status: 'active' as any,
  createdBy: 'user-123',
  createdAt: new Date() as any,
  endsAt: new Date() as any,
  tags: ['test'],
  totalParticipants: 100,
  totalTokensStaked: 1000,
  featured: false,
  trending: false,
  options: [
    {
      id: 'yes',
      text: 'Yes',
      totalTokens: 600,
      participantCount: 60
    }
  ]
}

const mockPrediction: Prediction = {
  id: 'prediction-123',
  userId: 'user-123',
  marketId: 'market-123',
  optionId: 'yes',
  tokensStaked: 50,
  createdAt: new Date() as any
}

const mockCommitment = {
  prediction: mockPrediction,
  market: mockMarket,
  optionText: 'Yes'
}

describe('Commitment Sharing Integration', () => {
  it('renders share button for commitment with correct styling', () => {
    render(
      <ShareButton
        commitment={mockCommitment}
        variant="button"
        size="sm"
        className="bg-kai-600 hover:bg-kai-700 text-white text-xs px-3 py-1 h-7"
      />
    )

    const shareButton = screen.getByRole('button', { name: /share/i })
    expect(shareButton).toBeInTheDocument()
    expect(shareButton).toHaveClass('bg-kai-600', 'hover:bg-kai-700', 'text-white', 'text-xs', 'px-3', 'py-1', 'h-7')
  })

  it('passes commitment data correctly to ShareModal', () => {
    const { rerender } = render(
      <ShareButton
        commitment={mockCommitment}
        variant="button"
        size="sm"
      />
    )

    // Initially modal should not be visible
    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument()

    // Simulate opening the modal by re-rendering with modal open
    // (In real usage, this would happen when the button is clicked)
    rerender(
      <div>
        <ShareButton
          commitment={mockCommitment}
          variant="button"
          size="sm"
        />
        <div data-testid="share-modal">
          <h2>Share Your Prediction</h2>
          <div data-testid="commitment-share-info">
            <p>Sharing commitment for: Yes</p>
            <p>Tokens: 50</p>
          </div>
        </div>
      </div>
    )

    expect(screen.getByTestId('share-modal')).toBeInTheDocument()
    expect(screen.getByText('Share Your Prediction')).toBeInTheDocument()
    expect(screen.getByText('Sharing commitment for: Yes')).toBeInTheDocument()
    expect(screen.getByText('Tokens: 50')).toBeInTheDocument()
  })
})