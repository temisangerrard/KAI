"use client"

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, User, Coins, ChevronDown, Check } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  tokenBalance: number;
  level: number;
  totalPredictions: number;
  correctPredictions: number;
  balance: {
    availableTokens: number;
    committedTokens: number;
    totalEarned: number;
    totalSpent: number;
  };
}

interface UserSelectorProps {
  selectedUserId: string;
  selectedUserEmail: string;
  onUserSelect: (userId: string, userEmail: string, displayName: string) => void;
  disabled?: boolean;
}

export function UserSelector({ selectedUserId, selectedUserEmail, onUserSelect, disabled }: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTerm.length >= 2 || (isOpen && searchTerm.length === 0)) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchTerm, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', '10');

      const response = await fetch(`/api/admin/users/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: UserData) => {
    setSelectedUser(user);
    onUserSelect(user.id, user.email, user.displayName);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (users.length === 0) {
      searchUsers(); // Load recent users when opening
    }
  };

  const displayValue = selectedUser 
    ? `${selectedUser.displayName} (${selectedUser.email})`
    : selectedUserEmail 
    ? selectedUserEmail
    : '';

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          value={isOpen ? searchTerm : displayValue}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleInputFocus}
          placeholder="Search users by name, email, or username..."
          disabled={disabled}
          className="pr-10"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {loading && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-kai-600 rounded-full animate-spin"></div>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <Search className="w-5 h-5 mx-auto mb-2 animate-pulse" />
              Searching users...
            </div>
          ) : users.length > 0 ? (
            <div className="py-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.photoURL} />
                      <AvatarFallback>
                        {user.displayName?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 truncate">
                          {user.displayName}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          Level {user.level}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{user.email}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Coins className="w-3 h-3" />
                          <span>{user.balance.availableTokens.toLocaleString()} available</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {user.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>

                    {selectedUserId === user.id && (
                      <Check className="w-4 h-4 text-kai-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              <User className="w-5 h-5 mx-auto mb-2" />
              No users found matching "{searchTerm}"
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <Search className="w-5 h-5 mx-auto mb-2" />
              Type at least 2 characters to search users
            </div>
          )}
        </div>
      )}

      {selectedUser && (
        <div className="mt-2 p-3 bg-kai-50 border border-kai-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={selectedUser.photoURL} />
              <AvatarFallback>
                {selectedUser.displayName?.charAt(0)?.toUpperCase() || <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{selectedUser.displayName}</p>
              <p className="text-sm text-gray-600">{selectedUser.email}</p>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1 text-sm text-kai-700">
                  <Coins className="w-4 h-4" />
                  <span>{selectedUser.balance.availableTokens.toLocaleString()} tokens</span>
                </div>
                <div className="text-xs text-gray-500">
                  Total earned: {selectedUser.balance.totalEarned.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}