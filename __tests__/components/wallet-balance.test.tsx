import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { WalletBalance } from '../../app/wallet/wallet-balance'
import { UserBalance } from '../../lib/types/token'

describe('WalletBalance', () => {
  const mockBalance: UserBalance = {
    userId: 'test-user',
    availableTokens: 2500,
    committedTokens: 750,
    totalEarned: 1200,
    totalSpent: 800,
    lastUpdated: new Date() as any,
    version: 1
  }

  const defaultProps = {
    balance: mockBalance,
    onPurchaseClick: jest.fn(),
    onWithdrawClick: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders balance information correctly', () => {
    render(<WalletBalance {...defaultProps} />)
    
    expect(screen.getByText('Available Balance')).toBeInTheDocument()
    expect(screen.getByText('2.5K')).toBeInTheDocument() // Formatted available tokens
    expect(screen.getByText('KAI Tokens')).toBeInTheDocument()
  })

  it('displays balance details cards', () => {
    render(<WalletBalance {...defaultProps} />)
    
    expect(screen.getByText('Committed')).toBeInTheDocument()
    expect(screen.getByText('750')).toBeInTheDocument() // Committed tokens
    
    expect(screen.getByText('Total Balance')).toBeInTheDocument()
    expect(screen.getByText('3.3K')).toBeInTheDocument() // Total balance (2500 + 750)
    
    expect(screen.getByText('Net Earnings')).toBeInTheDocument()
    expect(screen.getByText('+400')).toBeInTheDocument() // Net earnings (1200 - 800)
  })

  it('shows negative net earnings correctly', () => {
    const negativeBalance = {
      ...mockBalance,
      totalEarned: 500,
      totalSpent: 800
    }
    
    render(<WalletBalance {...defaultProps} balance={negativeBalance} />)
    
    expect(screen.getByText('-300')).toBeInTheDocument()
  })

  it('formats large numbers correctly', () => {
    const largeBalance = {
      ...mockBalance,
      availableTokens: 1500000,
      committedTokens: 250000
    }
    
    render(<WalletBalance {...defaultProps} balance={largeBalance} />)
    
    expect(screen.getByText('1.5M')).toBeInTheDocument() // Available tokens
    expect(screen.getByText('250.0K')).toBeInTheDocument() // Committed tokens
    expect(screen.getByText('1.8M')).toBeInTheDocument() // Total balance
  })

  it('calls onPurchaseClick when buy tokens button clicked', async () => {
    const user = userEvent.setup()
    const mockOnPurchaseClick = jest.fn()
    
    render(<WalletBalance {...defaultProps} onPurchaseClick={mockOnPurchaseClick} />)
    
    const buyButton = screen.getByText('Buy Tokens')
    await user.click(buyButton)
    
    expect(mockOnPurchaseClick).toHaveBeenCalled()
  })

  it('calls onWithdrawClick when withdraw button clicked', async () => {
    const user = userEvent.setup()
    const mockOnWithdrawClick = jest.fn()
    
    render(<WalletBalance {...defaultProps} onWithdrawClick={mockOnWithdrawClick} />)
    
    const withdrawButton = screen.getByText('Withdraw')
    await user.click(withdrawButton)
    
    expect(mockOnWithdrawClick).toHaveBeenCalled()
  })

  it('disables withdraw button when no available tokens', () => {
    const zeroBalance = {
      ...mockBalance,
      availableTokens: 0
    }
    
    render(<WalletBalance {...defaultProps} balance={zeroBalance} />)
    
    const withdrawButton = screen.getByText('Withdraw')
    expect(withdrawButton).toBeDisabled()
  })

  it('does not render withdraw button when onWithdrawClick not provided', () => {
    render(<WalletBalance {...defaultProps} onWithdrawClick={undefined} />)
    
    expect(screen.queryByText('Withdraw')).not.toBeInTheDocument()
  })

  it('shows loading state correctly', () => {
    render(<WalletBalance {...defaultProps} isLoading={true} />)
    
    expect(screen.getByText('...')).toBeInTheDocument()
    
    const buyButton = screen.getByText('Buy Tokens')
    expect(buyButton).toBeDisabled()
  })

  it('toggles balance visibility when eye icon clicked', async () => {
    const user = userEvent.setup()
    render(<WalletBalance {...defaultProps} />)
    
    // Initially should show balance
    expect(screen.getByText('2.5K')).toBeInTheDocument()
    
    // Click eye icon to hide
    const eyeButton = screen.getByRole('button', { name: /hide balance/i })
    await user.click(eyeButton)
    
    // Should show hidden balance
    expect(screen.getByText('••••')).toBeInTheDocument()
    expect(screen.queryByText('2.5K')).not.toBeInTheDocument()
  })

  it('shows refresh animation when refresh button clicked', async () => {
    const user = userEvent.setup()
    render(<WalletBalance {...defaultProps} />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)
    
    // Should show spinning animation
    const refreshIcon = refreshButton.querySelector('svg')
    expect(refreshIcon).toHaveClass('animate-spin')
    
    // Animation should stop after delay
    await waitFor(() => {
      expect(refreshIcon).not.toHaveClass('animate-spin')
    }, { timeout: 1500 })
  })

  it('hides details when showDetails is false', () => {
    render(<WalletBalance {...defaultProps} showDetails={false} />)
    
    expect(screen.queryByText('Committed')).not.toBeInTheDocument()
    expect(screen.queryByText('Total Balance')).not.toBeInTheDocument()
    expect(screen.queryByText('Net Earnings')).not.toBeInTheDocument()
  })

  it('shows balance breakdown when details are visible', () => {
    render(<WalletBalance {...defaultProps} showDetails={true} />)
    
    expect(screen.getByText('Balance Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Available Tokens')).toBeInTheDocument()
    expect(screen.getByText('Committed to Predictions')).toBeInTheDocument()
    expect(screen.getByText('Total Earned')).toBeInTheDocument()
    expect(screen.getByText('Total Spent')).toBeInTheDocument()
    
    // Check specific values
    expect(screen.getByText('2,500')).toBeInTheDocument() // Available tokens
    expect(screen.getByText('750')).toBeInTheDocument() // Committed tokens
    expect(screen.getByText('+1,200')).toBeInTheDocument() // Total earned
    expect(screen.getByText('-800')).toBeInTheDocument() // Total spent
  })

  it('shows correct badges for different token states', () => {
    render(<WalletBalance {...defaultProps} />)
    
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()
  })

  it('handles zero values correctly', () => {
    const zeroBalance = {
      ...mockBalance,
      availableTokens: 0,
      committedTokens: 0,
      totalEarned: 0,
      totalSpent: 0
    }
    
    render(<WalletBalance {...defaultProps} balance={zeroBalance} />)
    
    expect(screen.getByText('0')).toBeInTheDocument() // Should show 0 for available tokens
    expect(screen.getByText('+0')).toBeInTheDocument() // Net earnings should be +0
  })

  it('applies correct styling for positive and negative earnings', () => {
    render(<WalletBalance {...defaultProps} />)
    
    const netEarningsValue = screen.getByText('+400')
    expect(netEarningsValue).toHaveClass('text-green-600')
    
    const netEarningsIcon = netEarningsValue.closest('div')?.querySelector('svg')
    expect(netEarningsIcon?.closest('div')).toHaveClass('bg-green-100')
  })

  it('applies correct styling for negative earnings', () => {
    const negativeBalance = {
      ...mockBalance,
      totalEarned: 500,
      totalSpent: 800
    }
    
    render(<WalletBalance {...defaultProps} balance={negativeBalance} />)
    
    const netEarningsValue = screen.getByText('-300')
    expect(netEarningsValue).toHaveClass('text-red-600')
  })
})