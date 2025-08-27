import { NextRequest, NextResponse } from 'next/server';
import { AdminCommitmentService } from '@/lib/services/admin-commitment-service';
import { MarketCommitmentSummary, CommitmentAnalytics } from '@/lib/types/token';

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
    
    // Health check endpoint
    const isHealthCheck = searchParams.get('health') === 'true';
    if (isHealthCheck) {
      const startTime = Date.now();
      
      // Simple database connectivity test
      const analytics = await AdminCommitmentService.getCommitmentAnalytics();
      const responseTime = Date.now() - startTime;
      
      return NextResponse.json({
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        analytics: {
          totalMarketsWithCommitments: analytics.totalMarketsWithCommitments
        }
      });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const marketId = searchParams.get('marketId');
    const userId = searchParams.get('userId');
    const position = searchParams.get('position') as 'yes' | 'no' | undefined;
    const sortBy = searchParams.get('sortBy') || 'committedAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
    const search = searchParams.get('search');

    console.log(`[ADMIN_COMMITMENTS_API] Fetching commitments with filters:`, {
      page, pageSize, status, marketId, userId, position, sortBy, sortOrder, search
    });

    // Use optimized service to fetch commitments with user data
    const result = await AdminCommitmentService.getCommitmentsWithUsers({
      page,
      pageSize,
      status,
      marketId,
      userId,
      position,
      sortBy: sortBy as any,
      sortOrder,
      search
    });

    // Get system-wide analytics
    const analytics = await AdminCommitmentService.getCommitmentAnalytics();

    // Group commitments by market for summary
    const marketSummaries = new Map<string, MarketCommitmentSummary>();
    
    result.commitments.forEach(commitment => {
      const marketId = commitment.predictionId;
      
      if (!marketSummaries.has(marketId)) {
        marketSummaries.set(marketId, {
          marketId,
          marketTitle: commitment.marketTitle || 'Unknown Market',
          marketStatus: commitment.marketStatus as any || 'unknown',
          totalTokensCommitted: 0,
          participantCount: 0,
          yesTokens: 0,
          noTokens: 0,
          averageCommitment: 0,
          largestCommitment: 0,
          commitments: []
        });
      }
      
      const summary = marketSummaries.get(marketId)!;
      summary.totalTokensCommitted += commitment.tokensCommitted;
      summary.participantCount += 1;
      
      if (commitment.position === 'yes') {
        summary.yesTokens += commitment.tokensCommitted;
      } else {
        summary.noTokens += commitment.tokensCommitted;
      }
      
      if (commitment.tokensCommitted > summary.largestCommitment) {
        summary.largestCommitment = commitment.tokensCommitted;
      }
      
      summary.commitments.push(commitment);
    });

    // Calculate averages for market summaries
    marketSummaries.forEach(summary => {
      if (summary.participantCount > 0) {
        summary.averageCommitment = Math.round(summary.totalTokensCommitted / summary.participantCount);
      }
    });

    console.log(`[ADMIN_COMMITMENTS_API] Successfully fetched ${result.commitments.length} commitments from ${marketSummaries.size} markets`);

    return NextResponse.json({
      commitments: result.commitments,
      markets: Array.from(marketSummaries.values()),
      analytics,
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
        marketId,
        userId,
        position,
        sortBy,
        sortOrder,
        search
      }
    });

  } catch (error) {
    console.error('[ADMIN_COMMITMENTS_API] Error fetching commitments:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch market commitments',
        message: 'An error occurred while retrieving commitment data',
        details: error.message
      },
      { status: 500 }
    );
  }
}