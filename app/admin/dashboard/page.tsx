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
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/db/database';

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
      
      console.log('🔍 Fetching dashboard statistics directly from Firestore...');

      // Fetch all required data directly from Firestore (same approach as market data page)
      const [
        usersSnapshot,
        balancesSnapshot,
        marketsSnapshot,
        commitmentsSnapshot,
        transactionsSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'users')).catch(error => {
          console.warn('Failed to fetch users:', error.message);
          return { docs: [] };
        }),
        getDocs(collection(db, 'user_balances')).catch(error => {
          console.warn('Failed to fetch user_balances:', error.message);
          return { docs: [] };
        }),
        getDocs(collection(db, 'markets')).catch(error => {
          console.warn('Failed to fetch markets:', error.message);
          return { docs: [] };
        }),
        getDocs(collection(db, 'prediction_commitments')).catch(error => {
          console.warn('Failed to fetch prediction_commitments:', error.message);
          return { docs: [] };
        }),
        getDocs(collection(db, 'token_transactions')).catch(error => {
          console.warn('Failed to fetch token_transactions:', error.message);
          return { docs: [] };
        })
      ]);

      console.log(`📊 Found ${usersSnapshot.docs.length} users, ${marketsSnapshot.docs.length} markets, ${commitmentsSnapshot.docs.length} commitments`);

      // Process users data - get ALL users regardless of signup method
      const users = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : 
                    data.createdAt ? new Date(data.createdAt) : null
        };
      });

      // Count users by signup method for debugging
      const emailUsers = users.filter(u => u.email && !u.photoURL);
      const oauthUsers = users.filter(u => u.photoURL);
      const usersWithoutEmail = users.filter(u => !u.email);
      
      console.log(`👥 User breakdown: ${emailUsers.length} email, ${oauthUsers.length} OAuth, ${usersWithoutEmail.length} without email`);

      // Calculate time periods
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate new users with safe date handling
      const newUsersToday = users.filter(user => {
        if (!user.createdAt) return false;
        try {
          return user.createdAt >= today;
        } catch (error) {
          return false;
        }
      }).length;

      const newUsersThisWeek = users.filter(user => {
        if (!user.createdAt) return false;
        try {
          return user.createdAt >= lastWeek;
        } catch (error) {
          return false;
        }
      }).length;

      // Process balances data
      const balances = balancesSnapshot.docs.map(doc => doc.data());
      const totalTokensInCirculation = balances.reduce((sum, balance) => {
        const available = Number(balance.availableTokens) || 0;
        const committed = Number(balance.committedTokens) || 0;
        return sum + available + committed;
      }, 0);
      
      const totalTokensCommitted = balances.reduce((sum, balance) => 
        sum + (Number(balance.committedTokens) || 0), 0
      );
      
      const totalTokensAvailable = balances.reduce((sum, balance) => 
        sum + (Number(balance.availableTokens) || 0), 0
      );

      // Process markets data
      const markets = marketsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : 
                    data.createdAt ? new Date(data.createdAt) : null
        };
      });

      const activeMarkets = markets.filter(market => 
        market.status === 'active' || market.status === 'open'
      ).length;

      const resolvedMarkets = markets.filter(market => 
        market.status === 'resolved' || market.status === 'closed'
      ).length;

      const marketsCreatedToday = markets.filter(market => {
        if (!market.createdAt) return false;
        try {
          return market.createdAt >= today;
        } catch (error) {
          return false;
        }
      }).length;

      // Process commitments data
      const commitments = commitmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          committedAt: data.committedAt?.toDate ? data.committedAt.toDate() : 
                      data.committedAt ? new Date(data.committedAt) : null
        };
      });

      const commitmentsToday = commitments.filter(commitment => {
        if (!commitment.committedAt) return false;
        try {
          return commitment.committedAt >= today;
        } catch (error) {
          return false;
        }
      }).length;

      // Get active users from recent commitments and transactions
      const recentCommitmentUsers = new Set(
        commitments
          .filter(c => {
            if (!c.committedAt || !c.userId) return false;
            try {
              return c.committedAt >= lastMonth;
            } catch (error) {
              return false;
            }
          })
          .map(c => c.userId)
      );

      // Process transactions data
      const transactions = transactionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : 
                    data.timestamp ? new Date(data.timestamp) : null
        };
      });

      const recentTransactionUsers = new Set(
        transactions
          .filter(t => {
            if (!t.timestamp || !t.userId) return false;
            try {
              return t.timestamp >= lastMonth;
            } catch (error) {
              return false;
            }
          })
          .map(t => t.userId)
      );

      // Combine active users from commitments and transactions
      const allActiveUsers = new Set([...recentCommitmentUsers, ...recentTransactionUsers]);
      
      const dailyActiveUsers = new Set([
        ...commitments
          .filter(c => {
            if (!c.committedAt || !c.userId) return false;
            try {
              return c.committedAt >= yesterday;
            } catch (error) {
              return false;
            }
          })
          .map(c => c.userId),
        ...transactions
          .filter(t => {
            if (!t.timestamp || !t.userId) return false;
            try {
              return t.timestamp >= yesterday;
            } catch (error) {
              return false;
            }
          })
          .map(t => t.userId)
      ]).size;

      const weeklyActiveUsers = new Set([
        ...commitments
          .filter(c => {
            if (!c.committedAt || !c.userId) return false;
            try {
              return c.committedAt >= lastWeek;
            } catch (error) {
              return false;
            }
          })
          .map(c => c.userId),
        ...transactions
          .filter(t => {
            if (!t.timestamp || !t.userId) return false;
            try {
              return t.timestamp >= lastWeek;
            } catch (error) {
              return false;
            }
          })
          .map(t => t.userId)
      ]).size;

      // Calculate financial metrics
      const purchaseTransactions = transactions.filter(t => 
        t.type === 'purchase' && t.status === 'completed' && t.amount
      );
      
      const totalRevenue = purchaseTransactions.reduce((sum, t) => 
        sum + (Number(t.amount) || 0) * 0.1, 0 // Assuming $0.10 per token
      );

      const dailyRevenue = purchaseTransactions
        .filter(t => {
          if (!t.timestamp) return false;
          try {
            return t.timestamp >= yesterday;
          } catch (error) {
            return false;
          }
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0) * 0.1, 0);

      const weeklyRevenue = purchaseTransactions
        .filter(t => {
          if (!t.timestamp) return false;
          try {
            return t.timestamp >= lastWeek;
          } catch (error) {
            return false;
          }
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0) * 0.1, 0);

      const averageTransactionValue = purchaseTransactions.length > 0 
        ? purchaseTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) / purchaseTransactions.length
        : 0;

      const dashboardStats: DashboardStats = {
        users: {
          totalUsers: users.length,
          activeUsers: allActiveUsers.size,
          newUsersToday,
          newUsersThisWeek
        },
        tokens: {
          totalTokensIssued: totalTokensInCirculation,
          totalTokensInCirculation,
          totalTokensCommitted,
          totalTokensAvailable
        },
        markets: {
          totalMarkets: markets.length,
          activeMarkets,
          resolvedMarkets,
          marketsCreatedToday
        },
        activity: {
          dailyActiveUsers,
          weeklyActiveUsers,
          totalCommitments: commitments.length,
          commitmentsToday
        },
        financial: {
          totalRevenue,
          dailyRevenue,
          weeklyRevenue,
          averageTransactionValue
        }
      };

      console.log('✅ Dashboard statistics compiled successfully');
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