/**
 * CDP Transaction Monitoring Hook
 * Provides real-time transaction status updates and notifications
 * Handles both EOA and smart account transaction types
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  useWaitForUserOperation,
  useSendEvmTransaction,
  useSendUserOperation
} from '@coinbase/cdp-hooks'
import { CDPTransactionService, CDPTransactionStatus } from '@/lib/services/cdp-transaction-service'
import { useToast } from '@/hooks/use-toast'

export interface TransactionMonitoringState {
  hash: string
  type: 'evm' | 'user_operation'
  status: 'pending' | 'confirmed' | 'failed'
  confirmations: number
  startTime: number
  network: string
}

export interface UseCDPTransactionMonitoringOptions {
  network?: string
  enableNotifications?: boolean
  maxMonitoringTime?: number // Maximum time to monitor in milliseconds
  pollingInterval?: number // Polling interval for EVM transactions
}

export interface UseCDPTransactionMonitoringReturn {
  // Monitoring state
  monitoredTransactions: Map<string, TransactionMonitoringState>
  isMonitoring: (hash: string) => boolean
  
  // Monitoring actions
  startMonitoring: (hash: string, type: 'evm' | 'user_operation') => void
  stopMonitoring: (hash: string) => void
  stopAllMonitoring: () => void
  
  // Transaction status
  getTransactionStatus: (hash: string) => TransactionMonitoringState | null
  
  // Notifications
  enableNotifications: boolean
  setEnableNotifications: (enabled: boolean) => void
  
  // Error handling
  monitoringErrors: Map<string, string>
  clearError: (hash: string) => void
}

export function useCDPTransactionMonitoring(
  options: UseCDPTransactionMonitoringOptions = {}
): UseCDPTransactionMonitoringReturn {
  const {
    network = 'base-mainnet',
    enableNotifications: defaultEnableNotifications = true,
    maxMonitoringTime = 300000, // 5 minutes
    pollingInterval = 2000 // 2 seconds
  } = options

  // CDP hooks
  const { waitForUserOperation } = useWaitForUserOperation()
  const { data: evmTransactionData, status: evmStatus } = useSendEvmTransaction()
  const { data: userOperationData, status: userOpStatus } = useSendUserOperation()

  // Toast for notifications
  const { toast } = useToast()

  // State
  const [monitoredTransactions, setMonitoredTransactions] = useState<Map<string, TransactionMonitoringState>>(new Map())
  const [monitoringErrors, setMonitoringErrors] = useState<Map<string, string>>(new Map())
  const [enableNotifications, setEnableNotifications] = useState(defaultEnableNotifications)

  // Keep ref in sync with state to avoid dependency loops
  useEffect(() => {
    monitoredTransactionsRef.current = monitoredTransactions
  }, [monitoredTransactions])

  // Refs for cleanup and avoiding dependency loops
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const monitoringTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const monitoredTransactionsRef = useRef<Map<string, TransactionMonitoringState>>(new Map())

  // Clear error for specific transaction
  const clearError = useCallback((hash: string) => {
    setMonitoringErrors(prev => {
      const newErrors = new Map(prev)
      newErrors.delete(hash)
      return newErrors
    })
  }, [])

  // Show notification for transaction status change
  const showNotification = useCallback((
    hash: string,
    status: 'confirmed' | 'failed',
    type: 'evm' | 'user_operation'
  ) => {
    if (!enableNotifications) return

    const shortHash = `${hash.slice(0, 6)}...${hash.slice(-4)}`
    const transactionType = type === 'user_operation' ? 'Smart Account' : 'EOA'

    if (status === 'confirmed') {
      toast({
        title: "Transaction Confirmed",
        description: `${transactionType} transaction ${shortHash} has been confirmed`,
        duration: 5000,
      })
    } else if (status === 'failed') {
      toast({
        title: "Transaction Failed",
        description: `${transactionType} transaction ${shortHash} has failed`,
        variant: "destructive",
        duration: 7000,
      })
    }
  }, [enableNotifications, toast])

  // Update transaction state
  const updateTransactionState = useCallback((
    hash: string,
    updates: Partial<TransactionMonitoringState>
  ) => {
    setMonitoredTransactions(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(hash)
      if (existing) {
        const updated = { ...existing, ...updates }
        newMap.set(hash, updated)
        
        // Show notification if status changed to final state
        if (updates.status && updates.status !== existing.status) {
          if (updates.status === 'confirmed' || updates.status === 'failed') {
            showNotification(hash, updates.status, existing.type)
          }
        }
      }
      return newMap
    })
  }, [showNotification])

  // Monitor EVM transaction with polling
  const monitorEvmTransaction = useCallback(async (hash: string) => {
    const pollTransaction = async () => {
      try {
        const status = await CDPTransactionService.trackTransaction(hash, network, 'evm')
        
        updateTransactionState(hash, {
          status: status.status,
          confirmations: status.confirmations
        })

        // If transaction is final, stop monitoring
        if (status.status === 'confirmed' || status.status === 'failed') {
          const interval = pollingIntervals.current.get(hash)
          if (interval) {
            clearInterval(interval)
            pollingIntervals.current.delete(hash)
          }
          
          const timeout = monitoringTimeouts.current.get(hash)
          if (timeout) {
            clearTimeout(timeout)
            monitoringTimeouts.current.delete(hash)
          }
        }
      } catch (error) {
        console.error(`Error monitoring EVM transaction ${hash}:`, error)
        setMonitoringErrors(prev => {
          const newErrors = new Map(prev)
          newErrors.set(hash, error instanceof Error ? error.message : 'Unknown error')
          return newErrors
        })
      }
    }

    // Start polling
    const interval = setInterval(pollTransaction, pollingInterval)
    pollingIntervals.current.set(hash, interval)

    // Set maximum monitoring time
    const timeout = setTimeout(() => {
      clearInterval(interval)
      pollingIntervals.current.delete(hash)
      monitoringTimeouts.current.delete(hash)
      
      updateTransactionState(hash, {
        status: 'failed'
      })
      
      setMonitoringErrors(prev => {
        const newErrors = new Map(prev)
        newErrors.set(hash, 'Transaction monitoring timed out')
        return newErrors
      })
    }, maxMonitoringTime)
    
    monitoringTimeouts.current.set(hash, timeout)

    // Initial poll
    pollTransaction()
  }, [network, pollingInterval, maxMonitoringTime, updateTransactionState])

  // Monitor user operation using CDP's waitForUserOperation
  const monitorUserOperation = useCallback(async (hash: string) => {
    try {
      // Use CDP's waitForUserOperation hook for smart account transactions
      const result = await waitForUserOperation({
        userOperationHash: hash,
        network: network === 'base-mainnet' ? 'base' : 'base-sepolia'
      })

      if (result) {
        const finalStatus = result.receipt ? 'confirmed' : 'failed'
        
        updateTransactionState(hash, {
          status: finalStatus,
          confirmations: result.receipt ? 1 : 0
        })
      }
    } catch (error) {
      console.error(`Error monitoring user operation ${hash}:`, error)
      
      updateTransactionState(hash, {
        status: 'failed'
      })
      
      setMonitoringErrors(prev => {
        const newErrors = new Map(prev)
        newErrors.set(hash, error instanceof Error ? error.message : 'User operation monitoring failed')
        return newErrors
      })
    }
  }, [network, waitForUserOperation, updateTransactionState])

  // Start monitoring a transaction
  const startMonitoring = useCallback((hash: string, type: 'evm' | 'user_operation') => {
    setMonitoredTransactions(prev => {
      // Don't start monitoring if already monitoring
      if (prev.has(hash)) {
        return prev
      }

      const transactionState: TransactionMonitoringState = {
        hash,
        type,
        status: 'pending',
        confirmations: 0,
        startTime: Date.now(),
        network
      }

      const newMap = new Map(prev)
      newMap.set(hash, transactionState)
      
      // Clear any existing error for this transaction
      clearError(hash)

      // Start appropriate monitoring based on transaction type
      if (type === 'user_operation') {
        monitorUserOperation(hash)
      } else {
        monitorEvmTransaction(hash)
      }
      
      return newMap
    })
  }, [network, clearError, monitorUserOperation, monitorEvmTransaction])

  // Stop monitoring a specific transaction
  const stopMonitoring = useCallback((hash: string) => {
    // Clear polling interval
    const interval = pollingIntervals.current.get(hash)
    if (interval) {
      clearInterval(interval)
      pollingIntervals.current.delete(hash)
    }

    // Clear timeout
    const timeout = monitoringTimeouts.current.get(hash)
    if (timeout) {
      clearTimeout(timeout)
      monitoringTimeouts.current.delete(hash)
    }

    // Remove from monitored transactions
    setMonitoredTransactions(prev => {
      const newMap = new Map(prev)
      newMap.delete(hash)
      return newMap
    })

    // Clear error
    clearError(hash)
  }, [clearError])

  // Stop all monitoring
  const stopAllMonitoring = useCallback(() => {
    // Clear all intervals
    pollingIntervals.current.forEach(interval => clearInterval(interval))
    pollingIntervals.current.clear()

    // Clear all timeouts
    monitoringTimeouts.current.forEach(timeout => clearTimeout(timeout))
    monitoringTimeouts.current.clear()

    // Clear state
    setMonitoredTransactions(new Map())
    setMonitoringErrors(new Map())
  }, [])

  // Check if transaction is being monitored
  const isMonitoring = useCallback((hash: string) => {
    // Use a ref to avoid dependency on monitoredTransactions state
    return monitoredTransactionsRef.current.has(hash)
  }, [])

  // Get transaction status
  const getTransactionStatus = useCallback((hash: string) => {
    return monitoredTransactions.get(hash) || null
  }, [monitoredTransactions])

  // Monitor CDP hook data changes for automatic transaction detection
  useEffect(() => {
    if (evmTransactionData?.hash && !isMonitoring(evmTransactionData.hash)) {
      startMonitoring(evmTransactionData.hash, 'evm')
    }
  }, [evmTransactionData, isMonitoring, startMonitoring])

  useEffect(() => {
    if (userOperationData?.userOperationHash && !isMonitoring(userOperationData.userOperationHash)) {
      startMonitoring(userOperationData.userOperationHash, 'user_operation')
    }
  }, [userOperationData, isMonitoring, startMonitoring])

  // Update transaction status based on CDP hook status changes
  useEffect(() => {
    if (evmTransactionData?.hash) {
      const mappedStatus = CDPTransactionService.mapTransactionStatus(evmStatus)
      updateTransactionState(evmTransactionData.hash, {
        status: mappedStatus,
        confirmations: mappedStatus === 'confirmed' ? 1 : 0
      })
    }
  }, [evmTransactionData, evmStatus, updateTransactionState])

  useEffect(() => {
    if (userOperationData?.userOperationHash) {
      const mappedStatus = CDPTransactionService.mapUserOperationStatus(userOpStatus)
      updateTransactionState(userOperationData.userOperationHash, {
        status: mappedStatus,
        confirmations: mappedStatus === 'confirmed' ? 1 : 0
      })
    }
  }, [userOperationData, userOpStatus, updateTransactionState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllMonitoring()
    }
  }, [stopAllMonitoring])

  return {
    // Monitoring state
    monitoredTransactions,
    isMonitoring,
    
    // Monitoring actions
    startMonitoring,
    stopMonitoring,
    stopAllMonitoring,
    
    // Transaction status
    getTransactionStatus,
    
    // Notifications
    enableNotifications,
    setEnableNotifications,
    
    // Error handling
    monitoringErrors,
    clearError
  }
}

export default useCDPTransactionMonitoring