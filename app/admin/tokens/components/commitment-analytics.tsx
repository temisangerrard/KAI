"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Coins,
  Activity,
  RefreshCw,
  Clock,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import { CommitmentAnalytics, MarketAnalytics, DailyCommitmentData } from '@/lib/types/token';

interface CommitmentAnalyticsProps {
  marketId?: string; // If provided, show market-specific analytics
  refreshInterval?: number; // Auto-refresh interval in milliseconds
  enableRealTime?: boolean; // Enable real-time updates
}

interface AnalyticsData {
  overview: CommitmentAnalytics;
  marketAnalytics?: MarketAnalytics;
  trends: DailyCommitmentData[];
  performance: {
    queryTime: number;
    cacheHitRate: number;
    lastUpdated: Date;
    dataFreshness: 'fresh' | 'cached' | 'stale';
  };
  realTimeStats: {
    activeConnections: number;
    updatesPerMinute: number;
    lastUpdate: Date | null;
  };
}

const CHART_COLORS = {
  primary: '#10b981',
  secondary: '#f59e0b',
  accent: '#3b82f6',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f97316'
};

export function CommitmentAnalytics({ 
  marketId, 
  refreshInterval = 30000,
  enableRealTime = true 
}: CommitmentAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeActive, setIsRealTimeActive] = useState(enableRealTime);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('tokens');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');

  // Performance monitoring state
  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageQueryTime: 0,
    totalQueries: 0,
    errorRate: 0,
    cacheEfficiency: 0
  });

  // Fetch analytics data with performance monitoring
  const fetchAnalytics = useCallback(async (useCache = true) => {
    const startTime = Date.now();
    
    try {
      setError(null);
      
      const params = new URLSearchParams({
        includeAnalytics: 'true',
        includeTrends: 'true',
        timeRange: selectedTimeRange,
        useCache: useCache.toString()
      });

      if (marketId) {
        params.append('marketId', marketId);
      }

      const response = await fetch(`/api/admin/analytics/commitments?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const result = await response.json();
      const queryTime = Date.now() - startTime;

      // Update performance metrics
      setPerformanceMetrics(prev => ({
        averageQueryTime: (prev.averageQueryTime * prev.totalQueries + queryTime) / (prev.totalQueries + 1),
        totalQueries: prev.totalQueries + 1,
        errorRate: prev.errorRate, // Will be updated on error
        cacheEfficiency: result.performance?.cacheHit ? 
          (prev.cacheEfficiency * prev.totalQueries + 100) / (prev.totalQueries + 1) :
          (prev.cacheEfficiency * prev.totalQueries) / (prev.totalQueries + 1)
      }));

      setData({
        overview: result.analytics,
        marketAnalytics: result.marketAnalytics,
        trends: result.trends || [],
        performance: {
          queryTime,
          cacheHitRate: result.performance?.cacheHitRate || 0,
          lastUpdated: new Date(),
          dataFreshness: result.performance?.cacheHit ? 'cached' : 'fresh'
        },
        realTimeStats: {
          activeConnections: result.realTimeStats?.activeConnections || 0,
          updatesPerMinute: result.realTimeStats?.updatesPerMinute || 0,
          lastUpdate: result.realTimeStats?.lastUpdate ? new Date(result.realTimeStats.lastUpdate) : null
        }
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Update error rate
      setPerformanceMetrics(prev => ({
        ...prev,
        errorRate: (prev.errorRate * prev.totalQueries + 100) / (prev.totalQueries + 1)
      }));
      
      console.error('[COMMITMENT_ANALYTICS] Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [marketId, selectedTimeRange]);

  // Real-time updates using Server-Sent Events or WebSocket simulation
  useEffect(() => {
    if (!isRealTimeActive) return;

    const eventSource = new EventSource(`/api/admin/analytics/commitments/stream?marketId=${marketId || 'all'}`);
    
    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        
        setData(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            overview: update.analytics || prev.overview,
            marketAnalytics: update.marketAnalytics || prev.marketAnalytics,
            realTimeStats: {
              ...prev.realTimeStats,
              lastUpdate: new Date(),
              updatesPerMinute: prev.realTimeStats.updatesPerMinute + 1
            }
          };
        });
      } catch (err) {
        console.error('[REAL_TIME_ANALYTICS] Error parsing update:', err);
      }
    };

    eventSource.onerror = () => {
      console.warn('[REAL_TIME_ANALYTICS] Connection error, will retry...');
    };

    return () => {
      eventSource.close();
    };
  }, [isRealTimeActive, marketId]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || isRealTimeActive) return;

    const interval = setInterval(() => {
      fetchAnalytics(true); // Use cache for auto-refresh
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchAnalytics, refreshInterval, isRealTimeActive]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalytics(false); // Force fresh data on initial load
  }, [fetchAnalytics]);

  // Memoized chart data transformations
  const chartData = useMemo(() => {
    if (!data?.trends) return [];

    return data.trends.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tokens: day.totalTokens,
      commitments: day.commitmentCount,
      yesTokens: day.yesTokens,
      noTokens: day.noTokens,
      yesPercentage: day.totalTokens > 0 ? (day.yesTokens / day.totalTokens) * 100 : 0,
      noPercentage: day.totalTokens > 0 ? (day.noTokens / day.totalTokens) * 100 : 0
    }));
  }, [data?.trends]);

  const positionDistribution = useMemo(() => {
    if (!data?.marketAnalytics) return [];

    const { yesPercentage, noPercentage } = data.marketAnalytics;
    return [
      { name: 'Yes', value: yesPercentage, color: CHART_COLORS.success },
      { name: 'No', value: noPercentage, color: CHART_COLORS.danger }
    ];
  }, [data?.marketAnalytics]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchAnalytics(false); // Force fresh data
  }, [fetchAnalytics]);

  const handleRealTimeToggle = useCallback(() => {
    setIsRealTimeActive(!isRealTimeActive);
  }, [isRealTimeActive]);

  const getPerformanceStatus = () => {
    if (performanceMetrics.averageQueryTime > 2000) return { status: 'slow', color: 'text-red-600' };
    if (performanceMetrics.averageQueryTime > 1000) return { status: 'moderate', color: 'text-yellow-600' };
    return { status: 'fast', color: 'text-green-600' };
  };

  const getDataFreshnessIndicator = () => {
    if (!data?.performance) return null;

    const { dataFreshness, lastUpdated } = data.performance;
    const age = Date.now() - lastUpdated.getTime();
    
    if (dataFreshness === 'fresh' || age < 60000) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Fresh</Badge>;
    } else if (age < 300000) { // 5 minutes
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Cached</Badge>;
    } else {
      return <Badge variant="outline" className="bg-red-100 text-red-800">Stale</Badge>;
    }
  };

  if (loading && !data) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Analytics Error</h3>
            <p className="text-gray-600 mt-1">{error}</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">No Analytics Data</h3>
            <p className="text-gray-600 mt-1">Unable to load analytics data</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Load Analytics
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {marketId ? 'Market Analytics' : 'Commitment Analytics'}
          </h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-600">
              {data.overview.totalMarketsWithCommitments} markets • {' '}
              {data.overview.totalTokensCommitted.toLocaleString()} tokens committed
            </p>
            {getDataFreshnessIndicator()}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Performance Indicator */}
          <div className="flex items-center gap-2 text-sm">
            <Database className={`w-4 h-4 ${getPerformanceStatus().color}`} />
            <span className={getPerformanceStatus().color}>
              {Math.round(performanceMetrics.averageQueryTime)}ms avg
            </span>
          </div>

          {/* Real-time Status */}
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
            {data.performance.lastUpdated && (
              <span>• {data.performance.lastUpdated.toLocaleTimeString()}</span>
            )}
          </div>

          {/* Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRealTimeToggle}
          >
            <Zap className="w-4 h-4 mr-2" />
            {isRealTimeActive ? 'Disable' : 'Enable'} Live
          </Button>
          
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tokens Committed</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.overview.totalTokensCommitted.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Avg: {data.overview.averageCommitmentSize.toLocaleString()} per commitment
              </p>
            </div>
            <Coins className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Commitments</p>
              <p className="text-2xl font-bold text-green-600">
                {data.overview.activeCommitments.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.overview.resolvedCommitments.toLocaleString()} resolved
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Markets with Activity</p>
              <p className="text-2xl font-bold text-purple-600">
                {data.overview.totalMarketsWithCommitments}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Active prediction markets
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Performance</p>
              <p className={`text-2xl font-bold ${getPerformanceStatus().color}`}>
                {Math.round(performanceMetrics.averageQueryTime)}ms
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(performanceMetrics.cacheEfficiency)}% cache hit rate
              </p>
            </div>
            <Database className={`w-8 h-8 ${getPerformanceStatus().color}`} />
          </div>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            {data.marketAnalytics && <TabsTrigger value="market">Market Details</TabsTrigger>}
          </TabsList>

          <div className="flex items-center gap-3">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={chartType} onValueChange={(value: 'line' | 'bar' | 'area') => setChartType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">
                  <div className="flex items-center gap-2">
                    <LineChartIcon className="w-4 h-4" />
                    Line
                  </div>
                </SelectItem>
                <SelectItem value="bar">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Bar
                  </div>
                </SelectItem>
                <SelectItem value="area">
                  <div className="flex items-center gap-2">
                    <AreaChart className="w-4 h-4" />
                    Area
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="trends" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Commitment Trends</h3>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tokens">Total Tokens</SelectItem>
                  <SelectItem value="commitments">Commitment Count</SelectItem>
                  <SelectItem value="positions">Position Split</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' && (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    {selectedMetric === 'tokens' && (
                      <Line 
                        type="monotone" 
                        dataKey="tokens" 
                        stroke={CHART_COLORS.primary} 
                        strokeWidth={2}
                        name="Total Tokens"
                      />
                    )}
                    {selectedMetric === 'commitments' && (
                      <Line 
                        type="monotone" 
                        dataKey="commitments" 
                        stroke={CHART_COLORS.accent} 
                        strokeWidth={2}
                        name="Commitments"
                      />
                    )}
                    {selectedMetric === 'positions' && (
                      <>
                        <Line 
                          type="monotone" 
                          dataKey="yesTokens" 
                          stroke={CHART_COLORS.success} 
                          strokeWidth={2}
                          name="Yes Tokens"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="noTokens" 
                          stroke={CHART_COLORS.danger} 
                          strokeWidth={2}
                          name="No Tokens"
                        />
                      </>
                    )}
                  </LineChart>
                )}
                
                {chartType === 'bar' && (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    {selectedMetric === 'tokens' && (
                      <Bar dataKey="tokens" fill={CHART_COLORS.primary} name="Total Tokens" />
                    )}
                    {selectedMetric === 'commitments' && (
                      <Bar dataKey="commitments" fill={CHART_COLORS.accent} name="Commitments" />
                    )}
                    {selectedMetric === 'positions' && (
                      <>
                        <Bar dataKey="yesTokens" fill={CHART_COLORS.success} name="Yes Tokens" />
                        <Bar dataKey="noTokens" fill={CHART_COLORS.danger} name="No Tokens" />
                      </>
                    )}
                  </BarChart>
                )}
                
                {chartType === 'area' && (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    {selectedMetric === 'tokens' && (
                      <Area 
                        type="monotone" 
                        dataKey="tokens" 
                        stroke={CHART_COLORS.primary} 
                        fill={CHART_COLORS.primary}
                        fillOpacity={0.3}
                        name="Total Tokens"
                      />
                    )}
                    {selectedMetric === 'commitments' && (
                      <Area 
                        type="monotone" 
                        dataKey="commitments" 
                        stroke={CHART_COLORS.accent} 
                        fill={CHART_COLORS.accent}
                        fillOpacity={0.3}
                        name="Commitments"
                      />
                    )}
                    {selectedMetric === 'positions' && (
                      <>
                        <Area 
                          type="monotone" 
                          dataKey="yesTokens" 
                          stackId="1"
                          stroke={CHART_COLORS.success} 
                          fill={CHART_COLORS.success}
                          fillOpacity={0.6}
                          name="Yes Tokens"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="noTokens" 
                          stackId="1"
                          stroke={CHART_COLORS.danger} 
                          fill={CHART_COLORS.danger}
                          fillOpacity={0.6}
                          name="No Tokens"
                        />
                      </>
                    )}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          {data.marketAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Position Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={positionDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {positionDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentage']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  {positionDistribution.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-600">
                        {item.name}: {item.value.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Market Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Participants</span>
                    <span className="font-medium">{data.marketAnalytics.participantCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Commitment</span>
                    <span className="font-medium">{data.marketAnalytics.averageCommitment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Largest Commitment</span>
                    <span className="font-medium">{data.marketAnalytics.largestCommitment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Volume</span>
                    <span className="font-medium">{data.marketAnalytics.totalTokens.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <h4 className="font-medium text-gray-900 mb-3">Query Performance</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Response Time</span>
                  <span className={`text-sm font-medium ${getPerformanceStatus().color}`}>
                    {Math.round(performanceMetrics.averageQueryTime)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Queries</span>
                  <span className="text-sm font-medium">{performanceMetrics.totalQueries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Error Rate</span>
                  <span className="text-sm font-medium text-red-600">
                    {performanceMetrics.errorRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-medium text-gray-900 mb-3">Cache Efficiency</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cache Hit Rate</span>
                  <span className="text-sm font-medium text-green-600">
                    {Math.round(performanceMetrics.cacheEfficiency)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Data Freshness</span>
                  {getDataFreshnessIndicator()}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Cache Update</span>
                  <span className="text-sm font-medium">
                    {data.performance.lastUpdated.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-medium text-gray-900 mb-3">Real-time Status</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Connection Status</span>
                  <div className="flex items-center gap-1">
                    {isRealTimeActive ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-sm text-green-600">Active</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600">Disabled</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Updates/Min</span>
                  <span className="text-sm font-medium">
                    {data.realTimeStats.updatesPerMinute}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Update</span>
                  <span className="text-sm font-medium">
                    {data.realTimeStats.lastUpdate?.toLocaleTimeString() || 'Never'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {data.marketAnalytics && (
          <TabsContent value="market" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Market-Specific Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {data.marketAnalytics.totalTokens.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total Tokens</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {data.marketAnalytics.participantCount}
                  </p>
                  <p className="text-sm text-gray-600">Participants</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {data.marketAnalytics.averageCommitment.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Avg Commitment</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {data.marketAnalytics.largestCommitment.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Largest Commitment</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}