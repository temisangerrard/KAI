import { NextRequest } from 'next/server';

/**
 * Simple Admin Authentication Service using Firestore only
 * Keeps Firebase Admin SDK usage limited to API routes only
 */
export class AdminAuthService {
  /**
   * Check if user is admin based on Firestore admin_users collection
   */
  static async checkUserIsAdmin(userId: string): Promise<boolean> {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/db/database');
    
    // Check admin_users collection
    const adminDoc = await getDoc(doc(db, 'admin_users', userId));
    if (adminDoc.exists()) {
      const adminData = adminDoc.data();
      return adminData?.isActive === true;
    }
    
    return false;
  }

  /**
   * Set admin status in Firestore (Firebase Admin operations happen in API routes)
   */
  static async setAdminStatus(userId: string, email: string, displayName: string, isAdmin: boolean = true): Promise<boolean> {
    try {
      const { doc, setDoc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/db/database');
      
      if (isAdmin) {
        // Add to admin_users collection
        await setDoc(doc(db, 'admin_users', userId), {
          userId,
          email,
          displayName,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        // Remove from admin_users collection
        await deleteDoc(doc(db, 'admin_users', userId));
      }

      console.log(`Admin status ${isAdmin ? 'granted' : 'revoked'} for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error setting admin status:', error);
      return false;
    }
  }

  /**
   * Verify admin authentication for API routes
   * Returns consistent error structure for admin endpoints
   */
  static async verifyAdminAuth(request: NextRequest): Promise<{ isAdmin: boolean; error?: string; userId?: string }> {
    try {
      // Get user ID from request headers (using same logic as useAdminAuth: user.id || user.address)
      const userId = request.headers.get('x-user-id');
      
      if (!userId) {
        console.log('❌ Admin auth failed: No user ID provided in request headers');
        return { 
          isAdmin: false, 
          error: 'Authentication required. Please ensure you are logged in.' 
        };
      }

      console.log(`🔍 Verifying admin status for user: ${userId}`);

      // Use the same AdminAuthService.checkUserIsAdmin method as the admin interface
      const isAdmin = await AdminAuthService.checkUserIsAdmin(userId);
      
      if (isAdmin) {
        console.log(`✅ Admin verification successful for ${userId}`);
        return { isAdmin: true, userId };
      } else {
        console.log(`❌ Admin verification failed for ${userId}: User is not an admin`);
        return { 
          isAdmin: false, 
          error: 'Access denied. Admin privileges required.' 
        };
      }
      
    } catch (error) {
      console.error('❌ Error during admin authentication:', error);
      return { 
        isAdmin: false, 
        error: 'Authentication service temporarily unavailable. Please try again.' 
      };
    }
  }
}

/**
 * Helper function to get auth headers for admin API calls
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  // This would typically get the current user's ID token
  // For now, return empty headers - implement based on your auth flow
  return {};
}

