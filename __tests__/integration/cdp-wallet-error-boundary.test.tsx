/**
 * CDP Wallet Error Boundary Integration Tests
 * 
 * Tests error boundary behavior with CDP wallet components including:
 * - Component crash recovery
 * - CDP-specific error handling
 * - Error boundary fallback UI
 * - Error reporting and logging
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ErrorBoundary } from 'react-error-boundary'
import { CDPBalanceService } from '@/lib/services/cdp-balance-service'
import { CDPTransactionService } from '@/lib/services/cdp-transaction-service'
import { WalletErrorService } from '@/lib/services/wallet-error-service'

// Mock CDP hooks
jest.mock('@coinbase/cdp-hooks', () => ({
  useCurrentUser: () => ({
    currentUser: {
      evmAccounts: [{ address: '0xtest123' }],
      evmSmartAccounts: [{ address: '0xsmart456' }]
    }
  }),
  useIsSignedIn: () => ({ isSignedIn: true }),
  useEvmAddress: () => ({ evmAddress: '0xtest123' }),
  useSendEvmTransaction: () => ({
    sendEvmTransaction: jest.fn(),
    data: null,
    status: 'idle'
  }),
  useSendUserOperation: () => ({
    sendUserOperation: jest.fn(),
    data: null,
    status: 'idle'
  })
}))

// Mock console.error to test error logging
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

// Error boundary fallback component
const ErrorFallback: React.FC<{
  error: Error
  resetErrorBoundary: () => void
}> = ({ error, resetErrorBoundary }) => (
  <div data-testid="error-boundary">
    <h2>Wallet Error</h2>
    <p data-testid="error-message">{error.message}</p>
    <button onClick={resetErrorBoundary} data-testid="retry-button">
      Try Again
    </button>
  </div>
)

// Component that throws errors for testing
const ErrorThrowingComponent: React.FC<{
  shouldThrow?: boolean
  errorType?: 'render' | 'effect' | 'async'
  errorMessage?: string
}> = ({ 
  shouldThrow = false, 
  errorType = 'render',
  errorMessage = 'Test error'
}) => {
  const [asyncError, setAsyncError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (shouldThrow && errorType === 'effect') {
      throw new Error(errorMessage)
    }
  }, [shouldThrow, errorType, errorMessage])

  React.useEffect(() => {
    if (shouldThrow && errorType === 'async') {
      setTimeout(() => {
        setAsyncError(new Error(errorMessage))
      }, 100)
    }
  }, [shouldThrow, errorType, errorMessage])

  if (asyncError) {
    throw asyncError
  }

  if (shouldThrow && errorType === 'render') {
    throw new Error(errorMessage)
  }

  return (
    <div data-testid="working-component">
      Component is working
    </div>
  )
}

// CDP Balance component that can fail
const CDPBalanceComponent: React.FC<{
  shouldFail?: boolean
  failureType?: 'network' | 'api' | 'parsing'
}> = ({ shouldFail = false, failureType = 'network' }) => {
  const [balances, setBalances] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchBalances = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (shouldFail) {
        switch (failureType) {
          case 'network':
            throw new Error('Network connection failed')
          case 'api':
            throw new Error('CDP API rate limit exceeded')
          case 'parsing':
            throw new Error('Failed to parse balance data')
          default:
            throw new Error('Unknown error')
        }
      }

      const mockUser = {
        evmAccounts: [{ address: '0xtest123' }],
        evmSmartAccounts: []
      }

      const result = await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')
      setBalances(result.balances)
    } catch (err: any) {
      setError(err.message)
      // Re-throw to trigger error boundary
      throw err
    } finally {
      setLoading(false)
    }
  }, [shouldFail, failureType])

  React.useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  if (loading) {
    return <div data-testid="balance-loading">Loading balances...</div>
  }

  if (error) {
    return <div data-testid="balance-error">Error: {error}</div>
  }

  return (
    <div data-testid="balance-component">
      <div data-testid="balance-count">Balances: {balances.length}</div>
      <button onClick={fetchBalances} data-testid="refresh-balances">
        Refresh
      </button>
    </div>
  )
}

// CDP Transaction component that can fail
const CDPTransactionComponent: React.FC<{
  shouldFail?: boolean
  failureType?: 'send' | 'track' | 'history'
}> = ({ shouldFail = false, failureType = 'send' }) => {
  const [transactions, setTransactions] = React.useState<any[]>([])
  const [sending, setSending] = React.useState(false)

  const sendTransaction = async () => {
    setSending(true)
    try {
      if (shouldFail && failureType === 'send') {
        throw new Error('Transaction failed: insufficient funds')
      }
      
      // Simulate successful transaction
      setTimeout(() => setSending(false), 1000)
    } catch (err) {
      setSending(false)
      throw err
    }
  }

  const trackTransaction = async () => {
    try {
      if (shouldFail && failureType === 'track') {
        throw new Error('Transaction tracking failed')
      }
      
      await CDPTransactionService.trackTransaction('0xtest123', 'base-mainnet')
    } catch (err) {
      throw err
    }
  }

  const loadHistory = async () => {
    try {
      if (shouldFail && failureType === 'history') {
        throw new Error('Failed to load transaction history')
      }
      
      const history = await CDPTransactionService.getTransactionHistory('0xtest123', 'base-mainnet')
      setTransactions(history.transactions)
    } catch (err) {
      throw err
    }
  }

  React.useEffect(() => {
    loadHistory()
  }, [])

  return (
    <div data-testid="transaction-component">
      <div data-testid="transaction-count">Transactions: {transactions.length}</div>
      <button 
        onClick={sendTransaction} 
        disabled={sending}
        data-testid="send-transaction"
      >
        {sending ? 'Sending...' : 'Send Transaction'}
      </button>
      <button onClick={trackTransaction} data-testid="track-transaction">
        Track Transaction
      </button>
      <button onClick={loadHistory} data-testid="load-history">
        Load History
      </button>
    </div>
  )
}

describe('CDP Wallet Error Boundary Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConsoleError.mockClear()
  })

  afterAll(() => {
    mockConsoleError.mockRestore()
  })

  describe('Basic Error Boundary Functionality', () => {
    it('should catch render errors and display fallback UI', () => {
      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="render"
            errorMessage="Render error occurred"
          />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      expect(screen.getByTestId('error-message')).toHaveTextContent('Render error occurred')
      expect(screen.queryByTestId('working-component')).not.toBeInTheDocument()
    })

    it('should catch useEffect errors and display fallback UI', async () => {
      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="effect"
            errorMessage="Effect error occurred"
          />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-message')).toHaveTextContent('Effect error occurred')
    })

    it('should allow error boundary reset and component recovery', async () => {
      const { rerender } = render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorType="render"
            errorMessage="Initial error"
          />
        </ErrorBoundary>
      )

      // Should show error boundary
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()

      // Click retry button
      const retryButton = screen.getByTestId('retry-button')
      fireEvent.click(retryButton)

      // Rerender with working component
      rerender(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('working-component')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument()
    })
  })

  describe('CDP Balance Service Error Handling', () => {
    it('should handle CDP balance service network errors', async () => {
      // Mock balance service to fail
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn().mockRejectedValue(
        new Error('Network connection failed')
      )

      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <CDPBalanceComponent shouldFail={true} failureType="network" />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-message')).toHaveTextContent('Network connection failed')
    })

    it('should handle CDP API rate limiting errors', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn().mockRejectedValue(
        new Error('CDP API rate limit exceeded')
      )

      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <CDPBalanceComponent shouldFail={true} failureType="api" />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-message')).toHaveTextContent('CDP API rate limit exceeded')
    })

    it('should handle balance data parsing errors', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn().mockRejectedValue(
        new Error('Failed to parse balance data')
      )

      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <CDPBalanceComponent shouldFail={true} failureType="parsing" />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to parse balance data')
    })

    it('should recover from balance service errors after retry', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({
          address: '0xtest123',
          balances: [
            {
              symbol: 'ETH',
              name: 'Ethereum',
              address: 'native',
              formatted: '1.0',
              raw: BigInt('1000000000000000000'),
              decimals: 18
            }
          ],
          lastUpdated: new Date(),
          isStale: false
        })

      const { rerender } = render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <CDPBalanceComponent shouldFail={true} failureType="network" />
        </ErrorBoundary>
      )

      // Should show error boundary initially
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      })

      // Click retry
      const retryButton = screen.getByTestId('retry-button')
      fireEvent.click(retryButton)

      // Rerender with working component
      rerender(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <CDPBalanceComponent shouldFail={false} />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('balance-component')).toBeInTheDocument()
      })

      expect(screen.getByTestId('balance-count')).toHaveTextContent('Balances: 1')
    })
  })

  describe('CDP Transaction Service Error Handling', () => {
    it('should handle transaction send failures', async () => {
      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <CDPTransactionComponent shouldFail={true} failureType="send" />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('transaction-component')).toBeInTheDocument()
      })

      // Try to send transaction
      const sendButton = screen.getByTestId('send-transaction')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-message')).toHaveTextContent('Transaction failed: insufficient funds')
    })

    it('should handle transaction tracking failures', async () => {
      const mockTransactionService = CDPTransactionService as jest.Mocked<typeof CDPTransactionService>
      mockTransactionService.getTransactionHistory = jest.fn().mockResolvedValue({
        address: '0xtest123',
        transactions: [],
        lastUpdated: new Date(),
        hasMore: false,
        network: 'base-mainnet'
      })

      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <CDPTransactionComponent shouldFail={true} failureType="track" />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('transaction-component')).toBeInTheDocument()
      })

      // Try to track transaction
      const trackButton = screen.getByTestId('track-transaction')
      fireEvent.click(trackButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-message')).toHaveTextContent('Transaction tracking failed')
    })

    it('should handle transaction history loading failures', async () => {
      const mockTransactionService = CDPTransactionService as jest.Mocked<typeof CDPTransactionService>
      mockTransactionService.getTransactionHistory = jest.fn().mockRejectedValue(
        new Error('Failed to load transaction history')
      )

      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <CDPTransactionComponent shouldFail={true} failureType="history" />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to load transaction history')
    })
  })

  describe('Error Logging and Reporting', () => {
    it('should log errors to console for debugging', async () => {
      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ErrorThrowingComponent 
            shouldThrow={true} 
            errorMessage="Test error for logging"
          />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      })

      // Should have logged the error
      expect(mockConsoleError).toHaveBeenCalled()
    })

    it('should handle error service integration', () => {
      const testError = new Error('CDP service error')
      const context = WalletErrorService.createContext('testOperation', {
        network: 'base-mainnet',
        address: '0xtest123'
      })

      const walletError = WalletErrorService.handleApiError(testError, context)

      expect(walletError.code).toBeDefined()
      expect(walletError.message).toBe('CDP service error')
      expect(walletError.userMessage).toBeDefined()
      expect(typeof walletError.recoverable).toBe('boolean')
      expect(typeof walletError.retryable).toBe('boolean')
    })

    it('should categorize different types of CDP errors correctly', () => {
      const networkError = WalletErrorService.handleApiError(
        new Error('Network timeout'),
        WalletErrorService.createContext('networkTest')
      )
      expect(networkError.retryable).toBe(true)

      const rateLimitError = WalletErrorService.handleApiError(
        new Error('Rate limit exceeded'),
        WalletErrorService.createContext('rateLimitTest')
      )
      expect(rateLimitError.retryable).toBe(true)

      const authError = WalletErrorService.handleApiError(
        new Error('Unauthorized'),
        WalletErrorService.createContext('authTest')
      )
      expect(authError.retryable).toBe(false)

      const insufficientFundsError = WalletErrorService.handleApiError(
        new Error('Insufficient funds'),
        WalletErrorService.createContext('fundsTest')
      )
      expect(insufficientFundsError.retryable).toBe(false)
    })
  })

  describe('Multiple Component Error Handling', () => {
    it('should isolate errors to specific components', async () => {
      const WorkingComponent = () => (
        <div data-testid="working-component">This component works</div>
      )

      render(
        <div>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <ErrorThrowingComponent shouldThrow={true} errorMessage="Component 1 error" />
          </ErrorBoundary>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <WorkingComponent />
          </ErrorBoundary>
        </div>
      )

      // First component should show error
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      expect(screen.getByTestId('error-message')).toHaveTextContent('Component 1 error')

      // Second component should still work
      expect(screen.getByTestId('working-component')).toBeInTheDocument()
    })

    it('should handle cascading errors gracefully', async () => {
      const CascadingErrorComponent = () => {
        React.useEffect(() => {
          // Simulate a chain of errors
          setTimeout(() => {
            throw new Error('Cascading error 1')
          }, 100)
        }, [])

        return <div data-testid="cascading-component">Cascading component</div>
      }

      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <CascadingErrorComponent />
        </ErrorBoundary>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-message')).toHaveTextContent('Cascading error 1')
    })
  })

  describe('Error Boundary Performance', () => {
    it('should not impact performance of working components', () => {
      const renderCount = { count: 0 }
      
      const PerformanceTestComponent = () => {
        renderCount.count++
        return <div data-testid="performance-component">Render count: {renderCount.count}</div>
      }

      const { rerender } = render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <PerformanceTestComponent />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('performance-component')).toHaveTextContent('Render count: 1')

      // Rerender multiple times
      for (let i = 0; i < 5; i++) {
        rerender(
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <PerformanceTestComponent />
          </ErrorBoundary>
        )
      }

      // Should not cause excessive rerenders
      expect(renderCount.count).toBeLessThan(10)
    })

    it('should cleanup resources when error boundary unmounts', () => {
      const cleanup = jest.fn()
      
      const ResourceComponent = () => {
        React.useEffect(() => {
          return cleanup
        }, [])
        
        return <div data-testid="resource-component">Resource component</div>
      }

      const { unmount } = render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ResourceComponent />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('resource-component')).toBeInTheDocument()

      unmount()

      expect(cleanup).toHaveBeenCalled()
    })
  })
})