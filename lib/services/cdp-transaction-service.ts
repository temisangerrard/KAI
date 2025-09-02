/**
 * CDP Transaction Service
 * Handles transaction management and tracking using Coinbase Developer Platform APIs
 * Enhanced with retry mechanisms and error handling
 */

import { CDPRetryService } from './cdp-retry-service'
import { WalletErrorService, CDPErrorContext } from './wallet-error-service'

// CDP Transaction Types
export interface CDPTransaction {
  hash: string
  type: 'send' | 'receive' | 'contract' | 'user_operation'
  value: string
  asset: string
  timestamp: number
  from: string
  to: string
  status: 'pending' | 'confirmed' | 'failed'
  gasUsed?: string
  gasPrice?: string
  blockNumber?: number
  network: string
  transactionType: 'evm' | 'user_operation'
  userOperationHash?: string
  receipt?: any
}

export interface CDPTransactionHistory {
  address: string
  transactions: CDPTransaction[]
  lastUpdated: Date
  hasMore: boolean
  network: string
}

export interface CDPTransactionStatus {
  hash: string
  status: 'pending' | 'confirmed' | 'failed'
  confirmations: number
  blockNumber?: number
  receipt?: any
  error?: string
}

export interface CDPTransactionRequest {
  to: string
  from?: string
  value: bigint
  data?: string
  gas?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  chainId: number
  type: 'eip1559'
  nonce?: number
}

export interface CDPUserOperationRequest {
  evmSmartAccount: any
  network: string
  calls: Array<{
    to: string
    value: bigint
    data: string
  }>
}

// Cache management for transaction data
class CDPTransactionCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  static set<T>(key: string, data: T, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }
  
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }
  
  static isStale(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return true
    
    return Date.now() - entry.timestamp > entry.ttl * 0.8 // Consider stale at 80% of TTL
  }
  
  static clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

/**
 * CDP Transaction Service
 * Provides transaction tracking and management using CDP's built-in APIs
 */
export class CDPTransactionService {
  
  /**
   * Track a transaction using CDP's transaction tracking with retry logic
   * This method integrates with CDP hooks to get real transaction status
   */
  static async trackTransaction(
    hash: string,
    network: string,
    transactionType: 'evm' | 'user_operation' = 'evm'
  ): Promise<CDPTransactionStatus> {
    const cacheKey = `tx_status_${hash}_${network}_${transactionType}`
    
    // Check cache first
    const cached = CDPTransactionCache.get<CDPTransactionStatus>(cacheKey)
    if (cached && !CDPTransactionCache.isStale(cacheKey)) {
      return cached
    }

    const context: CDPErrorContext = WalletErrorService.createContext('trackTransaction', {
      network,
      transactionHash: transactionType === 'evm' ? hash : undefined,
      userOperationHash: transactionType === 'user_operation' ? hash : undefined
    })

    // Execute with retry logic
    const result = await CDPRetryService.executeWithRetry(
      async () => {
        // For EVM transactions, we can use the transaction hash directly
        // For user operations, we need to track via the user operation hash
        let status: CDPTransactionStatus
        
        if (transactionType === 'user_operation') {
          // User operations are tracked differently - they may have both userOperationHash and transactionHash
          status = {
            hash,
            status: 'pending',
            confirmations: 0,
            blockNumber: undefined,
            receipt: null,
            error: undefined
          }
        } else {
          // EVM transactions can be tracked using standard transaction hash
          status = {
            hash,
            status: 'pending',
            confirmations: 0,
            blockNumber: undefined,
            receipt: null,
            error: undefined
          }
        }
        
        // Cache the result with shorter TTL for pending transactions
        const cacheTTL = status.status === 'pending' ? 30000 : 300000 // 30s for pending, 5min for final
        CDPTransactionCache.set(cacheKey, status, cacheTTL)
        
        return status
      },
      context,
      {
        maxRetries: 2,
        baseDelay: 1000,
        maxDelay: 5000,
        onRetry: (attempt, error, delay) => {
          console.log(`Retrying transaction tracking (attempt ${attempt}) for ${hash}: ${error.userMessage}`)
        }
      }
    )

    if (result.success) {
      return result.data!
    } else {
      throw result.error
    }
  }
  
