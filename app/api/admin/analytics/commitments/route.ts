import { NextRequest, NextResponse } from 'next/server';
import { CommitmentAnalytics, MarketAnalytics, DailyCommitmentData } from '@/lib/types/token';

// Lazy import to prevent Firebase initialization during build
let AdminCommitmentService: any;

// TODO: Add admin authentication middleware
async function verifyAdminAuth(request: NextRequest) {
  // For now, return true - implement proper admin auth later
  return true;
}

// In-memory cache for analytics data
const analyticsCache = new Map<string, {
  data: any;
  timestamp: number;
  hits: number;
}>();

// Performance metrics tracking
const performanceMetrics = {
  totalQueries: 0,
  totalCacheHits: 0,
  totalErrors: 0,
  queryTimes: [] as number[]
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Prevent execution during build time
    const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL && !process.env.RUNTIME;
    if (isBuildTime) {
      return NextResponse.json({ 
        analytics: null,
        marketAnalytics: null,
        trends: [],
        realTimeStats: {
          activeConnections: 0,
          updatesPerMinute: 0,
          lastUpdate: new Date().toISOString()
        },
        performance: {
          queryTime: Date.now() - startTime,
          cacheHit: false,
          cacheHitRate: 0,
          dataAge: 0
        }
      });
    }

    // Lazy load the service to prevent Firebase initialization during build
    if (!AdminCommitmentService) {
      const { AdminCommitmentService: Service } = await import('@/lib/services/admin-commitment-service');
      AdminCommitmentService = Service;
    }

    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const marketId = searchParams.get('marketId');
    const timeRange = searchParams.get('timeRange') || '7d';
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true';
    const includeTrends = searchParams.get('includeTrends') === 'true';
    const useCache = searchParams.get('useCache') !== 'false';

    // Generate cache key
    const cacheKey = `analytics_${marketId || 'all'}_${timeRange}_${includeAnalytics}_${includeTrends}`;
    
    // Check cache first
    let cacheHit = false;
    if (useCache && analyticsCache.has(cacheKey)) {
      const cached = analyticsCache.get(cacheKey)!;
      const age = Date.now() - cached.timestamp;
      
      // Cache for 1 minute for real-time data, 5 minutes for historical
      const maxAge = includeTrends ? 300000 : 60000;
      
      if (age < maxAge) {
        cached.hits++;
        performanceMetrics.totalCacheHits++;
        cacheHit = true;
        
        const queryTime = Date.now() - startTime;
        performanceMetrics.queryTimes.push(queryTime);
        
        return NextResponse.json({
          ...cached.data,
          performance: {
            queryTime,
            cacheHit: true,
            cacheHitRate: (performanceMetrics.totalCacheHits / performanceMetrics.totalQueries) * 100,
            dataAge: age
          }
        });
      }
    }

    performanceMetrics.totalQueries++;

    console.log(`[ANALYTICS_API] Fetching analytics data:`, {
      marketId, timeRange, includeAnalytics, includeTrends, useCache, cacheHit
    });

    // Fetch fresh data
    const [analytics, marketAnalytics, trends] = await Promise.all([
      includeAnalytics ? AdminCommitmentService.getCommitmentAnalytics() : Promise.resolve(null),
      marketId && includeAnalytics ? getMarketAnalytics(marketId) : Promise.resolve(null),
      includeTrends ? getCommitmentTrends(timeRange, marketId) : Promise.resolve([])
    ]);

    const result = {
      analytics,
      marketAnalytics,
      trends,
      realTimeStats: {
        activeConnections: getActiveConnections(),
        updatesPerMinute: getUpdatesPerMinute(),
        lastUpdate: new Date().toISOString()
      }
    };

    // Cache the result
    analyticsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      hits: 0
    });

    // Clean old cache entries (keep last 100)
    if (analyticsCache.size > 100) {
      const entries = Array.from(analyticsCache.entries())
        .sort(([, a], [, b]) => b.timestamp - a.timestamp);
      
      analyticsCache.clear();
      entries.slice(0, 100).forEach(([key, value]) => {
        analyticsCache.set(key, value);
      });
    }

    const queryTime = Date.now() - startTime;
    performanceMetrics.queryTimes.push(queryTime);

    // Keep only last 1000 query times for average calculation
    if (performanceMetrics.queryTimes.length > 1000) {
      performanceMetrics.queryTimes = performanceMetrics.queryTimes.slice(-1000);
    }

    console.log(`[ANALYTICS_API] Successfully fetched analytics in ${queryTime}ms`);

    return NextResponse.json({
      ...result,
      performance: {
        queryTime,
        cacheHit: false,
        cacheHitRate: performanceMetrics.totalQueries > 0 ? 
          (performanceMetrics.totalCacheHits / performanceMetrics.totalQueries) * 100 : 0,
        dataAge: 0
      }
    });

  } catch (error) {
    performanceMetrics.totalErrors++;
    
    const queryTime = Date.now() - startTime;
    console.error('[ANALYTICS_API] Error fetching analytics:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics data',
        message: 'An error occurred while retrieving analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
        performance: {
          queryTime,
          cacheHit: false,
          errorRate: (performanceMetrics.totalErrors / performanceMetrics.totalQueries) * 100
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Get market-specific analytics
 */
async function getMarketAnalytics(marketId: string): Promise<MarketAnalytics | null> {
  try {
    const result = await AdminCommitmentService.getMarketCommitments(marketId, {
      includeAnalytics: true,
      pageSize: 1 // We only need analytics, not the commitments
    });
    
    return result.analytics || null;
  } catch (error) {
    console.error(`[ANALYTICS_API] Error fetching market analytics for ${marketId}:`, error);
    return null;
  }
}

/**
 * Get commitment trends over time
 */
async function getCommitmentTrends(timeRange: string, marketId?: string): Promise<DailyCommitmentData[]> {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    // Use cached market analytics if available
    const cacheKey = `trends_${marketId || 'all'}_${timeRange}`;
    if (analyticsCache.has(cacheKey)) {
      const cached = analyticsCache.get(cacheKey)!;
      const age = Date.now() - cached.timestamp;
      
      // Cache trends for 5 minutes
      if (age < 300000) {
        return cached.data;
      }
    }

    // Fetch commitments for the time range
    const result = await AdminCommitmentService.getCommitmentsWithUsers({
      marketId,
      pageSize: 10000, // Large enough to get all commitments in range
      sortBy: 'committedAt',
      sortOrder: 'asc'
    });

    // Group by date and calculate daily statistics
    const dailyData = new Map<string, DailyCommitmentData>();
    
    // Initialize all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData.set(dateKey, {
        date: dateKey,
        totalTokens: 0,
        commitmentCount: 0,
        yesTokens: 0,
        noTokens: 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate commitment data
    result.commitments.forEach(commitment => {
      const commitDate = new Date(commitment.committedAt);
      if (commitDate >= startDate && commitDate <= endDate) {
        const dateKey = commitDate.toISOString().split('T')[0];
        
        if (dailyData.has(dateKey)) {
          const dayData = dailyData.get(dateKey)!;
          dayData.totalTokens += commitment.tokensCommitted;
          dayData.commitmentCount += 1;
          
          if (commitment.position === 'yes') {
            dayData.yesTokens += commitment.tokensCommitted;
          } else {
            dayData.noTokens += commitment.tokensCommitted;
          }
        }
      }
    });

    const trends = Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    // Cache the trends
    analyticsCache.set(cacheKey, {
      data: trends,
      timestamp: Date.now(),
      hits: 0
    });

    return trends;

  } catch (error) {
    console.error('[ANALYTICS_API] Error fetching commitment trends:', error);
    return [];
  }
}

/**
 * Get number of active real-time connections (simulated)
 */
function getActiveConnections(): number {
  // In a real implementation, this would track WebSocket/SSE connections
  return Math.floor(Math.random() * 10) + 1;
}

/**
 * Get updates per minute (simulated)
 */
function getUpdatesPerMinute(): number {
  // In a real implementation, this would track actual update frequency
  return Math.floor(Math.random() * 20) + 5;
}

/**
 * Get cache statistics
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'clear-cache') {
      analyticsCache.clear();
      return NextResponse.json({ 
        success: true, 
        message: 'Analytics cache cleared' 
      });
    }

    if (action === 'get-stats') {
      const averageQueryTime = performanceMetrics.queryTimes.length > 0 ?
        performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / performanceMetrics.queryTimes.length : 0;

      return NextResponse.json({
        cache: {
          size: analyticsCache.size,
          entries: Array.from(analyticsCache.entries()).map(([key, value]) => ({
            key,
            timestamp: value.timestamp,
            hits: value.hits,
            age: Date.now() - value.timestamp
          }))
        },
        performance: {
          totalQueries: performanceMetrics.totalQueries,
          totalCacheHits: performanceMetrics.totalCacheHits,
          totalErrors: performanceMetrics.totalErrors,
          averageQueryTime,
          cacheHitRate: performanceMetrics.totalQueries > 0 ? 
            (performanceMetrics.totalCacheHits / performanceMetrics.totalQueries) * 100 : 0,
          errorRate: performanceMetrics.totalQueries > 0 ? 
            (performanceMetrics.totalErrors / performanceMetrics.totalQueries) * 100 : 0
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[ANALYTICS_API] Error handling POST request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}