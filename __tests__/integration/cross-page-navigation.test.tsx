/**
 * Cross-Page Navigation Test
 * 
 * This test verifies that navigation works correctly when moving between
 * actual page components (markets, wallet, profile) and that active states
 * update properly across all pages.
 * 
 * Requirements: 3.3 (Update Navigation Layout)
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { Navigation } from '@/app/components/navigation'
import { TopNavigation } from '@/app/components/top-navigation'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(),
}))

// Mock mobile hook
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(),
}))

// Mock auth context
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-user',
      email: 'test@example.com',
      displayName: 'Test User',
      profileImage: null
    },
    logout: jest.fn()
  })
}))

// Mock token balance hook
jest.mock('@/hooks/use-token-balance', () => ({
  useTokenBalance: () => ({
    totalTokens: 500,
    availableTokens: 300,
    committedTokens: 200,
    isLoading: false
  })
}))

// Mock hamburger menu hook
jest.mock('@/hooks/use-hamburger-menu', () => ({
  useHamburgerMenu: () => ({
    isOpen: false,
    toggle: jest.fn(),
    close: jest.fn()
  })
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

describe('Cross-Page Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Navigation across all pages', () => {
    const testPages = [
      { path: '/markets', name: 'Markets', shouldBeActive: true },
      { path: '/wallet', name: 'Wallet', shouldBeActive: true },
      { path: '/profile', name: 'Profile', shouldBeActive: true },
      { path: '/markets/discover', name: 'Markets', shouldBeActive: false }, // Sub-pages should not show parent as active
      { path: '/markets/create', name: 'Markets', shouldBeActive: false }, // Sub-pages should not show parent as active
      { path: '/profile/edit', name: 'Profile', shouldBeActive: false }, // Sub-pages should not show parent as active
    ]

    testPages.forEach(({ path, name, shouldBeActive }) => {
      describe(`On ${path} page`, () => {
        beforeEach(() => {
          mockUsePathname.mockReturnValue(path)
        })

        it('should show correct active state in mobile navigation', () => {
          require('@/hooks/use-mobile').useIsMobile.mockReturnValue(true)
          
          render(<Navigation />)
          
          if (shouldBeActive) {
            // Check that the correct navigation item is active
            const activeLabel = `Navigate to ${name}, current page`
            expect(screen.getByLabelText(activeLabel)).toBeInTheDocument()
          } else {
            // Check that no navigation item is active for sub-pages
            const allItems = ['Markets', 'Wallet', 'Profile']
            allItems.forEach(item => {
              const inactiveLabel = `Navigate to ${item}`
              const inactiveElement = screen.getByLabelText(inactiveLabel)
              expect(inactiveElement).not.toHaveAttribute('aria-current', 'page')
            })
          }
        })

        it('should show correct active state in desktop navigation', () => {
          require('@/hooks/use-mobile').useIsMobile.mockReturnValue(false)
          
          render(<TopNavigation />)
          
          if (shouldBeActive) {
            // Check that the correct navigation button is active
            const activeButton = screen.getByRole('button', { name })
            expect(activeButton).toHaveClass('text-kai-600', 'bg-kai-50')
            
            // Check that other buttons are not active
            const allItems = ['Markets', 'Wallet', 'Profile']
            const inactiveItems = allItems.filter(item => item !== name)
            
            inactiveItems.forEach(item => {
              const inactiveButton = screen.getByRole('button', { name: item })
              expect(inactiveButton).toHaveClass('text-gray-600')
              expect(inactiveButton).not.toHaveClass('text-kai-600', 'bg-kai-50')
            })
          } else {
            // Check that no navigation button is active for sub-pages
            const allItems = ['Markets', 'Wallet', 'Profile']
            allItems.forEach(item => {
              const inactiveButton = screen.getByRole('button', { name: item })
              expect(inactiveButton).toHaveClass('text-gray-600')
              expect(inactiveButton).not.toHaveClass('text-kai-600', 'bg-kai-50')
            })
          }
        })
      })
    })
  })

  describe('Navigation consistency', () => {
    it('should maintain 3-item layout across all pages', () => {
      const pages = ['/markets', '/wallet', '/profile']
      
      pages.forEach(page => {
        mockUsePathname.mockReturnValue(page)
        require('@/hooks/use-mobile').useIsMobile.mockReturnValue(true)
        
        const { unmount } = render(<Navigation />)
        
        // Should always have exactly 3 navigation items
        const navLinks = screen.getAllByRole('link')
        expect(navLinks).toHaveLength(3)
        
        // Should have the correct items
        expect(screen.getByLabelText(/Navigate to Markets/)).toBeInTheDocument()
        expect(screen.getByLabelText(/Navigate to Wallet/)).toBeInTheDocument()
        expect(screen.getByLabelText(/Navigate to Profile/)).toBeInTheDocument()
        
        // Should not have social
        expect(screen.queryByLabelText(/Navigate to Social/)).not.toBeInTheDocument()
        
        unmount()
      })
    })

    it('should maintain proper spacing and accessibility across all pages', () => {
      const pages = ['/markets', '/wallet', '/profile']
      
      pages.forEach(page => {
        mockUsePathname.mockReturnValue(page)
        require('@/hooks/use-mobile').useIsMobile.mockReturnValue(true)
        
        const { unmount } = render(<Navigation />)
        
        // Check touch targets
        const navLinks = screen.getAllByRole('link')
        navLinks.forEach(link => {
          expect(link).toHaveClass('min-w-[44px]', 'min-h-[44px]')
        })
        
        // Check accessibility
        const nav = screen.getByRole('navigation')
        expect(nav).toHaveAttribute('aria-label', 'Main navigation')
        
        unmount()
      })
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle unknown paths gracefully', () => {
      mockUsePathname.mockReturnValue('/unknown-page')
      require('@/hooks/use-mobile').useIsMobile.mockReturnValue(true)
      
      render(<Navigation />)
      
      // Should still render navigation without any active state
      const navLinks = screen.getAllByRole('link')
      expect(navLinks).toHaveLength(3)
      
      // No item should be marked as current page
      navLinks.forEach(link => {
        expect(link).not.toHaveAttribute('aria-current', 'page')
      })
    })

    it('should handle root path correctly', () => {
      mockUsePathname.mockReturnValue('/')
      require('@/hooks/use-mobile').useIsMobile.mockReturnValue(true)
      
      render(<Navigation />)
      
      // Should render navigation without any active state
      const navLinks = screen.getAllByRole('link')
      expect(navLinks).toHaveLength(3)
      
      // No item should be marked as current page for root path
      navLinks.forEach(link => {
        expect(link).not.toHaveAttribute('aria-current', 'page')
      })
    })
  })
})