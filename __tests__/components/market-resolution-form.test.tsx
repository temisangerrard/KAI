import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MarketResolutionForm } from '@/app/admin/components/market-resolution-form'
import { ResolutionService } from '@/lib/services/resolution-service'
import { useAuth } from '@/app/auth/auth-context'
import { Market, PayoutPreview } from '@/lib/types/database'

// Mock Firebase Timestamp
const mockTimestamp = (date: Date) => ({
  toMillis: () => date.getTime(),
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: (date.getTime() % 1000) * 1000000
})

// Mock the ResolutionService
jest.mock('@/lib/services/resolution-service', () => ({
  ResolutionService: {
    calculatePayoutPreview: jest.fn(),
    resolveMarket: jest.fn()
  }
}))

// Mock the auth context
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: jest.fn()
}))

// Mock the child components
jest.mock('@/app/admin/components/evidence-collection-form', () => ({
  EvidenceCollectionForm: ({ evidence, onChange }: any) => (
    <div data-testid="evidence-collection-form">
      <button onClick={() => onChange([{ id: '1', type: 'url', content: 'https://example.com', uploadedAt: new Date() }])}>
        Add Evidence
      </button>
      <div>Evidence count: {evidence.length}</div>
    </div>
  )
}))

jest.mock('@/app/admin/components/payout-preview-card', () => ({
  PayoutPreviewCard: ({ preview }: any) => (
    <div data-testid="payout-preview-card">
      <div>Total Pool: {preview.totalPool}</div>
      <div>Winner Count: {preview.winnerCount}</div>
    </div>
  )
}))

