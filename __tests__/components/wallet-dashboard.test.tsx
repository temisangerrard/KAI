import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WalletDashboard } from '@/app/wallet/wallet-dashboard'
import { useAuth } from '@/app/auth/auth-context'
import { TokenBalanceService } from '@/lib/services/token-balance-service'

// Mock dependencies
jest.mock('@/app/auth/auth-context')
jest.mock('@/lib/services/token-balance-service')
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn((ref, onNext) => {
    // Mock successful snapshot
    setTimeout(() => {
      onNext({
        exists: () => false,
        data: () => null
      })
    }, 0)
    return jest.fn() // Return unsubscribe function
  }),
  doc: jest.fn()
}))
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com'
}

const mockBalance = {
  userId: 'test-user-id',
  availableTokens: 2500,
  committedTokens: 750,
  totalEarned: 3500,
  totalSpent: 250,
  lastUpdated: { toDate: () => new Date(), toMillis: () => Date.now() } as any,
  version: 1
}

describe('WalletDashboard', () => {
  const defaultProps = {
    onPurchaseClick: jest.fn(),
    onWithdrawClick: jest.fn(),
    onViewPrediction: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
    ;(TokenBalanceService.getUserBalance as jest.Mock).mockResolvedValue(mockBalance)
    ;(TokenBalanceService.createInitialBalance as jest.Mock).mockResolvedValue(mockBalance)
  })

  it('renders loading state initially', () => {
    render(<WalletDashboard {...defaultProps} />)
    
    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders wallet dashboard with balance and stats', async () => {
    render(<WalletDashboard {...defaultProps} />)
    
    await waitFor(() => {
      // Should show balance
      expect(screen.getByText('2,500')).toBeInTheDocument() // Available tokens
      expect(screen.getByText('750')).toBeInTheDocument() // Committed tokens
      expect(screen.getByText('3,250')).toBeInTheDocument() // Total balance (2500 + 750)
      expect(screen.getByText('+3,250')).toBeInTheDocument() // Net earnings (3500 - 250)
    })
  })

  it('displays quick action buttons', async () => {
    render(<WalletDashboard {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Buy Tokens')).toBeInTheDocument()
      expect(screen.getByText('Withdraw')).toBeInTheDocument()
      expect(screen.getByText('Show Details')).toBeInTheDocument()
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })
  })

  it('calls onPurchaseClick when buy tokens is clicked', async () => {
    render(<WalletDashboard {...defaultProps} />)
    
    await waitFor(() => {
      const buyButton = screen.getByText('Buy Tokens')
      fireEvent.click(buyButton)
      expect(defaultProps.onPurchaseClick).toHaveBeenCalled()
    })
  })

  it('calls onWithdrawClick when withdraw is clicked', async () => {
    render(<WalletDashboard {...defaultProps} />)
    
    await waitFor(() => {
      const withdrawButton = screen.getByText('Withdraw')
      fireEvent.click(withdrawButton)
      expect(defaultProps.onWithdrawClick).toHaveBeenCalled()
    })
  })

  it('disables withdraw button when no available tokens', async () => {
    const zeroBalance = { ...mockBalance, availableTokens: 0 }
    ;(TokenBalanceService.getUserBalance as jest.Mock).mockResolvedValue(zeroBalance)
    
    render(<WalletDashboard {...defaultProps} />)
    
    await waitFor(() => {
      const withdrawButton = screen.getByText('Withdraw')
      expect(withdrawButton).toBeDisabled()
    })
  })

  it('toggles balance details visibility', async () => {
    render(<WalletDashboard {...defaultProps} />)
    
    await waitFor(() => {
      const toggleButton = screen.getByText('Hide Details')
      fireEvent.click(toggleButton)
      expect(screen.getByText('Show Details')).toBeInTheDocument()
    })
  })

  it('refreshes data when refresh button is clicked', async () => {
    render(<WalletDashboard {...defaultProps} />)
    
    await waitFor(() => {
      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)
      
      // Should call the service again
      expect(TokenBalanceService.getUserBalance).toHaveBeenCalledTimes(2)
    })
  })

  it('creates initial balance if none exists', async () => {
    ;(TokenBalanceService.getUserBalance as jest.Mock).mockResolvedValue(null)
    
    render(<WalletDashboard {...defaultProps} />)
    
    await waitFor(() => {
      expect(TokenBalanceService.createInitialBalance).toHaveBeenCalledWith('test-user-id')
    })
  })

  it('displays transaction history section', async () => {
    render(<WalletDashboard {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeInTheDocument()
    })
  })

  it('handles user not logged in', () => {
    ;(useAuth as jest.Mock).mockReturnValue({ user: null })
    
    render(<WalletDashboard {...defaultProps} />)
    
    // Should show loading state when no user
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('displays correct quick stats calculations', async () => {
    render(<WalletDashboard {...defaultProps} />)
    
    await waitFor(() => {
      // Total Balance = availableTokens + committedTokens = 2500 + 750 = 3250
      expect(screen.getByText('3,250')).toBeInTheDocument()
      
      // Net Earnings = totalEarned - totalSpent = 3500 - 250 = 3250
      expect(screen.getByText('+3,250')).toBeInTheDocument()
      
      // Committed tokens = 750
      expect(screen.getByText('750')).toBeInTheDocument()
    })
  })

  it('handles negative net earnings display', async () => {
    const negativeBalance = { ...mockBalance, totalEarned: 100, totalSpent: 200 }
    ;(TokenBalanceService.getUserBalance as jest.Mock).mockResolvedValue(negativeBalance)
    
    render(<WalletDashboard {...defaultProps} />)
    
    await waitFor(() => {
      // Net Earnings = 100 - 200 = -100
      expect(screen.getByText('-100')).toBeInTheDocument()
    })
  })
})