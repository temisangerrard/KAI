import { NextRequest, NextResponse } from 'next/server';
import { AdminCommitmentService } from '@/lib/services/admin-commitment-service';
import { MarketAnalytics, CommitmentWithUser } from '@/lib/types/token';
import { Market } from '@/lib/types/database';

// TODO: Add admin authentication middleware
async function verifyAdminAuth(request: NextRequest) {
  // For now, return true - implement proper admin auth later
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const marketId = params.id;
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const status = searchParams.get('status');
    const position = searchParams.get('position') as 'yes' | 'no' | undefined;
    const sortBy = searchParams.get('sortBy') || 'committedAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
    const includeAnalytics = searchParams.get('includeAnalytics') !== 'false';
    const realTime = searchParams.get('realTime') === 'true';

    console.log(`[MARKET_COMMITMENTS_API] Fetching commitments for market ${marketId} with options:`, {
      page, pageSize, status, position, sortBy, sortOrder, includeAnalytics, realTime
    });

    // Use optimized service to fetch market-specific commitments
    const result = await AdminCommitmentService.getMarketCommitments(marketId, {
      page,
      pageSize,
      status,
      position,
      sortBy,
      sortOrder,
      includeAnalytics
    });

    console.log(`[MARKET_COMMITMENTS_API] Successfully fetched ${result.commitments.length} commitments for market ${marketId}`);

    // Prepare response with market details, commitments, and analytics
    const response = {
      market: {
        id: result.market.id,
        title: result.market.title,
        description: result.market.description,
        status: result.market.status,
        category: result.market.category,
        createdAt: result.market.createdAt,
        endsAt: result.market.endsAt,
        resolvedAt: result.market.resolvedAt,
        totalParticipants: result.market.totalParticipants,
        totalTokensStaked: result.market.totalTokensStaked,
        options: result.market.options
      },
      commitments: result.commitments,
      analytics: result.analytics,
      pagination: {
        page,
        pageSize,
        totalCount: result.totalCount,
        totalPages: Math.ceil(result.totalCount / pageSize),
        hasNext: page * pageSize < result.totalCount,
        hasPrev: page > 1
      },
      filters: {
        status,
        position,
        sortBy,
        sortOrder
      },
      metadata: {
        realTimeEnabled: realTime,
        lastUpdated: new Date().toISOString(),
        cacheStatus: 'fresh'
      }
    };

    // Add cache headers for real-time scenarios
    const headers: Record<string, string> = {};
    if (realTime) {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    } else {
      headers['Cache-Control'] = 'public, max-age=30'; // 30 second cache for non-real-time
    }

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error(`[MARKET_COMMITMENTS_API] Error fetching commitments for market ${params.id}:`, error);
    
    // Handle specific error types
    if (error.message === 'Market not found') {
      return NextResponse.json(
        { 
          error: 'Market not found',
          message: `Market with ID ${params.id} does not exist`,
          marketId: params.id
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch market commitments',
        message: 'An error occurred while retrieving commitment data for this market',
        marketId: params.id,
        details: error.message
      },
      { status: 500 }
    );
  }
}