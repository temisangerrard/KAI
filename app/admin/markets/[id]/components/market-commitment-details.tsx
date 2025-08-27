'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  User, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Activity,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { CommitmentWithUser } from '@/lib/types/token';

interface MarketCommitmentDetailsProps {
  marketId: string;
  commitmentId?: string;
  onCommitmentSelect?: (commitmentId: string) => void;
  realTimeEnabled?: boolean;
  refreshInterval?: number;
}

interface CommitmentDetailData extends CommitmentWithUser {
  timeline: CommitmentTimelineEvent[];
  userStats: {
    totalCommitments: number;
    totalTokensCommitted: number;
    winRate: number;
    averageCommitment: number;
    lastActivity: string;
  };
  marketContext: {
    totalParticipants: number;
    userRank: number;
    percentileRank: number;
    marketProgress: number;
  };
}

interface CommitmentTimelineEvent {
  id: string;
  type: 'committed' | 'market_updated' | 'odds_changed' | 'resolved' | 'refunded';
  timestamp: string;
  description: string;
  metadata?: Record<string, any>;
}

export function MarketCommitmentDetails({
  marketId,
  commitmentId,
  onCommitmentSelect,
  realTimeEnabled = false,
  refreshInterval = 10000
}: MarketCommitmentDetailsProps) {
  const [selectedCommitment, setSelectedCommitment] = useState<CommitmentDetailData | null>(null);
  const [commitmentsList, setCommitmentsList] = useState<CommitmentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch commitment details with enhanced user data
  const fetchCommitmentDetails = useCallback(async (id: string) => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/admin/markets/${marketId}/commitments/${id}`, {
        headers: {
          'Cache-Control': realTimeEnabled ? 'no-cache' : 'default'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch commitment details: ${response.status}`);
      }

      const data = await response.json();
      setSelectedCommitment(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch commitment details');
      console.error('[COMMITMENT_DETAILS] Fetch error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [marketId, realTimeEnabled]);

  // Fetch commitments list for selection
  const fetchCommitmentsList = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/markets/${marketId}/commitments?pageSize=100&sortBy=committedAt&sortOrder=desc`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch commitments list: ${response.status}`);
      }

      const data = await response.json();
      setCommitmentsList(data.commitments || []);
    } catch (err) {
      console.error('[COMMITMENT_DETAILS] List fetch error:', err);
    }
  }, [marketId]);

  // Handle commitment selection
  const handleCommitmentSelect = useCallback((id: string) => {
    setSelectedCommitment(null);
    setLoading(true);
    fetchCommitmentDetails(id).finally(() => setLoading(false));
    onCommitmentSelect?.(id);
  }, [fetchCommitmentDetails, onCommitmentSelect]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    if (commitmentId) {
      fetchCommitmentDetails(commitmentId);
    }
    fetchCommitmentsList();
  }, [commitmentId, fetchCommitmentDetails, fetchCommitmentsList]);

  // Initial load and real-time updates
  useEffect(() => {
    setLoading(true);
    
    // Load commitments list
    fetchCommitmentsList();
    
    // Load specific commitment if provided
    if (commitmentId) {
      fetchCommitmentDetails(commitmentId).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Setup real-time updates
    let interval: NodeJS.Timeout | null = null;
    if (realTimeEnabled && refreshInterval > 0) {
      interval = setInterval(() => {
        if (commitmentId) {
          fetchCommitmentDetails(commitmentId);
        }
        fetchCommitmentsList();
      }, refreshInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [commitmentId, fetchCommitmentDetails, fetchCommitmentsList, realTimeEnabled, refreshInterval]);

  if (loading && !selectedCommitment) {
    return <CommitmentDetailsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Commitment Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Commitment Details</CardTitle>
              <CardDescription>
                Select a commitment to view detailed information and timeline
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <CommitmentSelector
            commitments={commitmentsList}
            selectedId={commitmentId}
            onSelect={handleCommitmentSelect}
          />
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Selected Commitment Details */}
      {selectedCommitment && (
        <>
          {/* User Information Card */}
          <UserInformationCard commitment={selectedCommitment} />
          
          {/* Commitment Overview Card */}
          <CommitmentOverviewCard commitment={selectedCommitment} />
          
          {/* Market Context Card */}
          <MarketContextCard commitment={selectedCommitment} />
          
          {/* Timeline Card */}
          <CommitmentTimelineCard commitment={selectedCommitment} />
        </>
      )}

      {/* No Selection State */}
      {!selectedCommitment && !loading && !error && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Commitment Selected</p>
              <p>Select a commitment from the list above to view detailed information</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CommitmentSelector({
  commitments,
  selectedId,
  onSelect
}: {
  commitments: CommitmentWithUser[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (commitments.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No commitments found for this market
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {commitments.map((commitment) => (
        <div
          key={commitment.id}
          className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
            selectedId === commitment.id ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => onSelect(commitment.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={commitment.user.photoURL} />
                <AvatarFallback>
                  {commitment.user.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{commitment.user.displayName}</p>
                <p className="text-xs text-muted-foreground">{commitment.user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={commitment.position === 'yes' ? 'default' : 'destructive'} className="text-xs">
                {commitment.position.toUpperCase()}
              </Badge>
              <span className="text-sm font-medium">
                {new Intl.NumberFormat().format(commitment.tokensCommitted)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UserInformationCard({ commitment }: { commitment: CommitmentDetailData }) {
  const getDeviceIcon = (source: string) => {
    switch (source) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'web': return <Monitor className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>User Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={commitment.user.photoURL} />
            <AvatarFallback className="text-lg">
              {commitment.user.displayName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{commitment.user.displayName}</h3>
            <p className="text-muted-foreground">{commitment.user.email}</p>
            {commitment.user.isAdmin && (
              <Badge variant="secondary" className="mt-1">Admin</Badge>
            )}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Commitments</p>
            <p className="text-lg font-semibold">{commitment.userStats.totalCommitments}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Tokens</p>
            <p className="text-lg font-semibold">
              {new Intl.NumberFormat().format(commitment.userStats.totalTokensCommitted)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-lg font-semibold">{commitment.userStats.winRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Commitment</p>
            <p className="text-lg font-semibold">
              {new Intl.NumberFormat().format(commitment.userStats.averageCommitment)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {getDeviceIcon(commitment.metadata.commitmentSource)}
            <span className="text-muted-foreground">
              Committed via {commitment.metadata.commitmentSource}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Last activity: {new Date(commitment.userStats.lastActivity).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CommitmentOverviewCard({ commitment }: { commitment: CommitmentDetailData }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'lost': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'refunded': return <RotateCcw className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'won': return 'default';
      case 'lost': return 'destructive';
      case 'refunded': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Commitment Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge variant={commitment.position === 'yes' ? 'default' : 'destructive'} className="text-lg px-3 py-1">
              {commitment.position.toUpperCase()}
            </Badge>
            <div className="flex items-center space-x-2">
              {getStatusIcon(commitment.status)}
              <Badge variant={getStatusVariant(commitment.status)}>
                {commitment.status.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Committed At</p>
            <p className="font-medium">
              {new Date(commitment.committedAt.toDate()).toLocaleString()}
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Tokens Committed</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat().format(commitment.tokensCommitted)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Odds at Commitment</p>
            <p className="text-2xl font-bold">{commitment.odds.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Potential Winning</p>
            <p className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat().format(commitment.potentialWinning)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Balance at Commitment</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat().format(commitment.metadata.userBalanceAtCommitment)}
            </p>
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Market Snapshot at Commitment</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Market Status</p>
              <p className="font-medium">{commitment.metadata.marketStatus}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Participants</p>
              <p className="font-medium">{commitment.metadata.oddsSnapshot.totalParticipants}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Yes Tokens</p>
              <p className="font-medium">
                {new Intl.NumberFormat().format(commitment.metadata.oddsSnapshot.totalYesTokens)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total No Tokens</p>
              <p className="font-medium">
                {new Intl.NumberFormat().format(commitment.metadata.oddsSnapshot.totalNoTokens)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Yes Odds</p>
              <p className="font-medium">{commitment.metadata.oddsSnapshot.yesOdds.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">No Odds</p>
              <p className="font-medium">{commitment.metadata.oddsSnapshot.noOdds.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MarketContextCard({ commitment }: { commitment: CommitmentDetailData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Market Context</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Participants</p>
            <p className="text-lg font-semibold">{commitment.marketContext.totalParticipants}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">User Rank</p>
            <p className="text-lg font-semibold">#{commitment.marketContext.userRank}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Percentile</p>
            <p className="text-lg font-semibold">{commitment.marketContext.percentileRank}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Market Progress</p>
            <p className="text-lg font-semibold">{commitment.marketContext.marketProgress}%</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Market Progress</span>
            <span>{commitment.marketContext.marketProgress}%</span>
          </div>
          <Progress value={commitment.marketContext.marketProgress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

function CommitmentTimelineCard({ commitment }: { commitment: CommitmentDetailData }) {
  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'committed': return <DollarSign className="h-4 w-4 text-blue-500" />;
      case 'market_updated': return <Activity className="h-4 w-4 text-yellow-500" />;
      case 'odds_changed': return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'refunded': return <RotateCcw className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Commitment Timeline</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {commitment.timeline.map((event, index) => (
            <div key={event.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getTimelineIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{event.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <span key={key} className="mr-3">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {index < commitment.timeline.length - 1 && (
                <div className="absolute left-2 mt-6 h-6 w-px bg-border" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CommitmentDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}