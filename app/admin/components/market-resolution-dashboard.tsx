"use client"

import { useState, useEffect } from 'react'
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
  FileText
} from 'lucide-react'
import { Market } from '@/lib/types/database'
import { ResolutionService } from '@/lib/services/resolution-service'
import { AdminResolutionActions } from './admin-resolution-actions'

export function MarketResolutionDashboard() {
  const [pendingMarkets, setPendingMarkets] = useState<Market[]>([])
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([])
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'endDate' | 'participants' | 'tokens'>('endDate')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load pending markets
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
        case 'endDate':
          return a.endsAt.toMillis() - b.endsAt.toMillis()
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
      const markets = await ResolutionService.getPendingResolutionMarkets()
      setPendingMarkets(markets)
    } catch (err) {
      console.error('Error loading pending markets:', err)
      setError('Failed to load pending markets')
    } finally {
      setLoading(false)
    }
  }

  const handleResolutionComplete = () => {
    setSelectedMarket(null)
    loadPendingMarkets() // Refresh the list
  }

  const formatDate = (timestamp: any) => {
    const date = new Date(timestamp.toMillis())
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDaysOverdue = (endDate: any) => {
    const now = new Date()
    const end = new Date(endDate.toMillis())
    const diffTime = now.getTime() - end.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (selectedMarket) {
    return (
      <AdminResolutionActions
        market={selectedMarket}
        onResolutionComplete={handleResolutionComplete}
      />
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
                          {market.options.length} options
                        </span>
                      </div>
                    </div>
                    
                    {/* Market Options Preview */}
                    <div className="flex flex-wrap gap-2">
                      {market.options.map((option) => (
                        <Badge key={option.id} variant="outline" className="text-xs">
                          {option.text}: {option.totalTokens.toLocaleString()} tokens
                        </Badge>
                      ))}
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