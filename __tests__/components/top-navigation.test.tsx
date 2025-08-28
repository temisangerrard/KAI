import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopNavigation } from '@/app/components/top-navigation'

// Mock auth context
const mockUser = {
  displayName: 'Test User',
  email: 'test@example.com',
  tokenBalance: 1000,
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

describe('TopNavigation Component - Desktop Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Desktop Visibility', () => {
    it('should be hidden on mobile screens', () => {
      render(<TopNavigation />)
      
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('hidden', 'md:block')
    })

    it('should be visible on desktop screens', () => {
      render(<TopNavigation />)
      
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('md:block')
    })

    it('should be sticky positioned at top', () => {
      render(<TopNavigation />)
      
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('sticky', 'top-0')
    })
  })

  describe('Navigation Structure', () => {
    it('should display logo', () => {
      render(<TopNavigation />)
      
      const logo = screen.getByText('KAI')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveClass('text-2xl', 'font-bold')
    })

    it('should display exactly 3 main navigation items', () => {
      render(<TopNavigation />)
      
      expect(screen.getByText('Markets')).toBeInTheDocument()
      expect(screen.getByText('Wallet')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
      
      // Should have exactly 3 navigation buttons
      const navButtons = screen.getAllByRole('button').filter(button => 
        ['Markets', 'Wallet', 'Profile'].includes(button.textContent || '')
      )
      expect(navButtons).toHaveLength(3)
      
      // Social should not be present
      expect(screen.queryByText('Social')).not.toBeInTheDocument()
    })

    it('should display user token balance', () => {
      render(<TopNavigation />)
      
      expect(screen.getByText('1,000')).toBeInTheDocument()
      expect(screen.getByText('tokens')).toBeInTheDocument()
    })

    it('should display user avatar', () => {
      render(<TopNavigation />)
      
      const avatar = screen.getByRole('button', { expanded: false })
      expect(avatar).toBeInTheDocument()
    })
  })

  describe('Active State Highlighting', () => {
    it('should highlight active navigation item', () => {
      render(<TopNavigation />)
      
      const marketsButton = screen.getByText('Markets')
      expect(marketsButton).toHaveClass('text-kai-600', 'bg-kai-50')
    })

    it('should show active indicator for current page', () => {
      render(<TopNavigation />)
      
      const marketsButton = screen.getByText('Markets')
      const activeIndicator = marketsButton.parentElement?.querySelector('.absolute.bottom-0')
      expect(activeIndicator).toBeInTheDocument()
    })
  })

  describe('User Dropdown Functionality', () => {
    it('should toggle dropdown when avatar is clicked', async () => {
      const user = userEvent.setup()
      render(<TopNavigation />)
      
      // Find avatar button by looking for the one with avatar content
      const avatarButtons = screen.getAllByRole('button').filter(button => {
        return button.querySelector('span[class*="rounded-full"]') && 
               button.getAttribute('aria-haspopup') === 'true'
      })
      expect(avatarButtons).toHaveLength(1)
      const avatarButton = avatarButtons[0]
      
      // Initially closed
      expect(screen.queryByText('Create Market')).not.toBeInTheDocument()
      
      // Click to open
      await user.click(avatarButton)
      
      expect(screen.getByText('Create Market')).toBeInTheDocument()
      expect(screen.getByText('View Profile')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })

    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup()
      render(<TopNavigation />)
      
      // Find avatar button by looking for the one with avatar content
      const avatarButtons = screen.getAllByRole('button').filter(button => {
        return button.querySelector('span[class*="rounded-full"]') && 
               button.getAttribute('aria-haspopup') === 'true'
      })
      expect(avatarButtons).toHaveLength(1)
      const avatarButton = avatarButtons[0]
      
      // Open dropdown
      await user.click(avatarButton)
      expect(screen.getByText('Create Market')).toBeInTheDocument()
      
      // Click outside
      await user.click(document.body)
      
      await waitFor(() => {
        expect(screen.queryByText('Create Market')).not.toBeInTheDocument()
      })
    })

    it('should display user information in dropdown', async () => {
      const user = userEvent.setup()
      render(<TopNavigation />)
      
      // Find avatar button by looking for the one with avatar content
      const avatarButtons = screen.getAllByRole('button').filter(button => {
        return button.querySelector('span[class*="rounded-full"]') && 
               button.getAttribute('aria-haspopup') === 'true'
      })
      expect(avatarButtons).toHaveLength(1)
      const avatarButton = avatarButtons[0]
      await user.click(avatarButton)
      
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should handle logout correctly', async () => {
      const user = userEvent.setup()
      render(<TopNavigation />)
      
      // Find avatar button by looking for the one with avatar content
      const avatarButtons = screen.getAllByRole('button').filter(button => {
        return button.querySelector('span[class*="rounded-full"]') && 
               button.getAttribute('aria-haspopup') === 'true'
      })
      expect(avatarButtons).toHaveLength(1)
      const avatarButton = avatarButtons[0]
      await user.click(avatarButton)
      
      const logoutButton = screen.getByText('Sign Out')
      await user.click(logoutButton)
      
      expect(mockLogout).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  describe('Navigation Actions', () => {
    it('should navigate to correct pages when nav items are clicked', async () => {
      const user = userEvent.setup()
      render(<TopNavigation />)
      
      // Find wallet button in main nav (not hamburger menu)
      const mainNav = screen.getByRole('navigation')
      const navContainer = mainNav.querySelector('.hidden.md\\:flex')
      const walletButtons = screen.getAllByRole('button').filter(button => {
        return button.textContent === 'Wallet' && navContainer?.contains(button)
      })
      expect(walletButtons).toHaveLength(1)
      
      await user.click(walletButtons[0])
      expect(mockPush).toHaveBeenCalledWith('/wallet')
    })

    it('should navigate to create market from dropdown', async () => {
      const user = userEvent.setup()
      render(<TopNavigation />)
      
      // Find avatar button by looking for the one with avatar content
      const avatarButtons = screen.getAllByRole('button').filter(button => {
        return button.querySelector('span[class*="rounded-full"]') && 
               button.getAttribute('aria-haspopup') === 'true'
      })
      expect(avatarButtons).toHaveLength(1)
      const avatarButton = avatarButtons[0]
      await user.click(avatarButton)
      
      const createMarketButton = screen.getByText('Create Market')
      await user.click(createMarketButton)
      
      expect(mockPush).toHaveBeenCalledWith('/markets/create')
    })

    it('should navigate to logo click', async () => {
      const user = userEvent.setup()
      render(<TopNavigation />)
      
      const logo = screen.getByText('KAI')
      await user.click(logo)
      
      expect(mockPush).toHaveBeenCalledWith('/markets')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for dropdown', async () => {
      const user = userEvent.setup()
      render(<TopNavigation />)
      
      // Find avatar button by looking for the one with avatar content
      const avatarButtons = screen.getAllByRole('button').filter(button => {
        return button.querySelector('span[class*="rounded-full"]') && 
               button.getAttribute('aria-haspopup') === 'true'
      })
      expect(avatarButtons).toHaveLength(1)
      const avatarButton = avatarButtons[0]
      expect(avatarButton).toHaveAttribute('aria-expanded', 'false')
      expect(avatarButton).toHaveAttribute('aria-haspopup', 'true')
      
      await user.click(avatarButton)
      
      expect(avatarButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have keyboard navigation support', async () => {
      const user = userEvent.setup()
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
      
      // Test that buttons are focusable
      marketsButtons[0].focus()
      expect(marketsButtons[0]).toHaveFocus()
      
      walletButtons[0].focus()
      expect(walletButtons[0]).toHaveFocus()
      
      profileButtons[0].focus()
      expect(profileButtons[0]).toHaveFocus()
    })
  })

  describe('Responsive Design', () => {
    it('should have proper responsive classes', () => {
      render(<TopNavigation />)
      
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('bg-white', 'border-b', 'sticky', 'top-0')
    })

    it('should have proper container max-width', () => {
      render(<TopNavigation />)
      
      const container = screen.getByRole('navigation').querySelector('.max-w-7xl')
      expect(container).toBeInTheDocument()
    })

    it('should maintain proper proportions with 3 navigation items', () => {
      render(<TopNavigation />)
      
      // Find the navigation container
      const navContainer = screen.getByRole('navigation').querySelector('.hidden.md\\:flex')
      expect(navContainer).toHaveClass('items-center', 'space-x-8')
      
      // Verify 3 navigation buttons exist with proper spacing
      const navButtons = screen.getAllByRole('button').filter(button => 
        ['Markets', 'Wallet', 'Profile'].includes(button.textContent || '')
      )
      expect(navButtons).toHaveLength(3)
      
      // Each button should have consistent styling
      navButtons.forEach(button => {
        expect(button).toHaveClass('px-3', 'py-2', 'rounded-md', 'text-sm', 'font-medium')
      })
    })
  })
})