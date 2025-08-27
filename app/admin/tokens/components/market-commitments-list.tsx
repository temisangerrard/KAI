"use client"

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  Coins,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  ArrowUpDown,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';
import { MarketCommitmentSummary, CommitmentWithUser, CommitmentAnalytics } from '@/lib/types/token';
import { useMarketCommitments } from '@/hooks/use-market-commitments';
import { DatabaseStatusMonitor } from './database-status-monitor';

interface MarketCommitmentsListProps {
  onMarketSelect?: (marketId: string) => void;
  selectedMarket?: string;
}

export function MarketCommitmentsList({ onMarketSelect, selectedMarket }: MarketCommitmentsListProps) {
  // Filters and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('committedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Use the custom hook for data management
  const {
    data,
    loading,
    error,
    lastUpdated,
    isRealTimeActive,
    refresh,
    setRealTimeEnabled
  } = useMarketCommitments({
    page: currentPage,
    pageSize,
    search: searchTerm,
    status: statusFilter,
    position: positionFilter,
    sortBy,
    sortOrder,
    realTimeEnabled: true,
    refreshInterval: 30000
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const handleFilterChange = useCallback((type: string, value: string) => {
    if (type === 'status') {
      setStatusFilter(value);
    } else if (type === 'position') {
      setPositionFilter(value);
    }
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleRealTimeToggle = useCallback(() => {
    setRealTimeEnabled(!isRealTimeActive);
  }, [isRealTimeActive, setRealTimeEnabled]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default' as const, icon: Clock, color: 'text-blue-600' },
      won: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      lost: { variant: 'secondary' as const, icon: XCircle, color: 'text-red-600' },
      refunded: { variant: 'outline' as const, icon: AlertCircle, color: 'text-yellow-600' }
    };

    const config = variants[status as keyof typeof variants] || variants.active;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  const getPositionBadge = (position: 'yes' | 'no') => {
    return (
      <Badge 
        variant={position === 'yes' ? 'default' : 'secondary'}
        className={position === 'yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
      >
        {position.toUpperCase()}
      </Badge>
    );
  };

  if (loading && !data) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Connection Error</h3>
            <p className="text-gray-600 mt-1">{error}</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">No Data Available</h3>
            <p className="text-gray-600 mt-1">Unable to load commitment data</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Analytics */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Market Commitments</h2>
          <p className="text-gray-600">
            {data.analytics.totalMarketsWithCommitments} markets • {' '}
            {data.analytics.totalTokensCommitted.toLocaleString()} tokens committed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <DatabaseStatusMonitor />
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isRealTimeActive ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-gray-400" />
                  <span>Manual</span>
                </>
              )}
              {lastUpdated && (
                <span>• Updated {lastUpdated.toLocaleTimeString()}</span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRealTimeToggle}
          >
            <Database className="w-4 h-4 mr-2" />
            {isRealTimeActive ? 'Disable' : 'Enable'} Live Updates
          </Button>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Commitments</p>
              <p className="text-2xl font-bold text-blue-600">
                {data.analytics.activeCommitments.toLocaleString()}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resolved Commitments</p>
              <p className="text-2xl font-bold text-green-600">
                {data.analytics.resolvedCommitments.toLocaleString()}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Commitment</p>
              <p className="text-2xl font-bold text-purple-600">
                {data.analytics.averageCommitmentSize.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Markets with Activity</p>
              <p className="text-2xl font-bold text-orange-600">
                {data.analytics.totalMarketsWithCommitments}
              </p>
            </div>
            <Coins className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by user, market, or commitment ID..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={positionFilter} onValueChange={(value) => handleFilterChange('position', value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Tabs defaultValue="markets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="markets">Markets Overview</TabsTrigger>
          <TabsTrigger value="commitments">All Commitments</TabsTrigger>
        </TabsList>

        <TabsContent value="markets" className="space-y-4">
          {data.markets.length === 0 ? (
            <Card className="p-8">
              <div className="text-center space-y-4">
                <Coins className="w-16 h-16 text-gray-300 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">No Markets Found</h3>
                  <p className="text-gray-600 mt-1">
                    {searchTerm || statusFilter !== 'all' || positionFilter !== 'all'
                      ? 'No markets match your current filters'
                      : 'No markets have commitments yet'
                    }
                  </p>
                </div>
                {(searchTerm || statusFilter !== 'all' || positionFilter !== 'all') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setPositionFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {data.markets.map((market) => (
                <Card key={market.marketId} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {market.marketTitle}
                        </h3>
                        <Badge 
                          variant={market.marketStatus === 'active' ? 'default' : 'secondary'}
                          className={
                            market.marketStatus === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {market.marketStatus}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Tokens</p>
                          <p className="text-xl font-bold text-gray-900">
                            {market.totalTokensCommitted.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Participants</p>
                          <p className="text-xl font-bold text-gray-900">
                            {market.participantCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Yes Tokens</p>
                          <p className="text-xl font-bold text-green-600">
                            {market.yesTokens.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">No Tokens</p>
                          <p className="text-xl font-bold text-red-600">
                            {market.noTokens.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMarketSelect?.(market.marketId)}
                      className="ml-4"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="commitments" className="space-y-4">
          {data.commitments.length === 0 ? (
            <Card className="p-8">
              <div className="text-center space-y-4">
                <Users className="w-16 h-16 text-gray-300 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">No Commitments Found</h3>
                  <p className="text-gray-600 mt-1">
                    {searchTerm || statusFilter !== 'all' || positionFilter !== 'all'
                      ? 'No commitments match your current filters'
                      : 'No commitments have been made yet'
                    }
                  </p>
                </div>
                {(searchTerm || statusFilter !== 'all' || positionFilter !== 'all') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setPositionFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <>
              {/* Commitments Table Header */}
              <Card className="p-4">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
                  <div className="col-span-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('user')}
                      className="h-auto p-0 font-medium text-gray-600 hover:text-gray-900"
                    >
                      User
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                  <div className="col-span-2">Market</div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('tokensCommitted')}
                      className="h-auto p-0 font-medium text-gray-600 hover:text-gray-900"
                    >
                      Tokens
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                  <div className="col-span-1">Position</div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('odds')}
                      className="h-auto p-0 font-medium text-gray-600 hover:text-gray-900"
                    >
                      Odds
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('committedAt')}
                      className="h-auto p-0 font-medium text-gray-600 hover:text-gray-900"
                    >
                      Date
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Commitments List */}
              <div className="space-y-2">
                {data.commitments.map((commitment) => (
                  <Card key={commitment.id} className="p-4 hover:shadow-sm transition-shadow">
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {commitment.user.displayName || 'Unknown User'}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {commitment.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-900 truncate" title={commitment.marketTitle}>
                          {commitment.marketTitle || 'Unknown Market'}
                        </p>
                      </div>
                      <div className="col-span-1">
                        <p className="font-medium text-gray-900">
                          {commitment.tokensCommitted.toLocaleString()}
                        </p>
                      </div>
                      <div className="col-span-1">
                        {getPositionBadge(commitment.position)}
                      </div>
                      <div className="col-span-1">
                        <p className="text-gray-900">
                          {commitment.odds.toFixed(2)}x
                        </p>
                      </div>
                      <div className="col-span-2">
                        {getStatusBadge(commitment.status)}
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">
                          {new Date(commitment.committedAt).toLocaleDateString()}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {new Date(commitment.committedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Showing {((data.pagination.page - 1) * data.pagination.pageSize) + 1} to{' '}
                      {Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalCount)} of{' '}
                      {data.pagination.totalCount} commitments
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={!data.pagination.hasPrev}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={!data.pagination.hasNext}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}