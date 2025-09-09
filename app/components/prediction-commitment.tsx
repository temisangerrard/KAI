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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
  XCircle,
  Share2,
  List,
  Users,
  Percent
} from 'lucide-react'
import { useAuth } from '@/app/auth/auth-context'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { calculatePayout, previewOddsImpact, formatOdds, formatTokenAmount, calculateOdds } from '@/lib/utils/market-utils'
import { Market } from '@/lib/types'
import { ShareButton } from './share-button'

interface PredictionCommitmentProps {
  predictionId: string
  predictionTitle: string
  position?: 'yes' | 'no'  // Made optional for multi-option support
  optionId?: string        // Made optional for backward compatibility
  market: Market
  maxTokens: number
  onCommit: (tokens: number, optionId?: string, position?: 'yes' | 'no') => Promise<void>  // Enhanced callback
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

  // NEW: Multi-option support state
  const [selectedOptionId, setSelectedOptionId] = useState<string>('')
  const [selectedPosition, setSelectedPosition] = useState<'yes' | 'no'>('yes')
  const [marketType, setMarketType] = useState<'binary' | 'multi-option' | 'loading'>('loading')
  const [isLoadingMarketType, setIsLoadingMarketType] = useState(true)

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

  // NEW: Market type detection and initialization
  useEffect(() => {
    const detectMarketTypeAndInitialize = async () => {
      try {
        setIsLoadingMarketType(true)
        setError(null)

        // Ensure market has options (backward compatibility)
        let marketOptions = market.options || []
        if (marketOptions.length === 0) {
          // Legacy market - create default binary options
          marketOptions = [
            { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
            { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
          ]
        }

        // Detect market type
        const detectedType: 'binary' | 'multi-option' = marketOptions.length === 2 ? 'binary' : 'multi-option'
        setMarketType(detectedType)

        // Initialize selection based on props and market type
        if (detectedType === 'binary') {
          // Binary market: use position prop or default to 'yes'
          const initialPosition = position || 'yes'
          setSelectedPosition(initialPosition)
          
          // Map position to optionId for backward compatibility
          const mappedOptionId = optionId || (initialPosition === 'yes' ? marketOptions[0].id : marketOptions[1].id)
          setSelectedOptionId(mappedOptionId)
        } else {
          // Multi-option market: use optionId prop or default to first option
          const initialOptionId = optionId || marketOptions[0]?.id || ''
          setSelectedOptionId(initialOptionId)
          
          // Derive position for backward compatibility (first option = 'yes', others = 'no')
          const derivedPosition = initialOptionId === marketOptions[0]?.id ? 'yes' : 'no'
          setSelectedPosition(derivedPosition)
        }

      } catch (error) {
        console.error('[PREDICTION_COMMITMENT] Error detecting market type:', error)
        setError({
          message: 'Failed to load market options. Please try again.',
          code: 'MARKET_LOADING_ERROR',
          retryable: true
        })
        
        // Fallback to binary mode
        setMarketType('binary')
        setSelectedPosition(position || 'yes')
        setSelectedOptionId(optionId || 'yes')
      } finally {
        setIsLoadingMarketType(false)
      }
    }

    detectMarketTypeAndInitialize()
  }, [market, position, optionId])

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

  // Calculate potential winnings using market utils (ENHANCED for multi-option)
  const getPayoutCalculation = (tokens: number) => {
    const targetOptionId = selectedOptionId || optionId || 'yes'
    return calculatePayout(tokens, targetOptionId, market)
  }

  // Get odds impact preview (ENHANCED for multi-option)
  const getOddsImpact = (tokens: number) => {
    const targetOptionId = selectedOptionId || optionId || 'yes'
    return previewOddsImpact(tokens, targetOptionId, market)
  }

  // NEW: Get current market odds for all options
  const getCurrentMarketOdds = () => {
    return calculateOdds(market)
  }

  // NEW: Get selected option details
  const getSelectedOption = () => {
    const targetOptionId = selectedOptionId || optionId || 'yes'
    return market.options?.find(opt => opt.id === targetOptionId) || market.options?.[0]
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

  // Commit with retry logic and optimistic updates (ENHANCED with backward compatibility)
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

      // ENHANCED: Use the new CommitmentCreationService for better functionality
      // while maintaining backward compatibility with existing onCommit callback
      try {
        // Import the enhanced service dynamically to avoid build issues
        const { CommitmentCreationService } = await import('@/lib/services/commitment-creation-service')
        
        // Use enhanced service with automatic market type detection
        const result = await CommitmentCreationService.createCommitmentForComponent(
          user.id || user.uid,
          predictionId,
          selectedPosition,  // Use selected position
          selectedOptionId,  // Use selected option ID
          tokensToCommit,
          {
            source: 'web',
            userAgent: navigator.userAgent
          }
        )
        
        console.log('[PREDICTION_COMMITMENT] Enhanced commitment created:', result)
        
      } catch (enhancedError) {
        console.warn('[PREDICTION_COMMITMENT] Enhanced service failed, falling back to original:', enhancedError)
        
        // Fallback to original onCommit callback for backward compatibility
        // Pass both tokens and the selected option information
        await onCommit(tokensToCommit, selectedOptionId, selectedPosition)
      }
      
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
  }, [balance, tokensToCommit, isOnline, onCommit, applyOptimisticUpdate, rollbackOptimisticUpdate, parseFirestoreError, user, predictionId, selectedPosition, selectedOptionId])

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
  const selectedOption = getSelectedOption()
  const currentOdds = oddsImpact.currentOdds[selectedOptionId] || 2.0
  const isInsufficientBalance = balance && tokensToCommit > balance.availableTokens
  const canCommit = balance && 
    tokensToCommit >= 1 && 
    tokensToCommit <= balance.availableTokens && 
    !isCommitting && 
    !commitmentSuccess &&
    isOnline &&
    selectedOptionId &&  // NEW: Ensure option is selected
    !isLoadingMarketType  // NEW: Ensure market type is loaded

  if (isLoadingBalance || isLoadingMarketType) {
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
            {isLoadingBalance ? 'Loading your balance...' : 'Loading market options...'}
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
            {marketType === 'binary' ? (
              <Badge variant={selectedPosition === 'yes' ? 'default' : 'secondary'} className="text-xs">
                {selectedPosition.toUpperCase()}
              </Badge>
            ) : (
              <Badge variant="default" className="text-xs bg-kai-600 text-white">
                {selectedOption?.text || 'Select Option'}
              </Badge>
            )}
            <span className="text-xs text-gray-500">
              Current odds: {formatOdds(currentOdds)}
            </span>
            {marketType === 'multi-option' && (
              <Badge variant="outline" className="text-xs">
                <List className="h-3 w-3 mr-1" />
                {market.options?.length || 0} options
              </Badge>
            )}
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

        {/* NEW: Option Selection for Multi-Option Markets */}
        {marketType === 'multi-option' && market.options && market.options.length > 2 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-kai-600" />
              Choose Your Prediction
            </Label>
            
            <RadioGroup
              value={selectedOptionId}
              onValueChange={(value) => {
                setSelectedOptionId(value)
                setError(null)
                // Update position for backward compatibility
                const isFirstOption = value === market.options?.[0]?.id
                setSelectedPosition(isFirstOption ? 'yes' : 'no')
              }}
              className="space-y-2"
            >
              {market.options.map((option, index) => {
                const marketOdds = getCurrentMarketOdds()
                const optionOdds = marketOdds[option.id]
                const colors = ['border-kai-200 bg-kai-50', 'border-primary-200 bg-primary-50', 'border-blue-200 bg-blue-50', 'border-green-200 bg-green-50', 'border-purple-200 bg-purple-50']
                
                return (
                  <div key={option.id} className="flex items-center space-x-3">
                    <RadioGroupItem 
                      value={option.id} 
                      id={option.id}
                      className="text-kai-600"
                    />
                    <Label 
                      htmlFor={option.id} 
                      className={`flex-1 cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-sm ${
                        selectedOptionId === option.id 
                          ? 'border-kai-400 bg-kai-100 shadow-sm' 
                          : colors[index % colors.length]
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{option.text}</div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Coins className="h-3 w-3" />
                              <span>{option.totalTokens.toLocaleString()} tokens</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{option.participantCount} supporters</span>
                            </div>
                            {optionOdds && (
                              <div className="flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                <span>{optionOdds.percentage.toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <div className="font-bold text-kai-700">
                            {formatOdds(optionOdds?.odds || 2.0)}
                          </div>
                          <div className="text-xs text-gray-500">odds</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
            
            {!selectedOptionId && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select an option to continue with your commitment.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Binary Market Display (Backward Compatibility) */}
        {marketType === 'binary' && (
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-kai-600" />
              Your Prediction
            </Label>
            
            <div className="grid grid-cols-2 gap-3">
              {market.options?.slice(0, 2).map((option, index) => {
                const isSelected = selectedOptionId === option.id
                const marketOdds = getCurrentMarketOdds()
                const optionOdds = marketOdds[option.id]
                
                return (
                  <Button
                    key={option.id}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => {
                      setSelectedOptionId(option.id)
                      setSelectedPosition(index === 0 ? 'yes' : 'no')
                      setError(null)
                    }}
                    className={`h-auto p-3 flex-col gap-2 ${
                      isSelected 
                        ? 'bg-kai-600 hover:bg-kai-700 text-white border-kai-600' 
                        : 'hover:bg-kai-50 hover:border-kai-300'
                    }`}
                  >
                    <div className="font-medium">{option.text}</div>
                    <div className="text-xs opacity-80">
                      {formatOdds(optionOdds?.odds || 2.0)} odds
                    </div>
                    <div className="text-xs opacity-70">
                      {option.totalTokens.toLocaleString()} tokens
                    </div>
                  </Button>
                )
              })}
            </div>
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
                {formatOdds(oddsImpact.currentOdds[selectedOptionId])}
              </span>
            </div>
            {selectedOption && (
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-blue-600">Supporting</span>
                <span className="font-medium text-blue-700 truncate ml-2">
                  "{selectedOption.text}"
                </span>
              </div>
            )}
            {tokensToCommit > 0 && selectedOptionId && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-700">Odds after your commitment</span>
                  <span className="font-bold text-blue-700">
                    {formatOdds(oddsImpact.projectedOdds[selectedOptionId])}
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
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <AlertDescription className="text-green-800 mb-2">
                    Commitment successful! Your tokens have been committed to this prediction.
                  </AlertDescription>
                  <div className="flex items-center gap-2">
                    <ShareButton
                      commitment={{
                        prediction: {
                          id: `${user?.uid}-${predictionId}-${Date.now()}`,
                          userId: user?.uid || '',
                          marketId: predictionId,
                          optionId: selectedOptionId,
                          tokensStaked: tokensToCommit,
                          createdAt: new Date() as any
                        },
                        market: market,
                        optionText: selectedOption?.text || selectedPosition
                      }}
                      variant="button"
                      size="sm"
                      className="bg-kai-600 hover:bg-kai-700 text-white text-xs px-3 py-1 h-7"
                    />
                    <span className="text-xs text-green-700">Share your prediction!</span>
                  </div>
                </div>
              </div>
            </div>
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