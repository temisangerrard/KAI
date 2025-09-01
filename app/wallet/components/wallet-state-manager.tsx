'use client'

/**
 * Wallet State Manager Component
 * 
 * Manages loading, error, offline, and stale data states for wallet components
 */

import React, { useState, useEffect, useCallback } from 'react'
import { 
  BalanceLoadingState, 
  TransactionLoadingState, 
  NetworkLoadingState,
  TransactionSendingState,
  OfflineIndicator,
  StaleDataIndicator
} from './wallet-loading-states'
import { 
  CDPErrorState, 
  BalanceErrorState, 
  TransactionErrorState, 
  NetworkErrorState,
  SuccessState
} from './wallet-error-states'

interface WalletStateManagerProps {
  children: React.ReactNode
  className?: string
}

interface StateManagerContextType {
  // Loading states
  showBalanceLoading: (show: boolean) => void
  showTransactionLoading: (show: boolean) => void
  showNetworkLoading: (show: boolean) => void
  showTransactionSending: (isSmartAccount?: boolean, hash?: string, message?: string) => void
  hideTransactionSending: () => void
  
  // Error states
  showBalanceError: (error: any, onRetry?: () => void, showCached?: boolean) => void
  showTransactionError: (error: any, hash?: string, onRetry?: () => void, isUserOp?: boolean) => void
  showNetworkError: (error: any, onRetry?: () => void) => void
  showCDPError: (error: any, onRetry?: () => void) => void
  clearErrors: () => void
  
  // Success states
  showSuccess: (message: string, hash?: string, blockNumber?: number) => void
  clearSuccess: () => void
  
  // Offline/stale states
  showOffline: (show: boolean) => void
  showStaleData: (lastUpdated?: Date, onRefresh?: () => void) => void
  hideStaleData: () => void
  
  // Network status
  isOnline: boolean
  setOnline: (online: boolean) => void
}

const WalletStateContext = React.createContext<StateManagerContextType | null>(null)

export function useWalletState() {
  const context = React.useContext(WalletStateContext)
  if (!context) {
    throw new Error('useWalletState must be used within WalletStateManager')
  }
  return context
}

interface StateDisplay {
  type: 'loading' | 'error' | 'success' | 'offline' | 'stale' | 'sending'
  component: React.ReactNode
  id: string
  dismissible?: boolean
  autoHide?: number // milliseconds
}

