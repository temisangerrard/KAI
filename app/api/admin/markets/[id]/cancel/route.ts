import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/lib/auth/admin-auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/db/database';
import { Market, MarketStatus } from '@/lib/types/database';
import { PredictionCommitment } from '@/lib/types/token';

interface RouteParams {
  params: {
    id: string;
  };
}

interface CancelMarketRequest {
  reason: string;
  refundTokens?: boolean;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require admin authentication for market cancellation
    const authResult = await AdminAuthService.verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      console.log('❌ Market cancellation denied: Admin authentication failed');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized', 
        message: authResult.error || 'Admin privileges required'
      }, { status: 401 });
    }

    const body: CancelMarketRequest = await request.json();
    const { reason, refundTokens = true } = body;

    // Validate required fields
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'Cancellation reason is required'
      }, { status: 400 });
    }

    if (reason.trim().length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'Cancellation reason must be at least 10 characters'
      }, { status: 400 });
    }

    // Get admin ID from auth result
    const adminId = authResult.user?.uid || 'unknown-admin';

    // Check if market exists and can be cancelled
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

    // Check if market can be cancelled
    if (market.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        error: 'Market already cancelled',
        message: 'This market has already been cancelled'
      }, { status: 400 });
    }

    if (market.status === 'resolved') {
      return NextResponse.json({
        success: false,
        error: 'Cannot cancel resolved market',
        message: 'Cannot cancel a market that has already been resolved'
      }, { status: 400 });
    }

    // Get all active commitments for this market
    const commitmentsQuery = query(
      collection(db, 'predictionCommitments'),
      where('predictionId', '==', params.id),
      where('status', '==', 'active')
    );

    const commitmentsSnapshot = await getDocs(commitmentsQuery);
    const commitments = commitmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PredictionCommitment[];

    // Calculate total tokens to refund
    const totalTokensToRefund = commitments.reduce((sum, commitment) => 
      sum + commitment.tokensCommitted, 0
    );

    // Use batch to ensure atomicity
    const batch = writeBatch(db);

    // Update market status
    batch.update(marketRef, {
      status: 'cancelled' as MarketStatus,
      cancelledAt: Timestamp.now(),
      cancelledBy: adminId,
      cancellationReason: reason.trim(),
      refundTokens
    });

    if (refundTokens && commitments.length > 0) {
      // Process refunds for each user
      const userRefunds = new Map<string, number>();
      
      // Calculate total refund per user
      commitments.forEach(commitment => {
        const currentRefund = userRefunds.get(commitment.userId) || 0;
        userRefunds.set(commitment.userId, currentRefund + commitment.tokensCommitted);
      });

      // Update user balances and commitment statuses
      for (const [userId, refundAmount] of userRefunds) {
        const userRef = doc(db, 'users', userId);
        
        // Get current user balance to update it
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const currentBalance = userDoc.data().tokenBalance || 0;
          batch.update(userRef, {
            tokenBalance: currentBalance + refundAmount
          });
        }

        // Create refund transaction record
        const transactionRef = doc(collection(db, 'transactions'));
        batch.set(transactionRef, {
          userId,
          type: 'market_cancellation_refund',
          amount: refundAmount,
          description: `Refund for cancelled market: ${market.title}`,
          createdAt: Timestamp.now(),
          marketId: params.id,
          metadata: {
            adminId,
            cancellationReason: reason.trim(),
            originalMarketTitle: market.title
          }
        });
      }

      // Update all commitment statuses to cancelled
      commitments.forEach(commitment => {
        const commitmentRef = doc(db, 'predictionCommitments', commitment.id);
        batch.update(commitmentRef, {
          status: 'cancelled',
          cancelledAt: Timestamp.now(),
          refundAmount: commitment.tokensCommitted
        });
      });
    } else {
      // Just update commitment statuses without refunds
      commitments.forEach(commitment => {
        const commitmentRef = doc(db, 'predictionCommitments', commitment.id);
        batch.update(commitmentRef, {
          status: 'cancelled',
          cancelledAt: Timestamp.now(),
          refundAmount: 0
        });
      });
    }

    // Commit all changes
    await batch.commit();

    console.log(`✅ Market ${params.id} cancelled by admin ${adminId}. Refunded ${totalTokensToRefund} tokens to ${userRefunds?.size || 0} users.`);

    return NextResponse.json({
      success: true,
      message: 'Market cancelled successfully',
      details: {
        marketId: params.id,
        reason: reason.trim(),
        refundTokens,
        totalTokensRefunded: refundTokens ? totalTokensToRefund : 0,
        usersRefunded: refundTokens ? (userRefunds?.size || 0) : 0,
        commitmentsAffected: commitments.length
      }
    });

  } catch (error) {
    console.error('❌ Error cancelling market:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cancel market',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}