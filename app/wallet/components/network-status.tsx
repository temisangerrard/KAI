'use client'

/**
 * Network Status Component
 * 
 * Displays current network information, testnet warnings, and connection status
 * for the KAI wallet dashboard.
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
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    connected: false,
    currentNetwork: null,
    lastUpdated: new Date(),
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load network status
   */
  const loadNetworkStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const status = await NetworkService.getCurrentNetworkStatus()
      setNetworkStatus(status)
      
      // Notify parent component of network change
      if (onNetworkChange) {
        onNetworkChange(status.currentNetwork)
      }
    } catch (err) {
      console.error('Failed to load network status:', err)
      setError('Failed to detect network')
    } finally {
      setIsLoading(false)
    }
  }, [onNetworkChange])

  /**
   * Handle manual refresh
   */
  const handleRefresh = useCallback(async () => {
    NetworkService.clearCache()
    await loadNetworkStatus()
  }, [loadNetworkStatus])

  /**
   * Initialize component and set up periodic refresh
   */
  useEffect(() => {
    loadNetworkStatus()

    // Set up periodic refresh (every 60 seconds)
    const interval = setInterval(loadNetworkStatus, 60000)

    return () => {
      clearInterval(interval)
    }
  }, [loadNetworkStatus])

  /**
   * Render network connection indicator
   */
  const renderConnectionIndicator = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Detecting network...</span>
        </div>
      )
    }

    if (error || !networkStatus.connected) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Network Disconnected</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 text-green-600">
        <Wifi className="h-4 w-4" />
        <span className="text-sm font-medium">Connected</span>
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
            Network Status
          </CardTitle>
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
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        {renderConnectionIndicator()}

        {/* Testnet Warning */}
        {renderTestnetWarning()}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
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