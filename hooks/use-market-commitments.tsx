"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { MarketCommitmentSummary, CommitmentWithUser, CommitmentAnalytics } from '@/lib/types/token';

interface CommitmentsData {
  commitments: CommitmentWithUser[];
  markets: MarketCommitmentSummary[];
  analytics: CommitmentAnalytics;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UseMarketCommitmentsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  position?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  marketId?: string;
  realTimeEnabled?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseMarketCommitmentsReturn {
  data: CommitmentsData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isRealTimeActive: boolean;
  refresh: () => Promise<void>;
  setRealTimeEnabled: (enabled: boolean) => void;
}

export function useMarketCommitments(options: UseMarketCommitmentsOptions = {}): UseMarketCommitmentsReturn {
  const {
    page = 1,
    pageSize = 20,
    search = '',
    status = 'all',
    position = 'all',
    sortBy = 'committedAt',
    sortOrder = 'desc',
    marketId,
    realTimeEnabled = true,
    refreshInterval = 30000 // 30 seconds default
  } = options;

  const [data, setData] = useState<CommitmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRealTimeActive, setIsRealTimeActive] = useState(realTimeEnabled);
  
  // Use refs to track intervals and prevent memory leaks
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { data: CommitmentsData; timestamp: number }>>(new Map());

  // Generate cache key based on options
  const getCacheKey = useCallback(() => {
    return `commitments_${page}_${pageSize}_${search}_${status}_${position}_${sortBy}_${sortOrder}_${marketId || 'all'}`;
  }, [page, pageSize, search, status, position, sortBy, sortOrder, marketId]);

  // Check if cached data is still valid
  const getCachedData = useCallback((maxAge: number = 60000): CommitmentsData | null => {
    const cacheKey = getCacheKey();
    const cached = cacheRef.current.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < maxAge) {
      return cached.data;
    }
    
    return null;
  }, [getCacheKey]);

  // Cache data
  const setCachedData = useCallback((data: CommitmentsData) => {
    const cacheKey = getCacheKey();
    cacheRef.current.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    // Clean old cache entries (keep only last 10)
    if (cacheRef.current.size > 10) {
      const entries = Array.from(cacheRef.current.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      cacheRef.current.clear();
      entries.slice(0, 10).forEach(([key, value]) => {
        cacheRef.current.set(key, value);
      });
    }
  }, [getCacheKey]);

  const fetchCommitments = useCallback(async (showLoading = true, useCache = true) => {
    try {
      // Check cache first for background updates
      if (!showLoading && useCache) {
        const cached = getCachedData();
        if (cached) {
          setData(cached);
          setLastUpdated(new Date());
          return;
        }
      }

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
      });

      if (search) params.append('search', search);
      if (status !== 'all') params.append('status', status);
      if (position !== 'all') params.append('position', position);
      if (marketId) params.append('marketId', marketId);

      const response = await fetch(`/api/admin/markets/commitments?${params}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch commitments: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Validate response structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format');
      }

      setData(result);
      setCachedData(result);
      setLastUpdated(new Date());

    } catch (err) {
      // Don't show errors for aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('Error fetching commitments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load commitments';
      
      // Only set error state if this is the initial load or a manual refresh
      if (showLoading || !data) {
        setError(errorMessage);
      } else {
        // For background updates, just log the error but keep existing data
        console.warn('Background update failed, keeping existing data:', errorMessage);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  }, [page, pageSize, search, status, position, sortBy, sortOrder, marketId, getCachedData, setCachedData, data]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchCommitments(true, false); // Force fresh data
  }, [fetchCommitments]);

  // Set up real-time updates
  useEffect(() => {
    if (isRealTimeActive && !loading && data) {
      intervalRef.current = setInterval(() => {
        fetchCommitments(false, true); // Background update with cache
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isRealTimeActive, loading, data, refreshInterval, fetchCommitments]);

  // Initial load and dependency changes
  useEffect(() => {
    fetchCommitments(true, true);
  }, [fetchCommitments]);

  // Real-time control
  const setRealTimeEnabled = useCallback((enabled: boolean) => {
    setIsRealTimeActive(enabled);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    isRealTimeActive,
    refresh,
    setRealTimeEnabled
  };
}

// Hook for market-specific commitments with enhanced real-time capabilities
export function useMarketSpecificCommitments(
  marketId: string,
  options: Omit<UseMarketCommitmentsOptions, 'marketId'> = {}
) {
  return useMarketCommitments({
    ...options,
    marketId,
    refreshInterval: options.refreshInterval || 15000 // More frequent updates for specific markets
  });
}

// Hook for commitment analytics only (lighter weight)
export function useCommitmentAnalytics(refreshInterval: number = 60000) {
  const [analytics, setAnalytics] = useState<CommitmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnalytics = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/admin/markets/commitments?analytics=true&pageSize=1');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const result = await response.json();
      setAnalytics(result.analytics);
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();

    intervalRef.current = setInterval(() => {
      fetchAnalytics(false);
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchAnalytics, refreshInterval]);

  return {
    analytics,
    loading,
    error,
    lastUpdated,
    refresh: () => fetchAnalytics(true)
  };
}