export function WalletStateManager({ children, className = '' }: WalletStateManagerProps) {
  const [states, setStates] = useState<StateDisplay[]>([])
  const [isOnline, setIsOnline] = useState(true)

  // Auto-hide states after timeout
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    
    states.forEach((state) => {
      if (state.autoHide) {
        const timer = setTimeout(() => {
          removeState(state.id)
        }, state.autoHide)
        timers.push(timer)
      }
    })
    
    return () => {
      timers.forEach(clearTimeout)
    }
  }, [states])

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const addState = useCallback((state: StateDisplay) => {
    setStates(prev => {
      // Remove existing state of same type and id if it exists
      const filtered = prev.filter(s => s.id !== state.id)
      return [...filtered, state]
    })
  }, [])

  const removeState = useCallback((id: string) => {
    setStates(prev => prev.filter(s => s.id !== id))
  }, [])

  const clearStatesByType = useCallback((type: StateDisplay['type']) => {
    setStates(prev => prev.filter(s => s.type !== type))
  }, [])

  // Loading state methods
  const showBalanceLoading = useCallback((show: boolean) => {
    if (show) {
      addState({
        type: 'loading',
        id: 'balance-loading',
        component: <BalanceLoadingState />
      })
    } else {
      removeState('balance-loading')
    }
  }, [addState, removeState])

  const showTransactionLoading = useCallback((show: boolean) => {
    if (show) {
      addState({
        type: 'loading',
        id: 'transaction-loading',
        component: <TransactionLoadingState />
      })
    } else {
      removeState('transaction-loading')
    }
  }, [addState, removeState])

  const showNetworkLoading = useCallback((show: boolean) => {
    if (show) {
      addState({
        type: 'loading',
        id: 'network-loading',
        component: <NetworkLoadingState />
      })
    } else {
      removeState('network-loading')
    }
  }, [addState, removeState])

  const showTransactionSending = useCallback((
    isSmartAccount = false, 
    hash?: string, 
    message?: string
  ) => {
    addState({
      type: 'sending',
      id: 'transaction-sending',
      component: (
        <TransactionSendingState
          isSmartAccount={isSmartAccount}
          transactionHash={hash}
          message={message}
        />
      )
    })
  }, [addState])

  const hideTransactionSending = useCallback(() => {
    removeState('transaction-sending')
  }, [removeState])

  // Error state methods
  const showBalanceError = useCallback((
    error: any, 
    onRetry?: () => void, 
    showCached = false
  ) => {
    addState({
      type: 'error',
      id: 'balance-error',
      component: (
        <BalanceErrorState
          error={error}
          onRetry={onRetry}
          onDismiss={() => removeState('balance-error')}
          showCachedData={showCached}
        />
      ),
      dismissible: true
    })
  }, [addState, removeState])

  const showTransactionError = useCallback((
    error: any,
    hash?: string,
    onRetry?: () => void,
    isUserOp = false
  ) => {
    addState({
      type: 'error',
      id: 'transaction-error',
      component: (
        <TransactionErrorState
          error={error}
          transactionHash={hash}
          onRetry={onRetry}
          onDismiss={() => removeState('transaction-error')}
          isUserOperation={isUserOp}
        />
      ),
      dismissible: true,
      autoHide: 10000 // Auto-hide after 10 seconds
    })
  }, [addState, removeState])

  const showNetworkError = useCallback((error: any, onRetry?: () => void) => {
    addState({
      type: 'error',
      id: 'network-error',
      component: (
        <NetworkErrorState
          error={error}
          onRetry={onRetry}
          onDismiss={() => removeState('network-error')}
        />
      ),
      dismissible: true
    })
  }, [addState, removeState])

  const showCDPError = useCallback((error: any, onRetry?: () => void) => {
    const isNetworkError = error?.message?.includes('network') || error?.message?.includes('fetch')
    const isTimeoutError = error?.message?.includes('timeout')
    const isRateLimitError = error?.message?.includes('rate limit') || error?.code === 'RATE_LIMIT'

    addState({
      type: 'error',
      id: 'cdp-error',
      component: (
        <CDPErrorState
          title="CDP Service Error"
          message={error?.userMessage || error?.message || 'CDP service is temporarily unavailable'}
          error={error}
          errorCode={error?.code}
          isNetworkError={isNetworkError}
          isTimeoutError={isTimeoutError}
          isRateLimitError={isRateLimitError}
          onRetry={onRetry}
          onDismiss={() => removeState('cdp-error')}
          retryable={true}
          showDetails={true}
        />
      ),
      dismissible: true,
      autoHide: isRateLimitError ? undefined : 8000 // Don't auto-hide rate limit errors
    })
  }, [addState, removeState])

  const clearErrors = useCallback(() => {
    clearStatesByType('error')
  }, [clearStatesByType])

  // Success state methods
  const showSuccess = useCallback((
    message: string, 
    hash?: string, 
    blockNumber?: number
  ) => {
    addState({
      type: 'success',
      id: 'success',
      component: (
        <SuccessState
          title="Transaction Successful"
          message={message}
          transactionHash={hash}
          blockNumber={blockNumber}
          onDismiss={() => removeState('success')}
        />
      ),
      dismissible: true,
      autoHide: 5000 // Auto-hide after 5 seconds
    })
  }, [addState, removeState])

  const clearSuccess = useCallback(() => {
    removeState('success')
  }, [removeState])

  // Offline/stale state methods
  const showOffline = useCallback((show: boolean) => {
    if (show) {
      addState({
        type: 'offline',
        id: 'offline',
        component: <OfflineIndicator />
      })
    } else {
      removeState('offline')
    }
  }, [addState, removeState])

  const showStaleData = useCallback((lastUpdated?: Date, onRefresh?: () => void) => {
    addState({
      type: 'stale',
      id: 'stale-data',
      component: (
        <StaleDataIndicator
          lastUpdated={lastUpdated}
          onRefresh={onRefresh}
        />
      )
    })
  }, [addState])

  const hideStaleData = useCallback(() => {
    removeState('stale-data')
  }, [removeState])

  const setOnline = useCallback((online: boolean) => {
    setIsOnline(online)
    if (online) {
      removeState('offline')
    } else {
      addState({
        type: 'offline',
        id: 'offline',
        component: <OfflineIndicator />
      })
    }
  }, [removeState, addState])

  const contextValue: StateManagerContextType = {
    // Loading states
    showBalanceLoading,
    showTransactionLoading,
    showNetworkLoading,
    showTransactionSending,
    hideTransactionSending,
    
    // Error states
    showBalanceError,
    showTransactionError,
    showNetworkError,
    showCDPError,
    clearErrors,
    
    // Success states
    showSuccess,
    clearSuccess,
    
    // Offline/stale states
    showOffline,
    showStaleData,
    hideStaleData,
    
    // Network status
    isOnline,
    setOnline
  }

  return (
    <WalletStateContext.Provider value={contextValue}>
      <div className={`space-y-4 ${className}`}>
        {/* Render active states */}
        {states.map((state) => (
          <div key={state.id} className="wallet-state-display">
            {state.component}
          </div>
        ))}
        
        {/* Render children */}
        {children}
      </div>
    </WalletStateContext.Provider>
  )
}