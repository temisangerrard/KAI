import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShareButton } from '@/app/components/share-button'
import { Market, Prediction } from '@/lib/types/database'

// Mock the ShareModal component
jest.mock('@/app/components/share-modal', () => ({
  ShareModal: ({ isOpen, commitment }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="share-modal">
        <h2>Share Your Prediction</h2>
        {commitment && (
          <div data-testid="commitment-info">
            <p>Option: {commitment.optionText}</p>
            <p>Tokens: {commitment.prediction.tokensStaked}</p>
            <p>Market: {commitment.market.title}</p>
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

describe('Commitment Sharing', () => {
  it('renders share button for commitment', () => {
    render(
      <ShareButton
        commitment={mockCommitment}
        variant="button"
        size="sm"
      />
    )

    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
  })

  it('opens share modal when clicked', async () => {
    render(
      <ShareButton
        commitment={mockCommitment}
        variant="button"
        size="sm"
      />
    )

    const shareButton = screen.getByRole('button', { name: /share/i })
    fireEvent.click(shareButton)

    await waitFor(() => {
      expect(screen.getByTestId('share-modal')).toBeInTheDocument()
    })
  })

  it('displays commitment information in modal', async () => {
    render(
      <ShareButton
        commitment={mockCommitment}
        variant="button"
        size="sm"
      />
    )

    const shareButton = screen.getByRole('button', { name: /share/i })
    fireEvent.click(shareButton)

    await waitFor(() => {
      const commitmentInfo = screen.getByTestId('commitment-info')
      expect(commitmentInfo).toHaveTextContent('Option: Yes')
      expect(commitmentInfo).toHaveTextContent('Tokens: 50')
      expect(commitmentInfo).toHaveTextContent('Market: Test Market')
    })
  })

  it('renders market share button when no commitment provided', () => {
    render(
      <ShareButton
        market={mockMarket}
        variant="button"
        size="sm"
      />
    )

    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
  })
})