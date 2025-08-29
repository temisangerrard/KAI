import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching all users from Firebase Auth...');

    // Use Firebase Admin SDK (server-side only)
    const { adminAuth } = await import('@/lib/firebase-admin');
    
    // Get all users with detailed information
    const listUsersResult = await adminAuth.listUsers(1000); // Get up to 1000 users
    
    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
        lastRefreshTime: user.metadata.lastRefreshTime
      },
      providerData: user.providerData.map(provider => ({
        providerId: provider.providerId,
        uid: provider.uid,
        displayName: provider.displayName,
        email: provider.email,
        photoURL: provider.photoURL
      })),
      customClaims: user.customClaims || {}
    }));

    console.log(`✅ Successfully fetched ${users.length} users from Firebase Auth`);

    // Sort by creation time (newest first)
    users.sort((a, b) => new Date(b.metadata.creationTime).getTime() - new Date(a.metadata.creationTime).getTime());

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
      pagination: {
        total: users.length,
        hasMore: listUsersResult.pageToken ? true : false
      }
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