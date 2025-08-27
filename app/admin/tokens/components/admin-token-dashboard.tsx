"use client"

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface TokenStats {
  circulation: {
    totalTokens: number;
    availableTokens: number;
    committedTokens: number;
    totalUsers: number;
    activeUsers: number;
  };
  purchases: {
    totalPurchases: number;
    dailyPurchases: number;
    weeklyPurchases: number;
    totalTransactions: number;
  };
  payouts: {
    totalPayouts: number;
    dailyPayouts: number;
    totalPayoutTransactions: number;
  };
  packages: {
    activePackages: number;
    totalRevenue: number;
  };
  trends: {
    dailyTransactionCount: number;
    weeklyTransactionCount: number;
  };
}

interface AdminTokenDashboardProps {
  stats: TokenStats;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export function AdminTokenDashboard({ stats }: AdminTokenDashboardProps) {
  // Calculate token distribution for pie chart
  const tokenDistribution = [
    { name: 'Available', value: stats.circulation.availableTokens, color: '#10b981' },
    { name: 'Committed', value: stats.circulation.committedTokens, color: '#f59e0b' }
  ];

  // Mock trend data (in a real app, this would come from the API)
  const trendData = [
    { name: 'Mon', purchases: 1200, payouts: 800 },
    { name: 'Tue', purchases: 1900, payouts: 1200 },
    { name: 'Wed', purchases: 800, payouts: 600 },
    { name: 'Thu', purchases: 2400, payouts: 1800 },
    { name: 'Fri', purchases: 1800, payouts: 1400 },
    { name: 'Sat', purchases: 2200, payouts: 1600 },
    { name: 'Sun', purchases: 1600, payouts: 1000 }
  ];

  const userEngagementRate = stats.circulation.totalUsers > 0 
    ? (stats.circulation.activeUsers / stats.circulation.totalUsers) * 100 
    : 0;

  const tokenUtilizationRate = stats.circulation.totalTokens > 0
    ? (stats.circulation.committedTokens / stats.circulation.totalTokens) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Token Economy Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Token Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tokenDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {tokenDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Tokens']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {tokenDistribution.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">
                  {item.name}: {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Weekly Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="purchases" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Purchases"
                />
                <Line 
                  type="monotone" 
                  dataKey="payouts" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Payouts"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h4 className="font-medium text-gray-900 mb-3">User Engagement</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Active Users</span>
              <span className="font-medium">{userEngagementRate.toFixed(1)}%</span>
            </div>
            <Progress value={userEngagementRate} className="h-2" />
            <p className="text-xs text-gray-500">
              {stats.circulation.activeUsers.toLocaleString()} of {stats.circulation.totalUsers.toLocaleString()} users active
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-medium text-gray-900 mb-3">Token Utilization</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Committed Tokens</span>
              <span className="font-medium">{tokenUtilizationRate.toFixed(1)}%</span>
            </div>
            <Progress value={tokenUtilizationRate} className="h-2" />
            <p className="text-xs text-gray-500">
              {stats.circulation.committedTokens.toLocaleString()} of {stats.circulation.totalTokens.toLocaleString()} tokens committed
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-medium text-gray-900 mb-3">Transaction Volume</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Daily</span>
              <span className="text-sm font-medium">{stats.trends.dailyTransactionCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Weekly</span>
              <span className="text-sm font-medium">{stats.trends.weeklyTransactionCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Purchases</span>
              <span className="text-sm font-medium">{stats.purchases.totalTransactions.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Financial Overview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Financial Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              ${stats.packages.totalRevenue.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-xs text-gray-500 mt-1">
              From {stats.purchases.totalPurchases.toLocaleString()} token purchases
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {stats.payouts.totalPayouts.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Total Payouts</p>
            <p className="text-xs text-gray-500 mt-1">
              From {stats.payouts.totalPayoutTransactions.toLocaleString()} winning predictions
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {((stats.purchases.totalPurchases - stats.payouts.totalPayouts) / stats.purchases.totalPurchases * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">House Edge</p>
            <p className="text-xs text-gray-500 mt-1">
              Platform retention rate
            </p>
          </div>
        </div>
      </Card>

      {/* Recent Activity Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Today's Highlights</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tokens Purchased</span>
                <span className="text-sm font-medium text-green-600">
                  +{stats.purchases.dailyPurchases.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tokens Paid Out</span>
                <span className="text-sm font-medium text-blue-600">
                  -{stats.payouts.dailyPayouts.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Net Change</span>
                <span className={`text-sm font-medium ${
                  (stats.purchases.dailyPurchases - stats.payouts.dailyPayouts) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {stats.purchases.dailyPurchases - stats.payouts.dailyPayouts >= 0 ? '+' : ''}
                  {(stats.purchases.dailyPurchases - stats.payouts.dailyPayouts).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-3">System Health</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Token Economy</span>
                <span className="text-sm text-green-600 font-medium">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">User Activity</span>
                <span className="text-sm text-green-600 font-medium">Normal</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Transaction Processing</span>
                <span className="text-sm text-green-600 font-medium">Operational</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}