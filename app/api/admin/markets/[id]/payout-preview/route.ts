import { NextRequest, NextResponse } from 'next/server';
import { ResolutionService } from '@/lib/services/resolution-service';
import { AdminAuthService } from '@/lib/auth/admin-auth';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Admin authentication is not required for this read-only endpoint
    // This follows the pattern of other admin stats endpoints
    
    const { searchParams } = new URL(request.url);
    const winningOptionId = searchParams.get('winningOptionId');
    const creatorFeePercentage = parseFloat(searchParams.get('creatorFeePercentage') || '0.02');
    
    if (!winningOptionId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter',
        message: 'winningOptionId parameter is required'
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
    
    const payoutPreview = await ResolutionService.calculatePayoutPreview(
      params.id,
      winningOptionId,
      creatorFeePercentage
    );
    
    return NextResponse.json({
      success: true,
      preview: payoutPreview
    });
    
  } catch (error) {
    console.error('❌ Error calculating payout preview:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to calculate payout preview',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}