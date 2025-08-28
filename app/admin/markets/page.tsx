"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2,
  MoreHorizontal,
  TrendingUp,
  Star
} from 'lucide-react'

import { Market, MarketStatus } from "@/lib/types/database"
import { AdminCommitmentService } from "@/lib/services/admin-commitment-service"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/db/database"

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
  totalTokensCommitted: number
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<MarketWithStats[]>([])
  const [filteredMarkets, setFilteredMarkets] = useState<MarketWithStats[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load markets on component mount
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log('🔍 Loading markets with optimized calculations...')
        
        // Get all markets from Firestore
        const marketsSnapshot = await getDocs(collection(db, 'markets'))
        const rawMarkets = marketsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        console.log(`Found ${rawMarkets.length} markets`)
        
        const marketsWithStats: MarketWithStats[] = []
        
        // Process each market with optimized service
        for (const market of rawMarkets) {
          try {
            // Use AdminCommitmentService to get real commitment data
            const result = await AdminCommitmentService.getMarketCommitments(market.id, {
              pageSize: 1000,
              includeAnalytics: true
            })
            
            if (result.commitments && result.commitments.length > 0) {
              // Calculate real statistics from commitments
              const totalTokensCommitted = result.commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
              const totalParticipants = new Set(result.commitments.map(c => c.userId)).size
              
              marketsWithStats.push({
                id: market.id,
                title: market.title || 'Unnamed Market',
                description: market.description || '',
                category: market.category || 'other',
                status: market.status || 'unknown',
                createdAt: market.createdAt,
                endsAt: market.endsAt,
                featured: market.featured || false,
                trending: market.trending || false,
                totalParticipants,
                totalTokensCommitted
              })
            } else {
              // Market exists but has no commitments yet
              marketsWithStats.push({
                id: market.id,
                title: market.title || 'Unnamed Market',
                description: market.description || '',
                category: market.category || 'other',
                status: market.status || 'unknown',
                createdAt: market.createdAt,
                endsAt: market.endsAt,
                featured: market.featured || false,
                trending: market.trending || false,
                totalParticipants: 0,
                totalTokensCommitted: 0
              })
            }
          } catch (marketError) {
            console.warn(`Error processing market ${market.id}:`, marketError)
            // Use fallback data
            marketsWithStats.push({
              id: market.id,
              title: market.title || 'Unnamed Market',
              description: market.description || '',
              category: market.category || 'other',
              status: market.status || 'unknown',
              createdAt: market.createdAt,
              endsAt: market.endsAt,
              featured: market.featured || false,
              trending: market.trending || false,
              totalParticipants: market.participants || 0,
              totalTokensCommitted: market.totalTokens || 0
            })
          }
        }
        
        setMarkets(marketsWithStats)
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        console.error('💥 Failed to load markets:', err)
      } finally {
        setLoading(false)
      }
    }

    loadMarkets()
  }, [])

  // Filter markets based on search and filters
  useEffect(() => {
    let filtered = markets

    if (searchTerm) {
      filtered = filtered.filter(market =>
        market.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(market => market.status === statusFilter)
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(market => market.category === categoryFilter)
    }

    setFilteredMarkets(filtered)
  }, [markets, searchTerm, statusFilter, categoryFilter])

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      active: 'default',
      closed: 'outline',
      resolved: 'destructive',
      cancelled: 'destructive'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    const d = date.toMillis ? new Date(date.toMillis()) : new Date(date)
    return d.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-pulse">Loading markets...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Markets</h1>
            <p className="text-red-600">Error loading markets: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Markets</h1>
          <p className="text-gray-600">Manage prediction markets</p>
        </div>
        <Link href="/admin/markets/create">
          <Button className="bg-kai-600 hover:bg-kai-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Market
          </Button>
        </Link>
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
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
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
        </div>
      </Card>

      {/* Markets Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Market</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Tokens Staked</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMarkets.map((market) => (
              <TableRow key={market.id}>
                <TableCell>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{market.title}</h3>
                        {market.featured && (
                          <Star className="w-4 h-4 text-yellow-500" />
                        )}
                        {market.trending && (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {market.description.length > 60 
                          ? `${market.description.substring(0, 60)}...` 
                          : market.description
                        }
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {market.category.replace('-', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getStatusBadge(market.status)}
                </TableCell>
                <TableCell>{market.totalParticipants}</TableCell>
                <TableCell>{market.totalTokensCommitted.toLocaleString()}</TableCell>
                <TableCell>{formatDate(market.endsAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/markets/${market.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/admin/markets/${market.id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredMarkets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No markets found matching your criteria.</p>
            <Link href="/admin/markets/create">
              <Button className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Market
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  )
}