'use client'

/**
 * Admin Network Settings Page
 * 
 * Allows admin to configure the network settings for the KAI platform
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Network, 
  CheckCircle, 
  AlertTriangle,
  Save,
  RefreshCw
} from 'lucide-react'
import { ADMIN_NETWORK_CONFIG, setAdminNetworkConfig, type AdminNetworkConfig } from '@/lib/config/network-config'
import { SUPPORTED_NETWORKS } from '@/lib/services/network-service'

export default function AdminNetworkSettingsPage() {
  const [config, setConfig] = useState<AdminNetworkConfig>(ADMIN_NETWORK_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleConfigChange = (key: keyof AdminNetworkConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update the configuration
      setAdminNetworkConfig(config)
      
      // Show success message
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      
      // You could also save to a database or config file here
      console.log('Network configuration updated:', config)
    } catch (error) {
      console.error('Failed to save network configuration:', error)
    } finally {
      setSaving(false)
    }
  }

  const currentNetworkInfo = SUPPORTED_NETWORKS[config.currentNetwork]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-sage-600" />
            <h1 className="text-3xl font-bold text-sage-800">Network Settings</h1>
          </div>
          <p className="text-gray-600">Configure the network settings for the KAI platform</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Network Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Network Selection */}
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-sage-600" />
                  Current Network Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Active Network
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(SUPPORTED_NETWORKS).map(([networkId, network]) => (
                      <div
                        key={networkId}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          config.currentNetwork === networkId
                            ? 'border-sage-500 bg-sage-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleConfigChange('currentNetwork', networkId)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{network.displayName}</p>
                            <p className="text-xs text-gray-500">Chain ID: {network.chainId}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {network.isTestnet && (
                              <Badge variant="destructive" className="text-xs">
                                Testnet
                              </Badge>
                            )}
                            {config.currentNetwork === networkId && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Settings */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Testnet Warnings</p>
                        <p className="text-xs text-gray-500">Show warnings when on testnet</p>
                      </div>
                      <button
                        onClick={() => handleConfigChange('testnetWarningsEnabled', !config.testnetWarningsEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          config.testnetWarningsEnabled ? 'bg-sage-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            config.testnetWarningsEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Network Switching</p>
                        <p className="text-xs text-gray-500">Allow users to switch networks (not supported by CDP)</p>
                      </div>
                      <button
                        disabled
                        className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 opacity-50 cursor-not-allowed"
                      >
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-gray-200">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-sage-600 hover:bg-sage-700"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : saved ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Configuration
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Status */}
          <div className="space-y-6">
            {/* Active Network Info */}
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="text-lg">Active Network</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Network</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{currentNetworkInfo?.displayName}</span>
                    {currentNetworkInfo?.isTestnet && (
                      <Badge variant="destructive" className="text-xs">
                        Testnet
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Chain ID</span>
                  <span className="text-sm font-semibold">{currentNetworkInfo?.chainId}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Currency</span>
                  <span className="text-sm font-semibold">{currentNetworkInfo?.nativeCurrency.symbol}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">CDP Support</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-sm font-semibold text-green-600">Full</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testnet Warning */}
            {currentNetworkInfo?.isTestnet && config.testnetWarningsEnabled && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="font-semibold">Testnet Active</p>
                  </div>
                  <p className="text-sm text-amber-700 mt-2">
                    You are currently configured for {currentNetworkInfo.displayName}. 
                    All transactions will use test tokens with no real value.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <Settings className="h-4 w-4" />
                  <p className="font-semibold text-sm">Configuration Notes</p>
                </div>
                <div className="text-xs text-blue-700 space-y-2">
                  <p>• Network changes apply immediately to all users</p>
                  <p>• CDP manages the actual network connection</p>
                  <p>• Users cannot switch networks themselves</p>
                  <p>• Testnet warnings help prevent confusion</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}