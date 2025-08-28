import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navigation } from '@/app/components/navigation'
import { TopNavigation } from '@/app/components/top-navigation'
import { useIsMobile } from '@/hooks/use-mobile'

// Mock the mobile hook
jest.mock('@/hooks/use-mobile')
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>

// Mock auth context
const mockUser = {
  displayName: 'Test User',
  email: 'test@example.com',
  profileImage: 'https://example.com/avatar.jpg'
}

const mockLogout = jest.fn()

jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}))

// Mock token balance hook
jest.mock('@/hooks/use-token-balance', () => ({
  useTokenBalance: () => ({
    totalTokens: 1500,
    availableTokens: 1200,
    committedTokens: 300,
    isLoading: false,
  }),
}))

// Mock Next.js navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/markets',
}))

// Mock hamburger menu hook
jest.mock('@/hooks/use-hamburger-menu', () => ({
  useHamburgerMenu: () => ({
    isOpen: false,
    toggle: jest.fn(),
    close: jest.fn(),
  }),
}))

describe('Responsive Navigation Layout - Task 5 Requirements', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Mobile Bottom Navigation - 3 Items with Even Spacing', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true)
    })

    it('should display exactly 3 items with even spacing', () => {
      render(<Navigation />)
      
      // Verify exactly 3 navigation items
      const navLinks = screen.getAllByRole('link')
      expect(navLinks).toHaveLength(3)
      
      // Verify the specific items
      expect(screen.getByLabelText(/navigate to markets/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/navigate to wallet/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/navigate to profile/i)).toBeInTheDocument()
      
      // Verify even spacing with justify-around
      const navContainer = screen.getByRole('navigation').querySelector('div')
      expect(navContainer).toHaveClass('flex', 'items-center', 'justify-around')
    })

    it('should maintain proper proportions for 3 items', () => {
      render(<Navigation />)
      
      const navLinks = screen.getAllByRole('link')
      
      // Each item should have consistent styling for proper distribution
      navLinks.forEach(link => {
        expect(link).toHaveClass('flex', 'flex-col', 'items-center')
        expect(link).toHaveClass('py-2', 'px-3', 'rounded-lg')
      })
      
      // Container should use space-around for even distribution
      const container = screen.getByRole('navigation').querySelector('.flex')
      expect(container).toHaveClass('justify-around')
    })

    it('should validate touch targets remain 44px minimum', () => {
      render(<Navigation />)
      
      const navLinks = screen.getAllByRole('link')
      expect(navLinks).toHaveLength(3)
      
      // Each navigation item must meet minimum touch target size
      navLinks.forEach(link => {
        expect(link).toHaveClass('min-w-[44px]', 'min-h-[44px]')
        expect(link).toHaveClass('touch-manipulation')
      })
    })

    it('should ensure active state highlighting works for all 3 tabs', () => {
      render(<Navigation />)
      
      // Markets should be active (based on mocked pathname)
      const marketsLink = screen.getByLabelText(/navigate to markets.*current page/i)
      expect(marketsLink).toHaveClass('text-kai-700', 'bg-kai-100', 'font-medium')
      expect(marketsLink).toHaveAttribute('aria-current', 'page')
      
      // Other items should have inactive styling
      const walletLink = screen.getByLabelText(/navigate to wallet/i)
      const profileLink = screen.getByLabelText(/navigate to profile/i)
      
      expect(walletLink).toHaveClass('text-gray-600')
      expect(profileLink).toHaveClass('text-gray-600')
      expect(walletLink).not.toHaveAttribute('aria-current')
      expect(profileLink).not.toHaveAttribute('aria-current')
    })

    it('should have proper mobile navigation structure', () => {
      render(<Navigation />)
      
      const nav = screen.getByRole('navigation')
      
      // Should be fixed at bottom
      expect(nav).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0')
      
      // Should have proper z-index and styling
      expect(nav).toHaveClass('w-full', 'bg-white', 'border-t', 'z-50', 'shadow-lg')
      
      // Should have proper accessibility attributes
      expect(nav).toHaveAttribute('aria-label', 'Main navigation')
      expect(nav).toHaveAttribute('role', 'navigation')
    })
  })

  describe('Desktop Top Navigation - 3 Items with Proper Proportions', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(false)
    })

    it('should display exactly 3 navigation items with proper spacing', () => {
      render(<TopNavigation />)
      
      // Find the main navigation container (not hamburger menu)
      const mainNav = screen.getByRole('navigation')
      const navContainer = mainNav.querySelector('.hidden.md\\:flex')
      expect(navContainer).toBeInTheDocument()
      
      // Verify exactly 3 navigation buttons in the main nav
      const navButtons = screen.getAllByRole('button').filter(button => {
        const text = button.textContent || ''
        const isNavButton = ['Markets', 'Wallet', 'Profile'].includes(text)
        const isInMainNav = navContainer?.contains(button)
        return isNavButton && isInMainNav
      })
      expect(navButtons).toHaveLength(3)
    })

    it('should maintain proper proportions for desktop navigation', () => {
      render(<TopNavigation />)
      
      // Find navigation container (hidden on mobile, visible on desktop)
      const navContainer = screen.getByRole('navigation').querySelector('.hidden.md\\:flex')
      expect(navContainer).toHaveClass('items-center', 'space-x-8')
      
      // Each navigation button should have consistent styling
      const navButtons = screen.getAllByRole('button').filter(button => 
        ['Markets', 'Wallet', 'Profile'].includes(button.textContent || '')
      )
      
      navButtons.forEach(button => {
        expect(button).toHaveClass('px-3', 'py-2', 'rounded-md', 'text-sm', 'font-medium')
      })
    })

    it('should ensure active state highlighting works correctly', () => {
      render(<TopNavigation />)
      
      // Find the main navigation container
      const mainNav = screen.getByRole('navigation')
      const navContainer = mainNav.querySelector('.hidden.md\\:flex')
      
      // Find Markets button in main nav (not hamburger menu)
      const navButtons = screen.getAllByRole('button').filter(button => {
        return button.textContent === 'Markets' && navContainer?.contains(button)
      })
      expect(navButtons).toHaveLength(1)
      
      const marketsButton = navButtons[0]
      expect(marketsButton).toHaveClass('text-kai-600', 'bg-kai-50')
      
      // Should have active indicator
      const activeIndicator = marketsButton.querySelector('.absolute.bottom-0')
      expect(activeIndicator).toBeInTheDocument()
      expect(activeIndicator).toHaveClass('h-0.5', 'bg-kai-600', 'rounded-full')
    })

    it('should have proper desktop navigation structure', () => {
      render(<TopNavigation />)
      
      const nav = screen.getByRole('navigation')
      
      // Should be sticky at top
      expect(nav).toHaveClass('bg-white', 'border-b', 'sticky', 'top-0', 'z-30')
      
      // Should have proper container structure
      const container = nav.querySelector('.max-w-7xl')
      expect(container).toBeInTheDocument()
      expect(container).toHaveClass('mx-auto', 'px-6')
      
      // Should have proper height
      const innerContainer = container?.querySelector('.flex')
      expect(innerContainer).toHaveClass('items-center', 'justify-between', 'h-16')
    })
  })

  describe('Cross-Device Navigation Consistency', () => {
    it('should maintain consistent navigation items across devices', () => {
      // Test mobile
      mockUseIsMobile.mockReturnValue(true)
      const { rerender } = render(<Navigation />)
      
      const mobileLinks = screen.getAllByRole('link')
      expect(mobileLinks).toHaveLength(3)
      
      // Test desktop
      mockUseIsMobile.mockReturnValue(false)
      rerender(<TopNavigation />)
      
      const desktopButtons = screen.getAllByRole('button').filter(button => 
        ['Markets', 'Wallet', 'Profile'].includes(button.textContent || '')
      )
      expect(desktopButtons).toHaveLength(3)
    })

    it('should maintain active states consistently across devices', () => {
      // Test mobile active state
      mockUseIsMobile.mockReturnValue(true)
      const { rerender } = render(<Navigation />)
      
      const mobileMarketsLink = screen.getByLabelText(/navigate to markets.*current page/i)
      expect(mobileMarketsLink).toHaveAttribute('aria-current', 'page')
      
      // Test desktop active state
      mockUseIsMobile.mockReturnValue(false)
      rerender(<TopNavigation />)
      
      // Find Markets button in main nav (not hamburger menu)
      const mainNav = screen.getByRole('navigation')
      const navContainer = mainNav.querySelector('.hidden.md\\:flex')
      const desktopMarketsButtons = screen.getAllByRole('button').filter(button => {
        return button.textContent === 'Markets' && navContainer?.contains(button)
      })
      expect(desktopMarketsButtons).toHaveLength(1)
      
      const desktopMarketsButton = desktopMarketsButtons[0]
      expect(desktopMarketsButton).toHaveClass('text-kai-600', 'bg-kai-50')
    })
  })

  describe('Accessibility Requirements', () => {
    it('should maintain proper ARIA labels for 3 navigation items on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      render(<Navigation />)
      
      const marketsLink = screen.getByLabelText(/navigate to markets/i)
      const walletLink = screen.getByLabelText(/navigate to wallet/i)
      const profileLink = screen.getByLabelText(/navigate to profile/i)
      
      expect(marketsLink).toHaveAttribute('aria-label')
      expect(walletLink).toHaveAttribute('aria-label')
      expect(profileLink).toHaveAttribute('aria-label')
      
      // Active item should have additional context
      expect(marketsLink).toHaveAttribute('aria-label', expect.stringContaining('current page'))
    })

    it('should support keyboard navigation for 3 items', async () => {
      const user = userEvent.setup()
      mockUseIsMobile.mockReturnValue(true)
      render(<Navigation />)
      
      // Tab through all 3 navigation items
      await user.tab()
      expect(screen.getByLabelText(/navigate to markets/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/navigate to wallet/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/navigate to profile/i)).toHaveFocus()
    })

    it('should have proper focus management on desktop', async () => {
      const user = userEvent.setup()
      mockUseIsMobile.mockReturnValue(false)
      render(<TopNavigation />)
      
      // Find navigation buttons in main nav (not hamburger menu)
      const mainNav = screen.getByRole('navigation')
      const navContainer = mainNav.querySelector('.hidden.md\\:flex')
      
      const marketsButtons = screen.getAllByRole('button').filter(button => {
        return button.textContent === 'Markets' && navContainer?.contains(button)
      })
      const walletButtons = screen.getAllByRole('button').filter(button => {
        return button.textContent === 'Wallet' && navContainer?.contains(button)
      })
      const profileButtons = screen.getAllByRole('button').filter(button => {
        return button.textContent === 'Profile' && navContainer?.contains(button)
      })
      
      expect(marketsButtons).toHaveLength(1)
      expect(walletButtons).toHaveLength(1)
      expect(profileButtons).toHaveLength(1)
      
      // Test that navigation buttons are focusable
      marketsButtons[0].focus()
      expect(marketsButtons[0]).toHaveFocus()
      
      walletButtons[0].focus()
      expect(walletButtons[0]).toHaveFocus()
      
      profileButtons[0].focus()
      expect(profileButtons[0]).toHaveFocus()
    })
  })

  describe('Layout Validation', () => {
    it('should ensure mobile navigation does not overflow with 3 items', () => {
      mockUseIsMobile.mockReturnValue(true)
      render(<Navigation />)
      
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('w-full')
      
      const container = nav.querySelector('.flex')
      expect(container).toHaveClass('justify-around', 'py-2')
      
      // Items should not exceed container width
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveClass('py-2', 'px-3')
      })
    })

    it('should ensure desktop navigation maintains proper alignment with 3 items', () => {
      mockUseIsMobile.mockReturnValue(false)
      render(<TopNavigation />)
      
      const nav = screen.getByRole('navigation')
      const container = nav.querySelector('.max-w-7xl')
      expect(container).toHaveClass('mx-auto', 'px-6')
      
      const flexContainer = container?.querySelector('.flex')
      expect(flexContainer).toHaveClass('items-center', 'justify-between', 'h-16')
      
      // Navigation items should be properly spaced
      const navContainer = nav.querySelector('.hidden.md\\:flex')
      expect(navContainer).toHaveClass('items-center', 'space-x-8')
    })
  })

  describe('Visual Consistency', () => {
    it('should maintain consistent styling across 3 navigation items on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      render(<Navigation />)
      
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(3)
      
      links.forEach(link => {
        // Each link should have consistent base styling
        expect(link).toHaveClass('flex', 'flex-col', 'items-center')
        expect(link).toHaveClass('py-2', 'px-3', 'rounded-lg', 'transition-colors')
        expect(link).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-kai-500')
        expect(link).toHaveClass('min-w-[44px]', 'min-h-[44px]', 'touch-manipulation')
      })
    })

    it('should maintain consistent styling across 3 navigation items on desktop', () => {
      mockUseIsMobile.mockReturnValue(false)
      render(<TopNavigation />)
      
      const buttons = screen.getAllByRole('button').filter(button => 
        ['Markets', 'Wallet', 'Profile'].includes(button.textContent || '')
      )
      expect(buttons).toHaveLength(3)
      
      buttons.forEach(button => {
        // Each button should have consistent base styling
        expect(button).toHaveClass('px-3', 'py-2', 'rounded-md')
        expect(button).toHaveClass('text-sm', 'font-medium', 'transition-colors')
      })
    })
  })
})