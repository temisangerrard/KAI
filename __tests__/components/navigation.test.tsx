import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navigation } from '@/app/components/navigation'
import { useIsMobile } from '@/hooks/use-mobile'

// Mock the mobile hook
jest.mock('@/hooks/use-mobile')
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>

// Mock Next.js navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/markets',
}))

describe('Navigation Component - Responsive Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Mobile Navigation', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true)
    })

    it('should render bottom navigation on mobile', () => {
      render(<Navigation />)
      
      // Check if navigation is rendered
      const nav = screen.getByRole('navigation', { name: /main navigation/i })
      expect(nav).toBeInTheDocument()
      
      // Check if it has the mobile bottom navigation classes
      expect(nav).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0')
    })

    it('should display all 4 navigation items on mobile', () => {
      render(<Navigation />)
      
      expect(screen.getByLabelText(/navigate to markets/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/navigate to social/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/navigate to wallet/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/navigate to profile/i)).toBeInTheDocument()
    })

    it('should have touch-friendly minimum sizes on mobile', () => {
      render(<Navigation />)
      
      const navLinks = screen.getAllByRole('link')
      navLinks.forEach(link => {
        expect(link).toHaveClass('min-w-[44px]', 'min-h-[44px]')
      })
    })

    it('should highlight active tab correctly on mobile', () => {
      render(<Navigation />)
      
      // Markets should be active (based on mocked pathname)
      const marketsLink = screen.getByLabelText(/navigate to markets.*current page/i)
      expect(marketsLink).toHaveClass('text-kai-700', 'bg-kai-100')
      expect(marketsLink).toHaveAttribute('aria-current', 'page')
    })

    it('should have proper accessibility attributes on mobile', () => {
      render(<Navigation />)
      
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveAttribute('aria-label', 'Main navigation')
      
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveAttribute('aria-label')
      })
    })
  })

  describe('Desktop Navigation', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(false)
    })

    it('should not render navigation on desktop', () => {
      render(<Navigation />)
      
      // Should return null on desktop
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })

    it('should not display any navigation items on desktop', () => {
      render(<Navigation />)
      
      expect(screen.queryByLabelText(/navigate to markets/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/navigate to social/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/navigate to wallet/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/navigate to profile/i)).not.toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('should switch from desktop to mobile navigation when viewport changes', () => {
      // Start with desktop
      mockUseIsMobile.mockReturnValue(false)
      const { rerender } = render(<Navigation />)
      
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
      
      // Switch to mobile
      mockUseIsMobile.mockReturnValue(true)
      rerender(<Navigation />)
      
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('should switch from mobile to desktop navigation when viewport changes', () => {
      // Start with mobile
      mockUseIsMobile.mockReturnValue(true)
      const { rerender } = render(<Navigation />)
      
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      
      // Switch to desktop
      mockUseIsMobile.mockReturnValue(false)
      rerender(<Navigation />)
      
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Interaction', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true)
    })

    it('should handle navigation clicks properly', async () => {
      const user = userEvent.setup()
      render(<Navigation />)
      
      const socialLink = screen.getByLabelText(/navigate to social/i)
      await user.click(socialLink)
      
      // Link should navigate (handled by Next.js Link component)
      expect(socialLink).toHaveAttribute('href', '/social')
    })

    it('should maintain focus management for accessibility', async () => {
      const user = userEvent.setup()
      render(<Navigation />)
      
      const firstLink = screen.getByLabelText(/navigate to markets/i)
      await user.tab()
      
      expect(firstLink).toHaveFocus()
    })
  })
})