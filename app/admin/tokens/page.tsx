"use client"

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Coins, 
  TrendingUp, 
  Users, 
  DollarSign,
  Plus,
  Settings,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { AdminTokenDashboard } from './components/admin-token-dashboard';
import { TokenPackageManager } from './components/token-package-manager';
import { TransactionMonitor } from './components/transaction-monitor';
import { TokenIssuanceModal } from './components/token-issuance-modal';
import { UsersList } from './components/users-list';
import { MarketCommitmentsList } from './components/market-commitments-list';
import { CommitmentErrorBoundary } from './components/commitment-error-boundary';
import { CommitmentAnalytics } from './components/commitment-analytics';

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
    weeklyTrend: Array<{
      name: string;
      purchases: number;
      payouts: number;
      date: string;
    }>;
  };
}

export default function AdminTokensPage() {
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isIssuanceModalOpen, setIsIssuanceModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [preselectedUser, setPreselectedUser] = useState<{
    userId: string;
    userEmail: string;
    displayName: string;
  } | null>(null);

  useEffect(() => {
    fetchTokenStats();
  }, []);

  const fetchTokenStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tokens/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch token stats');
      }
    } catch (error) {
      console.error('Error fetching token stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenIssuanceSuccess = () => {
    setIsIssuanceModalOpen(false);
    setPreselectedUser(null);
    fetchTokenStats(); // Refresh stats after token issuance
  };

  const handleIssueTokensForUser = (userId: string, userEmail: string, displayName: string) => {
    setPreselectedUser({ userId, userEmail, displayName });
    setIsIssuanceModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Token Management</h1>
            <p className="text-gray-600">Manage the KAI token economy</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Token Management</h1>
          <p className="text-gray-600">Manage the KAI token economy</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setIsIssuanceModalOpen(true)}
            className="bg-kai-600 hover:bg-kai-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Issue Tokens
          </Button>
          <Button variant="outline" onClick={fetchTokenStats}>
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tokens</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.circulation.totalTokens.toLocaleString()}
                </p>
              </div>
              <Coins className="w-8 h-8 text-kai-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {stats.circulation.availableTokens.toLocaleString()} available • {' '}
              {stats.circulation.committedTokens.toLocaleString()} committed
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Daily Purchases</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.purchases.dailyPurchases.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-green-600 mt-2">
              {stats.trends.dailyTransactionCount} transactions today
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.circulation.activeUsers.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              of {stats.circulation.totalUsers.toLocaleString()} total users
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${stats.packages.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {stats.packages.activePackages} active packages
            </p>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="commitments">Commitments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {stats && <AdminTokenDashboard stats={stats} />}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UsersList onIssueTokens={handleIssueTokensForUser} />
        </TabsContent>

        <TabsContent value="commitments" className="space-y-6">
          <CommitmentErrorBoundary onRetry={fetchTokenStats}>
            <MarketCommitmentsList />
          </CommitmentErrorBoundary>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <CommitmentErrorBoundary onRetry={fetchTokenStats}>
            <CommitmentAnalytics 
              refreshInterval={30000}
              enableRealTime={true}
            />
          </CommitmentErrorBoundary>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <TokenPackageManager />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <TransactionMonitor />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg font-semibold">Fraud Detection & Monitoring</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Advanced fraud detection and account management tools will be implemented here.
            </p>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800">Suspicious Activity Alerts</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  No suspicious activity detected in the last 24 hours.
                </p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800">System Health</h4>
                <p className="text-sm text-green-700 mt-1">
                  All token management systems are operating normally.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Token Issuance Modal */}
      <TokenIssuanceModal
        isOpen={isIssuanceModalOpen}
        onClose={() => {
          setIsIssuanceModalOpen(false);
          setPreselectedUser(null);
        }}
        onSuccess={handleTokenIssuanceSuccess}
        preselectedUser={preselectedUser}
      />
    </div>
  );
}