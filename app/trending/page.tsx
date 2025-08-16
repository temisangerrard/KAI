"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Share2, TrendingUp, Sparkles, Users, ArrowLeft, Filter, Search } from "lucide-react"
import { BackOpinionModal } from "../components/back-opinion-modal"
import { Navigation } from "../components/navigation"
import { useAuth } from "../auth/auth-context"
import { getTrendingMarketsWithMetadata } from "../markets/create/market-service"

export default function TrendingPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null)
  const [trendingMarkets, setTrendingMarkets] = useState<any[]>([])
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router])

  // Load trending markets
  useEffect(() => {
    const loadTrendingMarkets = async () => {
      setIsLoadingMarkets(true)
      try {
        const markets = getTrendingMarketsWithMetadata(20)
        setTrendingMarkets(markets)
      } catch (error) {
        console.error("Failed to load trending markets:", error)
      } finally {
        setIsLoadingMarkets(false)
      }
    }

    loadTrendingMarkets()
  }, [])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-kai-500 text-transparent bg-clip-text mb-4">
            KAI
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-500 mx-auto"></div>
        </div>
      </div>
    )
  }

  const categories = ["all", "Entertainment", "Music", "Fashion", "Celebrity", "TV Shows", "Movies", "Social Media", "Technology"]
  
  const filteredMarkets = selectedCategory === "all" 
    ? trendingMarkets 
    : trendingMarkets.filter(market => market.category === selectedCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50">
      <div className="max-w-4xl md:max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6 md:pt-8">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">Trending Markets</h1>
            <p className="text-gray-600">Discover what's hot right now</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm">
            <Sparkles className="w-4 h-4 text-kai-500" />
            <span className="font-semibold text-gray-800">{user?.tokenBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text">
                  KAI
                </div>
                <div className="w-1 h-6 bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-800">Trending Markets</h1>
              </div>
              <button 
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-kai-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Dashboard</span>
              </button>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <Sparkles className="w-5 h-5 text-kai-600" />
              <span className="font-semibold text-gray-800">{user?.tokenBalance.toLocaleString()} tokens</span>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap ${
                selectedCategory === category
                  ? "bg-kai-500 hover:bg-primary-600 text-white"
                  : "border-kai-200 text-primary-600 hover:bg-kai-50"
              }`}
            >
              {category === "all" ? "All Categories" : category}
            </Button>
          ))}
        </div>

        {/* Trending Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-kai-50 to-rose-50">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-kai-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{trendingMarkets.length}</p>
              <p className="text-xs text-gray-600">Trending Markets</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary-50 to-indigo-50">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-primary-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">
                {trendingMarkets.reduce((sum, market) => sum + market.participants, 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600">Total Participants</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-amber-50">
            <CardContent className="p-4 text-center">
              <Sparkles className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">
                {trendingMarkets.reduce((sum, market) => sum + market.totalTokens, 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600">Tokens in Play</p>
            </CardContent>
          </Card>
        </div>

        {/* Trending Markets */}
        {isLoadingMarkets ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-200 rounded"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMarkets.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No trending markets found</h3>
              <p className="text-gray-600 mb-4">
                {selectedCategory === "all" 
                  ? "Check back later for trending markets" 
                  : `No trending markets in ${selectedCategory} category`}
              </p>
              <Button 
                onClick={() => setSelectedCategory("all")}
                className="bg-kai-500 hover:bg-primary-600 text-white"
              >
                View All Categories
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMarkets.map((market, index) => (
              <Card
                key={market.id}
                className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-kai-100 text-kai-700 text-xs">
                          {market.category}
                        </Badge>
                        <Badge className={`text-white text-xs ${
                          market.popularityIndicator === 'viral' ? 'bg-gradient-to-r from-red-400 to-kai-600' :
                          market.popularityIndicator === 'hot' ? 'bg-gradient-to-r from-orange-400 to-red-400' :
                          market.popularityIndicator === 'rising' ? 'bg-gradient-to-r from-green-400 to-blue-400' :
                          'bg-gradient-to-r from-primary-400 to-kai-600'
                        }`}>
                          {market.popularityIndicator === 'viral' ? '🔥 Viral' :
                           market.popularityIndicator === 'hot' ? '🔥 Hot' :
                           market.popularityIndicator === 'rising' ? '📈 Rising' :
                           '⭐ Featured'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-1">{market.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{market.description}</p>
                      <p className="text-xs text-primary-600 font-medium">{market.trendingReason}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-1 text-kai-500">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-semibold">{market.trendingScore}</span>
                      </div>
                      <p className="text-xs text-gray-500">trending score</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3 mb-4">
                    {market.options.map((option: any, optionIndex: number) => (
                      <div key={optionIndex} className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{option.name}</span>
                          <span className="text-sm font-semibold text-gray-800">{option.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${option.color} rounded-full transition-all duration-500`}
                            style={{ width: `${option.percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{option.tokens.toLocaleString()} tokens supporting</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{market.participants.toLocaleString()}</span>
                      </div>
                      <span>Growth: +{Math.round(market.growthRate)}%</span>
                    </div>
                    <span className="font-medium text-primary-600">
                      {market.totalTokens.toLocaleString()} tokens
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full"
                      onClick={() => setSelectedPrediction(market)}
                    >
                      Support Your Opinion ✨
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full border-kai-200 bg-transparent">
                      <Share2 className="w-4 h-4 text-kai-500" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-gray-500 hover:text-kai-500">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm">{Math.floor(Math.random() * 500) + 100}</span>
                      </button>
                      <button className="flex items-center gap-1 text-gray-500 hover:text-kai-500">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">{Math.floor(Math.random() * 100) + 20}</span>
                      </button>
                    </div>
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <Avatar key={i} className="w-6 h-6 border-2 border-white">
                          <AvatarImage src={`/placeholder.svg?height=24&width=24`} />
                          <AvatarFallback className="text-xs bg-kai-100 text-kai-700">U{i}</AvatarFallback>
                        </Avatar>
                      ))}
                      <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                        <span className="text-xs text-gray-600">+</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedPrediction && (
          <BackOpinionModal
            prediction={selectedPrediction}
            userTokens={user?.tokenBalance || 0}
            onClose={() => setSelectedPrediction(null)}
          />
        )}
      </div>
      
      <Navigation />
    </div>
  )
}