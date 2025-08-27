"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, LogOut, Settings, User, Edit, Calendar, MapPin, TrendingUp, Award, BarChart3, ArrowLeft, Target, Zap, Building, Crown, Plus } from "lucide-react"
import { Navigation } from "../components/navigation"
import { TopNavigation } from "../components/top-navigation"

import { useAuth } from "../auth/auth-context"
import { useTokenBalance } from "@/hooks/use-token-balance"
import { useUserStatistics } from "@/hooks/use-user-statistics"
import { useUserProfileData } from "@/hooks/use-user-profile-data"
import { useUserActivity } from "@/hooks/use-user-activity"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from 'date-fns'

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const { totalTokens, availableTokens, isLoading: balanceLoading } = useTokenBalance()
  const {
    predictionsCount: oldPredictionsCount,
    marketsCreated: oldMarketsCreated,
    winRate: oldWinRate,
    tokensEarned: oldTokensEarned,
    isLoading: statsLoading
  } = useUserStatistics()

  // Use real profile data instead of fake data
  const {
    predictions,
    marketsCreated,
    predictionsCount,
    marketsCreatedCount,
    winRate,
    tokensEarned,
    isLoading: profileDataLoading
  } = useUserProfileData()

  // Debug logging for profile data
  useEffect(() => {
    console.log('[PROFILE_PAGE] Profile data state:', {
      predictions: predictions,
      predictionsLength: predictions?.length,
      predictionsCount: predictionsCount,
      marketsCreated: marketsCreated?.length,
      marketsCreatedCount: marketsCreatedCount,
      profileDataLoading: profileDataLoading
    })
  }, [predictions, predictionsCount, marketsCreated, marketsCreatedCount, profileDataLoading])

  // Use consolidated user activity (commitments + transactions)
  const {
    activities: recentActivity,
    commitments,
    isLoading: commitmentsLoading,
    error: commitmentsError
  } = useUserActivity()

  // Debug logging
  useEffect(() => {
    console.log('[PROFILE_PAGE] Commitments state:', {
      commitments: commitments,
      length: commitments?.length,
      loading: commitmentsLoading,
      error: commitmentsError
    })
  }, [commitments, commitmentsLoading, commitmentsError])

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("activity")

  // Redirect to home if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push("/")
    return null
  }

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

  // Calculate win rate from real commitments
  const calculateWinRate = (commitments: any[]) => {
    if (!commitments || commitments.length === 0) return 0;
    const resolvedCommitments = commitments.filter(c => c.status === 'won' || c.status === 'lost');
    if (resolvedCommitments.length === 0) return 0;
    const wonCommitments = commitments.filter(c => c.status === 'won');
    return Math.round((wonCommitments.length / resolvedCommitments.length) * 100);
  };

  // Check if user has any resolved commitments to show win rate
  const hasResolvedCommitments = (commitments: any[]) => {
    if (!commitments || commitments.length === 0) return false;
    return commitments.some(c => c.status === 'won' || c.status === 'lost');
  };

  // Calculate tokens earned from real commitments
  const calculateTokensEarned = (commitments: any[]) => {
    if (!commitments || commitments.length === 0) return 0;
    const wonCommitments = commitments.filter(c => c.status === 'won');
    return wonCommitments.reduce((total, commitment) => {
      return total + (commitment.potentialWinning - commitment.tokensCommitted);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50">

      {/* Desktop Top Navigation */}
      <TopNavigation />

      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="max-w-md mx-auto bg-white min-h-screen pb-20">


          {/* Mobile Content */}
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
                <div className="flex flex-col items-center gap-4 mb-6">
                  <Avatar className="h-20 w-20 border-4 border-white shadow">
                    <AvatarImage src={user?.profileImage || "/placeholder-user.jpg"} />
                    <AvatarFallback className="bg-kai-100 text-kai-700 text-2xl">
                      {user?.displayName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">{user?.displayName}</h3>
                    <p className="text-gray-500">{user?.email}</p>

                    {user?.bio && (
                      <p className="text-sm text-gray-600 mt-2">{user.bio}</p>
                    )}

                    <div className="flex flex-col items-center gap-2 mt-2">
                      {user?.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="h-4 w-4" />
                          <span>{user.location}</span>
                        </div>
                      )}
                      {user?.joinDate && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>Joined {formatDate(user.joinDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-kai-500">
                      {!mounted || commitmentsLoading ? '0' : commitments?.length || 0}
                    </p>
                    <p className="text-xs text-gray-500">Commitments</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-kai-500">
                      {!mounted || profileDataLoading ? '0' : marketsCreatedCount || 0}
                    </p>
                    <p className="text-xs text-gray-500">Markets</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-kai-500">
                      {!mounted || commitmentsLoading ? '0' : calculateWinRate(commitments || [])}%
                    </p>
                    <p className="text-xs text-gray-500">Win Rate</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-kai-500">
                      {!mounted || commitmentsLoading ? '0' : Math.max(0, calculateTokensEarned(commitments || [])).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Earned</p>
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

            {/* Dashboard Overview */}
            <Card className="border-0 shadow-lg mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Dashboard Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-kai-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-kai-600">
                      {!mounted || commitmentsLoading ? '0' : commitments?.length || 0}
                    </p>
                    <p className="text-xs text-gray-600">Total Commitments</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {!mounted || commitmentsLoading ? '0' :
                        hasResolvedCommitments(commitments) ? `${calculateWinRate(commitments)}%` : '-'}
                    </p>
                    <p className="text-xs text-gray-600">Win Rate</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-gradient-to-r from-kai-500 to-primary-600 hover:from-kai-600 hover:to-primary-700 text-white"
                    onClick={() => router.push('/markets')}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Explore Markets
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-kai-200 text-kai-600 hover:bg-kai-50"
                    onClick={() => router.push('/markets/create')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Market
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Tabs */}
            <Tabs defaultValue="activity" className="mb-6">
              <TabsList className="grid grid-cols-3 mb-4 w-full">
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

                                    <Badge className="bg-primary-100 text-primary-700 text-xs">Market</Badge>

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
                    <CardTitle className="text-xl">My Commitments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {commitmentsLoading ? (
                      <div className="py-8 text-center text-gray-500">
                        <p>Loading commitments...</p>
                      </div>
                    ) : commitmentsError ? (
                      <div className="py-8 text-center text-red-500">
                        <p>Unable to load commitments</p>
                        <p className="text-sm mt-2">Please try refreshing the page</p>
                      </div>
                    ) : commitments && commitments.length > 0 ? (
                      <div className="space-y-4">
                        {commitments.map((commitment) => (
                          <div key={commitment.id} className="border-b pb-3 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    className={`text-xs ${commitment.status === 'won'
                                      ? 'bg-green-100 text-green-700'
                                      : commitment.status === 'lost'
                                        ? 'bg-red-100 text-red-700'
                                        : commitment.status === 'refunded'
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-blue-100 text-blue-700'
                                      }`}
                                  >
                                    {commitment.status === 'won' ? 'Won' :
                                      commitment.status === 'lost' ? 'Lost' :
                                        commitment.status === 'refunded' ? 'Refunded' : 'Active'}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium">{commitment.marketTitle}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Position: <span className="font-medium capitalize">{commitment.optionName}</span> with {commitment.tokensCommitted} tokens
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{formatDate(commitment.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-kai-500 text-sm">
                                  <Sparkles className="h-3 w-3" />
                                  <span>{commitment.status === 'won' ? '+' : ''}{commitment.potentialWinning}</span>
                                </div>
                                <p className="text-xs text-gray-500">potential win</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        <p>No commitments yet</p>
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
                    {marketsCreated && marketsCreated.length > 0 ? (
                      <div className="space-y-4">
                        {marketsCreated.map((market) => (
                          <div key={market.id} className="border-b pb-3 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    className={`text-xs ${market.status === 'resolved'
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
          </div>

          <Navigation />
        </div>
      </div>

      {/* Desktop Layout - Completely Different & Much Better */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Desktop Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="text-2xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text cursor-pointer"
                  onClick={() => router.push('/')}
                >
                  KAI
                </div>
                <div className="w-1 h-6 bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
              </div>
              <button
                onClick={() => router.push('/markets')}
                className="flex items-center gap-2 text-gray-600 hover:text-kai-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Markets</span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={navigateToEditProfile}
                className="bg-kai-500 hover:bg-kai-600 text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Desktop Profile Hero Section */}
          <div className="grid grid-cols-12 gap-8 mb-8">

            {/* Profile Hero Card */}
            <div className="col-span-8">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-kai-500 via-primary-500 to-gold-500 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
                <CardContent className="p-8 relative">
                  <div className="flex items-start gap-6 mb-6">
                    <Avatar className="h-24 w-24 border-4 border-white/20 shadow-xl">
                      <AvatarImage src={user?.profileImage || "/placeholder-user.jpg"} />
                      <AvatarFallback className="bg-white/20 text-white text-3xl">
                        {user?.displayName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold">{user?.displayName}</h1>
                        <Badge className="bg-white/20 text-white border-white/30">
                          Verified Predictor
                        </Badge>
                      </div>
                      <p className="text-white/90 mb-4">{user?.email}</p>

                      {user?.bio && (
                        <p className="text-white/80 mb-4 max-w-2xl">{user.bio}</p>
                      )}

                      <div className="flex items-center gap-6 text-white/80">
                        {user?.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{user.location}</span>
                          </div>
                        )}
                        {user?.joinDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Joined {formatDate(user.joinDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold mb-1">
                        {!mounted || commitmentsLoading ? '0' : commitments?.length || 0}
                      </div>
                      <div className="text-white/80 text-sm">Commitments Made</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold mb-1">
                        {!mounted || profileDataLoading ? '0' : marketsCreatedCount}
                      </div>
                      <div className="text-white/80 text-sm">Markets Created</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold mb-1">
                        {balanceLoading ? '...' : availableTokens.toLocaleString()}
                      </div>
                      <div className="text-white/80 text-sm">Available Tokens</div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-3">
                    <Button
                      className="bg-white text-kai-600 hover:bg-white/90"
                      onClick={() => router.push('/markets')}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Explore Markets
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                      onClick={() => router.push('/markets/create')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Market
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="col-span-4 space-y-4">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-kai-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-kai-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {!mounted || commitmentsLoading ? '0' : commitments?.length || 0}
                      </p>
                      <p className="text-sm text-gray-600">Total Commitments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {!mounted || commitmentsLoading ? '0' : calculateWinRate(commitments || [])}%
                      </p>
                      <p className="text-sm text-gray-600">Win Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Desktop Stats Overview */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-kai-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-kai-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {!mounted || commitmentsLoading ? '0' : commitments?.length || 0}
                </p>
                <p className="text-gray-600">Commitments Made</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">

                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-primary-600" />

                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {!mounted || profileDataLoading ? '0' : marketsCreatedCount}
                </p>
                <p className="text-gray-600">Markets Created</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {!mounted || profileDataLoading ? '0' :
                    hasResolvedCommitments(predictions) ? `${calculateWinRate(predictions)}%` : '-'}
                </p>
                <p className="text-gray-600">Win Rate</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {!mounted || profileDataLoading ? '0' : Math.max(0, calculateTokensEarned(predictions)).toLocaleString()}
                </p>
                <p className="text-gray-600">Tokens Earned</p>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Content Grid */}
          <div className="grid grid-cols-12 gap-8">

            {/* Main Content - Activity & Predictions */}
            <div className="col-span-8">

              {/* Enhanced Tab Navigation */}
              <div className="flex bg-white rounded-xl p-1 mb-6 shadow-sm border">
                {[
                  { id: "activity", label: "Recent Activity", icon: <TrendingUp className="w-4 h-4" /> },
                  { id: "predictions", label: "My Predictions", icon: <BarChart3 className="w-4 h-4" /> },
                  { id: "markets", label: "Created Markets", icon: <Award className="w-4 h-4" /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                      ? "bg-kai-500 text-white shadow-md"
                      : "text-gray-600 hover:text-kai-500 hover:bg-gray-50"
                      }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "activity" && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-kai-500" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentActivity && recentActivity.length > 0 ? (
                      <div className="space-y-4">
                        {recentActivity.map((activity) => (
                          <div key={activity.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activity.type === 'win' ? 'bg-green-100' :
                              activity.type === 'prediction' ? 'bg-kai-100' :

                                'bg-primary-100'
                              }`}>
                              {activity.type === 'win' && <Award className="w-6 h-6 text-green-600" />}
                              {activity.type === 'prediction' && <TrendingUp className="w-6 h-6 text-kai-600" />}
                              {activity.type === 'market' && <BarChart3 className="w-6 h-6 text-primary-600" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {activity.type === 'win' && (
                                  <Badge className="bg-green-100 text-green-700">Win</Badge>
                                )}
                                {activity.type === 'prediction' && (
                                  <Badge className="bg-kai-100 text-kai-700">Prediction</Badge>
                                )}
                                {activity.type === 'market' && (

                                  <Badge className="bg-primary-100 text-primary-700">Market</Badge>

                                )}
                              </div>
                              <p className="font-medium text-gray-900">{activity.title}</p>
                              <p className="text-sm text-gray-500">{formatDate(activity.date)}</p>
                            </div>
                            {activity.tokens > 0 && (
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-kai-500 font-bold">
                                  <Sparkles className="h-4 w-4" />
                                  <span>{activity.isWin ? '+' : '-'}{activity.tokens}</span>
                                </div>
                                <p className="text-xs text-gray-500">tokens</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-gray-500">
                        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium">No activity yet</p>
                        <p className="text-sm mt-2">Your prediction activity will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === "predictions" && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-kai-500" />
                      My Predictions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {predictions && predictions.length > 0 ? (
                      <div className="space-y-4">
                        {predictions.map((prediction) => (
                          <div key={prediction.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${prediction.status === 'won' ? 'bg-green-100' :
                              prediction.status === 'lost' ? 'bg-red-100' :
                                'bg-blue-100'
                              }`}>
                              {prediction.status === 'won' && <Award className="w-6 h-6 text-green-600" />}
                              {prediction.status === 'lost' && <TrendingUp className="w-6 h-6 text-red-600" />}
                              {prediction.status === 'active' && <BarChart3 className="w-6 h-6 text-blue-600" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  className={`${prediction.status === 'won'
                                    ? 'bg-green-100 text-green-700'
                                    : prediction.status === 'lost'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-blue-100 text-blue-700'
                                    }`}
                                >
                                  {prediction.status === 'won' ? 'Won' : prediction.status === 'lost' ? 'Lost' : 'Active'}
                                </Badge>
                              </div>
                              <p className="font-medium text-gray-900">{prediction.marketTitle}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Backed: <span className="font-medium">{prediction.optionName}</span> with {prediction.tokensAllocated} tokens
                              </p>
                              <p className="text-sm text-gray-500 mt-1">{formatDate(prediction.predictionDate)}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-kai-500 font-bold">
                                <Sparkles className="h-4 w-4" />
                                <span>{prediction.status === 'won' ? '+' : ''}{prediction.potentialWin}</span>
                              </div>
                              <p className="text-xs text-gray-500">potential win</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-gray-500">
                        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium">No predictions yet</p>
                        <p className="text-sm mt-2">Back your opinions to see them here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === "markets" && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Award className="w-5 h-5 text-kai-500" />
                      Markets Created
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {marketsCreated && marketsCreated.length > 0 ? (
                      <div className="space-y-4">
                        {marketsCreated.map((market) => (
                          <div key={market.id} className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${market.status === 'resolved' ? 'bg-green-100' :
                              market.status === 'cancelled' ? 'bg-red-100' :
                                'bg-blue-100'
                              }`}>
                              <Award className={`w-6 h-6 ${market.status === 'resolved' ? 'text-green-600' :
                                market.status === 'cancelled' ? 'text-red-600' :
                                  'text-blue-600'
                                }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  className={`${market.status === 'resolved'
                                    ? 'bg-green-100 text-green-700'
                                    : market.status === 'cancelled'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-blue-100 text-blue-700'
                                    }`}
                                >
                                  {market.status === 'resolved' ? 'Resolved' : market.status === 'cancelled' ? 'Cancelled' : 'Active'}
                                </Badge>
                                <Badge className="bg-gray-100 text-gray-700">
                                  {market.category}
                                </Badge>
                              </div>
                              <p className="font-medium text-gray-900">{market.title}</p>
                              <p className="text-sm text-gray-600 mt-1">{market.description}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <p className="text-sm text-gray-500">
                                  <span className="font-medium">{market.participants}</span> participants
                                </p>
                                <p className="text-sm text-gray-500">
                                  <span className="font-medium">{market.totalTokens.toLocaleString()}</span> tokens
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-gray-500">
                        <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium">No markets created yet</p>
                        <p className="text-sm mt-2">Create a market to see it here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Sidebar - Account Actions & Settings */}
            <div className="col-span-4 space-y-6">

              {/* Account Actions */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Account Actions</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <Button
                      onClick={navigateToEditProfile}
                      className="w-full justify-start bg-kai-50 text-kai-700 hover:bg-kai-100 border-kai-200 h-12"
                      variant="outline"
                    >
                      <div className="w-8 h-8 bg-kai-100 rounded-lg flex items-center justify-center mr-3">
                        <Edit className="w-4 h-4 text-kai-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">Edit Profile</p>
                        <p className="text-xs text-kai-600">Update your information</p>
                      </div>
                    </Button>

                    <Button
                      className="w-full justify-start bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 h-12"
                      variant="outline"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <Settings className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">Account Settings</p>
                        <p className="text-xs text-blue-600">Privacy & preferences</p>
                      </div>
                    </Button>

                    <Button
                      onClick={handleLogout}
                      className="w-full justify-start bg-red-50 text-red-700 hover:bg-red-100 border-red-200 h-12"
                      variant="outline"
                    >
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                        <LogOut className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">Sign Out</p>
                        <p className="text-xs text-red-600">End your session</p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Achievement Badges */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-gold-500" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        name: "First Prediction",
                        icon: <Target className="w-5 h-5" />,
                        earned: true,
                        color: "text-kai-600"
                      },
                      {
                        name: "Lucky Streak",
                        icon: <Zap className="w-5 h-5" />,
                        earned: mounted && winRate > 50,
                        color: "text-green-600"
                      },
                      {
                        name: "Market Creator",
                        icon: <Building className="w-5 h-5" />,
                        earned: marketsCreated > 0,

                        color: "text-primary-600"

                      },
                      {
                        name: "High Roller",
                        icon: <Crown className="w-5 h-5" />,
                        earned: tokensEarned > 1000,
                        color: "text-amber-600"
                      }
                    ].map((achievement, index) => (
                      <div key={index} className={`p-3 rounded-lg text-center transition-all ${achievement.earned
                        ? 'bg-gradient-to-br from-gold-50 to-amber-50 border border-gold-200'
                        : 'bg-gray-50 border border-gray-200 opacity-50'
                        }`}>
                        <div className={`flex items-center justify-center mb-2 ${achievement.earned ? achievement.color : 'text-gray-400'
                          }`}>
                          {achievement.icon}
                        </div>
                        <p className="text-xs font-medium text-gray-700">{achievement.name}</p>
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