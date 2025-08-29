import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/db/database';
import { AdminAuthService } from '@/lib/auth/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await AdminAuthService.verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: authResult.error 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limitCount = parseInt(searchParams.get('limit') || '20');

    let users = [];

    if (search.length >= 2) {
      // For search, we need to fetch more users and filter client-side
      // since Firestore doesn't support case-insensitive text search
      const usersSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          limit(Math.max(limitCount * 5, 100)) // Fetch more to ensure we find matches
        )
      );

      const profiles = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const searchLower = search.toLowerCase();
      users = profiles
        .filter(user => 
          user.email?.toLowerCase().includes(searchLower) ||
          user.displayName?.toLowerCase().includes(searchLower) ||
          user.username?.toLowerCase().includes(searchLower) ||
          user.id?.toLowerCase().includes(searchLower)
        )
        .slice(0, limitCount); // Limit results after filtering
    } else {
      // For general listing, try to get users ordered by creation date
      // If that fails (due to missing createdAt), fall back to unordered query
      try {
        const usersSnapshot = await getDocs(
          query(
            collection(db, 'users'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
          )
        );

        users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.warn('Failed to order by createdAt, falling back to unordered query:', error);
        // Fallback: get users without ordering (some users might not have createdAt)
        const usersSnapshot = await getDocs(
          query(
            collection(db, 'users'),
            limit(limitCount)
          )
        );

        users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
    }

    const userIds = users.map(user => user.id);
    const balances = new Map();

    if (userIds.length > 0) {
      const balancesSnapshot = await getDocs(collection(db, 'user_balances'));
      balancesSnapshot.docs.forEach(doc => {
        if (userIds.includes(doc.id)) {
          balances.set(doc.id, doc.data());
        }
      });
    }

    const usersWithBalances = users.map(user => ({
      id: user.id,
      email: user.email || 'No email',
      displayName: user.displayName || user.name || 'Unknown User', // Handle different name fields
      photoURL: user.photoURL || user.picture, // Handle different photo fields
      createdAt: user.createdAt || user.metadata?.creationTime || null,
      lastLoginAt: user.lastLoginAt || user.metadata?.lastSignInTime || null,
      tokenBalance: user.tokenBalance || 0,
      level: user.level || 1,
      totalPredictions: user.totalPredictions || 0,
      correctPredictions: user.correctPredictions || 0,
      streak: user.streak || 0,
      // Add signup method detection
      signupMethod: user.providerData?.length > 0 ? 
        user.providerData[0].providerId : 
        (user.email && !user.photoURL ? 'email' : 'unknown'),
      balance: balances.get(user.id) || {
        availableTokens: user.tokenBalance || 0,
        committedTokens: 0,
        totalEarned: 0,
        totalSpent: 0
      }
    }));

    // Sort users by creation date if available, otherwise by email
    usersWithBalances.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (a.createdAt && !b.createdAt) return -1;
      if (!a.createdAt && b.createdAt) return 1;
      return (a.email || '').localeCompare(b.email || '');
    });

    console.log(`Admin user search: Found ${usersWithBalances.length} users (search: "${search}")`);

    return NextResponse.json({
      users: usersWithBalances,
      total: usersWithBalances.length,
      debug: {
        searchTerm: search,
        totalFetched: users.length,
        totalReturned: usersWithBalances.length
      }
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}