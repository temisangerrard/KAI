/**
 * CDP-based Balance Service for KAI Platform
 * 
 * This service uses Coinbase CDP's built-in capabilities to fetch wallet balances
 * without relying on external blockchain APIs. It integrates with CDP's network
 * support and provides proper error handling for API failures.
 */

import { type User } from '@coinbase/cdp-hooks'
import { createPublicClient, http, formatEther, formatUnits, getContract } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { CDPRetryService } from './cdp-retry-service'
import { WalletErrorService, CDPErrorContext } from './wallet-error-service'

// Token contract addresses for different networks
const TOKEN_CONTRACTS = {
  'base-mainnet': {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  'base-sepolia': {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
} as const

// ERC-20 ABI for balance checking
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
] as const

export interface TokenBalance {
  symbol: string
  name: string
  address: string // 'native' for ETH
  formatted: string
  raw: bigint
  decimals: number
  usdValue?: number
}

export interface WalletBalance {
  address: string
  balances: TokenBalance[]
  lastUpdated: Date
  isStale: boolean
}

export interface CDPBalanceError {
  code: string
  message: string
  userMessage: string
  recoverable: boolean
  retryable: boolean
}

/**
 * CDP Balance Service
 * Uses CDP's built-in network support and viem client for reliable balance fetching
 */
export class CDPBalanceService {
  private static readonly CACHE_TTL = 30000 // 30 seconds
  private static readonly REQUEST_TIMEOUT = 10000 // 10 seconds
  private static cache = new Map<string, { data: WalletBalance; timestamp: number }>()

  /**
   * Get wallet balances using CDP's network configuration with retry logic
   */
  static async getBalances(
    currentUser: User | null,
    networkId: 'base-mainnet' | 'base-sepolia' = 'base-mainnet'
  ): Promise<WalletBalance> {
    if (!currentUser) {
      throw WalletErrorService.handleApiError(
        new Error('No user available'),
        WalletErrorService.createContext('getBalances', { network: networkId })
      )
    }

    // Add defensive checks for user object structure
    if (typeof currentUser !== 'object') {
      throw WalletErrorService.handleApiError(
        new Error('Invalid user object'),
        WalletErrorService.createContext('getBalances', { network: networkId })
      )
    }

    // Get the primary EVM address from CDP user
    const evmAccount = currentUser.evmAccounts?.[0]
    const smartAccount = currentUser.evmSmartAccounts?.[0]
    const address = smartAccount?.address || evmAccount?.address

    if (!address) {
      // Log more details about the user object for debugging
      console.warn('CDP Balance Service: No address found in user object', {
        hasEvmAccounts: !!currentUser.evmAccounts,
        evmAccountsLength: currentUser.evmAccounts?.length || 0,
        hasSmartAccounts: !!currentUser.evmSmartAccounts,
        smartAccountsLength: currentUser.evmSmartAccounts?.length || 0,
        networkId
      })
      
      throw WalletErrorService.handleApiError(
        new Error('No wallet address found'),
        WalletErrorService.createContext('getBalances', { network: networkId })
      )
    }

    // Check cache first
    const cached = this.getCachedBalances(address)
    if (cached && !cached.isStale) {
      return cached
    }

    const context: CDPErrorContext = WalletErrorService.createContext('getBalances', {
      network: networkId,
      address
    })

    // Execute with retry logic
    const result = await CDPRetryService.executeWithRetry(
      async () => {
        // Create viem client for the specified network
        const client = this.createViemClient(networkId)
        
        // Fetch native ETH balance with timeout
        const ethBalance = await Promise.race([
          client.getBalance({ address: address as `0x${string}` }),
          this.timeoutPromise(this.REQUEST_TIMEOUT, 'ETH balance request timed out')
        ])

        // Fetch USDC balance
        const usdcBalance = await this.getTokenBalance(client, address, networkId, 'USDC')

        const balances: TokenBalance[] = [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            address: 'native',
            formatted: formatEther(ethBalance),
            raw: ethBalance,
            decimals: 18,
          },
          usdcBalance,
        ]

        const walletBalance: WalletBalance = {
          address,
          balances,
          lastUpdated: new Date(),
          isStale: false,
        }

        // Cache the result
        this.setCachedBalances(address, walletBalance)

        return walletBalance
      },
      context,
      {
        maxRetries: 3,
        baseDelay: 2000,
        maxDelay: 10000,
        onRetry: (attempt, error, delay) => {
          console.log(`Retrying balance fetch (attempt ${attempt}): ${error.userMessage}. Waiting ${delay}ms...`)
        }
      }
    )

    if (result.success) {
      return result.data!
    } else {
      // Return cached data if available, even if stale
      if (cached) {
        console.log('Returning cached balance data due to persistent failures')
        return { ...cached, isStale: true }
      }
      
      throw result.error
    }
  }

  /**
   * Refresh balances (bypasses cache) with manual refresh capability
   */
  static async refreshBalances(
    currentUser: User | null,
    networkId: 'base-mainnet' | 'base-sepolia' = 'base-mainnet'
  ): Promise<WalletBalance> {
    if (!currentUser) {
      throw WalletErrorService.handleApiError(
        new Error('No user available'),
        WalletErrorService.createContext('refreshBalances', { network: networkId })
      )
    }

    const address = currentUser.evmSmartAccounts?.[0]?.address || currentUser.evmAccounts?.[0]?.address
    if (address) {
      this.clearCache(address)
    }

    const context: CDPErrorContext = WalletErrorService.createContext('refreshBalances', {
      network: networkId,
      address
    })

    // Use manual refresh capability for better error handling
    return CDPRetryService.executeWithManualRefresh(
      () => this.getBalances(currentUser, networkId),
      context,
      () => {
        console.log('Manual refresh suggested for balance data')
        // Clear cache to force fresh data
        if (address) {
          this.clearCache(address)
        }
      }
    )
  }

  /**
   * Get cached balances
   */
  static getCachedBalances(address: string): WalletBalance | null {
    const cached = this.cache.get(address)
    if (!cached) return null

    const isStale = Date.now() - cached.timestamp > this.CACHE_TTL
    return { ...cached.data, isStale }
  }

  /**
   * Clear cache for specific address
   */
  static clearCache(address: string): void {
    this.cache.delete(address)
  }

  /**
   * Clear all cache
   */
  static clearAllCache(): void {
    this.cache.clear()
  }

  /**
   * Create viem client for the specified network
   */
  private static createViemClient(networkId: 'base-mainnet' | 'base-sepolia') {
    const chain = networkId === 'base-mainnet' ? base : baseSepolia
    
    return createPublicClient({
      chain,
      transport: http(undefined, {
        timeout: this.REQUEST_TIMEOUT,
        retryCount: 2,
        retryDelay: 1000,
      }),
    })
  }

  /**
   * Get token balance for ERC-20 tokens
   */
  private static async getTokenBalance(
    client: any,
    address: string,
    networkId: 'base-mainnet' | 'base-sepolia',
    tokenSymbol: keyof typeof TOKEN_CONTRACTS['base-mainnet']
  ): Promise<TokenBalance> {
    try {
      const tokenAddress = TOKEN_CONTRACTS[networkId][tokenSymbol]
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol} not supported on ${networkId}`)
      }

      const contract = getContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        client,
      })

      const [balance, decimals, symbol, name] = await Promise.all([
        contract.read.balanceOf([address as `0x${string}`]),
        contract.read.decimals(),
        contract.read.symbol(),
        contract.read.name(),
      ])

      return {
        symbol: symbol as string,
        name: name as string,
        address: tokenAddress,
        formatted: formatUnits(balance as bigint, decimals as number),
        raw: balance as bigint,
        decimals: decimals as number,
      }
    } catch (error) {
      console.warn(`Failed to fetch ${tokenSymbol} balance:`, error)
      
      // Return zero balance as fallback
      return {
        symbol: tokenSymbol,
        name: tokenSymbol === 'USDC' ? 'USD Coin' : tokenSymbol,
        address: TOKEN_CONTRACTS[networkId][tokenSymbol] || '',
        formatted: '0.000000',
        raw: 0n,
        decimals: tokenSymbol === 'USDC' ? 6 : 18,
      }
    }
  }

  /**
   * Set cached balances
   */
  private static setCachedBalances(address: string, balance: WalletBalance): void {
    this.cache.set(address, {
      data: balance,
      timestamp: Date.now(),
    })
  }

  /**
   * Create timeout promise for request timeout handling
   */
  private static timeoutPromise<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    })
  }

  /**
   * Handle and transform errors into user-friendly format
   */
  private static handleError(error: unknown): CDPBalanceError {
    console.error('CDP Balance Service Error:', error)

    if (error instanceof Error) {
      // Network/timeout errors
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        return this.createError(
          'TIMEOUT',
          error.message,
          'Request timed out. Please check your connection and try again.',
          true,
          true
        )
      }

      // Network connectivity errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return this.createError(
          'NETWORK_ERROR',
          error.message,
          'Network error. Please check your connection and try again.',
          true,
          true
        )
      }

      // Rate limiting
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return this.createError(
          'RATE_LIMIT',
          error.message,
          'Too many requests. Please wait a moment and try again.',
          true,
          true
        )
      }

      // Invalid address
      if (error.message.includes('invalid address')) {
        return this.createError(
          'INVALID_ADDRESS',
          error.message,
          'Invalid wallet address. Please check your wallet connection.',
          false,
          false
        )
      }
    }

    // Generic error
    return this.createError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      'An unexpected error occurred. Please try again.',
      true,
      true
    )
  }

  /**
   * Create standardized error object
   */
  private static createError(
    code: string,
    message: string,
    userMessage: string,
    recoverable: boolean = true,
    retryable: boolean = true
  ): CDPBalanceError {
    return {
      code,
      message,
      userMessage,
      recoverable,
      retryable,
    }
  }
}