"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Share2, TrendingUp, Sparkles, Users, ArrowLeft, UserPlus, Search } from "lucide-react"
import { Navigation } from "../components/navigation"
import { useAuth } from "../auth/auth-context"

// Mock social feed data
const mockSocialFeed = [
  {
    id: 1,
    user: {
      id: "user_1",
      name: "Amara J.",
      username: "@amaraj",
      avatar: "/placeholder.svg?height=40&width=40",
      verified: true
    },
    type: "prediction",
    content: "Just backed Mercy to win BBNaija All Stars! She's been playing such a strategic game 🔥",
    market: {
      title: "Who will win BBNaija All Stars?",
      option: "Mercy",
      tokens: 250
    },
    timestamp: "2 hours ago",
    likes: 24,
    comments: 8,
    shares: 3,
    liked: false
  },
  {
    id: 2,
    user: {
      id: "user_2",
      name: "Zainab K.",
      username: "@zainabk",
      avatar: "/placeholder.svg?height=40&width=40",
      verified: false
    },
    type: "win",
    content: "YES! I called it! Taylor Swift did announce her new album 🎉 My prediction game is strong!",
    market: {
      title: "Will Taylor Swift release a new album this year?",
      option: "Yes",
      tokens: 180,
      winnings: 324
    },
    timestamp: "4 hours ago",
    likes: 67,
    comments: 15,
    shares: 12,
    liked: true
  },
  {
    id: 3,
    user: {
      id: "user_3",
      name: "Chioma O.",
      username: "@chiomao",
      avatar: "/placeholder.svg?height=40&width=40",
      verified: true
    },
    type: "market_created",
    content: "Created a new market about the next big fashion trend! What do you think will dominate next season?",
    market: {
      title: "Which fashion trend will dominate next season?",
      category: "Fashion",
      participants: 45
    },
    timestamp: "6 hours ago",
    likes: 31,
    comments: 22,
    shares: 8,
    liked: false
  },
  {
    id: 4,
    user: {
      id: "user_4",
      name: "Funmi A.",
      username: "@funmia",
      avatar: "/placeholder.svg?height=40&width=40",
      verified: false
    },
    type: "comment",
    content: "The Love Island Nigeria couples this season are giving us DRAMA! Can't wait to see who makes it to the end 💕",
    market: {
      title: "Love Island Nigeria: Which couple will win?",
      option: "Kemi & Tolu"
    },
    timestamp: "8 hours ago",
    likes: 19,
    comments: 6,
    shares: 2,
    liked: true
  }
]

const mockSuggestedUsers = [
  {
    id: "user_5",
    name: "Adunni M.",
    username: "@adunnim",
    avatar: "/placeholder.svg?height=32&width=32",
    bio: "Fashion enthusiast & trend predictor",
    followers: 1240,
    following: false
  },
  {
    id: "user_6",
    name: "Kemi R.",
    username: "@kemir",
    avatar: "/placeholder.svg?height=32&width=32",
    bio: "Reality TV expert & BBNaija superfan",
    followers: 890,
    following: false
  },
  {
    id: "user_7",
    name: "Tolu S.",
    username: "@tolus",
    avatar: "/placeholder.svg?height=32&width=32",
    bio: "Music lover & concert predictor",
    followers: 2100,
    following: true
  }
]

