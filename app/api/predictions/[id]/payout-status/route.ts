/**
 * API Route: Get Payout Status
 * GET /api/predictions/[id]/payout-status
 * 
 * Gets the payout processing status for a prediction
 */

import { NextRequest, NextResponse } from 'next/server'
import { PredictionPayoutService } from '@/lib/services/prediction-payout-service'

export async function GET(
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

    // Get all payout jobs for this prediction
    const payoutJobs = await PredictionPayoutService.getPayoutJobsForPrediction(predictionId)

    if (payoutJobs.length === 0) {
      return NextResponse.json({
        predictionId,
        status: 'no_payouts',
        message: 'No payout jobs found for this prediction'
      })
    }

    // Get the most recent job
    const latestJob = payoutJobs[0]

    return NextResponse.json({
      predictionId,
      latestJob,
      allJobs: payoutJobs,
      status: latestJob.status,
      message: getStatusMessage(latestJob.status)
    })

  } catch (error) {
    console.error('Error getting payout status:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get payout status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'pending':
      return 'Payout processing is queued'
    case 'processing':
      return 'Payouts are currently being processed'
    case 'completed':
      return 'All payouts have been processed successfully'
    case 'failed':
      return 'Payout processing failed'
    default:
      return 'Unknown payout status'
  }
}