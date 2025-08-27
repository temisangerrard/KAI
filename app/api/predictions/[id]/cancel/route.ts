/**
 * API Route: Cancel Prediction Market
 * POST /api/predictions/[id]/cancel
 * 
 * Cancels a prediction market and refunds all commitments
 */

import { NextRequest, NextResponse } from 'next/server'
import { PredictionPayoutService } from '@/lib/services/prediction-payout-service'
import { getDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/db/database'

interface CancelRequest {
  reason: string
  adminUserId: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const predictionId = params.id
    
    if (!predictionId) {
      return NextResponse.json(
        { error: 'Prediction ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json() as CancelRequest
    const { reason, adminUserId } = body

    if (!reason || !adminUserId) {
      return NextResponse.json(
        { error: 'Cancellation reason and admin user ID are required' },
        { status: 400 }
      )
    }

    // Verify the prediction exists and can be cancelled
    const predictionRef = doc(db, 'markets', predictionId)
    const predictionSnap = await getDoc(predictionRef)

    if (!predictionSnap.exists()) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      )
    }

    const prediction = predictionSnap.data()
    
    if (prediction.status === 'ended' || prediction.status === 'resolved' || prediction.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Prediction cannot be cancelled in its current state' },
        { status: 400 }
      )
    }

    // Update prediction status to cancelled
    await updateDoc(predictionRef, {
      status: 'cancelled',
      cancelledAt: Timestamp.now(),
      cancelledBy: adminUserId,
      cancellationReason: reason
    })

    // Process refunds for all commitments
    const refundResult = await PredictionPayoutService.refundPrediction(predictionId)

    return NextResponse.json({
      success: true,
      predictionId,
      reason,
      refundResult,
      message: 'Prediction cancelled successfully. All commitments have been refunded.'
    })

  } catch (error) {
    console.error('Error cancelling prediction:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to cancel prediction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}