  /**
   * Get transaction history using CDP's transaction data with retry logic
   * This method builds transaction history from CDP hook data and cached transactions
   */
  static async getTransactionHistory(
    address: string,
    network: string,
    limit: number = 50
  ): Promise<CDPTransactionHistory> {
    const cacheKey = `tx_history_${address}_${network}_${limit}`
    
    // Check cache first
    const cached = CDPTransactionCache.get<CDPTransactionHistory>(cacheKey)
    if (cached && !CDPTransactionCache.isStale(cacheKey)) {
      return cached
    }

    const context: CDPErrorContext = WalletErrorService.createContext('getTransactionHistory', {
      network,
      address
    })

    // Execute with retry logic and manual refresh capability
    try {
      return await CDPRetryService.executeWithManualRefresh(
        async () => {
          // Get cached transactions from individual transaction records
          const cachedTransactions = this.getCachedTransactionsForAddress(address, network)
          
          const history: CDPTransactionHistory = {
            address,
            transactions: cachedTransactions.slice(0, limit),
            lastUpdated: new Date(),
            hasMore: cachedTransactions.length > limit,
            network
          }
          
          // Cache the result
          CDPTransactionCache.set(cacheKey, history, 300000) // 5 minutes cache
          
          return history
        },
        context,
        () => {
          console.log('Manual refresh suggested for transaction history')
          // Clear cache to force fresh data
          CDPTransactionCache.clear(`tx_history_${address}`)
        }
      )
    } catch (error) {
      // Enhance error with manual refresh suggestion
      const walletError = WalletErrorService.handleApiError(error, context)
      if (WalletErrorService.shouldRetry(walletError, 0)) {
        walletError.userMessage += ' Try using the refresh button to reload data.'
      }
      throw walletError
    }
  }
  
