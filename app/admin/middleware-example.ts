// Example admin authentication middleware
// This shows how you could implement admin authentication

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';

export async function adminAuthMiddleware(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Verify the Firebase token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Check if user has admin role
    const adminClaim = decodedToken.admin || false;
    if (!adminClaim) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // User is authenticated and is an admin
    return NextResponse.next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
}

// Example of how to set admin claims in Firebase
export async function setAdminClaim(uid: string) {
  try {
    await getAuth().setCustomUserClaims(uid, { admin: true });
    console.log(`Admin claim set for user: ${uid}`);
  } catch (error) {
    console.error('Error setting admin claim:', error);
  }
}