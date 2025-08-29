"use client"

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Search,
  User,
  Crown
} from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth/admin-auth';

interface Admin {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  createdAt?: any;
}

interface UserData {
  id: string;
  email: string;
  displayName: string;
  isAdmin?: boolean;
}

export function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
    fetchUsers();
  }, []);

  const fetchAdmins = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/manage-admins', { headers });
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/users/search?limit=50', { headers });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAction = async (user: UserData, action: 'grant' | 'revoke') => {
    try {
      setActionLoading(user.id);
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/manage-admins', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          displayName: user.displayName,
          action
        })
      });

      if (response.ok) {
        await fetchAdmins();
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error managing admin:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const nonAdminUsers = filteredUsers.filter(user => !user.isAdmin);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Admins */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-kai-600" />
          <h3 className="text-lg font-semibold">Current Admins</h3>
          <Badge variant="secondary">{admins.length}</Badge>
        </div>
        
        {admins.length === 0 ? (
          <p className="text-gray-500">No admins found.</p>
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">{admin.displayName}</p>
                    <p className="text-sm text-gray-600">{admin.email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAdminAction(admin as any, 'revoke')}
                  disabled={actionLoading === admin.id}
                  className="text-red-600 hover:text-red-700"
                >
                  <ShieldX className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Grant Admin Access */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-kai-600" />
          <h3 className="text-lg font-semibold">Grant Admin Access</h3>
        </div>
        
        {/* Search Users */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search users by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Non-Admin Users */}
        {nonAdminUsers.length === 0 ? (
          <p className="text-gray-500">
            {searchTerm ? 'No users found matching your search.' : 'All users are already admins.'}
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {nonAdminUsers.slice(0, 10).map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAdminAction(user, 'grant')}
                  disabled={actionLoading === user.id}
                  className="bg-kai-600 hover:bg-kai-700"
                >
                  <ShieldCheck className="w-4 h-4 mr-1" />
                  Make Admin
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}