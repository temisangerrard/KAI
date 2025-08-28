/**
 * Navigation Verification Test
 * 
 * This test verifies that navigation functionality works correctly across all pages
 * after removing the social section. Tests cover:
 * - Navigation from markets, wallet, and profile pages
 * - Active states update correctly when navigating between pages
 * - No broken links or navigation issues
 * 
 * Requirements: 3.3, 2.2
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import { Navigation } from '@/app/components/navigation'
import { TopNavigation } from '@/app/components/top-navigation'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
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

const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

describe('Navigation Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    })
  })

  describe('Mobile Navigation Component', () => {
    beforeEach(() => {
      // Mock mobile environment
      require('@/hooks/use-mobile').useIsMobile.mockReturnValue(true)
    })

    it('should render only 3 navigation items (markets, wallet, profile)', () => {
      mockUsePathname.mockReturnValue('/markets')
      
      render(<Navigation />)
      
      // Should have exactly 3 navigation items
      const navLinks = screen.getAllByRole('link')
      expect(navLinks).toHaveLength(3)
      
      // Verify correct items are present
      expect(screen.getByLabelText(/Navigate to Markets/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Navigate to Wallet/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Navigate to Profile/)).toBeInTheDocument()
      
      // Verify social is NOT present
      expect(screen.queryByLabelText(/Navigate to Social/)).not.toBeInTheDocument()
    })

    it('should show correct active state for markets page', () => {
      mockUsePathname.mockReturnValue('/markets')
      
      render(<Navigation />)
      
      const marketsLink = screen.getByLabelText(/Navigate to Markets.*current page/)
      expect(marketsLink).toHaveClass('text-kai-700', 'bg-kai-100')
      
      const walletLink = screen.getByLabelText('Navigate to Wallet')
      expect(walletLink).toHaveClass('text-gray-600')
    })

    it('should show correct active state for wallet page', () => {
      mockUsePathname.mockReturnValue('/wallet')
      
      render(<Navigation />)
      
      const walletLink = screen.getByLabelText(/Navigate to Wallet.*current page/)
      expect(walletLink).toHaveClass('text-kai-700', 'bg-kai-100')
      
      const marketsLink = screen.getByLabelText('Navigate to Markets')
      expect(marketsLink).toHaveClass('text-gray-600')
    })

    it('should show correct active state for profile page', () => {
      mockUsePathname.mockReturnValue('/profile')
      
      render(<Navigation />)
      
      const profileLink = screen.getByLabelText(/Navigate to Profile.*current page/)
      expect(profileLink).toHaveClass('text-kai-700', 'bg-kai-100')
      
      const marketsLink = screen.getByLabelText('Navigate to Markets')
      expect(marketsLink).toHaveClass('text-gray-600')
    })

    it('should have proper touch targets (44px minimum)', () => {
      mockUsePathname.mockReturnValue('/markets')
      
      render(<Navigation />)
      
      const navLinks = screen.getAllByRole('link')
      navLinks.forEach(link => {
        expect(link).toHaveClass('min-w-[44px]', 'min-h-[44px]')
      })
    })

    it('should have proper accessibility attributes', () => {
      mockUsePathname.mockReturnValue('/markets')
      
      render(<Navigation />)
      
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveAttribute('aria-label', 'Main navigation')
      
      const activeLink = screen.getByLabelText(/Navigate to Markets.*current page/)
      expect(activeLink).toHaveAttribute('aria-current', 'page')
    })
  })

  describe('Desktop Navigation Component', () => {
    beforeEach(() => {
      // Mock desktop environment
      require('@/hooks/use-mobile').useIsMobile.mockReturnValue(false)
    })

    it('should render only 3 navigation items in desktop view', () => {
      mockUsePathname.mockReturnValue('/markets')
      
      render(<TopNavigation />)
      
      // Check for navigation buttons (hidden on mobile, visible on desktop)
      const marketsButton = screen.getByRole('button', { name: 'Markets' })
      const walletButton = screen.getByRole('button', { name: 'Wallet' })
      const profileButton = screen.getByRole('button', { name: 'Profile' })
      
      expect(marketsButton).toBeInTheDocument()
      expect(walletButton).toBeInTheDocument()
      expect(profileButton).toBeInTheDocument()
      
      // Verify social is NOT present
      expect(screen.queryByRole('button', { name: 'Social' })).not.toBeInTheDocument()
    })

    it('should show correct active state for markets page in desktop', () => {
      mockUsePathname.mockReturnValue('/markets')
      
      render(<TopNavigation />)
      
      const marketsButton = screen.getByRole('button', { name: 'Markets' })
      expect(marketsButton).toHaveClass('text-kai-600', 'bg-kai-50')
      
      const walletButton = screen.getByRole('button', { name: 'Wallet' })
      expect(walletButton).toHaveClass('text-gray-600')
    })

    it('should navigate correctly when clicking navigation buttons', async () => {
      mockUsePathname.mockReturnValue('/markets')
      
      render(<TopNavigation />)
      
      const walletButton = screen.getByRole('button', { name: 'Wallet' })
      fireEvent.click(walletButton)
      
      expect(mockPush).toHaveBeenCalledWith('/wallet')
    })
  })

  describe('Navigation State Updates', () => {
    it('should update active state when pathname changes', () => {
      const { rerender } = render(<Navigation />)
      
      // Start on markets page
      mockUsePathname.mockReturnValue('/markets')
      require('@/hooks/use-mobile').useIsMobile.mockReturnValue(true)
      rerender(<Navigation />)
      
      expect(screen.getByLabelText(/Navigate to Markets.*current page/)).toBeInTheDocument()
      
      // Navigate to wallet page
      mockUsePathname.mockReturnValue('/wallet')
      rerender(<Navigation />)
      
      expect(screen.getByLabelText(/Navigate to Wallet.*current page/)).toBeInTheDocument()
      expect(screen.queryByLabelText(/Navigate to Markets.*current page/)).not.toBeInTheDocument()
    })
  })

  describe('No Broken Links', () => {
    it('should have valid href attributes for all navigation links', () => {
      mockUsePathname.mockReturnValue('/markets')
      require('@/hooks/use-mobile').useIsMobile.mockReturnValue(true)
      
      render(<Navigation />)
      
      const marketsLink = screen.getByLabelText(/Navigate to Markets/)
      const walletLink = screen.getByLabelText(/Navigate to Wallet/)
      const profileLink = screen.getByLabelText(/Navigate to Profile/)
      
      expect(marketsLink).toHaveAttribute('href', '/markets')
      expect(walletLink).toHaveAttribute('href', '/wallet')
      expect(profileLink).toHaveAttribute('href', '/profile')
    })

    it('should not have any social-related navigation items', () => {
      mockUsePathname.mockReturnValue('/markets')
      require('@/hooks/use-mobile').useIsMobile.mockReturnValue(true)
      
      render(<Navigation />)
      
      // Verify no social links exist
      expect(screen.queryByText('Social')).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/social/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /social/i })).not.toBeInTheDocument()
    })
  })

  describe('Cross-Page Navigation Flow', () => {
    it('should maintain proper navigation state across page transitions', () => {
      const { rerender } = render(<Navigation />)
      require('@/hooks/use-mobile').useIsMobile.mockReturnValue(true)
      
      // Test navigation flow: markets -> wallet -> profile -> markets
      const pages = ['/markets', '/wallet', '/profile', '/markets']
      const expectedLabels = [
        'Navigate to Markets, current page',
        'Navigate to Wallet, current page', 
        'Navigate to Profile, current page',
        'Navigate to Markets, current page'
      ]
      
      pages.forEach((page, index) => {
        mockUsePathname.mockReturnValue(page)
        rerender(<Navigation />)
        
        expect(screen.getByLabelText(expectedLabels[index])).toBeInTheDocument()
      })
    })
  })
})