/**
 * Network Status Component Tests
 * 
 * Tests for the network status display component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NetworkStatusComponent } from '@/app/wallet/components/network-status'
import { NetworkService, SUPPORTED_NETWORKS } from '@/lib/services/network-service'

// Mock the NetworkService
jest.mock('@/lib/services/network-service', () => ({
  NetworkService: {
    getCurrentNetworkStatus: jest.fn(),
    onNetworkChange: jest.fn(),
    clearCache: jest.fn(),
    isNetworkSwitchingSupported: jest.fn(),
    supportsPaymaster: jest.fn(),
    supportsFaucet: jest.fn(),
    getCDPFeatures: jest.fn(),
    supportsNetworkSwitching: jest.fn(),
    getNetworkSwitchingInfo: jest.fn(),
  },
  SUPPORTED_NETWORKS: {
    'base-mainnet': {
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
      status: 'active',
      chainId: 8453,
      cdpSupported: true,
    },
    'base-sepolia': {
      id: 'base-sepolia',
      name: 'base-sepolia',
      displayName: 'Base Sepolia',
      isTestnet: true,
      rpcUrl: 'https://sepolia.base.org',
      blockExplorer: 'https://sepolia.basescan.org',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      },
      status: 'active',
      chainId: 84532,
      cdpSupported: true,
    },
  },
}))

// Mock window.open
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn(),
})

const mockNetworkService = NetworkService as jest.Mocked<typeof NetworkService>

describe('NetworkStatusComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockNetworkService.onNetworkChange.mockReturnValue(() => {})
    mockNetworkService.isNetworkSwitchingSupported.mockReturnValue(false)
    mockNetworkService.supportsPaymaster.mockReturnValue(true)
    mockNetworkService.supportsFaucet.mockReturnValue(false)
    mockNetworkService.getCDPFeatures.mockReturnValue({
      paymaster: true,
      faucet: false,
      smartContracts: true,
      trades: true,
      staking: false,
    })
    mockNetworkService.supportsNetworkSwitching.mockReturnValue(false)
    mockNetworkService.getNetworkSwitchingInfo.mockReturnValue({
      supported: false,
      message: 'Network selection is managed by Coinbase CDP',
    })
  })

  it('should render loading state initially', async () => {
    mockNetworkService.getCurrentNetworkStatus.mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    )

    render(<NetworkStatusComponent />)
    
    expect(screen.getByText('Detecting network...')).toBeInTheDocument()
    expect(screen.getByText('Network Status')).toBeInTheDocument()
  })

  it('should display mainnet network information', async () => {
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    render(<NetworkStatusComponent />)
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    expect(screen.getByText('Base Mainnet')).toBeInTheDocument()
    expect(screen.getByText('Mainnet')).toBeInTheDocument()
    expect(screen.getByText('8453')).toBeInTheDocument()
    expect(screen.getByText('ETH')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('should display testnet warning for Base Sepolia', async () => {
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-sepolia'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    render(<NetworkStatusComponent />)
    
    await waitFor(() => {
      expect(screen.getByText('TESTNET WARNING')).toBeInTheDocument()
    })

    expect(screen.getByText('Base Sepolia')).toBeInTheDocument()
    expect(screen.getByText('Testnet')).toBeInTheDocument()
    expect(screen.getByText(/You are connected to a test network/)).toBeInTheDocument()
  })

  it('should display disconnected state when network is not available', async () => {
    const mockStatus = {
      connected: false,
      currentNetwork: null,
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    render(<NetworkStatusComponent />)
    
    await waitFor(() => {
      expect(screen.getByText('Network Disconnected')).toBeInTheDocument()
    })
  })

  it('should handle refresh button click', async () => {
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    render(<NetworkStatusComponent />)
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole('button', { name: /refresh network status/i })
    fireEvent.click(refreshButton)

    expect(mockNetworkService.clearCache).toHaveBeenCalled()
    expect(mockNetworkService.getCurrentNetworkStatus).toHaveBeenCalledTimes(2)
  })

  it('should open block explorer when button is clicked', async () => {
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    render(<NetworkStatusComponent />)
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    const explorerButton = screen.getByText('View on Block Explorer')
    fireEvent.click(explorerButton)

    expect(window.open).toHaveBeenCalledWith('https://basescan.org', '_blank')
  })

  it('should call onNetworkChange callback when network changes', async () => {
    const onNetworkChange = jest.fn()
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    render(<NetworkStatusComponent onNetworkChange={onNetworkChange} />)
    
    await waitFor(() => {
      expect(onNetworkChange).toHaveBeenCalledWith(SUPPORTED_NETWORKS['base-mainnet'])
    })
  })

  it('should display error message when network detection fails', async () => {
    mockNetworkService.getCurrentNetworkStatus.mockRejectedValue(
      new Error('Network detection failed')
    )

    render(<NetworkStatusComponent />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to detect network')).toBeInTheDocument()
    })
  })

  it('should hide details when showDetails is false', async () => {
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    render(<NetworkStatusComponent showDetails={false} />)
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    // Details should not be visible
    expect(screen.queryByText('Chain ID')).not.toBeInTheDocument()
    expect(screen.queryByText('Native Currency')).not.toBeInTheDocument()
  })

  it('should display last updated time', async () => {
    const mockDate = new Date('2024-01-01T12:00:00Z')
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: mockDate,
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    render(<NetworkStatusComponent />)
    
    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
    })
  })

  it('should handle network change events', async () => {
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    let networkChangeCallback: (network: any) => void = () => {}
    
    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)
    mockNetworkService.onNetworkChange.mockImplementation((callback) => {
      networkChangeCallback = callback
      return () => {}
    })

    const onNetworkChange = jest.fn()
    render(<NetworkStatusComponent onNetworkChange={onNetworkChange} />)
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    // Simulate network change
    networkChangeCallback(SUPPORTED_NETWORKS['base-sepolia'])

    expect(onNetworkChange).toHaveBeenCalledWith(SUPPORTED_NETWORKS['base-sepolia'])
  })
})