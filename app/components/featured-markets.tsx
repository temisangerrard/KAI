"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Star,
  TrendingUp, 
  Users, 
  Clock,
  ArrowRight,
  Sparkles
} from "lucide-react"
import { TrendingMarket } from "@/lib/services/trending-service"

interface FeaturedMarketsProps {
  markets: TrendingMarket[]
  isLoading?: boolean
  showHeader?: boolean
  className?: string
}

export function FeaturedMarkets({ 
  markets, 
  isLoading = false, 
  showHeader = true,
  className = ""
}: FeaturedMarketsProps) {
  const router = useRouter()
  
  // Navigate to market detail page
  const handleMarketClick = (marketId: string) => {
    router.push(`/markets/${marketId}`)
  }
  
  // Calculate days remaining
  const getDaysRemaining = (endDate: Date) => {
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Ended'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day'
    return `${diffDays} days`
  }

  // Render loading skeletons
  if (isLoading) {
    return (
      <div className={className}>
        {showHeader && (
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="p-6">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex justify-between mb-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  
  // Render empty state
  if (markets.length === 0) {
    return (
      <div className={className}>
        {showHeader && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-6 w-6 text-amber-500" />
              <h2 className="text-3xl font-bold text-gray-800">Featured Markets</h2>
            </div>
            <p className="text-gray-600">Handpicked predictions you'll love</p>
          </div>
        )}
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="bg-amber-50 p-4 rounded-full">
              <Star className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">No featured markets</h3>
            <p className="text-gray-600 max-w-md">
              Check back soon for our curated selection of trending predictions.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={className}>
      {showHeader && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-6 w-6 text-amber-500" />
            <h2 className="text-3xl font-bold text-gray-800">Featured Markets</h2>
          </div>
          <p className="text-gray-600">Handpicked predictions you'll love</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markets.map((market, index) => (
          <Card 
            key={market.id} 
            className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group relative bg-gradient-to-br from-white to-gray-50"
            onClick={() => handleMarketClick(market.id)}
          >
            {/* Featured badge for first market */}
            {index === 0 && (
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 text-xs font-bold shadow-lg">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Editor's Pick
                </Badge>
              </div>
            )}
            
            <div className="p-6">
              {/* Market category and trending indicator */}
              <div className="flex items-center justify-between mb-4">
                <Badge 
                  variant="secondary" 
                  className="bg-kai-100 text-kai-700 hover:bg-kai-200 font-medium"
                >
                  {market.category}
                </Badge>
                <div className="flex items-center text-xs text-gray-500">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>{market.trendingScore}</span>
                </div>
              </div>
              
              {/* Market title */}
              <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                {market.title}
              </h3>
              
              {/* Trending reason */}
              <p className="text-sm text-primary-600 font-medium mb-3">
                {market.trendingReason}
              </p>
              
              {/* Market stats */}
              <div className="flex justify-between mb-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{market.participants} participants</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{getDaysRemaining(market.endDate)} left</span>
                </div>
              </div>
              
              {/* Options preview with enhanced styling */}
              <div className="mb-6 space-y-2">
                {market.options.slice(0, 2).map((option) => (
                  <div key={option.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div 
                        className={`w-4 h-4 rounded-full mr-3 ${option.color} shadow-sm`}
                      ></div>
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[140px]">
                        {option.name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-bold text-gray-800">
                        {option.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
                {market.options.length > 2 && (
                  <div className="text-xs text-gray-500 text-center mt-2">
                    +{market.options.length - 2} more options
                  </div>
                )}
              </div>
              
              {/* Enhanced CTA button */}
              <Button 
                className="w-full bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white font-semibold py-3 shadow-lg group-hover:shadow-xl transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  handleMarketClick(market.id)
                }}
              >
                Back Your Opinion
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Explore more markets CTA */}
      <div className="mt-8 text-center">
        <Button 
          variant="outline"
          size="lg"
          className="text-primary-600 border-kai-200 hover:bg-kai-50 px-8 py-3"
          onClick={() => router.push('/markets/discover')}
        >
          Explore All Markets
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  )
}