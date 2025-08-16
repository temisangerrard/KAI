"use client"

import { useState, useEffect } from "react"
import { TrendingMarkets } from "@/app/components/trending-markets"
import { getTrendingMarketsWithMetadata } from "../create/market-service"
import { TrendingMarket } from "@/lib/services/trending-service"
import { Navigation } from "../../components/navigation"

export default function TrendingMarketsPage() {
  const [trendingMarkets, setTrendingMarkets] = useState<TrendingMarket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadTrendingMarkets = async () => {
      setIsLoading(true)
      try {
        // Get trending markets from the service
        const markets = getTrendingMarketsWithMetadata(20)
        setTrendingMarkets(markets)
      } catch (error) {
        console.error("Failed to load trending markets:", error)
        setTrendingMarkets([])
      } finally {
        setIsLoading(false)
      }
    }

    loadTrendingMarkets()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 lg:py-12">
        <TrendingMarkets 
          markets={trendingMarkets}
          isLoading={isLoading}
          showHeader={true}
          variant="grid"
        />
      </div>
      
      <Navigation />
    </div>
  )
}