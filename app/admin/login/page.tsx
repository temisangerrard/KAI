"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth/auth-context';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { authService } from '@/lib/auth/auth-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Redirect if already authenticated and admin
  useEffect(() => {
    if (user && isAdmin && !adminLoading) {
      router.push('/admin/dashboard');
    }
  }, [user, isAdmin, adminLoading, router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      await authService.loginWithGoogle();
      // The useEffect above will handle the redirect once admin status is checked
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading if checking admin status
  if (user && adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-kai-600" />
          <h2 className="text-lg font-semibold mb-2">Checking Admin Access</h2>
          <p className="text-gray-600">Verifying your admin privileges...</p>
        </Card>
      </div>
    );
  }

  // Show access denied if logged in but not admin
  if (user && !isAdmin && !adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            Your account ({user.email}) does not have admin privileges.
          </p>
          <div className="flex gap-2 justify-center">
            <Button 
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </Button>
            <Button 
              onClick={() => authService.logout()}
              className="bg-kai-600 hover:bg-kai-700"
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-8 h-8 text-kai-600" />
            <h1 className="text-2xl font-bold text-gray-900">KAI Admin</h1>
          </div>
          <p className="text-gray-600">Sign in with your KAI account to access the admin dashboard</p>
          <p className="text-sm text-gray-500 mt-2">
            Only authorized users can access the admin panel
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="button"
          className="w-full bg-kai-600 hover:bg-kai-700"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Sign in with Google
        </Button>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Admin Access Control</p>
              <p className="mt-1">
                Admin access is controlled by the admin_users collection in Firestore.
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Sign in with your regular KAI account</li>
                <li>• Admin privileges are checked against the admin list</li>
                <li>• Only authorized users can access admin features</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}