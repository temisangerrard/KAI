import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('[TEST_API] Simple test endpoint called')
    
    const body = await request.json()
    console.log('[TEST_API] Request body:', body)
    
    return NextResponse.json({
      success: true,
      message: 'Test endpoint working',
      receivedData: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[TEST_API] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}