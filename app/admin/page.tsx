"use client"

import { useState } from "react"
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity,
  Plus,
  Eye,
  Settings
} from 'lucide-react'
import Link from 'next/link'

// Mock data - replace with real Firestore queries
const mockStats = {
  totalUsers: 1247,
  activeMarkets: 23,
  totalTokensStaked: 125000,
  dailyActiveUsers: 342
}

const mockRecentMarkets = [
  {
    id: '1',
    title: 'Who will win BBNaija All Stars?',
    status: 'active',
    participants: 156,
    tokensStaked: 12500,
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2', 
    title: 'Next Afrobeats Grammy Winner?',
    status: 'active',
    participants: 89,
    tokensStaked: 8900,
    createdAt: new Date('2024-01-14')
  }
]

export default function AdminDashboard() {
  const [stats, setStats] = useState(mockStats)
  const [recentMarkets, setRecentMarkets] = useState(mockRecentMarkets)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your KAI prediction platform</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/markets/create">
            <Button className="bg-kai-600 hover:bg-kai-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Market
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
            </div>
            <Users className="w-8 h-8 text-kai-600" />
          </div>
          <p className="text-sm text-green-600 mt-2">+12% from last month</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Markets</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeMarkets}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-kai-600" />
          </div>
          <p className="text-sm text-green-600 mt-2">+3 new this week</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tokens Staked</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalTokensStaked.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-kai-600" />
          </div>
          <p className="text-sm text-green-600 mt-2">+8% from yesterday</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Daily Active Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats.dailyActiveUsers}</p>
            </div>
            <Activity className="w-8 h-8 text-kai-600" />
          </div>
          <p className="text-sm text-green-600 mt-2">+5% from yesterday</p>
        </Card>
      </div>

      {/* Recent Markets */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Markets</h2>
          <Link href="/admin/markets">
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {recentMarkets.map((market) => (
            <div key={market.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">{market.title}</h3>
                <p className="text-sm text-gray-600">
                  {market.participants} participants • {market.tokensStaked.toLocaleString()} tokens staked
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  market.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {market.status}
                </span>
                <Link href={`/admin/markets/${market.id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/admin/markets/create" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="w-4 h-4 mr-2" />
                Create New Market
              </Button>
            </Link>
            <Link href="/admin/users" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/analytics" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <span className="text-sm text-green-600 font-medium">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Authentication</span>
              <span className="text-sm text-green-600 font-medium">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Storage</span>
              <span className="text-sm text-green-600 font-medium">Healthy</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">New user registered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Market created</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">Market resolved</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}