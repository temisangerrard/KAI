import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HamburgerMenu } from '@/app/components/hamburger-menu'

// Mock auth context
const mockUser = {
  displayName: 'Test User',
  email: 'test@example.com',
  tokenBalance: 1500,
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
}))

describe('HamburgerMenu Component - Responsive Behavior', () => {
  const defaultProps = {
    isOpen: false,
    onToggle: jest.fn(),
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset body overflow style
    document.body.style.overflow = 'unset'
  })

  describe('Menu Toggle Button', () => {
    it('should render hamburger icon when closed', () => {
      render(<HamburgerMenu {...defaultProps} />)
      
      const button = screen.getByRole('button', { name: /open menu/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('should render close icon when open', () => {
      render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      const button = screen.getByRole('button', { name: /close menu/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('should call onToggle when clicked', async () => {
      const user = userEvent.setup()
      const onToggle = jest.fn()
      
      render(<HamburgerMenu {...defaultProps} onToggle={onToggle} />)
      
      const button = screen.getByRole('button', { name: /open menu/i })
      await user.click(button)
      
      expect(onToggle).toHaveBeenCalled()
    })

    it('should have proper accessibility attributes', () => {
      render(<HamburgerMenu {...defaultProps} />)
      
      const button = screen.getByRole('button', { name: /open menu/i })
      expect(button).toHaveAttribute('aria-controls', 'hamburger-menu')
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('Menu Drawer - Closed State', () => {
    it('should not show overlay when closed', () => {
      render(<HamburgerMenu {...defaultProps} />)
      
      const overlay = screen.queryByRole('dialog')
      expect(overlay).not.toBeInTheDocument()
    })

    it('should have -translate-x-full class when closed', () => {
      render(<HamburgerMenu {...defaultProps} />)
      
      const drawer = screen.getByRole('dialog', { hidden: true })
      expect(drawer).toHaveClass('-translate-x-full')
    })
  })

  describe('Menu Drawer - Open State', () => {
    it('should show overlay when open', () => {
      render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      const overlay = document.querySelector('.fixed.inset-0.bg-black\\/50')
      expect(overlay).toBeInTheDocument()
    })

    it('should show drawer when open', () => {
      render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      const drawer = screen.getByRole('dialog')
      expect(drawer).toBeInTheDocument()
      expect(drawer).toHaveClass('translate-x-0')
    })

    it('should prevent body scroll when open', () => {
      render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should display user information', () => {
      render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('1,500 tokens')).toBeInTheDocument()
    })

    it('should display all menu items', () => {
      render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      expect(screen.getByText('Create Market')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Help & Support')).toBeInTheDocument()
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should have proper responsive width classes', () => {
      render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      const drawer = screen.getByRole('dialog')
      expect(drawer).toHaveClass('w-80', 'max-w-[85vw]')
    })

    it('should work on all screen sizes', () => {
      // Test different viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1024, height: 768 }, // Desktop
        { width: 1920, height: 1080 }, // Large Desktop
      ]

      viewports.forEach(viewport => {
        // Mock viewport size
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width,
        })
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height,
        })

        render(<HamburgerMenu {...defaultProps} isOpen={true} />)
        
        const drawer = screen.getByRole('dialog')
        expect(drawer).toBeInTheDocument()
        expect(drawer).toHaveClass('max-w-[85vw]')
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should close menu when Escape is pressed', () => {
      const onClose = jest.fn()
      render(<HamburgerMenu {...defaultProps} isOpen={true} onClose={onClose} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(onClose).toHaveBeenCalled()
    })

    it('should not close menu when other keys are pressed', () => {
      const onClose = jest.fn()
      render(<HamburgerMenu {...defaultProps} isOpen={true} onClose={onClose} />)
      
      fireEvent.keyDown(document, { key: 'Enter' })
      fireEvent.keyDown(document, { key: 'Space' })
      
      expect(onClose).not.toHaveBeenCalled()
    })

    it('should have proper focus management', async () => {
      const user = userEvent.setup()
      render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      // Tab through menu items
      await user.tab()
      const firstMenuItem = screen.getByText('Create Market')
      expect(firstMenuItem).toHaveFocus()
    })
  })

  describe('Click Outside to Close', () => {
    it('should close menu when overlay is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<HamburgerMenu {...defaultProps} isOpen={true} onClose={onClose} />)
      
      const overlay = document.querySelector('.fixed.inset-0.bg-black\\/50')
      if (overlay) {
        await user.click(overlay)
        expect(onClose).toHaveBeenCalled()
      }
    })

    it('should not close menu when drawer content is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<HamburgerMenu {...defaultProps} isOpen={true} onClose={onClose} />)
      
      const drawer = screen.getByRole('dialog')
      await user.click(drawer)
      
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Menu Item Interactions', () => {
    it('should navigate and close menu when Create Market is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<HamburgerMenu {...defaultProps} isOpen={true} onClose={onClose} />)
      
      const createMarketButton = screen.getByText('Create Market')
      await user.click(createMarketButton)
      
      expect(mockPush).toHaveBeenCalledWith('/markets/create')
      expect(onClose).toHaveBeenCalled()
    })

    it('should navigate and close menu when Settings is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<HamburgerMenu {...defaultProps} isOpen={true} onClose={onClose} />)
      
      const settingsButton = screen.getByText('Settings')
      await user.click(settingsButton)
      
      expect(mockPush).toHaveBeenCalledWith('/settings')
      expect(onClose).toHaveBeenCalled()
    })

    it('should logout and close menu when Sign Out is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<HamburgerMenu {...defaultProps} isOpen={true} onClose={onClose} />)
      
      const signOutButton = screen.getByText('Sign Out')
      await user.click(signOutButton)
      
      expect(mockLogout).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/')
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      const drawer = screen.getByRole('dialog')
      expect(drawer).toHaveAttribute('aria-modal', 'true')
      expect(drawer).toHaveAttribute('aria-labelledby', 'menu-title')
    })

    it('should have proper heading structure', () => {
      render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      const heading = screen.getByRole('heading', { name: 'Menu' })
      expect(heading).toBeInTheDocument()
    })

    it('should have focus ring on interactive elements', () => {
      render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      const menuItems = screen.getAllByRole('button')
      menuItems.forEach(item => {
        expect(item).toHaveClass('focus:outline-none', 'focus:ring-2')
      })
    })
  })

  describe('Animation and Transitions', () => {
    it('should have proper transition classes', () => {
      render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      const drawer = screen.getByRole('dialog')
      expect(drawer).toHaveClass('transition-transform', 'duration-300', 'ease-in-out')
    })

    it('should restore body scroll when component unmounts', () => {
      const { unmount } = render(<HamburgerMenu {...defaultProps} isOpen={true} />)
      
      expect(document.body.style.overflow).toBe('hidden')
      
      unmount()
      
      expect(document.body.style.overflow).toBe('unset')
    })
  })
})