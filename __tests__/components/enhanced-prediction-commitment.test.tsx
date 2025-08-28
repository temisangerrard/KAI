import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock Firebase completely
jest.mock('@/lib/db/database', () => ({
  db: {},
  auth: {}
}))

jest.mock('@/lib/services/token-balance-service', () => ({
  TokenBalanceService: {
    getUserBalance: jest.fn()
  }
}))

jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-id' }
  })
}))

// Import after mocking
import { PredictionCommitment } from '@/app/components/prediction-commitment'
import { TokenBalanceService } from '@/lib/services/token-balance-service'

const mockTokenBalanceService = TokenBalanceService as jest.Mocked<typeof TokenBalanceService>

describe('Enhanced PredictionCommitment Error Handling', () => {
  const mockMarket = {
    id: 'market-123',
    title: 'Test Prediction',
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

  const defaultProps = {
    predictionId: 'test-prediction',
    predictionTitle: 'Test Prediction',
    position: 'yes' as const,
    optionId: 'yes',
    market: mockMarket,
    maxTokens: 1000,
    onCommit: jest.fn(),
    onCancel: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
  })

  describe('Firestore Error Handling', () => {
    it('should handle insufficient balance error correctly', async () => {
      mockTokenBalanceService.getUserBalance.mockResolvedValue({
        userId: 'test-user-id',
        availableTokens: 50,
        committedTokens: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: new Date(),
        version: 1
      })

      const mockCommit = jest.fn().mockRejectedValue({
        errorCode: 'INSUFFICIENT_BALANCE',
        message: 'You do not have enough tokens for this commitment'
      })

      render(<PredictionCommitment {...defaultProps} onCommit={mockCommit} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('1')).toBeInTheDocument()
      })

      // Try to commit more tokens than available
      const input = screen.getByDisplayValue('1')
      fireEvent.change(input, { target: { value: '100' } })

      const commitButton = screen.getByRole('button', { name: /commit 100/i })
      fireEvent.click(commitButton)

      await waitFor(() => {
        expect(screen.getByText(/you do not have enough tokens/i)).toBeInTheDocument()
      })

      // Should not show retry button for non-retryable error
      expect(screen.queryByText(/try again/i)).not.toBeInTheDocument()
    })

    it('should handle transaction failed error with retry', async () => {
      mockTokenBalanceService.getUserBalance.mockResolvedValue({
        userId: 'test-user-id',
        availableTokens: 100,
        committedTokens: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: new Date(),
        version: 1
      })

      const mockCommit = jest.fn()
        .mockRejectedValueOnce({
          errorCode: 'TRANSACTION_FAILED',
          message: 'Transaction failed due to a database conflict. Please try again.'
        })
        .mockResolvedValueOnce({ success: true })

      render(<PredictionCommitment {...defaultProps} onCommit={mockCommit} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('1')).toBeInTheDocument()
      })

      const commitButton = screen.getByRole('button', { name: /commit 1/i })
      fireEvent.click(commitButton)

      // Should show error with retry button
      await waitFor(() => {
        expect(screen.getByText(/transaction failed due to a database conflict/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })

      // Click retry
      const retryButton = screen.getByRole('button', { name: /try again/i })
      fireEvent.click(retryButton)

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText(/commitment successful/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors when offline', async () => {
      mockTokenBalanceService.getUserBalance.mockResolvedValue({
        userId: 'test-user-id',
        availableTokens: 100,
        committedTokens: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: new Date(),
        version: 1
      })

      render(<PredictionCommitment {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('1')).toBeInTheDocument()
      })

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      // Trigger offline event
      fireEvent(window, new Event('offline'))

      await waitFor(() => {
        expect(screen.getByText(/offline - please check your connection/i)).toBeInTheDocument()
      })

      const commitButton = screen.getByRole('button', { name: /commit 1/i })
      fireEvent.click(commitButton)

      await waitFor(() => {
        expect(screen.getByText(/no internet connection/i)).toBeInTheDocument()
      })
    })
  })

  describe('Optimistic Updates', () => {
    it('should show optimistic update during commitment', async () => {
      mockTokenBalanceService.getUserBalance.mockResolvedValue({
        userId: 'test-user-id',
        availableTokens: 100,
        committedTokens: 50,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: new Date(),
        version: 1
      })

      let resolveCommit: (value: any) => void
      const mockCommit = jest.fn(() => new Promise(resolve => {
        resolveCommit = resolve
      }))

      render(<PredictionCommitment {...defaultProps} onCommit={mockCommit} />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument() // Available tokens
      })

      const input = screen.getByDisplayValue('1')
      fireEvent.change(input, { target: { value: '10' } })

      const commitButton = screen.getByRole('button', { name: /commit 10/i })
      fireEvent.click(commitButton)

      // Should show optimistic update
      await waitFor(() => {
        expect(screen.getByText(/committing 10 tokens/i)).toBeInTheDocument()
        expect(screen.getByText(/processing/i)).toBeInTheDocument()
      })

      // Balance should be optimistically updated
      expect(screen.getByText('90')).toBeInTheDocument() // 100 - 10

      // Resolve the commitment
      resolveCommit!({ success: true })

      await waitFor(() => {
        expect(screen.getByText(/commitment successful/i)).toBeInTheDocument()
      })
    })

    it('should rollback optimistic update on failure', async () => {
      mockTokenBalanceService.getUserBalance.mockResolvedValue({
        userId: 'test-user-id',
        availableTokens: 100,
        committedTokens: 50,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: new Date(),
        version: 1
      })

      const mockCommit = jest.fn().mockRejectedValue({
        errorCode: 'MARKET_INACTIVE',
        message: 'This market is no longer accepting commitments'
      })

      render(<PredictionCommitment {...defaultProps} onCommit={mockCommit} />)

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument() // Available tokens
      })

      const input = screen.getByDisplayValue('1')
      fireEvent.change(input, { target: { value: '10' } })

      const commitButton = screen.getByRole('button', { name: /commit 10/i })
      fireEvent.click(commitButton)

      // Should show error and rollback balance
      await waitFor(() => {
        expect(screen.getByText(/this market is no longer accepting commitments/i)).toBeInTheDocument()
        expect(screen.getByText('100')).toBeInTheDocument() // Balance rolled back
      })
    })
  })

  describe('Loading States', () => {
    it('should show proper loading state while loading balance', () => {
      mockTokenBalanceService.getUserBalance.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<PredictionCommitment {...defaultProps} />)

      expect(screen.getByText(/loading commitment details/i)).toBeInTheDocument()
      expect(screen.getByText(/loading your balance/i)).toBeInTheDocument()
    })

    it('should show retry count during automatic retries', async () => {
      mockTokenBalanceService.getUserBalance.mockResolvedValue({
        userId: 'test-user-id',
        availableTokens: 100,
        committedTokens: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: new Date(),
        version: 1
      })

      const mockCommit = jest.fn()
        .mockRejectedValueOnce({
          errorCode: 'UNAVAILABLE',
          message: 'Service temporarily unavailable. Please try again.'
        })
        .mockRejectedValueOnce({
          errorCode: 'UNAVAILABLE',
          message: 'Service temporarily unavailable. Please try again.'
        })
        .mockResolvedValueOnce({ success: true })

      render(<PredictionCommitment {...defaultProps} onCommit={mockCommit} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('1')).toBeInTheDocument()
      })

      const commitButton = screen.getByRole('button', { name: /commit 1/i })
      fireEvent.click(commitButton)

      // Should show retry attempts
      await waitFor(() => {
        expect(screen.getByText(/retrying\.\.\. \(1\/3\)/i)).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('Network Status', () => {
    it('should show network status indicators', async () => {
      mockTokenBalanceService.getUserBalance.mockResolvedValue({
        userId: 'test-user-id',
        availableTokens: 100,
        committedTokens: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: new Date(),
        version: 1
      })

      render(<PredictionCommitment {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('1')).toBeInTheDocument()
      })

      // Should show online indicator
      const wifiIcon = document.querySelector('[data-lucide="wifi"]')
      expect(wifiIcon).toBeInTheDocument()

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      fireEvent(window, new Event('offline'))

      await waitFor(() => {
        const wifiOffIcon = document.querySelector('[data-lucide="wifi-off"]')
        expect(wifiOffIcon).toBeInTheDocument()
      })
    })
  })
})