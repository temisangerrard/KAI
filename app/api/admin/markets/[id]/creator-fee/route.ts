import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/lib/auth/admin-auth';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/db/database';
import { Market, MarketStatus } from '@/lib/types/database';

interface RouteParams {
  params: {
    id: string;
  };
}

interface SetCreatorFeeRequest {
  feePercentage: number; // 1-5% as decimal (0.01-0.05)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require admin authentication for creator fee changes
    const authResult = await AdminAuthService.verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      console.log('❌ Creator fee update denied: Admin authentication failed');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized', 
        message: authResult.error || 'Admin privileges required'
      }, { status: 401 });
    }

    const body: SetCreatorFeeRequest = await request.json();
    const { feePercentage } = body;

    // Validate fee percentage
    if (typeof feePercentage !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'feePercentage must be a number'
      }, { status: 400 });
    }

    if (feePercentage < 0.01 || feePercentage > 0.05) {
      return NextResponse.json({
        success: false,
        error: 'Invalid fee percentage',
        message: 'Creator fee must be between 1% (0.01) and 5% (0.05)'
      }, { status: 400 });
    }

    // Get admin ID from auth result
    const adminId = authResult.user?.uid || 'unknown-admin';

    // Check if market exists
    const marketRef = doc(db, 'markets', params.id);
    const marketDoc = await getDoc(marketRef);

    if (!marketDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Market not found',
        message: `Market with ID ${params.id} does not exist`
      }, { status: 404 });
    }

    const market = { id: marketDoc.id, ...marketDoc.data() } as Market;

    // Check if market can have its creator fee updated
    if (market.status === 'resolved') {
      return NextResponse.json({
        success: false,
        error: 'Cannot update resolved market',
        message: 'Cannot change creator fee for a market that has already been resolved'
      }, { status: 400 });
    }

    if (market.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        error: 'Cannot update cancelled market',
        message: 'Cannot change creator fee for a cancelled market'
      }, { status: 400 });
    }

    // Update the market with new creator fee
    await updateDoc(marketRef, {
      creatorFeePercentage: feePercentage,
      creatorFeeUpdatedAt: Timestamp.now(),
      creatorFeeUpdatedBy: adminId
    });

    console.log(`✅ Creator fee for market ${params.id} updated to ${(feePercentage * 100).toFixed(1)}% by admin ${adminId}`);

    return NextResponse.json({
      success: true,
      message: 'Creator fee updated successfully',
      details: {
        marketId: params.id,
        marketTitle: market.title,
        previousFeePercentage: market.creatorFeePercentage || 0.02, // Default 2%
        newFeePercentage: feePercentage,
        feePercentageDisplay: `${(feePercentage * 100).toFixed(1)}%`,
        updatedBy: adminId,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error updating creator fee:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update creator fee',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Admin authentication is not required for this read-only endpoint
    
    // Get current creator fee for the market
    const marketRef = doc(db, 'markets', params.id);
    const marketDoc = await getDoc(marketRef);

    if (!marketDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Market not found',
        message: `Market with ID ${params.id} does not exist`
      }, { status: 404 });
    }

    const market = { id: marketDoc.id, ...marketDoc.data() } as Market;
    const currentFeePercentage = market.creatorFeePercentage || 0.02; // Default 2%

    return NextResponse.json({
      success: true,
      creatorFee: {
        marketId: params.id,
        marketTitle: market.title,
        creatorId: market.createdBy,
        feePercentage: currentFeePercentage,
        feePercentageDisplay: `${(currentFeePercentage * 100).toFixed(1)}%`,
        updatedAt: market.creatorFeeUpdatedAt?.toDate().toISOString() || null,
        updatedBy: market.creatorFeeUpdatedBy || null
      }
    });

  } catch (error) {
    console.error('❌ Error fetching creator fee:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch creator fee',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}