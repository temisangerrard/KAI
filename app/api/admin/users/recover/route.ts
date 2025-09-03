import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth/auth-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Admin user recovery endpoint called')
    
    // Run the recovery process
    const result = await authService.recoverOrphanedCDPUsers()
    
    console.log('✅ Recovery completed:', result)
    
    return NextResponse.json({
      success: true,
      message: 'User recovery completed',
      result
    })
    
  } catch (error) {
    console.error('❌ Recovery failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Recovery failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}