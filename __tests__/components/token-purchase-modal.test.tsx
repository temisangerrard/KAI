import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { TokenPurchaseModal } from '../../app/wallet/token-purchase-modal'

// Mock the TokenRewardAnimation component
jest.mock('../../app/components/token-reward-animation', () => ({
  TokenRewardAnimation: ({ amount, type, message }: any) => (
    <div data-testid="token-reward-animation">
      {message} - {amount} tokens - {type}
    </div>
  )
}))

describe('TokenPurchaseModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders when open', () => {
    render(<TokenPurchaseModal {...defaultProps} />)
    
    expect(screen.getByText('Buy Tokens')).toBeInTheDocument()
    expect(screen.getByText('Choose a package or enter a custom amount')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<TokenPurchaseModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Buy Tokens')).not.toBeInTheDocument()
  })

  it('displays package options with correct pricing', () => {
    render(<TokenPurchaseModal {...defaultProps} />)
    
    expect(screen.getByText('£10')).toBeInTheDocument()
    expect(screen.getByText('£25')).toBeInTheDocument()
    expect(screen.getByText('£50')).toBeInTheDocument()
    expect(screen.getByText('Popular')).toBeInTheDocument()
  })

  it('selects package when clicked', async () => {
    const user = userEvent.setup()
    render(<TokenPurchaseModal {...defaultProps} />)
    
    const starterPackage = screen.getByText('£10').closest('button')
    await user.click(starterPackage!)
    
    expect(starterPackage).toHaveClass('border-primary-400')
  })

  it('allows custom amount input', async () => {
    const user = userEvent.setup()
    render(<TokenPurchaseModal {...defaultProps} />)
    
    const customInput = screen.getByPlaceholderText('Enter amount')
    await user.type(customInput, '15')
    
    expect(customInput).toHaveValue(15)
    expect(screen.getByText("You'll receive 1,500 tokens")).toBeInTheDocument()
  })

  it('shows validation error for invalid amounts', async () => {
    const user = userEvent.setup()
    render(<TokenPurchaseModal {...defaultProps} />)
    
    // Clear default selection
    const customInput = screen.getByPlaceholderText('Enter amount')
    await user.type(customInput, '0')
    
    const continueButton = screen.getByText('Continue to Payment')
    await user.click(continueButton)
    
    expect(screen.getByText('Please select a package or enter a valid amount')).toBeInTheDocument()
  })

  it('shows validation error for amount too high', async () => {
    const user = userEvent.setup()
    render(<TokenPurchaseModal {...defaultProps} />)
    
    const customInput = screen.getByPlaceholderText('Enter amount')
    await user.clear(customInput)
    await user.type(customInput, '1001')
    
    const continueButton = screen.getByText('Continue to Payment')
    await user.click(continueButton)
    
    expect(screen.getByText('Maximum purchase amount is £1000')).toBeInTheDocument()
  })

  it('proceeds to payment step when valid package selected', async () => {
    const user = userEvent.setup()
    render(<TokenPurchaseModal {...defaultProps} />)
    
    const continueButton = screen.getByText('Continue to Payment')
    await user.click(continueButton)
    
    expect(screen.getByText('Payment Method')).toBeInTheDocument()
    expect(screen.getByText('Purchasing 2,600 tokens for £25')).toBeInTheDocument()
  })

  it('displays payment methods in payment step', async () => {
    const user = userEvent.setup()
    render(<TokenPurchaseModal {...defaultProps} />)
    
    const continueButton = screen.getByText('Continue to Payment')
    await user.click(continueButton)
    
    expect(screen.getByText('Credit Card')).toBeInTheDocument()
    expect(screen.getByText('PayPal')).toBeInTheDocument()
    expect(screen.getByText('Apple Pay')).toBeInTheDocument()
    expect(screen.getByText('Google Pay')).toBeInTheDocument()
  })

  it('shows card input fields when credit card selected', async () => {
    const user = userEvent.setup()
    render(<TokenPurchaseModal {...defaultProps} />)
    
    const continueButton = screen.getByText('Continue to Payment')
    await user.click(continueButton)
    
    expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('MM/YY')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('123')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument()
  })

  it('validates card details before processing', async () => {
    const user = userEvent.setup()
    render(<TokenPurchaseModal {...defaultProps} />)
    
    // Go to payment step
    const continueButton = screen.getByText('Continue to Payment')
    await user.click(continueButton)
    
    // Try to complete purchase without filling card details
    const completeButton = screen.getByText('Complete Purchase')
    await user.click(completeButton)
    
    expect(screen.getByText('Please fill in all card details')).toBeInTheDocument()
  })

  it('processes payment successfully', async () => {
    const user = userEvent.setup()
    const mockOnSuccess = jest.fn()
    
    render(<TokenPurchaseModal {...defaultProps} onSuccess={mockOnSuccess} />)
    
    // Go to payment step
    const continueButton = screen.getByText('Continue to Payment')
    await user.click(continueButton)
    
    // Fill in card details
    await user.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '4111111111111111')
    await user.type(screen.getByPlaceholderText('MM/YY'), '12/25')
    await user.type(screen.getByPlaceholderText('123'), '123')
    await user.type(screen.getByPlaceholderText('John Doe'), 'John Doe')
    
    // Complete purchase
    const completeButton = screen.getByText('Complete Purchase')
    await user.click(completeButton)
    
    // Should show processing state
    expect(screen.getByText('Processing Your Payment')).toBeInTheDocument()
    
    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Purchase Complete!')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Should call onSuccess after delay
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(2600)
    }, { timeout: 3000 })
  })

  it('handles payment failure', async () => {
    const user = userEvent.setup()
    
    // Mock Math.random to always return failure
    const originalRandom = Math.random
    Math.random = jest.fn(() => 0.95) // > 0.9 = failure
    
    render(<TokenPurchaseModal {...defaultProps} />)
    
    // Go to payment step and fill details
    const continueButton = screen.getByText('Continue to Payment')
    await user.click(continueButton)
    
    await user.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '4111111111111111')
    await user.type(screen.getByPlaceholderText('MM/YY'), '12/25')
    await user.type(screen.getByPlaceholderText('123'), '123')
    await user.type(screen.getByPlaceholderText('John Doe'), 'John Doe')
    
    const completeButton = screen.getByText('Complete Purchase')
    await user.click(completeButton)
    
    // Wait for error - use getAllByText to handle multiple instances
    await waitFor(() => {
      expect(screen.getAllByText('Payment Failed')[0]).toBeInTheDocument()
    }, { timeout: 3000 })
    
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    
    // Restore Math.random
    Math.random = originalRandom
  })

  it('allows retry after payment failure', async () => {
    const user = userEvent.setup()
    
    // Mock failure then success
    let callCount = 0
    const originalRandom = Math.random
    Math.random = jest.fn(() => {
      callCount++
      return callCount === 1 ? 0.95 : 0.5 // First call fails, second succeeds
    })
    
    render(<TokenPurchaseModal {...defaultProps} />)
    
    // Go through payment flow to get to error state
    const continueButton = screen.getByText('Continue to Payment')
    await user.click(continueButton)
    
    await user.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '4111111111111111')
    await user.type(screen.getByPlaceholderText('MM/YY'), '12/25')
    await user.type(screen.getByPlaceholderText('123'), '123')
    await user.type(screen.getByPlaceholderText('John Doe'), 'John Doe')
    
    const completeButton = screen.getByText('Complete Purchase')
    await user.click(completeButton)
    
    // Wait for error - use getAllByText to handle multiple instances
    await waitFor(() => {
      expect(screen.getAllByText('Payment Failed')[0]).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Click retry
    const retryButton = screen.getByText('Try Again')
    await user.click(retryButton)
    
    // Should be back at payment step
    expect(screen.getByText('Payment Method')).toBeInTheDocument()
    
    // Restore Math.random
    Math.random = originalRandom
  })

  it('closes modal when close button clicked', async () => {
    const user = userEvent.setup()
    const mockOnClose = jest.fn()
    
    render(<TokenPurchaseModal {...defaultProps} onClose={mockOnClose} />)
    
    // Find the X button by its SVG content
    const closeButton = screen.getByRole('button', { name: '' })
    await user.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('resets state when modal is closed and reopened', () => {
    const { rerender } = render(<TokenPurchaseModal {...defaultProps} isOpen={false} />)
    
    // Open modal
    rerender(<TokenPurchaseModal {...defaultProps} isOpen={true} />)
    
    // Should be back at package selection step
    expect(screen.getByText('Choose a package or enter a custom amount')).toBeInTheDocument()
    
    // Popular package should be selected by default
    const popularPackage = screen.getByText('£25').closest('button')
    expect(popularPackage).toHaveClass('border-primary-400')
  })
})