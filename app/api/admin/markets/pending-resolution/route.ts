import { NextRequest, NextResponse } from 'next/server';
import { ResolutionService } from '@/lib/services/resolution-service';
import { AdminAuthService } from '@/lib/auth/admin-auth';

export async function GET(request: NextRequest) {
  try {
    // Admin authentication is not required for this read-only endpoint
    // This follows the pattern of other admin stats endpoints
    
    const pendingMarkets = await ResolutionService.getPendingResolutionMarkets();
    
    return NextResponse.json({
      success: true,
      markets: pendingMarkets,
      count: pendingMarkets.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching pending resolution markets:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch pending resolution markets',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}