import { NextRequest } from 'next/server';

/**
 * Admin Authentication Service using Firestore only
 * Simple admin check based on admin_users collection
 */
export class AdminAuthService {
  /**
   * Check if user is admin based on Firestore admin_users collection
   */
  static async checkUserIsAdmin(userId: string): Promise<boolean> {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/db/database');
      
      // Check admin_users collection
      const adminDoc = await getDoc(doc(db, 'admin_users', userId));
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        return adminData?.isActive === true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Set admin status in Firestore
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
}

