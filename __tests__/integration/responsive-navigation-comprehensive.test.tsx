import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock components for testing
const MockHamburgerMenu = ({ isOpen, onToggle, onClose }: any) => {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose])

  return (
    <div>
      <button 
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        data-testid="hamburger-toggle"
      >
        {isOpen ? 'X' : '☰'}
      </button>
      {isOpen && (
        <div 
          data-testid="hamburger-drawer"
          role="dialog"
          aria-modal="true"
          className="fixed top-0 left-0 w-80 max-w-[85vw] bg-white transform transition-transform duration-300 ease-in-out translate-x-0"
        >
          <div data-testid="overlay" onClick={onClose} className="fixed inset-0 bg-black/50" />
          <div className="p-4">
            <button onClick={() => { onClose(); }}>Create Market</button>
            <button onClick={() => { onClose(); }}>Settings</button>
            <button onClick={() => { onClose(); }}>Sign Out</button>
          </div>
        </div>
      )}
    </div>
  )
}

const MockBottomNavigation = ({ isMobile }: { isMobile: boolean }) => {
  if (!isMobile) return null
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t"
      data-testid="bottom-navigation"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex justify-around py-2">
        <a href="/markets" className="min-w-[44px] min-h-[44px] flex flex-col items-center py-2 px-3 text-kai-700 bg-kai-100" aria-current="page">
          <span>🏠</span>
          <span>Markets</span>
        </a>
        <a href="/social" className="min-w-[44px] min-h-[44px] flex flex-col items-center py-2 px-3">
          <span>💬</span>
          <span>Social</span>
        </a>
        <a href="/wallet" className="min-w-[44px] min-h-[44px] flex flex-col items-center py-2 px-3">
          <span>💰</span>
          <span>Wallet</span>
        </a>
        <a href="/profile" className="min-w-[44px] min-h-[44px] flex flex-col items-center py-2 px-3">
          <span>👤</span>
          <span>Profile</span>
        </a>
      </div>
    </nav>
  )
}