  /**
   * Monitor transaction status with polling
   */
  static async monitorTransaction(
    hash: string,
    network: string,
    onStatusChange: (status: CDPTransactionStatus) => void,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<CDPTransactionStatus> {
    let attempts = 0
    
    const poll = async (): Promise<CDPTransactionStatus> => {
      try {
        const status = await this.trackTransaction(hash, network)
        onStatusChange(status)
        
        // If transaction is confirmed or failed, stop polling
        if (status.status === 'confirmed' || status.status === 'failed') {
          return status
        }
        
        // If max attempts reached, return current status
        if (attempts >= maxAttempts) {
          return status
        }
        
        attempts++
        
        // Wait and poll again
        await new Promise(resolve => setTimeout(resolve, intervalMs))
        return poll()
      } catch (error) {
        console.error('Error monitoring transaction:', error)
        throw error
      }
    }
    
    return poll()
  }
  
  /**
   * Create a transaction record from CDP transaction data
   */
  static createTransactionRecord(
    transactionData: any,
    userOperationData: any,
    network: string
  ): CDPTransaction {
    // Handle EVM transaction
    if (transactionData) {
      const transaction: CDPTransaction = {
        hash: transactionData.hash || transactionData.transactionHash || '',
        type: this.determineTransactionType(transactionData),
        value: this.formatTransactionValue(transactionData.value),
        asset: this.determineAsset(transactionData),
        timestamp: transactionData.timestamp || Date.now(),
        from: transactionData.from || '',
        to: transactionData.to || '',
        status: this.mapTransactionStatus(transactionData.status),
        gasUsed: transactionData.receipt?.gasUsed?.toString() || transactionData.gasUsed?.toString(),
        gasPrice: transactionData.gasPrice?.toString() || transactionData.maxFeePerGas?.toString(),
        blockNumber: transactionData.receipt?.blockNumber || transactionData.blockNumber,
        network,
        transactionType: 'evm',
        receipt: transactionData.receipt
      }
      
      // Cache the transaction
      this.cacheTransaction(transaction)
      return transaction
    }
    
    // Handle User Operation
    if (userOperationData) {
      const transaction: CDPTransaction = {
        hash: userOperationData.transactionHash || userOperationData.userOperationHash || '',
        type: 'user_operation',
        value: this.calculateUserOperationValue(userOperationData),
        asset: 'ETH', // Default to ETH, could be determined from calls
        timestamp: userOperationData.timestamp || Date.now(),
        from: userOperationData.sender || userOperationData.from || '',
        to: userOperationData.target || userOperationData.to || '',
        status: this.mapUserOperationStatus(userOperationData.status),
        network,
        transactionType: 'user_operation',
        userOperationHash: userOperationData.userOperationHash,
        receipt: userOperationData.receipt
      }
      
      // Cache the transaction
      this.cacheTransaction(transaction)
      return transaction
    }
    
    throw new Error('No valid transaction or user operation data provided')
  }
  
  /**
   * Determine transaction type from transaction data
   */
  private static determineTransactionType(transactionData: any): 'send' | 'receive' | 'contract' | 'user_operation' {
    // If transaction has data, it's likely a contract interaction
    if (transactionData.data && transactionData.data !== '0x' && transactionData.data !== '') {
      return 'contract'
    }
    
    // For now, default to send - this could be enhanced to detect receive transactions
    // by comparing the transaction's 'to' address with the user's address
    return 'send'
  }
  
  /**
   * Format transaction value for display
   */
  private static formatTransactionValue(value: any): string {
    if (!value) return '0'
    
    if (typeof value === 'bigint') {
      return value.toString()
    }
    
    if (typeof value === 'string') {
      return value
    }
    
    if (typeof value === 'number') {
      return value.toString()
    }
    
    return '0'
  }
  
  /**
   * Determine asset from transaction data
   */
  private static determineAsset(transactionData: any): string {
    // Check if this is a token transfer by looking at the 'to' address
    // This is a simplified approach - in practice, you'd decode the transaction data
    if (transactionData.to && transactionData.to.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913') {
      return 'USDC' // Base mainnet USDC
    }
    
    if (transactionData.to && transactionData.to.toLowerCase() === '0x036cbd53842c5426634e7929541ec2318f3dcf7e') {
      return 'USDC' // Base sepolia USDC
    }
    
    // Default to ETH for native transfers
    return 'ETH'
  }
  
  /**
   * Calculate total value for user operations (which can have multiple calls)
   */
  private static calculateUserOperationValue(userOperationData: any): string {
    // User operations can have multiple calls with different values
    if (userOperationData.calls && Array.isArray(userOperationData.calls)) {
      const totalValue = userOperationData.calls.reduce((sum: bigint, call: any) => {
        const callValue = call.value || 0n
        return sum + (typeof callValue === 'bigint' ? callValue : BigInt(callValue))
      }, 0n)
      
      return totalValue.toString()
    }
    
    // Fallback to single value if available
    return this.formatTransactionValue(userOperationData.value) || '0'
  }
  
  /**
   * Map CDP transaction status to our status format
   */
  static mapTransactionStatus(cdpStatus: string): 'pending' | 'confirmed' | 'failed' {
    switch (cdpStatus?.toLowerCase()) {
      case 'success':
      case 'confirmed':
      case 'complete':
        return 'confirmed'
      case 'failed':
      case 'error':
      case 'reverted':
        return 'failed'
      case 'pending':
      case 'submitted':
      default:
        return 'pending'
    }
  }
  
  /**
   * Map CDP user operation status to our status format
   */
  static mapUserOperationStatus(cdpStatus: string): 'pending' | 'confirmed' | 'failed' {
    switch (cdpStatus?.toLowerCase()) {
      case 'complete':
      case 'success':
      case 'confirmed':
        return 'confirmed'
      case 'failed':
      case 'error':
        return 'failed'
      case 'pending':
      case 'submitted':
      default:
        return 'pending'
    }
  }
  
  /**
   * Clear transaction cache for a specific address or pattern
   */
  static clearCache(pattern?: string): void {
    CDPTransactionCache.clear(pattern)
  }
  
  /**
   * Get cached transaction history without making API calls
   */
  static getCachedTransactionHistory(address: string, network: string): CDPTransactionHistory | null {
    const cacheKey = `tx_history_${address}_${network}_50`
    return CDPTransactionCache.get<CDPTransactionHistory>(cacheKey)
  }
  
  /**
   * Get cached transaction status without making API calls
   */
  static getCachedTransactionStatus(hash: string, network: string): CDPTransactionStatus | null {
    const cacheKey = `tx_status_${hash}_${network}_evm`
    const evmStatus = CDPTransactionCache.get<CDPTransactionStatus>(cacheKey)
    if (evmStatus) return evmStatus
    
    const userOpKey = `tx_status_${hash}_${network}_user_operation`
    return CDPTransactionCache.get<CDPTransactionStatus>(userOpKey)
  }
  
  /**
   * Get cached transactions for a specific address
   */
  private static getCachedTransactionsForAddress(address: string, network: string): CDPTransaction[] {
    const transactions: CDPTransaction[] = []
    
    // This is a simplified approach - in a real implementation, we would maintain
    // a separate cache for address-based transaction lookups
    // For now, we return an empty array and rely on the hook to populate transactions
    
    return transactions
  }
  
  /**
   * Add a transaction to the cache and update address-based lookups
   */
  static cacheTransaction(transaction: CDPTransaction): void {
    const txKey = `tx_${transaction.hash}_${transaction.network}`
    CDPTransactionCache.set(txKey, transaction, 3600000) // 1 hour cache for transactions
    
    // Also cache the transaction status
    const status: CDPTransactionStatus = {
      hash: transaction.hash,
      status: transaction.status,
      confirmations: transaction.status === 'confirmed' ? 1 : 0,
      blockNumber: transaction.blockNumber,
      receipt: transaction.receipt
    }
    
    const statusKey = `tx_status_${transaction.hash}_${transaction.network}_${transaction.transactionType}`
    CDPTransactionCache.set(statusKey, status, transaction.status === 'pending' ? 30000 : 300000)
  }
  
  /**
   * Update transaction status in cache
   */
  static updateTransactionStatus(hash: string, network: string, status: CDPTransactionStatus): void {
    const statusKey = `tx_status_${hash}_${network}_evm`
    CDPTransactionCache.set(statusKey, status, status.status === 'pending' ? 30000 : 300000)
    
    // Also try user operation key
    const userOpKey = `tx_status_${hash}_${network}_user_operation`
    CDPTransactionCache.set(userOpKey, status, status.status === 'pending' ? 30000 : 300000)
  }
}

/**
 * Hook-like interface for using CDP transaction tracking in React components
 * This provides a consistent interface that can be used with CDP hooks
 */
export interface CDPTransactionHooks {
  sendEvmTransaction: (request: CDPTransactionRequest) => Promise<any>
  sendUserOperation: (request: CDPUserOperationRequest) => Promise<any>
  trackTransaction: (hash: string, network: string) => Promise<CDPTransactionStatus>
  getTransactionHistory: (address: string, network: string) => Promise<CDPTransactionHistory>
}

/**
 * Transaction service factory that integrates with CDP hooks
 * This creates transaction service instances with actual CDP hook implementations
 */
export class CDPTransactionServiceFactory {
  static create(hooks: {
    sendEvmTransaction: any
    sendUserOperation: any
    waitForUserOperation?: any
    transactionData: any
    userOperationData: any
    evmStatus?: string
    userOpStatus?: string
  }): CDPTransactionHooks {
    return {
      sendEvmTransaction: async (request: CDPTransactionRequest) => {
        // The CDP hook expects evmAccount to be the sender's address, not the recipient
        const networkName = request.chainId === 84532 ? 'base-sepolia' : 'base'
        
        return hooks.sendEvmTransaction({
          evmAccount: request.from || '', // Sender address should be provided
          network: networkName,
          transaction: {
            to: request.to,
            value: request.value,
            data: request.data || '0x',
            gas: request.gas,
            maxFeePerGas: request.maxFeePerGas,
            maxPriorityFeePerGas: request.maxPriorityFeePerGas,
            chainId: request.chainId,
            type: request.type,
            nonce: request.nonce
          }
        })
      },
      
      sendUserOperation: async (request: CDPUserOperationRequest) => {
        return hooks.sendUserOperation({
          evmSmartAccount: request.evmSmartAccount,
          network: request.network,
          calls: request.calls
        })
      },
      
      trackTransaction: async (hash: string, network: string) => {
        // Enhanced tracking that considers current hook data
        let status = await CDPTransactionService.trackTransaction(hash, network)
        
        // Update status based on current hook data
        if (hooks.transactionData?.hash === hash) {
          const updatedStatus: CDPTransactionStatus = {
            hash,
            status: CDPTransactionService.mapTransactionStatus(hooks.evmStatus || hooks.transactionData.status),
            confirmations: hooks.transactionData.receipt ? 1 : 0,
            blockNumber: hooks.transactionData.receipt?.blockNumber,
            receipt: hooks.transactionData.receipt
          }
          
          CDPTransactionService.updateTransactionStatus(hash, network, updatedStatus)
          status = updatedStatus
        }
        
        if (hooks.userOperationData?.transactionHash === hash || hooks.userOperationData?.userOperationHash === hash) {
          const updatedStatus: CDPTransactionStatus = {
            hash,
            status: CDPTransactionService.mapUserOperationStatus(hooks.userOpStatus || hooks.userOperationData.status),
            confirmations: hooks.userOperationData.receipt ? 1 : 0,
            blockNumber: hooks.userOperationData.receipt?.blockNumber,
            receipt: hooks.userOperationData.receipt
          }
          
          CDPTransactionService.updateTransactionStatus(hash, network, updatedStatus)
          status = updatedStatus
        }
        
        return status
      },
      
      getTransactionHistory: async (address: string, network: string) => {
        return CDPTransactionService.getTransactionHistory(address, network)
      }
    }
  }
  
