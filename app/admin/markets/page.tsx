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

// Mock data - replace with real Firestore queries
const mockMarkets: Market[] = [
  {
    id: '1',
    title: 'Who will win BBNaija All Stars?',
    description: 'Predict the winner of Big Brother Naija All Stars season',
    category: 'reality-tv',
    status: 'active',
    createdBy: 'admin1',
    createdAt: new Date('2024-01-15') as any,
    endsAt: new Date('2024-03-15') as any,
    imageUrl: 'https://example.com/bbnaija.jpg',
    tags: ['bbnaija', 'reality-tv', 'entertainment'],
    options: [
      { id: '1', text: 'Mercy', totalTokens: 5000, participantCount: 50 },
      { id: '2', text: 'Tacha', totalTokens: 3000, participantCount: 30 }
    ],
    totalParticipants: 80,
    totalTokensStaked: 8000,
    featured: true,
    trending: true
  },
  {
    id: '2',
    title: 'Next Afrobeats Grammy Winner?',
    description: 'Which Afrobeats artist will win the next Grammy?',
    category: 'music',
    status: 'active',
    createdBy: 'admin1',
    createdAt: new Date('2024-01-14') as any,
    endsAt: new Date('2024-02-28') as any,
    tags: ['music', 'grammy', 'afrobeats'],
    options: [
      { id: '1', text: 'Burna Boy', totalTokens: 4000, participantCount: 40 },
      { id: '2', text: 'Wizkid', totalTokens: 3500, participantCount: 35 }
    ],
    totalParticipants: 75,
    totalTokensStaked: 7500,
    featured: false,
    trending: false
  }
]

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>(mockMarkets)
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>(mockMarkets)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

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

  const getStatusBadge = (status: MarketStatus) => {
    const variants = {
      draft: 'secondary',
      active: 'default',
      closed: 'outline',
      resolved: 'destructive',
      cancelled: 'destructive'
    } as const

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString()
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
                <TableCell>{market.totalTokensStaked.toLocaleString()}</TableCell>
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