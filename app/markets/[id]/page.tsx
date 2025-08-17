"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getMarketById, getAllMarkets } from "../create/market-service"
import { Market } from "@/app/auth/auth-context"
import { MarketDetailView } from "./market-detail-view"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { Navigation } from "../../components/navigation"

export default function MarketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [market, setMarket] = useState<Market | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMarket = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const marketId = params.id as string
        const foundMarket = getMarketById(marketId)
        
        if (!foundMarket) {
          setError("Market not found")
        } else {
          setMarket(foundMarket)
        }
      } catch (err) {
        console.error("Failed to load market:", err)
        setError("Failed to load market")
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      loadMarket()
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-kai-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="h-32 bg-gray-200 rounded mb-6"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-kai-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="bg-red-50 p-4 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">
                {error === "Market not found" ? "Market Not Found" : "Something went wrong"}
              </h3>
              <p className="text-gray-600 max-w-md">
                {error === "Market not found" 
                  ? "The market you're looking for doesn't exist or may have been removed."
                  : "We couldn't load this market. Please try again later."
                }
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Go Back
                </Button>
                <Button 
                  onClick={() => router.push('/markets/discover')}
                  className="bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white"
                >
                  Browse Markets
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        <Navigation />
      </div>
    )
  }

  return (
    <div>
      <MarketDetailView market={market} />
      <Navigation />
    </div>
  )
}