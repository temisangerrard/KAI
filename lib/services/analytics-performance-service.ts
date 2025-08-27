/**
 * Analytics Performance Monitoring Service
 * Tracks database query performance, cache efficiency, and system health
 */

interface QueryMetrics {
  queryType: string;
  duration: number;
  timestamp: Date;
  cacheHit: boolean;
  resultSize: number;
  error?: string;
}

interface PerformanceStats {
  averageQueryTime: number;
  cacheHitRate: number;
  errorRate: number;
  queriesPerMinute: number;
  slowQueries: QueryMetrics[];
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

class AnalyticsPerformanceService {
  private static instance: AnalyticsPerformanceService;
  private metrics: QueryMetrics[] = [];
  private readonly maxMetrics = 10000; // Keep last 10k metrics
  private readonly slowQueryThreshold = 1000; // 1 second

  private constructor() {
    // Clean up old metrics every 5 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000);
  }

  static getInstance(): AnalyticsPerformanceService {
    if (!AnalyticsPerformanceService.instance) {
      AnalyticsPerformanceService.instance = new AnalyticsPerformanceService();
    }
    return AnalyticsPerformanceService.instance;
  }

  /**
   * Record a database query performance metric
   */
  recordQuery(
    queryType: string,
    duration: number,
    cacheHit: boolean = false,
    resultSize: number = 0,
    error?: string
  ): void {
    const metric: QueryMetrics = {
      queryType,
      duration,
      timestamp: new Date(),
      cacheHit,
      resultSize,
      error
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`[PERFORMANCE] Slow query detected: ${queryType} took ${duration}ms`);
    }

    // Log errors
    if (error) {
      console.error(`[PERFORMANCE] Query error: ${queryType} - ${error}`);
    }
  }

  /**
   * Get current performance statistics
   */
  getPerformanceStats(timeWindow: number = 3600000): PerformanceStats {
    const cutoff = new Date(Date.now() - timeWindow);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    if (recentMetrics.length === 0) {
      return {
        averageQueryTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        queriesPerMinute: 0,
        slowQueries: [],
        systemHealth: 'healthy'
      };
    }

    // Calculate average query time
    const totalTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageQueryTime = totalTime / recentMetrics.length;

    // Calculate cache hit rate
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / recentMetrics.length) * 100;

    // Calculate error rate
    const errors = recentMetrics.filter(m => m.error).length;
    const errorRate = (errors / recentMetrics.length) * 100;

    // Calculate queries per minute
    const timeWindowMinutes = timeWindow / 60000;
    const queriesPerMinute = recentMetrics.length / timeWindowMinutes;

    // Get slow queries
    const slowQueries = recentMetrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slowest

    // Determine system health
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (errorRate > 10 || averageQueryTime > 2000) {
      systemHealth = 'critical';
    } else if (errorRate > 5 || averageQueryTime > 1000) {
      systemHealth = 'degraded';
    }

    return {
      averageQueryTime,
      cacheHitRate,
      errorRate,
      queriesPerMinute,
      slowQueries,
      systemHealth
    };
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(hours: number = 24): Array<{
    timestamp: string;
    averageQueryTime: number;
    cacheHitRate: number;
    errorRate: number;
    queryCount: number;
  }> {
    const now = new Date();
    const trends = [];

    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - (i + 1) * 3600000);
      const hourEnd = new Date(now.getTime() - i * 3600000);
      
      const hourMetrics = this.metrics.filter(m => 
        m.timestamp >= hourStart && m.timestamp < hourEnd
      );

