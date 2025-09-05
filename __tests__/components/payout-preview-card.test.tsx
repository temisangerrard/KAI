import React from 'react'
import { render, screen } from '@testing-library/react'
import { PayoutPreviewCard } from '@/app/admin/components/payout-preview-card'
import { PayoutPreview } from '@/lib/types/database'

const mockPayoutPreview: PayoutPreview = {
  totalPool: 10000,
  houseFee: 500, // 5%
  creatorFee: 200, // 2%
  winnerPool: 9300, // 93%
  winnerCount: 25,
  largestPayout: 1500,
  smallestPayout: 50,
  creatorPayout: {
    userId: 'creator-123',
    feeAmount: 200,
    feePercentage: 2
  },
  payouts: [
    {
      userId: 'user-1',
      currentStake: 500,
      projectedPayout: 1500,
      projectedProfit: 1000
    },
    {
      userId: 'user-2',
      currentStake: 200,
      projectedPayout: 600,
      projectedProfit: 400
    },
    {
      userId: 'user-3',
      currentStake: 100,
      projectedPayout: 300,
      projectedProfit: 200
    },
    {
      userId: 'user-4',
      currentStake: 50,
      projectedPayout: 150,
      projectedProfit: 100
    },
    {
      userId: 'user-5',
      currentStake: 25,
      projectedPayout: 75,
      projectedProfit: 50
    }
  ]
}

const mockLargePayoutPreview: PayoutPreview = {
  ...mockPayoutPreview,
  payouts: Array.from({ length: 15 }, (_, i) => ({
    userId: `user-${i + 1}`,
    currentStake: 100 - i * 5,
    projectedPayout: 200 - i * 10,
    projectedProfit: 100 - i * 5
  }))
}

