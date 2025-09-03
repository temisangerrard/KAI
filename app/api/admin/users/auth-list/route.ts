import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/db/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching all users from Firebase Auth and Firestore...');

    // Fetch from both Firebase Auth and Firestore in parallel
    const [authUsersResult, firestoreUsersResult] = await Promise.all([
      fetchFirebaseAuthUsers().catch(error => {
        console.warn('Failed to fetch Firebase Auth users:', error.message);
        return { users: [] };
      }),
      fetchFirestoreUsers().catch(error => {
        console.warn('Failed to fetch Firestore users:', error.message);
        return { users: [] };
      })
    ]);

    // Merge users, avoiding duplicates (Firebase Auth users take precedence)
    const authUserIds = new Set(authUsersResult.users.map(u => u.uid));
    const uniqueFirestoreUsers = firestoreUsersResult.users.filter(u => !authUserIds.has(u.uid));
    
    const allUsers = [...authUsersResult.users, ...uniqueFirestoreUsers];
    
    console.log(`✅ Successfully fetched ${allUsers.length} total users (${authUsersResult.users.length} Auth + ${uniqueFirestoreUsers.length} Firestore-only)`);

    // Sort by creation time (newest first)
    allUsers.sort((a, b) => {
      const aTime = new Date(a.metadata.creationTime).getTime();
      const bTime = new Date(b.metadata.creationTime).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      count: allUsers.length,
      users: allUsers,
      pagination: {
        total: allUsers.length,
        hasMore: false
      },
      sources: {
        firebaseAuth: authUsersResult.users.length,
        firestoreOnly: uniqueFirestoreUsers.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function fetchFirebaseAuthUsers(): Promise<{ users: any[] }> {
  console.log('📱 Fetching users from Firebase Auth...');
  
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
    customClaims: user.customClaims || {},
    source: 'firebase-auth'
  }));

  console.log(`📱 Found ${users.length} Firebase Auth users`);
  return { users };
}

async function fetchFirestoreUsers(): Promise<{ users: any[] }> {
  console.log('🗄️ Fetching users from Firestore...');
  
  const usersSnapshot = await getDocs(collection(db, 'users'));
  
  const users = usersSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      emailVerified: false, // Firestore users don't have email verification status
      disabled: false, // Firestore users are not disabled by default
      metadata: {
        creationTime: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        lastSignInTime: data.lastLoginAt?.toDate?.()?.toISOString() || data.lastLoginAt,
        lastRefreshTime: data.lastLoginAt?.toDate?.()?.toISOString() || data.lastLoginAt
      },
      providerData: data.address ? [{
        providerId: 'coinbase-cdp',
        uid: data.address,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL
      }] : [{
        providerId: 'firestore',
        uid: doc.id,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL
      }],
      customClaims: {},
      source: 'firestore',
      isCdpUser: !!data.address,
      walletAddress: data.address
    };
  });

  console.log(`🗄️ Found ${users.length} Firestore users`);
  return { users };
}