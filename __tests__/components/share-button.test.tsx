import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShareButton } from '@/app/components/share-button'
import { Market } from '@/lib/types/database'

// Mock the ShareModal component
jest.mock('@/app/components/share-modal', () => ({
  ShareModal: ({ isOpen, onClose, market }: any) => (
    isOpen ? (
      <div data-testid="share-modal">
        <h2>Share Market</h2>
        <p>{market.title}</p>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}))

const mockMarket: Market = {
  id: 'test-market-1',
  title: 'Test Market',
  description: 'Test market description',
  category: 'test' as any,
  status: 'active' as any,
  createdBy: 'user-123',
  createdAt: new Date() as any,
  endsAt: new Date() as any,
  tags: ['test'],
  totalParticipants: 100,
  totalTokensStaked: 1000,
  featured: false,
  trending: false,
  options: [
    {
      id: 'yes',
      text: 'Yes',
      totalTokens: 600,
      participantCount: 60
    },
    {
      id: 'no',
      text: 'No', 
      totalTokens: 400,
      participantCount: 40
    }
  ]
}

describe('ShareButton', () => {
  it('renders share icon button by default', () => {
    render(<ShareButton market={mockMarket} />)
    
    const shareButton = screen.getByRole('button')
    expect(shareButton).toBeInTheDocument()
    expect(shareButton).toHaveClass('rounded-full')
  })

  it('opens share modal when clicked', () => {
    render(<ShareButton market={mockMarket} />)
    
    const shareButton = screen.getByRole('button')
    fireEvent.click(shareButton)
    
    expect(screen.getByTestId('share-modal')).toBeInTheDocument()
    expect(screen.getByText('Test Market')).toBeInTheDocument()
  })

  it('closes modal when close button is clicked', () => {
    render(<ShareButton market={mockMarket} />)
    
    // Open modal
    const shareButton = screen.getByRole('button')
    fireEvent.click(shareButton)
    
    // Close modal
    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)
    
    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument()
  })

  it('renders as button variant when specified', () => {
    render(<ShareButton market={mockMarket} variant="button" />)
    
    const shareButton = screen.getByRole('button')
    expect(shareButton).toHaveTextContent('Share')
  })
})