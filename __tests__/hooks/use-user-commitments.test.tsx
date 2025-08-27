/**
 * Tests for useUserCommitments hook
 * Verifies that real commitment data is fetched and displayed correctly
 */

import { renderHook, waitFor } from '@testing-library/react'
import { useUserCommitments } from '@/hooks/use-user-commitments'
import { PredictionCommitmentService } from '@/lib/services/token-database'
import { useAuth } from '@/app/auth/auth-context'

// Mock dependencies
jest.mock('@/lib/services/token-database')
jest.mock('@/app/auth/auth-context')

const mockPredictionCommitmentService = PredictionCommitmentService as jest.Mocked<typeof PredictionCommitmentService>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('useUserCommitments', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User'
  }

  const mockCommitments = [
    {
      id: 'commitment-1',
      userId: 'test-user-123',
      predictionId: 'prediction-1',
      tokensCommitted: 100,
      position: 'yes' as const,
      odds: 1.5,
      potentialWinning: 150,
      status: 'active' as const,
      committedAt: {
        toDate: () => new Date('2024-01-15T10:00:00Z')
      },
      metadata: {
        marketTitle: 'Will Team A win the championship?',
        marketStatus: 'active' as const,
        marketEndsAt: {
          toDate: () => new Date('2024-02-01T00:00:00Z')
        },
        oddsSnapshot: {
          yesOdds: 1.5,
          noOdds: 2.5,
          totalYesTokens: 1000,
          totalNoTokens: 400,
          totalParticipants: 25
        },
        userBalanceAtCommitment: 500,
        commitmentSource: 'web' as const
      }
    },
    {
      id: 'commitment-2',
      userId: 'test-user-123',
      predictionId: 'prediction-2',
      tokensCommitted: 200,
      position: 'no' as const,
      odds: 2.0,
      potentialWinning: 400,
      status: 'won' as const,
      committedAt: {
        toDate: () => new Date('2024-01-10T15:30:00Z')
      },
      resolvedAt: {
        toDate: () => new Date('2024-01-20T12:00:00Z')
      },
      metadata: {
        marketTitle: 'Will it rain tomorrow?',
        marketStatus: 'resolved' as const,
        marketEndsAt: {
          toDate: () => new Date('2024-01-20T00:00:00Z')
        },
        oddsSnapshot: {
          yesOdds: 1.8,
          noOdds: 2.0,
          totalYesTokens: 800,
          totalNoTokens: 600,
          totalParticipants: 18
        },
        userBalanceAtCommitment: 400,
        commitmentSource: 'mobile' as const
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      signUp: jest.fn()
    })
  })

  it('should fetch and transform user commitments correctly', async () => {
    mockPredictionCommitmentService.getUserCommitments.mockResolvedValue(mockCommitments)

    const { result } = renderHook(() => useUserCommitments())

    // Initially loading
    expect(result.current.isLoading).toBe(true)
    expect(result.current.commitments).toEqual([])

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Verify service was called with correct user ID
    expect(mockPredictionCommitmentService.getUserCommitments).toHaveBeenCalledWith('test-user-123')

    // Verify commitments are transformed correctly
    expect(result.current.commitments).toHaveLength(2)
    
    const [commitment1, commitment2] = result.current.commitments

    // Check first commitment
    expect(commitment1).toEqual({
      id: 'commitment-1',
      marketId: 'prediction-1',
      marketTitle: 'Will Team A win the championship?',
      position: 'yes',
      tokensCommitted: 100,
      potentialWinning: 150,
      status: 'active',
      committedAt: new Date('2024-01-15T10:00:00Z'),
      resolvedAt: undefined
    })

    // Check second commitment
    expect(commitment2).toEqual({
      id: 'commitment-2',
      marketId: 'prediction-2',
      marketTitle: 'Will it rain tomorrow?',
      position: 'no',
      tokensCommitted: 200,
      potentialWinning: 400,
      status: 'won',
      committedAt: new Date('2024-01-10T15:30:00Z'),
      resolvedAt: new Date('2024-01-20T12:00:00Z')
    })

    expect(result.current.error).toBeNull()
  })

  it('should handle empty commitments list', async () => {
    mockPredictionCommitmentService.getUserCommitments.mockResolvedValue([])

    const { result } = renderHook(() => useUserCommitments())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.commitments).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should handle service errors gracefully', async () => {
    const errorMessage = 'Failed to fetch commitments'
    mockPredictionCommitmentService.getUserCommitments.mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useUserCommitments())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.commitments).toEqual([])
    expect(result.current.error).toBe(errorMessage)
  })

  it('should not fetch commitments when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      logout: jest.fn(),
      signUp: jest.fn()
    })

    const { result } = renderHook(() => useUserCommitments())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockPredictionCommitmentService.getUserCommitments).not.toHaveBeenCalled()
    expect(result.current.commitments).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should handle commitments with missing metadata gracefully', async () => {
    const commitmentWithoutMetadata = {
      ...mockCommitments[0],
      metadata: undefined
    }

    mockPredictionCommitmentService.getUserCommitments.mockResolvedValue([commitmentWithoutMetadata])

    const { result } = renderHook(() => useUserCommitments())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.commitments).toHaveLength(1)
    expect(result.current.commitments[0].marketTitle).toBe('Market prediction-1')
  })
})