import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/db/database';
import { AdminAuthService } from '@/lib/auth/admin-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Fetching admin users from Firestore...');

    // Get all current admins from Firestore
    const adminSnapshot = await getDocs(collection(db, 'admin_users'));
    const admins = adminSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Found ${admins.length} admin users`);
    return NextResponse.json({ 
      success: true,
      admins,
      count: admins.length 
    });
  } catch (error) {
    console.error('❌ Error fetching admins:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch admins',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, email, displayName, action } = await request.json();

    console.log(`🔧 ${action === 'grant' ? 'Granting' : 'Revoking'} admin access for ${email}`);

    if (action === 'grant') {
      // Grant admin access in Firestore
      const success = await AdminAuthService.setAdminStatus(userId, email, displayName, true);
      
      // Also try to set Firebase Admin custom claims (server-side only)
      try {
        const { adminAuth } = await import('@/lib/firebase-admin');
        await adminAuth.setCustomUserClaims(userId, { 
          admin: true,
          role: 'admin',
          updatedAt: new Date().toISOString()
        });
        console.log(`✅ Firebase Admin custom claims set for ${email}`);
      } catch (adminError) {
        console.warn('Firebase Admin claims update failed:', adminError.message);
      }
      
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: `Admin access granted to ${displayName}`
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to grant admin access' 
        }, { status: 500 });
      }

    } else if (action === 'revoke') {
      // Revoke admin access in Firestore
      const success = await AdminAuthService.setAdminStatus(userId, email, displayName, false);
      
      // Also try to remove Firebase Admin custom claims (server-side only)
      try {
        const { adminAuth } = await import('@/lib/firebase-admin');
        await adminAuth.setCustomUserClaims(userId, { 
          admin: false,
          role: 'user',
          updatedAt: new Date().toISOString()
        });
        console.log(`✅ Firebase Admin custom claims removed for ${email}`);
      } catch (adminError) {
        console.warn('Firebase Admin claims update failed:', adminError.message);
      }
      
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: `Admin access revoked from ${displayName}`
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to revoke admin access' 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action. Use "grant" or "revoke"' 
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Error managing admin:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to manage admin access',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}