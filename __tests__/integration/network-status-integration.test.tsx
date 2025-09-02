/**
 * Network Status Integration Test
 * 
 * Integration test for the network status component with CDP integration
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { NetworkStatusComponent } from '@/app/wallet/components/network-status'
import { NetworkService } from '@/lib/services/network-service'

// Mock the network service
jest.mock('@/lib/services/network-service', () => ({
  NetworkService: {
    getCurrentNetworkStatus: jest.fn(),
    clearCache: jest.fn(),
    supportsPaymaster: jest.fn().mockReturnValue(true),
    supportsFaucet: jest.fn().mockReturnValue(true),
    getCDPFeatures: jest.fn().mockReturnValue({
      paymaster: true,
      faucet: true,
      smartContracts: true,
      trades: true,
      staking: false,
    }),
  },
}))

const mockNetworkService = NetworkService as jest.Mocked<typeof NetworkService>

const mockNetwork = {
  id: 'base-mainnet',
  name: 'base',
  displayName: 'Base Mainnet',
  isTestnet: false,
  rpcUrl: 'https://mainnet.base.org',
  blockExplorer: 'https://basescan.org',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  status: 'active' as const,
  chainId: 8453,
  cdpSupported: true,
}

const mockNetworkStatus = {
  connected: true,
  currentNetwork: mockNetwork,
  lastUpdated: new Date(),
}

describe('Network Status Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockNetworkStatus)
  })

  it('should render network status successfully', async () => {
    render(<NetworkStatusComponent />)

    // Should show loading initially
    expect(screen.getByText(/Detecting network/)).toBeInTheDocument()

    // Should show connected status after loading
    await waitFor(() => {
      expect(screen.getByText('Network Connected')).toBeInTheDocument()
    })

    // Should show network details
    expect(screen.getByText('Base Mainnet')).toBeInTheDocument()
    expect(screen.getByText('8453')).toBeInTheDocument()
    expect(screen.getByText('ETH')).toBeInTheDocument()
  })

  it('should handle network service calls correctly', async () => {
    render(<NetworkStatusComponent />)

    await waitFor(() => {
      expect(mockNetworkService.getCurrentNetworkStatus).toHaveBeenCalled()
    })
  })

  it('should show CDP features when available', async () => {
    render(<NetworkStatusComponent showDetails={true} />)

    await waitFor(() => {
      expect(screen.getByText('CDP Features')).toBeInTheDocument()
      expect(screen.getByText('Gasless Txns')).toBeInTheDocument()
      expect(screen.getByText('Smart Contracts')).toBeInTheDocument()
    })
  })

  it('should work without CDP hooks in test environment', async () => {
    // This test verifies that the component works even when CDP hooks are not available
    render(<NetworkStatusComponent />)

    await waitFor(() => {
      expect(screen.getByText('Network Status')).toBeInTheDocument()
    })

    // Wait for loading to complete and show network information
    await waitFor(() => {
      expect(screen.getByText('Network Connected')).toBeInTheDocument()
    })
  })
})