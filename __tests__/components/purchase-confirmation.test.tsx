import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { PurchaseConfirmation } from '../../app/wallet/purchase-confirmation'

// Mock the TokenRewardAnimation component
jest.mock('../../app/components/token-reward-animation', () => ({
  TokenRewardAnimation: ({ amount, type, message }: any) => (
    <div data-testid="token-reward-animation">
      {message} - {amount} tokens - {type}
    </div>
  )
}))

// Mock navigator.share and navigator.clipboard
const mockShare = jest.fn()
const mockWriteText = jest.fn()

Object.defineProperty(navigator, 'share', {
  writable: true,
  value: mockShare
})

Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: mockWriteText
  }
})

describe('PurchaseConfirmation', () => {
  const mockPurchaseDetails = {
    transactionId: 'TXN-123456789',
    amount: 25,
    tokens: 2500,
    bonusTokens: 100,
    paymentMethod: 'Credit Card',
    timestamp: new Date('2024-01-15T10:30:00Z'),
    pricePerToken: 0.01
  }

  const defaultProps = {
    isOpen: true,
    purchaseDetails: mockPurchaseDetails,
    onClose: jest.fn(),
    onContinueShopping: jest.fn(),
    onViewWallet: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockShare.mockClear()
    mockWriteText.mockClear()
  })

  it('renders when open', () => {
    render(<PurchaseConfirmation {...defaultProps} />)
    
    expect(screen.getByText('Purchase Successful!')).toBeInTheDocument()
    expect(screen.getByText('Your tokens have been added to your wallet')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<PurchaseConfirmation {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Purchase Successful!')).not.toBeInTheDocument()
  })

  it('displays correct token amounts including bonus', () => {
    render(<PurchaseConfirmation {...defaultProps} />)
    
    expect(screen.getByText('+2,600')).toBeInTheDocument() // 2500 + 100 bonus
    expect(screen.getByText('KAI Tokens Added')).toBeInTheDocument()
    expect(screen.getByText('Base: 2,500')).toBeInTheDocument()
    expect(screen.getByText('+100 Bonus')).toBeInTheDocument()
  })

  it('displays purchase details correctly', async () => {
    render(<PurchaseConfirmation {...defaultProps} />)
    
    // Wait for details to show (after animation delay)
    await waitFor(() => {
      expect(screen.getByText('Purchase Details')).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(screen.getByText('TXN-123456789')).toBeInTheDocument()
    expect(screen.getByText('£25')).toBeInTheDocument()
    expect(screen.getByText('Credit Card')).toBeInTheDocument()
  })

  it('formats date correctly', async () => {
    render(<PurchaseConfirmation {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Purchase Details')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Check that date is formatted (exact format may vary by locale)
    expect(screen.getByText(/15 Jan 2024/)).toBeInTheDocument()
  })

  it('handles purchase without bonus tokens', () => {
    const noBonusDetails = {
      ...mockPurchaseDetails,
      bonusTokens: 0
    }
    
    render(<PurchaseConfirmation {...defaultProps} purchaseDetails={noBonusDetails} />)
    
    expect(screen.getByText('+2,500')).toBeInTheDocument() // Only base tokens
    expect(screen.queryByText('Bonus')).not.toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup()
    const mockOnClose = jest.fn()
    
    render(<PurchaseConfirmation {...defaultProps} onClose={mockOnClose} />)
    
    const closeButton = screen.getByText('Close')
    await user.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onViewWallet when view wallet button clicked', async () => {
    const user = userEvent.setup()
    const mockOnViewWallet = jest.fn()
    
    render(<PurchaseConfirmation {...defaultProps} onViewWallet={mockOnViewWallet} />)
    
    const viewWalletButton = screen.getByText('View My Wallet')
    await user.click(viewWalletButton)
    
    expect(mockOnViewWallet).toHaveBeenCalled()
  })

  it('calls onContinueShopping when buy more button clicked', async () => {
    const user = userEvent.setup()
    const mockOnContinueShopping = jest.fn()
    
    render(<PurchaseConfirmation {...defaultProps} onContinueShopping={mockOnContinueShopping} />)
    
    const buyMoreButton = screen.getByText('Buy More')
    await user.click(buyMoreButton)
    
    expect(mockOnContinueShopping).toHaveBeenCalled()
  })

  it('does not render view wallet button when callback not provided', () => {
    render(<PurchaseConfirmation {...defaultProps} onViewWallet={undefined} />)
    
    expect(screen.queryByText('View My Wallet')).not.toBeInTheDocument()
  })

  it('does not render buy more button when callback not provided', () => {
    render(<PurchaseConfirmation {...defaultProps} onContinueShopping={undefined} />)
    
    expect(screen.queryByText('Buy More')).not.toBeInTheDocument()
  })

  it('shares purchase using native share API when available', async () => {
    const user = userEvent.setup()
    mockShare.mockResolvedValue(undefined)
    
    render(<PurchaseConfirmation {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument()
    }, { timeout: 2000 })

    const shareButton = screen.getByText('Share')
    await user.click(shareButton)
    
    expect(mockShare).toHaveBeenCalledWith({
      title: 'KAI Token Purchase',
      text: 'Just purchased 2,600 KAI tokens! Ready to back my opinions on trending topics.',
      url: window.location.origin
    })
  })

  it('falls back to clipboard when native share not available', async () => {
    const user = userEvent.setup()
    // Remove native share support
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: undefined
    })
    
    render(<PurchaseConfirmation {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument()
    }, { timeout: 2000 })

    const shareButton = screen.getByText('Share')
    await user.click(shareButton)
    
    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining('Just purchased 2,600 KAI tokens!')
    )
  })

  it('downloads receipt when receipt button clicked', async () => {
    const user = userEvent.setup()
    
    // Mock URL.createObjectURL and related functions
    const mockCreateObjectURL = jest.fn(() => 'blob:mock-url')
    const mockRevokeObjectURL = jest.fn()
    const mockClick = jest.fn()
    const mockAppendChild = jest.fn()
    const mockRemoveChild = jest.fn()
    
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: mockCreateObjectURL
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: mockRevokeObjectURL
    })
    
    // Mock document.createElement
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick
    }
    const originalCreateElement = document.createElement
    document.createElement = jest.fn((tagName) => {
      if (tagName === 'a') return mockAnchor as any
      return originalCreateElement.call(document, tagName)
    })
    
    document.body.appendChild = mockAppendChild
    document.body.removeChild = mockRemoveChild
    
    render(<PurchaseConfirmation {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Receipt')).toBeInTheDocument()
    }, { timeout: 2000 })

    const receiptButton = screen.getByText('Receipt')
    await user.click(receiptButton)
    
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockAnchor.download).toBe('kai-receipt-TXN-123456789.txt')
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    
    // Restore original functions
    document.createElement = originalCreateElement
  })

  it('shows animation initially then details', async () => {
    render(<PurchaseConfirmation {...defaultProps} />)
    
    // Should show animation initially
    expect(screen.getByTestId('token-reward-animation')).toBeInTheDocument()
    
    // Details should appear after delay
    await waitFor(() => {
      expect(screen.getByText('Purchase Details')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('displays helpful tips section', () => {
    render(<PurchaseConfirmation {...defaultProps} />)
    
    expect(screen.getByText("What's Next?")).toBeInTheDocument()
    expect(screen.getByText('Browse trending topics and back your opinions')).toBeInTheDocument()
    expect(screen.getByText('Create your own prediction markets')).toBeInTheDocument()
    expect(screen.getByText('Earn rewards for accurate predictions')).toBeInTheDocument()
    expect(screen.getByText('Join the community discussions')).toBeInTheDocument()
  })

  it('handles large token amounts correctly', () => {
    const largeAmountDetails = {
      ...mockPurchaseDetails,
      tokens: 50000,
      bonusTokens: 5000
    }
    
    render(<PurchaseConfirmation {...defaultProps} purchaseDetails={largeAmountDetails} />)
    
    expect(screen.getByText('+55,000')).toBeInTheDocument() // Formatted with commas
  })

  it('resets animation state when modal reopens', () => {
    const { rerender } = render(<PurchaseConfirmation {...defaultProps} isOpen={false} />)
    
    // Open modal
    rerender(<PurchaseConfirmation {...defaultProps} isOpen={true} />)
    
    // Should show animation again
    expect(screen.getByTestId('token-reward-animation')).toBeInTheDocument()
  })
})