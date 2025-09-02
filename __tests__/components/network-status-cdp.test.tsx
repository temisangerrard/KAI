/**
 * Network Status Component Tests (CDP Integration)
 * 
 * Tests for the enhanced network status component with CDP integration
 * and error handling.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NetworkStatusComponent } from '@/app/wallet/components/network-status'
import { NetworkService } from '@/lib/services/network-service'
import { WalletErrorService } from '@/lib/services/wallet-error-service'

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

// Mock the wallet error service
jest.mock('@/lib/services/wallet-error-service', () => ({
  WalletErrorService: {
    handleApiError: jest.fn(),
    logError: jest.fn(),
    createContext: jest.fn().mockReturnValue({}),
    isRetryable: jest.fn().mockReturnValue(true),
    shouldRetry: jest.fn().mockReturnValue(true),
    getRetryStrategy: jest.fn().mockReturnValue({
      shouldRetry: true,
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitterEnabled: true,
    }),
    calculateRetryDelay: jest.fn().mockReturnValue(1000),
    getUserMessage: jest.fn().mockReturnValue('Network connection failed. Please check your internet connection.'),
  },
}))

// Mock CDP hooks (they're already handled in the component with fallbacks)
jest.mock('@coinbase/cdp-hooks', () => ({
  useIsSignedIn: () => ({ isSignedIn: false }),
  useEvmAddress: () => ({ evmAddress: null }),
}))

const mockNetworkService = NetworkService as jest.Mocked<typeof NetworkService>
const mockWalletErrorService = WalletErrorService as jest.Mocked<typeof WalletErrorService>

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

describe('NetworkStatusComponent (CDP Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockNetworkStatus)
  })

  it('should render network status with CDP integration', async () => {
    render(<NetworkStatusComponent />)

    expect(screen.getByText('Network Status')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Network Connected')).toBeInTheDocument()
    })
  })

  it('should show CDP connection status when signed in', async () => {
    // Mock CDP hooks to return signed in state
    jest.doMock('@coinbase/cdp-hooks', () => ({
      useIsSignedIn: () => ({ isSignedIn: true }),
      useEvmAddress: () => ({ evmAddress: '0x123...abc' }),
    }))

    render(<NetworkStatusComponent />)

    await waitFor(() => {
      expect(screen.getByText('CDP Network Status')).toBeInTheDocument()
    })
  })

  it('should handle network errors with CDP error service', async () => {
    const mockError = {
      code: 'NETWORK_CONNECTION',
      message: 'Network connection failed',
      userMessage: 'Network connection failed. Please check your internet connection.',
      recoverable: true,
      retryable: true,
      category: 'network' as const,
      severity: 'high' as const,
      timestamp: new Date(),
    }

    mockNetworkService.getCurrentNetworkStatus.mockRejectedValue(new Error('Network error'))
    mockWalletErrorService.handleApiError.mockReturnValue(mockError)

    render(<NetworkStatusComponent />)

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument()
      expect(screen.getByText('Network connection failed. Please check your internet connection.')).toBeInTheDocument()
    })

    expect(mockWalletErrorService.handleApiError).toHaveBeenCalled()
    expect(mockWalletErrorService.logError).toHaveBeenCalled()
  })

  it('should show retry button for retryable errors', async () => {
    const mockError = {
      code: 'NETWORK_CONNECTION',
      message: 'Network connection failed',
      userMessage: 'Network connection failed. Please check your internet connection.',
      recoverable: true,
      retryable: true,
      category: 'network' as const,
      severity: 'high' as const,
      timestamp: new Date(),
    }

    mockNetworkService.getCurrentNetworkStatus.mockRejectedValue(new Error('Network error'))
    mockWalletErrorService.handleApiError.mockReturnValue(mockError)

    render(<NetworkStatusComponent />)

    await waitFor(() => {
      expect(screen.getByText(/Retry/)).toBeInTheDocument()
    })

    const retryButton = screen.getByText(/Retry/)
    fireEvent.click(retryButton)

    expect(mockNetworkService.clearCache).toHaveBeenCalled()
  })

  it('should show testnet warning for testnet networks', async () => {
    const testnetNetwork = {
      ...mockNetwork,
      id: 'base-sepolia',
      displayName: 'Base Sepolia',
      isTestnet: true,
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue({
      ...mockNetworkStatus,
      currentNetwork: testnetNetwork,
    })

    render(<NetworkStatusComponent />)

    await waitFor(() => {
      expect(screen.getByText('TESTNET WARNING')).toBeInTheDocument()
    })
  })

  it('should show CDP features for supported networks', async () => {
    render(<NetworkStatusComponent showDetails={true} />)

    await waitFor(() => {
      expect(screen.getByText('CDP Features')).toBeInTheDocument()
      expect(screen.getByText('Gasless Txns')).toBeInTheDocument()
    })
  })

  it('should handle refresh button click', async () => {
    render(<NetworkStatusComponent />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    expect(mockNetworkService.clearCache).toHaveBeenCalled()
  })

  it('should call onNetworkChange callback', async () => {
    const onNetworkChange = jest.fn()
    
    render(<NetworkStatusComponent onNetworkChange={onNetworkChange} />)

    await waitFor(() => {
      expect(onNetworkChange).toHaveBeenCalledWith(mockNetwork)
    })
  })

  it('should show auto-retry badge for retryable errors', async () => {
    const mockError = {
      code: 'NETWORK_CONNECTION',
      message: 'Network connection failed',
      userMessage: 'Network connection failed. Please check your internet connection.',
      recoverable: true,
      retryable: true,
      category: 'network' as const,
      severity: 'high' as const,
      timestamp: new Date(),
    }

    mockNetworkService.getCurrentNetworkStatus.mockRejectedValue(new Error('Network error'))
    mockWalletErrorService.handleApiError.mockReturnValue(mockError)

    render(<NetworkStatusComponent />)

    await waitFor(() => {
      expect(screen.getByText('Auto-retry')).toBeInTheDocument()
    })
  })
})