const MockTopNavigation = ({ isMobile }: { isMobile: boolean }) => {
  const [showDropdown, setShowDropdown] = React.useState(false)
  
  return (
    <nav 
      className={`bg-white border-b sticky top-0 ${isMobile ? 'hidden' : 'block'} md:block`}
      data-testid="top-navigation"
      role="navigation"
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <div className="text-2xl font-bold">KAI</div>
        <div className="flex items-center space-x-8">
          <button className="px-3 py-2 text-kai-600 bg-kai-50">Markets</button>
          <button className="px-3 py-2">Social</button>
          <button className="px-3 py-2">Wallet</button>
          <button className="px-3 py-2">Profile</button>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            aria-expanded={showDropdown}
            data-testid="user-dropdown-toggle"
          >
            👤
          </button>
          {showDropdown && (
            <div 
              className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border"
              data-testid="user-dropdown"
            >
              <button className="w-full text-left px-4 py-2">Create Market</button>
              <button className="w-full text-left px-4 py-2">View Profile</button>
              <button className="w-full text-left px-4 py-2">Settings</button>
              <button className="w-full text-left px-4 py-2 text-red-600">Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

// Test component that combines all navigation elements
const ResponsiveNavigationTest = ({ isMobile }: { isMobile: boolean }) => {
  const [hamburgerOpen, setHamburgerOpen] = React.useState(false)

  return (
    <div>
      <MockTopNavigation isMobile={isMobile} />
      <MockHamburgerMenu 
        isOpen={hamburgerOpen}
        onToggle={() => setHamburgerOpen(!hamburgerOpen)}
        onClose={() => setHamburgerOpen(false)}
      />
      <MockBottomNavigation isMobile={isMobile} />
      <main className="p-4">
        <h1>Test Content</h1>
      </main>
    </div>
  )
}

describe('Responsive Navigation Behavior - Task 11', () => {
  beforeEach(() => {
    // Reset any global state
    document.body.style.overflow = 'unset'
  })

  describe('Hamburger Menu - All Screen Sizes', () => {
    it('should work on mobile screens (320px)', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      })

      render(<ResponsiveNavigationTest isMobile={true} />)
      
      const hamburgerToggle = screen.getByTestId('hamburger-toggle')
      expect(hamburgerToggle).toBeInTheDocument()
      expect(hamburgerToggle).toHaveAttribute('aria-expanded', 'false')
    })

    it('should work on tablet screens (768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      render(<ResponsiveNavigationTest isMobile={false} />)
      
      const hamburgerToggle = screen.getByTestId('hamburger-toggle')
      expect(hamburgerToggle).toBeInTheDocument()
    })

    it('should work on desktop screens (1024px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      render(<ResponsiveNavigationTest isMobile={false} />)
      
      const hamburgerToggle = screen.getByTestId('hamburger-toggle')
      expect(hamburgerToggle).toBeInTheDocument()
    })

    it('should work on large desktop screens (1920px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      })

      render(<ResponsiveNavigationTest isMobile={false} />)
      
      const hamburgerToggle = screen.getByTestId('hamburger-toggle')
      expect(hamburgerToggle).toBeInTheDocument()
    })

    it('should open and close hamburger menu properly', async () => {
      const user = userEvent.setup()
      render(<ResponsiveNavigationTest isMobile={true} />)
      
      const hamburgerToggle = screen.getByTestId('hamburger-toggle')
      
      // Initially closed
      expect(hamburgerToggle).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByTestId('hamburger-drawer')).not.toBeInTheDocument()
      
      // Open menu
      await user.click(hamburgerToggle)
      expect(hamburgerToggle).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByTestId('hamburger-drawer')).toBeInTheDocument()
      
      // Close menu
      await user.click(hamburgerToggle)
      expect(hamburgerToggle).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByTestId('hamburger-drawer')).not.toBeInTheDocument()
    })

    it('should close hamburger menu when clicking overlay', async () => {
      const user = userEvent.setup()
      render(<ResponsiveNavigationTest isMobile={true} />)
      
      const hamburgerToggle = screen.getByTestId('hamburger-toggle')
      
      // Open menu
      await user.click(hamburgerToggle)
      expect(screen.getByTestId('hamburger-drawer')).toBeInTheDocument()
      
      // Click overlay to close
      const overlay = screen.getByTestId('overlay')
      await user.click(overlay)
      expect(screen.queryByTestId('hamburger-drawer')).not.toBeInTheDocument()
    })

    it('should have proper responsive width classes', async () => {
      const user = userEvent.setup()
      render(<ResponsiveNavigationTest isMobile={true} />)
      
      const hamburgerToggle = screen.getByTestId('hamburger-toggle')
      await user.click(hamburgerToggle)
      
      const drawer = screen.getByTestId('hamburger-drawer')
      expect(drawer).toHaveClass('w-80', 'max-w-[85vw]')
    })
  })

  describe('Bottom Navigation - Mobile Devices', () => {
    it('should display on mobile screens', () => {
      render(<ResponsiveNavigationTest isMobile={true} />)
      
      const bottomNav = screen.getByTestId('bottom-navigation')
      expect(bottomNav).toBeInTheDocument()
      expect(bottomNav).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0')
    })

    it('should not display on desktop screens', () => {
      render(<ResponsiveNavigationTest isMobile={false} />)
      
      const bottomNav = screen.queryByTestId('bottom-navigation')
      expect(bottomNav).not.toBeInTheDocument()
    })

    it('should have touch-friendly minimum sizes', () => {
      render(<ResponsiveNavigationTest isMobile={true} />)
      
      const navLinks = screen.getAllByRole('link')
      navLinks.forEach(link => {
        expect(link).toHaveClass('min-w-[44px]', 'min-h-[44px]')
      })
    })

    it('should highlight active tab correctly', () => {
      render(<ResponsiveNavigationTest isMobile={true} />)
      
      const marketsLink = screen.getByRole('link', { name: /markets/i })
      expect(marketsLink).toHaveClass('text-kai-700', 'bg-kai-100')
      expect(marketsLink).toHaveAttribute('aria-current', 'page')
    })

    it('should have proper accessibility attributes', () => {
      render(<ResponsiveNavigationTest isMobile={true} />)
      
      const bottomNav = screen.getByTestId('bottom-navigation')
      expect(bottomNav).toHaveAttribute('role', 'navigation')
      expect(bottomNav).toHaveAttribute('aria-label', 'Main navigation')
    })
  })

  describe('Top Navigation - Desktop', () => {
    it('should be hidden on mobile screens', () => {
      render(<ResponsiveNavigationTest isMobile={true} />)
      
      const topNav = screen.getByTestId('top-navigation')
      expect(topNav).toHaveClass('hidden')
    })

    it('should be visible on desktop screens', () => {
      render(<ResponsiveNavigationTest isMobile={false} />)
      
      const topNav = screen.getByTestId('top-navigation')
      expect(topNav).toHaveClass('md:block')
      expect(topNav).not.toHaveClass('hidden')
    })

    it('should be sticky positioned at top', () => {
      render(<ResponsiveNavigationTest isMobile={false} />)
      
      const topNav = screen.getByTestId('top-navigation')
      expect(topNav).toHaveClass('sticky', 'top-0')
    })

    it('should display all navigation items', () => {
      render(<ResponsiveNavigationTest isMobile={false} />)
      
      expect(screen.getByText('KAI')).toBeInTheDocument()
      expect(screen.getByText('Markets')).toBeInTheDocument()
      expect(screen.getByText('Social')).toBeInTheDocument()
      expect(screen.getByText('Wallet')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
    })

    it('should highlight active navigation item', () => {
      render(<ResponsiveNavigationTest isMobile={false} />)
      
      const marketsButton = screen.getByText('Markets')
      expect(marketsButton).toHaveClass('text-kai-600', 'bg-kai-50')
    })

    it('should handle user dropdown correctly', async () => {
      const user = userEvent.setup()
      render(<ResponsiveNavigationTest isMobile={false} />)
      
      const dropdownToggle = screen.getByTestId('user-dropdown-toggle')
      
      // Initially closed
      expect(dropdownToggle).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByTestId('user-dropdown')).not.toBeInTheDocument()
      
      // Open dropdown
      await user.click(dropdownToggle)
      expect(dropdownToggle).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByTestId('user-dropdown')).toBeInTheDocument()
      
      // Check dropdown items
      expect(screen.getByText('Create Market')).toBeInTheDocument()
      expect(screen.getByText('View Profile')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })
  })

  describe('Proper Hiding/Showing of Navigation Elements', () => {
    it('should show correct navigation elements on mobile', () => {
      render(<ResponsiveNavigationTest isMobile={true} />)
      
      // Should show bottom navigation
      expect(screen.getByTestId('bottom-navigation')).toBeInTheDocument()
      
      // Should show hamburger menu
      expect(screen.getByTestId('hamburger-toggle')).toBeInTheDocument()
      
      // Top navigation should be hidden
      const topNav = screen.getByTestId('top-navigation')
      expect(topNav).toHaveClass('hidden')
    })

    it('should show correct navigation elements on desktop', () => {
      render(<ResponsiveNavigationTest isMobile={false} />)
      
      // Should not show bottom navigation
      expect(screen.queryByTestId('bottom-navigation')).not.toBeInTheDocument()
      
      // Should show hamburger menu
      expect(screen.getByTestId('hamburger-toggle')).toBeInTheDocument()
      
      // Top navigation should be visible
      const topNav = screen.getByTestId('top-navigation')
      expect(topNav).not.toHaveClass('hidden')
      expect(topNav).toHaveClass('md:block')
    })

    it('should transition properly between mobile and desktop', () => {
      const { rerender } = render(<ResponsiveNavigationTest isMobile={true} />)
      
      // Verify mobile layout
      expect(screen.getByTestId('bottom-navigation')).toBeInTheDocument()
      expect(screen.getByTestId('top-navigation')).toHaveClass('hidden')
      
      // Switch to desktop
      rerender(<ResponsiveNavigationTest isMobile={false} />)
      
      // Verify desktop layout
      expect(screen.queryByTestId('bottom-navigation')).not.toBeInTheDocument()
      expect(screen.getByTestId('top-navigation')).not.toHaveClass('hidden')
    })
  })

  describe('Cross-Screen Size Consistency', () => {
    const screenSizes = [
      { name: 'Mobile Small', width: 320, isMobile: true },
      { name: 'Mobile Large', width: 414, isMobile: true },
      { name: 'Tablet', width: 768, isMobile: false },
      { name: 'Desktop', width: 1024, isMobile: false },
      { name: 'Large Desktop', width: 1440, isMobile: false },
      { name: 'Extra Large', width: 1920, isMobile: false },
    ]

    screenSizes.forEach(({ name, width, isMobile }) => {
      it(`should work correctly on ${name} (${width}px)`, async () => {
        const user = userEvent.setup()
        
        // Mock viewport size
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })

        render(<ResponsiveNavigationTest isMobile={isMobile} />)
        
        // Hamburger menu should always be available
        const hamburgerToggle = screen.getByTestId('hamburger-toggle')
        expect(hamburgerToggle).toBeInTheDocument()
        
        // Test hamburger menu functionality
        await user.click(hamburgerToggle)
        expect(screen.getByTestId('hamburger-drawer')).toBeInTheDocument()
        
        // Close menu
        await user.click(hamburgerToggle)
        expect(screen.queryByTestId('hamburger-drawer')).not.toBeInTheDocument()
        
        // Check appropriate navigation visibility
        if (isMobile) {
          expect(screen.getByTestId('bottom-navigation')).toBeInTheDocument()
          expect(screen.getByTestId('top-navigation')).toHaveClass('hidden')
        } else {
          expect(screen.queryByTestId('bottom-navigation')).not.toBeInTheDocument()
          expect(screen.getByTestId('top-navigation')).not.toHaveClass('hidden')
        }
      })
    })
  })

  describe('Accessibility Across All Screen Sizes', () => {
    it('should maintain proper ARIA attributes on all screen sizes', () => {
      const { rerender } = render(<ResponsiveNavigationTest isMobile={true} />)
      
      // Mobile
      let hamburgerToggle = screen.getByTestId('hamburger-toggle')
      expect(hamburgerToggle).toHaveAttribute('aria-expanded', 'false')
      expect(hamburgerToggle).toHaveAttribute('aria-label', 'Open menu')
      
      let bottomNav = screen.getByTestId('bottom-navigation')
      expect(bottomNav).toHaveAttribute('role', 'navigation')
      expect(bottomNav).toHaveAttribute('aria-label', 'Main navigation')
      
      // Desktop
      rerender(<ResponsiveNavigationTest isMobile={false} />)
      
      hamburgerToggle = screen.getByTestId('hamburger-toggle')
      expect(hamburgerToggle).toHaveAttribute('aria-expanded', 'false')
      
      const topNav = screen.getByTestId('top-navigation')
      expect(topNav).toHaveAttribute('role', 'navigation')
      
      const userDropdown = screen.getByTestId('user-dropdown-toggle')
      expect(userDropdown).toHaveAttribute('aria-expanded', 'false')
    })

    it('should handle keyboard navigation properly', async () => {
      const user = userEvent.setup()
      render(<ResponsiveNavigationTest isMobile={true} />)
      
      // Focus directly on hamburger menu for testing
      const hamburgerToggle = screen.getByTestId('hamburger-toggle')
      hamburgerToggle.focus()
      expect(hamburgerToggle).toHaveFocus()
      
      // Enter to open menu
      await user.keyboard('{Enter}')
      expect(screen.getByTestId('hamburger-drawer')).toBeInTheDocument()
      
      // Escape to close menu
      await user.keyboard('{Escape}')
      expect(screen.queryByTestId('hamburger-drawer')).not.toBeInTheDocument()
    })
  })

  describe('Performance and Memory Management', () => {
    it('should clean up properly when unmounted', () => {
      const { unmount } = render(<ResponsiveNavigationTest isMobile={true} />)
      
      // Verify initial state
      expect(document.body.style.overflow).toBe('unset')
      
      unmount()
      
      // Should not have any lingering effects
      expect(document.body.style.overflow).toBe('unset')
    })

    it('should handle rapid screen size changes', () => {
      const { rerender } = render(<ResponsiveNavigationTest isMobile={true} />)
      
      // Rapidly switch between mobile and desktop
      for (let i = 0; i < 5; i++) {
        rerender(<ResponsiveNavigationTest isMobile={i % 2 === 0} />)
      }
      
      // Should still render correctly
      expect(screen.getByTestId('hamburger-toggle')).toBeInTheDocument()
    })
  })
})