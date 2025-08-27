import { NextRequest, NextResponse } from 'next/server'
import { runFirebaseDebugSuite } from '@/lib/utils/firebase-debug'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    console.log('[DEBUG_API] Running Firebase debug suite...')
    
    const results = await runFirebaseDebugSuite(userId || undefined)
    
    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasFirebaseConfig: !!(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      }
    })
  } catch (error) {
    console.error('[DEBUG_API] Debug suite failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}