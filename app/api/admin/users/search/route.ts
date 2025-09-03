import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, getDoc, query, limit as firestoreLimit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/db/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 50;

    console.log(`🔍 Searching users with term: "${search}", limit: ${limit}`);

    // Get users from both Firebase Auth and Firestore
    const allUsers = new Map(); // Use Map to avoid duplicates by UID

    // 1. Get users from Firebase Auth
    try {
      const { adminAuth } = await import('@/lib/firebase-admin');
      const listUsersResult = await adminAuth.listUsers(1000);
      
      listUsersResult.users.forEach(user => {
        allUsers.set(user.uid, {
          id: user.uid,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          disabled: user.disabled,
          createdAt: new Date(user.metadata.creationTime),
          lastSignIn: user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime) : null,
          providerData: user.providerData,
          source: 'firebase_auth'
        });
      });
      
      console.log(`✅ Found ${listUsersResult.users.length} users from Firebase Auth`);
    } catch (authError) {
      console.warn('⚠️ Failed to fetch from Firebase Auth:', authError);
    }

    // 2. Get users from Firestore users collection (includes CDP users)
    try {
      const usersCollection = collection(db, 'users');
      const usersQuery = query(usersCollection, orderBy('email'), firestoreLimit(1000));
      const usersSnapshot = await getDocs(usersQuery);
      
      usersSnapshot.docs.forEach(userDoc => {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // If user already exists from Firebase Auth, merge the data
        if (allUsers.has(userId)) {
          const existingUser = allUsers.get(userId);
          allUsers.set(userId, {
            ...existingUser,
            // Merge Firestore data
            tokenBalance: userData.tokenBalance,
            level: userData.level,
            totalPredictions: userData.totalPredictions,
            correctPredictions: userData.correctPredictions,
            streak: userData.streak,
            bio: userData.bio,
            location: userData.location,
            // Keep Firebase Auth data as primary for these fields
            source: 'both'
          });
        } else {
          // This is a Firestore-only user (like CDP users)
          allUsers.set(userId, {
            id: userId,
            uid: userId,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            emailVerified: false, // CDP users don't have email verification
            disabled: false,
            createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt || Date.now()),
            lastSignIn: userData.lastLoginAt?.toDate ? userData.lastLoginAt.toDate() : null,
            providerData: [{ providerId: 'cdp' }], // Mark as CDP user
            tokenBalance: userData.tokenBalance,
            level: userData.level,
            totalPredictions: userData.totalPredictions,
            correctPredictions: userData.correctPredictions,
            streak: userData.streak,
            bio: userData.bio,
            location: userData.location,
            source: 'firestore_only'
          });
        }
      });
      
      console.log(`✅ Found ${usersSnapshot.docs.length} users from Firestore`);
    } catch (firestoreError) {
      console.warn('⚠️ Failed to fetch from Firestore:', firestoreError);
    }

    // Convert Map to array
    let users = Array.from(allUsers.values());

    // Filter by search term if provided
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.displayName?.toLowerCase().includes(searchLower) ||
        user.uid.toLowerCase().includes(searchLower)
      );
    }

    // Apply limit
    users = users.slice(0, limit);

    // Get user balances for the filtered users
    const userIds = users.map(user => user.uid);
    const balancePromises = userIds.map(async (userId) => {
      try {
        const balanceDoc = await getDoc(doc(db, 'user_balances', userId));
        return balanceDoc.exists() ? { userId, ...balanceDoc.data() } : null;
      } catch (error) {
        console.warn(`Failed to get balance for user ${userId}:`, error);
        return null;
      }
    });

    const balances = await Promise.all(balancePromises);
    const balanceMap = new Map();
    balances.filter(Boolean).forEach(balance => {
      balanceMap.set(balance.userId, balance);
    });

    // Combine user data with balances
    const usersWithBalances = users.map(user => {
      const balance = balanceMap.get(user.uid);
      return {
        ...user,
        balance: balance ? {
          availableTokens: balance.availableTokens || 0,
          committedTokens: balance.committedTokens || 0,
          totalTokens: (balance.availableTokens || 0) + (balance.committedTokens || 0),
          totalEarned: balance.totalEarned || 0,
          totalSpent: balance.totalSpent || 0
        } : {
          availableTokens: 0,
          committedTokens: 0,
          totalTokens: 0,
          totalEarned: 0,
          totalSpent: 0
        }
      };
    });

    // Count users by source
    const sourceStats = {
      firebase_auth: users.filter(u => u.source === 'firebase_auth').length,
      firestore_only: users.filter(u => u.source === 'firestore_only').length,
      both: users.filter(u => u.source === 'both').length
    };

    console.log(`✅ Found ${usersWithBalances.length} total users:`, sourceStats);

    return NextResponse.json({
      success: true,
      users: usersWithBalances,
      count: usersWithBalances.length,
      totalUsers: allUsers.size,
      sourceStats,
      debug: {
        searchTerm: search,
        totalFetched: users.length,
        totalReturned: usersWithBalances.length,
        sources: sourceStats
      }
    });

  } catch (error) {
    console.error('❌ Error searching users:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to search users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}