import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/db/database';

// TODO: Add admin authentication middleware
async function verifyAdminAuth(request: NextRequest) {
  // Placeholder for admin authentication
  // In production, verify JWT token and admin role
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get token economy statistics
    const stats = await getTokenEconomyStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching token stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token statistics' },
      { status: 500 }
    );
  }
}

async function getTokenEconomyStats() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all user balances
  const balancesSnapshot = await getDocs(collection(db, 'user_balances'));
  const balances = balancesSnapshot.docs.map(doc => doc.data());

  // Calculate total tokens in circulation
  const totalTokensInCirculation = balances.reduce((sum, balance) => 
    sum + (balance.availableTokens || 0) + (balance.committedTokens || 0), 0
  );

  const totalAvailableTokens = balances.reduce((sum, balance) => 
    sum + (balance.availableTokens || 0), 0
  );

  const totalCommittedTokens = balances.reduce((sum, balance) => 
    sum + (balance.committedTokens || 0), 0
  );

  // Get recent transactions for trend analysis
  const transactionsSnapshot = await getDocs(
    query(
      collection(db, 'token_transactions'),
      orderBy('timestamp', 'desc'),
      limit(1000)
    )
  );

  const transactions = transactionsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Calculate purchase statistics
  const purchaseTransactions = transactions.filter(t => t.type === 'purchase' && t.status === 'completed');
  const totalPurchases = purchaseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const recentPurchases = purchaseTransactions.filter(t => 
    t.timestamp && t.timestamp.toDate() > yesterday
  );
  const dailyPurchases = recentPurchases.reduce((sum, t) => sum + (t.amount || 0), 0);

  const weeklyPurchases = purchaseTransactions.filter(t => 
    t.timestamp && t.timestamp.toDate() > lastWeek
  ).reduce((sum, t) => sum + (t.amount || 0), 0);

  // Calculate payout statistics
  const payoutTransactions = transactions.filter(t => t.type === 'win' && t.status === 'completed');
  const totalPayouts = payoutTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  const dailyPayouts = payoutTransactions.filter(t => 
    t.timestamp && t.timestamp.toDate() > yesterday
  ).reduce((sum, t) => sum + (t.amount || 0), 0);

  // Get active users (users with transactions in last 30 days)
  const activeUsers = new Set(
    transactions
      .filter(t => t.timestamp && t.timestamp.toDate() > lastMonth)
      .map(t => t.userId)
  ).size;

  // Get token packages
  const packagesSnapshot = await getDocs(
    query(collection(db, 'token_packages'), where('isActive', '==', true))
  );
  const activePackages = packagesSnapshot.size;

  return {
    circulation: {
      totalTokens: totalTokensInCirculation,
      availableTokens: totalAvailableTokens,
      committedTokens: totalCommittedTokens,
      totalUsers: balances.length,
      activeUsers
    },
    purchases: {
      totalPurchases,
      dailyPurchases,
      weeklyPurchases,
      totalTransactions: purchaseTransactions.length
    },
    payouts: {
      totalPayouts,
      dailyPayouts,
      totalPayoutTransactions: payoutTransactions.length
    },
    packages: {
      activePackages,
      totalRevenue: totalPurchases * 0.1 // Assuming $0.10 per token average
    },
    trends: {
      dailyTransactionCount: transactions.filter(t => 
        t.timestamp && t.timestamp.toDate() > yesterday
      ).length,
      weeklyTransactionCount: transactions.filter(t => 
        t.timestamp && t.timestamp.toDate() > lastWeek
      ).length
    }
  };
}