export default function SocialPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [feedData, setFeedData] = useState(mockSocialFeed)
  const [suggestedUsers, setSuggestedUsers] = useState(mockSuggestedUsers)
  const [activeTab, setActiveTab] = useState<"feed" | "following" | "discover">("feed")

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router])

  const handleLike = (postId: number) => {
    setFeedData(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            liked: !post.liked, 
            likes: post.liked ? post.likes - 1 : post.likes + 1 
          }
        : post
    ))
  }

  const handleFollow = (userId: string) => {
    setSuggestedUsers(prev => prev.map(suggestedUser => 
      suggestedUser.id === userId 
        ? { ...suggestedUser, following: !suggestedUser.following }
        : suggestedUser
    ))
  }

  const getPostIcon = (type: string) => {
    switch (type) {
      case "prediction":
        return <TrendingUp className="w-4 h-4 text-kai-500" />
      case "win":
        return <Sparkles className="w-4 h-4 text-green-500" />
      case "market_created":
        return <Users className="w-4 h-4 text-kai-500" />
      case "comment":
        return <MessageCircle className="w-4 h-4 text-blue-500" />
      default:
        return <Heart className="w-4 h-4 text-gray-500" />
    }
  }

  const getPostTypeText = (type: string) => {
    switch (type) {
      case "prediction":
        return "made a prediction"
      case "win":
        return "won a prediction"
      case "market_created":
        return "created a market"
      case "comment":
        return "commented"
      default:
        return "posted"
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-kai-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-kai-500 text-transparent bg-clip-text mb-4">
            KAI
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-500 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-kai-50">
      
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
          {/* Mobile Header */}
          <div className="bg-gradient-to-r from-primary-400 to-kai-600 p-4 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold">Social Feed</h1>
                <p className="text-sm opacity-90">Community predictions</p>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold text-sm">{user?.tokenBalance.toLocaleString()}</span>
              </div>
            </div>

            {/* Mobile Tab Navigation */}
            <div className="flex bg-white/20 rounded-lg p-1">
              {[
                { id: "feed", label: "Feed" },
                { id: "following", label: "Following" },
                { id: "discover", label: "Discover" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-white text-kai-600"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Content */}
          <div className="p-4 space-y-4">
            {activeTab === "feed" && (
              <>
                {feedData.map((post) => (
                  <Card key={post.id} className="border-0 shadow-sm bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={post.user.avatar} />
                          <AvatarFallback className="bg-kai-100 text-kai-700">
                            {post.user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-800">{post.user.name}</span>
                            {post.user.verified && (
                              <div className="w-4 h-4 bg-kai-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {getPostIcon(post.type)}
                            <span>{getPostTypeText(post.type)}</span>
                            <span>•</span>
                            <span>{post.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <p className="text-gray-800 mb-3">{post.content}</p>
                      
                      {/* Market Info */}
                      {post.market && (
                        <div className="bg-gradient-to-r from-kai-50 to-kai-50 rounded-lg p-3 mb-4">
                          <p className="font-medium text-gray-800 text-sm mb-1">{post.market.title}</p>
                          {post.market.option && (
                            <div className="flex items-center gap-2 text-sm">
                              <Badge className="bg-kai-500 text-white">
                                {post.market.option}
                              </Badge>
                              {post.market.tokens && (
                                <span className="text-gray-600">
                                  {post.market.tokens} tokens
                                </span>
                              )}
                              {post.market.winnings && (
                                <span className="text-green-600 font-semibold">
                                  Won {post.market.winnings} tokens!
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Engagement */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-6">
                          <button 
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1 transition-colors ${
                              post.liked ? "text-kai-500" : "text-gray-500 hover:text-kai-500"
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${post.liked ? "fill-current" : ""}`} />
                            <span className="text-sm">{post.likes}</span>
                          </button>
                          <button className="flex items-center gap-1 text-gray-500 hover:text-kai-500">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-sm">{post.comments}</span>
                          </button>
                          <button className="flex items-center gap-1 text-gray-500 hover:text-kai-500">
                            <Share2 className="w-4 h-4" />
                            <span className="text-sm">{post.shares}</span>
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {activeTab === "following" && (
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Follow people to see their activity</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    Start following other users to see their predictions and wins.
                  </p>
                  <Button 
                    onClick={() => setActiveTab("discover")}
                    className="bg-kai-500 hover:bg-primary-600 text-white"
                  >
                    Discover People
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === "discover" && (
              <div className="space-y-3">
                {suggestedUsers.map((suggestedUser) => (
                  <Card key={suggestedUser.id} className="border-0 shadow-sm bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={suggestedUser.avatar} />
                          <AvatarFallback className="bg-kai-100 text-kai-700">
                            {suggestedUser.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-800 text-sm">{suggestedUser.name}</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{suggestedUser.bio}</p>
                          <p className="text-xs text-gray-500">{suggestedUser.followers.toLocaleString()} followers</p>
                        </div>
                        <Button
                          size="sm"
                          variant={suggestedUser.following ? "outline" : "default"}
                          onClick={() => handleFollow(suggestedUser.id)}
                          className={suggestedUser.following 
                            ? "border-kai-200 text-primary-600 hover:bg-kai-50" 
                            : "bg-kai-500 hover:bg-primary-600 text-white"
                          }
                        >
                          {suggestedUser.following ? "Following" : "Follow"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Navigation />
        </div>
      </div>

      {/* Desktop Layout - Completely Different & Better */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-6 py-8">
          
          {/* Desktop Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text">
                  KAI
                </div>
                <div className="w-1 h-6 bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-800">Social Feed</h1>
              </div>
              <button 
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-kai-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Dashboard</span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <Button className="bg-kai-500 hover:bg-kai-600 text-white">
                <Search className="w-4 h-4 mr-2" />
                Search Users
              </Button>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
                <Sparkles className="w-5 h-5 text-kai-600" />
                <span className="font-semibold text-gray-800">{user?.tokenBalance.toLocaleString()} tokens</span>
              </div>
            </div>
          </div>

          {/* Desktop Content Grid */}
          <div className="grid grid-cols-12 gap-8">
            
            {/* Left Sidebar - User Stats & Quick Actions */}
            <div className="col-span-3 space-y-6">
              
              {/* User Profile Card */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-kai-500 to-primary-600 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-12 h-12 border-2 border-white/20">
                      <AvatarImage src={user?.profileImage} />
                      <AvatarFallback className="bg-white/20 text-white">
                        {user?.displayName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user?.displayName}</p>
                      <p className="text-white/80 text-sm">@{user?.displayName?.toLowerCase().replace(' ', '')}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{user?.stats?.predictionsCount || 0}</p>
                      <p className="text-white/80 text-xs">Predictions</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{user?.stats?.winRate || 0}%</p>
                      <p className="text-white/80 text-xs">Win Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trending Topics */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-kai-500" />
                    Trending Now
                  </h3>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {[
                      { tag: "#BBNaija", posts: "474 posts", trend: "+12%" },
                      { tag: "#TaylorSwift", posts: "311 posts", trend: "+8%" },
                      { tag: "#Fashion2024", posts: "203 posts", trend: "+15%" },
                      { tag: "#LoveIsland", posts: "167 posts", trend: "+5%" },
                      { tag: "#Oscars2024", posts: "89 posts", trend: "+22%" }
                    ].map((topic, index) => (
                      <div key={topic.tag} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <div>
                          <p className="font-semibold text-kai-600">{topic.tag}</p>
                          <p className="text-xs text-gray-500">{topic.posts}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          {topic.trend}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Suggested Users */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-kai-500" />
                    Who to Follow
                  </h3>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {suggestedUsers.slice(0, 3).map((suggestedUser) => (
                      <div key={suggestedUser.id} className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={suggestedUser.avatar} />
                          <AvatarFallback className="bg-kai-100 text-kai-700">
                            {suggestedUser.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm">{suggestedUser.name}</p>
                          <p className="text-xs text-gray-500 truncate">{suggestedUser.bio}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleFollow(suggestedUser.id)}
                          className="bg-kai-500 hover:bg-kai-600 text-white text-xs px-3"
                        >
                          Follow
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" className="w-full text-kai-600 text-sm mt-4">
                    View All Suggestions
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Main Feed */}
            <div className="col-span-6">
              
              {/* Tab Navigation */}
              <div className="flex bg-white rounded-xl p-1 mb-6 shadow-sm border">
                {[
                  { id: "feed", label: "For You", icon: <Sparkles className="w-4 h-4" /> },
                  { id: "following", label: "Following", icon: <Users className="w-4 h-4" /> },
                  { id: "discover", label: "Discover", icon: <Search className="w-4 h-4" /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-kai-500 text-white shadow-md"
                        : "text-gray-600 hover:text-kai-500 hover:bg-gray-50"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Feed Content */}
              <div className="space-y-6">
                {activeTab === "feed" && (
                  <>
                    {feedData.map((post) => (
                      <Card key={post.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white overflow-hidden">
                        <CardHeader className="pb-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={post.user.avatar} />
                              <AvatarFallback className="bg-kai-100 text-kai-700">
                                {post.user.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-gray-900">{post.user.name}</span>
                                {post.user.verified && (
                                  <div className="w-5 h-5 bg-kai-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                  </div>
                                )}
                                <span className="text-gray-500">{post.user.username}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500 text-sm">{post.timestamp}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  post.type === 'prediction' ? 'bg-kai-100 text-kai-700' :
                                  post.type === 'win' ? 'bg-green-100 text-green-700' :
                                  post.type === 'market_created' ? 'bg-kai-100 text-kai-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {getPostIcon(post.type)}
                                  {getPostTypeText(post.type)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          <p className="text-gray-800 text-lg leading-relaxed mb-4">{post.content}</p>
                          
                          {/* Enhanced Market Info */}
                          {post.market && (
                            <div className="bg-gradient-to-r from-gray-50 to-kai-50 rounded-xl p-4 mb-4 border border-gray-100">
                              <p className="font-bold text-gray-900 mb-2">{post.market.title}</p>
                              {post.market.option && (
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge className="bg-kai-500 text-white px-3 py-1">
                                    {post.market.option}
                                  </Badge>
                                  {post.market.tokens && (
                                    <span className="text-gray-700 font-medium">
                                      {post.market.tokens} tokens backed
                                    </span>
                                  )}
                                  {post.market.winnings && (
                                    <span className="text-green-600 font-bold flex items-center gap-1">
                                      <Sparkles className="w-4 h-4" />
                                      Won {post.market.winnings} tokens!
                                    </span>
                                  )}
                                </div>
                              )}
                              {post.market.category && (
                                <Badge variant="outline" className="text-xs">
                                  {post.market.category}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Enhanced Engagement */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-8">
                              <button 
                                onClick={() => handleLike(post.id)}
                                className={`flex items-center gap-2 transition-all hover:scale-105 ${
                                  post.liked ? "text-kai-500" : "text-gray-500 hover:text-kai-500"
                                }`}
                              >
                                <Heart className={`w-5 h-5 ${post.liked ? "fill-current" : ""}`} />
                                <span className="font-medium">{post.likes}</span>
                              </button>
                              <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors">
                                <MessageCircle className="w-5 h-5" />
                                <span className="font-medium">{post.comments}</span>
                              </button>
                              <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors">
                                <Share2 className="w-5 h-5" />
                                <span className="font-medium">{post.shares}</span>
                              </button>
                            </div>
                            <Button size="sm" variant="outline" className="border-kai-200 text-kai-600 hover:bg-kai-50">
                              View Market
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}

                {activeTab === "following" && (
                  <Card className="border-0 shadow-lg bg-white">
                    <CardContent className="p-12 text-center">
                      <div className="w-20 h-20 bg-kai-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-kai-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">Follow people to see their activity</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Start following other users to see their predictions, wins, and market activity in your personalized feed.
                      </p>
                      <Button 
                        onClick={() => setActiveTab("discover")}
                        className="bg-kai-500 hover:bg-kai-600 text-white px-8 py-3"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Discover People
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {activeTab === "discover" && (
                  <div className="space-y-4">
                    {suggestedUsers.map((suggestedUser) => (
                      <Card key={suggestedUser.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16">
                              <AvatarImage src={suggestedUser.avatar} />
                              <AvatarFallback className="bg-kai-100 text-kai-700 text-lg">
                                {suggestedUser.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-gray-900 text-lg">{suggestedUser.name}</span>
                                <span className="text-gray-500">{suggestedUser.username}</span>
                              </div>
                              <p className="text-gray-600 mb-2">{suggestedUser.bio}</p>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {suggestedUser.followers.toLocaleString()} followers
                              </p>
                            </div>
                            <Button
                              variant={suggestedUser.following ? "outline" : "default"}
                              onClick={() => handleFollow(suggestedUser.id)}
                              className={suggestedUser.following 
                                ? "border-kai-200 text-kai-600 hover:bg-kai-50 px-6" 
                                : "bg-kai-500 hover:bg-kai-600 text-white px-6"
                              }
                            >
                              {suggestedUser.following ? "Following" : "Follow"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Activity & Stats */}
            <div className="col-span-3 space-y-6">
              
              {/* Community Stats */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <h3 className="font-bold text-gray-900">Community Stats</h3>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-600">Active Predictions</span>
                      </div>
                      <span className="font-bold text-gray-900">2,847</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-kai-100 rounded-lg flex items-center justify-center">
                          <Users className="w-4 h-4 text-kai-600" />
                        </div>
                        <span className="text-sm text-gray-600">Online Users</span>
                      </div>
                      <span className="font-bold text-gray-900">1,234</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-kai-100 rounded-lg flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-kai-600" />
                        </div>
                        <span className="text-sm text-gray-600">Tokens in Play</span>
                      </div>
                      <span className="font-bold text-gray-900">847K</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Winners */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-gold-500" />
                    Recent Winners
                  </h3>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {[
                      { name: "Sarah K.", amount: "1,250", market: "BBNaija Winner" },
                      { name: "Mike O.", amount: "890", market: "Taylor Swift Album" },
                      { name: "Zara M.", amount: "2,100", market: "Fashion Week Trend" }
                    ].map((winner, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-bold text-sm">#{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{winner.name}</p>
                          <p className="text-xs text-gray-600">{winner.market}</p>
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
    </div>


  )
}