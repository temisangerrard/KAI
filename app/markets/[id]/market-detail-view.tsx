"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Market } from "@/lib/db/database"
import { Market as MarketUtilsType } from "@/lib/types/database"
import { useAuth } from "@/app/auth/auth-context"
import { useTokenBalance } from "@/hooks/use-token-balance"
import { BackOpinionModal } from "@/app/components/back-opinion-modal"
import { PredictionCommitment } from "@/app/components/prediction-commitment"
import { TokenCommitmentConfirmationModal } from "@/app/components/token-commitment-confirmation-modal"
import { InsufficientBalanceModal } from "@/app/components/insufficient-balance-modal"
import { MarketTimeline } from "./market-timeline"
import { MarketStatistics } from "./market-statistics"

import { calculateOdds, formatTokenAmount } from "@/lib/utils/market-utils"
import {
  ArrowLeft,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  Share2,
  Heart,

  Flame,
  Zap,
  Star,
  ArrowUp,
  Trophy,
  Target
} from "lucide-react"

interface MarketDetailViewProps {
  market: Market
  onMarketUpdate?: () => Promise<void>
}

export function MarketDetailView({ market, onMarketUpdate }: MarketDetailViewProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { availableTokens, refreshBalance } = useTokenBalance()

  // Debug logging to see what data we're getting
  console.log('MarketDetailView received market data:', {
    id: market.id,
    title: market.title,
    totalTokens: market.totalTokens,
    participants: market.participants,
    options: market.options.map(opt => ({
      id: opt.id,
      name: opt.name,
      tokens: opt.tokens,
      percentage: opt.percentage,
      totalTokens: (opt as any).totalTokens,
      participantCount: (opt as any).participantCount
    }))
  })

  // Debug the calculation for each option
  market.options.forEach(option => {
    const actualTokens = option.tokens > 0 ? option.tokens : Math.round((option.percentage / 100) * market.totalTokens)
    const supporterCount = actualTokens > 0 ? Math.round((actualTokens / market.totalTokens) * market.participants) : 0
    console.log(`Option ${option.name}:`, {
      'option.tokens': option.tokens,
      'option.percentage': option.percentage,
      'calculated actualTokens': actualTokens,
      'calculated supporterCount': supporterCount,
      'market.totalTokens': market.totalTokens,
      'market.participants': market.participants
    })
  })

  const [showBackOpinionModal, setShowBackOpinionModal] = useState(false)
  const [showCommitmentModal, setShowCommitmentModal] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)

  // Auto-repair broken data on component mount
  useEffect(() => {
    const autoRepairData = async () => {
      // Check if market has totals but options are empty (broken data)
      const marketHasData = market.totalTokens > 0 && market.participants > 0
      const optionsHaveData = market.options.some(opt =>
        opt.tokens > 0 || opt.percentage > 0 || (opt as any).participantCount > 0
      )

      if (marketHasData && !optionsHaveData && !isRecalculating) {
        console.log('Detected broken option data, auto-repairing...')
        setIsRecalculating(true)

        try {
          const response = await fetch(`/api/markets/${market.id}/recalculate`, {
            method: 'POST'
          })

          if (response.ok) {
            console.log('Data repaired successfully')
            // Refresh the market data
            if (onMarketUpdate) {
              await onMarketUpdate()
            }
          }
        } catch (error) {
          console.error('Failed to auto-repair data:', error)
        } finally {
          setIsRecalculating(false)
        }
      }
    }

    autoRepairData()
  }, [market.id, market.totalTokens, market.participants, market.options, onMarketUpdate, isRecalculating])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showCommitmentModal || showConfirmationModal || showInsufficientBalanceModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showCommitmentModal, showConfirmationModal, showInsufficientBalanceModal])
  const [commitmentData, setCommitmentData] = useState<{
    position: 'yes' | 'no' // Keep for UI compatibility
    optionId: string // Store the actual option ID
    optionName: string // Store the option name for display
    tokensToCommit: number
    currentOdds: number
    potentialWinnings: number
  } | null>(null)

  // Convert current Market interface to the one expected by market-utils
  const convertMarketForUtils = (market: Market): MarketUtilsType => {
    return {
      id: market.id,
      title: market.title,
      description: market.description,
      category: market.category as any, // Type conversion for category
      status: market.status as any, // Type conversion for status
      createdBy: 'system', // Default value
      createdAt: new Date() as any, // Default value
      endsAt: market.endDate as any, // Convert Date to Timestamp
      tags: market.tags || [],
      totalParticipants: market.participants,
      totalTokensStaked: market.totalTokens,
      featured: false,
      trending: false,
      options: market.options.map(option => ({
        id: option.id,
        text: option.name,
        totalTokens: option.tokens || 0,
        participantCount: market.totalTokens > 0 
          ? Math.round((option.tokens / market.totalTokens) * market.participants) 
          : 0
      }))
    }
  }

  // Calculate odds for display
  const marketForUtils = convertMarketForUtils(market)
  const currentOdds = calculateOdds(marketForUtils) || {}
  
  // Debug logging for odds calculation
  console.log('Market for utils:', marketForUtils)
  console.log('Calculated odds:', currentOdds)

  // Format date to readable string
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Calculate days remaining
  const getDaysRemaining = (endDate: Date) => {
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: 'Market ended', color: 'text-gray-500', urgent: false }
    if (diffDays === 0) return { text: 'Ends today', color: 'text-red-600', urgent: true }
    if (diffDays === 1) return { text: '1 day left', color: 'text-amber-600', urgent: true }
    return { text: `${diffDays} days left`, color: 'text-green-600', urgent: false }
  }

  // Get trending indicator
  const getTrendingIndicator = (market: Market) => {
    if (market.participants >= 400) {

      return { icon: <Zap className="h-4 w-4" />, label: "Viral", className: "bg-primary-100 text-primary-700 border-primary-200" }

    } else if (market.totalTokens >= 20000) {
      return { icon: <Flame className="h-4 w-4" />, label: "Hot", className: "bg-red-100 text-red-700 border-red-200" }
    } else if (market.participants >= 200) {
      return { icon: <ArrowUp className="h-4 w-4" />, label: "Rising", className: "bg-green-100 text-green-700 border-green-200" }
    } else if (market.totalTokens >= 15000) {
      return { icon: <Star className="h-4 w-4" />, label: "Popular", className: "bg-amber-100 text-amber-700 border-amber-200" }
    }
    return null
  }

  const timeRemaining = getDaysRemaining(market.endDate)
  const trendingIndicator = getTrendingIndicator(market)



  const handleCommitTokens = async (optionId: string, tokensToCommit: number) => {
    if (!user?.id) return

    try {
      // Find the selected option
      const selectedOption = market.options.find(opt => opt.id === optionId)
      if (!selectedOption) {
        console.error('Selected option not found:', optionId)
        return
      }

      // Calculate odds and potential winnings based on the selected option
      const totalTokensOnPosition = selectedOption.tokens || 0
      const totalMarketTokens = market.totalTokens

      // Use the calculated odds from market utils with proper error handling
      console.log('Looking for odds for optionId:', optionId)
      console.log('Available odds:', currentOdds)
      console.log('Option IDs in market:', market.options.map(opt => opt.id))
      
      const optionOdds = (currentOdds && currentOdds[optionId]) ? currentOdds[optionId] : 2.0
      const potentialWinnings = Math.floor(tokensToCommit * optionOdds)
      
      console.log('Using odds:', optionOdds, 'for potential winnings:', potentialWinnings)

      // Determine position for UI compatibility
      const isFirstOption = market.options.indexOf(selectedOption) === 0

      setCommitmentData({
        position: isFirstOption ? 'yes' : 'no',
        optionId: optionId,
        optionName: selectedOption.name,
        tokensToCommit,
        currentOdds: optionOdds,
        potentialWinnings
      })

      setShowCommitmentModal(false)
      setShowConfirmationModal(true)
    } catch (error) {
      console.error('Error preparing commitment:', error)
    }
  }

  const handleConfirmCommitment = async () => {
    console.log('handleConfirmCommitment called with:', {
      hasUser: !!user,
      userId: user?.id,
      hasCommitmentData: !!commitmentData,
      commitmentData,
      availableTokens
    })

    if (!user?.id || !commitmentData) {
      console.error('Missing required data:', {
        hasUser: !!user,
        userId: user?.id,
        hasCommitmentData: !!commitmentData
      })
      return
    }

    console.log('Starting commitment with data:', {
      userId: user.id,
      predictionId: market.id,
      tokensToCommit: commitmentData.tokensToCommit,
      position: commitmentData.position,
      availableTokens
    })

    try {
      const requestBody = {
        predictionId: market.id,
        tokensToCommit: commitmentData.tokensToCommit,
        position: commitmentData.optionId, // Use the actual option ID for the API
        userId: user.id
      }

      console.log('Sending API request:', requestBody)

      const response = await fetch('/api/tokens/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log('API response status:', response.status, response.statusText)
      console.log('API response headers:', Object.fromEntries(response.headers.entries()))

      let data
      try {
        const responseText = await response.text()
        console.log('Raw response text:', responseText)

        if (responseText) {
          data = JSON.parse(responseText)
          console.log('API response data:', data)
        } else {
          console.error('Empty response from server')
          throw new Error(`Server returned empty response (${response.status})`)
        }
      } catch (jsonError) {
        console.error('Failed to parse response JSON:', jsonError)
        const errorMessage = jsonError instanceof Error ? jsonError.message : 'Unknown parsing error'
        throw new Error(`Server returned invalid response (${response.status}): ${errorMessage}`)
      }

      if (!response.ok) {
        if (response.status === 400 && (data.error === 'Insufficient balance' || data.errorCode === 'INSUFFICIENT_BALANCE')) {
          console.log('Insufficient balance detected, showing modal')
          setShowConfirmationModal(false)
          setShowInsufficientBalanceModal(true)
          return
        }

        const errorMessage = data.message || data.error || `HTTP ${response.status}: ${response.statusText}`
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          data,
          errorMessage,
          errorCode: data.errorCode,
          details: data.details
        })
        throw new Error(errorMessage)
      }

      // Success - close modals and show success message
      setShowConfirmationModal(false)
      setCommitmentData(null)

      console.log('Tokens committed successfully:', data)

      // Refresh balance and market data with retry mechanism
      console.log('Calling refreshBalance...')
      let refreshAttempts = 0
      const maxRefreshAttempts = 3

      while (refreshAttempts < maxRefreshAttempts) {
        try {
          refreshAttempts++
          console.log(`RefreshBalance attempt ${refreshAttempts}/${maxRefreshAttempts}`)
          await refreshBalance()
          console.log('RefreshBalance completed successfully')
          break
        } catch (refreshError) {
          console.error(`RefreshBalance attempt ${refreshAttempts} failed:`, refreshError)
          if (refreshAttempts >= maxRefreshAttempts) {
            console.error('All refresh attempts failed, continuing without refresh')
            // Don't throw - we want the commitment to still be considered successful
          } else {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      if (onMarketUpdate) {
        console.log('Calling onMarketUpdate...')
        try {
          await onMarketUpdate()
          console.log('onMarketUpdate completed')
        } catch (updateError) {
          console.error('Error updating market:', updateError)
        }
      }

      // If all refresh attempts failed, show a message and offer to reload
      if (refreshAttempts >= maxRefreshAttempts) {
        console.log('Balance refresh failed, but commitment was successful. Consider reloading the page.')
        // You could show a toast notification here suggesting a page reload
      }

    } catch (error) {
      console.error('Error committing tokens:', error)

      // Re-throw with a more user-friendly message if it's a generic error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.')
      }

      throw error
    }
  }

  const handlePurchaseTokens = (packageId: string) => {
    // This would integrate with the token purchase system
    console.log('Purchase tokens:', packageId)
    // For now, just close the modal
    setShowInsufficientBalanceModal(false)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: market.title,
          text: market.description,
          url: window.location.href,
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      // You could show a toast notification here
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Markets
        </Button>

        {/* Market header */}
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary-400 to-kai-600 text-white">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge className="bg-white/20 text-white border-white/30">
                    {market.category}
                  </Badge>
                  {trendingIndicator && (
                    <Badge className={`${trendingIndicator.className} bg-white/20 text-white border-white/30`}>
                      {trendingIndicator.icon}
                      <span className="ml-1">{trendingIndicator.label}</span>
                    </Badge>
                  )}
                  <Badge className={`${timeRemaining.urgent ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white/20 text-white border-white/30'}`}>
                    <Clock className="h-3 w-3 mr-1" />
                    {timeRemaining.text}
                  </Badge>
                </div>
                <CardTitle className="text-xl md:text-2xl mb-2">
                  {market.title}
                </CardTitle>
                <p className="text-white/90 text-sm md:text-base">
                  {market.description}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  className="text-white hover:bg-white/20"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Market stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Users className="h-4 w-4 text-gray-500 mr-1" />
                </div>
                <div className="text-2xl font-bold text-gray-800">{formatTokenAmount(market.participants)}</div>
                <div className="text-sm text-gray-500">Participants</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Trophy className="h-4 w-4 text-amber-500 mr-1" />
                </div>
                <div className="text-2xl font-bold text-gray-800">{formatTokenAmount(market.totalTokens)}</div>
                <div className="text-sm text-gray-500">Total Tokens</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Calendar className="h-4 w-4 text-blue-500 mr-1" />
                </div>
                <div className="text-sm font-medium text-gray-800">{formatDate(market.startDate)}</div>
                <div className="text-sm text-gray-500">Started</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Target className="h-4 w-4 text-green-500 mr-1" />
                </div>
                <div className="text-sm font-medium text-gray-800">{formatDate(market.endDate)}</div>
                <div className="text-sm text-gray-500">Ends</div>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Prediction options */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-kai-500" />
                Current Predictions
              </h3>
              <div className="space-y-4">
                {market.options.map((option) => {
                  const optionOdds = (currentOdds && currentOdds[option.id]) ? currentOdds[option.id] : 2.0

                  // Use actual token data from the option
                  const actualTokens = option.tokens || 0
                  const actualPercentage = option.percentage || 0

                  // Check if we have valid option data
                  const hasValidOptionData = actualTokens > 0 || actualPercentage > 0
                  const marketHasData = market.totalTokens > 0 && market.participants > 0
                  
                  // Calculate win chance based on token distribution (not odds)
                  const winChance = market.totalTokens > 0 
                    ? Math.round((actualTokens / market.totalTokens) * 100) 
                    : 0

                  return (
                    <Card key={option.id} className="border-2 hover:border-kai-200 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${option.color}`}></div>
                            <h4 className="font-medium text-gray-800 text-lg">{option.name}</h4>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-kai-600">
                              {market.totalTokens > 0 ? `${winChance}%` : '—'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {market.totalTokens > 0 ? 'chance to win' : 'no data yet'}
                            </div>
                          </div>
                        </div>

                        <Progress value={winChance} className="mb-3 h-3" />

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            {hasValidOptionData ? (
                              <span className="font-semibold">{formatTokenAmount(actualTokens)} tokens committed</span>
                            ) : marketHasData ? (
                              <span className="text-gray-500 italic">
                                {isRecalculating ? 'Updating data...' : 'Loading commitment data...'}
                              </span>
                            ) : (
                              <span className="text-gray-500 italic">No tokens committed</span>
                            )}
                          </div>
                          <Button
                            onClick={() => {
                              // Determine position for UI compatibility (first option = 'yes', others = 'no')
                              const isFirstOption = market.options.indexOf(option) === 0
                              const safeOdds = optionOdds || 2.0 // Ensure we have a valid odds value
                              setCommitmentData({
                                position: isFirstOption ? 'yes' : 'no',
                                optionId: option.id,
                                optionName: option.name,
                                tokensToCommit: 1,
                                currentOdds: safeOdds,
                                potentialWinnings: Math.floor(1 * safeOdds)
                              })
                              setShowCommitmentModal(true)
                            }}
                            disabled={market.status !== 'active' || !user}
                            className="bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full px-6 py-2 font-medium"
                          >
                            Back This
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {!user && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-6">
                <CardContent className="p-4 text-center">
                  <p className="text-blue-800 mb-3">Join KAI to support your opinions and earn tokens!</p>
                  <Button
                    onClick={() => router.push('/auth/login')}
                    className="bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full"
                  >
                    Sign Up Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Market timeline and statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <MarketTimeline market={market} />
          <MarketStatistics market={market} />
        </div>



        {/* Back Opinion Modal */}
        {showBackOpinionModal && user && (
          <BackOpinionModal
            prediction={{
              ...market,
              vibeScore: Math.floor(Math.random() * 100) + 1, // Mock vibe score
              timeLeft: timeRemaining.text,
            }}
            userTokens={availableTokens}
            onClose={() => setShowBackOpinionModal(false)}
          />
        )}

        {/* Token Commitment Modal */}
        {showCommitmentModal && commitmentData && user && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="w-full max-w-md max-h-full overflow-y-auto">
              <PredictionCommitment
                predictionId={market.id}
                predictionTitle={market.title}
                position={commitmentData.position}
                optionId={commitmentData.optionId} // Use the actual option ID
                market={marketForUtils}
                maxTokens={10000} // Max tokens per commitment
                onCommit={(tokens) => handleCommitTokens(commitmentData.optionId, tokens)}
                onCancel={() => setShowCommitmentModal(false)}
              />
            </div>
          </div>
        )}

        {/* Token Commitment Confirmation Modal */}
        {showConfirmationModal && commitmentData && (
          <TokenCommitmentConfirmationModal
            isOpen={showConfirmationModal}
            onClose={() => setShowConfirmationModal(false)}
            onConfirm={handleConfirmCommitment}
            predictionTitle={market.title}
            position={commitmentData.position}
            tokensToCommit={commitmentData.tokensToCommit}
            currentOdds={commitmentData.currentOdds}
            potentialWinnings={commitmentData.potentialWinnings}
            availableTokens={availableTokens}
          />
        )}

        {/* Insufficient Balance Modal */}
        {showInsufficientBalanceModal && commitmentData && (
          <InsufficientBalanceModal
            isOpen={showInsufficientBalanceModal}
            onClose={() => setShowInsufficientBalanceModal(false)}
            onPurchase={handlePurchaseTokens}
            currentBalance={availableTokens}
            requiredTokens={commitmentData.tokensToCommit}
            predictionTitle={market.title}
          />
        )}
      </div>
    </div>
  )
}