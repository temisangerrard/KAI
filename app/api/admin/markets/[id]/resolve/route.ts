import { NextRequest, NextResponse } from 'next/server';
import { ResolutionService } from '@/lib/services/resolution-service';
import { AdminAuthService } from '@/lib/auth/admin-auth';
import { Evidence } from '@/lib/types/database';

interface RouteParams {
  params: {
    id: string;
  };
}

interface ResolveMarketRequest {
  winningOptionId: string;
  evidence: Evidence[];
  creatorFeePercentage?: number;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require admin authentication for market resolution
    const authResult = await AdminAuthService.verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      console.log('❌ Market resolution denied: Admin authentication failed');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized', 
        message: authResult.error || 'Admin privileges required'
      }, { status: 401 });
    }

    const body: ResolveMarketRequest = await request.json();
    const { winningOptionId, evidence, creatorFeePercentage = 0.02 } = body;

    // Validate required fields
    if (!winningOptionId) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'winningOptionId is required'
      }, { status: 400 });
    }

    if (!evidence || !Array.isArray(evidence) || evidence.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'At least one piece of evidence is required'
      }, { status: 400 });
    }

    // Validate creator fee percentage (1-5%)
    if (creatorFeePercentage < 0.01 || creatorFeePercentage > 0.05) {
      return NextResponse.json({
        success: false,
        error: 'Invalid creator fee percentage',
        message: 'Creator fee must be between 1% and 5%'
      }, { status: 400 });
    }

    // Validate evidence structure
    for (const item of evidence) {
      if (!item.type || !item.content) {
        return NextResponse.json({
          success: false,
          error: 'Validation failed',
          message: 'Each evidence item must have type and content'
        }, { status: 400 });
      }

      if (!['url', 'screenshot', 'description'].includes(item.type)) {
        return NextResponse.json({
          success: false,
          error: 'Validation failed',
          message: 'Evidence type must be url, screenshot, or description'
        }, { status: 400 });
      }
    }

    // Get admin ID from auth result
    const adminId = authResult.user?.uid || 'unknown-admin';

    // Resolve the market
    const result = await ResolutionService.resolveMarket(
      params.id,
      winningOptionId,
      evidence,
      adminId,
      creatorFeePercentage
    );

    console.log(`✅ Market ${params.id} resolved successfully by admin ${adminId}`);
    
    return NextResponse.json({
      success: true,
      resolutionId: result.resolutionId,
      message: 'Market resolved and payouts distributed successfully'
    });

  } catch (error) {
    console.error('❌ Error resolving market:', error);
    
    // Handle specific resolution service errors
    if (error instanceof Error && error.name === 'ResolutionServiceError') {
      return NextResponse.json({
        success: false,
        error: error.message,
        message: 'Resolution failed',
        details: (error as any).details
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to resolve market',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}