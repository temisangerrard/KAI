'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CommitmentWithUser, MarketAnalytics } from '@/lib/types/token';
import { Market } from '@/lib/types/database';

interface MarketCommitmentsData {
  market: Market;
  commitments: CommitmentWithUser[];
  analytics: MarketAnalytics;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    status?: string;
    position?: 'yes' | 'no';
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  metadata: {
    realTimeEnabled: boolean;
    lastUpdated: string;
    cacheStatus: string;
  };
}

interface UseMarketCommitmentsOptions {
  marketId: string;
  page?: number;
  pageSize?: number;
  status?: string;
  position?: 'yes' | 'no';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeAnalytics?: boolean;
  realTime?: boolean;
  refreshInterval?: number; // milliseconds
}

interface UseMarketCommitmentsReturn {
  data: MarketCommitmentsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setFilters: (filters: Partial<UseMarketCommitmentsOptions>) => void;
  isRealTime: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export function useMarketCommitmentsRealtime(
  options: UseMarketCommitmentsOptions
): UseMarketCommitmentsReturn {
  const {
    marketId,
    page = 1,
    pageSize = 50,
    status,
    position,
    sortBy = 'committedAt',
    sortOrder = 'desc',
    includeAnalytics = true,
    realTime = false,
    refreshInterval = 30000 // 30 seconds default
  } = options;

  const [data, setData] = useState<MarketCommitmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Build API URL with query parameters
  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('includeAnalytics', includeAnalytics.toString());
    params.set('realTime', realTime.toString());
    
    if (status) params.set('status', status);
    if (position) params.set('position', position);

    return `/api/admin/markets/${marketId}/commitments?${params.toString()}`;
  }, [marketId, page, pageSize, status, position, sortBy, sortOrder, includeAnalytics, realTime]);

  // Fetch data function
  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setConnectionStatus('connecting');
      
      const response = await fetch(buildApiUrl(), {
        signal,
        headers: {
          'Cache-Control': realTime ? 'no-cache' : 'default'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Market with ID ${marketId} not found`);
        }
        throw new Error(`Failed to fetch commitments: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!isUnmountedRef.current) {
        setData(result);
        setError(null);
        setConnectionStatus('connected');
      }
    } catch (err) {
      if (!isUnmountedRef.current && err.name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Failed to fetch market commitments');
        setConnectionStatus('disconnected');
        console.error('[USE_MARKET_COMMITMENTS] Fetch error:', err);
      }
    }
  }, [buildApiUrl, realTime, marketId]);

  // Refetch function for manual refresh
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      await fetchData(abortControllerRef.current.signal);
    } finally {
      if (!isUnmountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchData]);

  // Set filters function
  const setFilters = useCallback((newFilters: Partial<UseMarketCommitmentsOptions>) => {
    // This will trigger a re-render with new options, causing useEffect to run
    // In a real implementation, you might want to use a reducer or state management
    console.log('[USE_MARKET_COMMITMENTS] Filters updated:', newFilters);
  }, []);

  // Initial fetch and setup polling/real-time updates
  useEffect(() => {
    isUnmountedRef.current = false;
    
    // Initial fetch
    refetch();

    // Setup polling for real-time updates if enabled
    if (realTime && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (!isUnmountedRef.current) {
          fetchData();
        }
      }, refreshInterval);
    }

    // Cleanup function
    return () => {
      isUnmountedRef.current = true;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      setConnectionStatus('disconnected');
    };
  }, [refetch, realTime, refreshInterval, fetchData]);

  // Handle visibility change for efficient polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause polling when tab is not visible
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setConnectionStatus('disconnected');
      } else if (realTime && refreshInterval > 0) {
        // Resume polling when tab becomes visible
        fetchData();
        intervalRef.current = setInterval(() => {
          if (!isUnmountedRef.current) {
            fetchData();
          }
        }, refreshInterval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [realTime, refreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    setFilters,
    isRealTime: realTime,
    connectionStatus
  };
}

// Additional hook for analytics-only real-time updates (more efficient)
export function useMarketAnalyticsRealtime(marketId: string, refreshInterval: number = 10000) {
  const [analytics, setAnalytics] = useState<MarketAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/markets/${marketId}/commitments?includeAnalytics=true&pageSize=1&realTime=true`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const result = await response.json();
      
      if (!isUnmountedRef.current && result.analytics) {
        setAnalytics(result.analytics);
        setError(null);
      }
    } catch (err) {
      if (!isUnmountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
        console.error('[USE_MARKET_ANALYTICS] Fetch error:', err);
      }
    }
  }, [marketId]);

  useEffect(() => {
    isUnmountedRef.current = false;
    setLoading(true);
    
    // Initial fetch
    fetchAnalytics().finally(() => {
      if (!isUnmountedRef.current) {
        setLoading(false);
      }
    });

    // Setup polling
    intervalRef.current = setInterval(fetchAnalytics, refreshInterval);

    return () => {
      isUnmountedRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchAnalytics, refreshInterval]);

  return { analytics, loading, error };
}