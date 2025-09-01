'use client'

/**
 * Wallet Loading States Component
 * 
 * Provides consistent loading indicators for CDP API calls in the wallet dashboard
 */

import React from 'react'
import { RefreshCw, Wallet, CreditCard, History, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface LoadingStateProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

interface SkeletonProps {
  className?: string
  height?: string
  width?: string
}

/**
 * Generic loading spinner component
 */
export function LoadingSpinner({ className = '', size = 'md', message }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <RefreshCw className={`animate-spin text-sage-600 ${sizeClasses[size]}`} />
      {message && (
        <span className="text-sm text-gray-600 animate-pulse">{message}</span>
      )}
    </div>
  )
}

/**
 * Skeleton loader for content placeholders
 */
export function Skeleton({ className = '', height = 'h-4', width = 'w-full' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${height} ${width} ${className}`} />
  )
}

/**
 * Balance loading state
 */
export function BalanceLoadingState({ className = '' }: { className?: string }) {
  return (
    <Card className={`border-sage-200 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sage-100 rounded-full flex items-center justify-center">
                <Wallet className="h-5 w-5 text-sage-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <Skeleton height="h-5" width="w-24" />
                <Skeleton height="h-3" width="w-16" />
              </div>
            </div>
            <div className="text-right space-y-2">
              <Skeleton height="h-6" width="w-20" />
              <Skeleton height="h-3" width="w-12" />
            </div>
          </div>
          
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 bg-gradient-to-br from-sage-50 to-cream-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton height="h-5" width="w-32" />
                    <Skeleton height="h-3" width="w-20" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton height="h-4" width="w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-center py-2">
            <LoadingSpinner message="Loading balances..." size="sm" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Transaction history loading state
 */
export function TransactionLoadingState({ className = '' }: { className?: string }) {
  return (
    <Card className={`border-sage-200 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-sage-600" />
              <Skeleton height="h-5" width="w-32" />
            </div>
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton height="h-8" width="w-8" className="rounded-full" />
                  <div className="space-y-2">
                    <Skeleton height="h-4" width="w-20" />
                    <Skeleton height="h-3" width="w-16" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Skeleton height="h-4" width="w-24" />
                  <Skeleton height="h-3" width="w-16" />
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-center py-2">
            <LoadingSpinner message="Loading transactions..." size="sm" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Network status loading state
 */
export function NetworkLoadingState({ className = '' }: { className?: string }) {
  return (
    <Card className={`border-sage-200 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-sage-600 animate-pulse" />
              <Skeleton height="h-5" width="w-28" />
            </div>
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton height="h-4" width="w-20" />
              <Skeleton height="h-4" width="w-16" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton height="h-4" width="w-16" />
              <Skeleton height="h-4" width="w-12" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton height="h-4" width="w-24" />
              <Skeleton height="h-4" width="w-20" />
            </div>
          </div>
          
          <div className="flex items-center justify-center py-2">
            <LoadingSpinner message="Detecting network..." size="sm" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Transaction sending loading state
 */
export function TransactionSendingState({ 
  className = '',
  isSmartAccount = false,
  transactionHash,
  message
}: { 
  className?: string
  isSmartAccount?: boolean
  transactionHash?: string
  message?: string
}) {
  return (
    <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800">
            {message || (isSmartAccount ? 'User operation pending...' : 'Transaction pending...')}
          </p>
          {transactionHash && (
            <p className="text-xs text-blue-600 mt-1 font-mono break-all">
              Hash: {transactionHash}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex space-x-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <span className="text-xs text-blue-600">Processing...</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Offline indicator component
 */
export function OfflineIndicator({ className = '' }: { className?: string }) {
  return (
    <div className={`p-3 bg-gray-100 border border-gray-300 rounded-lg ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <WifiOff className="h-4 w-4 text-gray-600" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">
            You're offline
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Showing cached data. Connect to internet to refresh.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Stale data indicator
 */
export function StaleDataIndicator({ 
  className = '',
  lastUpdated,
  onRefresh
}: { 
  className?: string
  lastUpdated?: Date
  onRefresh?: () => void
}) {
  const timeAgo = lastUpdated ? 
    Math.floor((Date.now() - lastUpdated.getTime()) / 1000 / 60) : 0

  return (
    <div className={`p-2 bg-amber-50 border border-amber-200 rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-xs text-amber-700">
            Data is {timeAgo > 0 ? `${timeAgo}m` : '<1m'} old
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs text-amber-700 hover:text-amber-800 underline"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  )
}