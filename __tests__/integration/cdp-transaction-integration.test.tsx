/**
 * Integration tests for CDP Transaction Service with React components
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useCDPTransactions } from '@/hooks/use-cdp-transactions'
import { CDPTransactionService } from '@/lib/services/cdp-transaction-service'

// Mock CDP hooks
jest.mock('@coinbase/cdp-hooks', () => ({
  useSendEvmTransaction: () => ({
    sendEvmTransaction: jest.fn().mockResolvedValue({ hash: '0x123' }),
    data: { hash: '0x123', status: 'success' },
    status: 'success'
  }),
  useSendUserOperation: () => ({
    sendUserOperation: jest.fn().mockResolvedValue({ userOperationHash: '0x456' }),
    data: { userOperationHash: '0x456', status: 'complete' },
    status: 'success'
  }),
  useCurrentUser: () => ({
    currentUser: {
      evmSmartAccounts: [{ address: '0xsmart123' }]
    }
  })
}))

// Mock CDP Transaction Service
jest.mock('@/lib/services/cdp-transaction-service', () => ({
  CDPTransactionService: {
    getTransactionHistory: jest.fn().mockResolvedValue({
      address: '0x123',
      transactions: [
        {
          hash: '0xabc',
          type: 'send',
          value: '1000000000000000000',
          asset: 'ETH',
          timestamp: Date.now(),
          from: '0x123',
          to: '0x456',
          status: 'confirmed',
          network: 'base-mainnet',
          transactionType: 'evm'
        }
      ],
      lastUpdated: new Date(),
      hasMore: false,
      network: 'base-mainnet'
    }),
    trackTransaction: jest.fn().mockResolvedValue({
      hash: '0x123',
      status: 'confirmed',
      confirmations: 1
    }),
    createTransactionRecord: jest.fn().mockReturnValue({
      hash: '0x123',
      type: 'send',
      value: '1000000000000000000',
      asset: 'ETH',
      timestamp: Date.now(),
      from: '0x123',
      to: '0x456',
      status: 'confirmed',
      network: 'base-mainnet',
      transactionType: 'evm'
    }),
    clearCache: jest.fn()
  }
}))

// Test component that uses the CDP transaction hook
const TestTransactionComponent: React.FC<{ address: string }> = ({ address }) => {
  const {
    transactionHistory,
    recentTransactions,
    isLoadingHistory,
    sendEvmTransaction,
    sendUserOperation,
    refreshHistory,
    trackTransaction,
    error
  } = useCDPTransactions({
    address,
    network: 'base-mainnet'
  })

  const handleSendEth = async () => {
    await sendEvmTransaction({
      to: '0x456',
      value: BigInt('1000000000000000000'),
      type: 'eip1559'
    })
  }

  const handleSendUserOp = async () => {
    await sendUserOperation([{
      to: '0x456',
      value: BigInt('1000000000000000000'),
      data: '0x'
    }])
  }

  const handleTrackTx = async () => {
    await trackTransaction('0x123')
  }

  if (error) {
    return <div data-testid="error">Error: {error}</div>
  }

  return (
    <div>
      <div data-testid="loading">{isLoadingHistory ? 'Loading...' : 'Ready'}</div>
      
      <div data-testid="transaction-count">
        Transactions: {recentTransactions.length}
      </div>
      
      <div data-testid="transaction-list">
        {recentTransactions.map((tx, index) => (
          <div key={tx.hash || index} data-testid={`transaction-${index}`}>
            {tx.hash} - {tx.status} - {tx.value} {tx.asset}
          </div>
        ))}
      </div>
      
      <button onClick={handleSendEth} data-testid="send-eth">
        Send ETH
      </button>
      
      <button onClick={handleSendUserOp} data-testid="send-user-op">
        Send User Operation
      </button>
      
      <button onClick={refreshHistory} data-testid="refresh">
        Refresh
      </button>
      
      <button onClick={handleTrackTx} data-testid="track-tx">
        Track Transaction
      </button>
    </div>
  )
}

describe('CDP Transaction Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should load and display transaction history', async () => {
    render(<TestTransactionComponent address="0x123" />)

    // Should show loading initially
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading...')

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready')
    })

    // Should display transaction count
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('Transactions: 1')

    // Should display transaction details
    const transaction = screen.getByTestId('transaction-0')
    expect(transaction).toHaveTextContent('0xabc')
    expect(transaction).toHaveTextContent('confirmed')
    expect(transaction).toHaveTextContent('1000000000000000000 ETH')
  })

  it('should handle sending EVM transaction', async () => {
    render(<TestTransactionComponent address="0x123" />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready')
    })

    const sendButton = screen.getByTestId('send-eth')
    fireEvent.click(sendButton)

    // Should call the CDP hook
    await waitFor(() => {
      expect(require('@coinbase/cdp-hooks').useSendEvmTransaction().sendEvmTransaction)
        .toHaveBeenCalled()
    })
  })

  it('should handle sending user operation', async () => {
    render(<TestTransactionComponent address="0x123" />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready')
    })

    const sendButton = screen.getByTestId('send-user-op')
    fireEvent.click(sendButton)

    // Should call the CDP hook
    await waitFor(() => {
      expect(require('@coinbase/cdp-hooks').useSendUserOperation().sendUserOperation)
        .toHaveBeenCalled()
    })
  })

  it('should handle refreshing transaction history', async () => {
    render(<TestTransactionComponent address="0x123" />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready')
    })

    const refreshButton = screen.getByTestId('refresh')
    fireEvent.click(refreshButton)

    // Should call the service again
    await waitFor(() => {
      expect(CDPTransactionService.getTransactionHistory).toHaveBeenCalledTimes(2)
    })
  })

  it('should handle tracking transaction', async () => {
    render(<TestTransactionComponent address="0x123" />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready')
    })

    const trackButton = screen.getByTestId('track-tx')
    fireEvent.click(trackButton)

    // Should call the tracking service
    await waitFor(() => {
      expect(CDPTransactionService.trackTransaction).toHaveBeenCalledWith('0x123', 'base-mainnet')
    })
  })

  it('should handle service errors gracefully', async () => {
    // Mock service to throw error
    const mockService = CDPTransactionService as jest.Mocked<typeof CDPTransactionService>
    mockService.getTransactionHistory.mockRejectedValue(new Error('Service error'))

    render(<TestTransactionComponent address="0x123" />)

    // Should display error
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Error: Service error')
    })
  })

  it('should handle component without address', () => {
    render(<TestTransactionComponent address="" />)

    // Should not crash and show ready state
    expect(screen.getByTestId('loading')).toHaveTextContent('Ready')
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('Transactions: 0')
  })

  it('should update transaction list when new transactions are added', async () => {
    const mockService = CDPTransactionService as jest.Mocked<typeof CDPTransactionService>
    
    // Start with empty history
    mockService.getTransactionHistory.mockResolvedValueOnce({
      address: '0x123',
      transactions: [],
      lastUpdated: new Date(),
      hasMore: false,
      network: 'base-mainnet'
    })

    render(<TestTransactionComponent address="0x123" />)

    await waitFor(() => {
      expect(screen.getByTestId('transaction-count')).toHaveTextContent('Transactions: 0')
    })

    // Mock service to return transaction after refresh
    mockService.getTransactionHistory.mockResolvedValueOnce({
      address: '0x123',
      transactions: [
        {
          hash: '0xnew',
          type: 'send',
          value: '2000000000000000000',
          asset: 'ETH',
          timestamp: Date.now(),
          from: '0x123',
          to: '0x789',
          status: 'pending',
          network: 'base-mainnet',
          transactionType: 'evm'
        }
      ],
      lastUpdated: new Date(),
      hasMore: false,
      network: 'base-mainnet'
    })

    // Refresh to get new transaction
    const refreshButton = screen.getByTestId('refresh')
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(screen.getByTestId('transaction-count')).toHaveTextContent('Transactions: 1')
    })

    // Should display new transaction
    const transaction = screen.getByTestId('transaction-0')
    expect(transaction).toHaveTextContent('0xnew')
    expect(transaction).toHaveTextContent('pending')
    expect(transaction).toHaveTextContent('2000000000000000000 ETH')
  })
})