"use client"

import { useState, useEffect } from "react"
import { FeaturedMarkets } from "./featured-markets"
import { getFeaturedMarkets } from "../markets/create/market-service"
import { TrendingMarket } from "@/lib/services/trending-service"

export function FeaturedMarketsSection() {
  const [featuredMarkets, setFeaturedMarkets] = useState<TrendingMarket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadFeaturedMarkets = async () => {
      setIsLoading(true)
      try {
        const markets = await getFeaturedMarkets(6)
        setFeaturedMarkets(markets)
      } catch (error) {
        console.error("Failed to load featured markets:", error)
        setFeaturedMarkets([])
      } finally {
        setIsLoading(false)
      }
    }

    loadFeaturedMarkets()
  }, [])

  return (
    <FeaturedMarkets 
      markets={featuredMarkets}
      isLoading={isLoading}
      showHeader={true}
    />
  )
}