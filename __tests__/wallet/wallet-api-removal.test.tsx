/**
 * Test to verify external API calls have been removed from wallet page
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import WalletPage from '@/app/wallet/page'

// Mock CDP hooks
jest.mock('@coinbase/cdp-hooks', () => ({
  useIsSignedIn: () => ({ isSignedIn: true }),
  useEvmAddress: () => ({ evmAddress: '0x1234567890123456789012345678901234567890' }),
  useSendEvmTransaction: () => ({ sendEvmTransaction: jest.fn(), data: null }),
  useCurrentUser: () => ({ currentUser: { evmSmartAccounts: [] } }),
  useSendUserOperation: () => ({ sendUserOperation: jest.fn(), data: null, status: null }),
  useWaitForUserOperation: () => ({ waitForUserOperation: jest.fn() })
}))

// Mock auth context
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' }
  })
}))

// Mock network status hook
jest.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => ({
    networkStatus: { connected: true, currentNetwork: null },
    isLoading: false,
    isTestnet: false,
    networkName: 'Base Mainnet'
  })
}))

// Mock network status component
jest.mock('@/app/wallet/components/network-status', () => ({
  NetworkStatusComponent: () => <div data-testid="network-status">Network Status</div>
}))

// Mock contextual help
jest.mock('@/app/components/contextual-help', () => ({
  ContextualHelp: () => <div data-testid="contextual-help">Help</div>
}))

// Spy on fetch to ensure no external API calls are made
const fetchSpy = jest.spyOn(global, 'fetch')

describe('Wallet Page - External API Removal', () => {
  beforeEach(() => {
    fetchSpy.mockClear()
  })

  afterAll(() => {
    fetchSpy.mockRestore()
  })

  it('should render wallet page without making external API calls', async () => {
    render(<WalletPage />)
    
    // Wait for component to render
    expect(screen.getByText('Smart Wallet')).toBeInTheDocument()
    
    // Verify no external API calls were made
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('api.basescan.org')
    )
    
    // Verify no RPC calls to external endpoints
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('mainnet.base.org')
    )
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('sepolia.base.org')
    )
  })

  it('should show wallet balance section without external API calls', () => {
    render(<WalletPage />)
    
    expect(screen.getByText('Wallet Balance')).toBeInTheDocument()
    
    // Verify no basescan API calls for balance
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/api\.basescan\.org.*balance/)
    )
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/api\.basescan\.org.*tokenbalance/)
    )
  })

  it('should show transaction history section without external API calls', () => {
    render(<WalletPage />)
    
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument()
    
    // Verify no basescan API calls for transactions
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/api\.basescan\.org.*txlist/)
    )
  })

  it('should show network status without external RPC calls', () => {
    render(<WalletPage />)
    
    expect(screen.getByTestId('network-status')).toBeInTheDocument()
    
    // Verify no RPC calls for network detection
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('mainnet.base.org'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('eth_chainId')
      })
    )
  })
})