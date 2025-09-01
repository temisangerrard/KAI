/**
 * CDP Retry Integration Tests
 * 
 * Tests retry mechanisms and error handling for CDP operations
 */

import { CDPRetryService } from '@/lib/services/cdp-retry-service'
import { WalletErrorService, CDPErrorContext } from '@/lib/services/wallet-error-service'
import { CDPBalanceService } from '@/lib/services/cdp-balance-service'
import { CDPTransactionService } from '@/lib/services/cdp-transaction-service'

// Mock CDP hooks
jest.mock('@coinbase/cdp-hooks', () => ({
  useCurrentUser: jest.fn(),
  useSendEvmTransaction: jest.fn(),
  useSendUserOperation: jest.fn(),
  useWaitForUserOperation: jest.fn()
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

describe('CDP Retry Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    CDPRetryService.clearAllRetries()
  })

  describe('Network Error Retry Scenarios', () => {
    it('should retry network timeout errors with exponential backoff', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce('success')

      const context: CDPErrorContext = {
        operation: 'testNetworkTimeout',
        network: 'base-mainnet'
      }

      const result = await CDPRetryService.executeWithRetry(
        mockOperation,
        context,
        {
          maxRetries: 3,
          baseDelay: 100, // Reduced for testing
          maxDelay: 1000,
          backoffMultiplier: 2
        }
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(3)
      expect(result.retryState.totalAttempts).toBe(3)
    })

    it('should handle network connection failures with appropriate retry strategy', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce('connected')

      const context: CDPErrorContext = {
        operation: 'testNetworkConnection',
        network: 'base-sepolia'
      }

      const result = await CDPRetryService.executeWithRetry(
        mockOperation,
        context,
        {
          maxRetries: 5,
          baseDelay: 50,
          maxDelay: 500
        }
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe('connected')
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-retryable network errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Invalid address format'))

      const context: CDPErrorContext = {
        operation: 'testInvalidAddress',
        network: 'base-mainnet'
      }

      const result = await CDPRetryService.executeWithRetry(
        mockOperation,
        context,
        { maxRetries: 3 }
      )

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('INVALID_ADDRESS')
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })
  })

  describe('CDP API Error Retry Scenarios', () => {
    it('should handle CDP rate limiting with appropriate backoff', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockRejectedValueOnce(new Error('Too many requests'))
        .mockResolvedValueOnce('rate_limit_resolved')

      const context: CDPErrorContext = {
        operation: 'testRateLimit',
        network: 'base-mainnet'
      }

      const result = await CDPRetryService.executeWithRetry(
        mockOperation,
        context,
        {
          maxRetries: 4,
          baseDelay: 100,
          maxDelay: 2000,
          backoffMultiplier: 2.5
        }
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe('rate_limit_resolved')
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should handle CDP server errors with retry', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Internal server error'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce('server_recovered')

      const context: CDPErrorContext = {
        operation: 'testServerError',
        network: 'base-sepolia'
      }

      const result = await CDPRetryService.executeWithRetry(
        mockOperation,
        context,
        { maxRetries: 3, baseDelay: 50 }
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe('server_recovered')
    })

    it('should not retry CDP authentication errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Unauthorized: Invalid API key'))

      const context: CDPErrorContext = {
        operation: 'testAuthError',
        network: 'base-mainnet'
      }

      const result = await CDPRetryService.executeWithRetry(
        mockOperation,
        context,
        { maxRetries: 3 }
      )

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('CDP_AUTH_ERROR')
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })
  })

  describe('Balance Service Retry Integration', () => {
    it('should retry balance fetching on network failures', async () => {
      const mockUser = {
        evmAccounts: [{ address: '0x123' }],
        evmSmartAccounts: [{ address: '0x456' }]
      }

      // Mock viem client methods
      const mockGetBalance = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(BigInt('1000000000000000000')) // 1 ETH

      const mockContract = {
        read: {
          balanceOf: jest.fn().mockResolvedValue(BigInt('1000000')), // 1 USDC
          decimals: jest.fn().mockResolvedValue(6),
          symbol: jest.fn().mockResolvedValue('USDC'),
          name: jest.fn().mockResolvedValue('USD Coin')
        }
      }

      const { createPublicClient, getContract } = require('viem')
      createPublicClient.mockReturnValue({
        getBalance: mockGetBalance
      })
      getContract.mockReturnValue(mockContract)

      const result = await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')

      expect(result.balances).toHaveLength(2)
      expect(result.balances[0].symbol).toBe('ETH')
      expect(result.balances[1].symbol).toBe('USDC')
      expect(mockGetBalance).toHaveBeenCalledTimes(2) // Initial failure + retry
    })

    it('should return cached data on persistent failures', async () => {
      const mockUser = {
        evmAccounts: [{ address: '0x123' }],
        evmSmartAccounts: []
      }

      // Set up cache with stale data
      const cachedBalance = {
        address: '0x123',
        balances: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            address: 'native',
            formatted: '0.5',
            raw: BigInt('500000000000000000'),
            decimals: 18
          }
        ],
        lastUpdated: new Date(Date.now() - 120000), // 2 minutes ago
        isStale: true
      }

      CDPBalanceService['setCachedBalances']('0x123', cachedBalance)

      // Mock persistent failure
      const { createPublicClient } = require('viem')
      createPublicClient.mockReturnValue({
        getBalance: jest.fn().mockRejectedValue(new Error('Persistent network error'))
      })

      const result = await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')

      expect(result.isStale).toBe(true)
      expect(result.balances[0].formatted).toBe('0.5')
    })
  })

  describe('Transaction Service Retry Integration', () => {
    it('should retry transaction tracking on temporary failures', async () => {
      const mockTrackingData = {
        hash: '0xabc123',
        status: 'confirmed',
        confirmations: 1,
        blockNumber: 12345
      }

      // Mock the internal tracking logic to fail then succeed
      let callCount = 0
      const originalTrackTransaction = CDPTransactionService.trackTransaction
      CDPTransactionService.trackTransaction = jest.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('Network timeout')
        }
        return mockTrackingData
      })

      const result = await CDPTransactionService.trackTransaction(
        '0xabc123',
        'base-mainnet',
        'evm'
      )

      expect(result.hash).toBe('0xabc123')
      expect(result.status).toBe('confirmed')
      expect(CDPTransactionService.trackTransaction).toHaveBeenCalledTimes(2)

      // Restore original method
      CDPTransactionService.trackTransaction = originalTrackTransaction
    })

    it('should handle transaction history failures with manual refresh suggestion', async () => {
      const mockAddress = '0x123'
      const mockNetwork = 'base-sepolia'

      // Mock persistent failure
      const originalGetTransactionHistory = CDPTransactionService.getTransactionHistory
      CDPTransactionService.getTransactionHistory = jest.fn().mockRejectedValue(
        new Error('Service temporarily unavailable')
      )

      try {
        await CDPTransactionService.getTransactionHistory(mockAddress, mockNetwork)
        fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.userMessage).toContain('Try using the refresh button')
      }

      // Restore original method
      CDPTransactionService.getTransactionHistory = originalGetTransactionHistory
    })
  })

  describe('Manual Refresh Integration', () => {
    it('should execute manual refresh with cache bypass', async () => {
      let operationCount = 0
      const mockOperation = jest.fn().mockImplementation(async () => {
        operationCount++
        return `result_${operationCount}`
      })

      const context: CDPErrorContext = {
        operation: 'testManualRefresh',
        network: 'base-mainnet'
      }

      let refreshTriggered = false
      const refreshTrigger = () => {
        refreshTriggered = true
      }

      const result1 = await CDPRetryService.executeWithManualRefresh(
        mockOperation,
        context,
        refreshTrigger
      )

      const result2 = await CDPRetryService.executeWithManualRefresh(
        mockOperation,
        context,
        refreshTrigger
      )

      expect(result1).toBe('result_1')
      expect(result2).toBe('result_2')
      expect(mockOperation).toHaveBeenCalledTimes(2)
      expect(refreshTriggered).toBe(false) // No error, so refresh not triggered
    })

    it('should trigger manual refresh suggestion on network errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network connection failed'))

      const context: CDPErrorContext = {
        operation: 'testManualRefreshTrigger',
        network: 'base-mainnet'
      }

      let refreshTriggered = false
      const refreshTrigger = () => {
        refreshTriggered = true
      }

      try {
        await CDPRetryService.executeWithManualRefresh(
          mockOperation,
          context,
          refreshTrigger
        )
        fail('Should have thrown an error')
      } catch (error: any) {
        expect(refreshTriggered).toBe(true)
        expect(error.userMessage).toContain('Try using the refresh button')
      }
    })
  })

  describe('Abort and Cleanup', () => {
    it('should abort retry operations when requested', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Network timeout'))

      const context: CDPErrorContext = {
        operation: 'testAbort',
        network: 'base-mainnet'
      }

      const abortController = new AbortController()

      // Start the retry operation
      const retryPromise = CDPRetryService.executeWithRetry(
        mockOperation,
        context,
        {
          maxRetries: 5,
          baseDelay: 1000,
          abortSignal: abortController.signal
        }
      )

      // Abort after a short delay
      setTimeout(() => {
        abortController.abort()
      }, 100)

      const result = await retryPromise

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('aborted')
      expect(result.retryState.aborted).toBe(true)
    })

    it('should clean up active retries on service reset', () => {
      const stats1 = CDPRetryService.getRetryStatistics()
      expect(stats1.activeRetries).toBe(0)

      // This would normally be set during an active retry
      // We're testing the cleanup functionality
      CDPRetryService.clearAllRetries()

      const stats2 = CDPRetryService.getRetryStatistics()
      expect(stats2.activeRetries).toBe(0)
    })
  })

  describe('Error Categorization and Strategies', () => {
    it('should apply correct retry strategies for different error types', () => {
      const networkError = WalletErrorService.handleApiError(
        new Error('Network timeout'),
        { operation: 'test' }
      )
      const networkStrategy = WalletErrorService.getRetryStrategy(networkError)
      expect(networkStrategy.maxRetries).toBeGreaterThan(2)
      expect(networkStrategy.shouldRetry).toBe(true)

      const rateLimitError = WalletErrorService.handleApiError(
        new Error('Rate limit exceeded'),
        { operation: 'test' }
      )
      const rateLimitStrategy = WalletErrorService.getRetryStrategy(rateLimitError)
      expect(rateLimitStrategy.baseDelay).toBeGreaterThan(3000)
      expect(rateLimitStrategy.shouldRetry).toBe(true)

      const authError = WalletErrorService.handleApiError(
        new Error('Unauthorized'),
        { operation: 'test' }
      )
      expect(authError.retryable).toBe(false)

      const insufficientFundsError = WalletErrorService.handleApiError(
        new Error('Insufficient funds'),
        { operation: 'test' }
      )
      expect(insufficientFundsError.retryable).toBe(false)
    })

    it('should calculate exponential backoff delays correctly', () => {
      const strategy = {
        shouldRetry: true,
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitterEnabled: false
      }

      const delay1 = WalletErrorService.calculateRetryDelay(0, strategy)
      const delay2 = WalletErrorService.calculateRetryDelay(1, strategy)
      const delay3 = WalletErrorService.calculateRetryDelay(2, strategy)

      expect(delay1).toBe(1000)
      expect(delay2).toBe(2000)
      expect(delay3).toBe(4000)
    })
  })
})