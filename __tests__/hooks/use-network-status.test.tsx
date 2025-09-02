/**
 * Network Status Hook Tests
 * 
 * Tests for the useNetworkStatus custom hook
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { NetworkService, SUPPORTED_NETWORKS } from '@/lib/services/network-service'

// Mock the NetworkService
jest.mock('@/lib/services/network-service', () => ({
  NetworkService: {
    getCurrentNetworkStatus: jest.fn(),
    onNetworkChange: jest.fn(),
    clearCache: jest.fn(),
    isNetworkSwitchingSupported: jest.fn(),
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

const mockNetworkService = NetworkService as jest.Mocked<typeof NetworkService>

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    // Default mock implementation
    mockNetworkService.onNetworkChange.mockReturnValue(() => {})
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with loading state', () => {
    mockNetworkService.getCurrentNetworkStatus.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.networkStatus.connected).toBe(false)
    expect(result.current.networkStatus.currentNetwork).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should load network status successfully', async () => {
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    const { result } = renderHook(() => useNetworkStatus())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.networkStatus).toEqual(mockStatus)
    expect(result.current.error).toBeNull()
    expect(result.current.isTestnet).toBe(false)
    expect(result.current.networkName).toBe('Base Mainnet')
    expect(result.current.chainId).toBe(8453)
  })

  it('should detect testnet correctly', async () => {
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-sepolia'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    const { result } = renderHook(() => useNetworkStatus())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isTestnet).toBe(true)
    expect(result.current.networkName).toBe('Base Sepolia')
    expect(result.current.chainId).toBe(84532)
  })

  it('should handle network detection errors', async () => {
    const errorMessage = 'Network detection failed'
    mockNetworkService.getCurrentNetworkStatus.mockRejectedValue(
      new Error(errorMessage)
    )

    const { result } = renderHook(() => useNetworkStatus())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe(errorMessage)
    expect(result.current.networkStatus.connected).toBe(false)
  })

  it('should call onNetworkChange callback', async () => {
    const onNetworkChange = jest.fn()
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    renderHook(() => useNetworkStatus({ onNetworkChange }))

    await waitFor(() => {
      expect(onNetworkChange).toHaveBeenCalledWith(SUPPORTED_NETWORKS['base-mainnet'])
    })
  })

  it('should refresh network status', async () => {
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    const { result } = renderHook(() => useNetworkStatus())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Call refresh
    await act(async () => {
      await result.current.refresh()
    })

    expect(mockNetworkService.clearCache).toHaveBeenCalled()
    expect(mockNetworkService.getCurrentNetworkStatus).toHaveBeenCalledTimes(2)
  })

  it('should clear error state', async () => {
    mockNetworkService.getCurrentNetworkStatus.mockRejectedValue(
      new Error('Network error')
    )

    const { result } = renderHook(() => useNetworkStatus())

    await waitFor(() => {
      expect(result.current.error).toBe('Network error')
    })

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
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
    const { result } = renderHook(() => useNetworkStatus({ onNetworkChange }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Simulate network change
    act(() => {
      networkChangeCallback(SUPPORTED_NETWORKS['base-sepolia'])
    })

    expect(result.current.networkStatus.currentNetwork).toEqual(SUPPORTED_NETWORKS['base-sepolia'])
    expect(onNetworkChange).toHaveBeenCalledWith(SUPPORTED_NETWORKS['base-sepolia'])
  })

  it('should set up auto-refresh interval', async () => {
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    renderHook(() => useNetworkStatus({ 
      autoRefresh: true, 
      refreshInterval: 5000 
    }))

    await waitFor(() => {
      expect(mockNetworkService.getCurrentNetworkStatus).toHaveBeenCalledTimes(1)
    })

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    await waitFor(() => {
      expect(mockNetworkService.getCurrentNetworkStatus).toHaveBeenCalledTimes(2)
    })
  })

  it('should disable auto-refresh when autoRefresh is false', async () => {
    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    renderHook(() => useNetworkStatus({ 
      autoRefresh: false 
    }))

    await waitFor(() => {
      expect(mockNetworkService.getCurrentNetworkStatus).toHaveBeenCalledTimes(1)
    })

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(60000)
    })

    // Should not call again
    expect(mockNetworkService.getCurrentNetworkStatus).toHaveBeenCalledTimes(1)
  })

  it('should cleanup on unmount', async () => {
    const unsubscribe = jest.fn()
    mockNetworkService.onNetworkChange.mockReturnValue(unsubscribe)

    const mockStatus = {
      connected: true,
      currentNetwork: SUPPORTED_NETWORKS['base-mainnet'],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
    }

    mockNetworkService.getCurrentNetworkStatus.mockResolvedValue(mockStatus)

    const { unmount } = renderHook(() => useNetworkStatus({ 
      autoRefresh: true, 
      refreshInterval: 5000 
    }))

    await waitFor(() => {
      expect(mockNetworkService.onNetworkChange).toHaveBeenCalled()
    })

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })

  it('should return correct computed values for disconnected state', () => {
    mockNetworkService.getCurrentNetworkStatus.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current.isTestnet).toBe(false)
    expect(result.current.networkName).toBeNull()
    expect(result.current.chainId).toBeNull()
  })
})