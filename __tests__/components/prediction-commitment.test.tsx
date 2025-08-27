import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PredictionCommitment } from '@/app/components/prediction-commitment'
import { useAuth } from '@/app/auth/auth-context'
import { TokenBalanceService } from '@/lib/services/token-balance-service'

// Mock dependencies
jest.mock('@/app/auth/auth-context')
jest.mock('@/lib/services/token-balance-service')

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockTokenBalanceService = TokenBalanceService as jest.Mocked<typeof TokenBalanceService>

describe('PredictionCommitment Component', () => {
  const mockProps = {
    predictionId: 'prediction-123',
    predictionTitle: 'Will it rain tomorrow?',
    position: 'yes' as const,
    currentOdds: 2.5,
    maxTokens: 1000,
    onCommit: jest.fn(),
    onCancel: jest.fn(),
    isLoading: false
  }

  const mockUser = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User'
  }

  const mockBalance = {
    userId: 'user-123',
    availableTokens: 500,
    committedTokens: 200,
    totalEarned: 1000,
    totalSpent: 300,
    lastUpdated: { seconds: 1234567890, nanoseconds: 0 } as any,
    version: 1
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser } as any)
    mockTokenBalanceService.getUserBalance.mockResolvedValue(mockBalance)
  })

  it('should render commitment form with prediction details', async () => {
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('Commit Tokens')).toBeInTheDocument()
      expect(screen.getByText('Will it rain tomorrow?')).toBeInTheDocument()
      expect(screen.getByText('YES')).toBeInTheDocument()
      expect(screen.getByText('Current odds: 2.50x')).toBeInTheDocument()
    })
  })

  it('should display user balance correctly', async () => {
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('Available Tokens')).toBeInTheDocument()
      expect(screen.getByText('500')).toBeInTheDocument()
      expect(screen.getByText('Committed')).toBeInTheDocument()
      expect(screen.getByText('200')).toBeInTheDocument()
    })
  })

  it('should calculate potential winnings correctly', async () => {
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      // Default commitment is 1 token, so winnings should be 1 * 2.5 = 2.5 (rounded down to 2)
      expect(screen.getByText('+2 tokens')).toBeInTheDocument()
      expect(screen.getByText('+100%')).toBeInTheDocument() // (2-1)/1 * 100 = 100%
    })
  })

  it('should update calculations when token amount changes', async () => {
    const user = userEvent.setup()
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('1')
    await user.clear(input)
    await user.type(input, '100')

    await waitFor(() => {
      // 100 tokens * 2.5 odds = 250 tokens winnings
      expect(screen.getByText('+250 tokens')).toBeInTheDocument()
      expect(screen.getByText('+150%')).toBeInTheDocument() // (250-100)/100 * 100 = 150%
    })
  })

  it('should show insufficient balance warning', async () => {
    const user = userEvent.setup()
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('1')
    await user.clear(input)
    await user.type(input, '600') // More than available balance of 500

    await waitFor(() => {
      expect(screen.getByText(/You need 100 more tokens/)).toBeInTheDocument()
    })
  })

  it('should handle slider input correctly', async () => {
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      const slider = screen.getByRole('slider')
      expect(slider).toBeInTheDocument()
    })

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '250' } })

    await waitFor(() => {
      expect(screen.getByDisplayValue('250')).toBeInTheDocument()
    })
  })

  it('should provide quick amount buttons', async () => {
    const user = userEvent.setup()
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('25%')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByText('Max')).toBeInTheDocument()
    })

    // Click 50% button (50% of 500 = 250)
    await user.click(screen.getByText('50%'))

    await waitFor(() => {
      expect(screen.getByDisplayValue('250')).toBeInTheDocument()
    })
  })

  it('should call onCommit with correct amount', async () => {
    const user = userEvent.setup()
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('1')
    await user.clear(input)
    await user.type(input, '100')

    const commitButton = screen.getByRole('button', { name: /Commit 100/ })
    await user.click(commitButton)

    expect(mockProps.onCommit).toHaveBeenCalledWith(100)
  })

  it('should disable commit button when insufficient balance', async () => {
    const user = userEvent.setup()
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('1')
    await user.clear(input)
    await user.type(input, '600') // More than available

    await waitFor(() => {
      const commitButton = screen.getByRole('button', { name: /Commit 600/ })
      expect(commitButton).toBeDisabled()
    })
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      expect(cancelButton).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelButton)

    expect(mockProps.onCancel).toHaveBeenCalled()
  })

  it('should show loading state during commitment', async () => {
    const user = userEvent.setup()
    mockProps.onCommit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      const commitButton = screen.getByRole('button', { name: /Commit 1/ })
      expect(commitButton).toBeInTheDocument()
    })

    const commitButton = screen.getByRole('button', { name: /Commit 1/ })
    await user.click(commitButton)

    await waitFor(() => {
      expect(screen.getByText('Committing...')).toBeInTheDocument()
    })
  })

  it('should handle commitment errors gracefully', async () => {
    const user = userEvent.setup()
    mockProps.onCommit.mockRejectedValue(new Error('Network error'))
    
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      const commitButton = screen.getByRole('button', { name: /Commit 1/ })
      expect(commitButton).toBeInTheDocument()
    })

    const commitButton = screen.getByRole('button', { name: /Commit 1/ })
    await user.click(commitButton)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should enforce minimum token commitment', async () => {
    const user = userEvent.setup()
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('1')
    await user.clear(input)
    await user.type(input, '0')

    // Should automatically adjust to minimum of 1
    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })
  })

  it('should respect maximum token limit', async () => {
    const user = userEvent.setup()
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('1')
    await user.clear(input)
    await user.type(input, '1500') // Above maxTokens of 1000

    // Should clamp to maxTokens
    await waitFor(() => {
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument()
    })
  })

  it('should show loading state while fetching balance', () => {
    mockTokenBalanceService.getUserBalance.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(<PredictionCommitment {...mockProps} />)

    expect(screen.getByText(/Loading/i)).toBeInTheDocument()
  })

  it('should handle balance loading errors', async () => {
    mockTokenBalanceService.getUserBalance.mockRejectedValue(new Error('Failed to load balance'))

    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load balance')).toBeInTheDocument()
    })
  })

  it('should handle zero balance gracefully', async () => {
    const zeroBalance = {
      ...mockBalance,
      availableTokens: 0,
      committedTokens: 0,
      totalEarned: 0,
      totalSpent: 0
    }
    mockTokenBalanceService.getUserBalance.mockResolvedValue(zeroBalance)

    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument()
      const commitButton = screen.getByRole('button', { name: /Commit/ })
      expect(commitButton).toBeDisabled()
    })
  })

  it('should show position badge correctly for no position', async () => {
    const noProps = { ...mockProps, position: 'no' as const }
    render(<PredictionCommitment {...noProps} />)

    await waitFor(() => {
      expect(screen.getByText('NO')).toBeInTheDocument()
    })
  })

  it('should display disclaimer text', async () => {
    render(<PredictionCommitment {...mockProps} />)

    await waitFor(() => {
      expect(screen.getByText(/Committed tokens will be locked until the prediction resolves/)).toBeInTheDocument()
    })
  })
})