"use client"

import { useState, useEffect } from "react"
import { Home, TrendingUp, User, Wallet, MessageSquare } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"

export function Navigation() {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState("home")
  const isMobile = useIsMobile()

  // Update active tab based on current pathname
  useEffect(() => {
    if (pathname === "/markets") setActiveTab("markets")
    else if (pathname === "/social") setActiveTab("social")
    else if (pathname === "/wallet") setActiveTab("wallet")
    else if (pathname === "/profile") setActiveTab("profile")
  }, [pathname])

  const navItems = [
    { id: "markets", icon: Home, label: "Markets", href: "/markets" },
    { id: "social", icon: MessageSquare, label: "Social", href: "/social" },
    { id: "wallet", icon: Wallet, label: "Wallet", href: "/wallet" },
    { id: "profile", icon: User, label: "Profile", href: "/profile" },
  ]

  // Mobile: Bottom tab bar
  if (isMobile) {
    return (
      <nav 
        className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 z-50 shadow-lg"
        aria-label="Main navigation"
        role="navigation"
      >
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Navigate to ${item.label}${isActive ? ', current page' : ''}`}
                className={`
                  flex flex-col items-center py-2 px-3 rounded-lg transition-colors 
                  focus:outline-none focus:ring-2 focus:ring-kai-500 focus:ring-offset-2
                  min-w-[44px] min-h-[44px] touch-manipulation
                  ${isActive ? "text-kai-700 bg-kai-100 font-medium" : "text-gray-600 hover:text-kai-600 hover:bg-kai-50"}
                `}
              >
                <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
                <span className="text-xs font-medium">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  // Desktop: Don't show navigation (pages handle their own desktop nav)
  return null
}