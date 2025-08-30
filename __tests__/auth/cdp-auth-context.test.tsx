/**
 * CDP Auth Context Integration Tests
 * 
 * Tests the updated auth context that uses CDP hooks instead of Firebase Auth
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/lib/auth/auth-context'

// Mock CDP hooks
jest.mock('@coinbase/cdp-hooks', () => ({
  useIsSignedIn: jest.fn(),
  useCurrentUser: jest.fn(),
  useEvmAddress: jest.fn(),
  useSignOut: jest.fn(),
}))

// Mock CDP providers to avoid import issues in tests
jest.mock('@/app/providers/cdp-providers', () => ({
  CDPProviders: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock auth service
jest.mock('@/lib/auth/auth-service', () => ({
  authService: {
    getUserByAddress: jest.fn(),
  },
}))

const mockUseIsSignedIn = require('@coinbase/cdp-hooks').useIsSignedIn
const mockUseCurrentUser = require('@coinbase/cdp-hooks').useCurrentUser
const mockUseEvmAddress = require('@coinbase/cdp-hooks').useEvmAddress
const mockUseSignOut = require('@coinbase/cdp-hooks').useSignOut
const mockAuthService = require('@/lib/auth/auth-service').authService

// Test component that uses auth context
function TestComponent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return <div>Loading...</div>
  }
  
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      {user && (
        <div data-testid="user-info">
          <div data-testid="user-address">{user.address}</div>
          <div data-testid="user-email">{user.email}</div>
        </div>
      )}
    </div>
  )
}

describe('CDP Auth Context Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSignOut.mockReturnValue({ signOut: jest.fn() })
  })

  it('should show not authenticated when user is not signed in', async () => {
    mockUseIsSignedIn.mockReturnValue(false)
    mockUseCurrentUser.mockReturnValue(null)
    mockUseEvmAddress.mockReturnValue(null)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
    })
  })

  it('should show authenticated when user is signed in with CDP', async () => {
    const mockWalletAddress = '0x1234567890123456789012345678901234567890'
    const mockCDPUser = {
      email: 'test@example.com'
    }

    const mockAuthUser = {
      address: '0x1234567890123456789012345678901234567890',
      email: 'test@example.com',
      displayName: 'Test User',
      tokenBalance: 1000,
      hasCompletedOnboarding: true,
      level: 1,
      totalPredictions: 5,
      correctPredictions: 3,
      streak: 2,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      isInitialized: true,
      stats: {
        predictionsCount: 5,
        marketsCreated: 0,
        winRate: 60,
        tokensEarned: 500,
      },
    }

    mockUseIsSignedIn.mockReturnValue(true)
    mockUseCurrentUser.mockReturnValue(mockCDPUser)
    mockUseEvmAddress.mockReturnValue(mockWalletAddress)
    mockAuthService.getUserByAddress.mockResolvedValue(mockAuthUser)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      expect(screen.getByTestId('user-address')).toHaveTextContent('0x1234567890123456789012345678901234567890')
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })

    expect(mockAuthService.getUserByAddress).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890')
  })

  it('should handle CDP user without profile gracefully', async () => {
    const mockWalletAddress = '0x1234567890123456789012345678901234567890'
    const mockCDPUser = {
      email: 'test@example.com'
    }

    mockUseIsSignedIn.mockReturnValue(true)
    mockUseCurrentUser.mockReturnValue(mockCDPUser)
    mockUseEvmAddress.mockReturnValue(mockWalletAddress)
    mockAuthService.getUserByAddress.mockResolvedValue(null)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
    })

    expect(mockAuthService.getUserByAddress).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890')
  })

  it('should handle errors during user fetch gracefully', async () => {
    const mockWalletAddress = '0x1234567890123456789012345678901234567890'
    const mockCDPUser = {
      email: 'test@example.com'
    }

    mockUseIsSignedIn.mockReturnValue(true)
    mockUseCurrentUser.mockReturnValue(mockCDPUser)
    mockUseEvmAddress.mockReturnValue(mockWalletAddress)
    mockAuthService.getUserByAddress.mockRejectedValue(new Error('Database error'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
    })
  })
})