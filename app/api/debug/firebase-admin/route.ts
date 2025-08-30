import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Only show debug info in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 });
    }

    const debugInfo = {
      environment: process.env.NODE_ENV,
      hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasPublicProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
      privateKeyStartsWith: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 30) || 'N/A',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'N/A',
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'N/A'
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug failed', 
      message: error.message 
    }, { status: 500 });
  }
}