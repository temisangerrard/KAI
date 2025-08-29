import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/db/database';
import { AdminAuthService } from '@/lib/auth/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await AdminAuthService.verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: authResult.error 
      }, { status: 401 });
    }

    console.log('Starting user sync process...');
    
    // Get all users from Firestore
    const firestoreUsersSnapshot = await getDocs(collection(db, 'users'));
    const firestoreUsers = new Map();
    
    firestoreUsersSnapshot.docs.forEach(doc => {
      firestoreUsers.set(doc.id, { id: doc.id, ...doc.data() });
    });

    console.log(`Found ${firestoreUsers.size} users in Firestore`);

    let syncedUsers = 0;
    let errors = [];

    // Note: Firebase Admin SDK would be needed to list all Auth users
    // For now, we'll focus on ensuring Firestore users are properly indexed
    
    // Check for users that might be missing essential fields
    const usersToUpdate = [];
    
    for (const [userId, userData] of firestoreUsers) {
      let needsUpdate = false;
      const updates: any = {};

      // Ensure all users have essential fields
      if (!userData.email && !userData.displayName) {
        console.warn(`User ${userId} missing both email and displayName`);
        updates.displayName = 'Unknown User';
        needsUpdate = true;
      }

      if (!userData.createdAt) {
        console.warn(`User ${userId} missing createdAt`);
        updates.createdAt = new Date();
        needsUpdate = true;
      }

      if (userData.tokenBalance === undefined) {
        updates.tokenBalance = 2500; // Default starting tokens
        needsUpdate = true;
      }

      if (userData.level === undefined) {
        updates.level = 1;
        needsUpdate = true;
      }

      if (userData.totalPredictions === undefined) {
        updates.totalPredictions = 0;
        needsUpdate = true;
      }

      if (userData.correctPredictions === undefined) {
        updates.correctPredictions = 0;
        needsUpdate = true;
      }

      if (userData.streak === undefined) {
        updates.streak = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        usersToUpdate.push({ userId, updates });
      }
    }

    // Update users that need fixes
    for (const { userId, updates } of usersToUpdate) {
      try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, updates, { merge: true });
        syncedUsers++;
        console.log(`Updated user ${userId} with missing fields`);
      } catch (error) {
        console.error(`Failed to update user ${userId}:`, error);
        errors.push(`Failed to update user ${userId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User sync completed',
      stats: {
        totalFirestoreUsers: firestoreUsers.size,
        usersUpdated: syncedUsers,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error syncing users:', error);
    return NextResponse.json(
      { error: 'Failed to sync users', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const authResult = await AdminAuthService.verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: authResult.error 
      }, { status: 401 });
    }

    // Get basic stats about users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const stats = {
      totalUsers: users.length,
      usersWithEmail: users.filter(u => u.email).length,
      usersWithDisplayName: users.filter(u => u.displayName).length,
      usersWithCreatedAt: users.filter(u => u.createdAt).length,
      usersWithTokenBalance: users.filter(u => u.tokenBalance !== undefined).length,
      emailSignups: users.filter(u => u.email && !u.photoURL).length,
      oauthSignups: users.filter(u => u.photoURL).length,
      incompleteProfiles: users.filter(u => !u.email || !u.displayName || !u.createdAt).length
    };

    return NextResponse.json({
      stats,
      needsSync: stats.incompleteProfiles > 0
    });

  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}