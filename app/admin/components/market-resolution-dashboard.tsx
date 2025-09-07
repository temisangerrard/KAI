"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Users,
  Coins,
  Calendar,
  CheckCircle,
  Eye,
  FileText,
  Loader2
} from 'lucide-react'
import { Market, MarketStatus } from '@/lib/types/database'
import { AdminCommitmentService } from '@/lib/services/admin-commitment-service'
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { AdminResolutionActions } from './admin-resolution-actions'

interface MarketWithStats {
  id: string
  title: string
  description: string
  category: string
  status: string
  createdAt: any
  endsAt: any
  featured?: boolean
  trending?: boolean
  totalParticipants: number
  totalTokensStaked: number
  options: Array<{
    id: string
    text: string
    totalTokens: number
    participantCount: number
  }>
}

export function MarketResolutionDashboard() {
  const [pendingMarkets, setPendingMarkets] = useState<MarketWithStats[]>([])
  const [filteredMarkets, setFilteredMarkets] = useState<MarketWithStats[]>([])
  const [selectedMarket, setSelectedMarket] = useState<MarketWithStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'endDate' | 'participants' | 'tokens'>('priority')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get current user for admin authentication
  const { user } = useAuth()

  // Load pending markets using the working pattern from admin markets page
  useEffect(() => {
    loadPendingMarkets()
  }, [])

  // Filter and sort markets
  useEffect(() => {
    let filtered = pendingMarkets

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(market =>
        market.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(market => market.category === categoryFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          // Priority sort: oldest first, then highest stakes
          const aEndTime = a.endsAt?.toMillis() || 0
          const bEndTime = b.endsAt?.toMillis() || 0
          const timeDiff = aEndTime - bEndTime
          
          if (timeDiff !== 0) {
            return timeDiff // Oldest first
          }
          
          // Secondary sort: highest stakes first (for same end date)
          return b.totalTokensStaked - a.totalTokensStaked
        case 'endDate':
          return new Date(a.endsAt.toMillis()).getTime() - new Date(b.endsAt.toMillis()).getTime()
        case 'participants':
          return b.totalParticipants - a.totalParticipants
        case 'tokens':
          return b.totalTokensStaked - a.totalTokensStaked
        default:
          return 0
      }
    })

    setFilteredMarkets(filtered)
  }, [pendingMarkets, searchTerm, categoryFilter, sortBy])

  const loadPendingMarkets = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Loading markets needing resolution with enhanced filtering...')
      
      // Get all markets from Firestore using the working pattern (simple query, filter in memory)
      const marketsSnapshot = await getDocs(collection(db, 'markets'))
      const rawMarkets = marketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      console.log(`Found ${rawMarkets.length} total markets, filtering for resolution...`)
      
      // Debug: Log market statuses and end dates
      const now = Timestamp.now()
      console.log('Current time:', new Date(now.toMillis()))
      
      const marketSummary = rawMarkets.map(m => {
        const endDate = m.endsAt ? new Date(m.endsAt.toMillis()) : null
        const isPastEndDate = m.endsAt ? m.endsAt.toMillis() <= now.toMillis() : false
        
        return {
          id: m.id,
          title: m.title,
          status: m.status,
          endsAt: endDate,
          endsAtRaw: m.endsAt,
          isPastEndDate,
          daysDiff: endDate ? Math.round((now.toMillis() - endDate.getTime()) / (1000 * 60 * 60 * 24)) : null
        }
      })
      
      console.log('Market summary with detailed dates:', marketSummary)
      
      // Log markets with end dates for debugging
      const marketsWithEndDates = marketSummary.filter(m => m.endsAt)
      console.log(`Markets with end dates (${marketsWithEndDates.length}):`, marketsWithEndDates.map(m => ({
        title: m.title,
        endsAt: m.endsAt,
        daysDiff: m.daysDiff,
        isPastEndDate: m.isPastEndDate
      })))
      
      // Show ended markets specifically
      const endedMarkets = marketSummary.filter(m => m.isPastEndDate)
      console.log(`Found ${endedMarkets.length} ended markets:`, endedMarkets)
      
      // Show status breakdown for ended markets
      const statusCounts = {}
      endedMarkets.forEach(market => {
        statusCounts[market.status] = (statusCounts[market.status] || 0) + 1
      })
      console.log('Status breakdown for ended markets:', statusCounts)
      
      const marketsWithStats: MarketWithStats[] = []
      
      // Process each market with enhanced filtering logic
      for (const market of rawMarkets) {
        try {
          // Enhanced filtering logic for markets that need resolution
          const hasEndDate = !!market.endsAt
          const isPastEndDate = market.endsAt ? market.endsAt.toMillis() <= now.toMillis() : false
          const isResolvableStatus = (
            market.status === 'active' || 
            market.status === 'pending_resolution' || 
            market.status === 'closed' ||
            market.status === 'resolving' // Add resolving status
          )
          const isNotAlreadyResolved = (
            market.status !== 'resolved' &&
            market.status !== 'cancelled'
          )
          
          // FIXED: Include markets without end dates that might need resolution
          const shouldIncludeForResolution = (
            isNotAlreadyResolved && (
              // Markets with past end dates (normal case)
              (hasEndDate && isPastEndDate) ||
              // Markets without end dates that are marked for resolution
              (!hasEndDate && (
                market.status === 'pending_resolution' ||
                market.status === 'closed' ||
                market.status === 'resolving'
              )) ||
              // Markets without end dates that have been active for a while (fallback)
              (!hasEndDate && market.status === 'active' && market.createdAt && 
               market.createdAt.toMillis() < (now.toMillis() - (7 * 24 * 60 * 60 * 1000))) // 7 days old
            )
          )
          
          // Debug logging for markets that might need resolution
          if (hasEndDate && isPastEndDate) {
            console.log(`Market ${market.id} (${market.title}):`, {
              status: market.status,
              endDate: new Date(market.endsAt.toMillis()),
              shouldInclude: shouldIncludeForResolution,
              reasons: {
                hasEndDate,
                isPastEndDate,
                isResolvableStatus,
                isNotAlreadyResolved
              }
            })
          }
          
          // Log inclusion/exclusion decisions
          if (shouldIncludeForResolution) {
            console.log(`✅ INCLUDED - Market ${market.id} (${market.title}):`, {
              status: market.status,
              hasEndDate,
              isPastEndDate,
              reason: hasEndDate && isPastEndDate ? 'Past end date' : 
                     !hasEndDate && (market.status === 'pending_resolution' || market.status === 'closed' || market.status === 'resolving') ? 'No end date but marked for resolution' :
                     !hasEndDate && market.status === 'active' ? 'No end date but old active market' : 'Other'
            })
          } else if (isNotAlreadyResolved) {
            console.warn(`⚠️ FILTERED OUT - Market ${market.id} (${market.title}):`, {
              status: market.status,
              hasEndDate,
              isPastEndDate,
              reason: 'Does not meet inclusion criteria'
            })
          }
          
          if (!shouldIncludeForResolution) {
            continue // Skip this market
          }
          
          // Use AdminCommitmentService to get real commitment data
          const result = await AdminCommitmentService.getMarketCommitments(market.id, {
            pageSize: 1000,
            includeAnalytics: true
          })
          
          if (result.commitments && result.commitments.length > 0) {
            // Calculate real statistics from commitments
            const totalTokensStaked = result.commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
            const totalParticipants = new Set(result.commitments.map(c => c.userId)).size
            
            marketsWithStats.push({
              id: market.id,
              title: market.title || 'Unnamed Market',
              description: market.description || '',
              category: market.category || 'other',
              status: market.status || 'pending_resolution',
              createdAt: market.createdAt,
              endsAt: market.endsAt,
              featured: market.featured || false,
              trending: market.trending || false,
              totalParticipants,
              totalTokensStaked,
              options: market.options || []
            })
          } else {
            // Market exists but has no commitments yet - still include for resolution
            // (admin may need to resolve it as "no activity" or similar)
            marketsWithStats.push({
              id: market.id,
              title: market.title || 'Unnamed Market',
              description: market.description || '',
              category: market.category || 'other',
              status: market.status || 'pending_resolution',
              createdAt: market.createdAt,
              endsAt: market.endsAt,
              featured: market.featured || false,
              trending: market.trending || false,
              totalParticipants: 0,
              totalTokensStaked: 0,
              options: market.options || []
            })
          }
        } catch (marketError) {
          console.warn(`Error processing market ${market.id}:`, marketError)
          
          // For markets with errors, still check if they need resolution
          const hasEndDate = !!market.endsAt
          const isPastEndDate = market.endsAt ? market.endsAt.toMillis() <= now.toMillis() : false
          const isResolvableStatus = (
            market.status === 'active' || 
            market.status === 'pending_resolution' || 
            market.status === 'closed' ||
            market.status === 'resolving' // Add resolving status
          )
          const isNotAlreadyResolved = (
            market.status !== 'resolved' &&
            market.status !== 'cancelled'
          )
          
          // FIXED: Include markets without end dates that might need resolution
          const shouldIncludeForResolution = (
            isNotAlreadyResolved && (
              // Markets with past end dates (normal case)
              (hasEndDate && isPastEndDate) ||
              // Markets without end dates that are marked for resolution
              (!hasEndDate && (
                market.status === 'pending_resolution' ||
                market.status === 'closed' ||
                market.status === 'resolving'
              )) ||
              // Markets without end dates that have been active for a while (fallback)
              (!hasEndDate && market.status === 'active' && market.createdAt && 
               market.createdAt.toMillis() < (now.toMillis() - (7 * 24 * 60 * 60 * 1000))) // 7 days old
            )
          )
          
          console.log(`Market ${market.id} (ERROR - using fallback):`, {
            status: market.status,
            endDate: market.endsAt ? new Date(market.endsAt.toMillis()) : null,
            shouldInclude: shouldIncludeForResolution,
            error: marketError
          })
          
          if (shouldIncludeForResolution) {
            // Use fallback data for markets that need resolution but have processing errors
            marketsWithStats.push({
              id: market.id,
              title: market.title || 'Unnamed Market',
              description: market.description || '',
              category: market.category || 'other',
              status: market.status || 'pending_resolution',
              createdAt: market.createdAt,
              endsAt: market.endsAt,
              featured: market.featured || false,
              trending: market.trending || false,
              totalParticipants: market.totalParticipants || 0,
              totalTokensStaked: market.totalTokensStaked || 0,
              options: market.options || []
            })
          }
        }
      }
      
      console.log(`Filtered to ${marketsWithStats.length} markets needing resolution`)
      
      // Apply priority sorting: oldest first, then highest stakes
      marketsWithStats.sort((a, b) => {
        // Primary sort: oldest end date first (most overdue)
        const aEndTime = a.endsAt?.toMillis() || 0
        const bEndTime = b.endsAt?.toMillis() || 0
        const timeDiff = aEndTime - bEndTime
        
        if (timeDiff !== 0) {
          return timeDiff // Oldest first
        }
        
        // Secondary sort: highest stakes first (for same end date)
        return b.totalTokensStaked - a.totalTokensStaked
      })
      
      setPendingMarkets(marketsWithStats)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('💥 Failed to load pending resolution markets:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResolutionComplete = () => {
    setSelectedMarket(null)
    loadPendingMarkets() // Refresh the list
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toMillis ? new Date(timestamp.toMillis()) : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDaysOverdue = (endDate: any) => {
    if (!endDate) return 0
    const now = new Date()
    const end = endDate.toMillis ? new Date(endDate.toMillis()) : new Date(endDate)
    const diffTime = now.getTime() - end.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  if (selectedMarket) {
    return (
      <AdminResolutionActions
        market={selectedMarket}
        onResolutionComplete={handleResolutionComplete}
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-[180px] h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-[180px] h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </Card>

        {/* Markets Skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-4"></div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-28 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Market Resolution</h1>
            <p className="text-gray-600 mt-1">
              Resolve markets that have ended and distribute payouts to winners
            </p>
          </div>
          <Button onClick={loadPendingMarkets} variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card className="p-12">
          <div className="text-center text-red-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium mb-2">Failed to load pending resolution markets</p>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                onClick={loadPendingMarkets}
                className="flex items-center gap-2"
              >
                <Loader2 className="w-4 h-4" />
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Market Resolution</h1>
          <p className="text-gray-600 mt-1">
            Resolve markets that have ended and distribute payouts to winners
          </p>
        </div>
        <Button onClick={loadPendingMarkets} variant="outline">
          <Clock className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Resolution</p>
              <p className="text-2xl font-bold text-red-600">{pendingMarkets.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Participants</p>
              <p className="text-2xl font-bold text-blue-600">
                {pendingMarkets.reduce((sum, m) => sum + m.totalParticipants, 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Coins className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Tokens</p>
              <p className="text-2xl font-bold text-green-600">
                {pendingMarkets.reduce((sum, m) => sum + m.totalTokensStaked, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Days Overdue</p>
              <p className="text-2xl font-bold text-amber-600">
                {pendingMarkets.length > 0 
                  ? Math.round(pendingMarkets.reduce((sum, m) => sum + getDaysOverdue(m.endsAt), 0) / pendingMarkets.length)
                  : 0
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search markets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
              <SelectItem value="politics">Politics</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="culture">Culture</SelectItem>
              <SelectItem value="reality-tv">Reality TV</SelectItem>
              <SelectItem value="fashion">Fashion</SelectItem>
              <SelectItem value="music">Music</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority (Recommended)</SelectItem>
              <SelectItem value="endDate">End Date</SelectItem>
              <SelectItem value="participants">Participants</SelectItem>
              <SelectItem value="tokens">Token Volume</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Markets List */}
      {loading ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="animate-pulse">Loading pending markets...</div>
          </div>
        </Card>
      ) : error ? (
        <Card className="p-12">
          <div className="text-center text-red-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button onClick={loadPendingMarkets} className="mt-4" variant="outline">
              Try Again
            </Button>
          </div>
        </Card>
      ) : filteredMarkets.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-lg font-medium">No markets need resolution</p>
            <p className="text-sm mt-1">All markets are up to date!</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMarkets.map((market) => {
            const daysOverdue = getDaysOverdue(market.endsAt)
            
            return (
              <Card key={market.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{market.title}</h3>
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                      </Badge>
                      <Badge variant="outline">
                        {market.category.replace('-', ' ')}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">{market.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Ended {formatDate(market.endsAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {market.totalParticipants} participants
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {market.totalTokensStaked.toLocaleString()} tokens
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {market.options?.length || 0} options
                        </span>
                      </div>
                    </div>
                    
                    {/* Market Options Preview */}
                    <div className="flex flex-wrap gap-2">
                      {market.options?.map((option) => (
                        <Badge key={option.id} variant="outline" className="text-xs">
                          {option.text}: {(option.totalTokens || 0).toLocaleString()} tokens
                        </Badge>
                      )) || (
                        <Badge variant="outline" className="text-xs">
                          No options available
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => setSelectedMarket(market)}
                      className="bg-sage-600 hover:bg-sage-700"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Resolve Market
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}