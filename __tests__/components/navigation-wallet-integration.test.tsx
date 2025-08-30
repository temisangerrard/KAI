import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { Navigation } from '@/app/components/navigation'
import { useIsMobile } from '@/hooks/use-mobile'

// Mock the hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>

describe('Navigation - Wallet Integration', () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(true) // Test mobile navigation
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should include wallet navigation item in mobile navigation', () => {
    mockUsePathname.mockReturnValue('/markets')
    
    render(<Navigation />)
    
    // Check that wallet navigation item is present
    expect(screen.getByRole('link', { name: /navigate to wallet/i })).toBeInTheDocument()
    expect(screen.getByText('Wallet')).toBeInTheDocument()
  })

  it('should highlight wallet navigation when on wallet page', () => {
    mockUsePathname.mockReturnValue('/wallet')
    
    render(<Navigation />)
    
    const walletLink = screen.getByRole('link', { name: /navigate to wallet, current page/i })
    expect(walletLink).toBeInTheDocument()
    expect(walletLink).toHaveAttribute('aria-current', 'page')
  })

  it('should have correct wallet navigation href', () => {
    mockUsePathname.mockReturnValue('/markets')
    
    render(<Navigation />)
    
    const walletLink = screen.getByRole('link', { name: /navigate to wallet/i })
    expect(walletLink).toHaveAttribute('href', '/wallet')
  })

  it('should maintain proper navigation order with wallet included', () => {
    mockUsePathname.mockReturnValue('/markets')
    
    render(<Navigation />)
    
    const navItems = screen.getAllByRole('link')
    expect(navItems).toHaveLength(3)
    
    // Check order: Markets, Wallet, Profile
    expect(navItems[0]).toHaveAttribute('href', '/markets')
    expect(navItems[1]).toHaveAttribute('href', '/wallet')
    expect(navItems[2]).toHaveAttribute('href', '/profile')
  })

  it('should meet accessibility standards for wallet navigation', () => {
    mockUsePathname.mockReturnValue('/wallet')
    
    render(<Navigation />)
    
    const walletLink = screen.getByRole('link', { name: /navigate to wallet, current page/i })
    
    // Check accessibility attributes
    expect(walletLink).toHaveAttribute('aria-current', 'page')
    expect(walletLink).toHaveClass('min-w-[44px]', 'min-h-[44px]') // Touch target size
    expect(walletLink).toHaveClass('touch-manipulation')
  })

  it('should not render navigation on desktop', () => {
    mockUseIsMobile.mockReturnValue(false)
    mockUsePathname.mockReturnValue('/wallet')
    
    const { container } = render(<Navigation />)
    
    expect(container.firstChild).toBeNull()
  })
})