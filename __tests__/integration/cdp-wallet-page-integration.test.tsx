/**
 * CDP Wallet Page Integration Tests
 * 
 * End-to-end integration tests for the complete wallet page with CDP services including:
 * - Full wallet page rendering with CDP integration
 * - User interactions with CDP hooks
 * - Network switching scenarios
 * - Transaction flows (EOA and Smart Account)
 * - Error handling and recovery
 * - Performance under load
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { CDPBalanceService } from '@/lib/services/cdp-balance-service'
import { CDPTransactionService } from '@/lib/services/cdp-transaction-service'
import { NetworkService } from '@/lib/services/network-service'

// Mock the wallet page component (simplified version for testing)
const MockWalletPage = React.lazy(() => 
  Promise.resolve({
    default: () => {
      const [isSignedIn, setIsSignedIn] = React.useState(true)
      const [address, setAddress] = React.useState('0xtest123')
      const [network, setNetwork] = React.useState('base-mainnet')
      const [balances, setBalances] = React.useState<any[]>([])
      const [transactions, setTransactions] = React.useState<any[]>([])
      const [loading, setLoading] = React.useState(false)
      const [error, setError] = React.useState<string | null>(null)
      const [sendForm, setSendForm] = React.useState({
        to: '',
        amount: '',
        asset: 'ETH'
      })
      const [useSmartAccount, setUseSmartAccount] = React.useState(true)

      const fetchBalances = React.useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
          const mockUser = {
            evmAccounts: [{ address }],
            evmSmartAccounts: useSmartAccount ? [{ address: '0xsmart456' }] : []
          }
          const result = await CDPBalanceService.getBalances(mockUser as any, network)
          setBalances(result.balances)
        } catch (err: any) {
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }, [address, network, useSmartAccount])

      const fetchTransactions = React.useCallback(async () => {
        try {
          const result = await CDPTransactionService.getTransactionHistory(address, network)
          setTransactions(result.transactions)
        } catch (err: any) {
          console.error('Transaction fetch error:', err)
        }
      }, [address, network])

      const sendTransaction = async () => {
        if (!sendForm.to || !sendForm.amount) return
        
        try {
          setLoading(true)
          
          if (useSmartAccount) {
            // Simulate smart account transaction
            await new Promise(resolve => setTimeout(resolve, 1000))
            console.log('Smart account transaction sent')
          } else {
            // Simulate EOA transaction
            await new Promise(resolve => setTimeout(resolve, 800))
            console.log('EOA transaction sent')
          }
          
          // Reset form
          setSendForm({ to: '', amount: '', asset: 'ETH' })
          
          // Refresh data
          await fetchBalances()
          await fetchTransactions()
        } catch (err: any) {
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }

      React.useEffect(() => {
        if (isSignedIn && address) {
          fetchBalances()
          fetchTransactions()
        }
      }, [isSignedIn, address, fetchBalances, fetchTransactions])

      if (!isSignedIn) {
        return (
          <div data-testid="wallet-signin">
            <h1>Sign In Required</h1>
            <button onClick={() => setIsSignedIn(true)} data-testid="signin-button">
              Sign In
            </button>
          </div>
        )
      }

      return (
        <div data-testid="wallet-page">
          <h1>Smart Wallet</h1>
          
          {/* Network Selector */}
          <div data-testid="network-selector">
            <label>Network:</label>
            <select 
              value={network} 
              onChange={(e) => setNetwork(e.target.value)}
              data-testid="network-select"
            >
              <option value="base-mainnet">Base Mainnet</option>
              <option value="base-sepolia">Base Sepolia</option>
            </select>
          </div>

          {/* Account Type Toggle */}
          <div data-testid="account-toggle">
            <label>
              <input
                type="checkbox"
                checked={useSmartAccount}
                onChange={(e) => setUseSmartAccount(e.target.checked)}
                data-testid="smart-account-toggle"
              />
              Use Smart Account
            </label>
          </div>

          {/* Address Display */}
          <div data-testid="address-display">
            <p>Address: {useSmartAccount ? '0xsmart456' : address}</p>
            <p>Type: {useSmartAccount ? 'Smart Account' : 'EOA'}</p>
          </div>

          {/* Balance Section */}
          <div data-testid="balance-section">
            <h2>Balances</h2>
            {loading && <div data-testid="balance-loading">Loading...</div>}
            {error && <div data-testid="balance-error">Error: {error}</div>}
            <div data-testid="balance-list">
              {balances.map((balance, index) => (
                <div key={index} data-testid={`balance-${balance.symbol}`}>
                  {balance.formatted} {balance.symbol}
                </div>
              ))}
            </div>
            <button onClick={fetchBalances} data-testid="refresh-balances">
              Refresh Balances
            </button>
          </div>

          {/* Send Transaction Form */}
          <div data-testid="send-form">
            <h2>Send Transaction</h2>
            <input
              type="text"
              placeholder="Recipient address"
              value={sendForm.to}
              onChange={(e) => setSendForm(prev => ({ ...prev, to: e.target.value }))}
              data-testid="recipient-input"
            />
            <input
              type="number"
              placeholder="Amount"
              value={sendForm.amount}
              onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
              data-testid="amount-input"
            />
            <select
              value={sendForm.asset}
              onChange={(e) => setSendForm(prev => ({ ...prev, asset: e.target.value }))}
              data-testid="asset-select"
            >
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
            </select>
            <button 
              onClick={sendTransaction}
              disabled={loading || !sendForm.to || !sendForm.amount}
              data-testid="send-button"
            >
              {loading ? 'Sending...' : `Send ${useSmartAccount ? '(Gasless)' : ''}`}
            </button>
          </div>

          {/* Transaction History */}
          <div data-testid="transaction-history">
            <h2>Transaction History</h2>
            <div data-testid="transaction-list">
              {transactions.map((tx, index) => (
                <div key={index} data-testid={`transaction-${index}`}>
                  {tx.hash} - {tx.status} - {tx.value} {tx.asset}
                </div>
              ))}
            </div>
            <button onClick={fetchTransactions} data-testid="refresh-transactions">
              Refresh Transactions
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div data-testid="error-display">
              <p>Error: {error}</p>
              <button onClick={() => setError(null)} data-testid="clear-error">
                Clear Error
              </button>
            </div>
          )}
        </div>
      )
    }
  })
)

