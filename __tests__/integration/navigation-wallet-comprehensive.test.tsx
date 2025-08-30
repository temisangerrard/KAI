import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import { Navigation } from '@/app/components/navigation'
import { TopNavigation } from '@/app/components/top-navigation'
import { HamburgerMenu } from '@/app/components/hamburger-menu'
import { ContextualHelp } from '@/app/components/contextual-help'
import { useAuth } from '@/app/auth/auth-context'
import { useTokenBalance } from '@/hooks/use-token-balance'
import { useHamburgerMenu } from '@/hooks/use-hamburger-menu'
import { useIsMobile } from '@/hooks/use-mobile'

// Mock all dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

jest.mock('@/app/auth/auth-context', () => ({
  useAuth: jest.fn(),
}))

jest.mock('@/hooks/use-token-balance', () => ({
  useTokenBalance: jest.fn(),
}))

jest.mock('@/hooks/use-hamburger-menu', () => ({
  useHamburgerMenu: jest.fn(),
}))

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(),
}))

const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseTokenBalance = useTokenBalance as jest.MockedFunction<typeof useTokenBalance>
const mockUseHamburgerMenu = useHamburgerMenu as jest.MockedFunction<typeof useHamburgerMenu>
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>

describe('Navigation Wallet Integration - Comprehensive', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any)

    mockUseAuth.mockReturnValue({
      user: {
        displayName: 'Test User',
        email: 'test@example.com',
        profileImage: null,
      },
      logout: jest.fn(),
    } as any)

    mockUseTokenBalance.mockReturnValue({
      totalTokens: 1000,
      availableTokens: 800,
      committedTokens: 200,
      isLoading: false,
    } as any)

    mockUseHamburgerMenu.mockReturnValue({
      isOpen: false,
      toggle: jest.fn(),
      close: jest.fn(),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Mobile Navigation', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true)
    })

    it('should include wallet in mobile bottom navigation', () => {
      mockUsePathname.mockReturnValue('/markets')
      
      render(<Navigation />)
      
      // Check all navigation items are present in correct order
      const navLinks = screen.getAllByRole('link')
      expect(navLinks).toHaveLength(3)
      
      expect(navLinks[0]).toHaveAttribute('href', '/markets')
      expect(navLinks[0]).toHaveTextContent('Markets')
      
      expect(navLinks[1]).toHaveAttribute('href', '/wallet')
      expect(navLinks[1]).toHaveTextContent('Wallet')
      
      expect(navLinks[2]).toHaveAttribute('href', '/profile')
      expect(navLinks[2]).toHaveTextContent('Profile')
    })

    it('should highlight wallet when on wallet page', () => {
      mockUsePathname.mockReturnValue('/wallet')
      
      render(<Navigation />)
      
      const walletLink = screen.getByRole('link', { name: /navigate to wallet, current page/i })
      expect(walletLink).toHaveClass('text-kai-700', 'bg-kai-100')
    })
  })

  describe('Desktop Navigation', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(false)
    })

    it('should include wallet in desktop top navigation', () => {
      mockUsePathname.mockReturnValue('/markets')
      
      render(<TopNavigation />)
      
      // Check desktop navigation includes wallet
      expect(screen.getByRole('button', { name: 'Wallet' })).toBeInTheDocument()
    })

    it('should navigate to wallet when clicked', () => {
      mockUsePathname.mockReturnValue('/markets')
      
      render(<TopNavigation />)
      
      const walletButton = screen.getByRole('button', { name: 'Wallet' })
      fireEvent.click(walletButton)
      
      expect(mockPush).toHaveBeenCalledWith('/wallet')
    })
  })

  describe('Hamburger Menu Integration', () => {
    const mockHamburgerProps = {
      isOpen: true,
      onToggle: jest.fn(),
      onClose: jest.fn(),
    }

    it('should include all wallet-related menu items', () => {
      render(<HamburgerMenu {...mockHamburgerProps} />)
      
      // Check for wallet menu items
      expect(screen.getByText('Smart Wallet')).toBeInTheDocument()
      expect(screen.getByText('Gasless transactions')).toBeInTheDocument()
      expect(screen.getByText('Wallet Settings')).toBeInTheDocument()
      expect(screen.getByText('Transaction History')).toBeInTheDocument()
    })

    it('should navigate to correct wallet sections', () => {
      render(<HamburgerMenu {...mockHamburgerProps} />)
      
      // Test Smart Wallet navigation
      const smartWalletButton = screen.getByText('Smart Wallet').closest('button')
      fireEvent.click(smartWalletButton!)
      expect(mockPush).toHaveBeenCalledWith('/wallet')
      
      // Test Wallet Settings navigation
      const walletSettingsButton = screen.getByText('Wallet Settings').closest('button')
      fireEvent.click(walletSettingsButton!)
      expect(mockPush).toHaveBeenCalledWith('/wallet#settings')
      
      // Test Transaction History navigation
      const transactionHistoryButton = screen.getByText('Transaction History').closest('button')
      fireEvent.click(transactionHistoryButton!)
      expect(mockPush).toHaveBeenCalledWith('/wallet#transactions')
    })
  })

  describe('Contextual Help Integration', () => {
    it('should provide wallet-specific help content', () => {
      render(<ContextualHelp context="wallet" />)
      
      // Open help panel
      const helpButton = screen.getByRole('button')
      fireEvent.click(helpButton)
      
      // Check wallet-specific content
      expect(screen.getByText('Smart Wallet Help')).toBeInTheDocument()
      expect(screen.getByText('Manage your gasless Web3 wallet and transactions.')).toBeInTheDocument()
      
      // Check wallet FAQ items
      expect(screen.getByText('What is a smart wallet?')).toBeInTheDocument()
      expect(screen.getByText('Are my transactions really gasless?')).toBeInTheDocument()
      expect(screen.getByText('Is my wallet secure?')).toBeInTheDocument()
    })
  })

  describe('Cross-Component Consistency', () => {
    it('should maintain consistent wallet navigation across all components', () => {
      mockUsePathname.mockReturnValue('/wallet')
      mockUseIsMobile.mockReturnValue(true)
      
      // Test mobile navigation
      const { unmount: unmountNavigation } = render(<Navigation />)
      const mobileWalletLink = screen.getByRole('link', { name: /navigate to wallet, current page/i })
      expect(mobileWalletLink).toHaveAttribute('href', '/wallet')
      unmountNavigation()
      
      // Test hamburger menu
      const mockHamburgerProps = {
        isOpen: true,
        onToggle: jest.fn(),
        onClose: jest.fn(),
      }
      const { unmount: unmountHamburger } = render(<HamburgerMenu {...mockHamburgerProps} />)
      expect(screen.getByText('Smart Wallet')).toBeInTheDocument()
      unmountHamburger()
      
      // Test contextual help
      render(<ContextualHelp context="wallet" />)
      const helpButtons = screen.getAllByRole('button')
      const helpButton = helpButtons.find(button => 
        button.querySelector('svg[class*="lucide-circle-help"]')
      )
      fireEvent.click(helpButton!)
      expect(screen.getByText('Smart Wallet Help')).toBeInTheDocument()
    })
  })

  describe('Accessibility Standards', () => {
    it('should meet accessibility requirements for wallet navigation', () => {
      mockUsePathname.mockReturnValue('/wallet')
      mockUseIsMobile.mockReturnValue(true)
      
      render(<Navigation />)
      
      const walletLink = screen.getByRole('link', { name: /navigate to wallet, current page/i })
      
      // Check accessibility attributes
      expect(walletLink).toHaveAttribute('aria-current', 'page')
      expect(walletLink).toHaveClass('min-w-[44px]', 'min-h-[44px]') // Touch target size
      expect(walletLink).toHaveClass('touch-manipulation')
      
      // Check focus management
      expect(walletLink).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-kai-500')
    })

    it('should provide proper ARIA labels for wallet elements', () => {
      mockUsePathname.mockReturnValue('/wallet')
      mockUseIsMobile.mockReturnValue(true)
      
      render(<Navigation />)
      
      const walletLink = screen.getByRole('link', { name: /navigate to wallet, current page/i })
      expect(walletLink).toHaveAttribute('aria-label', 'Navigate to Wallet, current page')
    })
  })
})