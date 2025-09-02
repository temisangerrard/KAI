import { render, screen, fireEvent } from '@testing-library/react'
import { ContextualHelp } from '@/app/components/contextual-help'

describe('ContextualHelp - Wallet Context', () => {
  it('should render wallet help button when not visible', () => {
    render(<ContextualHelp context="wallet" />)
    
    const helpButton = screen.getByRole('button')
    expect(helpButton).toBeInTheDocument()
    expect(helpButton).toHaveClass('fixed', 'bottom-4', 'left-4')
  })

  it('should show wallet help content when clicked', () => {
    render(<ContextualHelp context="wallet" />)
    
    const helpButton = screen.getByRole('button')
    fireEvent.click(helpButton)
    
    // Check for wallet-specific help content
    expect(screen.getByText('Smart Wallet Help')).toBeInTheDocument()
    expect(screen.getByText('Manage your gasless Web3 wallet and transactions.')).toBeInTheDocument()
  })

  it('should include wallet-specific FAQ items', () => {
    render(<ContextualHelp context="wallet" />)
    
    const helpButton = screen.getByRole('button')
    fireEvent.click(helpButton)
    
    // Check for wallet FAQ questions
    expect(screen.getByText('What is a smart wallet?')).toBeInTheDocument()
    expect(screen.getByText('How do I copy my wallet address?')).toBeInTheDocument()
    expect(screen.getByText('Are my transactions really gasless?')).toBeInTheDocument()
    expect(screen.getByText('How do I view my transaction history?')).toBeInTheDocument()
    expect(screen.getByText('Is my wallet secure?')).toBeInTheDocument()
  })

  it('should expand FAQ answers when clicked', () => {
    render(<ContextualHelp context="wallet" />)
    
    const helpButton = screen.getByRole('button')
    fireEvent.click(helpButton)
    
    // Click on first FAQ question
    const firstQuestion = screen.getByText('What is a smart wallet?')
    fireEvent.click(firstQuestion)
    
    // Check that answer is displayed
    expect(screen.getByText(/A smart wallet is a Web3 account that enables gasless transactions/)).toBeInTheDocument()
  })

  it('should collapse FAQ answers when clicked again', () => {
    render(<ContextualHelp context="wallet" />)
    
    const helpButton = screen.getByRole('button')
    fireEvent.click(helpButton)
    
    // Click to expand
    const firstQuestion = screen.getByText('What is a smart wallet?')
    fireEvent.click(firstQuestion)
    
    // Verify answer is visible
    expect(screen.getByText(/A smart wallet is a Web3 account that enables gasless transactions/)).toBeInTheDocument()
    
    // Click to collapse
    fireEvent.click(firstQuestion)
    
    // Answer should no longer be visible
    expect(screen.queryByText(/A smart wallet is a Web3 account that enables gasless transactions/)).not.toBeInTheDocument()
  })

  it('should close help panel when X button is clicked', () => {
    render(<ContextualHelp context="wallet" />)
    
    const helpButton = screen.getByRole('button')
    fireEvent.click(helpButton)
    
    // Find and click close button (X icon button)
    const buttons = screen.getAllByRole('button')
    const closeButton = buttons.find(button => 
      button.querySelector('svg[class*="lucide-x"]')
    )
    fireEvent.click(closeButton!)
    
    // Help content should be hidden
    expect(screen.queryByText('Smart Wallet Help')).not.toBeInTheDocument()
  })

  it('should provide comprehensive wallet guidance', () => {
    render(<ContextualHelp context="wallet" />)
    
    const helpButton = screen.getByRole('button')
    fireEvent.click(helpButton)
    
    // Check that all wallet FAQ questions are present
    expect(screen.getByText('What is a smart wallet?')).toBeInTheDocument()
    expect(screen.getByText('How do I copy my wallet address?')).toBeInTheDocument()
    expect(screen.getByText('Are my transactions really gasless?')).toBeInTheDocument()
    expect(screen.getByText('How do I view my transaction history?')).toBeInTheDocument()
    expect(screen.getByText('Is my wallet secure?')).toBeInTheDocument()
    
    // Expand one FAQ to verify answer content
    const firstQuestion = screen.getByText('What is a smart wallet?')
    fireEvent.click(firstQuestion)
    
    // Check that the answer appears
    expect(screen.getByText(/smart wallet is a Web3 account/)).toBeInTheDocument()
  })

  it('should maintain accessibility standards', () => {
    render(<ContextualHelp context="wallet" />)
    
    const helpButton = screen.getByRole('button')
    fireEvent.click(helpButton)
    
    // Check for proper heading structure
    expect(screen.getByText('Smart Wallet Help')).toBeInTheDocument()
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument()
    
    // Check that FAQ buttons are properly accessible
    const faqButtons = screen.getAllByRole('button').filter(button => 
      button.textContent?.includes('What is') || 
      button.textContent?.includes('How do') ||
      button.textContent?.includes('Are my') ||
      button.textContent?.includes('Is my')
    )
    
    expect(faqButtons.length).toBeGreaterThan(0)
    faqButtons.forEach(button => {
      expect(button).toHaveClass('w-full', 'text-left')
    })
  })
})