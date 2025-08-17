"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Market } from "@/app/auth/auth-context"
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  ArrowRight,
  Clock,
  Flame,
  Zap,
  Star,
  ArrowUp
} from "lucide-react"

interface MarketGridProps {
  markets: Market[]
  isLoading: boolean
}

export function MarketGrid({ markets, isLoading }: MarketGridProps) {
  const router = useRouter()
  
  // Navigate to market detail page
  const handleMarketClick = (marketId: string) => {
    router.push(`/markets/${marketId}`)
  }
  
  // Format date to readable string
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  // Calculate days remaining
  const getDaysRemaining = (endDate: Date) => {
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Ended'
    if (diffDays === 0) return 'Ends today'
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} left`
  }
  
  // Get appropriate badge color based on time remaining
  const getTimeRemainingColor = (endDate: Date) => {
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'bg-gray-200 text-gray-700'
    if (diffDays <= 1) return 'bg-red-100 text-red-700'
    if (diffDays <= 3) return 'bg-amber-100 text-amber-700'
    return 'bg-green-100 text-green-700'
  }

  // Check if market is trending based on simple criteria
  const isTrending = (market: Market) => {
    return market.participants >= 200 || market.totalTokens >= 15000
  }

  // Get trending indicator
  const getTrendingIndicator = (market: Market) => {
    if (market.participants >= 400) {

      return { icon: <Zap className="h-3 w-3" />, label: "Viral", className: "bg-primary-100 text-primary-700" }

    } else if (market.totalTokens >= 20000) {
      return { icon: <Flame className="h-3 w-3" />, label: "Hot", className: "bg-red-100 text-red-700" }
    } else if (market.participants >= 200) {
      return { icon: <ArrowUp className="h-3 w-3" />, label: "Rising", className: "bg-green-100 text-green-700" }
    } else if (market.totalTokens >= 15000) {
      return { icon: <Star className="h-3 w-3" />, label: "Popular", className: "bg-amber-100 text-amber-700" }
    }
    return null
  }

  // Render loading skeletons
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex justify-between mb-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <div className="flex space-x-2 mb-4">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    )
  }
  
  // Render empty state
  if (markets.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="bg-kai-50 p-4 rounded-full">
            <TrendingUp className="h-8 w-8 text-kai-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800">No markets found</h3>
          <p className="text-gray-600 max-w-md">
            We couldn't find any markets matching your criteria. Try adjusting your filters or search terms.
          </p>
          <Button 
            onClick={() => router.push('/markets/create')}
            className="bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full px-6"
          >
            Create a Market
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {markets.map((market) => (
        <Card 
          key={market.id} 
          className="overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
          onClick={() => handleMarketClick(market.id)}
        >
          <div className="p-4">
            {/* Market title */}
            <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2">
              {market.title}
            </h3>
            
            {/* Market description */}
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {market.description}
            </p>
            
            {/* Market stats */}
            <div className="flex justify-between mb-3 text-xs text-gray-500">
              <div className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                <span>{market.participants} participants</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{formatDate(market.startDate)}</span>
              </div>
            </div>
            
            {/* Category, trending indicator, and time remaining */}
            <div className="flex flex-wrap gap-2 mb-3">

              <Badge variant="secondary" className="bg-primary-100 text-primary-700 hover:bg-primary-200">

                {market.category}
              </Badge>
              {(() => {
                const trendingIndicator = getTrendingIndicator(market)
                return trendingIndicator ? (
                  <Badge className={trendingIndicator.className}>
                    {trendingIndicator.icon}
                    <span className="ml-1">{trendingIndicator.label}</span>
                  </Badge>
                ) : null
              })()}
              <Badge className={getTimeRemainingColor(market.endDate)}>
                <Clock className="h-3 w-3 mr-1" />
                {getDaysRemaining(market.endDate)}
              </Badge>
            </div>
            
            {/* Options preview */}
            <div className="mb-4">
              {market.options.slice(0, 2).map((option, index) => (
                <div key={option.id} className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <div 
                      className={`w-3 h-3 rounded-full mr-2 ${option.color}`}
                    ></div>
                    <span className="text-sm text-gray-700 truncate max-w-[150px]">
                      {option.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {option.percentage}%
                  </span>
                </div>
              ))}
              {market.options.length > 2 && (
                <div className="text-xs text-gray-500 mt-1">
                  +{market.options.length - 2} more options
                </div>
              )}
            </div>
            
            {/* View market button */}
            <Button 
              variant="outline" 
              className="w-full text-primary-600 border-kai-200 hover:bg-kai-50 hover:text-kai-700 hover:border-primary-300"
              onClick={(e) => {
                e.stopPropagation()
                handleMarketClick(market.id)
              }}
            >
              View Market
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}