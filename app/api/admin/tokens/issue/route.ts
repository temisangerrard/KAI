import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, Timestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/db/database';
import { UserBalance, TokenTransaction } from '@/lib/types/token';
import { AdminAuthService } from '@/lib/auth/admin-auth';



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
    const authResult = await AdminAuthService.verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      console.log('❌ Token issuance denied: Admin authentication failed');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized', 
        message: authResult.error || 'Admin privileges required'
      }, { status: 401 });
    }

    const body: TokenIssuanceRequest = await request.json();
    const { userId, amount, reason, adminId, adminName, requiresApproval = false } = body;

    // Validate required fields
    if (!userId || !amount || !reason || !adminId || !adminName) {
      console.log('❌ Token issuance failed: Missing required fields');
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'Missing required fields: userId, amount, reason, adminId, adminName'
      }, { status: 400 });
    }

    if (amount <= 0) {
      console.log('❌ Token issuance failed: Invalid amount');
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'Amount must be positive'
      }, { status: 400 });
    }

    // Check if user exists in users collection, create if missing
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log(`⚠️ User ${userId} not found in users collection, checking Firebase Auth...`);
    console.log(`🔍 Debug info - User ID: "${userId}", Type: ${typeof userId}, Length: ${userId.length}`);
      
      try {
        // Check if user exists in Firebase Auth
        const { adminAuth } = await import('@/lib/firebase-admin');
        console.log(`🔍 Attempting to get user from Firebase Auth with ID: "${userId}"`);
        const authUser = await adminAuth.getUser(userId);
        
        if (authUser) {
          console.log(`✅ User ${userId} found in Firebase Auth, creating missing Firestore document...`);
          
          // Create missing user document
          const { serverTimestamp } = await import('firebase/firestore');
          const userProfile = {
            uid: authUser.uid,
            email: authUser.email || "",
            displayName: authUser.displayName || "",
            photoURL: authUser.photoURL || undefined,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            tokenBalance: 2500, // Starting tokens
            level: 1,
            totalPredictions: 0,
            correctPredictions: 0,
            streak: 0
          };
          
          const { setDoc } = await import('firebase/firestore');
          await setDoc(userRef, userProfile);
          console.log(`✅ Created missing user document for ${userId}`);
        } else {
          console.log(`❌ User ${userId} not found in Firebase Auth either`);
          return NextResponse.json({
            success: false,
            error: 'User not found',
            message: `User with ID ${userId} does not exist in Firebase Auth`
          }, { status: 404 });
        }
      } catch (authError) {
        console.error(`❌ Error checking Firebase Auth for user ${userId}:`, authError);
        
        // If Firebase Admin fails, create a basic user document anyway
        // This handles cases where the user was found in search but Firebase Admin has issues
        console.log(`⚠️ Firebase Admin error, creating basic user document for ${userId}...`);
        
        try {
          const { serverTimestamp, setDoc } = await import('firebase/firestore');
          const basicUserProfile = {
            uid: userId,
            email: "", // We don't have this info without Firebase Auth
            displayName: "",
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            tokenBalance: 2500, // Starting tokens
            level: 1,
            totalPredictions: 0,
            correctPredictions: 0,
            streak: 0
          };
          
          await setDoc(userRef, basicUserProfile);
          console.log(`✅ Created basic user document for ${userId} despite Firebase Auth error`);
        } catch (createError) {
          console.error(`❌ Failed to create basic user document:`, createError);
          return NextResponse.json({
            success: false,
            error: 'User not found',
            message: `User with ID ${userId} does not exist and could not be created`
          }, { status: 404 });
        }
      }
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
      
      console.log(`✅ Tokens issued successfully: ${amount} tokens to user ${userId} by admin ${adminId}`);
      return NextResponse.json({
        success: true,
        id: issuanceRef.id,
        ...issuanceRecord,
        status: 'completed',
        message: 'Tokens issued successfully'
      });
    }

    console.log(`✅ Token issuance request created: ${amount} tokens for user ${userId} (pending approval)`);
    return NextResponse.json({
      success: true,
      id: issuanceRef.id,
      ...issuanceRecord,
      message: 'Token issuance request created and pending approval'
    });
  } catch (error) {
    console.error('❌ Error issuing tokens:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to issue tokens',
      message: 'An internal server error occurred while processing the token issuance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await AdminAuthService.verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      console.log('❌ Token issuance approval denied: Admin authentication failed');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized', 
        message: authResult.error || 'Admin privileges required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { issuanceId, action, adminId, adminName, notes } = body;

    if (!issuanceId || !action || !adminId || !adminName) {
      console.log('❌ Token issuance approval failed: Missing required fields');
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'Missing required fields: issuanceId, action, adminId, adminName'
      }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      console.log(`❌ Token issuance approval failed: Invalid action "${action}"`);
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'Action must be either "approve" or "reject"'
      }, { status: 400 });
    }

    const issuanceRef = doc(db, 'token_issuances', issuanceId);
    const issuanceDoc = await getDoc(issuanceRef);

    if (!issuanceDoc.exists()) {
      console.log(`❌ Token issuance approval failed: Issuance record ${issuanceId} not found`);
      return NextResponse.json({
        success: false,
        error: 'Issuance record not found',
        message: `Token issuance record with ID ${issuanceId} does not exist`
      }, { status: 404 });
    }

    const issuanceData = issuanceDoc.data() as TokenIssuanceRecord;

    if (issuanceData.status !== 'pending') {
      console.log(`❌ Token issuance approval failed: Request ${issuanceId} already processed (status: ${issuanceData.status})`);
      return NextResponse.json({
        success: false,
        error: 'Request already processed',
        message: `Issuance request has already been ${issuanceData.status}`
      }, { status: 400 });
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

    console.log(`✅ Token issuance ${action}d successfully: ${issuanceId}`);
    return NextResponse.json({
      success: true,
      id: issuanceId,
      ...issuanceData,
      ...updateData,
      message: `Token issuance ${action}d successfully`
    });
  } catch (error) {
    console.error('❌ Error processing token issuance:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process token issuance',
      message: 'An internal server error occurred while processing the approval',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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