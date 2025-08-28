"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { 
  Menu, 
  X, 
  Plus, 
  Settings, 
  HelpCircle, 
  LogOut,
  Sparkles,
  Home,
  Wallet,
  User
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "../auth/auth-context"
import { useTokenBalance } from "@/hooks/use-token-balance"

interface HamburgerMenuProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

export function HamburgerMenu({ isOpen, onToggle, onClose }: HamburgerMenuProps) {
  const router = useRouter()
  const { logout, user } = useAuth()
  const { totalTokens, isLoading: balanceLoading } = useTokenBalance()

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      // Prevent body scroll when menu is open
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  const handleNavigation = (path: string) => {
    router.push(path)
    onClose()
  }

  const handleLogout = () => {
    logout()
    onClose()
    router.push("/")
  }

  const menuItems = [
    {
      icon: Home,
      label: "Markets",
      description: "Discover & predict",
      onClick: () => handleNavigation("/markets"),
      primary: true
    },

    {
      icon: Wallet,
      label: "Wallet",
      description: "Manage tokens",
      onClick: () => handleNavigation("/wallet")
    },
    {
      icon: User,
      label: "Profile",
      description: "Your account",
      onClick: () => handleNavigation("/profile")
    },
    {
      icon: Plus,
      label: "Create Market",
      description: "Share your prediction",
      onClick: () => handleNavigation("/markets/create"),
      primary: false
    },
    {
      icon: Settings,
      label: "Settings",
      description: "Account preferences",
      onClick: () => handleNavigation("/settings")
    },
    {
      icon: LogOut,
      label: "Sign Out",
      description: "Leave the app",
      onClick: handleLogout,
      danger: true
    }
  ]

  return (
    <>
      {/* Hamburger Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="relative z-50 text-gray-600 hover:text-kai-600 hover:bg-kai-50"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-controls="hamburger-menu"
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Menu Drawer */}
      <div
        id="hamburger-menu"
        className={`
          fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-kai-500 to-primary-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 id="menu-title" className="text-xl font-bold">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">
                {user?.displayName?.charAt(0) || "U"}
              </span>
            </div>
            <div>
              <p className="font-semibold">{user?.displayName || "User"}</p>
              <div className="flex items-center gap-1 text-white/80 text-sm">
                <Sparkles className="w-3 h-3" />
                <span>{balanceLoading ? '...' : totalTokens.toLocaleString()} tokens</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-4 space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                onClick={item.onClick}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-xl text-left transition-colors
                  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-kai-500 focus:ring-offset-2
                  ${item.primary ? "bg-kai-50 border border-kai-200" : ""}
                  ${item.danger ? "hover:bg-red-50 text-red-600" : "text-gray-700"}
                `}
              >
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center
                  ${item.primary ? "bg-kai-500 text-white" : 
                    item.danger ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gray-50">
          <p className="text-center text-xs text-gray-500">
            KAI Prediction Platform v1.0
          </p>
        </div>
      </div>
    </>
  )
}