describe('PayoutPreviewCard', () => {
  it('renders payout preview header', () => {
    render(<PayoutPreviewCard preview={mockPayoutPreview} />)

    expect(screen.getByText('Payout Preview')).toBeInTheDocument()
    expect(screen.getByText('Review the distribution breakdown before confirming resolution')).toBeInTheDocument()
  })

  it('displays fee breakdown correctly', () => {
    render(<PayoutPreviewCard preview={mockPayoutPreview} />)

    // Total Pool
    expect(screen.getByText('Total Pool')).toBeInTheDocument()
    expect(screen.getByText('10,000')).toBeInTheDocument()

    // House Fee
    expect(screen.getByText('House Fee (5%)')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()

    // Creator Fee
    expect(screen.getByText('Creator Fee (2%)')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()

    // Winner Pool
    expect(screen.getByText('Winner Pool')).toBeInTheDocument()
    expect(screen.getByText('9,300')).toBeInTheDocument()
  })

  it('displays winner statistics', () => {
    render(<PayoutPreviewCard preview={mockPayoutPreview} />)

    expect(screen.getByText('Winners')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()

    expect(screen.getByText('Largest Payout')).toBeInTheDocument()
    const largestPayoutElements = screen.getAllByText('1,500 tokens')
    expect(largestPayoutElements.length).toBeGreaterThan(0)

    expect(screen.getByText('Smallest Payout')).toBeInTheDocument()
    expect(screen.getByText('50 tokens')).toBeInTheDocument()
  })

  it('displays individual payouts preview', () => {
    render(<PayoutPreviewCard preview={mockPayoutPreview} />)

    expect(screen.getByText('Individual Payouts')).toBeInTheDocument()
    expect(screen.getByText('5 winners')).toBeInTheDocument()

    // Check first payout (highest)
    expect(screen.getByText('User user-1...')).toBeInTheDocument()
    expect(screen.getByText('Staked: 500 tokens')).toBeInTheDocument()
    const payoutElements = screen.getAllByText('1,500 tokens')
    expect(payoutElements.length).toBeGreaterThan(0)
    expect(screen.getByText('Profit: +1,000')).toBeInTheDocument()

    // Check last payout (lowest)
    expect(screen.getByText('User user-5...')).toBeInTheDocument()
    expect(screen.getByText('Staked: 25 tokens')).toBeInTheDocument()
    expect(screen.getByText('75 tokens')).toBeInTheDocument()
    expect(screen.getByText('Profit: +50')).toBeInTheDocument()
  })

  it('limits individual payouts display to top 10', () => {
    render(<PayoutPreviewCard preview={mockLargePayoutPreview} />)

    expect(screen.getByText('15 winners')).toBeInTheDocument()
    expect(screen.getByText('... and 5 more winners')).toBeInTheDocument()

    // Should show users 1-10
    expect(screen.getByText('User user-1...')).toBeInTheDocument()
    expect(screen.getByText('User user-10...')).toBeInTheDocument()
    
    // Should not show user 11+
    expect(screen.queryByText('User user-11...')).not.toBeInTheDocument()
  })

  it('displays distribution summary', () => {
    render(<PayoutPreviewCard preview={mockPayoutPreview} />)

    expect(screen.getByText('Distribution Summary')).toBeInTheDocument()
    
    // Check summary calculations
    expect(screen.getByText('Total Pool:')).toBeInTheDocument()
    expect(screen.getByText('10,000 tokens')).toBeInTheDocument()
    
    expect(screen.getByText('House Fee (5%):')).toBeInTheDocument()
    expect(screen.getByText('-500 tokens')).toBeInTheDocument()
    
    expect(screen.getByText('Creator Fee (2%):')).toBeInTheDocument()
    expect(screen.getByText('-200 tokens')).toBeInTheDocument()
    
    expect(screen.getByText('Winners Receive:')).toBeInTheDocument()
    expect(screen.getByText('9,300 tokens')).toBeInTheDocument()
  })

  it('displays payout validation', () => {
    render(<PayoutPreviewCard preview={mockPayoutPreview} />)

    expect(screen.getByText('Payout Validation')).toBeInTheDocument()
    expect(screen.getByText('✓ All calculations verified. Total distribution: 10,000 tokens')).toBeInTheDocument()
    expect(screen.getByText('25 winners will receive payouts immediately upon resolution.')).toBeInTheDocument()
  })

  it('handles singular winner count correctly', () => {
    const singleWinnerPreview: PayoutPreview = {
      ...mockPayoutPreview,
      winnerCount: 1,
      payouts: [mockPayoutPreview.payouts[0]]
    }

    render(<PayoutPreviewCard preview={singleWinnerPreview} />)

    expect(screen.getByText('1 winner')).toBeInTheDocument()
    expect(screen.getByText('1 winner will receive payout immediately upon resolution.')).toBeInTheDocument()
  })

  it('formats large numbers with commas', () => {
    const largeNumberPreview: PayoutPreview = {
      ...mockPayoutPreview,
      totalPool: 1234567,
      houseFee: 61728,
      creatorFee: 24691,
      winnerPool: 1148148,
      largestPayout: 50000,
      smallestPayout: 1000
    }

    render(<PayoutPreviewCard preview={largeNumberPreview} />)

    expect(screen.getByText('1,234,567')).toBeInTheDocument()
    expect(screen.getByText('61,728')).toBeInTheDocument()
    expect(screen.getByText('24,691')).toBeInTheDocument()
    expect(screen.getByText('1,148,148')).toBeInTheDocument()
    expect(screen.getByText('50,000 tokens')).toBeInTheDocument()
    expect(screen.getByText('1,000 tokens')).toBeInTheDocument()
  })

  it('displays correct creator fee percentage', () => {
    const customCreatorFeePreview: PayoutPreview = {
      ...mockPayoutPreview,
      creatorPayout: {
        userId: 'creator-123',
        feeAmount: 500,
        feePercentage: 5 // 5% creator fee
      }
    }

    render(<PayoutPreviewCard preview={customCreatorFeePreview} />)

    expect(screen.getByText('Creator Fee (5%)')).toBeInTheDocument()
    expect(screen.getByText('Creator Fee (5%):')).toBeInTheDocument()
  })

  it('handles zero payouts gracefully', () => {
    const zeroPayoutsPreview: PayoutPreview = {
      ...mockPayoutPreview,
      winnerCount: 0,
      payouts: []
    }

    render(<PayoutPreviewCard preview={zeroPayoutsPreview} />)

    expect(screen.getByText('0')).toBeInTheDocument() // Winner count
    expect(screen.queryByText('Individual Payouts')).not.toBeInTheDocument()
    expect(screen.getByText('0 winners will receive payouts immediately upon resolution.')).toBeInTheDocument()
  })

  it('sorts payouts by amount descending', () => {
    const unsortedPayoutsPreview: PayoutPreview = {
      ...mockPayoutPreview,
      payouts: [
        {
          userId: 'user-low',
          currentStake: 50,
          projectedPayout: 100,
          projectedProfit: 50
        },
        {
          userId: 'user-high',
          currentStake: 500,
          projectedPayout: 1000,
          projectedProfit: 500
        },
        {
          userId: 'user-mid',
          currentStake: 200,
          projectedPayout: 400,
          projectedProfit: 200
        }
      ]
    }

    render(<PayoutPreviewCard preview={unsortedPayoutsPreview} />)

    const payoutElements = screen.getAllByText(/User user-/)
    
    // Should be sorted by payout amount (high to low)
    expect(payoutElements[0]).toHaveTextContent('user-hig')
    expect(payoutElements[1]).toHaveTextContent('user-mid')
    expect(payoutElements[2]).toHaveTextContent('user-low')
  })

  it('displays user ID truncation correctly', () => {
    const longUserIdPreview: PayoutPreview = {
      ...mockPayoutPreview,
      payouts: [
        {
          userId: 'very-long-user-id-that-should-be-truncated',
          currentStake: 100,
          projectedPayout: 200,
          projectedProfit: 100
        }
      ]
    }

    render(<PayoutPreviewCard preview={longUserIdPreview} />)

    expect(screen.getByText('User very-lon...')).toBeInTheDocument()
  })
})