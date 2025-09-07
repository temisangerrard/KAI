import { NextRequest, NextResponse } from 'next/server'
import { ResolutionService } from '@/lib/services/resolution-service'

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

    // Get market resolution from the database
    const resolution = await ResolutionService.getMarketResolution(marketId)

    if (!resolution) {
      return NextResponse.json(
        { error: 'Resolution not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(resolution)

  } catch (error) {
    console.error('Error fetching market resolution:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}