/**
 * Tests for Profile Page Commitment Display
 * Verifies that real commitment data is displayed correctly
 */

import { render, screen, waitFor } from '@testing-library/react'
import ProfilePage from '@/app/profile/page'
import { useUserCommitments } from '@/hooks/use-user-commitments'
import { useAuth } from '@/app/auth/auth-context'
import { useTokenBalance } from '@/hooks/use-token-balance'
import { useUserProfileData } from '@/hooks/use-user-profile-data'

// Mock dependencies
jest.mock('@/hooks/use-user-commitments')
jest.mock('@/app/auth/auth-context')
jest.mock('@/hooks/use-token-balance')
jest.mock('@/hooks/use-user-profile-data')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}))

const mockUseUserCommitments = useUserCommitments as jest.MockedFunction<typeof useUserCommitments>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseTokenBalance = useTokenBalance as jest.MockedFunction<typeof useTokenBalance>
const mockUseUserProfileData = useUserProfileData as jest.MockedFunction<typeof useUserProfileData>

describe('Profile Page - Real Commitment Display', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User'
  }

  const mockCommitments = [
    {
      id: 'commitment-1',
      marketId: 'market-1',
      marketTitle: 'Will Team A win the championship?',
      position: 'yes' as const,
      tokensCommitted: 100,
      potentialWinning: 150,
      status: 'active' as const,
      committedAt: new Date('2024-01-15T10:00:00Z')
    },
    {
      id: 'commitment-2',
      marketId: 'market-2',
      marketTitle: 'Will it rain tomorrow?',
      position: 'no' as const,
      tokensCommitted: 200,
      potentialWinning: 400,
      status: 'won' as const,
      committedAt: new Date('2024-01-10T15:30:00Z'),
      resolvedAt: new Date('2024-01-20T12:00:00Z')
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock auth
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      signUp: jest.fn()
    })

    // Mock token balance
    mockUseTokenBalance.mockReturnValue({
      totalTokens: 1000,
      isLoading: false,
      error: null,
      refreshBalance: jest.fn()
    })

    // Mock profile data
    mockUseUserProfileData.mockReturnValue({
      predictions: [],
      marketsCreated: [],
      predictionsCount: 0,
      marketsCreatedCount: 0,
      winRate: 0,
      tokensEarned: 0,
      isLoading: false
    })
  })

  it('should display real commitment data in commitments tab', async () => {
    mockUseUserCommitments.mockReturnValue({
      commitments: mockCommitments,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    render(<ProfilePage />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('My Commitments')).toBeInTheDocument()
    })

    // Check that real commitment data is displayed
    expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument()
    expect(screen.getByText('Will it rain tomorrow?')).toBeInTheDocument()
    
    // Check commitment details
    expect(screen.getByText('Position: Yes with 100 tokens')).toBeInTheDocument()
    expect(screen.getByText('Position: No with 200 tokens')).toBeInTheDocument()
    
    // Check status badges
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Won')).toBeInTheDocument()
  })

  it('should show loading state while fetching commitments', async () => {
    mockUseUserCommitments.mockReturnValue({
      commitments: [],
      isLoading: true,
      error: null,
      refetch: jest.fn()
    })

    render(<ProfilePage />)

    expect(screen.getByText('Loading commitments...')).toBeInTheDocument()
  })

  it('should show error state when commitment loading fails', async () => {
    mockUseUserCommitments.mockReturnValue({
      commitments: [],
      isLoading: false,
      error: 'Failed to load commitments',
      refetch: jest.fn()
    })

    render(<ProfilePage />)

    expect(screen.getByText('Error loading commitments')).toBeInTheDocument()
    expect(screen.getByText('Failed to load commitments')).toBeInTheDocument()
  })

  it('should show empty state when user has no commitments', async () => {
    mockUseUserCommitments.mockReturnValue({
      commitments: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    })

    render(<ProfilePage />)

    expect(screen.getByText('No commitments yet')).toBeInTheDocument()
    expect(screen.getByText('Back your opinions to see them here')).toBeInTheDocument()
  })
})