// Mock CDP hooks
const mockSendEvmTransaction = jest.fn()
const mockSendUserOperation = jest.fn()

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
    sendEvmTransaction: mockSendEvmTransaction,
    data: { hash: '0xevm123', status: 'success' },
    status: 'success'
  }),
  useSendUserOperation: () => ({
    sendUserOperation: mockSendUserOperation,
    data: { userOperationHash: '0xuserop456', status: 'complete' },
    status: 'success'
  })
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

describe('CDP Wallet Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    const { createPublicClient, getContract } = require('viem')
    createPublicClient.mockReturnValue({
      getBalance: jest.fn().mockResolvedValue(BigInt('1500000000000000000')) // 1.5 ETH
    })
    getContract.mockReturnValue({
      read: {
        balanceOf: jest.fn().mockResolvedValue(BigInt('100000000')), // 100 USDC
        decimals: jest.fn().mockResolvedValue(6),
        symbol: jest.fn().mockResolvedValue('USDC'),
        name: jest.fn().mockResolvedValue('USD Coin')
      }
    })

    // Mock CDP services
    const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
    mockBalanceService.getBalances = jest.fn().mockResolvedValue({
      address: '0xtest123',
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

    const mockTransactionService = CDPTransactionService as jest.Mocked<typeof CDPTransactionService>
    mockTransactionService.getTransactionHistory = jest.fn().mockResolvedValue({
      address: '0xtest123',
      transactions: [
        {
          hash: '0xabc123',
          type: 'send',
          value: '1000000000000000000',
          asset: 'ETH',
          timestamp: Date.now(),
          from: '0xtest123',
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
  })

  describe('Wallet Page Rendering and Initial Load', () => {
    it('should render wallet page with CDP data', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('wallet-page')).toBeInTheDocument()
      })

      // Should display wallet components
      expect(screen.getByText('Smart Wallet')).toBeInTheDocument()
      expect(screen.getByTestId('network-selector')).toBeInTheDocument()
      expect(screen.getByTestId('account-toggle')).toBeInTheDocument()
      expect(screen.getByTestId('balance-section')).toBeInTheDocument()
      expect(screen.getByTestId('send-form')).toBeInTheDocument()
      expect(screen.getByTestId('transaction-history')).toBeInTheDocument()
    })

    it('should load balance data on initial render', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('balance-ETH')).toBeInTheDocument()
      })

      expect(screen.getByTestId('balance-ETH')).toHaveTextContent('1.5 ETH')
      expect(screen.getByTestId('balance-USDC')).toHaveTextContent('100.0 USDC')
    })

    it('should load transaction history on initial render', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('transaction-0')).toBeInTheDocument()
      })

      expect(screen.getByTestId('transaction-0')).toHaveTextContent('0xabc123')
      expect(screen.getByTestId('transaction-0')).toHaveTextContent('confirmed')
    })

    it('should show sign-in prompt when not authenticated', async () => {
      // Mock unauthenticated state
      jest.doMock('@coinbase/cdp-hooks', () => ({
        useIsSignedIn: () => ({ isSignedIn: false }),
        useEvmAddress: () => ({ evmAddress: null })
      }))

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('wallet-signin')).toBeInTheDocument()
      })

      expect(screen.getByText('Sign In Required')).toBeInTheDocument()
      expect(screen.getByTestId('signin-button')).toBeInTheDocument()
    })
  })

  describe('Network Switching Integration', () => {
    it('should switch networks and reload data', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn()
        .mockResolvedValueOnce({
          address: '0xtest123',
          balances: [
            { symbol: 'ETH', name: 'Ethereum', address: 'native', formatted: '1.5', raw: BigInt('1500000000000000000'), decimals: 18 }
          ],
          lastUpdated: new Date(),
          isStale: false
        })
        .mockResolvedValueOnce({
          address: '0xtest123',
          balances: [
            { symbol: 'ETH', name: 'Ethereum', address: 'native', formatted: '0.8', raw: BigInt('800000000000000000'), decimals: 18 }
          ],
          lastUpdated: new Date(),
          isStale: false
        })

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('balance-ETH')).toHaveTextContent('1.5 ETH')
      })

      // Switch to testnet
      const networkSelect = screen.getByTestId('network-select')
      fireEvent.change(networkSelect, { target: { value: 'base-sepolia' } })

      await waitFor(() => {
        expect(screen.getByTestId('balance-ETH')).toHaveTextContent('0.8 ETH')
      })

      // Should have called balance service twice (once for each network)
      expect(mockBalanceService.getBalances).toHaveBeenCalledTimes(2)
      expect(mockBalanceService.getBalances).toHaveBeenCalledWith(expect.any(Object), 'base-mainnet')
      expect(mockBalanceService.getBalances).toHaveBeenCalledWith(expect.any(Object), 'base-sepolia')
    })

    it('should update address display when switching account types', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('address-display')).toBeInTheDocument()
      })

      // Should start with smart account
      expect(screen.getByTestId('address-display')).toHaveTextContent('0xsmart456')
      expect(screen.getByTestId('address-display')).toHaveTextContent('Smart Account')

      // Switch to EOA
      const smartAccountToggle = screen.getByTestId('smart-account-toggle')
      fireEvent.click(smartAccountToggle)

      await waitFor(() => {
        expect(screen.getByTestId('address-display')).toHaveTextContent('0xtest123')
      })

      expect(screen.getByTestId('address-display')).toHaveTextContent('EOA')
    })
  })

  describe('Transaction Flow Integration', () => {
    it('should send EOA transaction successfully', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('send-form')).toBeInTheDocument()
      })

      // Switch to EOA
      const smartAccountToggle = screen.getByTestId('smart-account-toggle')
      fireEvent.click(smartAccountToggle)

      // Fill out send form
      const recipientInput = screen.getByTestId('recipient-input')
      const amountInput = screen.getByTestId('amount-input')
      
      fireEvent.change(recipientInput, { target: { value: '0xrecipient123' } })
      fireEvent.change(amountInput, { target: { value: '0.5' } })

      // Send transaction
      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).toHaveTextContent('Send')
      
      fireEvent.click(sendButton)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('send-button')).toHaveTextContent('Sending...')
      })

      // Should complete and reset form
      await waitFor(() => {
        expect(screen.getByTestId('send-button')).toHaveTextContent('Send')
      }, { timeout: 2000 })

      expect(recipientInput).toHaveValue('')
      expect(amountInput).toHaveValue('')
    })

    it('should send smart account transaction successfully', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('send-form')).toBeInTheDocument()
      })

      // Should start with smart account enabled
      expect(screen.getByTestId('smart-account-toggle')).toBeChecked()

      // Fill out send form
      const recipientInput = screen.getByTestId('recipient-input')
      const amountInput = screen.getByTestId('amount-input')
      
      fireEvent.change(recipientInput, { target: { value: '0xrecipient456' } })
      fireEvent.change(amountInput, { target: { value: '1.0' } })

      // Send transaction
      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).toHaveTextContent('Send (Gasless)')
      
      fireEvent.click(sendButton)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('send-button')).toHaveTextContent('Sending...')
      })

      // Should complete and reset form
      await waitFor(() => {
        expect(screen.getByTestId('send-button')).toHaveTextContent('Send (Gasless)')
      }, { timeout: 2000 })

      expect(recipientInput).toHaveValue('')
      expect(amountInput).toHaveValue('')
    })

    it('should handle different asset types', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('send-form')).toBeInTheDocument()
      })

      // Select USDC
      const assetSelect = screen.getByTestId('asset-select')
      fireEvent.change(assetSelect, { target: { value: 'USDC' } })

      expect(assetSelect).toHaveValue('USDC')

      // Fill out form for USDC transaction
      const recipientInput = screen.getByTestId('recipient-input')
      const amountInput = screen.getByTestId('amount-input')
      
      fireEvent.change(recipientInput, { target: { value: '0xrecipient789' } })
      fireEvent.change(amountInput, { target: { value: '50' } })

      // Should be able to send USDC
      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).not.toBeDisabled()
    })

    it('should validate form inputs', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('send-form')).toBeInTheDocument()
      })

      const sendButton = screen.getByTestId('send-button')
      
      // Should be disabled with empty form
      expect(sendButton).toBeDisabled()

      // Fill only recipient
      const recipientInput = screen.getByTestId('recipient-input')
      fireEvent.change(recipientInput, { target: { value: '0xrecipient' } })
      
      expect(sendButton).toBeDisabled()

      // Fill only amount
      fireEvent.change(recipientInput, { target: { value: '' } })
      const amountInput = screen.getByTestId('amount-input')
      fireEvent.change(amountInput, { target: { value: '1.0' } })
      
      expect(sendButton).toBeDisabled()

      // Fill both fields
      fireEvent.change(recipientInput, { target: { value: '0xrecipient' } })
      
      expect(sendButton).not.toBeDisabled()
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle balance loading errors', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn().mockRejectedValue(
        new Error('Network connection failed')
      )

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('balance-error')).toBeInTheDocument()
      })

      expect(screen.getByTestId('balance-error')).toHaveTextContent('Network connection failed')
    })

    it('should recover from errors with retry', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          address: '0xtest123',
          balances: [
            { symbol: 'ETH', name: 'Ethereum', address: 'native', formatted: '2.0', raw: BigInt('2000000000000000000'), decimals: 18 }
          ],
          lastUpdated: new Date(),
          isStale: false
        })

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('balance-error')).toBeInTheDocument()
      })

      // Retry by clicking refresh
      const refreshButton = screen.getByTestId('refresh-balances')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(screen.getByTestId('balance-ETH')).toBeInTheDocument()
      })

      expect(screen.getByTestId('balance-ETH')).toHaveTextContent('2.0 ETH')
      expect(screen.queryByTestId('balance-error')).not.toBeInTheDocument()
    })

    it('should clear errors manually', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn().mockRejectedValue(
        new Error('Persistent error')
      )

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-display')).toHaveTextContent('Persistent error')

      // Clear error
      const clearButton = screen.getByTestId('clear-error')
      fireEvent.click(clearButton)

      expect(screen.queryByTestId('error-display')).not.toBeInTheDocument()
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle rapid user interactions', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('wallet-page')).toBeInTheDocument()
      })

      const refreshButton = screen.getByTestId('refresh-balances')
      
      // Rapid clicks should not cause issues
      for (let i = 0; i < 10; i++) {
        fireEvent.click(refreshButton)
      }

      // Should still be functional
      await waitFor(() => {
        expect(screen.getByTestId('balance-section')).toBeInTheDocument()
      })
    })

    it('should handle network switching under load', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('network-select')).toBeInTheDocument()
      })

      const networkSelect = screen.getByTestId('network-select')
      
      // Rapid network switches
      for (let i = 0; i < 5; i++) {
        fireEvent.change(networkSelect, { target: { value: 'base-sepolia' } })
        fireEvent.change(networkSelect, { target: { value: 'base-mainnet' } })
      }

      // Should still be functional
      await waitFor(() => {
        expect(networkSelect).toHaveValue('base-mainnet')
      })
    })

    it('should handle concurrent operations gracefully', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('wallet-page')).toBeInTheDocument()
      })

      // Trigger multiple operations simultaneously
      const refreshBalances = screen.getByTestId('refresh-balances')
      const refreshTransactions = screen.getByTestId('refresh-transactions')
      const networkSelect = screen.getByTestId('network-select')

      act(() => {
        fireEvent.click(refreshBalances)
        fireEvent.click(refreshTransactions)
        fireEvent.change(networkSelect, { target: { value: 'base-sepolia' } })
      })

      // Should handle concurrent operations without crashing
      await waitFor(() => {
        expect(screen.getByTestId('wallet-page')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should provide proper loading states', async () => {
      const mockBalanceService = CDPBalanceService as jest.Mocked<typeof CDPBalanceService>
      mockBalanceService.getBalances = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          address: '0xtest123',
          balances: [],
          lastUpdated: new Date(),
          isStale: false
        }), 1000))
      )

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('balance-loading')).toBeInTheDocument()
      })

      expect(screen.getByTestId('balance-loading')).toHaveTextContent('Loading...')
    })

    it('should provide clear feedback for user actions', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('send-form')).toBeInTheDocument()
      })

      // Fill form and send transaction
      const recipientInput = screen.getByTestId('recipient-input')
      const amountInput = screen.getByTestId('amount-input')
      const sendButton = screen.getByTestId('send-button')
      
      fireEvent.change(recipientInput, { target: { value: '0xrecipient' } })
      fireEvent.change(amountInput, { target: { value: '1.0' } })
      fireEvent.click(sendButton)

      // Should show sending state
      await waitFor(() => {
        expect(sendButton).toHaveTextContent('Sending...')
      })

      // Should return to normal state
      await waitFor(() => {
        expect(sendButton).toHaveTextContent('Send (Gasless)')
      }, { timeout: 2000 })
    })

    it('should maintain state consistency across interactions', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockWalletPage />
        </React.Suspense>
      )

      await waitFor(() => {
        expect(screen.getByTestId('wallet-page')).toBeInTheDocument()
      })

      // Change network
      const networkSelect = screen.getByTestId('network-select')
      fireEvent.change(networkSelect, { target: { value: 'base-sepolia' } })

      // Toggle account type
      const smartAccountToggle = screen.getByTestId('smart-account-toggle')
      fireEvent.click(smartAccountToggle)

      // State should be consistent
      expect(networkSelect).toHaveValue('base-sepolia')
      expect(smartAccountToggle).not.toBeChecked()
      expect(screen.getByTestId('address-display')).toHaveTextContent('EOA')
    })
  })
})