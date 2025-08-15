"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, LogOut, Settings, User, Edit, Calendar, MapPin, TrendingUp, Award, BarChart3 } from "lucide-react"
import { Navigation } from "../components/navigation"
import { useAuth } from "../auth/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from 'date-fns'

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("activity")
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  // Redirect to home if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push("/")
    return null
  }

  // Generate activity data from user predictions and markets
  useEffect(() => {
    if (user) {
      const activities = [];
      
      // Add prediction activities
      if (user.predictions && user.predictions.length > 0) {
        user.predictions.forEach(prediction => {
          activities.push({
            id: `pred_${prediction.id}`,
            type: prediction.status === 'won' ? 'win' : 'prediction',
            title: prediction.status === 'won' 
              ? `Won prediction on "${prediction.marketTitle}"` 
              : `Backed opinion on "${prediction.marketTitle}"`,
            date: prediction.predictionDate,
            tokens: prediction.status === 'won' ? prediction.potentialWin : prediction.tokensAllocated,
            isWin: prediction.status === 'won'
          });
        });
      }
      
      // Add market creation activities
      if (user.marketsCreated && user.marketsCreated.length > 0) {
        user.marketsCreated.forEach(market => {
          activities.push({
            id: `market_${market.id}`,
            type: 'market',
            title: `Created market "${market.title}"`,
            date: market.startDate,
            tokens: 0
          });
        });
      }
      
      // Sort by date (most recent first)
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setRecentActivity(activities);
    }
  }, [user]);

  const handleLogout = () => {
    logout()
    router.push("/")
  }
  
  const navigateToEditProfile = () => {
    router.push("/profile/edit")
  }

  // Format date for display
  const formatDate = (date: Date) => {
    if (!date) return '';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (e) {
      return 'recently';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-purple-50">
      <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-400 to-kai-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Profile</h1>
              <p className="text-sm opacity-90">Manage your account</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold">{user?.tokenBalance.toLocaleString()}</span>
              </div>
              <p className="text-xs opacity-80">tokens</p>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-4">
          <Card className="border-0 shadow-lg mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">My Profile</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-500"
                  onClick={navigateToEditProfile}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-20 w-20 border-4 border-white shadow">
                  <AvatarImage src={user?.profileImage || "/placeholder-user.jpg"} />
                  <AvatarFallback className="bg-kai-100 text-kai-700">
                    {user?.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{user?.displayName}</h3>
                  <p className="text-gray-500">{user?.email}</p>
                  
                  {user?.bio && (
                    <p className="text-sm text-gray-600 mt-1">{user.bio}</p>
                  )}
                  
                  <div className="flex items-center gap-3 mt-1">
                    {user?.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span>{user.location}</span>
                      </div>
                    )}
                    {user?.joinDate && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>Joined {formatDate(user.joinDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-kai-500">{user?.stats?.predictionsCount || 0}</p>
                  <p className="text-xs text-gray-500">Predictions Made</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-kai-500">{user?.stats?.marketsCreated || 0}</p>
                  <p className="text-xs text-gray-500">Markets Created</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-kai-500">{user?.stats?.winRate || 0}%</p>
                  <p className="text-xs text-gray-500">Win Rate</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-kai-500">{(user?.stats?.tokensEarned || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Tokens Earned</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={navigateToEditProfile}
                >
                  <User className="h-4 w-4" />
                  Edit Profile
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  Account Settings
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="activity" className="mb-6">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="markets">Markets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="activity">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActivity && recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="border-b pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {activity.type === 'win' && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">Win</Badge>
                                )}
                                {activity.type === 'prediction' && (
                                  <Badge className="bg-kai-100 text-kai-700 text-xs">Prediction</Badge>
                                )}
                                {activity.type === 'market' && (
                                  <Badge className="bg-purple-100 text-purple-700 text-xs">Market</Badge>
                                )}
                              </div>
                              <p className="text-sm">{activity.title}</p>
                              <p className="text-xs text-gray-500 mt-1">{formatDate(activity.date)}</p>
                            </div>
                            {activity.tokens > 0 && (
                              <div className="flex items-center gap-1 text-kai-500 text-sm">
                                <Sparkles className="h-3 w-3" />
                                <span>{activity.isWin ? '+' : '-'}{activity.tokens}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      <p>No activity yet</p>
                      <p className="text-sm mt-2">Your prediction activity will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="predictions">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">My Predictions</CardTitle>
                </CardHeader>
                <CardContent>
                  {user?.predictions && user.predictions.length > 0 ? (
                    <div className="space-y-4">
                      {user.predictions.map((prediction) => (
                        <div key={prediction.id} className="border-b pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                  className={`text-xs ${
                                    prediction.status === 'won' 
                                      ? 'bg-green-100 text-green-700' 
                                      : prediction.status === 'lost'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {prediction.status === 'won' ? 'Won' : prediction.status === 'lost' ? 'Lost' : 'Active'}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium">{prediction.marketTitle}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                Backed: <span className="font-medium">{prediction.optionName}</span> with {prediction.tokensAllocated} tokens
                              </p>
                              <p className="text-xs text-gray-500 mt-1">{formatDate(prediction.predictionDate)}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-kai-500 text-sm">
                                <Sparkles className="h-3 w-3" />
                                <span>{prediction.status === 'won' ? '+' : ''}{prediction.potentialWin}</span>
                              </div>
                              <p className="text-xs text-gray-500">potential win</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      <p>No predictions yet</p>
                      <p className="text-sm mt-2">Back your opinions to see them here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="markets">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Markets Created</CardTitle>
                </CardHeader>
                <CardContent>
                  {user?.marketsCreated && user.marketsCreated.length > 0 ? (
                    <div className="space-y-4">
                      {user.marketsCreated.map((market) => (
                        <div key={market.id} className="border-b pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                  className={`text-xs ${
                                    market.status === 'resolved' 
                                      ? 'bg-green-100 text-green-700' 
                                      : market.status === 'cancelled'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {market.status === 'resolved' ? 'Resolved' : market.status === 'cancelled' ? 'Cancelled' : 'Active'}
                                </Badge>
                                <Badge className="bg-gray-100 text-gray-700 text-xs">
                                  {market.category}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium">{market.title}</p>
                              <p className="text-xs text-gray-600 mt-1">{market.description}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium">{market.participants}</span> participants
                                </p>
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium">{market.totalTokens.toLocaleString()}</span> tokens
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      <p>No markets created yet</p>
                      <p className="text-sm mt-2">Create a market to see it here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <Card className="border-0 shadow-lg mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-kai-100 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="text-sm text-gray-600">Total Predictions</span>
                  </div>
                  <span className="font-medium">{user?.stats?.predictionsCount || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-sm text-gray-600">Markets Created</span>
                  </div>
                  <span className="font-medium">{user?.stats?.marketsCreated || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Award className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-600">Win Rate</span>
                  </div>
                  <span className="font-medium">{user?.stats?.winRate || 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-sm text-gray-600">Total Tokens Earned</span>
                  </div>
                  <span className="font-medium">{(user?.stats?.tokensEarned || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-600">Current Balance</span>
                  </div>
                  <span className="font-medium">{user?.tokenBalance.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Navigation />
      </div>
    </div>
  )
}