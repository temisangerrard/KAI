"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Sparkles, 
  ChevronDown, 
  Plus, 
  Settings, 
  LogOut,
  User,
  Wallet
} from "lucide-react"
import { useAuth } from "../auth/auth-context"
import { useTokenBalance } from "@/hooks/use-token-balance"
import { cn } from "@/lib/utils"
import { HamburgerMenu } from "./hamburger-menu"
import { useHamburgerMenu } from "@/hooks/use-hamburger-menu"

export function TopNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { totalTokens, isLoading: balanceLoading, availableTokens, committedTokens } = useTokenBalance()
  
  // Debug logging for balance changes
  useEffect(() => {
    console.log('[TOP_NAV] Balance updated:', { totalTokens, availableTokens, committedTokens, isLoading: balanceLoading })
  }, [totalTokens, availableTokens, committedTokens, balanceLoading])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hamburgerMenu = useHamburgerMenu()

  // Navigation items
  const navItems = [
    { id: "markets", label: "Markets", href: "/markets" },
    { id: "wallet", label: "Wallet", href: "/wallet" },
    { id: "profile", label: "Profile", href: "/profile" },
  ]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }

    if (showUserDropdown) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showUserDropdown])

  // Handle navigation
  const handleNavigation = (href: string) => {
    router.push(href)
  }

  // Handle logout
  const handleLogout = () => {
    logout()
    setShowUserDropdown(false)
    router.push("/")
  }

  // Check if nav item is active
  const isActive = (href: string) => {
    if (href === "/markets") {
      return pathname === "/markets"
    }
    if (href === "/wallet") {
      return pathname === "/wallet"
    }
    return pathname === href
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Side - Hamburger Menu + Logo */}
          <div className="flex items-center gap-4">
            {/* Hamburger Menu - Always visible */}
            <HamburgerMenu 
              isOpen={hamburgerMenu.isOpen}
              onToggle={hamburgerMenu.toggle}
              onClose={hamburgerMenu.close}
            />
            
            {/* Logo */}
            <div 
              className="text-2xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text cursor-pointer"
              onClick={() => router.push("/markets")}
            >
              KAI
            </div>
          </div>

          {/* Main Navigation - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                  isActive(item.href)
                    ? "text-kai-600 bg-kai-50"
                    : "text-gray-600 hover:text-kai-600 hover:bg-kai-50"
                )}
              >
                {item.label}
                {isActive(item.href) && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-kai-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            
            {/* Token Balance - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-2 bg-kai-50 px-3 py-2 rounded-full">
              <Sparkles className="w-4 h-4 text-kai-600" />
              <span className="font-semibold text-kai-700 text-sm">
                {balanceLoading ? '...' : availableTokens.toLocaleString()}
              </span>
              <span className="text-kai-600 text-xs">available</span>
            </div>

            {/* User Dropdown - Hidden on mobile */}
            <div className="hidden md:block relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-50 transition-colors"
                aria-expanded={showUserDropdown}
                aria-haspopup="true"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.profileImage} />
                  <AvatarFallback className="bg-kai-100 text-kai-700 text-sm">
                    {user?.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className={cn(
                  "w-4 h-4 text-gray-500 transition-transform",
                  showUserDropdown && "rotate-180"
                )} />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user?.profileImage} />
                        <AvatarFallback className="bg-kai-100 text-kai-700">
                          {user?.displayName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{user?.displayName}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        router.push("/markets/create")
                        setShowUserDropdown(false)
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-kai-50 hover:text-kai-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Market
                    </button>
                    
                    <button
                      onClick={() => {
                        router.push("/wallet")
                        setShowUserDropdown(false)
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-kai-50 hover:text-kai-600 transition-colors"
                    >
                      <Wallet className="w-4 h-4" />
                      Smart Wallet
                    </button>

                    <button
                      onClick={() => {
                        router.push("/profile")
                        setShowUserDropdown(false)
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-kai-50 hover:text-kai-600 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      View Profile
                    </button>

                    <button
                      onClick={() => {
                        router.push("/settings")
                        setShowUserDropdown(false)
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-kai-50 hover:text-kai-600 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}