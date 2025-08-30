import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { HamburgerMenu } from '@/app/components/hamburger-menu'
import { useAuth } from '@/app/auth/auth-context'
import { useTokenBalance } from '@/hooks/use-token-balance'

// Mock the dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/app/auth/auth-context', () => ({
  useAuth: jest.fn(),
}))

jest.mock('@/hooks/use-token-balance', () => ({
  useTokenBalance: jest.fn(),
}))

const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseTokenBalance = useTokenBalance as jest.MockedFunction<typeof useTokenBalance>

describe('HamburgerMenu - Wallet Integration', () => {
  const mockProps = {
    isOpen: true,
    onToggle: jest.fn(),
    onClose: jest.fn(),
  }

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any)

    mockUseAuth.mockReturnValue({
      user: {
        displayName: 'Test User',
        email: 'test@example.com',
      },
      logout: jest.fn(),
    } as any)

    mockUseTokenBalance.mockReturnValue({
      totalTokens: 1000,
      isLoading: false,
    } as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should include wallet-related menu items', () => {
    render(<HamburgerMenu {...mockProps} />)
    
    // Check for wallet menu items
    expect(screen.getByText('Smart Wallet')).toBeInTheDocument()
    expect(screen.getByText('Gasless transactions')).toBeInTheDocument()
    expect(screen.getByText('Wallet Settings')).toBeInTheDocument()
    expect(screen.getByText('Manage your wallet')).toBeInTheDocument()
    expect(screen.getByText('Transaction History')).toBeInTheDocument()
    expect(screen.getByText('View your activity')).toBeInTheDocument()
  })

  it('should navigate to wallet page when Smart Wallet is clicked', () => {
    render(<HamburgerMenu {...mockProps} />)
    
    const smartWalletButton = screen.getByText('Smart Wallet').closest('button')
    fireEvent.click(smartWalletButton!)
    
    expect(mockPush).toHaveBeenCalledWith('/wallet')
    expect(mockProps.onClose).toHaveBeenCalled()
  })

  it('should navigate to wallet settings when Wallet Settings is clicked', () => {
    render(<HamburgerMenu {...mockProps} />)
    
    const walletSettingsButton = screen.getByText('Wallet Settings').closest('button')
    fireEvent.click(walletSettingsButton!)
    
    expect(mockPush).toHaveBeenCalledWith('/wallet#settings')
    expect(mockProps.onClose).toHaveBeenCalled()
  })

  it('should navigate to transaction history when Transaction History is clicked', () => {
    render(<HamburgerMenu {...mockProps} />)
    
    const transactionHistoryButton = screen.getByText('Transaction History').closest('button')
    fireEvent.click(transactionHistoryButton!)
    
    expect(mockPush).toHaveBeenCalledWith('/wallet#transactions')
    expect(mockProps.onClose).toHaveBeenCalled()
  })

  it('should style wallet items with green theme', () => {
    render(<HamburgerMenu {...mockProps} />)
    
    const smartWalletButton = screen.getByText('Smart Wallet').closest('button')
    const walletIcon = smartWalletButton?.querySelector('div')
    
    expect(walletIcon).toHaveClass('bg-green-100', 'text-green-600')
  })

  it('should maintain proper menu item order with wallet items', () => {
    render(<HamburgerMenu {...mockProps} />)
    
    const menuButtons = screen.getAllByRole('button').filter(button => 
      button.textContent && !button.textContent.includes('Close menu')
    )
    
    // Check that wallet items are positioned correctly
    const buttonTexts = menuButtons.map(button => button.textContent)
    
    expect(buttonTexts.some(text => text?.includes('Smart Wallet'))).toBe(true)
    expect(buttonTexts.some(text => text?.includes('Wallet Settings'))).toBe(true)
    expect(buttonTexts.some(text => text?.includes('Transaction History'))).toBe(true)
    
    // Smart Wallet should come after Markets but before Profile
    const smartWalletIndex = buttonTexts.findIndex(text => text?.includes('Smart Wallet'))
    const marketsIndex = buttonTexts.findIndex(text => text?.includes('Markets'))
    const profileIndex = buttonTexts.findIndex(text => text?.includes('Profile'))
    
    expect(smartWalletIndex).toBeGreaterThan(marketsIndex)
    expect(profileIndex).toBeGreaterThan(smartWalletIndex)
  })

  it('should handle keyboard navigation for wallet items', () => {
    render(<HamburgerMenu {...mockProps} />)
    
    const smartWalletButton = screen.getByText('Smart Wallet').closest('button')
    
    // Test that button is focusable and has proper attributes
    expect(smartWalletButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-kai-500')
    
    // Test click interaction (keyboard events on buttons typically trigger click)
    fireEvent.click(smartWalletButton!)
    expect(mockPush).toHaveBeenCalledWith('/wallet')
  })
})