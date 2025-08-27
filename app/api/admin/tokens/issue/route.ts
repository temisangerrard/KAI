import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, Timestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/db/database';
import { UserBalance, TokenTransaction } from '@/lib/types/token';

// TODO: Add admin authentication middleware
async function verifyAdminAuth(request: NextRequest) {
  return true;
}

interface TokenIssuanceRequest {
  userId: string;
  amount: number;
  reason: string;
  adminId: string;
  adminName: string;
  requiresApproval?: boolean;
}

interface TokenIssuanceRecord {
  id?: string;
  userId: string;
  amount: number;
  reason: string;
  adminId: string;
  adminName: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: TokenIssuanceRequest = await request.json();
    const { userId, amount, reason, adminId, adminName, requiresApproval = false } = body;

    // Validate required fields
    if (!userId || !amount || !reason || !adminId || !adminName) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, amount, reason, adminId, adminName' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Check if user exists in users collection
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user balance exists, create if not
    const userBalanceRef = doc(db, 'user_balances', userId);
    const userBalanceDoc = await getDoc(userBalanceRef);

    if (!userBalanceDoc.exists()) {
      // Create initial balance record
      const initialBalance: Omit<UserBalance, 'userId'> = {
        userId,
        availableTokens: 0,
        committedTokens: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: Timestamp.now(),
        version: 1
      };
      await setDoc(userBalanceRef, initialBalance);
    }

    // Create issuance record
    const issuanceRecord: Omit<TokenIssuanceRecord, 'id'> = {
      userId,
      amount,
      reason,
      adminId,
      adminName,
      status: requiresApproval ? 'pending' : 'approved',
      requestedAt: Timestamp.now()
    };

    const issuanceRef = await addDoc(collection(db, 'token_issuances'), issuanceRecord);

    // If no approval required, process immediately
    if (!requiresApproval) {
      await processTokenIssuance(issuanceRef.id, adminId, adminName);
      
      return NextResponse.json({
        id: issuanceRef.id,
        ...issuanceRecord,
        status: 'completed',
        message: 'Tokens issued successfully'
      });
    }

    return NextResponse.json({
      id: issuanceRef.id,
      ...issuanceRecord,
      message: 'Token issuance request created and pending approval'
    });
  } catch (error) {
    console.error('Error issuing tokens:', error);
    return NextResponse.json(
      { error: 'Failed to issue tokens' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { issuanceId, action, adminId, adminName, notes } = body;

    if (!issuanceId || !action || !adminId || !adminName) {
      return NextResponse.json(
        { error: 'Missing required fields: issuanceId, action, adminId, adminName' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    const issuanceRef = doc(db, 'token_issuances', issuanceId);
    const issuanceDoc = await getDoc(issuanceRef);

    if (!issuanceDoc.exists()) {
      return NextResponse.json(
        { error: 'Issuance record not found' },
        { status: 404 }
      );
    }

    const issuanceData = issuanceDoc.data() as TokenIssuanceRecord;

    if (issuanceData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Issuance request has already been processed' },
        { status: 400 }
      );
    }

    // Update issuance record
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      processedAt: Timestamp.now(),
      processedBy: adminName,
      notes: notes || ''
    };

    await updateDoc(issuanceRef, updateData);

    // If approved, process the token issuance
    if (action === 'approve') {
      await processTokenIssuance(issuanceId, adminId, adminName);
      updateData.status = 'completed';
      await updateDoc(issuanceRef, { status: 'completed' });
    }

    return NextResponse.json({
      id: issuanceId,
      ...issuanceData,
      ...updateData,
      message: `Token issuance ${action}d successfully`
    });
  } catch (error) {
    console.error('Error processing token issuance:', error);
    return NextResponse.json(
      { error: 'Failed to process token issuance' },
      { status: 500 }
    );
  }
}

async function processTokenIssuance(issuanceId: string, adminId: string, adminName: string) {
  const issuanceRef = doc(db, 'token_issuances', issuanceId);
  const issuanceDoc = await getDoc(issuanceRef);
  
  if (!issuanceDoc.exists()) {
    throw new Error('Issuance record not found');
  }

  const issuanceData = issuanceDoc.data() as TokenIssuanceRecord;

  // Use Firestore transaction to ensure atomicity
  await runTransaction(db, async (transaction) => {
    const userBalanceRef = doc(db, 'user_balances', issuanceData.userId);
    const userBalanceDoc = await transaction.get(userBalanceRef);

    if (!userBalanceDoc.exists()) {
      throw new Error('User balance not found');
    }

    const currentBalance = userBalanceDoc.data() as UserBalance;
    const newBalance: Partial<UserBalance> = {
      availableTokens: currentBalance.availableTokens + issuanceData.amount,
      totalEarned: currentBalance.totalEarned + issuanceData.amount,
      lastUpdated: Timestamp.now(),
      version: currentBalance.version + 1
    };

    // Update user balance
    transaction.update(userBalanceRef, newBalance);

    // Create transaction record
    const tokenTransaction: Omit<TokenTransaction, 'id'> = {
      userId: issuanceData.userId,
      type: 'win', // Using 'win' type for admin-issued tokens
      amount: issuanceData.amount,
      balanceBefore: currentBalance.availableTokens,
      balanceAfter: currentBalance.availableTokens + issuanceData.amount,
      relatedId: issuanceId,
      metadata: {
        adminIssuance: true,
        adminId,
        adminName,
        reason: issuanceData.reason,
        issuanceId
      },
      timestamp: Timestamp.now(),
      status: 'completed'
    };

    transaction.set(doc(collection(db, 'token_transactions')), tokenTransaction);
  });
}