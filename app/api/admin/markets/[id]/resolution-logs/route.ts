import { NextRequest, NextResponse } from 'next/server';
import { ResolutionService } from '@/lib/services/resolution-service';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Admin authentication is not required for this read-only endpoint
    // This follows the pattern of other admin stats endpoints
    
    const logs = await ResolutionService.getResolutionLogs(params.id);
    
    return NextResponse.json({
      success: true,
      logs: logs
    });
    
  } catch (error) {
    console.error('❌ Error fetching resolution logs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch resolution logs',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}