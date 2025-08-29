import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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

    // Get all current admins
    const adminSnapshot = await getDocs(collection(db, 'admin_users'));
    const admins = adminSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ admins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admins' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await AdminAuthService.verifyAdminAuth(request);
    if (!authResult.isAdmin) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: authResult.error 
      }, { status: 401 });
    }

    const { userId, email, displayName, action } = await request.json();

    if (action === 'grant') {
      // Grant admin access
      await setDoc(doc(db, 'admin_users', userId), {
        userId,
        email,
        displayName,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        grantedBy: authResult.userId
      });

      // Also update user record
      await setDoc(doc(db, 'users', userId), {
        isAdmin: true
      }, { merge: true });

      return NextResponse.json({ 
        success: true, 
        message: `Admin access granted to ${displayName}` 
      });

    } else if (action === 'revoke') {
      // Revoke admin access
      await deleteDoc(doc(db, 'admin_users', userId));

      // Update user record
      await setDoc(doc(db, 'users', userId), {
        isAdmin: false
      }, { merge: true });

      return NextResponse.json({ 
        success: true, 
        message: `Admin access revoked from ${displayName}` 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error managing admin:', error);
    return NextResponse.json(
      { error: 'Failed to manage admin access' },
      { status: 500 }
    );
  }
}