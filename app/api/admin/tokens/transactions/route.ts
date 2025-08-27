import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/db/database';

// TODO: Add admin authentication middleware
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
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Build query
    let baseQuery = collection(db, 'token_transactions');
    const constraints: any[] = [];

    // Add filters
    if (userId) {
      constraints.push(where('userId', '==', userId));
    }
    if (type) {
      constraints.push(where('type', '==', type));
    }
    if (status) {
      constraints.push(where('status', '==', status));
    }
    if (startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(new Date(startDate))));
    }
    if (endDate) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(new Date(endDate))));
    }

    // Add ordering and pagination
    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(pageSize));

    // Handle pagination
    if (page > 1) {
      // In a real implementation, you'd need to store the last document from previous page
      // For now, we'll use a simple offset approach (not recommended for large datasets)
      const offset = (page - 1) * pageSize;
      // This is a simplified approach - in production, use cursor-based pagination
    }

    const transactionsQuery = query(baseQuery, ...constraints);
    const snapshot = await getDocs(transactionsQuery);

    let transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp
    }));

    // Apply search filter (client-side for simplicity)
    if (search) {
      const searchLower = search.toLowerCase();
      transactions = transactions.filter(t => 
        t.userId?.toLowerCase().includes(searchLower) ||
        t.type?.toLowerCase().includes(searchLower) ||
        t.metadata?.predictionTitle?.toLowerCase().includes(searchLower) ||
        t.id?.toLowerCase().includes(searchLower)
      );
    }

    // Get total count for pagination (simplified)
    const totalQuery = query(collection(db, 'token_transactions'));
    const totalSnapshot = await getDocs(totalQuery);
    const totalCount = totalSnapshot.size;

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNext: page * pageSize < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}