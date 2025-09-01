'use client'

/**
 * Network Status Component
 * 
 * Displays current network information, testnet warnings, and connection status
 * for the KAI wallet dashboard. Uses CDP network detection and error handling.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  ExternalLink,
  Globe
} from 'lucide-react'
import { NetworkService, NetworkInfo, NetworkStatus } from '@/lib/services/network-service'
import { WalletErrorService, WalletError } from '@/lib/services/wallet-error-service'

// Optional CDP hooks integration
interface CDPHooks {
  isSignedIn?: boolean
  evmAddress?: string | null
}

function useCDPHooks(): CDPHooks {
  try {
    // Try to use CDP hooks if available
    if (typeof window !== 'undefined') {
      const { useIsSignedIn, useEvmAddress } = require('@coinbase/cdp-hooks')
      const { isSignedIn } = useIsSignedIn()
      const { evmAddress } = useEvmAddress()
      return { isSignedIn, evmAddress }
    }
  } catch (error) {
    // CDP hooks not available, continue with fallback
  }
  
  // Fallback for test environment or when CDP hooks are not available
  return { isSignedIn: false, evmAddress: null }
}

interface NetworkStatusComponentProps {
  className?: string;
  showDetails?: boolean;
  onNetworkChange?: (network: NetworkInfo | null) => void;
}

export function NetworkStatusComponent({ 
  className = '', 
  showDetails = true,
  onNetworkChange 
}: NetworkStatusComponentProps) {
  // CDP hooks for network detection (with fallback for tests)
  const { isSignedIn = false, evmAddress = null } = useCDPHooks()

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    connected: false,
    currentNetwork: null,
    lastUpdated: new Date(),
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<WalletError | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  /**
   * Load network status using CDP-aware detection
   */
  const loadNetworkStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Create error context for CDP operations
      const context = WalletErrorService.createContext('networkDetection', {
        address: evmAddress || undefined,
        isSignedIn
      })
      
      // Use CDP-aware network detection
      const status = await NetworkService.getCurrentNetworkStatus()
      
      // Enhanced network status with CDP connectivity check
      const enhancedStatus: NetworkStatus = {
        ...status,
        connected: status.connected && (isSignedIn ? true : status.connected),
        lastUpdated: new Date()
      }
      
      setNetworkStatus(enhancedStatus)
      setRetryCount(0) // Reset retry count on success
      
      // Notify parent component of network change
      if (onNetworkChange) {
        onNetworkChange(enhancedStatus.currentNetwork)
      }
    } catch (err) {
      console.error('Failed to load network status:', err)
      
      // Use CDP error handling service
      const context = WalletErrorService.createContext('networkDetection', {
        address: evmAddress || undefined,
        isSignedIn
      })
      const walletError = WalletErrorService.handleApiError(err, context)
      setError(walletError)
      
      // Log error for debugging
      WalletErrorService.logError(walletError, 'NetworkStatusComponent.loadNetworkStatus')
    } finally {
      setIsLoading(false)
    }
  }, [onNetworkChange, evmAddress, isSignedIn])

  /**
   * Handle manual refresh with CDP retry logic
   */
  const handleRefresh = useCallback(async () => {
    NetworkService.clearCache()
    setRetryCount(prev => prev + 1)
    await loadNetworkStatus()
  }, [loadNetworkStatus])

  /**
   * Handle retry with exponential backoff
   */
  const handleRetry = useCallback(async () => {
    if (!error || !WalletErrorService.shouldRetry(error, retryCount)) {
      return
    }

    const strategy = WalletErrorService.getRetryStrategy(error)
    const delay = WalletErrorService.calculateRetryDelay(retryCount, strategy)

    if (delay > 0) {
      setTimeout(() => {
        handleRefresh()
      }, delay)
    } else {
      handleRefresh()
    }
  }, [error, retryCount, handleRefresh])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
    setRetryCount(0)
  }, [])

  /**
   * Initialize component and set up periodic refresh
   */
  useEffect(() => {
    loadNetworkStatus()

    // Set up periodic refresh (every 60 seconds) - reduced frequency to avoid rate limiting
    const interval = setInterval(loadNetworkStatus, 60000)

    return () => {
      clearInterval(interval)
    }
  }, [loadNetworkStatus])

  /**
   * Auto-retry on network reconnection
   */
  useEffect(() => {
    const handleOnline = () => {
      if (error && WalletErrorService.isRetryable(error)) {
        // Wait a moment for connection to stabilize, then retry
        setTimeout(() => {
          handleRefresh()
        }, 2000)
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [error, handleRefresh])

  /**
   * Render network connection indicator with CDP status
   */
  const renderConnectionIndicator = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">
            {isSignedIn ? 'Detecting CDP network...' : 'Detecting network...'}
          </span>
        </div>
      )
    }

    if (error || !networkStatus.connected) {
      const isRetryable = error ? WalletErrorService.isRetryable(error) : false
      return (
        <div className="flex items-center gap-2 text-red-600">
          <WifiOff className="h-4 w-4" />
          <div className="flex-1">
            <span className="text-sm font-medium">
              {isSignedIn ? 'CDP Connection Issue' : 'Network Disconnected'}
            </span>
            {isRetryable && (
              <p className="text-xs text-red-500 mt-1">
                Retrying automatically...
              </p>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 text-green-600">
        <Wifi className="h-4 w-4" />
        <div className="flex-1">
          <span className="text-sm font-medium">
            {isSignedIn ? 'CDP Connected' : 'Network Connected'}
          </span>
          {isSignedIn && evmAddress && (
            <p className="text-xs text-green-500 mt-1">
              Smart wallet active
            </p>
          )}
        </div>
      </div>
    )
  }

  /**
   * Render testnet warning
   */
  const renderTestnetWarning = () => {
    if (!networkStatus.currentNetwork?.isTestnet) return null

    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">TESTNET WARNING</p>
          <p className="text-xs text-amber-700">
            You are connected to a test network. Transactions use test tokens with no real value.
          </p>
        </div>
      </div>
    )
  }

  /**
   * Render network details
   */
  const renderNetworkDetails = () => {
    if (!showDetails || !networkStatus.currentNetwork) return null

    const network = networkStatus.currentNetwork

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Network Name</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{network.displayName}</span>
            <Badge 
              variant={network.isTestnet ? "destructive" : "default"}
              className="text-xs"
            >
              {network.isTestnet ? 'Testnet' : 'Mainnet'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Chain ID</span>
          <span className="text-sm font-semibold">{network.chainId}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Native Currency</span>
          <span className="text-sm font-semibold">{network.nativeCurrency.symbol}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              network.status === 'active' ? 'bg-green-500' : 
              network.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-semibold capitalize">{network.status}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">CDP Support</span>
          <div className="flex items-center gap-2">
            {network.cdpSupported ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-sm font-semibold text-green-600">Full Support</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                <span className="text-sm font-semibold text-amber-600">Sign Only</span>
              </>
            )}
          </div>
        </div>

        {/* CDP Features */}
        {network.cdpSupported && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-2">CDP Features</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {NetworkService.supportsPaymaster(network.id) && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Gasless Txns</span>
                </div>
              )}
              {NetworkService.supportsFaucet(network.id) && (
                <div className="flex items-center gap-1 text-blue-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Faucet</span>
                </div>
              )}
              {NetworkService.getCDPFeatures(network.id).smartContracts && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Smart Contracts</span>
                </div>
              )}
              {NetworkService.getCDPFeatures(network.id).trades && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Trading</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => window.open(network.blockExplorer, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Block Explorer
          </Button>
          
          {/* Network configuration info */}
          <div className="text-xs text-blue-700 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="font-medium mb-1">Network Configuration</p>
            <p>Network is configured by admin. Contact admin to change networks.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={`border-sage-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-sage-600" />
            {isSignedIn ? 'CDP Network Status' : 'Network Status'}
          </CardTitle>
          <div className="flex items-center gap-1">
            {error && WalletErrorService.isRetryable(error) && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Auto-retry
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh network status</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        {renderConnectionIndicator()}

        {/* Testnet Warning */}
        {renderTestnetWarning()}

        {/* Enhanced Error Display with CDP Error Handling */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  {error.category === 'cdp' ? 'CDP Service Error' : 'Network Error'}
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {WalletErrorService.getUserMessage(error, false)}
                </p>
                {error.retryable && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      disabled={isLoading}
                      className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-100"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry ({retryCount}/3)
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearError}
                      className="h-7 px-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Network Details */}
        {renderNetworkDetails()}

        {/* Last Updated */}
        {networkStatus.lastUpdated && (
          <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
            Last updated: {networkStatus.lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default NetworkStatusComponent