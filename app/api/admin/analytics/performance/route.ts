import { NextRequest, NextResponse } from 'next/server';
import { analyticsPerformanceService } from '@/lib/services/analytics-performance-service';

// TODO: Add admin authentication middleware
async function verifyAdminAuth(request: NextRequest) {
  // For now, return true - implement proper admin auth later
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('timeWindow') || '3600000'); // 1 hour default
    const includeTrends = searchParams.get('includeTrends') === 'true';
    const includeBreakdown = searchParams.get('includeBreakdown') === 'true';

    // Get current performance stats
    const stats = analyticsPerformanceService.getPerformanceStats(timeWindow);

    // Get database health
    const dbHealth = await analyticsPerformanceService.getDatabaseHealth();

    const response: any = {
      stats,
      dbHealth,
      timestamp: new Date().toISOString()
    };

    // Include trends if requested
    if (includeTrends) {
      response.trends = analyticsPerformanceService.getPerformanceTrends(24);
    }

    // Include query type breakdown if requested
    if (includeBreakdown) {
      response.breakdown = analyticsPerformanceService.getQueryTypeBreakdown(timeWindow);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[PERFORMANCE_API] Error fetching performance data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch performance data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...params } = await request.json();

    switch (action) {
      case 'reset':
        analyticsPerformanceService.reset();
        return NextResponse.json({ 
          success: true, 
          message: 'Performance metrics reset' 
        });

      case 'export':
        const format = params.format || 'json';
        const data = analyticsPerformanceService.exportMetrics(format);
        
        return new Response(data, {
          headers: {
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
            'Content-Disposition': `attachment; filename="performance-metrics.${format}"`
          }
        });

      case 'record':
        // Allow manual recording of performance metrics (for testing)
        const { queryType, duration, cacheHit, resultSize, error } = params;
        analyticsPerformanceService.recordQuery(
          queryType,
          duration,
          cacheHit || false,
          resultSize || 0,
          error
        );
        
        return NextResponse.json({ 
          success: true, 
          message: 'Metric recorded' 
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          availableActions: ['reset', 'export', 'record']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[PERFORMANCE_API] Error handling POST request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}