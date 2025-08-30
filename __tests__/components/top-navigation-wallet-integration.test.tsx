import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import { TopNavigation } from '@/app/components/top-navigation'
import { useAuth } from '@/app/auth/auth-context'
import { useTokenBalance } from '@/hooks/use-token-balance'
import { useHamburgerMenu } from '@/hooks/use-hamburger-menu'

// Mock the dependencies
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

const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseTokenBalance = useTokenBalance as jest.MockedFunction<typeof useTokenBalance>
const mockUseHamburgerMenu = useHamburgerMenu as jest.MockedFunction<typeof useHamburgerMenu>

describe('TopNavigation - Wallet Integration', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any)

    mockUsePathname.mockReturnValue('/markets')

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

  it('should include wallet navigation item in desktop navigation', () => {
    render(<TopNavigation />)
    
    // Check that wallet navigation button is present
    expect(screen.getByRole('button', { name: 'Wallet' })).toBeInTheDocument()
  })

  it('should highlight wallet navigation when on wallet page', () => {
    mockUsePathname.mockReturnValue('/wallet')
    
    render(<TopNavigation />)
    
    const walletButton = screen.getByRole('button', { name: 'Wallet' })
    expect(walletButton).toHaveClass('text-kai-600', 'bg-kai-50')
    
    // Check for active indicator
    const activeIndicator = walletButton.querySelector('.absolute.bottom-0')
    expect(activeIndicator).toBeInTheDocument()
  })

  it('should navigate to wallet page when wallet button is clicked', () => {
    render(<TopNavigation />)
    
    const walletButton = screen.getByRole('button', { name: 'Wallet' })
    fireEvent.click(walletButton)
    
    expect(mockPush).toHaveBeenCalledWith('/wallet')
  })

  it('should include Smart Wallet option in user dropdown', () => {
    render(<TopNavigation />)
    
    // Open user dropdown - find the user avatar button (not hamburger menu)
    const userButtons = screen.getAllByRole('button', { 'aria-haspopup': 'true' })
    const userDropdownButton = userButtons.find(button => 
      button.querySelector('span[class*="bg-kai-100"]') // Avatar with kai background
    )
    
    fireEvent.click(userDropdownButton!)
    
    // Check for Smart Wallet option in dropdown (not hamburger menu)
    const smartWalletButtons = screen.getAllByText('Smart Wallet')
    const dropdownSmartWallet = smartWalletButtons.find(element => 
      element.closest('button')?.className.includes('px-4 py-2') // Dropdown button styling
    )
    expect(dropdownSmartWallet).toBeInTheDocument()
  })

  it('should navigate to wallet from dropdown Smart Wallet option', () => {
    render(<TopNavigation />)
    
    // Open user dropdown - find the user avatar button (not hamburger menu)
    const userButtons = screen.getAllByRole('button', { 'aria-haspopup': 'true' })
    const userDropdownButton = userButtons.find(button => 
      button.querySelector('span[class*="bg-kai-100"]') // Avatar with kai background
    )
    
    fireEvent.click(userDropdownButton!)
    
    // Click Smart Wallet option from dropdown (not hamburger menu)
    const smartWalletButtons = screen.getAllByText('Smart Wallet')
    const dropdownSmartWallet = smartWalletButtons.find(element => 
      element.closest('button')?.className.includes('px-4 py-2') // Dropdown button styling
    )
    const smartWalletOption = dropdownSmartWallet?.closest('button')
    fireEvent.click(smartWalletOption!)
    
    expect(mockPush).toHaveBeenCalledWith('/wallet')
  })

  it('should maintain proper navigation order with wallet included', () => {
    render(<TopNavigation />)
    
    const navButtons = screen.getAllByRole('button').filter(button => 
      ['Markets', 'Wallet', 'Profile'].includes(button.textContent || '')
    )
    
    expect(navButtons).toHaveLength(3)
    expect(navButtons[0]).toHaveTextContent('Markets')
    expect(navButtons[1]).toHaveTextContent('Wallet')
    expect(navButtons[2]).toHaveTextContent('Profile')
  })

  it('should apply correct styling to wallet navigation button', () => {
    render(<TopNavigation />)
    
    const walletButton = screen.getByRole('button', { name: 'Wallet' })
    
    // Check base styling classes
    expect(walletButton).toHaveClass(
      'px-3',
      'py-2',
      'rounded-md',
      'text-sm',
      'font-medium',
      'transition-colors',
      'relative'
    )
  })

  it('should handle wallet navigation accessibility', () => {
    mockUsePathname.mockReturnValue('/wallet')
    
    render(<TopNavigation />)
    
    const walletButton = screen.getByRole('button', { name: 'Wallet' })
    
    // Check that active state is properly indicated
    expect(walletButton).toHaveClass('text-kai-600', 'bg-kai-50')
    
    // Check for visual active indicator
    const activeIndicator = walletButton.querySelector('.absolute.bottom-0.h-0\\.5.bg-kai-600')
    expect(activeIndicator).toBeInTheDocument()
  })
})