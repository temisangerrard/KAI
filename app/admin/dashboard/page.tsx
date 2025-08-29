"use client"

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Coins, 
  TrendingUp, 
  Shield,
  Activity,
  Database,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
  };
  tokens: {
    totalTokensIssued: number;
    totalTokensInCirculation: number;
    totalTokensCommitted: number;
    totalTokensAvailable: number;
  };
  markets: {
    totalMarkets: number;
    activeMarkets: number;
    resolvedMarkets: number;
    marketsCreatedToday: number;
  };
  activity: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    totalCommitments: number;
    commitmentsToday: number;
  };
  financial: {
    totalRevenue: number;
    dailyRevenue: number;
    weeklyRevenue: number;
    averageTransactionValue: number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching dashboard statistics from API...');

      // Use the API route that already has Firebase Auth integration
      const response = await fetch('/api/admin/dashboard/stats');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
      }

      const dashboardStats = await response.json();
      
      console.log('✅ Dashboard statistics fetched from API:', dashboardStats.users?.totalUsers, 'users');
      setStats(dashboardStats);
      
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Loading platform analytics...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
          <Button onClick={fetchDashboardStats} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage users, tokens, and platform analytics
          </p>
        </div>
        <Button onClick={fetchDashboardStats} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{formatNumber(stats.users.totalUsers)}</p>
                <p className="text-xs text-green-600 mt-1">
                  +{stats.users.newUsersToday} today
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Coins className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tokens Issued</p>
                <p className="text-2xl font-bold">{formatNumber(stats.tokens.totalTokensIssued)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatNumber(stats.tokens.totalTokensCommitted)} committed
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Markets</p>
                <p className="text-2xl font-bold">{stats.markets.activeMarkets}</p>
                <p className="text-xs text-gray-500 mt-1">
                  of {stats.markets.totalMarkets} total
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Daily Active</p>
                <p className="text-2xl font-bold">{stats.activity.dailyActiveUsers}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {stats.activity.commitmentsToday} commitments today
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Additional Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Financial Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Revenue</span>
                <span className="font-medium">${stats.financial.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Daily Revenue</span>
                <span className="font-medium text-green-600">
                  ${stats.financial.dailyRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Transaction</span>
                <span className="font-medium">
                  {stats.financial.averageTransactionValue.toFixed(0)} tokens
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">User Engagement</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="font-medium">{stats.users.activeUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Weekly Active</span>
                <span className="font-medium">{stats.activity.weeklyActiveUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Engagement Rate</span>
                <span className="font-medium">
                  {((stats.users.activeUsers / Math.max(stats.users.totalUsers, 1)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Market Activity</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Commitments</span>
                <span className="font-medium">{stats.activity.totalCommitments.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Markets Created Today</span>
                <span className="font-medium text-blue-600">{stats.markets.marketsCreatedToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Resolved Markets</span>
                <span className="font-medium">{stats.markets.resolvedMarkets}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-kai-600" />
            <h3 className="text-lg font-semibold">User Management</h3>
          </div>
          <p className="text-gray-600 mb-4">
            View, search, and manage user accounts. Issue tokens and sync user data.
          </p>
          <Link href="/admin/tokens">
            <Button className="w-full bg-kai-600 hover:bg-kai-700">
              Manage Users
            </Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-kai-600" />
            <h3 className="text-lg font-semibold">Admin Management</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Grant or revoke admin access. View current administrators.
          </p>
          <Link href="/admin/manage-admins">
            <Button className="w-full bg-kai-600 hover:bg-kai-700">
              Manage Admins
            </Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-kai-600" />
            <h3 className="text-lg font-semibold">Market Analytics</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Monitor market performance, user engagement, and platform metrics.
          </p>
          <Link href="/admin/analytics">
            <Button className="w-full bg-kai-600 hover:bg-kai-700">
              View Analytics
            </Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-kai-600" />
            <h3 className="text-lg font-semibold">System Health</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Monitor system performance, database health, and error logs.
          </p>
          <Button className="w-full bg-kai-600 hover:bg-kai-700" disabled>
            Coming Soon
          </Button>
        </Card>
      </div>

      {/* Security Notice */}
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900 mb-2">
              Firebase Admin SDK Active
            </h3>
            <p className="text-green-700 text-sm">
              This admin panel is secured with Firebase Admin SDK. All API requests are 
              authenticated using Firebase Auth tokens with custom admin claims. Your 
              session is automatically validated on each request.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}