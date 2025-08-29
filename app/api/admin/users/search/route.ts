import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/db/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 50;

    console.log(`🔍 Searching Firebase Auth users with term: "${search}", limit: ${limit}`);

    // Get users from Firebase Auth
    const { adminAuth } = await import('@/lib/firebase-admin');
    const listUsersResult = await adminAuth.listUsers(1000); // Get more users for search
    
    let users = listUsersResult.users.map(user => ({
      id: user.uid,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      createdAt: new Date(user.metadata.creationTime),
      lastSignIn: user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime) : null,
      providerData: user.providerData
    }));

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
          totalTokens: (balance.availableTokens || 0) + (balance.committedTokens || 0)
        } : {
          availableTokens: 0,
          committedTokens: 0,
          totalTokens: 0
        }
      };
    });

    console.log(`✅ Found ${usersWithBalances.length} users from Firebase Auth`);

    return NextResponse.json({
      success: true,
      users: usersWithBalances,
      count: usersWithBalances.length,
      totalAuthUsers: listUsersResult.users.length,
      debug: {
        searchTerm: search,
        totalFetched: users.length,
        totalReturned: usersWithBalances.length
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