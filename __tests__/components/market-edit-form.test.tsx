import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import MarketEditPage from '@/app/admin/markets/[id]/edit/page'
import { useAuth } from '@/app/auth/auth-context'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { MarketsService } from '@/lib/services/firestore'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock auth contexts
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: jest.fn()
}))

jest.mock('@/hooks/use-admin-auth', () => ({
  useAdminAuth: jest.fn()
}))

// Mock MarketsService
jest.mock('@/lib/services/firestore', () => ({
  MarketsService: {
    updateMarket: jest.fn()
  }
}))

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}))

jest.mock('@/lib/db/database', () => ({
  db: {}
}))

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn()
}

const mockUser = {
  id: 'test-user-id',
  email: 'admin@test.com',
  address: 'test-address'
}

const mockMarketData = {
  id: 'test-market-id',
  title: 'Test Market Title',
  description: 'Test market description that is long enough',
  category: 'entertainment',
  status: 'active',
  createdAt: { toMillis: () => Date.now() },
  endsAt: { toMillis: () => Date.now() + 86400000 }, // 24 hours from now
  featured: false,
  trending: false
}

describe('MarketEditPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
    ;(useAdminAuth as jest.Mock).mockReturnValue({ 
      isAdmin: true, 
      loading: false 
    })

    // Mock Firebase getDoc
    const { getDoc } = require('firebase/firestore')
    ;(getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      id: mockMarketData.id,
      data: () => mockMarketData
    })
  })

  it('renders market edit form with pre-populated data', async () => {
    render(<MarketEditPage params={{ id: 'test-market-id' }} />)

    // Wait for market data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Market Title')).toBeInTheDocument()
    })

    // Check form fields are populated
    expect(screen.getByDisplayValue('Test Market Title')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test market description that is long enough')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update market/i })).toBeInTheDocument()
  })

  it('validates form fields correctly', async () => {
    render(<MarketEditPage params={{ id: 'test-market-id' }} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Market Title')).toBeInTheDocument()
    })

    // Clear title field to trigger validation
    const titleInput = screen.getByDisplayValue('Test Market Title')
    fireEvent.change(titleInput, { target: { value: 'Short' } })

    // Submit form
    const submitButton = screen.getByRole('button', { name: /update market/i })
    fireEvent.click(submitButton)

    // Check validation message appears
    await waitFor(() => {
      expect(screen.getByText('Title must be at least 10 characters')).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    ;(MarketsService.updateMarket as jest.Mock).mockResolvedValue({})

    render(<MarketEditPage params={{ id: 'test-market-id' }} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Market Title')).toBeInTheDocument()
    })

    // Update title
    const titleInput = screen.getByDisplayValue('Test Market Title')
    fireEvent.change(titleInput, { target: { value: 'Updated Market Title' } })

    // Submit form
    const submitButton = screen.getByRole('button', { name: /update market/i })
    fireEvent.click(submitButton)

    // Wait for submission
    await waitFor(() => {
      expect(MarketsService.updateMarket).toHaveBeenCalledWith(
        'test-market-id',
        expect.objectContaining({
          title: 'Updated Market Title',
          description: 'Test market description that is long enough',
          category: 'entertainment'
        }),
        'test-user-id' // Admin ID parameter
      )
    })

    // Check success message
    await waitFor(() => {
      expect(screen.getByText('Market updated successfully!')).toBeInTheDocument()
    })
  })

  it('shows access denied for non-admin users', () => {
    ;(useAdminAuth as jest.Mock).mockReturnValue({ 
      isAdmin: false, 
      loading: false 
    })

    render(<MarketEditPage params={{ id: 'test-market-id' }} />)

    expect(screen.getByText('You don\'t have permission to edit markets. Admin access is required.')).toBeInTheDocument()
  })

  it('shows loading state while checking authentication', () => {
    ;(useAdminAuth as jest.Mock).mockReturnValue({ 
      isAdmin: false, 
      loading: true 
    })

    render(<MarketEditPage params={{ id: 'test-market-id' }} />)

    // Should show skeleton loading state
    expect(screen.getByTestId('market-edit-skeleton') || screen.getByText('Loading...')).toBeTruthy()
  })

  it('handles service-level admin authentication errors', async () => {
    ;(MarketsService.updateMarket as jest.Mock).mockRejectedValue(
      new Error('Admin privileges required for market updates')
    )

    render(<MarketEditPage params={{ id: 'test-market-id' }} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Market Title')).toBeInTheDocument()
    })

    // Update title and submit
    const titleInput = screen.getByDisplayValue('Test Market Title')
    fireEvent.change(titleInput, { target: { value: 'Updated Market Title' } })

    const submitButton = screen.getByRole('button', { name: /update market/i })
    fireEvent.click(submitButton)

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Admin privileges required for market updates')).toBeInTheDocument()
    })
  })
})