      if (hourMetrics.length > 0) {
        const avgTime = hourMetrics.reduce((sum, m) => sum + m.duration, 0) / hourMetrics.length;
        const cacheHits = hourMetrics.filter(m => m.cacheHit).length;
        const errors = hourMetrics.filter(m => m.error).length;

        trends.push({
          timestamp: hourStart.toISOString(),
          averageQueryTime: Math.round(avgTime),
          cacheHitRate: Math.round((cacheHits / hourMetrics.length) * 100),
          errorRate: Math.round((errors / hourMetrics.length) * 100),
          queryCount: hourMetrics.length
        });
      } else {
        trends.push({
          timestamp: hourStart.toISOString(),
          averageQueryTime: 0,
          cacheHitRate: 0,
          errorRate: 0,
          queryCount: 0
        });
      }
    }

    return trends;
  }

  /**
   * Get query type breakdown
   */
  getQueryTypeBreakdown(timeWindow: number = 3600000): Array<{
    queryType: string;
    count: number;
    averageTime: number;
    cacheHitRate: number;
    errorRate: number;
  }> {
    const cutoff = new Date(Date.now() - timeWindow);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    const breakdown = new Map<string, {
      count: number;
      totalTime: number;
      cacheHits: number;
      errors: number;
    }>();

    recentMetrics.forEach(metric => {
      if (!breakdown.has(metric.queryType)) {
        breakdown.set(metric.queryType, {
          count: 0,
          totalTime: 0,
          cacheHits: 0,
          errors: 0
        });
      }

      const stats = breakdown.get(metric.queryType)!;
      stats.count++;
      stats.totalTime += metric.duration;
      if (metric.cacheHit) stats.cacheHits++;
      if (metric.error) stats.errors++;
    });

    return Array.from(breakdown.entries()).map(([queryType, stats]) => ({
      queryType,
      count: stats.count,
      averageTime: Math.round(stats.totalTime / stats.count),
      cacheHitRate: Math.round((stats.cacheHits / stats.count) * 100),
      errorRate: Math.round((stats.errors / stats.count) * 100)
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Get database connection health
   */
  async getDatabaseHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    responseTime: number;
    lastCheck: Date;
    details: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Simple health check - fetch analytics
      const response = await fetch('/api/admin/markets/commitments?health=true');
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
        if (responseTime > 2000) {
          status = 'critical';
        } else if (responseTime > 1000) {
          status = 'degraded';
        }

        return {
          status,
          responseTime,
          lastCheck: new Date(),
          details: `Database responding in ${responseTime}ms`
        };
      } else {
        return {
          status: 'critical',
          responseTime,
          lastCheck: new Date(),
          details: `Database error: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        details: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - 24 * 3600000); // Keep 24 hours
    const initialCount = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
    
    const cleaned = initialCount - this.metrics.length;
    if (cleaned > 0) {
      console.log(`[PERFORMANCE] Cleaned up ${cleaned} old metrics, ${this.metrics.length} remaining`);
    }
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'timestamp,queryType,duration,cacheHit,resultSize,error\n';
      const rows = this.metrics.map(m => 
        `${m.timestamp.toISOString()},${m.queryType},${m.duration},${m.cacheHit},${m.resultSize},"${m.error || ''}"`
      ).join('\n');
      return headers + rows;
    }

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalMetrics: this.metrics.length,
      metrics: this.metrics
    }, null, 2);
  }

  /**
   * Reset all metrics (for testing or maintenance)
   */
  reset(): void {
    this.metrics = [];
    console.log('[PERFORMANCE] All metrics reset');
  }
}

// Export singleton instance
export const analyticsPerformanceService = AnalyticsPerformanceService.getInstance();

// Helper function to wrap database queries with performance monitoring
export function withPerformanceMonitoring<T>(
  queryType: string,
  queryFn: () => Promise<T>,
  cacheHit: boolean = false
): Promise<T> {
  const startTime = Date.now();
  
  return queryFn()
    .then(result => {
      const duration = Date.now() - startTime;
      const resultSize = typeof result === 'object' ? JSON.stringify(result).length : 0;
      
      analyticsPerformanceService.recordQuery(
        queryType,
        duration,
        cacheHit,
        resultSize
      );
      
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      
      analyticsPerformanceService.recordQuery(
        queryType,
        duration,
        cacheHit,
        0,
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw error;
    });
}