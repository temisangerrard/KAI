/**
 * Responsive Layout Component
 * 
 * Handles the responsive layout with proper navigation for mobile and desktop
 */

"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import { Navigation } from "@/app/components/navigation"

interface ResponsiveLayoutProps {
  children: React.ReactNode
  showMobileNav?: boolean
}

export function ResponsiveLayout({ children, showMobileNav = true }: ResponsiveLayoutProps) {
  const isMobile = useIsMobile()

  return (
    <div className="min-h-screen">
      {/* Main content with proper spacing */}
      <main className={`
        ${isMobile && showMobileNav ? 'pb-20' : ''} 
        ${!isMobile ? 'ml-0' : ''}
      `}>
        {children}
      </main>
      
      {/* Mobile Navigation */}
      {showMobileNav && <Navigation />}
    </div>
  )
}