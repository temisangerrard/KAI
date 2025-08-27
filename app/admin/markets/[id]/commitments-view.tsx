'use client';

import { useState } from 'react';
import { useMarketCommitmentsRealtime, useMarketAnalyticsRealtime } from '@/hooks/use-market-commitments-realtime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Users, TrendingUp, DollarSign, Activity, Eye } from 'lucide-react';
import { CommitmentWithUser, MarketAnalytics } from '@/lib/types/token';
import { MarketCommitmentDetails } from './components/market-commitment-details';

interface MarketCommitmentsViewProps {
  marketId: string;
}

export function MarketCommitmentsView({ marketId }: MarketCommitmentsViewProps) {
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    status: '',
    position: '' as '' | 'yes' | 'no',
    sortBy: 'committedAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    page: 1,
    pageSize: 50
  });

  const {
    data,
    loading,
    error,
    refetch,
    connectionStatus
  } = useMarketCommitmentsRealtime({
    marketId,
    ...filters,
    realTime: realTimeEnabled,
    refreshInterval: 10000 // 10 seconds
  });

  const {
    analytics: liveAnalytics,
    loading: analyticsLoading
  } = useMarketAnalyticsRealtime(marketId, 5000); // 5 seconds for analytics

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleCommitmentSelect = (commitmentId: string) => {
    setSelectedCommitmentId(commitmentId);
    setActiveTab('details');
  };

  const formatTokens = (tokens: number) => {
    return new Intl.NumberFormat().format(tokens);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'won': return 'success';
      case 'lost': return 'destructive';
      case 'refunded': return 'secondary';
      default: return 'outline';
    }
  };

  const getPositionBadgeVariant = (position: string) => {
    return position === 'yes' ? 'success' : 'destructive';
  };

  if (loading && !data) {
    return <MarketCommitmentsViewSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refetch}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const analytics = liveAnalytics || data?.analytics;

  return (
    <div className="space-y-6">
      {/* Market Header */}
      {data?.market && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{data.market.title}</CardTitle>
                <CardDescription>
                  {data.market.description}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant={data.market.status === 'active' ? 'default' : 'secondary'}>
                  {data.market.status}
                </Badge>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="real-time"
                    checked={realTimeEnabled}
                    onCheckedChange={setRealTimeEnabled}
                  />
                  <Label htmlFor="real-time" className="text-sm">
                    Real-time updates
                  </Label>
                  {realTimeEnabled && (
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-500' : 
                      connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview & List</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedCommitmentId}>
            <Eye className="h-4 w-4 mr-2" />
            Commitment Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Tokens</p>
                  <p className="text-2xl font-bold">{formatTokens(analytics.totalTokens)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Participants</p>
                  <p className="text-2xl font-bold">{analytics.participantCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Yes/No Split</p>
                  <p className="text-lg font-bold">
                    {analytics.yesPercentage}% / {analytics.noPercentage}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Avg Commitment</p>
                  <p className="text-2xl font-bold">{formatTokens(analytics.averageCommitment)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="status-filter">Status:</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Label htmlFor="position-filter">Position:</Label>
              <Select
                value={filters.position}
                onValueChange={(value) => handleFilterChange('position', value as 'yes' | 'no' | '')}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Label htmlFor="sort-filter">Sort by:</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => handleFilterChange('sortBy', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="committedAt">Date</SelectItem>
                  <SelectItem value="tokensCommitted">Tokens</SelectItem>
                  <SelectItem value="odds">Odds</SelectItem>
                  <SelectItem value="potentialWinning">Potential Win</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

        {/* Commitments List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Commitments ({data?.pagination.totalCount || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.commitments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No commitments found for this market.
              </div>
            ) : (
              <div className="space-y-4">
                {data?.commitments.map((commitment) => (
                  <CommitmentCard 
                    key={commitment.id} 
                    commitment={commitment} 
                    onSelect={() => handleCommitmentSelect(commitment.id)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="outline"
                  disabled={!data.pagination.hasPrev}
                  onClick={() => handleFilterChange('page', filters.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={!data.pagination.hasNext}
                  onClick={() => handleFilterChange('page', filters.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <MarketCommitmentDetails
            marketId={marketId}
            commitmentId={selectedCommitmentId}
            onCommitmentSelect={setSelectedCommitmentId}
            realTimeEnabled={realTimeEnabled}
            refreshInterval={10000}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CommitmentCard({ 
  commitment, 
  onSelect 
}: { 
  commitment: CommitmentWithUser;
  onSelect?: () => void;
}) {
  const formatTokens = (tokens: number) => new Intl.NumberFormat().format(tokens);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  return (
    <div className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div>
            <p className="font-medium">{commitment.user.displayName}</p>
            <p className="text-sm text-muted-foreground">{commitment.user.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={commitment.position === 'yes' ? 'default' : 'destructive'}>
            {commitment.position.toUpperCase()}
          </Badge>
          <Badge variant={
            commitment.status === 'active' ? 'default' :
            commitment.status === 'won' ? 'default' :
            commitment.status === 'lost' ? 'destructive' : 'secondary'
          }>
            {commitment.status}
          </Badge>
          {onSelect && (
            <Button variant="outline" size="sm" onClick={onSelect}>
              <Eye className="h-4 w-4 mr-1" />
              Details
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Tokens Committed</p>
          <p className="font-medium">{formatTokens(commitment.tokensCommitted)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Odds</p>
          <p className="font-medium">{commitment.odds.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Potential Win</p>
          <p className="font-medium">{formatTokens(commitment.potentialWinning)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Committed At</p>
          <p className="font-medium">{formatDate(commitment.committedAt)}</p>
        </div>
      </div>
    </div>
  );
}

function MarketCommitmentsViewSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}