"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth/auth-context';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while still loading
    if (authLoading || adminLoading) return;

    // If not authenticated, go to login
    if (!user) {
      router.push('/admin/login');
      return;
    }

    // If authenticated and is admin, go to dashboard
    if (isAdmin) {
      router.push('/admin/dashboard');
      return;
    }

    // If authenticated but not admin, go to login (will show access denied)
    router.push('/admin/login');
  }, [user, isAdmin, authLoading, adminLoading, router]);

  // Show loading while determining where to redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-kai-600" />
        <h2 className="text-lg font-semibold mb-2">Loading Admin Panel</h2>
        <p className="text-gray-600">Checking authentication...</p>
      </Card>
    </div>
  );
}