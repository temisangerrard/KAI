import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShareModal } from '@/app/components/share-modal'
import { Market } from '@/lib/types/database'

// Mock window.open
const mockWindowOpen = jest.fn()
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true
})

// Mock clipboard API
const mockWriteText = jest.fn()
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText
  },
  writable: true
})

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

describe('ShareModal', () => {
  beforeEach(() => {
    mockWindowOpen.mockClear()
    mockWriteText.mockClear()
  })

  it('renders when open', () => {
    render(
      <ShareModal 
        isOpen={true} 
        onClose={() => {}} 
        market={mockMarket} 
      />
    )
    
    expect(screen.getByText('Share Market')).toBeInTheDocument()
    expect(screen.getByText('Test Market')).toBeInTheDocument()
    expect(screen.getByText('Share on Twitter')).toBeInTheDocument()
    expect(screen.getByText('Share on Facebook')).toBeInTheDocument()
    expect(screen.getByText('Copy Link')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <ShareModal 
        isOpen={false} 
        onClose={() => {}} 
        market={mockMarket} 
      />
    )
    
    expect(screen.queryByText('Share Market')).not.toBeInTheDocument()
  })

  it('opens Twitter share when Twitter button is clicked', () => {
    render(
      <ShareModal 
        isOpen={true} 
        onClose={() => {}} 
        market={mockMarket} 
      />
    )
    
    const twitterButton = screen.getByText('Share on Twitter')
    fireEvent.click(twitterButton)
    
    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining('https://twitter.com/intent/tweet'),
      '_blank',
      'width=600,height=400'
    )
  })

  it('opens Facebook share when Facebook button is clicked', () => {
    render(
      <ShareModal 
        isOpen={true} 
        onClose={() => {}} 
        market={mockMarket} 
      />
    )
    
    const facebookButton = screen.getByText('Share on Facebook')
    fireEvent.click(facebookButton)
    
    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining('https://www.facebook.com/sharer/sharer.php'),
      '_blank',
      'width=600,height=400'
    )
  })

  it('copies link to clipboard when copy button is clicked', async () => {
    mockWriteText.mockResolvedValue(undefined)
    
    render(
      <ShareModal 
        isOpen={true} 
        onClose={() => {}} 
        market={mockMarket} 
      />
    )
    
    const copyButton = screen.getByText('Copy Link')
    fireEvent.click(copyButton)
    
    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('/markets/test-market-1'))
    
    await waitFor(() => {
      expect(screen.getByText('Link Copied!')).toBeInTheDocument()
    })
  })
})