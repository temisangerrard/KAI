"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/auth/auth-context';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
        error: null // Don't treat "not authenticated" as an error
      });
      return;
    }

    try {
      setAdminState(prev => ({ ...prev, loading: true, error: null }));
      
      console.log('🔍 Checking admin status for user:', {
        address: user.address,
        email: user.email,
        displayName: user.displayName
      });

      // Use Firebase UID from user object (now available with hybrid approach)
      const userId = user.id || user.address; // Fallback to address if id not available
      
      console.log('🔍 Checking admin_users collection for userId:', userId);
      const adminDoc = await getDoc(doc(db, 'admin_users', userId));
      
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
        console.log('❌ No admin document found for userId:', userId);
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
        error: null // Don't show admin errors to regular users
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