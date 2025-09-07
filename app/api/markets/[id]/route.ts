import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { getMarketById, updateMarket } from '@/lib/db/database'

const OptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  percentage: z.number(),
  tokens: z.number(),
  color: z.string(),
})

const MarketUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  options: z.array(OptionSchema).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['active', 'resolved', 'cancelled']).optional(),
  totalTokens: z.number().optional(),
  participants: z.number().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const market = await getMarketById(params.id)
    if (!market) {
      console.log(`Market ${params.id} not found in database`)
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }
    
    return NextResponse.json(market, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error(`Failed to fetch market ${params.id}:`, error)
    return NextResponse.json({ error: 'Failed to fetch market' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const result = MarketUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid market data' }, { status: 400 })
    }
    const market = await updateMarket(params.id, result.data)
    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }
    return NextResponse.json(market)
  } catch (error) {
    console.error('Failed to update market', error)
    return NextResponse.json({ error: 'Failed to update market' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`🗑️ DELETE request for market: ${params.id}`);
  
  try {
    // Verify admin authentication
    const { AdminAuthService } = await import('@/lib/auth/admin-auth');
    const authResult = await AdminAuthService.verifyAdminAuth(request);
    
    if (!authResult.isAdmin) {
      console.log(`❌ Admin auth failed for market deletion: ${authResult.error}`);
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: authResult.error 
      }, { status: 401 });
    }

    console.log(`✅ Admin auth successful for user: ${authResult.userId}`);

    // Delete the market using the service
    const { MarketsService } = await import('@/lib/services/firestore');
    await MarketsService.deleteMarket(params.id, authResult.userId!);
    
    console.log(`✅ Market ${params.id} deleted successfully`);
    return NextResponse.json({ 
      success: true, 
      message: 'Market deleted successfully' 
    });
  } catch (error) {
    console.error(`❌ Failed to delete market ${params.id}:`, error);
    
    if (error instanceof Error) {
      if (error.message === 'Market not found') {
        return NextResponse.json({ 
          error: 'Market not found',
          message: 'The requested market could not be found.' 
        }, { status: 404 });
      }
      if (error.message.includes('Admin privileges required')) {
        return NextResponse.json({ 
          error: 'Admin privileges required',
          message: 'You do not have permission to delete markets.' 
        }, { status: 403 });
      }
      if (error.message.includes('permission-denied')) {
        return NextResponse.json({ 
          error: 'Permission denied',
          message: 'Insufficient permissions to access the database.' 
        }, { status: 403 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete market',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
