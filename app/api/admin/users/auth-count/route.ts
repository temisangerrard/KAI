import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching user count from Firebase Auth...');

    // Use Firebase Admin SDK (server-side only)
    const { adminAuth } = await import('@/lib/firebase-admin');
    
    const listUsersResult = await adminAuth.listUsers();
    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime
      }
    }));

    console.log(`✅ Found ${users.length} users from Firebase Auth`);

    return NextResponse.json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error('❌ Error fetching auth users:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch auth users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}