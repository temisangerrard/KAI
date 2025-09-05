import { NextRequest, NextResponse } from 'next/server'
import { MarketResolution } from '@/lib/types/database'

// Mock resolution data for now - this would come from the database in a real implementation
const mockResolutions: Record<string, MarketResolution> = {
  'sample-market-1': {
    id: 'resolution-1',
    marketId: 'sample-market-1',
    winningOptionId: 'option-1',
    resolvedBy: 'admin-user-1',
    resolvedAt: new Date('2024-01-15T10:30:00Z') as any,
    evidence: [
      {
        id: 'evidence-1',
        type: 'url',
        content: 'https://example.com/proof',
        description: 'Official announcement confirming the outcome',
        uploadedAt: new Date('2024-01-15T10:25:00Z') as any
      },
      {
        id: 'evidence-2',
        type: 'description',
        content: 'Based on the official announcement made on January 15th, 2024, the outcome has been confirmed.',
        uploadedAt: new Date('2024-01-15T10:25:00Z') as any
      }
    ],
    totalPayout: 15000,
    winnerCount: 45,
    status: 'completed',
    creatorFeeAmount: 300,
    houseFeeAmount: 750
  }
}

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

    // In a real implementation, this would fetch from the database
    // For now, return mock data if available
    const resolution = mockResolutions[marketId]

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