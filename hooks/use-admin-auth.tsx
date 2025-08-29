"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/auth/auth-context';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/db/database';

interface AdminAuthState {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useAdminAuth() {
  const { user } = useAuth();
  const [adminState, setAdminState] = useState<AdminAuthState>({
    isAdmin: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setAdminState({
        isAdmin: false,
        loading: false,
        error: 'Not authenticated'
      });
      return;
    }

    try {
      setAdminState(prev => ({ ...prev, loading: true, error: null }));
      
      console.log('🔍 Checking admin status for user:', {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      });

      // Check admin_users collection in Firestore
      console.log('🔍 Checking admin_users collection for ID:', user.id);
      const adminDoc = await getDoc(doc(db, 'admin_users', user.id));
      
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        console.log('✅ Found admin document:', adminData);
        
        // Check if user is active admin
        const isAdmin = adminData?.isActive === true;
        console.log('🎯 Admin status from admin_users:', isAdmin);
        
        setAdminState({
          isAdmin,
          loading: false,
          error: null
        });
      } else {
        console.log('❌ No document found in admin_users collection');
        setAdminState({
          isAdmin: false,
          loading: false,
          error: null
        });
      }

    } catch (error) {
      console.error('💥 Error checking admin status:', error);
      setAdminState({
        isAdmin: false,
        loading: false,
        error: 'Failed to check admin status'
      });
    }
  };

  const refreshAdminStatus = () => {
    checkAdminStatus();
  };

  return {
    ...adminState,
    refreshAdminStatus
  };
}