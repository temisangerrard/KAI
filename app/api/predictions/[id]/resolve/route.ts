/**
 * API Route: Resolve Prediction Market
 * POST /api/predictions/[id]/resolve
 * 
 * Resolves a prediction market and processes payouts
 */

import { NextRequest, NextResponse } from 'next/server'
import { PredictionPayoutService } from '@/lib/services/prediction-payout-service'
import { getDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/db/database'

interface ResolveRequest {
  winningOptionId: string
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

    const body = await request.json() as ResolveRequest
    const { winningOptionId, adminUserId } = body

    if (!winningOptionId || !adminUserId) {
      return NextResponse.json(
        { error: 'Winning option ID and admin user ID are required' },
        { status: 400 }
      )
    }

    // Verify the prediction exists and is in a resolvable state
    const predictionRef = doc(db, 'markets', predictionId)
    const predictionSnap = await getDoc(predictionRef)

    if (!predictionSnap.exists()) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      )
    }

    const prediction = predictionSnap.data()
    
    if (prediction.status === 'ended' || prediction.status === 'resolved') {
      return NextResponse.json(
        { error: 'Prediction has already been resolved' },
        { status: 400 }
      )
    }

    // Verify the winning option exists
    const validOptionIds = prediction.options?.map((opt: any) => opt.id) || []
    if (!validOptionIds.includes(winningOptionId)) {
      return NextResponse.json(
        { error: 'Invalid winning option ID' },
        { status: 400 }
      )
    }

    // Update prediction status to resolved
    await updateDoc(predictionRef, {
      status: 'resolved',
      winningOptionId,
      resolvedAt: Timestamp.now(),
      resolvedBy: adminUserId
    })

    // Create payout job (this will process asynchronously)
    const payoutJob = await PredictionPayoutService.createPayoutJob(
      predictionId,
      winningOptionId
    )

    return NextResponse.json({
      success: true,
      predictionId,
      winningOptionId,
      payoutJobId: payoutJob.id,
      message: 'Prediction resolved successfully. Payouts are being processed.'
    })

  } catch (error) {
    console.error('Error resolving prediction:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to resolve prediction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}