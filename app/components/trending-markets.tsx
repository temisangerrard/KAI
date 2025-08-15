"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  TrendingUp, 
  Flame, 
  Zap, 
  Star,
  Users, 
  Clock,
  ArrowRight,
  ArrowUp
} from "lucide-react"
import { TrendingMarket } from "@/lib/services/trending-service"

interface TrendingMarketsProps {
  markets: TrendingMarket[]
  isLoading?: boolean
  showHeader?: boolean
  limit?: number
  variant?: 'grid' | 'list' | 'compact'
  className?: string
}

export function TrendingMarkets({ 
  markets, 
  isLoading = false, 
  showHeader = true,
  limit,
  variant = 'grid',
  className = ""
}: TrendingMarketsProps) {
  const router = useRouter()
  
  // Limit markets if specified
  const displayMarkets = limit ? markets.slice(0, limit) : markets
  
  // Navigate to market detail page
  const handleMarketClick = (marketId: string) => {
    router.push(`/markets/${marketId}`)
  }
  
  // Get popularity indicator icon and styling
  const getPopularityIndicator = (indicator: 'hot' | 'rising' | 'viral' | 'featured') => {
    switch (indicator) {
      case 'viral':
        return {
          icon: <Zap className="h-3 w-3" />,
          className: "bg-purple-100 text-purple-700 border-purple-200",
          label: "Viral"
        }
      case 'hot':
        return {
          icon: <Flame className="h-3 w-3" />,
          className: "bg-red-100 text-red-700 border-red-200",
          label: "Hot"
        }
      case 'rising':
        return {
          icon: <ArrowUp className="h-3 w-3" />,
          className: "bg-green-100 text-green-700 border-green-200",
          label: "Rising"
        }
      case 'featured':
        return {
          icon: <Star className="h-3 w-3" />,
          className: "bg-amber-100 text-amber-700 border-amber-200",
          label: "Featured"
        }
    }
  }
  
  // Format date to readable string
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
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
    const skeletonCount = limit || 6
    return (
      <div className={className}>
        {showHeader && (
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        )}
        <div className={`grid gap-4 ${
          variant === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
          variant === 'list' ? 'grid-cols-1' :
          'grid-cols-1 sm:grid-cols-2'
        }`}>
          {[...Array(skeletonCount)].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="flex justify-between mb-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
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
  if (displayMarkets.length === 0) {
    return (
      <div className={className}>
        {showHeader && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Trending Markets</h2>
            <p className="text-gray-600">Discover what's popular right now</p>
          </div>
        )}
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="bg-kai-50 p-4 rounded-full">
              <TrendingUp className="h-8 w-8 text-kai-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">No trending markets</h3>
            <p className="text-gray-600 max-w-md">
              Check back soon to see what's trending in the community.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={className}>
      {showHeader && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-6 w-6 text-kai-500" />
            <h2 className="text-2xl font-bold text-gray-800">Trending Markets</h2>
          </div>
          <p className="text-gray-600">Discover what's popular right now</p>
        </div>
      )}
      
      <div className={`grid gap-4 ${
        variant === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
        variant === 'list' ? 'grid-cols-1' :
        'grid-cols-1 sm:grid-cols-2'
      }`}>
        {displayMarkets.map((market, index) => {
          const popularityIndicator = getPopularityIndicator(market.popularityIndicator)
          
          return (
            <Card 
              key={market.id} 
              className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group relative"
              onClick={() => handleMarketClick(market.id)}
            >
              {/* Trending rank badge for top markets */}
              {index < 3 && variant === 'grid' && (
                <div className="absolute top-3 left-3 z-10">
                  <Badge className="bg-gradient-to-r from-primary-400 to-kai-600 text-white border-0 text-xs font-bold">
                    #{index + 1}
                  </Badge>
                </div>
              )}
              
              <div className="p-4">
                {/* Popularity indicator and trending score */}
                <div className="flex items-center justify-between mb-3">
                  <Badge 
                    variant="outline" 
                    className={`${popularityIndicator.className} border text-xs font-medium`}
                  >
                    {popularityIndicator.icon}
                    <span className="ml-1">{popularityIndicator.label}</span>
                  </Badge>
                  <div className="flex items-center text-xs text-gray-500">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span>{market.trendingScore}</span>
                  </div>
                </div>
                
                {/* Market title */}
                <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {market.title}
                </h3>
                
                {/* Trending reason */}
                <p className="text-sm text-primary-600 font-medium mb-2">
                  {market.trendingReason}
                </p>
                
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
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{getDaysRemaining(market.endDate)} left</span>
                  </div>
                </div>
                
                {/* Category and growth rate */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs">
                    {market.category}
                  </Badge>
                  {market.growthRate > 50 && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      +{Math.round(market.growthRate)}%
                    </Badge>
                  )}
                </div>
                
                {/* Options preview */}
                <div className="mb-4">
                  {market.options.slice(0, 2).map((option) => (
                    <div key={option.id} className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <div 
                          className={`w-3 h-3 rounded-full mr-2 ${option.color}`}
                        ></div>
                        <span className="text-sm text-gray-700 truncate max-w-[120px]">
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
                  className="w-full text-primary-600 border-kai-200 hover:bg-kai-50 hover:text-kai-700 hover:border-primary-300 group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-all"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleMarketClick(market.id)
                  }}
                >
                  Back Your Opinion
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
      
      {/* View all trending markets link */}
      {limit && markets.length > limit && (
        <div className="mt-6 text-center">
          <Button 
            variant="outline"
            className="text-primary-600 border-kai-200 hover:bg-kai-50"
            onClick={() => router.push('/markets/discover?sort=trending')}
          >
            View All Trending Markets
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}