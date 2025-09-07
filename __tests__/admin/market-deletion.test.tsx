import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import MarketsPage from '@/app/admin/markets/page'

// Mock the auth context
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: { 
      id: 'admin-user-123', 
      address: '0x123...abc',
      email: 'admin@test.com' 
    }
  })
}))

// Mock the admin commitment service
jest.mock('@/lib/services/admin-commitment-service', () => ({
  AdminCommitmentService: {
    getMarketCommitments: jest.fn().mockResolvedValue({
      commitments: [
        {
          userId: 'user1',
          tokensCommitted: 100
        },
        {
          userId: 'user2', 
          tokensCommitted: 200
        }
      ]
    })
  }
}))

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({
    docs: [
      {
        id: 'market-1',
        data: () => ({
          title: 'Test Market 1',
          description: 'Test description',
          category: 'entertainment',
          status: 'active',
          createdAt: { toMillis: () => Date.now() },
          endsAt: { toMillis: () => Date.now() + 86400000 }
        })
      }
    ]
  })
}))

// Mock the database
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

// Mock fetch for API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Market Deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  it('should successfully delete a market', async () => {
    // Mock successful delete response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Market deleted successfully' })
    })

    render(<MarketsPage />)

    // Wait for markets to load
    await waitFor(() => {
      expect(screen.getByText('Test Market 1')).toBeInTheDocument()
    })

    // Click the more actions button
    const moreButton = screen.getByRole('button', { name: /more/i })
    fireEvent.click(moreButton)

    // Click delete option
    const deleteOption = screen.getByText('Delete Market')
    fireEvent.click(deleteOption)

    // Confirm deletion modal appears
    expect(screen.getByText('Delete Market')).toBeInTheDocument()
    expect(screen.getByText('This action cannot be undone')).toBeInTheDocument()

    // Type confirmation text
    const confirmInput = screen.getByPlaceholderText('Type DELETE to confirm')
    fireEvent.change(confirmInput, { target: { value: 'DELETE' } })

    // Click confirm delete button
    const confirmButton = screen.getByRole('button', { name: /delete market/i })
    fireEvent.click(confirmButton)

    // Verify API call was made with correct parameters
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/markets/market-1', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-user-123'
        }
      })
    })

    // Verify market is removed from the list
    await waitFor(() => {
      expect(screen.queryByText('Test Market 1')).not.toBeInTheDocument()
    })
  })

  it('should handle delete errors gracefully', async () => {
    // Mock error response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Admin privileges required' })
    })

    // Mock alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    render(<MarketsPage />)

    // Wait for markets to load
    await waitFor(() => {
      expect(screen.getByText('Test Market 1')).toBeInTheDocument()
    })

    // Click the more actions button
    const moreButton = screen.getByRole('button', { name: /more/i })
    fireEvent.click(moreButton)

    // Click delete option
    const deleteOption = screen.getByText('Delete Market')
    fireEvent.click(deleteOption)

    // Type confirmation text
    const confirmInput = screen.getByPlaceholderText('Type DELETE to confirm')
    fireEvent.change(confirmInput, { target: { value: 'DELETE' } })

    // Click confirm delete button
    const confirmButton = screen.getByRole('button', { name: /delete market/i })
    fireEvent.click(confirmButton)

    // Verify error is shown
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Admin privileges required')
    })

    // Verify market is still in the list
    expect(screen.getByText('Test Market 1')).toBeInTheDocument()

    alertSpy.mockRestore()
  })

  it('should require user authentication', async () => {
    // Mock useAuth to return no user
    jest.doMock('@/app/auth/auth-context', () => ({
      useAuth: () => ({
        user: null
      })
    }))

    // Mock alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    // Re-import the component with the new mock
    const { default: MarketsPageNoAuth } = await import('@/app/admin/markets/page')
    
    render(<MarketsPageNoAuth />)

    // Wait for markets to load
    await waitFor(() => {
      expect(screen.getByText('Test Market 1')).toBeInTheDocument()
    })

    // Click the more actions button
    const moreButton = screen.getByRole('button', { name: /more/i })
    fireEvent.click(moreButton)

    // Click delete option
    const deleteOption = screen.getByText('Delete Market')
    fireEvent.click(deleteOption)

    // Type confirmation text
    const confirmInput = screen.getByPlaceholderText('Type DELETE to confirm')
    fireEvent.change(confirmInput, { target: { value: 'DELETE' } })

    // Click confirm delete button
    const confirmButton = screen.getByRole('button', { name: /delete market/i })
    fireEvent.click(confirmButton)

    // Verify authentication error is shown
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('User not authenticated')
    })

    alertSpy.mockRestore()
  })
})