"use client"

import { Button } from '@/components/ui/button'
import { Bell, Search, User, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/app/auth/auth-context'

export function AdminHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kai-500 focus:border-transparent"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
          </Button>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.displayName || 'Admin User'}
              </p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <User className="w-5 h-5" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => logout()}
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Back to App */}
          <Link href="/markets">
            <Button variant="outline" size="sm">
              Back to App
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}