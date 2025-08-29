"use client"

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  User, 
  Coins, 
  Plus,
  RefreshCw,
  Mail,
  Calendar,
  Sync,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt?: any;
  lastLoginAt?: any;
  tokenBalance: number;
  level: number;
  totalPredictions: number;
  correctPredictions: number;
  signupMethod?: string;
  balance: {
    availableTokens: number;
    committedTokens: number;
    totalEarned: number;
    totalSpent: number;
  };
}

interface UsersListProps {
  onIssueTokens: (userId: string, userEmail: string, displayName: string) => void;
}

export function UsersList({ onIssueTokens }: UsersListProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);

  useEffect(() => {
    fetchUsers();
    checkSyncStatus();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { getAuthHeaders } = await import('@/lib/auth/admin-auth');
      const headers = await getAuthHeaders();
      
      const response = await fetch('/api/admin/users/search?limit=100', {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        console.log('Fetched users:', data.debug);
      } else if (response.status === 401) {
        console.error('Unauthorized access to admin API');
        // Redirect to login or show error
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const { getAuthHeaders } = await import('@/lib/auth/admin-auth');
      const headers = await getAuthHeaders();
      
      const response = await fetch('/api/admin/users/sync', { headers });
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  const syncUsers = async () => {
    try {
      setSyncing(true);
      const { getAuthHeaders } = await import('@/lib/auth/admin-auth');
      const headers = await getAuthHeaders();
      
      const response = await fetch('/api/admin/users/sync', { 
        method: 'POST',
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Sync completed:', data);
        await fetchUsers();
        await checkSyncStatus();
      }
    } catch (error) {
      console.error('Error syncing users:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Users</h3>
          <p className="text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </p>
          {syncStatus && (
            <div className="flex items-center gap-2 mt-2">
              {syncStatus.needsSync ? (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">
                    {syncStatus.stats.incompleteProfiles} users need sync
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs">All users synced</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={syncUsers}
            disabled={syncing}
          >
            <Sync className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Users'}
          </Button>
          <Button variant="outline" onClick={fetchUsers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search users by name, email, username, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Signup Method</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Total Earned</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.photoURL} />
                      <AvatarFallback>
                        {user.displayName?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{user.displayName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          Level {user.level}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {user.totalPredictions} predictions
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">
                        {user.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={user.signupMethod === 'email' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {user.signupMethod === 'email' ? 'Email' : 
                     user.signupMethod === 'google.com' ? 'Google' :
                     user.signupMethod === 'twitter.com' ? 'Twitter' :
                     user.signupMethod === 'facebook.com' ? 'Facebook' :
                     user.signupMethod || 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-kai-600" />
                    <span className="font-medium">
                      {user.balance.availableTokens.toLocaleString()}
                    </span>
                    {user.balance.committedTokens > 0 && (
                      <span className="text-xs text-gray-500">
                        (+{user.balance.committedTokens.toLocaleString()} committed)
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-green-600">
                    {user.balance.totalEarned.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {formatDate(user.createdAt)}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => onIssueTokens(user.id, user.email, user.displayName)}
                    className="bg-kai-600 hover:bg-kai-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Issue Tokens
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm ? `No users found matching "${searchTerm}"` : 'No users found'}
          </p>
        </div>
      )}
    </Card>
  );
}