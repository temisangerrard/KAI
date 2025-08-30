/**
 * Auth Context Component Integration Tests
 * 
 * Tests that existing components still work with the updated CDP-based auth context
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { useAuth } from '@/app/auth/auth-context'

// Mock CDP hooks
jest.mock('@coinbase/cdp-hooks', () => ({
  useIsSignedIn: jest.fn(),
  useCurrentUser: jest.fn(),
  useEvmAddress: jest.fn(),
  useSignOut: jest.fn(),
}))

// Mock CDP providers
jest.mock('@/app/providers/cdp-providers', () => ({
  CDPProviders: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock auth service
jest.mock('@/lib/auth/auth-service', () => ({
  authService: {
    getUserByAddress: jest.fn(),
  },
}))

// Mock other hooks that might be used
jest.mock('@/hooks/use-token-balance', () => ({
  useTokenBalance: () => ({
    totalTokens: 1000,
    availableTokens: 500,
    isLoading: false,
  }),
}))

const mockUseIsSignedIn = require('@coinbase/cdp-hooks').useIsSignedIn
const mockUseCurrentUser = require('@coinbase/cdp-hooks').useCurrentUser
const mockUseEvmAddress = require('@coinbase/cdp-hooks').useEvmAddress
const mockUseSignOut = require('@coinbase/cdp-hooks').useSignOut
const mockAuthService = require('@/lib/auth/auth-service').authService

// Test component that mimics how existing components use auth
function TestExistingComponent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  
  if (isLoading) {
    return <div data-testid="loading">Loading...</div>
  }
  
  if (!isAuthenticated) {
    return <div data-testid="not-authenticated">Please log in</div>
  }
  
  return (
    <div data-testid="authenticated-content">
      <div data-testid="user-display-name">{user?.displayName}</div>
      <div data-testid="user-address">{user?.address}</div>
      <div data-testid="user-email">{user?.email}</div>
      <div data-testid="user-token-balance">{user?.tokenBalance}</div>
      <div data-testid="user-level">{user?.level}</div>
      <div data-testid="user-predictions">{user?.totalPredictions}</div>
      <div data-testid="user-win-rate">{user?.stats?.winRate}%</div>
      <button data-testid="logout-button" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

describe('Auth Context Component Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSignOut.mockReturnValue({ signOut: jest.fn() })
  })

  it('should work with existing component patterns when user is authenticated', async () => {
    const mockWalletAddress = '0x1234567890123456789012345678901234567890'
    const mockCDPUser = {
      email: 'test@example.com'
    }

    const mockAuthUser = {
      address: '0x1234567890123456789012345678901234567890',
      email: 'test@example.com',
      displayName: 'John Doe',
      tokenBalance: 2500,
      hasCompletedOnboarding: true,
      level: 3,
      totalPredictions: 15,
      correctPredictions: 10,
      streak: 5,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      isInitialized: true,
      stats: {
        predictionsCount: 15,
        marketsCreated: 2,
        winRate: 66.67,
        tokensEarned: 1200,
      },
    }

    mockUseIsSignedIn.mockReturnValue(true)
    mockUseCurrentUser.mockReturnValue(mockCDPUser)
    mockUseEvmAddress.mockReturnValue(mockWalletAddress)
    mockAuthService.getUserByAddress.mockResolvedValue(mockAuthUser)

    const { AuthProvider } = require('@/lib/auth/auth-context')
    
    render(
      <AuthProvider>
        <TestExistingComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated-content')).toBeInTheDocument()
      expect(screen.getByTestId('user-display-name')).toHaveTextContent('John Doe')
      expect(screen.getByTestId('user-address')).toHaveTextContent('0x1234567890123456789012345678901234567890')
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('user-token-balance')).toHaveTextContent('2500')
      expect(screen.getByTestId('user-level')).toHaveTextContent('3')
      expect(screen.getByTestId('user-predictions')).toHaveTextContent('15')
      expect(screen.getByTestId('user-win-rate')).toHaveTextContent('66.67%')
    }, { timeout: 10000 })
  })

  it('should show not authenticated state when user is not signed in', async () => {
    mockUseIsSignedIn.mockReturnValue(false)
    mockUseCurrentUser.mockReturnValue(null)
    mockUseEvmAddress.mockReturnValue(null)

    const { AuthProvider } = require('@/lib/auth/auth-context')
    
    render(
      <AuthProvider>
        <TestExistingComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('not-authenticated')).toHaveTextContent('Please log in')
    }, { timeout: 10000 })
  })

  it('should eventually resolve loading state', async () => {
    mockUseIsSignedIn.mockReturnValue(false)
    mockUseCurrentUser.mockReturnValue(null)
    mockUseEvmAddress.mockReturnValue(null)

    const { AuthProvider } = require('@/lib/auth/auth-context')
    
    render(
      <AuthProvider>
        <TestExistingComponent />
      </AuthProvider>
    )

    // Should eventually resolve to not authenticated (loading state resolves quickly in tests)
    await waitFor(() => {
      expect(screen.getByTestId('not-authenticated')).toHaveTextContent('Please log in')
    }, { timeout: 10000 })
  })

  it('should maintain backward compatibility with user object structure', async () => {
    const mockWalletAddress = '0x1234567890123456789012345678901234567890'
    const mockCDPUser = {
      email: 'test@example.com'
    }

    const mockAuthUser = {
      address: '0x1234567890123456789012345678901234567890', // Changed from 'id' to 'address'
      email: 'test@example.com',
      displayName: 'Jane Smith',
      profileImage: 'https://example.com/avatar.jpg',
      tokenBalance: 1500,
      hasCompletedOnboarding: true,
      level: 2,
      totalPredictions: 8,
      correctPredictions: 6,
      streak: 3,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      bio: 'Test bio',
      location: 'Test location',
      joinDate: '2024-01-01T00:00:00.000Z',
      isInitialized: true, // New field for CDP
      stats: {
        predictionsCount: 8,
        marketsCreated: 1,
        winRate: 75,
        tokensEarned: 800,
      },
      predictions: [],
      marketsCreated: [],
    }

    mockUseIsSignedIn.mockReturnValue(true)
    mockUseCurrentUser.mockReturnValue(mockCDPUser)
    mockUseEvmAddress.mockReturnValue(mockWalletAddress)
    mockAuthService.getUserByAddress.mockResolvedValue(mockAuthUser)

    const { AuthProvider } = require('@/lib/auth/auth-context')
    
    render(
      <AuthProvider>
        <TestExistingComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      // Verify all expected fields are accessible
      expect(screen.getByTestId('user-display-name')).toHaveTextContent('Jane Smith')
      expect(screen.getByTestId('user-address')).toHaveTextContent('0x1234567890123456789012345678901234567890')
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('user-token-balance')).toHaveTextContent('1500')
      expect(screen.getByTestId('user-level')).toHaveTextContent('2')
      expect(screen.getByTestId('user-predictions')).toHaveTextContent('8')
      expect(screen.getByTestId('user-win-rate')).toHaveTextContent('75%')
    }, { timeout: 10000 })
  })
})