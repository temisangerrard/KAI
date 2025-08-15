"use client"

import { useState, useEffect } from "react"
import { Home, TrendingUp, User, Wallet, MessageSquare } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function Navigation() {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState("home")

  // Update active tab based on current pathname
  useEffect(() => {
    if (pathname === "/dashboard") setActiveTab("home")
    else if (pathname === "/trending") setActiveTab("trending")
    else if (pathname === "/wallet") setActiveTab("wallet")
    else if (pathname === "/social") setActiveTab("social")
    else if (pathname === "/profile") setActiveTab("profile")
  }, [pathname])

  const navItems = [
    { id: "home", icon: Home, label: "Home", href: "/dashboard" },
    { id: "trending", icon: TrendingUp, label: "Trending", href: "/trending" },
    { id: "wallet", icon: Wallet, label: "Wallet", href: "/wallet" },
    { id: "social", icon: MessageSquare, label: "Social", href: "/social" },
    { id: "profile", icon: User, label: "Profile", href: "/profile" },
  ]

  return (
    <nav 
      className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 z-50"
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
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-kai-500 focus:ring-offset-2 ${
                isActive ? "text-kai-700 bg-kai-100 font-medium" : "text-gray-600 hover:text-kai-600 hover:bg-kai-50"
              }`}
            >
              <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
              <span className="text-xs font-medium">{item.label}</span>
              <span className="sr-only">
                {isActive ? `Current page: ${item.label}` : `Navigate to ${item.label}`}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}