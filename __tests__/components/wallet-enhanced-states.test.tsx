/**
 * Tests for enhanced wallet loading and error states
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WalletStateManager, useWalletState } from '@/app/wallet/components/wallet-state-manager'
import { useEnhancedWalletState } from '@/hooks/use-enhanced-wallet-state'

// Mock components for testing
function TestComponent() {
  const walletState = useWalletState()
  
  return (
    <div>
      <button onClick={() => walletState.showBalanceLoading(true)}>
        Show Balance Loading
      </button>
      <button onClick={() => walletState.showBalanceError(
        { message: 'Test error', userMessage: 'Balance fetch failed' },
        () => console.log('Retry clicked')
      )}>
        Show Balance Error
      </button>
      <button onClick={() => walletState.showTransactionSending(true, 'test-hash')}>
        Show Transaction Sending
      </button>
      <button onClick={() => walletState.showSuccess('Transaction successful', 'test-hash', 12345)}>
        Show Success
      </button>
      <button onClick={() => walletState.showOffline(true)}>
        Show Offline
      </button>
      <button onClick={() => walletState.showStaleData(new Date(Date.now() - 120000))}>
        Show Stale Data
      </button>
      <button onClick={() => walletState.clearErrors()}>
        Clear Errors
      </button>
    </div>
  )
}

function EnhancedStateTestComponent() {
  const mockOperation = jest.fn().mockResolvedValue({ balance: '100.0' })
  
  const {
    data,
    loading,
    error,
    isStale,
    execute,
    retry,
    clearError
  } = useEnhancedWalletState(mockOperation, 'test-operation')
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="data">{data ? JSON.stringify(data) : 'No Data'}</div>
      <div data-testid="error">{error ? error.message : 'No Error'}</div>
      <div data-testid="stale">{isStale ? 'Stale' : 'Fresh'}</div>
      <button onClick={() => execute()}>Execute</button>
      <button onClick={() => retry()}>Retry</button>
      <button onClick={() => clearError()}>Clear Error</button>
    </div>
  )
}

describe('Wallet Enhanced States', () => {
  describe('WalletStateManager', () => {
    it('should show balance loading state', async () => {
      render(
        <WalletStateManager>
          <TestComponent />
        </WalletStateManager>
      )
      
      fireEvent.click(screen.getByText('Show Balance Loading'))
      
      await waitFor(() => {
        expect(screen.getByText('Loading balances...')).toBeInTheDocument()
      })
    })
    
    it('should show balance error state with retry option', async () => {
      render(
        <WalletStateManager>
          <TestComponent />
        </WalletStateManager>
      )
      
      fireEvent.click(screen.getByText('Show Balance Error'))
      
      await waitFor(() => {
        expect(screen.getByText('Balance fetch failed')).toBeInTheDocument()
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })
    })
    
    it('should show transaction sending state', async () => {
      render(
        <WalletStateManager>
          <TestComponent />
        </WalletStateManager>
      )
      
      fireEvent.click(screen.getByText('Show Transaction Sending'))
      
      await waitFor(() => {
        expect(screen.getByText('User operation pending...')).toBeInTheDocument()
        expect(screen.getByText('Hash: test-hash')).toBeInTheDocument()
      })
    })
    
    it('should show success state', async () => {
      render(
        <WalletStateManager>
          <TestComponent />
        </WalletStateManager>
      )
      
      fireEvent.click(screen.getByText('Show Success'))
      
      await waitFor(() => {
        expect(screen.getByText('Transaction successful')).toBeInTheDocument()
        expect(screen.getByText('Confirmed in block #12345')).toBeInTheDocument()
      })
    })
    
    it('should show offline indicator', async () => {
      render(
        <WalletStateManager>
          <TestComponent />
        </WalletStateManager>
      )
      
      fireEvent.click(screen.getByText('Show Offline'))
      
      await waitFor(() => {
        expect(screen.getByText("You're offline")).toBeInTheDocument()
        expect(screen.getByText('Showing cached data. Connect to internet to refresh.')).toBeInTheDocument()
      })
    })
    
    it('should show stale data indicator', async () => {
      render(
        <WalletStateManager>
          <TestComponent />
        </WalletStateManager>
      )
      
      fireEvent.click(screen.getByText('Show Stale Data'))
      
      await waitFor(() => {
        expect(screen.getByText(/Data is \d+m old/)).toBeInTheDocument()
      })
    })
    
    it('should clear errors when requested', async () => {
      render(
        <WalletStateManager>
          <TestComponent />
        </WalletStateManager>
      )
      
      // Show error first
      fireEvent.click(screen.getByText('Show Balance Error'))
      await waitFor(() => {
        expect(screen.getByText('Balance fetch failed')).toBeInTheDocument()
      })
      
      // Clear errors
      fireEvent.click(screen.getByText('Clear Errors'))
      await waitFor(() => {
        expect(screen.queryByText('Balance fetch failed')).not.toBeInTheDocument()
      })
    })
  })
  
  describe('useEnhancedWalletState', () => {
    it('should handle successful operation', async () => {
      render(
        <WalletStateManager>
          <EnhancedStateTestComponent />
        </WalletStateManager>
      )
      
      fireEvent.click(screen.getByText('Execute'))
      
      await waitFor(() => {
        expect(screen.getByTestId('data')).toHaveTextContent('{"balance":"100.0"}')
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
        expect(screen.getByTestId('error')).toHaveTextContent('No Error')
      })
    })
    
    it('should handle operation failure with retry', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'))
      
      function FailingTestComponent() {
        const {
          data,
          loading,
          error,
          execute,
          retry
        } = useEnhancedWalletState(mockOperation, 'failing-operation')
        
        return (
          <div>
            <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
            <div data-testid="error">{error ? error.message : 'No Error'}</div>
            <button onClick={() => execute()}>Execute</button>
            <button onClick={() => retry()}>Retry</button>
          </div>
        )
      }
      
      render(
        <WalletStateManager>
          <FailingTestComponent />
        </WalletStateManager>
      )
      
      fireEvent.click(screen.getByText('Execute'))
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network error')
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
      
      // Test retry functionality
      mockOperation.mockResolvedValueOnce({ balance: '50.0' })
      fireEvent.click(screen.getByText('Retry'))
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('No Error')
      })
    })
    
    it('should show cached data when available', async () => {
      const mockOperation = jest.fn()
        .mockResolvedValueOnce({ balance: '100.0' })
        .mockRejectedValueOnce(new Error('Network error'))
      
      function CachedDataTestComponent() {
        const {
          data,
          error,
          execute
        } = useEnhancedWalletState(mockOperation, 'cached-operation', {
          cacheTimeout: 60000 // 1 minute cache
        })
        
        return (
          <div>
            <div data-testid="data">{data ? JSON.stringify(data) : 'No Data'}</div>
            <div data-testid="error">{error ? error.message : 'No Error'}</div>
            <button onClick={() => execute()}>Execute</button>
            <button onClick={() => execute(true)}>Force Execute</button>
          </div>
        )
      }
      
      render(
        <WalletStateManager>
          <CachedDataTestComponent />
        </WalletStateManager>
      )
      
      // First execution should succeed
      fireEvent.click(screen.getByText('Execute'))
      await waitFor(() => {
        expect(screen.getByTestId('data')).toHaveTextContent('{"balance":"100.0"}')
      })
      
      // Second execution should fail but show cached data
      fireEvent.click(screen.getByText('Force Execute'))
      await waitFor(() => {
        expect(screen.getByTestId('data')).toHaveTextContent('{"balance":"100.0"}') // Still shows cached data
        expect(screen.getByTestId('error')).toHaveTextContent('Network error')
      })
    })
  })
  
  describe('Error State Components', () => {
    it('should render CDP error with retry button', async () => {
      const mockRetry = jest.fn()
      const mockError = {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        userMessage: 'Please check your internet connection'
      }
      
      // Use the wallet state to show CDP error
      const TestErrorComponent = () => {
        const walletState = useWalletState()
        
        React.useEffect(() => {
          walletState.showCDPError(mockError, mockRetry)
        }, [])
        
        return <div>Test content</div>
      }
      
      render(
        <WalletStateManager>
          <TestErrorComponent />
        </WalletStateManager>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Please check your internet connection')).toBeInTheDocument()
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Try Again'))
      expect(mockRetry).toHaveBeenCalled()
    })
  })
  
  describe('Loading State Components', () => {
    it('should render balance loading skeleton', async () => {
      const TestLoadingComponent = () => {
        const walletState = useWalletState()
        
        React.useEffect(() => {
          walletState.showBalanceLoading(true)
        }, [])
        
        return <div>Test content</div>
      }
      
      render(
        <WalletStateManager>
          <TestLoadingComponent />
        </WalletStateManager>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Loading balances...')).toBeInTheDocument()
      })
    })
  })
})

// Mock the CDP services
jest.mock('@/lib/services/cdp-balance-service', () => ({
  CDPBalanceService: {
    getBalances: jest.fn(),
    refreshBalances: jest.fn(),
    getCachedBalances: jest.fn(),
    clearCache: jest.fn()
  }
}))

jest.mock('@/hooks/use-cdp-transactions', () => ({
  useCDPTransactions: () => ({
    sendEvmTransaction: jest.fn(),
    sendUserOperation: jest.fn(),
    transactionHistory: null,
    recentTransactions: [],
    isLoadingHistory: false,
    isSendingTransaction: false,
    isSendingUserOperation: false,
    lastTransactionStatus: null,
    refreshHistory: jest.fn(),
    trackTransaction: jest.fn(),
    monitorTransaction: jest.fn(),
    error: null,
    clearError: jest.fn()
  })
}))

jest.mock('@coinbase/cdp-hooks', () => ({
  useIsSignedIn: () => ({ isSignedIn: true }),
  useEvmAddress: () => ({ evmAddress: '0x1234567890123456789012345678901234567890' }),
  useCurrentUser: () => ({ currentUser: { evmAccounts: [{ address: '0x1234567890123456789012345678901234567890' }] } }),
  useSendEvmTransaction: () => ({ sendEvmTransaction: jest.fn(), data: null }),
  useSendUserOperation: () => ({ sendUserOperation: jest.fn(), data: null, status: 'idle' }),
  useWaitForUserOperation: () => ({ data: null })
}))

jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' }
  })
}))

jest.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => ({
    networkStatus: { connected: true, currentNetwork: { isTestnet: false } },
    isLoading: false,
    isTestnet: false,
    networkName: 'Base Mainnet'
  })
}))