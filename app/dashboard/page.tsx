"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Share2, TrendingUp, Sparkles, Users, PlusCircle, Home, Wallet, User } from "lucide-react"
import { BackOpinionModal } from "../components/back-opinion-modal"
import { Navigation } from "../components/navigation"
import { useAuth } from "../auth/auth-context"
import { useOnboarding } from "../auth/onboarding-context"
import { OnboardingFlow } from "../components/onboarding-flow"
import { TourGuide } from "../components/tour-guide"
import { FeatureDiscovery } from "../components/feature-discovery"
import { ContextualHelp } from "../components/contextual-help"
import { useRouter } from "next/navigation"

const mockPredictions = [
  {
    id: 1,
    title: "Who will be the fan favorite on BBNaija All Stars?",
    description: "The ultimate showdown is here! Which housemate has captured viewers' hearts?",
    options: [
      { name: "Mercy", percentage: 45, tokens: 12500, color: "bg-kai-600" },
      { name: "Tacha", percentage: 35, tokens: 9800, color: "bg-purple-400" },
      { name: "Nengi", percentage: 20, tokens: 5600, color: "bg-blue-400" },
    ],
    category: "BBNaija",
    vibeScore: 98,
    totalBacked: 27900,
    participants: 1247,
    timeLeft: "2 days",
    trending: true,
  },
  {
    id: 2,
    title: "Davido vs Wizkid: Who creates the better album?",
    description: "The eternal debate continues! Both artists are releasing new music 🎵",
    options: [
      { name: "Davido", percentage: 52, tokens: 15600, color: "bg-orange-400" },
      { name: "Wizkid", percentage: 48, tokens: 14400, color: "bg-green-400" },
    ],
    category: "Music",
    vibeScore: 95,
    totalBacked: 30000,
    participants: 892,
    timeLeft: "5 days",
    trending: true,
  },
  {
    id: 3,
    title: "Love Island Nigeria: Which couple has the strongest connection?",
    description: "The villa is heating up! Who's your favorite power couple? 💕",
    options: [
      { name: "Kemi & Tolu", percentage: 38, tokens: 8900, color: "bg-red-400" },
      { name: "Funmi & David", percentage: 32, tokens: 7500, color: "bg-kai-600" },
      { name: "Adunni & Kola", percentage: 30, tokens: 7000, color: "bg-purple-400" },
    ],
    category: "Love Island",
    vibeScore: 87,
    totalBacked: 23400,
    participants: 654,
    timeLeft: "1 week",
    trending: false,
  },
]

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated, updateUser } = useAuth()
  const { isOnboarding, startOnboarding } = useOnboarding()
  const router = useRouter()
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [showFeatureDiscovery, setShowFeatureDiscovery] = useState(false)
  const [showSampleMarket, setShowSampleMarket] = useState(false)
  const [sampleMarketData, setSampleMarketData] = useState({
    id: 999,
    title: "Will this new TV show get renewed for a second season?",
    description: "This is a sample prediction market to help you learn how KAI works. Try supporting an opinion!",
    options: [
      { name: "Yes", percentage: 65, tokens: 6500, color: "bg-green-400" },
      { name: "No", percentage: 35, tokens: 3500, color: "bg-red-400" },
    ],
    category: "Sample",
    vibeScore: 87,
    totalBacked: 10000,
    participants: 120,
    timeLeft: "3 days",
    trending: true,
  })

  // Check if user needs onboarding or first-time experience features
  useEffect(() => {
    if (user) {
      // Check if user needs onboarding
      if (!user.hasCompletedOnboarding && !isOnboarding) {
        setShowOnboarding(true)
        startOnboarding()
      } 
      // Check if user needs tour (after onboarding is completed)
      else if (user.hasCompletedOnboarding && !user.preferences?.tourCompleted && !user.preferences?.tourSkipped) {
        setShowTour(true)
      }
      // Check if user needs feature discovery
      else if (user.hasCompletedOnboarding && (!user.preferences?.dismissedTooltips || user.preferences.dismissedTooltips.length < 4)) {
        setShowFeatureDiscovery(true)
      }
      // Check if user needs to see sample market
      else if (user.hasCompletedOnboarding && !user.preferences?.seenSampleMarket) {
        // Show sample market after a short delay
        const timer = setTimeout(() => {
          setShowSampleMarket(true)
          // Mark as seen in user preferences
          updateUser({
            ...user,
            preferences: {
              ...user.preferences,
              seenSampleMarket: true
            }
          })
        }, 3000)
        
        return () => clearTimeout(timer)
      }
    }
  }, [user, isOnboarding, startOnboarding, updateUser])

  // Redirect to home if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push("/")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-50 to-kai-50">
      <div className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8 lg:py-12">
        {/* Desktop Header - Hidden on mobile */}
        <div className="hidden md:flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text">
              KAI
            </div>
            <p className="text-gray-600">Support your opinion ✨</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm token-balance">
              <Sparkles className="w-5 h-5 text-kai-600" />
              <span className="font-semibold text-gray-800">{user?.tokenBalance.toLocaleString()} tokens</span>
            </div>
            <Button 
              onClick={() => router.push("/markets/create")}
              className="bg-gradient-to-r from-kai-600 to-gold-600 hover:from-kai-700 hover:to-gold-700 text-white rounded-full px-6 create-market-button shadow-md"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Market
            </Button>
          </div>
        </div>
        
        <div className="md:grid md:grid-cols-12 md:gap-8">
          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden md:block md:col-span-3 lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-8">
              <div className="space-y-2 navigation-links">
                {[
                  { icon: Home, label: "Home", href: "/dashboard", active: true },
                  { icon: TrendingUp, label: "Trending", href: "/trending" },
                  { icon: PlusCircle, label: "Create", href: "/markets/create" },
                  { icon: Wallet, label: "Wallet", href: "/wallet" },
                  { icon: Users, label: "Social", href: "/social" },
                  { icon: User, label: "Profile", href: "/profile" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={i}
                      variant={item.active ? "default" : "ghost"}
                      className={`w-full justify-start ${item.active ? "bg-kai-100 text-kai-700 hover:bg-kai-200 hover:text-kai-800" : "text-gray-600"}`}
                      onClick={() => router.push(item.href)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="md:col-span-9 lg:col-span-7">
            <div className="bg-white md:rounded-xl md:shadow-sm min-h-screen md:min-h-0">
              {/* Mobile Header - Hidden on desktop */}
              <div className="md:hidden bg-gradient-to-r from-primary-400 to-kai-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">KAI</h1>
                    <p className="text-sm opacity-90">Support your opinion ✨</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-semibold">{user?.tokenBalance.toLocaleString()}</span>
                    </div>
                    <p className="text-xs opacity-80">tokens</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <Button 
                    onClick={() => router.push("/markets/create")}
                    className="bg-white text-kai-500 hover:bg-white/90 text-sm py-1 px-3 rounded-full flex items-center gap-1"
                  >
                    <PlusCircle className="w-3 h-3" />
                    Create Market
                  </Button>
                </div>
              </div>

              {/* Welcome Banner - Only shown on first visit or when explicitly needed */}
              <div className="p-4 md:p-6 bg-gradient-to-r from-kai-50 to-kai-50 mb-4 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Welcome to KAI, {user?.displayName}!</h2>
                <p className="text-sm text-gray-600 mb-3">
                  This is your dashboard where you can discover trending prediction markets, create your own, and support opinions you believe in.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white border-kai-200 text-primary-600"
                    onClick={() => router.push("/markets/create")}
                  >
                    <PlusCircle className="w-3 h-3 mr-1" />
                    Create a Market
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white border-kai-200 text-primary-600"
                    onClick={() => router.push("/wallet")}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Get More Tokens
                  </Button>
                </div>
              </div>
              
              {/* Trending Section */}
              <div className="p-4 trending-section">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-kai-500" />
                  <h2 className="text-lg font-semibold text-gray-800">Trending Now</h2>
                  <Badge className="bg-kai-100 text-kai-700 text-xs">Hot 🔥</Badge>
                </div>

                <div className="space-y-4">
                  {mockPredictions.map((prediction) => (
                    <Card
                      key={prediction.id}
                      className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="bg-kai-100 text-kai-700 text-xs">
                                {prediction.category}
                              </Badge>
                              {prediction.trending && (
                                <Badge className="bg-gradient-to-r from-kai-600 to-purple-400 text-white text-xs">
                                  Trending
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-1">{prediction.title}</h3>
                            <p className="text-sm text-gray-600">{prediction.description}</p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="flex items-center gap-1 text-kai-500">
                              <Heart className="w-4 h-4 fill-current" />
                              <span className="text-sm font-semibold">{prediction.vibeScore}</span>
                            </div>
                            <p className="text-xs text-gray-500">vibe score</p>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="space-y-3 mb-4">
                          {prediction.options.map((option, index) => (
                            <div key={index} className="relative">
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
                              <span>{prediction.participants.toLocaleString()}</span>
                            </div>
                            <span>Ends in {prediction.timeLeft}</span>
                          </div>
                          <span className="font-medium text-primary-600">
                            {prediction.totalBacked.toLocaleString()} tokens allocated
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            className="flex-1 bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full support-opinion-button"
                            onClick={() => setSelectedPrediction(prediction)}
                          >
                            Support Your Opinion ✨
                          </Button>
                          <Button variant="outline" size="icon" className="rounded-full border-kai-200 bg-transparent">
                            <Share2 className="w-4 h-4 text-kai-500" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 social-engagement">
                          <div className="flex items-center gap-4">
                            <button className="flex items-center gap-1 text-gray-500 hover:text-kai-500">
                              <Heart className="w-4 h-4" />
                              <span className="text-sm">234</span>
                            </button>
                            <button className="flex items-center gap-1 text-gray-500 hover:text-kai-500">
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-sm">67</span>
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
              </div>
              
              {/* Mobile Navigation - Hidden on desktop */}
              <div className="md:hidden">
                <Navigation />
              </div>
            </div>
          </div>
          
          {/* Right Sidebar - Only visible on desktop */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-8">
              <h3 className="font-semibold text-gray-800 mb-3">Your Activity</h3>
              {user?.predictions && user.predictions.length > 0 ? (
                <div className="space-y-3">
                  {user.predictions.slice(0, 3).map((prediction) => (
                    <div key={prediction.id} className="border-b pb-2 last:border-0 last:pb-0">
                      <p className="text-sm font-medium text-gray-700">{prediction.marketTitle}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs bg-kai-100 text-kai-700 px-2 py-0.5 rounded-full">
                          {prediction.optionName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {prediction.tokensAllocated} tokens
                        </span>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="ghost" 
                    className="w-full text-primary-600 text-sm"
                    onClick={() => router.push("/profile")}
                  >
                    View All Activity
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">No activity yet</p>
                  <p className="text-xs mt-1">Support an opinion to get started</p>
                </div>
              )}
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
        
        {/* Show sample market with annotations if needed */}
        {showSampleMarket && (
          <BackOpinionModal
            prediction={sampleMarketData}
            userTokens={user?.tokenBalance || 0}
            onClose={() => setShowSampleMarket(false)}
            isAnnotated={true}
          />
        )}
        
        {/* Show onboarding flow if needed */}
        {showOnboarding && isOnboarding && <OnboardingFlow />}
        
        {/* Show tour guide if needed */}
        {showTour && <TourGuide />}
        
        {/* Show feature discovery tooltips if needed */}
        {showFeatureDiscovery && <FeatureDiscovery />}
        
        {/* Always show contextual help */}
        <ContextualHelp context="dashboard" />
      </div>
    </div>
  )
}