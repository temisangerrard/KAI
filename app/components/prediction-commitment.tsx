"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Coins, 
  TrendingUp, 
  AlertCircle, 
  Calculator,
  Target,
  Zap,
  ArrowRight,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useAuth } from '@/app/auth/auth-context'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { calculatePayout, previewOddsImpact, formatOdds, formatTokenAmount } from '@/lib/utils/market-utils'
import { Market } from '@/lib/types'

interface PredictionCommitmentProps {
  predictionId: string
  predictionTitle: string
  position: 'yes' | 'no'
  optionId: string
  market: Market
  maxTokens: number
  onCommit: (tokens: number) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

interface BalanceInfo {
  availableTokens: number
  committedTokens: number
  totalBalance: number
}

// Firestore-specific error types
type FirestoreErrorCode = 
  | 'INSUFFICIENT_BALANCE'
  | 'MARKET_NOT_FOUND'
  | 'MARKET_INACTIVE'
  | 'MARKET_ENDED'
  | 'TRANSACTION_FAILED'
  | 'VALIDATION_ERROR'
  | 'VALIDATION_FAILED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'PERMISSION_DENIED'
  | 'UNAVAILABLE'

interface CommitmentError {
  message: string
  code: FirestoreErrorCode
  retryable: boolean
  details?: any
}

interface OptimisticUpdate {
  tokensCommitted: number
  newAvailableBalance: number
  newCommittedBalance: number
  timestamp: number
}

export function PredictionCommitment({
  predictionId,
  predictionTitle,
  position,
  optionId,
  market,
  maxTokens,
  onCommit,
  onCancel,
  isLoading = false
}: PredictionCommitmentProps) {
  const { user } = useAuth()
  const [tokensToCommit, setTokensToCommit] = useState<number>(1)
  const [balance, setBalance] = useState<BalanceInfo | null>(null)
  const [originalBalance, setOriginalBalance] = useState<BalanceInfo | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [error, setError] = useState<CommitmentError | null>(null)
  const [isCommitting, setIsCommitting] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [optimisticUpdate, setOptimisticUpdate] = useState<OptimisticUpdate | null>(null)
  const [commitmentSuccess, setCommitmentSuccess] = useState(false)

  const MAX_RETRY_ATTEMPTS = 3
  const RETRY_DELAY_MS = 1000

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Parse Firestore errors into structured format
  const parseFirestoreError = useCallback((error: any): CommitmentError => {
    const message = error?.message || 'An unexpected error occurred'
    
    // Check for specific error codes from API response
    if (error?.errorCode) {
      return {
        message: error.message || getErrorMessage(error.errorCode),
        code: error.errorCode,
        retryable: isRetryableError(error.errorCode),
        details: error.details
      }
    }

    // Parse Firestore SDK errors
    if (error?.code) {
      switch (error.code) {
        case 'permission-denied':
          return {
            message: 'You do not have permission to perform this action',
            code: 'PERMISSION_DENIED',
            retryable: false
          }
        case 'unavailable':
          return {
            message: 'Service temporarily unavailable. Please try again.',
            code: 'UNAVAILABLE',
            retryable: true
          }
        case 'deadline-exceeded':
          return {
            message: 'Request timed out. Please try again.',
            code: 'TIMEOUT_ERROR',
            retryable: true
          }
        case 'aborted':
          return {
            message: 'Transaction was aborted due to a conflict. Please try again.',
            code: 'TRANSACTION_FAILED',
            retryable: true
          }
        default:
          return {
            message: 'Database error occurred. Please try again.',
            code: 'INTERNAL_ERROR',
            retryable: true
          }
      }
    }

    // Network errors
    if (!isOnline || message.includes('network') || message.includes('fetch')) {
      return {
        message: 'Network connection error. Please check your connection and try again.',
        code: 'NETWORK_ERROR',
        retryable: true
      }
    }

    // Default error
    return {
      message,
      code: 'INTERNAL_ERROR',
      retryable: true
    }
  }, [isOnline])

  // Get user-friendly error messages
  const getErrorMessage = (code: FirestoreErrorCode): string => {
    switch (code) {
      case 'INSUFFICIENT_BALANCE':
        return 'You do not have enough tokens for this commitment'
      case 'MARKET_NOT_FOUND':
        return 'This market could not be found'
      case 'MARKET_INACTIVE':
        return 'This market is no longer accepting commitments'
      case 'MARKET_ENDED':
        return 'This market has ended and no longer accepts commitments'
      case 'TRANSACTION_FAILED':
        return 'Transaction failed due to a database conflict. Please try again.'
      case 'VALIDATION_ERROR':
      case 'VALIDATION_FAILED':
        return 'Invalid commitment data. Please check your input.'
      case 'NETWORK_ERROR':
        return 'Network connection error. Please check your connection.'
      case 'TIMEOUT_ERROR':
        return 'Request timed out. Please try again.'
      case 'PERMISSION_DENIED':
        return 'You do not have permission to perform this action'
      case 'UNAVAILABLE':
        return 'Service temporarily unavailable. Please try again.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  // Check if error is retryable
  const isRetryableError = (code: FirestoreErrorCode): boolean => {
    const nonRetryableErrors: FirestoreErrorCode[] = [
      'INSUFFICIENT_BALANCE',
      'MARKET_NOT_FOUND', 
      'MARKET_INACTIVE',
      'MARKET_ENDED',
      'VALIDATION_ERROR',
      'PERMISSION_DENIED'
    ]
    return !nonRetryableErrors.includes(code)
  }

  // Load user balance with retry logic
  const loadBalance = useCallback(async (retryAttempt = 0): Promise<void> => {
    if (!user?.id) return

    try {
      setIsLoadingBalance(true)
      setError(null)
      
      const userBalance = await TokenBalanceService.getUserBalance(user.id)
      
      const balanceInfo = userBalance ? {
        availableTokens: userBalance.availableTokens,
        committedTokens: userBalance.committedTokens,
        totalBalance: userBalance.availableTokens + userBalance.committedTokens
      } : {
        availableTokens: 0,
        committedTokens: 0,
        totalBalance: 0
      }
      
      setBalance(balanceInfo)
      setOriginalBalance(balanceInfo)
      setRetryCount(0)
    } catch (err) {
      console.error('Error loading balance:', err)
      const parsedError = parseFirestoreError(err)
      
      if (parsedError.retryable && retryAttempt < MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying balance load (attempt ${retryAttempt + 1}/${MAX_RETRY_ATTEMPTS})`)
        setTimeout(() => {
          loadBalance(retryAttempt + 1)
        }, RETRY_DELAY_MS * (retryAttempt + 1))
      } else {
        setError(parsedError)
      }
    } finally {
      setIsLoadingBalance(false)
    }
  }, [user?.id, parseFirestoreError])

  // Load balance on mount and user change
  useEffect(() => {
    loadBalance()
  }, [loadBalance])

  // Calculate potential winnings using market utils
  const getPayoutCalculation = (tokens: number) => {
    return calculatePayout(tokens, optionId, market)
  }

  // Get odds impact preview
  const getOddsImpact = (tokens: number) => {
    return previewOddsImpact(tokens, optionId, market)
  }

  // Handle token amount change
  const handleTokenChange = (value: string) => {
    const numValue = parseInt(value) || 0
    const clampedValue = Math.max(1, Math.min(numValue, maxTokens))
    setTokensToCommit(clampedValue)
    setError(null)
  }

  // Handle slider change
  const handleSliderChange = (values: number[]) => {
    setTokensToCommit(values[0])
    setError(null)
  }

  // Apply optimistic update
  const applyOptimisticUpdate = useCallback(() => {
    if (!balance) return

    const update: OptimisticUpdate = {
      tokensCommitted: tokensToCommit,
      newAvailableBalance: balance.availableTokens - tokensToCommit,
      newCommittedBalance: balance.committedTokens + tokensToCommit,
      timestamp: Date.now()
    }

    setOptimisticUpdate(update)
    setBalance({
      availableTokens: update.newAvailableBalance,
      committedTokens: update.newCommittedBalance,
      totalBalance: balance.totalBalance
    })
  }, [balance, tokensToCommit])

  // Rollback optimistic update
  const rollbackOptimisticUpdate = useCallback(() => {
    if (originalBalance) {
      setBalance(originalBalance)
    }
    setOptimisticUpdate(null)
  }, [originalBalance])

  // Commit with retry logic and optimistic updates
  const handleCommit = useCallback(async (retryAttempt = 0): Promise<void> => {
    if (!balance || tokensToCommit > balance.availableTokens) {
      setError({
        message: 'Insufficient available tokens',
        code: 'INSUFFICIENT_BALANCE',
        retryable: false
      })
      return
    }

    if (tokensToCommit < 1) {
      setError({
        message: 'Must commit at least 1 token',
        code: 'VALIDATION_ERROR',
        retryable: false
      })
      return
    }

    if (!isOnline) {
      setError({
        message: 'No internet connection. Please check your connection and try again.',
        code: 'NETWORK_ERROR',
        retryable: true
      })
      return
    }

    try {
      setIsCommitting(true)
      setError(null)
      setCommitmentSuccess(false)

      // Apply optimistic update on first attempt
      if (retryAttempt === 0) {
        applyOptimisticUpdate()
      }

      await onCommit(tokensToCommit)
      
      // Success - clear optimistic update and show success state
      setOptimisticUpdate(null)
      setCommitmentSuccess(true)
      setRetryCount(0)
      
      // Auto-close modal after success (optional)
      setTimeout(() => {
        setCommitmentSuccess(false)
      }, 2000)

    } catch (err) {
      console.error('Error committing tokens:', err)
      const parsedError = parseFirestoreError(err)
      
      if (parsedError.retryable && retryAttempt < MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying commitment (attempt ${retryAttempt + 1}/${MAX_RETRY_ATTEMPTS})`)
        setRetryCount(retryAttempt + 1)
        
        setTimeout(() => {
          handleCommit(retryAttempt + 1)
        }, RETRY_DELAY_MS * (retryAttempt + 1))
      } else {
        // Failed permanently - rollback optimistic update
        rollbackOptimisticUpdate()
        setError(parsedError)
        setRetryCount(0)
      }
    } finally {
      if (retryAttempt === 0 || retryAttempt >= MAX_RETRY_ATTEMPTS) {
        setIsCommitting(false)
      }
    }
  }, [balance, tokensToCommit, isOnline, onCommit, applyOptimisticUpdate, rollbackOptimisticUpdate, parseFirestoreError])

  // Retry function for manual retries
  const handleRetry = useCallback(() => {
    setRetryCount(0)
    handleCommit(0)
  }, [handleCommit])

  // Quick amount buttons
  const quickAmounts = balance ? [
    { label: '25%', value: Math.floor(balance.availableTokens * 0.25) },
    { label: '50%', value: Math.floor(balance.availableTokens * 0.5) },
    { label: '75%', value: Math.floor(balance.availableTokens * 0.75) },
    { label: 'Max', value: Math.min(balance.availableTokens, maxTokens) }
  ].filter(amount => amount.value >= 1) : []

  const payoutCalc = getPayoutCalculation(tokensToCommit)
  const oddsImpact = getOddsImpact(tokensToCommit)
  const currentOdds = oddsImpact.currentOdds[optionId] || 2.0
  const isInsufficientBalance = balance && tokensToCommit > balance.availableTokens
  const canCommit = balance && 
    tokensToCommit >= 1 && 
    tokensToCommit <= balance.availableTokens && 
    !isCommitting && 
    !commitmentSuccess &&
    isOnline

  if (isLoadingBalance) {
    return (
      <Card className="w-full max-w-md mx-auto border-2 border-kai-200">
        <CardHeader className="bg-gradient-to-r from-primary-50 to-kai-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-kai-600" />
            Loading Commitment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
          <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading your balance...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto border-2 border-kai-200">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-kai-50">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-kai-600" />
            Commit Tokens
          </div>
          <div className="flex items-center gap-2">
            {/* Network status indicator */}
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            {/* Success indicator */}
            {commitmentSuccess && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {/* Optimistic update indicator */}
            {optimisticUpdate && !commitmentSuccess && (
              <div className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-xs text-blue-600">Processing...</span>
              </div>
            )}
          </div>
        </CardTitle>
        <div className="text-sm text-gray-600">
          <p className="font-medium truncate">{predictionTitle}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={position === 'yes' ? 'default' : 'secondary'} className="text-xs">
              {position.toUpperCase()}
            </Badge>
            <span className="text-xs text-gray-500">
              Current odds: {formatOdds(currentOdds)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Balance Display */}
        {balance && (
          <div className={`rounded-lg p-4 ${optimisticUpdate ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Available Tokens
                {optimisticUpdate && (
                  <span className="ml-2 text-xs text-blue-600">(updating...)</span>
                )}
              </span>
              <div className="flex items-center gap-1">
                <Coins className="h-4 w-4 text-kai-600" />
                <span className={`font-bold ${optimisticUpdate ? 'text-blue-700' : 'text-kai-700'}`}>
                  {balance.availableTokens.toLocaleString()}
                </span>
              </div>
            </div>
            {balance.committedTokens > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Committed</span>
                <span className={optimisticUpdate ? 'text-blue-600' : ''}>
                  {balance.committedTokens.toLocaleString()}
                </span>
              </div>
            )}
            {optimisticUpdate && (
              <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Committing {optimisticUpdate.tokensCommitted.toLocaleString()} tokens...
              </div>
            )}
          </div>
        )}

        {/* Token Amount Input */}
        <div className="space-y-3">
          <Label htmlFor="tokens" className="text-sm font-medium">
            Tokens to Commit
          </Label>
          <div className="flex gap-2">
            <Input
              id="tokens"
              type="number"
              min="1"
              max={maxTokens}
              value={tokensToCommit}
              onChange={(e) => handleTokenChange(e.target.value)}
              className={`flex-1 ${isInsufficientBalance ? 'border-red-300 focus:border-red-500' : ''}`}
              placeholder="Enter amount"
            />
            <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 rounded-md border">
              <Coins className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">tokens</span>
            </div>
          </div>

          {/* Slider */}
          {balance && balance.availableTokens > 1 && (
            <div className="px-2">
              <Slider
                value={[tokensToCommit]}
                onValueChange={handleSliderChange}
                max={Math.min(balance.availableTokens, maxTokens)}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>{Math.min(balance.availableTokens, maxTokens).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Quick Amount Buttons */}
          {quickAmounts.length > 0 && (
            <div className="flex gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setTokensToCommit(amount.value)}
                  className="flex-1 text-xs"
                  disabled={amount.value > maxTokens}
                >
                  {amount.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Odds Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-kai-600" />
            <span className="text-sm font-medium">Odds Information</span>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700">Current odds</span>
              <span className="font-bold text-blue-700">
                {formatOdds(oddsImpact.currentOdds[optionId])}
              </span>
            </div>
            {tokensToCommit > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-700">Odds after your commitment</span>
                  <span className="font-bold text-blue-700">
                    {formatOdds(oddsImpact.projectedOdds[optionId])}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600">Market impact</span>
                  <Badge 
                    variant={
                      oddsImpact.impactLevel === 'significant' ? 'destructive' :
                      oddsImpact.impactLevel === 'moderate' ? 'default' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {oddsImpact.impactLevel}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Potential Winnings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-kai-600" />
            <span className="text-sm font-medium">Potential Outcome</span>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-700">You could win</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-bold text-green-700">
                  {formatTokenAmount(payoutCalc.grossPayout)} tokens
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-green-600">Net profit</span>
              <span className="font-medium text-green-600">
                +{formatTokenAmount(payoutCalc.netProfit)} tokens
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600">ROI</span>
              <span className="font-medium text-green-600">
                {payoutCalc.roi > 0 ? '+' : ''}{(typeof payoutCalc.roi === 'number' && !isNaN(payoutCalc.roi) ? payoutCalc.roi : 0).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-700">If you lose</span>
              <span className="font-bold text-red-700">
                -{formatTokenAmount(tokensToCommit)} tokens
              </span>
            </div>
          </div>
        </div>

        {/* Success Display */}
        {commitmentSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Commitment successful! Your tokens have been committed to this prediction.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display with Retry */}
        {error && !commitmentSuccess && (
          <Alert variant="destructive">
            <div className="flex items-start gap-2">
              {error.retryable ? (
                <AlertCircle className="h-4 w-4 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 mt-0.5" />
              )}
              <div className="flex-1">
                <AlertDescription className="mb-2">
                  {error.message}
                  {retryCount > 0 && (
                    <span className="block text-sm mt-1 text-red-600">
                      Retry attempt {retryCount}/{MAX_RETRY_ATTEMPTS}
                    </span>
                  )}
                </AlertDescription>
                {error.retryable && !isCommitting && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="mt-2 h-8 text-xs"
                    disabled={!isOnline}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try Again
                  </Button>
                )}
                {!isOnline && (
                  <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                    <WifiOff className="h-3 w-3" />
                    No internet connection
                  </div>
                )}
              </div>
            </div>
          </Alert>
        )}

        {/* Insufficient Balance Warning */}
        {isInsufficientBalance && !error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need {(tokensToCommit - (balance?.availableTokens || 0)).toLocaleString()} more tokens to make this commitment.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isCommitting || commitmentSuccess}
            className="flex-1"
          >
            {commitmentSuccess ? 'Done' : 'Cancel'}
          </Button>
          <Button
            onClick={() => handleCommit(0)}
            disabled={!canCommit || commitmentSuccess}
            className="flex-1 bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white disabled:opacity-50"
          >
            {commitmentSuccess ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Success!
              </div>
            ) : isCommitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                {retryCount > 0 ? `Retrying... (${retryCount}/${MAX_RETRY_ATTEMPTS})` : 'Committing...'}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Commit {formatTokenAmount(tokensToCommit)}
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </Button>
        </div>

        {/* Disclaimer and Status */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <div>
            Committed tokens will be locked until the prediction resolves.
          </div>
          {!isOnline && (
            <div className="flex items-center justify-center gap-1 text-red-500">
              <WifiOff className="h-3 w-3" />
              Offline - Please check your connection
            </div>
          )}
          {optimisticUpdate && (
            <div className="flex items-center justify-center gap-1 text-blue-500">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Processing your commitment...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}