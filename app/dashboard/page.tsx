"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, TrendingUp, Sparkles, Users, Plus, LogOut, Bell, Star, Crown } from "lucide-react"
import { BackOpinionModal } from "../components/back-opinion-modal"
import { Navigation } from "../components/navigation"
import { MarketCard } from "../components/market-card"
import { useAuth } from "../auth/auth-context"
import { useRouter } from "next/navigation"
import { MarketsService } from "@/lib/services/firestore"
import { Market } from "@/lib/types/database"

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null)
  const [greeting, setGreeting] = useState("")
  const [markets, setMarkets] = useState<Market[]>([])
  const [loadingMarkets, setLoadingMarkets] = useState(true)

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting("Good morning")
    } else if (hour < 17) {
      setGreeting("Good afternoon")
    } else {
      setGreeting("Good evening")
    }
  }, [])

  // Load markets from Firestore
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        setLoadingMarkets(true)
        const { markets: fetchedMarkets } = await MarketsService.getMarkets({
          status: 'active',
          trending: true,
          limit: 10
        })
        setMarkets(fetchedMarkets)
      } catch (error) {
        console.error('Error loading markets:', error)
        // Fallback to empty array if error
        setMarkets([])
      } finally {
        setLoadingMarkets(false)
      }
    }

    if (isAuthenticated) {
      loadMarkets()
    }
  }, [isAuthenticated])

  // Redirect to home if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push("/")
    return null
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (

    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50">

      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="min-h-screen pb-20">
          {/* Mobile Header */}

          <div className="bg-gradient-to-r from-kai-500 via-primary-500 to-gold-500 p-4 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-white/30">
                  <AvatarImage src={user?.profileImage || "/placeholder-user.jpg"} />
                  <AvatarFallback className="bg-white/20 text-white">
                    {user?.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-lg font-bold">
                    {greeting}, {user?.displayName?.split(' ')[0] || 'there'}!
                  </h1>
                  <p className="text-white/80 text-sm">Ready to shine today?</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Bell className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => router.push('/profile')}
                >
                  <Users className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Mobile Token Balance */}
            <div className="bg-white/20 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-semibold">{user?.tokenBalance?.toLocaleString() || 0} tokens</span>
                </div>
                <Button size="sm" className="bg-white text-kai-600 hover:bg-white/90">
                  <Plus className="h-4 w-4 mr-1" />
                  Buy More
                </Button>
              </div>
            </div>

            {/* Mobile Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/20 rounded-lg p-3 text-center">
                <div className="text-lg font-bold">{user?.totalPredictions || 0}</div>
                <div className="text-xs text-white/80">Predictions</div>
              </div>
              <div className="bg-white/20 rounded-lg p-3 text-center">
                <div className="text-lg font-bold">
                  {user?.totalPredictions ? Math.round((user.correctPredictions / user.totalPredictions) * 100) : 0}%
                </div>
                <div className="text-xs text-white/80">Win Rate</div>
              </div>
              <div className="bg-white/20 rounded-lg p-3 text-center">
                <div className="text-lg font-bold">{user?.level || 1}</div>
                <div className="text-xs text-white/80">Level</div>
              </div>
            </div>
          </div>

          {/* Mobile Content */}
          <div className="p-4 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-kai-500" />
                <h2 className="text-lg font-semibold text-gray-800">Trending Now</h2>
                <Badge className="bg-kai-100 text-kai-700 text-xs">Hot</Badge>
              </div>

              {loadingMarkets ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading markets...</p>
                </div>
              ) : markets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No active markets available.</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => router.push('/admin/markets/create')}
                  >
                    Create First Market
                  </Button>
                </div>
              ) : (
                markets.map((market) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    onBackOpinion={setSelectedPrediction}
                  />
                ))
              )}
            </div>
          </div>
        </div>
        <Navigation />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Desktop Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <div
                className="text-3xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text cursor-pointer"
                onClick={() => router.push('/')}
              >
                KAI
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {greeting}, {user?.displayName?.split(' ')[0] || 'there'}!
                </h1>
                <p className="text-gray-600">Your prediction journey awaits</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-2 bg-gradient-to-r from-kai-100 to-gold-100 px-4 py-2 rounded-full">
                <Sparkles className="h-5 w-5 text-kai-600" />
                <span className="font-bold text-kai-700">{user?.tokenBalance?.toLocaleString() || 0}</span>
                <span className="text-kai-600 text-sm">tokens</span>
              </div>

              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10 border-2 border-kai-200">
                  <AvatarImage src={user?.profileImage || "/placeholder-user.jpg"} />
                  <AvatarFallback className="bg-kai-100 text-kai-700">
                    {user?.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/profile')}
                    className="text-gray-600 hover:text-kai-600"
                  >
                    Profile
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Hero Section */}
          <div className="grid grid-cols-12 gap-8 mb-8">
            <div className="col-span-8">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-kai-500 via-primary-500 to-gold-500 text-white overflow-hidden relative">
                <CardContent className="p-8 relative">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-16 w-16 border-3 border-white/30">
                      <AvatarImage src={user?.profileImage || "/placeholder-user.jpg"} />
                      <AvatarFallback className="bg-white/20 text-white text-xl">
                        {user?.displayName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-2xl font-bold mb-1">Welcome back, {user?.displayName?.split(' ')[0]}!</h2>
                      <p className="text-white/80">You're part of an amazing community of predictors</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold mb-1">{user?.totalPredictions || 0}</div>
                      <div className="text-white/80 text-sm">Predictions Made</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold mb-1">
                        {user?.totalPredictions ? Math.round((user.correctPredictions / user.totalPredictions) * 100) : 0}%
                      </div>
                      <div className="text-white/80 text-sm">Success Rate</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold mb-1">{user?.tokenBalance?.toLocaleString() || 0}</div>
                      <div className="text-white/80 text-sm">Token Balance</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      className="bg-white text-kai-600 hover:bg-white/90"
                      onClick={() => router.push('/markets/create')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Prediction
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                      onClick={() => router.push('/trending')}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Explore Trending
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-4 space-y-4">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-amber-100 to-gold-100 rounded-xl flex items-center justify-center">
                      <Crown className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Rising Star</h3>
                      <p className="text-sm text-gray-600">You're in the top 25%!</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="bg-gradient-to-r from-amber-500 to-gold-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500">75% to next level</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary-100 to-pink-100 rounded-xl flex items-center justify-center">
                      <Heart className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Community Love</h3>
                      <p className="text-sm text-gray-600">{Math.floor(Math.random() * 50) + 20} likes this week</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push('/social')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Social Feed
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Desktop Content */}
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-8">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-kai-500" />
                    Trending Now
                    <Badge className="bg-kai-100 text-kai-700 text-xs">Hot</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loadingMarkets ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">Loading markets...</p>
                      </div>
                    ) : markets.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No active markets available.</p>
                        <Button 
                          className="mt-4" 
                          onClick={() => router.push('/admin/markets/create')}
                        >
                          Create First Market
                        </Button>
                      </div>
                    ) : (
                      markets.map((market) => (
                        <MarketCard
                          key={market.id}
                          market={market}
                          onBackOpinion={setSelectedPrediction}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-4 space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-gold-500" />
                    Recent Winners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: "Sarah M.", amount: "1,250", prediction: "BBNaija Winner" },
                      { name: "Zara K.", amount: "890", prediction: "Fashion Trend" },
                      { name: "Amara O.", amount: "2,100", prediction: "Music Charts" }
                    ].map((winner, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-bold text-sm">#{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{winner.name}</p>
                          <p className="text-xs text-gray-600">{winner.prediction}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">+{winner.amount}</p>
                          <p className="text-xs text-gray-500">tokens</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {selectedPrediction && (
        <BackOpinionModal
          prediction={selectedPrediction}
          userTokens={user?.tokenBalance || 0}
          onClose={() => setSelectedPrediction(null)}
        />
      )}
    </div>
  )
}