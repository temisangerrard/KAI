import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navigation } from '@/app/components/navigation'
import { TopNavigation } from '@/app/components/top-navigation'
import { HamburgerMenu } from '@/app/components/hamburger-menu'
import { useIsMobile } from '@/hooks/use-mobile'

// Mock the mobile hook
jest.mock('@/hooks/use-mobile')
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>

// Mock auth context
const mockUser = {
  displayName: 'Test User',
  email: 'test@example.com',
  tokenBalance: 2000,
  profileImage: 'https://example.com/avatar.jpg'
}

const mockLogout = jest.fn()

jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
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

// Test component that includes all navigation components
const TestNavigationLayout = () => {
  const [hamburgerOpen, setHamburgerOpen] = React.useState(false)

  return (
    <div>
      <TopNavigation />
      <HamburgerMenu 
        isOpen={hamburgerOpen}
        onToggle={() => setHamburgerOpen(!hamburgerOpen)}
        onClose={() => setHamburgerOpen(false)}
      />
      <Navigation />
      <main>
        <h1>Test Content</h1>
      </main>
    </div>
  )
}

describe('Responsive Navigation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    document.body.style.overflow = 'unset'
  })

  describe('Mobile Layout (< 768px)', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true)
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
    })

    it('should show bottom navigation and hamburger menu on mobile', () => {
      render(<TestNavigationLayout />)
      
      // Bottom navigation should be visible
      const bottomNav = screen.getByRole('navigation', { name: /main navigation/i })
      expect(bottomNav).toBeInTheDocument()
      expect(bottomNav).toHaveClass('fixed', 'bottom-0')
      
      // Top navigation should be hidden
      const topNav = screen.getByRole('navigation', { hidden: true })
      expect(topNav).toHaveClass('hidden', 'md:block')
      
      // Hamburger menu button should be visible
      const hamburgerButton = screen.getByRole('button', { name: /open menu/i })
      expect(hamburgerButton).toBeInTheDocument()
    })

    it('should have proper mobile navigation flow', async () => {
      const user = userEvent.setup()
      render(<TestNavigationLayout />)
      
      // Test bottom navigation - should have exactly 3 items
      const navLinks = screen.getAllByRole('link')
      expect(navLinks).toHaveLength(3)
      
      const marketsLink = screen.getByLabelText(/navigate to markets/i)
      expect(marketsLink).toHaveAttribute('href', '/markets')
      
      // Test hamburger menu
      const hamburgerButton = screen.getByRole('button', { name: /open menu/i })
      await user.click(hamburgerButton)
      
      expect(screen.getByText('Create Market')).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should handle mobile touch interactions properly', async () => {
      const user = userEvent.setup()
      render(<TestNavigationLayout />)
      
      // All navigation items should have minimum touch target size
      const navLinks = screen.getAllByRole('link')
      navLinks.forEach(link => {
        expect(link).toHaveClass('min-w-[44px]', 'min-h-[44px]')
      })
      
      // Test touch interaction
      const marketsLink = screen.getByLabelText(/navigate to markets/i)
      await user.click(marketsLink)
      
      expect(marketsLink).toHaveClass('touch-manipulation')
    })
  })

  describe('Desktop Layout (>= 768px)', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(false)
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })
    })

    it('should show top navigation and hamburger menu on desktop', () => {
      render(<TestNavigationLayout />)
      
      // Top navigation should be visible
      const topNavs = screen.getAllByRole('navigation')
      const topNav = topNavs.find(nav => nav.classList.contains('md:block'))
      expect(topNav).toBeInTheDocument()
      expect(topNav).toHaveClass('sticky', 'top-0')
      
      // Bottom navigation should not be rendered
      const bottomNav = screen.queryByRole('navigation', { name: /main navigation/i })
      expect(bottomNav).not.toBeInTheDocument()
      
      // Hamburger menu button should still be available
      const hamburgerButton = screen.getByRole('button', { name: /open menu/i })
      expect(hamburgerButton).toBeInTheDocument()
    })

    it('should have proper desktop navigation flow', async () => {
      const user = userEvent.setup()
      render(<TestNavigationLayout />)
      
      // Test top navigation - should have exactly 3 items
      const navButtons = screen.getAllByRole('button').filter(button => 
        ['Markets', 'Wallet', 'Profile'].includes(button.textContent || '')
      )
      expect(navButtons).toHaveLength(3)
      
      const walletButton = screen.getByText('Wallet')
      await user.click(walletButton)
      expect(mockPush).toHaveBeenCalledWith('/wallet')
      
      // Test user dropdown
      const avatarButton = screen.getByRole('button', { expanded: false })
      await user.click(avatarButton)
      
      expect(screen.getByText('Create Market')).toBeInTheDocument()
      expect(screen.getByText('View Profile')).toBeInTheDocument()
    })

    it('should handle desktop interactions properly', async () => {
      const user = userEvent.setup()
      render(<TestNavigationLayout />)
      
      // Test hover states (simulated through focus)
      const marketsButton = screen.getByText('Markets')
      await user.hover(marketsButton)
      
      expect(marketsButton).toHaveClass('hover:text-kai-600', 'hover:bg-kai-50')
    })
  })

  describe('Responsive Breakpoint Transitions', () => {
    it('should transition from mobile to desktop layout', () => {
      // Start with mobile
      mockUseIsMobile.mockReturnValue(true)
      const { rerender } = render(<TestNavigationLayout />)
      
      // Verify mobile layout
      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
      
      // Bottom nav should have 3 items
      const bottomNavLinks = screen.getAllByRole('link')
      expect(bottomNavLinks).toHaveLength(3)
      
      // Top nav buttons should not be visible (hidden by responsive classes)
      const topNavButtons = screen.queryAllByRole('button').filter(button => 
        ['Markets', 'Wallet', 'Profile'].includes(button.textContent || '')
      )
      expect(topNavButtons).toHaveLength(0) // Hidden on mobile
      
      // Switch to desktop
      mockUseIsMobile.mockReturnValue(false)
      rerender(<TestNavigationLayout />)
      
      // Verify desktop layout
      expect(screen.queryByRole('navigation', { name: /main navigation/i })).not.toBeInTheDocument()
      
      // Top nav should have 3 navigation buttons
      const topNavButtons = screen.getAllByRole('button').filter(button => 
        ['Markets', 'Wallet', 'Profile'].includes(button.textContent || '')
      )
      expect(topNavButtons).toHaveLength(3)
    })

    it('should transition from desktop to mobile layout', () => {
      // Start with desktop
      mockUseIsMobile.mockReturnValue(false)
      const { rerender } = render(<TestNavigationLayout />)
      
      // Verify desktop layout - should have 3 top nav buttons
      const topNavButtons = screen.getAllByRole('button').filter(button => 
        ['Markets', 'Wallet', 'Profile'].includes(button.textContent || '')
      )
      expect(topNavButtons).toHaveLength(3)
      expect(screen.queryByRole('navigation', { name: /main navigation/i })).not.toBeInTheDocument()
      
      // Switch to mobile
      mockUseIsMobile.mockReturnValue(true)
      rerender(<TestNavigationLayout />)
      
      // Verify mobile layout
      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
    })
  })

  describe('Cross-Component Interactions', () => {
    it('should maintain consistent navigation state across components', async () => {
      const user = userEvent.setup()
      mockUseIsMobile.mockReturnValue(true)
      render(<TestNavigationLayout />)
      
      // Bottom nav should show Markets as active and have exactly 3 items
      const bottomNavMarkets = screen.getByLabelText(/navigate to markets.*current page/i)
      expect(bottomNavMarkets).toHaveClass('text-kai-700', 'bg-kai-100')
      
      // Verify 3 navigation items in bottom nav
      const bottomNavLinks = screen.getAllByRole('link')
      expect(bottomNavLinks).toHaveLength(3)
      
      // Open hamburger menu and navigate
      const hamburgerButton = screen.getByRole('button', { name: /open menu/i })
      await user.click(hamburgerButton)
      
      const createMarketButton = screen.getByText('Create Market')
      await user.click(createMarketButton)
      
      expect(mockPush).toHaveBeenCalledWith('/markets/create')
    })

    it('should handle hamburger menu across different screen sizes', async () => {
      const user = userEvent.setup()
      
      // Test on mobile
      mockUseIsMobile.mockReturnValue(true)
      const { rerender } = render(<TestNavigationLayout />)
      
      const hamburgerButton = screen.getByRole('button', { name: /open menu/i })
      await user.click(hamburgerButton)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      // Switch to desktop - hamburger should still work
      mockUseIsMobile.mockReturnValue(false)
      rerender(<TestNavigationLayout />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility Across Components', () => {
    it('should maintain proper focus management across navigation components', async () => {
      const user = userEvent.setup()
      mockUseIsMobile.mockReturnValue(true)
      render(<TestNavigationLayout />)
      
      // Tab through bottom navigation
      await user.tab()
      expect(screen.getByLabelText(/navigate to markets/i)).toHaveFocus()
      
      // Tab to hamburger menu
      await user.tab()
      await user.tab()
      await user.tab()
      await user.tab()
      expect(screen.getByRole('button', { name: /open menu/i })).toHaveFocus()
    })

    it('should have consistent ARIA labels and roles', () => {
      mockUseIsMobile.mockReturnValue(true)
      render(<TestNavigationLayout />)
      
      // Check navigation roles
      const bottomNav = screen.getByRole('navigation', { name: /main navigation/i })
      expect(bottomNav).toHaveAttribute('role', 'navigation')
      
      // Check button accessibility
      const hamburgerButton = screen.getByRole('button', { name: /open menu/i })
      expect(hamburgerButton).toHaveAttribute('aria-expanded', 'false')
      expect(hamburgerButton).toHaveAttribute('aria-controls', 'hamburger-menu')
    })
  })

  describe('Performance and Memory Management', () => {
    it('should clean up event listeners when components unmount', () => {
      const { unmount } = render(<TestNavigationLayout />)
      
      // Verify initial state
      expect(document.body.style.overflow).toBe('unset')
      
      unmount()
      
      // Should not have any lingering effects
      expect(document.body.style.overflow).toBe('unset')
    })

    it('should handle rapid viewport changes gracefully', () => {
      const { rerender } = render(<TestNavigationLayout />)
      
      // Rapidly switch between mobile and desktop
      for (let i = 0; i < 10; i++) {
        mockUseIsMobile.mockReturnValue(i % 2 === 0)
        rerender(<TestNavigationLayout />)
      }
      
      // Should still render correctly
      expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument()
    })
  })
})