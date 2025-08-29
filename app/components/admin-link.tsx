"use client"

import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import Link from 'next/link';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useAuth } from '@/app/auth/auth-context';

export function AdminLink() {
  const { user } = useAuth();
  const { isAdmin, loading } = useAdminAuth();
  const [showLink, setShowLink] = useState(false);

  useEffect(() => {
    // Only show the admin link if user is logged in and is an admin
    setShowLink(user !== null && isAdmin && !loading);
  }, [user, isAdmin, loading]);

  if (!showLink) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Link
        href="/admin"
        className="
          flex items-center gap-2 px-3 py-2 
          bg-white hover:bg-gray-50 
          text-gray-700 hover:text-gray-900
          text-sm font-medium
          rounded-lg shadow-md border border-gray-200
          transition-all duration-200
          hover:shadow-lg hover:scale-105
          focus:outline-none focus:ring-2 focus:ring-kai-500 focus:ring-offset-2
        "
        title="Admin Panel"
      >
        <Shield className="w-4 h-4" />
        <span className="hidden sm:inline">Admin</span>
      </Link>
    </div>
  );
}