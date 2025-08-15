"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Market } from "@/app/auth/auth-context"
import { getAllMarkets } from "../create/market-service"
import { 
  Sparkles, 
  ArrowRight, 
  Users, 
  Clock,
  TrendingUp,
  Flame,
  Star
} from "lucide-react"

interface RelatedMarketsProps {
  currentMarket: Market
}

export function RelatedMarkets({ currentMarket }: RelatedMarketsProps) {
  const router = useRouter()
  const [relatedMarkets, setRelatedMarkets] = useState<Market[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadRelatedMarkets = () => {
      setIsLoading(true)
      try {
        const allMarkets = getAllMarkets()
        
        // Filter out the current market
        const otherMarkets = allMarkets.filter(market => market.id !== currentMarket.id)
        
        // Find related markets based on category and other criteria
        const related = findRelatedMarkets(otherMarkets, currentMarket)
        
        setRelatedMarkets(related.slice(0, 4)) // Show up to 4 related markets
      } catch (error) {
        console.error("Failed to load related markets:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRelatedMarkets()
  }, [currentMarket])

  const findRelatedMarkets = (markets: Market[], current: Market): Market[] => {
    // Score markets based on similarity
    const scoredMarkets = markets.map(market => {
      let score = 0
      
      // Same category gets highest score
      if (market.category === current.category) {
        score += 50
      }
      
      // Similar participant count
      const participantDiff = Math.abs(market.participants - current.participants)
      if (participantDiff < 100) score += 20
      else if (participantDiff < 200) score += 10
      
      // Similar token amounts
      const tokenDiff = Math.abs(market.totalTokens - current.totalTokens)
      if (tokenDiff < 5000) score += 15
      else if (tokenDiff < 10000) score += 8
      
      // Active markets get bonus
      if (market.status === 'active') score += 25
      
      // Trending markets get bonus
      if (market.participants >= 200 || market.totalTokens >= 15000) {
        score += 15
      }
      
      // Recent markets get bonus
      const daysSinceStart = (new Date().getTime() - new Date(market.startDate).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceStart < 7) score += 10
      
      return { ...market, score }
    })
    
    // Sort by score and return
    return scoredMarkets
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...market }) => market)
  }

  const formatTimeRemaining = (endDate: Date) => {
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Ended'
    if (diffDays === 0) return 'Ends today'
    if (diffDays === 1) return '1 day left'
    return `${diffDays} days left`
  }

  const getTrendingIndicator = (market: Market) => {
    if (market.participants >= 400) {
      return { icon: <Flame className="h-3 w-3" />, label: "Viral", className: "bg-purple-100 text-purple-700" }
    } else if (market.totalTokens >= 20000) {
      return { icon: <Flame className="h-3 w-3" />, label: "Hot", className: "bg-red-100 text-red-700" }
    } else if (market.participants >= 200) {
      return { icon: <TrendingUp className="h-3 w-3" />, label: "Rising", className: "bg-green-100 text-green-700" }
    } else if (market.totalTokens >= 15000) {
      return { icon: <Star className="h-3 w-3" />, label: "Popular", className: "bg-amber-100 text-amber-700" }
    }
    return null
  }

  const handleMarketClick = (marketId: string) => {
    router.push(`/markets/${marketId}`)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Sparkles className="h-5 w-5 mr-2 text-kai-500" />
            Related Markets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (relatedMarkets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Sparkles className="h-5 w-5 mr-2 text-kai-500" />
            Related Markets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="bg-gray-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">No related markets found at the moment.</p>
            <Button
              onClick={() => router.push('/markets/discover')}
              className="bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full"
            >
              Explore All Markets
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-kai-500" />
            Related Markets
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/markets/discover')}
            className="text-primary-600 hover:text-kai-700"
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relatedMarkets.map((market) => {
            const trendingIndicator = getTrendingIndicator(market)
            
            return (
              <Card 
                key={market.id} 
                className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-2 hover:border-kai-200"
                onClick={() => handleMarketClick(market.id)}
              >
                <CardContent className="p-4">
                  {/* Market title */}
                  <h4 className="font-medium text-gray-800 mb-2 line-clamp-2 text-sm">
                    {market.title}
                  </h4>
                  
                  {/* Category and trending indicator */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                      {market.category}
                    </Badge>
                    {trendingIndicator && (
                      <Badge className={`${trendingIndicator.className} text-xs`}>
                        {trendingIndicator.icon}
                        <span className="ml-1">{trendingIndicator.label}</span>
                      </Badge>
                    )}
                  </div>
                  
                  {/* Market stats */}
                  <div className="flex justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      <span>{market.participants}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{formatTimeRemaining(market.endDate)}</span>
                    </div>
                  </div>
                  
                  {/* Top options preview */}
                  <div className="space-y-1 mb-3">
                    {market.options.slice(0, 2).map((option) => (
                      <div key={option.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${option.color}`}></div>
                          <span className="text-gray-700 truncate max-w-[80px]">{option.name}</span>
                        </div>
                        <span className="font-medium text-gray-800">{option.percentage}%</span>
                      </div>
                    ))}
                    {market.options.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{market.options.length - 2} more
                      </div>
                    )}
                  </div>
                  
                  {/* View button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-primary-600 border-kai-200 hover:bg-kai-50 hover:text-kai-700 hover:border-primary-300 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarketClick(market.id)
                    }}
                  >
                    View Market
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {relatedMarkets.length < 4 && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => router.push('/markets/discover')}
              className="text-primary-600 border-kai-200 hover:bg-kai-50 hover:text-kai-700 hover:border-primary-300"
            >
              Discover More Markets
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}