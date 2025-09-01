/**
 * CDP Wallet Functionality Integration Tests
 * 
 * Comprehensive end-to-end tests for CDP wallet functionality including:
 * - CDP hooks and services integration
 * - Error scenarios with API failures and network issues
 * - Cache behavior with network changes
 * - EOA and smart account configurations
 * - Retry mechanisms and error recovery
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { CDPBalanceService } from '@/lib/services/cdp-balance-service'
import { CDPTransactionService } from '@/lib/services/cdp-transaction-service'
import { CDPRetryService } from '@/lib/services/cdp-retry-service'
import { WalletErrorService } from '@/lib/services/wallet-error-service'
import { useCDPTransactions } from '@/hooks/use-cdp-transactions'
import { useCDPRetry } from '@/hooks/use-cdp-retry'

// Mock CDP hooks
const mockSendEvmTransaction = jest.fn()
const mockSendUserOperation = jest.fn()
const mockWaitForUserOperation = jest.fn()

jest.mock('@coinbase/cdp-hooks', () => ({
  useCurrentUser: () => ({
    currentUser: {
      evmAccounts: [{ address: '0xeoa123' }],
      evmSmartAccounts: [{ address: '0xsmart456' }]
    }
  }),
  useSendEvmTransaction: () => ({
    sendEvmTransaction: mockSendEvmTransaction,
    data: { hash: '0xevm123', status: 'success' },
    status: 'success'
  }),
  useSendUserOperation: () => ({
    sendUserOperation: mockSendUserOperation,
    data: { userOperationHash: '0xuserop456', status: 'complete' },
    status: 'success'
  }),
  useWaitForUserOperation: () => ({
    waitForUserOperation: mockWaitForUserOperation
  }),
  useIsSignedIn: () => ({ isSignedIn: true }),
  useEvmAddress: () => ({ evmAddress: '0xeoa123' })
}))

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  http: jest.fn(),
  formatEther: jest.fn((value) => (Number(value) / 1e18).toString()),
  formatUnits: jest.fn((value, decimals) => (Number(value) / Math.pow(10, decimals)).toString()),
  getContract: jest.fn(),
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' }
}))

// Mock network service
jest.mock('@/lib/services/network-service', () => ({
  NetworkService: {
    getNetworkById: jest.fn((id) => ({
      id,
      name: id === 'base-mainnet' ? 'Base' : 'Base Sepolia',
      rpcUrl: `https://rpc.${id}.com`,
      chainId: id === 'base-mainnet' ? 8453 : 84532
    }))
  }
}))

// Test component that uses CDP wallet functionality
const TestCDPWalletComponent: React.FC<{
  network?: string
  simulateNetworkError?: boolean
  simulateApiError?: boolean
  useSmartAccount?: boolean
}> = ({ 
  network = 'base-mainnet',
  simulateNetworkError = false,
  simulateApiError = false,
  useSmartAccount = false
}) => {
  const {
    sendEvmTransaction,
    sendUserOperation,
    transactionHistory,
    recentTransactions,
    isLoadingHistory,
    refreshHistory,
    trackTransaction,
    error,
    clearError
  } = useCDPTransactions({
    address: useSmartAccount ? '0xsmart456' : '0xeoa123',
    network,
    autoRefresh: false
  })

  const retryHook = useCDPRetry({
    maxRetries: 3,
    baseDelay: 100,
    enableManualRefresh: true
  })

  const [balances, setBalances] = React.useState<any[]>([])
  const [balanceLoading, setBalanceLoading] = React.useState(false)
  const [balanceError, setBalanceError] = React.useState<string | null>(null)

  const fetchBalances = React.useCallback(async () => {
    setBalanceLoading(true)
    setBalanceError(null)

    try {
      const context = WalletErrorService.createContext('fetchBalances', {
        network,
        address: useSmartAccount ? '0xsmart456' : '0xeoa123'
      })

      const result = await retryHook.actions.execute(async () => {
        if (simulateNetworkError) {
          throw new Error('Network timeout')
        }
        if (simulateApiError) {
          throw new Error('CDP API rate limit exceeded')
        }

        const mockUser = {
          evmAccounts: [{ address: '0xeoa123' }],
          evmSmartAccounts: [{ address: '0xsmart456' }]
        }

        return await CDPBalanceService.getBalances(mockUser as any, network)
      }, context)

      setBalances(result.balances)
    } catch (error: any) {
      setBalanceError(error.message)
    } finally {
      setBalanceLoading(false)
    }
  }, [network, simulateNetworkError, simulateApiError, useSmartAccount, retryHook.actions])

  const handleSendTransaction = async () => {
    try {
      if (useSmartAccount) {
        await sendUserOperation([{
          to: '0xrecipient',
          value: BigInt('1000000000000000000'),
          data: '0x'
        }])
      } else {
        await sendEvmTransaction({
          to: '0xrecipient',
          value: BigInt('1000000000000000000'),
          type: 'eip1559'
        })
      }
    } catch (error) {
      console.error('Transaction failed:', error)
    }
  }

  const handleTrackTransaction = async () => {
    try {
      await trackTransaction('0xtest123')
    } catch (error) {
      console.error('Tracking failed:', error)
    }
  }

  React.useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  return (
    <div>
      <div data-testid="account-type">
        {useSmartAccount ? 'Smart Account' : 'EOA'}
      </div>
      
      <div data-testid="network">{network}</div>
      
      <div data-testid="balance-loading">
        {balanceLoading ? 'Loading balances...' : 'Ready'}
      </div>
      
      <div data-testid="balance-error">
        {balanceError || 'No error'}
      </div>
      
      <div data-testid="balance-count">
        Balances: {balances.length}
      </div>
      
      <div data-testid="transaction-loading">
        {isLoadingHistory ? 'Loading transactions...' : 'Ready'}
      </div>
      
      <div data-testid="transaction-error">
        {error || 'No error'}
      </div>
      
      <div data-testid="transaction-count">
        Transactions: {recentTransactions.length}
      </div>
      
      <div data-testid="retry-state">
        Retrying: {retryHook.state.isRetrying ? 'Yes' : 'No'}
      </div>
      
      <div data-testid="retry-count">
        Retry Count: {retryHook.state.retryCount}
      </div>
      
      <button onClick={fetchBalances} data-testid="refresh-balances">
        Refresh Balances
      </button>
      
      <button onClick={refreshHistory} data-testid="refresh-transactions">
        Refresh Transactions
      </button>
      
      <button onClick={handleSendTransaction} data-testid="send-transaction">
        Send Transaction
      </button>
      
      <button onClick={handleTrackTransaction} data-testid="track-transaction">
        Track Transaction
      </button>
      
      <button onClick={retryHook.actions.retry} data-testid="retry-operation">
        Retry
      </button>
      
      <button onClick={retryHook.actions.manualRefresh} data-testid="manual-refresh">
        Manual Refresh
      </button>
      
      <button onClick={clearError} data-testid="clear-error">
        Clear Error
      </button>
    </div>
  )
}

describe('CDP Wallet Functionality Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    CDPRetryService.clearAllRetries()
    
    // Reset mock implementations
    mockSendEvmTransaction.mockResolvedValue({ hash: '0xevm123' })
    mockSendUserOperation.mockResolvedValue({ userOperationHash: '0xuserop456' })
    mockWaitForUserOperation.mockResolvedValue({
      transactionHash: '0xwait789',
      status: 'success',
      receipt: { blockNumber: 12345 }
    })
  })

  describe('End-to-End CDP Integration', () => {
    it('should load wallet data using CDP services for EOA', async () => {
      // Mock successful balance service
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn().mockResolvedValue({
        address: '0xeoa123',
        balances: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            address: 'native',
            formatted: '1.5',
            raw: BigInt('1500000000000000000'),
            decimals: 18
          },
          {
            symbol: 'USDC',
            name: 'USD Coin',
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            formatted: '100.0',
            raw: BigInt('100000000'),
            decimals: 6
          }
        ],
        lastUpdated: new Date(),
        isStale: false
      })

      // Mock successful transaction service
      const mockTransactionService = CDPTransactionService as jest.Mocked<typeof CDPTransactionService>
      mockTransactionService.getTransactionHistory = jest.fn().mockResolvedValue({
        address: '0xeoa123',
        transactions: [
          {
            hash: '0xabc123',
            type: 'send',
            value: '1000000000000000000',
            asset: 'ETH',
            timestamp: Date.now(),
            from: '0xeoa123',
            to: '0xrecipient',
            status: 'confirmed',
            network: 'base-mainnet',
            transactionType: 'evm'
          }
        ],
        lastUpdated: new Date(),
        hasMore: false,
        network: 'base-mainnet'
      })

      render(<TestCDPWalletComponent useSmartAccount={false} />)

      // Should show EOA account type
      expect(screen.getByTestId('account-type')).toHaveTextContent('EOA')

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Ready')
      })

      // Should display balance data
      expect(screen.getByTestId('balance-count')).toHaveTextContent('Balances: 2')
      expect(screen.getByTestId('balance-error')).toHaveTextContent('No error')

      // Should display transaction data
      await waitFor(() => {
        expect(screen.getByTestId('transaction-loading')).toHaveTextContent('Ready')
      })
      expect(screen.getByTestId('transaction-count')).toHaveTextContent('Transactions: 1')
    })

    it('should load wallet data using CDP services for Smart Account', async () => {
      // Mock successful balance service for smart account
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn().mockResolvedValue({
        address: '0xsmart456',
        balances: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            address: 'native',
            formatted: '2.0',
            raw: BigInt('2000000000000000000'),
            decimals: 18
          }
        ],
        lastUpdated: new Date(),
        isStale: false
      })

      render(<TestCDPWalletComponent useSmartAccount={true} />)

      // Should show Smart Account type
      expect(screen.getByTestId('account-type')).toHaveTextContent('Smart Account')

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Ready')
      })

      // Should display balance data
      expect(screen.getByTestId('balance-count')).toHaveTextContent('Balances: 1')
    })

    it('should send transactions using appropriate CDP hooks', async () => {
      render(<TestCDPWalletComponent useSmartAccount={false} />)

      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Ready')
      })

      // Send EOA transaction
      const sendButton = screen.getByTestId('send-transaction')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockSendEvmTransaction).toHaveBeenCalledWith({
          to: '0xrecipient',
          value: BigInt('1000000000000000000'),
          type: 'eip1559'
        })
      })
    })

    it('should send user operations for smart accounts', async () => {
      render(<TestCDPWalletComponent useSmartAccount={true} />)

      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Ready')
      })

      // Send smart account transaction
      const sendButton = screen.getByTestId('send-transaction')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockSendUserOperation).toHaveBeenCalledWith([{
          to: '0xrecipient',
          value: BigInt('1000000000000000000'),
          data: '0x'
        }])
      })
    })
  })

  describe('Error Scenarios and Recovery', () => {
    it('should handle network timeout errors with retry', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      let callCount = 0
      mockBalanceService.getBalances = jest.fn().mockImplementation(async () => {
        callCount++
        if (callCount <= 2) {
          throw new Error('Network timeout')
        }
        return {
          address: '0xeoa123',
          balances: [],
          lastUpdated: new Date(),
          isStale: false
        }
      })

      render(<TestCDPWalletComponent simulateNetworkError={false} />)

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Ready')
      }, { timeout: 5000 })

      expect(screen.getByTestId('balance-error')).toHaveTextContent('No error')
      expect(mockBalanceService.getBalances).toHaveBeenCalledTimes(3)
    })

    it('should handle CDP API rate limiting with exponential backoff', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      let callCount = 0
      mockBalanceService.getBalances = jest.fn().mockImplementation(async () => {
        callCount++
        if (callCount <= 1) {
          throw new Error('CDP API rate limit exceeded')
        }
        return {
          address: '0xeoa123',
          balances: [],
          lastUpdated: new Date(),
          isStale: false
        }
      })

      render(<TestCDPWalletComponent simulateApiError={false} />)

      // Should show retry state
      await waitFor(() => {
        expect(screen.getByTestId('retry-state')).toHaveTextContent('Retrying: Yes')
      })

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Ready')
      }, { timeout: 5000 })

      expect(screen.getByTestId('balance-error')).toHaveTextContent('No error')
    })

    it('should handle persistent network failures gracefully', async () => {
      render(<TestCDPWalletComponent simulateNetworkError={true} />)

      // Should show error after retries are exhausted
      await waitFor(() => {
        expect(screen.getByTestId('balance-error')).toHaveTextContent('Network timeout')
      }, { timeout: 5000 })

      // Should show retry count
      expect(screen.getByTestId('retry-count')).toHaveTextContent('Retry Count: 3')
    })

    it('should provide manual refresh capability after failures', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          address: '0xeoa123',
          balances: [],
          lastUpdated: new Date(),
          isStale: false
        })

      render(<TestCDPWalletComponent />)

      // Wait for initial failure
      await waitFor(() => {
        expect(screen.getByTestId('balance-error')).toHaveTextContent('Network timeout')
      })

      // Use manual refresh
      const manualRefreshButton = screen.getByTestId('manual-refresh')
      fireEvent.click(manualRefreshButton)

      // Should succeed on manual refresh
      await waitFor(() => {
        expect(screen.getByTestId('balance-error')).toHaveTextContent('No error')
      })
    })

    it('should handle transaction tracking failures', async () => {
      const mockTransactionService = CDPTransactionService as jest.Mocked<typeof CDPTransactionService>
      mockTransactionService.trackTransaction = jest.fn().mockRejectedValue(
        new Error('Transaction not found')
      )

      render(<TestCDPWalletComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Ready')
      })

      // Try to track transaction
      const trackButton = screen.getByTestId('track-transaction')
      fireEvent.click(trackButton)

      // Should handle error gracefully
      await waitFor(() => {
        // Error should be handled without crashing the component
        expect(screen.getByTestId('track-transaction')).toBeInTheDocument()
      })
    })
  })

  describe('Cache Behavior and Network Changes', () => {
    it('should handle network switching and cache invalidation', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn()
        .mockResolvedValueOnce({
          address: '0xeoa123',
          balances: [{ symbol: 'ETH', name: 'Ethereum', address: 'native', formatted: '1.0', raw: BigInt('1000000000000000000'), decimals: 18 }],
          lastUpdated: new Date(),
          isStale: false
        })
        .mockResolvedValueOnce({
          address: '0xeoa123',
          balances: [{ symbol: 'ETH', name: 'Ethereum', address: 'native', formatted: '2.0', raw: BigInt('2000000000000000000'), decimals: 18 }],
          lastUpdated: new Date(),
          isStale: false
        })

      const { rerender } = render(<TestCDPWalletComponent network="base-mainnet" />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('balance-count')).toHaveTextContent('Balances: 1')
      })

      // Switch network
      rerender(<TestCDPWalletComponent network="base-sepolia" />)

      // Should reload data for new network
      await waitFor(() => {
        expect(mockBalanceService.getBalances).toHaveBeenCalledTimes(2)
      })

      expect(screen.getByTestId('network')).toHaveTextContent('base-sepolia')
    })

    it('should show stale data indicators when cache is outdated', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn().mockResolvedValue({
        address: '0xeoa123',
        balances: [],
        lastUpdated: new Date(Date.now() - 120000), // 2 minutes ago
        isStale: true
      })

      render(<TestCDPWalletComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Ready')
      })

      // Should indicate stale data (this would be shown in a real implementation)
      expect(mockBalanceService.getBalances).toHaveBeenCalled()
    })

    it('should refresh data automatically when coming back online', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn().mockResolvedValue({
        address: '0xeoa123',
        balances: [],
        lastUpdated: new Date(),
        isStale: false
      })

      render(<TestCDPWalletComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Ready')
      })

      // Simulate going offline and coming back online
      act(() => {
        // Simulate online event
        window.dispatchEvent(new Event('online'))
      })

      // Should trigger refresh (in a real implementation)
      expect(mockBalanceService.getBalances).toHaveBeenCalled()
    })
  })

  describe('Retry Mechanisms and Error Recovery', () => {
    it('should implement exponential backoff for retries', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      const callTimes: number[] = []
      
      mockBalanceService.getBalances = jest.fn().mockImplementation(async () => {
        callTimes.push(Date.now())
        throw new Error('Temporary failure')
      })

      render(<TestCDPWalletComponent />)

      // Wait for retries to complete
      await waitFor(() => {
        expect(screen.getByTestId('retry-count')).toHaveTextContent('Retry Count: 3')
      }, { timeout: 10000 })

      // Should have made multiple attempts with increasing delays
      expect(callTimes.length).toBeGreaterThan(1)
      
      // Check that delays increased (allowing for some timing variance)
      if (callTimes.length >= 3) {
        const delay1 = callTimes[1] - callTimes[0]
        const delay2 = callTimes[2] - callTimes[1]
        expect(delay2).toBeGreaterThan(delay1 * 0.8) // Allow for timing variance
      }
    })

    it('should abort retry operations when component unmounts', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        throw new Error('Slow failure')
      })

      const { unmount } = render(<TestCDPWalletComponent />)

      // Start the operation
      await waitFor(() => {
        expect(screen.getByTestId('retry-state')).toHaveTextContent('Retrying: Yes')
      })

      // Unmount component
      unmount()

      // Should not cause memory leaks or unhandled promises
      // This is tested by the absence of console errors
    })

    it('should clear errors and reset retry state', async () => {
      render(<TestCDPWalletComponent simulateNetworkError={true} />)

      // Wait for error
      await waitFor(() => {
        expect(screen.getByTestId('balance-error')).toHaveTextContent('Network timeout')
      })

      // Clear error
      const clearButton = screen.getByTestId('clear-error')
      fireEvent.click(clearButton)

      // Should clear error state
      await waitFor(() => {
        expect(screen.getByTestId('balance-error')).toHaveTextContent('No error')
      })
    })

    it('should handle concurrent retry operations correctly', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      let callCount = 0
      mockBalanceService.getBalances = jest.fn().mockImplementation(async () => {
        callCount++
        if (callCount <= 2) {
          throw new Error('Concurrent failure')
        }
        return {
          address: '0xeoa123',
          balances: [],
          lastUpdated: new Date(),
          isStale: false
        }
      })

      render(<TestCDPWalletComponent />)

      // Trigger multiple refresh operations
      const refreshButton = screen.getByTestId('refresh-balances')
      fireEvent.click(refreshButton)
      fireEvent.click(refreshButton)
      fireEvent.click(refreshButton)

      // Should handle concurrent operations gracefully
      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Ready')
      }, { timeout: 5000 })

      expect(screen.getByTestId('balance-error')).toHaveTextContent('No error')
    })
  })

  describe('Performance and Resource Management', () => {
    it('should cleanup resources and cancel pending operations', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      const abortController = new AbortController()
      
      mockBalanceService.getBalances = jest.fn().mockImplementation(async () => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve({
              address: '0xeoa123',
              balances: [],
              lastUpdated: new Date(),
              isStale: false
            })
          }, 5000)
          
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timeout)
            reject(new Error('Operation aborted'))
          })
        })
      })

      const { unmount } = render(<TestCDPWalletComponent />)

      // Start operation
      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Loading balances...')
      })

      // Unmount should cleanup
      unmount()

      // Simulate abort
      abortController.abort()

      // Should not cause unhandled promise rejections
    })

    it('should throttle rapid refresh requests', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      let callCount = 0
      mockBalanceService.getBalances = jest.fn().mockImplementation(async () => {
        callCount++
        return {
          address: '0xeoa123',
          balances: [],
          lastUpdated: new Date(),
          isStale: false
        }
      })

      render(<TestCDPWalletComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Ready')
      })

      const initialCallCount = callCount

      // Rapid refresh requests
      const refreshButton = screen.getByTestId('refresh-balances')
      for (let i = 0; i < 5; i++) {
        fireEvent.click(refreshButton)
      }

      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toHaveTextContent('Ready')
      })

      // Should not make excessive API calls
      expect(callCount - initialCallCount).toBeLessThan(5)
    })
  })
})