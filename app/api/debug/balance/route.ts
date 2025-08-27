import { NextRequest, NextResponse } from 'next/server'
import { TokenBalanceService } from '@/lib/services/token-balance-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId parameter is required'
      }, { status: 400 })
    }
    
    console.log(`[DEBUG_BALANCE] Checking balance for user: ${userId}`)
    
    // Test balance service
    const balance = await TokenBalanceService.getUserBalance(userId)
    
    console.log(`[DEBUG_BALANCE] Balance result:`, balance)
    
    return NextResponse.json({
      success: true,
      userId,
      balance,
      hasBalance: !!balance,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[DEBUG_BALANCE] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}