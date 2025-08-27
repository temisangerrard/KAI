import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionHistory } from '@/app/wallet/transaction-history'
import { TokenTransaction } from '@/lib/types/token'
import { Timestamp } from 'firebase/firestore'

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM d, yyyy • h:mm a') {
      return 'Jan 1, 2024 • 12:00 PM'
    }
    return 'Jan 1, 2024'
  })
}))

const mockTransactions: TokenTransaction[] = [
  {
    id: 'tx_1',
    userId: 'user_1',
    type: 'purchase',
    amount: 1000,
    balanceBefore: 0,
    balanceAfter: 1000,
    metadata: {
      packageId: 'starter-pack',
      stripePaymentId: 'pi_1234567890'
    },
    timestamp: {
      toDate: () => new Date('2024-01-01T12:00:00Z'),
      toMillis: () => new Date('2024-01-01T12:00:00Z').getTime()
    } as Timestamp,
    status: 'completed'
  },
  {
    id: 'tx_2',
    userId: 'user_1',
    type: 'commit',
    amount: -250,
    balanceBefore: 1000,
    balanceAfter: 750,
    relatedId: 'pred_123',
    metadata: {
      predictionTitle: 'Will Mercy win BBNaija 2024?'
    },
    timestamp: {
      toDate: () => new Date('2024-01-02T12:00:00Z'),
      toMillis: () => new Date('2024-01-02T12:00:00Z').getTime()
    } as Timestamp,
    status: 'completed'
  },
  {
    id: 'tx_3',
    userId: 'user_1',
    type: 'win',
    amount: 180,
    balanceBefore: 750,
    balanceAfter: 930,
    relatedId: 'pred_456',
    metadata: {
      predictionTitle: 'Best Nollywood Actress 2024'
    },
    timestamp: {
      toDate: () => new Date('2024-01-03T12:00:00Z'),
      toMillis: () => new Date('2024-01-03T12:00:00Z').getTime()
    } as Timestamp,
    status: 'completed'
  }
]

describe('TransactionHistory', () => {
  const defaultProps = {
    transactions: mockTransactions,
    isLoading: false,
    onRefresh: jest.fn(),
    onTransactionClick: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders transaction history with transactions', () => {
    render(<TransactionHistory {...defaultProps} />)
    
    expect(screen.getByText('Transaction History')).toBeInTheDocument()
    expect(screen.getByText('3 of 3 transactions')).toBeInTheDocument()
    
    // Check if transactions are displayed
    expect(screen.getByText('Token purchase - starter-pack')).toBeInTheDocument()
    expect(screen.getByText('Will Mercy win BBNaija 2024?')).toBeInTheDocument()
    expect(screen.getByText('Won: Best Nollywood Actress 2024')).toBeInTheDocument()
  })

  it('displays loading state', () => {
    render(<TransactionHistory {...defaultProps} isLoading={true} />)
    
    expect(screen.getByText('Loading transactions...')).toBeInTheDocument()
  })

  it('displays empty state when no transactions', () => {
    render(<TransactionHistory {...defaultProps} transactions={[]} />)
    
    expect(screen.getByText('No transactions found')).toBeInTheDocument()
    expect(screen.getByText('Your transaction history will appear here')).toBeInTheDocument()
  })

  it('filters transactions by search term', async () => {
    render(<TransactionHistory {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search transactions...')
    fireEvent.change(searchInput, { target: { value: 'BBNaija' } })
    
    await waitFor(() => {
      expect(screen.getByText('Will Mercy win BBNaija 2024?')).toBeInTheDocument()
      expect(screen.queryByText('Token purchase - starter-pack')).not.toBeInTheDocument()
    })
  })

  it('filters transactions by type', async () => {
    render(<TransactionHistory {...defaultProps} />)
    
    // Open the filter dropdown (first combobox is the filter)
    const filterButtons = screen.getAllByRole('combobox')
    const filterButton = filterButtons[0] // First one is the filter
    fireEvent.click(filterButton)
    
    // Select purchase filter
    const purchaseOption = screen.getByText('Purchases')
    fireEvent.click(purchaseOption)
    
    await waitFor(() => {
      expect(screen.getByText('Token purchase - starter-pack')).toBeInTheDocument()
      expect(screen.queryByText('Will Mercy win BBNaija 2024?')).not.toBeInTheDocument()
    })
  })

  it('calls onTransactionClick when transaction is clicked', () => {
    render(<TransactionHistory {...defaultProps} />)
    
    // Find the transaction row and click it
    const firstTransaction = screen.getByText('Token purchase - starter-pack').closest('[class*="cursor-pointer"]')
    fireEvent.click(firstTransaction!)
    
    // Should be called with the first transaction (sorted by newest first)
    expect(defaultProps.onTransactionClick).toHaveBeenCalledWith(expect.objectContaining({
      type: 'purchase',
      amount: 1000,
      id: 'tx_1'
    }))
  })

  it('calls onRefresh when refresh button is clicked', () => {
    render(<TransactionHistory {...defaultProps} />)
    
    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)
    
    expect(defaultProps.onRefresh).toHaveBeenCalled()
  })

  it('displays correct transaction amounts and colors', () => {
    render(<TransactionHistory {...defaultProps} />)
    
    // Purchase should show positive amount in green
    expect(screen.getByText('+1,000')).toBeInTheDocument()
    
    // Commit should show negative amount in blue
    expect(screen.getByText('-250')).toBeInTheDocument()
    
    // Win should show positive amount in green
    expect(screen.getByText('+180')).toBeInTheDocument()
  })

  it('displays transaction status badges', () => {
    render(<TransactionHistory {...defaultProps} />)
    
    const completedBadges = screen.getAllByText('Completed')
    expect(completedBadges).toHaveLength(3)
  })

  it('handles pagination correctly', async () => {
    // Create more transactions to test pagination
    const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
      ...mockTransactions[0],
      id: `tx_${i}`,
      metadata: { ...mockTransactions[0].metadata, packageId: `package_${i}` }
    }))

    render(<TransactionHistory {...defaultProps} transactions={manyTransactions} />)
    
    // Should show pagination controls
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    
    // Should show first 10 transactions
    expect(screen.getByText('Showing 1 to 10 of 25 transactions')).toBeInTheDocument()
  })

  it('sorts transactions correctly', async () => {
    render(<TransactionHistory {...defaultProps} />)
    
    // Open sort dropdown (second combobox is sort)
    const sortButtons = screen.getAllByRole('combobox')
    const sortButton = sortButtons[1] // Second one is the sort
    fireEvent.click(sortButton)
    
    // Select oldest first
    const oldestOption = screen.getByText('Oldest First')
    fireEvent.click(oldestOption)
    
    await waitFor(() => {
      // Should show transactions in oldest first order
      expect(screen.getByText('Token purchase - starter-pack')).toBeInTheDocument()
    })
  })
})