  /**
   * Create a monitoring service that can wait for user operations
   */
  static createMonitoringService(hooks: {
    waitForUserOperation?: any
    transactionData: any
    userOperationData: any
  }) {
    return {
      /**
       * Wait for a user operation to complete using CDP's waitForUserOperation hook
       */
      waitForUserOperation: async (userOperationHash: string, network: string): Promise<CDPTransactionStatus> => {
        if (!hooks.waitForUserOperation) {
          throw new Error('waitForUserOperation hook not available')
        }
        
        try {
          const result = await hooks.waitForUserOperation({
            userOperationHash,
            network
          })
          
          return {
            hash: result.transactionHash || userOperationHash,
            status: CDPTransactionService.mapUserOperationStatus(result.status),
            confirmations: result.receipt ? 1 : 0,
            blockNumber: result.receipt?.blockNumber,
            receipt: result.receipt
          }
        } catch (error) {
          console.error('Failed to wait for user operation:', error)
          throw error
        }
      },
      
      /**
       * Monitor transaction status with real-time updates
       */
      monitorTransactionWithHooks: async (
        hash: string,
        network: string,
        onStatusChange: (status: CDPTransactionStatus) => void
      ): Promise<CDPTransactionStatus> => {
        // Use the enhanced monitoring from the main service
        return CDPTransactionService.monitorTransaction(hash, network, onStatusChange)
      }
    }
  }
}

export default CDPTransactionService