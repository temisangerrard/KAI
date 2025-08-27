"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Market } from "@/lib/db/database"
import { useAuth } from "@/app/auth/auth-context"
import { useTokenBalance } from "@/hooks/use-token-balance"
import { BackOpinionModal } from "@/app/components/back-opinion-modal"
import { PredictionCommitment } from "@/app/components/prediction-commitment"
import { TokenCommitmentConfirmationModal } from "@/app/components/token-commitment-confirmation-modal"
import { InsufficientBalanceModal } from "@/app/components/insufficient-balance-modal"
import { MarketTimeline } from "./market-timeline"
import { MarketStatistics } from "./market-statistics"
import { RelatedMarkets } from "./related-markets"
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock,
  Share2,
  Heart,
  MessageCircle,
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
  const [showBackOpinionModal, setShowBackOpinionModal] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [showCommitmentModal, setShowCommitmentModal] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false)
  const [commitmentData, setCommitmentData] = useState<{
    position: 'yes' | 'no'
    tokensToCommit: number
    currentOdds: number
    potentialWinnings: number
  } | null>(null)

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

  const handleBackOpinion = (optionName: string) => {
    setSelectedOption(optionName)
    setShowBackOpinionModal(true)
  }

  const handleCommitTokens = async (position: 'yes' | 'no', tokensToCommit: number) => {
    if (!user?.id) return

    try {
      // Calculate odds and potential winnings
      const totalTokensOnPosition = market.options.find(opt => 
        (position === 'yes' && opt.id === 'yes') || 
        (position === 'no' && opt.id === 'no')
      )?.totalTokens || 0
      
      const totalTokensOnOpposite = market.options.find(opt => 
        (position === 'yes' && opt.id === 'no') || 
        (position === 'no' && opt.id === 'yes')
      )?.totalTokens || 0

      const totalMarketTokens = market.totalTokens
      const currentOdds = totalMarketTokens > 0 ? (totalTokensOnOpposite + tokensToCommit) / (totalTokensOnPosition + tokensToCommit) : 1
      const potentialWinnings = Math.floor(tokensToCommit * currentOdds)

      setCommitmentData({
        position,
        tokensToCommit,
        currentOdds,
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
        position: commitmentData.position,
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
        throw new Error(`Server returned invalid response (${response.status}): ${jsonError.message}`)
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
                <div className="text-2xl font-bold text-gray-800">{market.participants.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Participants</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Trophy className="h-4 w-4 text-amber-500 mr-1" />
                </div>
                <div className="text-2xl font-bold text-gray-800">{market.totalTokens.toLocaleString()}</div>
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
                {market.options.map((option) => (
                  <Card key={option.id} className="border-2 hover:border-kai-200 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${option.color}`}></div>
                          <h4 className="font-medium text-gray-800">{option.name}</h4>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">{option.percentage}%</div>
                          <div className="text-sm text-gray-500">{option.tokens.toLocaleString()} tokens</div>
                        </div>
                      </div>
                      
                      <Progress value={option.percentage} className="mb-3 h-2" />
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {Math.round((option.tokens / market.totalTokens) * market.participants)} supporters
                        </div>
                        <Button
                          onClick={() => {
                            const position = option.id === 'yes' ? 'yes' : 'no'
                            setCommitmentData({ 
                              position, 
                              tokensToCommit: 1, 
                              currentOdds: 1, 
                              potentialWinnings: 1 
                            })
                            setShowCommitmentModal(true)
                          }}
                          disabled={market.status !== 'active' || !user}
                          className="bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full px-4 py-1 text-sm"
                        >
                          Back This Opinion
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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

        {/* Related markets */}
        <RelatedMarkets currentMarket={market} />

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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <PredictionCommitment
              predictionId={market.id}
              predictionTitle={market.title}
              position={commitmentData.position}
              currentOdds={commitmentData.currentOdds}
              maxTokens={10000} // Max tokens per commitment
              onCommit={(tokens) => handleCommitTokens(commitmentData.position, tokens)}
              onCancel={() => setShowCommitmentModal(false)}
            />
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