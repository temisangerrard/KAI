"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Market } from "@/lib/db/database"
import { MarketDetailView } from "./market-detail-view"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { Navigation } from "../../components/navigation"
import { getMarketById } from "../create/market-service"

interface MarketDetailClientProps {
  market: Market
}

export function MarketDetailClient({ market: initialMarket }: MarketDetailClientProps) {
  const router = useRouter()
  const [market, setMarket] = useState<Market>(initialMarket)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMarket = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const foundMarket = await getMarketById(market.id)
      
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50">
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
                Something went wrong
              </h3>
              <p className="text-gray-600 max-w-md">
                We couldn't load this market. Please try again later.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Go Back
                </Button>
                <Button 
                  onClick={() => router.push('/markets')}
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
      <MarketDetailView market={market} onMarketUpdate={loadMarket} />
      <Navigation />
    </div>
  )
}