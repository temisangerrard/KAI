/**
 * Transaction Monitoring Panel
 * Displays real-time transaction status updates and monitoring controls
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle, Clock, X, Bell, BellOff } from 'lucide-react'
import { useCDPTransactionMonitoring, TransactionMonitoringState } from '@/hooks/use-cdp-transaction-monitoring'

interface TransactionMonitoringPanelProps {
  network?: string
  className?: string
}

export function TransactionMonitoringPanel({ 
  network = 'base-mainnet',
  className 
}: TransactionMonitoringPanelProps) {
  const {
    monitoredTransactions,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    stopAllMonitoring,
    getTransactionStatus,
    enableNotifications,
    setEnableNotifications,
    monitoringErrors,
    clearError
  } = useCDPTransactionMonitoring({ network })

  // Convert Map to Array for rendering
  const transactionList = Array.from(monitoredTransactions.entries())

  const getStatusIcon = (status: TransactionMonitoringState['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
    }
  }

  const getStatusBadge = (status: TransactionMonitoringState['status']) => {
    const variants = {
      confirmed: 'default' as const,
      failed: 'destructive' as const,
      pending: 'secondary' as const
    }

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    )
  }

  const formatDuration = (startTime: number) => {
    const duration = Date.now() - startTime
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Transaction Monitoring</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEnableNotifications(!enableNotifications)}
              className="flex items-center space-x-1"
            >
              {enableNotifications ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {enableNotifications ? 'Notifications On' : 'Notifications Off'}
              </span>
            </Button>
            {transactionList.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopAllMonitoring}
                className="text-red-600 hover:text-red-700"
              >
                Stop All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Notification Settings */}
          <div className="flex items-center space-x-2">
            <Switch
              id="notifications"
              checked={enableNotifications}
              onCheckedChange={setEnableNotifications}
            />
            <Label htmlFor="notifications" className="text-sm">
              Enable transaction notifications
            </Label>
          </div>

          <Separator />

          {/* Monitored Transactions */}
          {transactionList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No transactions being monitored</p>
              <p className="text-sm">Transactions will appear here automatically when sent</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                Active Monitoring ({transactionList.length})
              </h3>
              
              {transactionList.map(([hash, transaction]) => {
                const error = monitoringErrors.get(hash)
                
                return (
                  <div
                    key={hash}
                    className="border rounded-lg p-3 space-y-2 bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(transaction.status)}
                        <code className="text-sm font-mono">
                          {formatHash(hash)}
                        </code>
                        <Badge variant="outline" className="text-xs">
                          {transaction.type === 'user_operation' ? 'Smart Account' : 'EOA'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(transaction.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => stopMonitoring(hash)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Duration: {formatDuration(transaction.startTime)}</span>
                      <span>Confirmations: {transaction.confirmations}</span>
                    </div>

                    {error && (
                      <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded p-2">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-700">{error}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearError(hash)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Manual Monitoring Controls */}
          <Separator />
          
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">
              Manual Monitoring
            </h3>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const hash = prompt('Enter transaction hash to monitor:')
                  if (hash) {
                    startMonitoring(hash, 'evm')
                  }
                }}
              >
                Monitor EVM Transaction
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const hash = prompt('Enter user operation hash to monitor:')
                  if (hash) {
                    startMonitoring(hash, 'user_operation')
                  }
                }}
              >
                Monitor User Operation
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TransactionMonitoringPanel