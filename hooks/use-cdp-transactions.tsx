/**
 * React hook for CDP transaction management
 * Integrates CDP transaction service with Coinbase CDP hooks
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  useSendEvmTransaction,
  useSendUserOperation,
  useCurrentUser
} from '@coinbase/cdp-hooks'
import {
  CDPTransactionService,
  CDPTransaction,
  CDPTransactionHistory,
  CDPTransactionStatus,
  CDPTransactionRequest,
  CDPUserOperationRequest
} from '@/lib/services/cdp-transaction-service'
import { useCDPTransactionMonitoring } from './use-cdp-transaction-monitoring'

export interface UseCDPTransactionsOptions {
  address?: string
  network?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export interface UseCDPTransactionsReturn {
  // Transaction sending
  sendEvmTransaction: (request: Omit<CDPTransactionRequest, 'chainId'>) => Promise<void>
  sendUserOperation: (calls: Array<{ to: string; value: bigint; data: string }>) => Promise<void>
  
  // Transaction data
  transactionHistory: CDPTransactionHistory | null
  recentTransactions: CDPTransaction[]
  
  // Loading states
  isLoadingHistory: boolean
  isSendingTransaction: boolean
  isSendingUserOperation: boolean
  
  // Transaction status
  lastTransactionStatus: CDPTransactionStatus | null
  evmTransactionData: any
  userOperationData: any
  
  // Actions
  refreshHistory: () => Promise<void>
  trackTransaction: (hash: string) => Promise<CDPTransactionStatus>
  monitorTransaction: (hash: string, onStatusChange: (status: CDPTransactionStatus) => void) => Promise<CDPTransactionStatus>
  clearCache: () => void
  
  // Transaction monitoring
  monitoredTransactions: Map<string, any>
  isMonitoring: (hash: string) => boolean
  startMonitoring: (hash: string, type: 'evm' | 'user_operation') => void
  stopMonitoring: (hash: string) => void
  enableNotifications: boolean
  setEnableNotifications: (enabled: boolean) => void
  
  // Error handling
  error: string | null
  clearError: () => void
}

export function useCDPTransactions(options: UseCDPTransactionsOptions = {}): UseCDPTransactionsReturn {
  const {
    address,
    network = 'base-mainnet',
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options

  // CDP hooks
  const { sendEvmTransaction, data: evmTransactionData, status: evmStatus } = useSendEvmTransaction()
  const { sendUserOperation, data: userOperationData, status: userOpStatus } = useSendUserOperation()
  const { currentUser } = useCurrentUser()

  // Transaction monitoring
  const {
    monitoredTransactions,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    enableNotifications,
    setEnableNotifications
  } = useCDPTransactionMonitoring({ network })

  // State
  const [transactionHistory, setTransactionHistory] = useState<CDPTransactionHistory | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isSendingTransaction, setIsSendingTransaction] = useState(false)
  const [isSendingUserOperation, setIsSendingUserOperation] = useState(false)
  const [lastTransactionStatus, setLastTransactionStatus] = useState<CDPTransactionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Get network configuration
  const getNetworkConfig = useCallback(() => {
    const isTestnet = network.includes('sepolia') || network.includes('testnet')
    return {
      network: isTestnet ? 'base-sepolia' : 'base',
      chainId: isTestnet ? 84532 : 8453
    }
  }, [network])

  // Refresh transaction history
  const refreshHistory = useCallback(async () => {
    if (!address) return

    setIsLoadingHistory(true)
    setError(null)

    try {
      const history = await CDPTransactionService.getTransactionHistory(address, network)
      setTransactionHistory(history)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transaction history'
      setError(errorMessage)
      console.error('Failed to refresh transaction history:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [address, network])

  // Send EVM transaction
  const handleSendEvmTransaction = useCallback(async (request: Omit<CDPTransactionRequest, 'chainId'>) => {
    if (!address) {
      setError('No wallet address available')
      return
    }

    setIsSendingTransaction(true)
    setError(null)

    try {
      const { network: networkName, chainId } = getNetworkConfig()
      
      const fullRequest: CDPTransactionRequest = {
        ...request,
        chainId
      }

      await sendEvmTransaction({
        evmAccount: address,
        network: networkName as any,
        transaction: fullRequest
      })

      // Transaction will be tracked via evmTransactionData updates
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed'
      setError(errorMessage)
      console.error('EVM transaction failed:', err)
    } finally {
      setIsSendingTransaction(false)
    }
  }, [address, sendEvmTransaction, getNetworkConfig])

  // Send user operation
  const handleSendUserOperation = useCallback(async (calls: Array<{ to: string; value: bigint; data: string }>) => {
    if (!currentUser?.evmSmartAccounts?.[0]) {
      setError('No smart account available')
      return
    }

    setIsSendingUserOperation(true)
    setError(null)

    try {
      const { network: networkName } = getNetworkConfig()
      
      const request: CDPUserOperationRequest = {
        evmSmartAccount: currentUser.evmSmartAccounts[0],
        network: networkName,
        calls
      }

      await sendUserOperation(request)

      // User operation will be tracked via userOperationData updates
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'User operation failed'
      setError(errorMessage)
      console.error('User operation failed:', err)
    } finally {
      setIsSendingUserOperation(false)
    }
  }, [currentUser, sendUserOperation, getNetworkConfig])

  // Track transaction
  const trackTransaction = useCallback(async (hash: string): Promise<CDPTransactionStatus> => {
    try {
      const status = await CDPTransactionService.trackTransaction(hash, network)
      setLastTransactionStatus(status)
      return status
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to track transaction'
      setError(errorMessage)
      throw err
    }
  }, [network])

  // Monitor transaction with polling
  const monitorTransaction = useCallback(async (
    hash: string,
    onStatusChange: (status: CDPTransactionStatus) => void
  ): Promise<CDPTransactionStatus> => {
    try {
      return await CDPTransactionService.monitorTransaction(
        hash,
        network,
        (status) => {
          setLastTransactionStatus(status)
          onStatusChange(status)
        }
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to monitor transaction'
      setError(errorMessage)
      throw err
    }
  }, [network])

  // Clear cache
  const clearCache = useCallback(() => {
    CDPTransactionService.clearCache()
    setTransactionHistory(null)
    setLastTransactionStatus(null)
  }, [])

  // Update transaction status when CDP data changes
  useEffect(() => {
    if (evmTransactionData) {
      try {
        const transaction = CDPTransactionService.createTransactionRecord(
          evmTransactionData,
          null,
          network
        )
        
        // Update transaction history with new transaction
        setTransactionHistory(prev => {
          if (!prev) return null
          
          const updatedTransactions = [transaction, ...prev.transactions]
          return {
            ...prev,
            transactions: updatedTransactions,
            lastUpdated: new Date()
          }
        })

        // Track the transaction status and start monitoring
        if (evmTransactionData.hash) {
          trackTransaction(evmTransactionData.hash).catch(console.error)
          if (!isMonitoring(evmTransactionData.hash)) {
            startMonitoring(evmTransactionData.hash, 'evm')
          }
        }
      } catch (err) {
        console.error('Failed to process EVM transaction data:', err)
      }
    }
  }, [evmTransactionData, network, trackTransaction])

  useEffect(() => {
    if (userOperationData) {
      try {
        const transaction = CDPTransactionService.createTransactionRecord(
          null,
          userOperationData,
          network
        )
        
        // Update transaction history with new transaction
        setTransactionHistory(prev => {
          if (!prev) return null
          
          const updatedTransactions = [transaction, ...prev.transactions]
          return {
            ...prev,
            transactions: updatedTransactions,
            lastUpdated: new Date()
          }
        })

        // Track the user operation status and start monitoring
        if (userOperationData.transactionHash) {
          trackTransaction(userOperationData.transactionHash).catch(console.error)
          if (!isMonitoring(userOperationData.transactionHash)) {
            startMonitoring(userOperationData.transactionHash, 'user_operation')
          }
        } else if (userOperationData.userOperationHash) {
          // Also monitor by user operation hash if transaction hash not available yet
          if (!isMonitoring(userOperationData.userOperationHash)) {
            startMonitoring(userOperationData.userOperationHash, 'user_operation')
          }
        }
      } catch (err) {
        console.error('Failed to process user operation data:', err)
      }
    }
  }, [userOperationData, network, trackTransaction])

  // Update sending states based on CDP hook status
  useEffect(() => {
    setIsSendingTransaction(evmStatus === 'pending')
  }, [evmStatus])

  useEffect(() => {
    setIsSendingUserOperation(userOpStatus === 'pending')
  }, [userOpStatus])

  // Auto-refresh transaction history
  useEffect(() => {
    if (!autoRefresh || !address) return

    const interval = setInterval(() => {
      refreshHistory()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, address, refreshInterval, refreshHistory])

  // Initial load
  useEffect(() => {
    if (address) {
      refreshHistory()
    }
  }, [address, refreshHistory])

  // Derived data
  const recentTransactions = transactionHistory?.transactions.slice(0, 10) || []

  return {
    // Transaction sending
    sendEvmTransaction: handleSendEvmTransaction,
    sendUserOperation: handleSendUserOperation,
    
    // Transaction data
    transactionHistory,
    recentTransactions,
    
    // Loading states
    isLoadingHistory,
    isSendingTransaction,
    isSendingUserOperation,
    
    // Transaction status
    lastTransactionStatus,
    evmTransactionData,
    userOperationData,
    
    // Actions
    refreshHistory,
    trackTransaction,
    monitorTransaction,
    clearCache,
    
    // Transaction monitoring
    monitoredTransactions,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    enableNotifications,
    setEnableNotifications,
    
    // Error handling
    error,
    clearError
  }
}

export default useCDPTransactions