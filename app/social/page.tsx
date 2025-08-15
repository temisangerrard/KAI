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
        return <Users className="w-4 h-4 text-purple-500" />
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-purple-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="md:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">Social Feed</h1>
            <p className="text-gray-600">See what the community is predicting</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm">
            <Sparkles className="w-4 h-4 text-kai-500" />
            <span className="font-semibold text-gray-800">{user?.tokenBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white rounded-xl p-1 mb-6 shadow-sm">
          {[
            { id: "feed", label: "Feed" },
            { id: "following", label: "Following" },
            { id: "discover", label: "Discover" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-kai-500 text-white"
                  : "text-gray-600 hover:text-kai-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="md:col-span-2 space-y-4">
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
                            <span className="text-gray-500 text-sm">{post.user.username}</span>
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
                          {post.market.category && (
                            <Badge variant="outline" className="text-xs mt-2">
                              {post.market.category}
                            </Badge>
                          )}
                          {post.market.participants && (
                            <span className="text-xs text-gray-500 mt-2 block">
                              {post.market.participants} participants
                            </span>
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
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Follow people to see their activity</h3>
                  <p className="text-gray-600 mb-4">
                    Start following other users to see their predictions and wins in your feed.
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
              <div className="space-y-4">
                {suggestedUsers.map((suggestedUser) => (
                  <Card key={suggestedUser.id} className="border-0 shadow-sm bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={suggestedUser.avatar} />
                          <AvatarFallback className="bg-kai-100 text-kai-700">
                            {suggestedUser.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-800">{suggestedUser.name}</span>
                            <span className="text-gray-500 text-sm">{suggestedUser.username}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{suggestedUser.bio}</p>
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

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Suggested Users */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <h3 className="font-semibold text-gray-800">Suggested for you</h3>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {suggestedUsers.slice(0, 3).map((suggestedUser) => (
                    <div key={suggestedUser.id} className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={suggestedUser.avatar} />
                        <AvatarFallback className="bg-kai-100 text-kai-700 text-xs">
                          {suggestedUser.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{suggestedUser.name}</p>
                        <p className="text-xs text-gray-500 truncate">{suggestedUser.bio}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFollow(suggestedUser.id)}
                        className="text-xs border-kai-200 text-primary-600 hover:bg-kai-50"
                      >
                        <UserPlus className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full text-primary-600 text-sm mt-3"
                  onClick={() => setActiveTab("discover")}
                >
                  See all suggestions
                </Button>
              </CardContent>
            </Card>

            {/* Trending Topics */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <h3 className="font-semibold text-gray-800">Trending topics</h3>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {["#BBNaija", "#TaylorSwift", "#Fashion2024", "#LoveIsland", "#Oscars2024"].map((topic, index) => (
                    <div key={topic} className="flex items-center justify-between">
                      <span className="text-sm text-primary-600 font-medium">{topic}</span>
                      <span className="text-xs text-gray-500">{Math.floor(Math.random() * 1000) + 100} posts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Navigation />
    </div>
  )
}