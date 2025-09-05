import { NextRequest, NextResponse } from 'next/server'
import { ResolutionService } from '@/lib/services/resolution-service'

/**
 * GET /api/markets/{id}/resolution/evidence
 * Returns evidence used for market resolution
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const marketId = params.id

    if (!marketId) {
      return NextResponse.json(
        { error: 'Market ID is required' },
        { status: 400 }
      )
    }

    // Get market resolution details first
    const resolution = await ResolutionService.getMarketResolution(marketId)

    if (!resolution) {
      return NextResponse.json(
        { 
          success: true,
          data: [],
          message: 'Market has not been resolved yet'
        }
      )
    }

    // Return the evidence from the resolution
    return NextResponse.json({
      success: true,
      data: resolution.evidence || []
    })

  } catch (error) {
    console.error('[RESOLUTION_EVIDENCE_API] Error fetching resolution evidence:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch resolution evidence',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}