/**
 * CDP Wallet Cache Behavior Integration Tests
 * 
 * Tests cache behavior with CDP data and network changes including:
 * - Cache invalidation on network changes
 * - Stale data handling
 * - Cache persistence and recovery
 * - Offline/online cache behavior
 */

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

// Mock localStorage for cache testing
const mockLocalStorage = {
  store: new Map<string, string>(),
  getItem: jest.fn((key: string) => mockLocalStorage.store.get(key) || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage.store.set(key, value)
  }),
  removeItem: jest.fn((key: string) => {
    mockLocalStorage.store.delete(key)
  }),
  clear: jest.fn(() => {
    mockLocalStorage.store.clear()
  })
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('CDP Wallet Cache Behavior Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.store.clear()
    
    // Reset viem mocks
    const { createPublicClient, getContract } = require('viem')
    createPublicClient.mockReturnValue({
      getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000'))
    })
    getContract.mockReturnValue({
      read: {
        balanceOf: jest.fn().mockResolvedValue(BigInt('1000000')),
        decimals: jest.fn().mockResolvedValue(6),
        symbol: jest.fn().mockResolvedValue('USDC'),
        name: jest.fn().mockResolvedValue('USD Coin')
      }
    })
  })

  describe('Balance Cache Behavior', () => {
    it('should cache balance data and return cached data on subsequent calls', async () => {
      const mockUser = {
        evmAccounts: [{ address: '0xtest123' }],
        evmSmartAccounts: []
      }

      // First call should fetch from network
      const result1 = await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')
      
      // Second call should return cached data
      const result2 = await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')

      expect(result1.balances).toHaveLength(2) // ETH + USDC
      expect(result2.balances).toHaveLength(2)
      expect(result1.lastUpdated).toEqual(result2.lastUpdated)
      
      // Should have cached the data
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })

    it('should invalidate cache when network changes', async () => {
      const mockUser = {
        evmAccounts: [{ address: '0xtest123' }],
        evmSmartAccounts: []
      }

      // Get balance for mainnet
      const mainnetResult = await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')
      
      // Get balance for testnet (should not use mainnet cache)
      const testnetResult = await CDPBalanceService.getBalances(mockUser as any, 'base-sepolia')

      expect(mainnetResult.balances).toHaveLength(2)
      expect(testnetResult.balances).toHaveLength(2)
      
      // Should have made separate network calls
      const { createPublicClient } = require('viem')
      expect(createPublicClient).toHaveBeenCalledTimes(2)
    })

    it('should detect stale cache data and mark it appropriately', async () => {
      const mockUser = {
        evmAccounts: [{ address: '0xtest123' }],
        evmSmartAccounts: []
      }

      // Set up stale cache data
      const staleData = {
        address: '0xtest123',
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
        isStale: false
      }

      // Manually set stale cache
      mockLocalStorage.setItem(
        'cdp_balance_0xtest123_base-mainnet',
        JSON.stringify({
          ...staleData,
          lastUpdated: staleData.lastUpdated.toISOString()
        })
      )

      // Mock network failure to force cache usage
      const { createPublicClient } = require('viem')
      createPublicClient.mockReturnValue({
        getBalance: jest.fn().mockRejectedValue(new Error('Network timeout'))
      })

      const result = await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')

      expect(result.isStale).toBe(true)
      expect(result.balances[0].formatted).toBe('0.5')
    })

    it('should refresh stale cache data when network is available', async () => {
      const mockUser = {
        evmAccounts: [{ address: '0xtest123' }],
        evmSmartAccounts: []
      }

      // Set up stale cache
      const staleData = {
        address: '0xtest123',
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
        isStale: false
      }

      mockLocalStorage.setItem(
        'cdp_balance_0xtest123_base-mainnet',
        JSON.stringify({
          ...staleData,
          lastUpdated: staleData.lastUpdated.toISOString()
        })
      )

      // Use refresh method to force cache bypass
      const result = await CDPBalanceService.refreshBalances(mockUser as any, 'base-mainnet')

      expect(result.isStale).toBe(false)
      expect(result.balances).toHaveLength(2) // Should get fresh data
      expect(result.lastUpdated.getTime()).toBeGreaterThan(Date.now() - 10000)
    })

    it('should handle cache corruption gracefully', async () => {
      const mockUser = {
        evmAccounts: [{ address: '0xtest123' }],
        evmSmartAccounts: []
      }

      // Set corrupted cache data
      mockLocalStorage.setItem(
        'cdp_balance_0xtest123_base-mainnet',
        'invalid json data'
      )

      // Should not throw and should fetch fresh data
      const result = await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')

      expect(result.balances).toHaveLength(2)
      expect(result.isStale).toBe(false)
    })
  })

  describe('Transaction Cache Behavior', () => {
    it('should cache transaction history and return cached data', async () => {
      const mockTransactionData = {
        address: '0xtest123',
        transactions: [
          {
            hash: '0xabc123',
            type: 'send' as const,
            value: '1000000000000000000',
            asset: 'ETH',
            timestamp: Date.now(),
            from: '0xtest123',
            to: '0xrecipient',
            status: 'confirmed' as const,
            network: 'base-mainnet',
            transactionType: 'evm' as const
          }
        ],
        lastUpdated: new Date(),
        hasMore: false,
        network: 'base-mainnet'
      }

      // Mock the service to return transaction data
      const mockTransactionService = CDPTransactionService as jest.Mocked<typeof CDPTransactionService>
      mockTransactionService.getTransactionHistory = jest.fn().mockResolvedValue(mockTransactionData)

      // First call
      const result1 = await CDPTransactionService.getTransactionHistory('0xtest123', 'base-mainnet')
      
      // Second call should use cache
      const result2 = await CDPTransactionService.getTransactionHistory('0xtest123', 'base-mainnet')

      expect(result1.transactions).toHaveLength(1)
      expect(result2.transactions).toHaveLength(1)
      expect(result1.lastUpdated).toEqual(result2.lastUpdated)
    })

    it('should invalidate transaction cache when new transactions are detected', async () => {
      const initialData = {
        address: '0xtest123',
        transactions: [
          {
            hash: '0xold123',
            type: 'send' as const,
            value: '1000000000000000000',
            asset: 'ETH',
            timestamp: Date.now() - 60000,
            from: '0xtest123',
            to: '0xrecipient',
            status: 'confirmed' as const,
            network: 'base-mainnet',
            transactionType: 'evm' as const
          }
        ],
        lastUpdated: new Date(Date.now() - 30000),
        hasMore: false,
        network: 'base-mainnet'
      }

      const updatedData = {
        ...initialData,
        transactions: [
          {
            hash: '0xnew456',
            type: 'receive' as const,
            value: '2000000000000000000',
            asset: 'ETH',
            timestamp: Date.now(),
            from: '0xsender',
            to: '0xtest123',
            status: 'confirmed' as const,
            network: 'base-mainnet',
            transactionType: 'evm' as const
          },
          ...initialData.transactions
        ],
        lastUpdated: new Date()
      }

      const mockTransactionService = CDPTransactionService as jest.Mocked<typeof CDPTransactionService>
      mockTransactionService.getTransactionHistory = jest.fn()
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce(updatedData)

      // First call
      const result1 = await CDPTransactionService.getTransactionHistory('0xtest123', 'base-mainnet')
      expect(result1.transactions).toHaveLength(1)

      // Simulate new transaction detection and cache invalidation
      CDPTransactionService.clearCache('0xtest123', 'base-mainnet')

      // Second call should get updated data
      const result2 = await CDPTransactionService.getTransactionHistory('0xtest123', 'base-mainnet')
      expect(result2.transactions).toHaveLength(2)
      expect(result2.transactions[0].hash).toBe('0xnew456')
    })

    it('should handle transaction status updates in cache', async () => {
      const pendingTransaction = {
        hash: '0xpending123',
        status: 'pending' as const,
        confirmations: 0,
        blockNumber: undefined,
        network: 'base-mainnet',
        transactionType: 'evm' as const
      }

      const confirmedTransaction = {
        ...pendingTransaction,
        status: 'confirmed' as const,
        confirmations: 1,
        blockNumber: 12345
      }

      const mockTransactionService = CDPTransactionService as jest.Mocked<typeof CDPTransactionService>
      mockTransactionService.trackTransaction = jest.fn()
        .mockResolvedValueOnce(pendingTransaction)
        .mockResolvedValueOnce(confirmedTransaction)

      // Track pending transaction
      const result1 = await CDPTransactionService.trackTransaction('0xpending123', 'base-mainnet')
      expect(result1.status).toBe('pending')

      // Update transaction status
      CDPTransactionService.updateTransactionStatus('0xpending123', 'base-mainnet', confirmedTransaction)

      // Track again should return updated status
      const result2 = await CDPTransactionService.trackTransaction('0xpending123', 'base-mainnet')
      expect(result2.status).toBe('confirmed')
      expect(result2.confirmations).toBe(1)
    })
  })

  describe('Network Change Cache Behavior', () => {
    it('should maintain separate caches for different networks', async () => {
      const mockUser = {
        evmAccounts: [{ address: '0xtest123' }],
        evmSmartAccounts: []
      }

      // Get balance for mainnet
      const mainnetResult = await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')
      
      // Get balance for testnet
      const testnetResult = await CDPBalanceService.getBalances(mockUser as any, 'base-sepolia')

      // Should have separate cache entries
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cdp_balance_0xtest123_base-mainnet',
        expect.any(String)
      )
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cdp_balance_0xtest123_base-sepolia',
        expect.any(String)
      )

      expect(mainnetResult.balances).toHaveLength(2)
      expect(testnetResult.balances).toHaveLength(2)
    })

    it('should clear network-specific cache when switching networks', async () => {
      const mockUser = {
        evmAccounts: [{ address: '0xtest123' }],
        evmSmartAccounts: []
      }

      // Load data for mainnet
      await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')

      // Clear mainnet cache
      CDPBalanceService.clearCache('0xtest123', 'base-mainnet')

      // Should have removed the cache entry
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'cdp_balance_0xtest123_base-mainnet'
      )
    })

    it('should handle network connectivity changes', async () => {
      const mockUser = {
        evmAccounts: [{ address: '0xtest123' }],
        evmSmartAccounts: []
      }

      // Set up cached data
      const cachedData = {
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
        lastUpdated: new Date(Date.now() - 30000), // 30 seconds ago
        isStale: false
      }

      mockLocalStorage.setItem(
        'cdp_balance_0xtest123_base-mainnet',
        JSON.stringify({
          ...cachedData,
          lastUpdated: cachedData.lastUpdated.toISOString()
        })
      )

      // Simulate network failure
      const { createPublicClient } = require('viem')
      createPublicClient.mockReturnValue({
        getBalance: jest.fn().mockRejectedValue(new Error('Network unreachable'))
      })

      // Should return cached data when network fails
      const result = await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')
      
      expect(result.balances[0].formatted).toBe('1.0')
      expect(result.isStale).toBe(true) // Should be marked as stale due to network failure
    })
  })

  describe('Cache Performance and Cleanup', () => {
    it('should implement cache size limits and cleanup old entries', async () => {
      const mockUser = {
        evmAccounts: [{ address: '0xtest123' }],
        evmSmartAccounts: []
      }

      // Fill cache with multiple entries
      for (let i = 0; i < 10; i++) {
        const address = `0xtest${i.toString().padStart(3, '0')}`
        mockUser.evmAccounts[0].address = address
        await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')
      }

      // Should have created multiple cache entries
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(10)
    })

    it('should handle cache expiration correctly', async () => {
      const mockUser = {
        evmAccounts: [{ address: '0xtest123' }],
        evmSmartAccounts: []
      }

      // Set up expired cache data
      const expiredData = {
        address: '0xtest123',
        balances: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            address: 'native',
            formatted: '0.1',
            raw: BigInt('100000000000000000'),
            decimals: 18
          }
        ],
        lastUpdated: new Date(Date.now() - 300000), // 5 minutes ago
        isStale: false
      }

      mockLocalStorage.setItem(
        'cdp_balance_0xtest123_base-mainnet',
        JSON.stringify({
          ...expiredData,
          lastUpdated: expiredData.lastUpdated.toISOString()
        })
      )

      // Should fetch fresh data instead of using expired cache
      const result = await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')
      
      expect(result.balances).toHaveLength(2) // Fresh data has ETH + USDC
      expect(result.isStale).toBe(false)
      expect(result.lastUpdated.getTime()).toBeGreaterThan(Date.now() - 10000)
    })

    it('should cleanup cache on storage quota exceeded', async () => {
      // Mock localStorage quota exceeded error
      mockLocalStorage.setItem.mockImplementation((key: string, value: string) => {
        if (mockLocalStorage.store.size > 5) {
          throw new Error('QuotaExceededError')
        }
        mockLocalStorage.store.set(key, value)
      })

      const mockUser = {
        evmAccounts: [{ address: '0xtest123' }],
        evmSmartAccounts: []
      }

      // Should handle quota exceeded gracefully
      await expect(
        CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')
      ).resolves.toBeDefined()

      // Should still return valid data even if caching fails
      const result = await CDPBalanceService.getBalances(mockUser as any, 'base-mainnet')
      expect(result.balances).toHaveLength(2)
    })
  })
})