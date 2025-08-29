"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useAuth } from '@/app/auth/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, Loader2 } from 'lucide-react';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading, error, refreshAdminStatus } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    // If not authenticated and not loading, redirect to login
    if (!authLoading && !user) {
      router.push('/admin/login');
    }
  }, [user, authLoading, router]);

  // Show loading state
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-kai-600" />
          <h2 className="text-lg font-semibold mb-2">Verifying Access</h2>
          <p className="text-gray-600">Checking admin permissions...</p>
        </Card>
      </div>
    );
  }

  // Show login required
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in to access the admin dashboard.
          </p>
          <Button 
            onClick={() => router.push('/admin/login')}
            className="bg-kai-600 hover:bg-kai-700"
          >
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  // Show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have admin privileges to access this area.
          </p>
          {error && (
            <p className="text-sm text-red-600 mb-4">
              Error: {error}
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button 
              variant="outline"
              onClick={refreshAdminStatus}
            >
              Retry
            </Button>
            <Button 
              onClick={() => router.push('/dashboard')}
              className="bg-kai-600 hover:bg-kai-700"
            >
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // User is authenticated and is admin
  return <>{children}</>;
}