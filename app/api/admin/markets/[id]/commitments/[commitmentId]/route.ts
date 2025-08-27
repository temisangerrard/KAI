import { NextRequest, NextResponse } from 'next/server';
import { AdminCommitmentService } from '@/lib/services/admin-commitment-service';

// TODO: Add admin authentication middleware
async function verifyAdminAuth(request: NextRequest) {
  // For now, return true - implement proper admin auth later
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; commitmentId: string } }
) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: marketId, commitmentId } = params;

    console.log(`[COMMITMENT_DETAILS_API] Fetching detailed commitment ${commitmentId} for market ${marketId}`);

    // Fetch detailed commitment data with user information and timeline
    const commitmentDetails = await AdminCommitmentService.getCommitmentDetails(marketId, commitmentId);

    if (!commitmentDetails) {
      return NextResponse.json(
        { 
          error: 'Commitment not found',
          message: `Commitment with ID ${commitmentId} not found in market ${marketId}`,
          commitmentId,
          marketId
        },
        { status: 404 }
      );
    }

    console.log(`[COMMITMENT_DETAILS_API] Successfully fetched commitment details for ${commitmentId}`);

    // Add cache headers for real-time scenarios
    const headers: Record<string, string> = {
      'Cache-Control': 'public, max-age=10', // 10 second cache for commitment details
    };

    return NextResponse.json(commitmentDetails, { headers });

  } catch (error) {
    console.error(`[COMMITMENT_DETAILS_API] Error fetching commitment ${params.commitmentId}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch commitment details',
        message: 'An error occurred while retrieving detailed commitment information',
        commitmentId: params.commitmentId,
        marketId: params.id,
        details: error.message
      },
      { status: 500 }
    );
  }
}