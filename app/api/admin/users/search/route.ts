import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/db/database';

async function verifyAdminAuth(request: NextRequest) {
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limitCount = parseInt(searchParams.get('limit') || '20');

    let users = [];

    if (search.length >= 2) {
      const usersSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          orderBy('email'),
          limit(limitCount)
        )
      );

      const profiles = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const searchLower = search.toLowerCase();
      users = profiles.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.displayName?.toLowerCase().includes(searchLower) ||
        user.username?.toLowerCase().includes(searchLower) ||
        user.id?.toLowerCase().includes(searchLower)
      );
    } else {
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
      displayName: user.displayName || 'Unknown User',
      photoURL: user.photoURL,
      createdAt: user.createdAt,
      tokenBalance: user.tokenBalance || 0,
      level: user.level || 1,
      totalPredictions: user.totalPredictions || 0,
      correctPredictions: user.correctPredictions || 0,
      streak: user.streak || 0,
      balance: balances.get(user.id) || {
        availableTokens: user.tokenBalance || 0,
        committedTokens: 0,
        totalEarned: 0,
        totalSpent: 0
      }
    }));

    return NextResponse.json({
      users: usersWithBalances,
      total: usersWithBalances.length
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}