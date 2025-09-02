import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ShareButton } from '@/app/components/share-button'
import { Market } from '@/lib/types/database'

// Mock the mobile utilities
jest.mock('@/lib/mobile-consolidated', () => ({
  mobile: {
    isMobileViewport: jest.fn()
  }
}))

const mockMobile = require('@/lib/mobile-consolidated').mobile

// Mock the ShareModal component
jest.mock('@/app/components/share-modal', () => ({
  ShareModal: ({ isOpen, onClose, market, commitment }: any) => (
    <div data-testid="share-modal" style={{ display: isOpen ? 'block' : 'none' }}>
      <button onClick={onClose}>Close Modal</button>
      <div>Market: {market?.title}</div>
      {commitment && <div>Commitment: {commitment.optionText}</div>}
    </div>
  )
}))

describe('ShareButton with Mobile Native Sharing', () => {
  const mockMarket: Market = {
    id: 'market-123',
    title: 'Test Market',
    description: 'Test market description',
    category: 'entertainment' as any,
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
      }
    ]
  }

  const mockCommitment = {
    prediction: {
      id: 'pred-123',
      userId: 'user-123',
      marketId: 'market-123',
      optionId: 'yes',
      tokensStaked: 50,
      createdAt: new Date() as any,
      status: 'active' as any
    },
    market: mockMarket,
    optionText: 'Yes'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset navigator.share mock
    Object.defineProperty(global.navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true
    })
  })

  beforeAll(() => {
    // Mock window.location.origin
    delete (window as any).location
    window.location = { origin: 'https://example.com' } as any
  })

  it('uses native share on mobile when Web Share API is available', async () => {
    mockMobile.isMobileViewport.mockReturnValue(true)
    const mockShare = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    })

    render(<ShareButton market={mockMarket} />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test Market',
        text: 'Check out this prediction market: Test Market',
        url: 'http://localhost/markets/market-123'
      })
    })

    // Modal should not be shown
    expect(screen.queryByTestId('share-modal')).not.toBeVisible()
  })

  it('uses native share for commitment sharing on mobile', async () => {
    mockMobile.isMobileViewport.mockReturnValue(true)
    const mockShare = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    })

    render(<ShareButton commitment={mockCommitment} />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test Market',
        text: 'I just backed Yes with 50 KAI tokens on Test Market',
        url: 'http://localhost/markets/market-123?ref=commitment'
      })
    })
  })

  it('falls back to modal on desktop', async () => {
    mockMobile.isMobileViewport.mockReturnValue(false)

    render(<ShareButton market={mockMarket} />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByTestId('share-modal')).toBeVisible()
    })
  })

  it('falls back to modal when Web Share API is not available on mobile', async () => {
    mockMobile.isMobileViewport.mockReturnValue(true)
    // Don't define navigator.share

    render(<ShareButton market={mockMarket} />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByTestId('share-modal')).toBeVisible()
    })
  })

  it('falls back to modal when native share fails', async () => {
    mockMobile.isMobileViewport.mockReturnValue(true)
    const mockShare = jest.fn().mockRejectedValue(new Error('Share failed'))
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    })

    render(<ShareButton market={mockMarket} />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalled()
      expect(screen.getByTestId('share-modal')).toBeVisible()
    })
  })

  it('works with button variant', async () => {
    mockMobile.isMobileViewport.mockReturnValue(true)
    const mockShare = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true
    })

    render(<ShareButton market={mockMarket} variant="button" />)

    fireEvent.click(screen.getByText('Share'))

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test Market',
        text: 'Check out this prediction market: Test Market',
        url: 'http://localhost/markets/market-123'
      })
    })
  })
})