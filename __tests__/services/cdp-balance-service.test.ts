/**
 * Unit tests for CDP Balance Service
 * Tests CDP-based balance fetching functionality with proper error handling
 */

// Mock viem before importing the service
jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  http: jest.fn(() => 'mock-transport'),
  formatEther: jest.fn((value) => (Number(value) / 1e18).toString()),
  formatUnits: jest.fn((value, decimals) => (Number(value) / Math.pow(10, decimals)).toString()),
  getContract: jest.fn(),
  base: { id: 8453, name: 'Base' },
  baseSepolia: { id: 84532, name: 'Base Sepolia' },
}))

import { CDPBalanceService, type WalletBalance, type CDPBalanceError } from '@/lib/services/cdp-balance-service'
import { type User } from '@coinbase/cdp-hooks'

describe('CDPBalanceService', () => {
  const mockUser: User = {
    id: 'test-user-id',
    evmAccounts: [{ address: '0x1234567890123456789012345678901234567890' }],
    evmSmartAccounts: [{ address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' }],
  } as User

  const mockAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'

  beforeEach(() => {
    jest.clearAllMocks()
    CDPBalanceService.clearAllCache()
  })

  describe('getBalances', () => {
    it('should fetch balances successfully using smart account address', async () => {
      const mockClient = {
        getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')), // 1 ETH
      }

      const mockContract = {
        read: {
          balanceOf: jest.fn().mockResolvedValue(BigInt('1000000')), // 1 USDC
          decimals: jest.fn().mockResolvedValue(6),
          symbol: jest.fn().mockResolvedValue('USDC'),
          name: jest.fn().mockResolvedValue('USD Coin'),
        },
      }

      const { createPublicClient, getContract } = require('viem')
      createPublicClient.mockReturnValue(mockClient)
      getContract.mockReturnValue(mockContract)

      const result = await CDPBalanceService.getBalances(mockUser, 'base-mainnet')

      expect(result).toEqual({
        address: mockAddress,
        balances: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            address: 'native',
            formatted: '1',
            raw: BigInt('1000000000000000000'),
            decimals: 18,
          },
          {
            symbol: 'USDC',
            name: 'USD Coin',
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            formatted: '1',
            raw: BigInt('1000000'),
            decimals: 6,
          },
        ],
        lastUpdated: expect.any(Date),
        isStale: false,
      })

      expect(mockClient.getBalance).toHaveBeenCalledWith({
        address: mockAddress,
      })
    })

    it('should fallback to EVM account address if no smart account', async () => {
      const userWithoutSmartAccount: User = {
        id: 'test-user-id',
        evmAccounts: [{ address: '0x1234567890123456789012345678901234567890' }],
        evmSmartAccounts: [],
      } as User

      const mockClient = {
        getBalance: jest.fn().mockResolvedValue(BigInt('500000000000000000')), // 0.5 ETH
      }

      const mockContract = {
        read: {
          balanceOf: jest.fn().mockResolvedValue(BigInt('500000')), // 0.5 USDC
          decimals: jest.fn().mockResolvedValue(6),
          symbol: jest.fn().mockResolvedValue('USDC'),
          name: jest.fn().mockResolvedValue('USD Coin'),
        },
      }

      const { createPublicClient, getContract } = require('viem')
      createPublicClient.mockReturnValue(mockClient)
      getContract.mockReturnValue(mockContract)

      const result = await CDPBalanceService.getBalances(userWithoutSmartAccount, 'base-mainnet')

      expect(result.address).toBe('0x1234567890123456789012345678901234567890')
      expect(mockClient.getBalance).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
      })
    })

    it('should use base-sepolia network configuration', async () => {
      const mockClient = {
        getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
      }

      const mockContract = {
        read: {
          balanceOf: jest.fn().mockResolvedValue(BigInt('1000000')),
          decimals: jest.fn().mockResolvedValue(6),
          symbol: jest.fn().mockResolvedValue('USDC'),
          name: jest.fn().mockResolvedValue('USD Coin'),
        },
      }

      const { createPublicClient, getContract } = require('viem')
      createPublicClient.mockReturnValue(mockClient)
      getContract.mockReturnValue(mockContract)

      await CDPBalanceService.getBalances(mockUser, 'base-sepolia')

      expect(createPublicClient).toHaveBeenCalled()
      expect(getContract).toHaveBeenCalledWith({
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
        abi: expect.any(Array),
        client: mockClient,
      })
    })

    it('should throw error when no user provided', async () => {
      await expect(CDPBalanceService.getBalances(null)).rejects.toMatchObject({
        code: 'NO_USER',
        userMessage: 'Please sign in to view balances',
        recoverable: true,
        retryable: true,
      })
    })

    it('should throw error when user has no addresses', async () => {
      const userWithoutAddresses: User = {
        id: 'test-user-id',
        evmAccounts: [],
        evmSmartAccounts: [],
      } as User

      await expect(CDPBalanceService.getBalances(userWithoutAddresses)).rejects.toMatchObject({
        code: 'NO_ADDRESS',
        userMessage: 'Unable to find wallet address',
        recoverable: true,
        retryable: true,
      })
    })

    it('should handle network timeout errors', async () => {
      const mockClient = {
        getBalance: jest.fn().mockRejectedValue(new Error('Request timeout')),
      }

      const { createPublicClient } = require('viem')
      createPublicClient.mockReturnValue(mockClient)

      await expect(CDPBalanceService.getBalances(mockUser)).rejects.toMatchObject({
        code: 'TIMEOUT',
        userMessage: 'Request timed out. Please check your connection and try again.',
        recoverable: true,
        retryable: true,
      })
    })

    it('should handle network connectivity errors', async () => {
      const mockClient = {
        getBalance: jest.fn().mockRejectedValue(new Error('fetch failed')),
      }

      const { createPublicClient } = require('viem')
      createPublicClient.mockReturnValue(mockClient)

      await expect(CDPBalanceService.getBalances(mockUser)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        userMessage: 'Network error. Please check your connection and try again.',
        recoverable: true,
        retryable: true,
      })
    })

    it('should handle rate limiting errors', async () => {
      const mockClient = {
        getBalance: jest.fn().mockRejectedValue(new Error('rate limit exceeded')),
      }

      const { createPublicClient } = require('viem')
      createPublicClient.mockReturnValue(mockClient)

      await expect(CDPBalanceService.getBalances(mockUser)).rejects.toMatchObject({
        code: 'RATE_LIMIT',
        userMessage: 'Too many requests. Please wait a moment and try again.',
        recoverable: true,
        retryable: true,
      })
    })

    it('should handle invalid address errors', async () => {
      const mockClient = {
        getBalance: jest.fn().mockRejectedValue(new Error('invalid address format')),
      }

      const { createPublicClient } = require('viem')
      createPublicClient.mockReturnValue(mockClient)

      await expect(CDPBalanceService.getBalances(mockUser)).rejects.toMatchObject({
        code: 'INVALID_ADDRESS',
        userMessage: 'Invalid wallet address. Please check your wallet connection.',
        recoverable: false,
        retryable: false,
      })
    })

    it('should return zero balance for failed token fetches', async () => {
      const mockClient = {
        getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
      }

      const mockContract = {
        read: {
          balanceOf: jest.fn().mockRejectedValue(new Error('Contract call failed')),
          decimals: jest.fn().mockRejectedValue(new Error('Contract call failed')),
          symbol: jest.fn().mockRejectedValue(new Error('Contract call failed')),
          name: jest.fn().mockRejectedValue(new Error('Contract call failed')),
        },
      }

      const { createPublicClient, getContract } = require('viem')
      createPublicClient.mockReturnValue(mockClient)
      getContract.mockReturnValue(mockContract)

      const result = await CDPBalanceService.getBalances(mockUser, 'base-mainnet')

      expect(result.balances[1]).toEqual({
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        formatted: '0.000000',
        raw: 0n,
        decimals: 6,
      })
    })
  })

  describe('caching', () => {
    it('should return cached data when available and fresh', async () => {
      const mockClient = {
        getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
      }

      const mockContract = {
        read: {
          balanceOf: jest.fn().mockResolvedValue(BigInt('1000000')),
          decimals: jest.fn().mockResolvedValue(6),
          symbol: jest.fn().mockResolvedValue('USDC'),
          name: jest.fn().mockResolvedValue('USD Coin'),
        },
      }

      const { createPublicClient, getContract } = require('viem')
      createPublicClient.mockReturnValue(mockClient)
      getContract.mockReturnValue(mockContract)

      // First call
      const result1 = await CDPBalanceService.getBalances(mockUser)
      
      // Second call should use cache
      const result2 = await CDPBalanceService.getBalances(mockUser)

      expect(mockClient.getBalance).toHaveBeenCalledTimes(1)
      expect(result1).toEqual(result2)
    })

    it('should return stale cached data when API fails', async () => {
      const mockClient = {
        getBalance: jest.fn()
          .mockResolvedValueOnce(BigInt('1000000000000000000'))
          .mockRejectedValueOnce(new Error('Network error')),
      }

      const mockContract = {
        read: {
          balanceOf: jest.fn().mockResolvedValue(BigInt('1000000')),
          decimals: jest.fn().mockResolvedValue(6),
          symbol: jest.fn().mockResolvedValue('USDC'),
          name: jest.fn().mockResolvedValue('USD Coin'),
        },
      }

      const { createPublicClient, getContract } = require('viem')
      createPublicClient.mockReturnValue(mockClient)
      getContract.mockReturnValue(mockContract)

      // First call succeeds
      const result1 = await CDPBalanceService.getBalances(mockUser)
      
      // Clear cache to simulate stale data
      CDPBalanceService.clearCache(mockAddress)
      
      // Manually set stale cache
      const staleBalance: WalletBalance = { ...result1, isStale: true }
      ;(CDPBalanceService as any).cache.set(mockAddress, {
        data: staleBalance,
        timestamp: Date.now() - 60000, // 1 minute ago
      })

      // Second call should return stale data when API fails
      const result2 = await CDPBalanceService.getBalances(mockUser)

      expect(result2.isStale).toBe(true)
      expect(result2.address).toBe(result1.address)
    })

    it('should clear cache correctly', () => {
      const testBalance: WalletBalance = {
        address: mockAddress,
        balances: [],
        lastUpdated: new Date(),
        isStale: false,
      }

      // Set cache
      ;(CDPBalanceService as any).cache.set(mockAddress, {
        data: testBalance,
        timestamp: Date.now(),
      })

      expect(CDPBalanceService.getCachedBalances(mockAddress)).toBeTruthy()

      // Clear cache
      CDPBalanceService.clearCache(mockAddress)

      expect(CDPBalanceService.getCachedBalances(mockAddress)).toBeNull()
    })
  })

  describe('refreshBalances', () => {
    it('should bypass cache and fetch fresh data', async () => {
      const mockClient = {
        getBalance: jest.fn().mockResolvedValue(BigInt('2000000000000000000')), // 2 ETH
      }

      const mockContract = {
        read: {
          balanceOf: jest.fn().mockResolvedValue(BigInt('2000000')), // 2 USDC
          decimals: jest.fn().mockResolvedValue(6),
          symbol: jest.fn().mockResolvedValue('USDC'),
          name: jest.fn().mockResolvedValue('USD Coin'),
        },
      }

      const { createPublicClient, getContract } = require('viem')
      createPublicClient.mockReturnValue(mockClient)
      getContract.mockReturnValue(mockContract)

      // Set initial cache
      const oldBalance: WalletBalance = {
        address: mockAddress,
        balances: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            address: 'native',
            formatted: '1',
            raw: BigInt('1000000000000000000'),
            decimals: 18,
          },
        ],
        lastUpdated: new Date(Date.now() - 1000),
        isStale: false,
      }
      ;(CDPBalanceService as any).cache.set(mockAddress, {
        data: oldBalance,
        timestamp: Date.now(),
      })

      const result = await CDPBalanceService.refreshBalances(mockUser)

      expect(result.balances[0].formatted).toBe('2') // New balance, not cached
      expect(mockClient.getBalance).toHaveBeenCalled()
    })

    it('should throw error when no user provided', async () => {
      await expect(CDPBalanceService.refreshBalances(null)).rejects.toMatchObject({
        code: 'NO_USER',
        userMessage: 'Please sign in to refresh balances',
      })
    })
  })

  describe('getCachedBalances', () => {
    it('should return null when no cache exists', () => {
      const result = CDPBalanceService.getCachedBalances('0xnonexistent')
      expect(result).toBeNull()
    })

    it('should mark data as stale when TTL exceeded', () => {
      const testBalance: WalletBalance = {
        address: mockAddress,
        balances: [],
        lastUpdated: new Date(),
        isStale: false,
      }

      // Set cache with old timestamp
      ;(CDPBalanceService as any).cache.set(mockAddress, {
        data: testBalance,
        timestamp: Date.now() - 60000, // 1 minute ago (exceeds 30s TTL)
      })

      const result = CDPBalanceService.getCachedBalances(mockAddress)
      expect(result?.isStale).toBe(true)
    })

    it('should return fresh data when within TTL', () => {
      const testBalance: WalletBalance = {
        address: mockAddress,
        balances: [],
        lastUpdated: new Date(),
        isStale: false,
      }

      // Set cache with recent timestamp
      ;(CDPBalanceService as any).cache.set(mockAddress, {
        data: testBalance,
        timestamp: Date.now() - 10000, // 10 seconds ago (within 30s TTL)
      })

      const result = CDPBalanceService.getCachedBalances(mockAddress)
      expect(result?.isStale).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should handle unknown errors gracefully', async () => {
      const mockClient = {
        getBalance: jest.fn().mockRejectedValue('Unknown error type'),
      }

      const { createPublicClient } = require('viem')
      createPublicClient.mockReturnValue(mockClient)

      await expect(CDPBalanceService.getBalances(mockUser)).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        userMessage: 'An unexpected error occurred. Please try again.',
        recoverable: true,
        retryable: true,
      })
    })

    it('should log errors for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const mockClient = {
        getBalance: jest.fn().mockRejectedValue(new Error('Test error')),
      }

      const { createPublicClient } = require('viem')
      createPublicClient.mockReturnValue(mockClient)

      try {
        await CDPBalanceService.getBalances(mockUser)
      } catch (error) {
        // Expected to throw
      }

      expect(consoleSpy).toHaveBeenCalledWith('CDP Balance Service Error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })
})