const mockMarket: Market = {
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

const mockPayoutPreview: PayoutPreview = {
  totalPool: 5000,
  houseFee: 250,
  creatorFee: 100,
  winnerPool: 4650,
  winnerCount: 90,
  largestPayout: 200,
  smallestPayout: 10,
  creatorPayout: {
    userId: 'creator-1',
    feeAmount: 100,
    feePercentage: 2
  },
  payouts: [
    {
      userId: 'user-1',
      currentStake: 100,
      projectedPayout: 150,
      projectedProfit: 50
    }
  ]
}

const mockUser = {
  uid: 'admin-1',
  email: 'admin@example.com'
}

describe('MarketResolutionForm', () => {
  const mockOnComplete = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
  })

  it('renders form header and market summary', () => {
    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Resolve Market')).toBeInTheDocument()
    expect(screen.getByText('"Will Drake release an album in 2024?"')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument() // Participants
    expect(screen.getByText('5,000 tokens')).toBeInTheDocument() // Total pool
  })

  it('displays market options for selection', () => {
    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Select Winning Option')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('90 participants')).toBeInTheDocument()
    expect(screen.getByText('3,000 tokens staked')).toBeInTheDocument()
  })

  it('calculates payout preview when option is selected', async () => {
    ;(ResolutionService.calculatePayoutPreview as jest.Mock).mockResolvedValue(mockPayoutPreview)

    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    const yesOption = screen.getByLabelText(/Yes/)
    fireEvent.click(yesOption)

    await waitFor(() => {
      expect(ResolutionService.calculatePayoutPreview).toHaveBeenCalledWith(
        'market-1',
        'yes',
        0.02 // Default 2% creator fee
      )
      expect(screen.getByTestId('payout-preview-card')).toBeInTheDocument()
    })
  })

  it('updates creator fee percentage', async () => {
    ;(ResolutionService.calculatePayoutPreview as jest.Mock).mockResolvedValue(mockPayoutPreview)

    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    const creatorFeeInput = screen.getByDisplayValue('2')
    fireEvent.change(creatorFeeInput, { target: { value: '3' } })

    const yesOption = screen.getByLabelText(/Yes/)
    fireEvent.click(yesOption)

    await waitFor(() => {
      expect(ResolutionService.calculatePayoutPreview).toHaveBeenCalledWith(
        'market-1',
        'yes',
        0.03 // 3% creator fee
      )
    })
  })

  it('validates resolution before submission', async () => {
    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    const resolveButton = screen.getByText('Resolve Market & Distribute Payouts')
    fireEvent.click(resolveButton)

    await waitFor(() => {
      expect(screen.getByText('Please select a winning option')).toBeInTheDocument()
      expect(screen.getByText('At least one piece of evidence is required')).toBeInTheDocument()
    })
  })

  it('validates creator fee percentage range', async () => {
    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    const creatorFeeInput = screen.getByDisplayValue('2')
    fireEvent.change(creatorFeeInput, { target: { value: '6' } }) // Invalid: > 5%

    const resolveButton = screen.getByText('Resolve Market & Distribute Payouts')
    fireEvent.click(resolveButton)

    await waitFor(() => {
      expect(screen.getByText('Creator fee must be between 1% and 5%')).toBeInTheDocument()
    })
  })

  it('adds evidence through evidence collection form', async () => {
    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Evidence count: 0')).toBeInTheDocument()

    const addEvidenceButton = screen.getByText('Add Evidence')
    fireEvent.click(addEvidenceButton)

    await waitFor(() => {
      expect(screen.getByText('Evidence count: 1')).toBeInTheDocument()
    })
  })

  it('submits resolution successfully', async () => {
    ;(ResolutionService.calculatePayoutPreview as jest.Mock).mockResolvedValue(mockPayoutPreview)
    ;(ResolutionService.resolveMarket as jest.Mock).mockResolvedValue({ success: true, resolutionId: 'res-1' })

    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    // Select winning option
    const yesOption = screen.getByLabelText(/Yes/)
    fireEvent.click(yesOption)

    // Add evidence
    const addEvidenceButton = screen.getByText('Add Evidence')
    fireEvent.click(addEvidenceButton)

    await waitFor(() => {
      expect(screen.getByText('Evidence count: 1')).toBeInTheDocument()
    })

    // Submit resolution
    const resolveButton = screen.getByText('Resolve Market & Distribute Payouts')
    fireEvent.click(resolveButton)

    await waitFor(() => {
      expect(ResolutionService.resolveMarket).toHaveBeenCalledWith(
        'market-1',
        'yes',
        [{ id: '1', type: 'url', content: 'https://example.com', uploadedAt: expect.any(Date) }],
        'admin-1',
        0.02
      )
      expect(mockOnComplete).toHaveBeenCalled()
    })
  })

  it('handles resolution error', async () => {
    ;(ResolutionService.resolveMarket as jest.Mock).mockRejectedValue(new Error('Resolution failed'))

    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    // Select winning option
    const yesOption = screen.getByLabelText(/Yes/)
    fireEvent.click(yesOption)

    // Add evidence
    const addEvidenceButton = screen.getByText('Add Evidence')
    fireEvent.click(addEvidenceButton)

    await waitFor(() => {
      expect(screen.getByText('Evidence count: 1')).toBeInTheDocument()
    })

    // Submit resolution
    const resolveButton = screen.getByText('Resolve Market & Distribute Payouts')
    fireEvent.click(resolveButton)

    await waitFor(() => {
      expect(screen.getByText('Resolution failed')).toBeInTheDocument()
    })
  })

  it('disables resolve button when loading', async () => {
    ;(ResolutionService.resolveMarket as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    // Select winning option and add evidence
    const yesOption = screen.getByLabelText(/Yes/)
    fireEvent.click(yesOption)

    const addEvidenceButton = screen.getByText('Add Evidence')
    fireEvent.click(addEvidenceButton)

    await waitFor(() => {
      expect(screen.getByText('Evidence count: 1')).toBeInTheDocument()
    })

    // Submit resolution
    const resolveButton = screen.getByText('Resolve Market & Distribute Payouts')
    fireEvent.click(resolveButton)

    await waitFor(() => {
      expect(screen.getByText('Resolving...')).toBeInTheDocument()
      expect(resolveButton).toBeDisabled()
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    const cancelButtons = screen.getAllByText('Cancel')
    fireEvent.click(cancelButtons[0])

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('requires admin authentication', async () => {
    ;(useAuth as jest.Mock).mockReturnValue({ user: null })

    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    // Select winning option and add evidence
    const yesOption = screen.getByLabelText(/Yes/)
    fireEvent.click(yesOption)

    const addEvidenceButton = screen.getByText('Add Evidence')
    fireEvent.click(addEvidenceButton)

    await waitFor(() => {
      expect(screen.getByText('Evidence count: 1')).toBeInTheDocument()
    })

    // Try to submit resolution
    const resolveButton = screen.getByText('Resolve Market & Distribute Payouts')
    fireEvent.click(resolveButton)

    await waitFor(() => {
      expect(screen.getByText('Admin authentication required')).toBeInTheDocument()
    })
  })

  it('handles payout preview calculation error', async () => {
    ;(ResolutionService.calculatePayoutPreview as jest.Mock).mockRejectedValue(
      new Error('Failed to calculate preview')
    )

    render(
      <MarketResolutionForm
        market={mockMarket}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    )

    const yesOption = screen.getByLabelText(/Yes/)
    fireEvent.click(yesOption)

    await waitFor(() => {
      expect(screen.getByText('Failed to calculate payout preview')).toBeInTheDocument()
    })
  })
})