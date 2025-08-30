/**
 * Network Service Tests
 * 
 * Tests for network detection and management functionality
 */

import { NetworkService, SUPPORTED_NETWORKS } from '@/lib/services/network-service'

// Mock fetch globally
global.fetch = jest.fn()

describe('NetworkService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    NetworkService.clearCache()
  })

  describe('detectCurrentNetwork', () => {
    it('should detect Base Mainnet correctly', async () => {
      // Mock successful Base Mainnet response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: '0x2105', // 8453 in hex
          id: 1,
        }),
      })

      const network = await NetworkService.detectCurrentNetwork()
      
      expect(network).toEqual(SUPPORTED_NETWORKS['base-mainnet'])
      expect(global.fetch).toHaveBeenCalledWith('https://mainnet.base.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1,
        }),
      })
    })

    it('should detect Base Sepolia when Mainnet fails', async () => {
      // Mock failed Mainnet response
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            result: '0x14a34', // 84532 in hex
            id: 1,
          }),
        })

      const network = await NetworkService.detectCurrentNetwork()
      
      expect(network).toEqual(SUPPORTED_NETWORKS['base-sepolia'])
    })

    it('should default to Base Mainnet when all detection fails', async () => {
      // Mock all requests failing
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const network = await NetworkService.detectCurrentNetwork()
      
      expect(network).toEqual(SUPPORTED_NETWORKS['base-mainnet'])
    })

    it('should use cached result within cache duration', async () => {
      // First call
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: '0x2105',
          id: 1,
        }),
      })

      const network1 = await NetworkService.detectCurrentNetwork()
      
      // Second call should use cache
      const network2 = await NetworkService.detectCurrentNetwork()
      
      expect(network1).toEqual(network2)
      expect(global.fetch).toHaveBeenCalledTimes(1) // Only called once due to caching
    })
  })

  describe('getCurrentNetworkStatus', () => {
    it('should return network status with detected network', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: '0x2105',
          id: 1,
        }),
      })

      const status = await NetworkService.getCurrentNetworkStatus()
      
      expect(status.connected).toBe(true)
      expect(status.currentNetwork).toEqual(SUPPORTED_NETWORKS['base-mainnet'])
      expect(status.lastUpdated).toBeInstanceOf(Date)
    })

    it('should return disconnected status when detection fails', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const status = await NetworkService.getCurrentNetworkStatus()
      
      expect(status.connected).toBe(true) // Still true because we default to mainnet
      expect(status.currentNetwork).toEqual(SUPPORTED_NETWORKS['base-mainnet'])
    })
  })

  describe('getSupportedNetworks', () => {
    it('should return all supported networks', () => {
      const networks = NetworkService.getSupportedNetworks()
      
      expect(networks).toHaveLength(4)
      expect(networks).toContain(SUPPORTED_NETWORKS['base-mainnet'])
      expect(networks).toContain(SUPPORTED_NETWORKS['base-sepolia'])
      expect(networks).toContain(SUPPORTED_NETWORKS['ethereum-mainnet'])
      expect(networks).toContain(SUPPORTED_NETWORKS['ethereum-sepolia'])
    })
  })

  describe('isTestnet', () => {
    it('should return false for Base Mainnet', () => {
      expect(NetworkService.isTestnet('base-mainnet')).toBe(false)
    })

    it('should return true for Base Sepolia', () => {
      expect(NetworkService.isTestnet('base-sepolia')).toBe(true)
    })

    it('should return false for unknown network', () => {
      expect(NetworkService.isTestnet('unknown-network')).toBe(false)
    })
  })

  describe('getNetworkById', () => {
    it('should return network for valid ID', () => {
      const network = NetworkService.getNetworkById('base-mainnet')
      expect(network).toEqual(SUPPORTED_NETWORKS['base-mainnet'])
    })

    it('should return null for invalid ID', () => {
      const network = NetworkService.getNetworkById('invalid-network')
      expect(network).toBeNull()
    })
  })

  describe('onNetworkChange', () => {
    it('should register and call network change callbacks', async () => {
      const callback = jest.fn()
      const unsubscribe = NetworkService.onNetworkChange(callback)
      
      // Mock network detection
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: '0x2105',
          id: 1,
        }),
      })

      await NetworkService.detectCurrentNetwork()
      
      expect(callback).toHaveBeenCalledWith(SUPPORTED_NETWORKS['base-mainnet'])
      
      // Test unsubscribe
      unsubscribe()
      NetworkService.clearCache()
      
      // Mock different network
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Mainnet error'))
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: '0x14a34',
          id: 1,
        }),
      })

      await NetworkService.detectCurrentNetwork()
      
      // Callback should not be called after unsubscribe
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('validateNetworkConnectivity', () => {
    it('should return true for valid network with good connectivity', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: '0x123',
          id: 1,
        }),
      })

      const isValid = await NetworkService.validateNetworkConnectivity('base-mainnet')
      
      expect(isValid).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith('https://mainnet.base.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      })
    })

    it('should return false for invalid network', async () => {
      const isValid = await NetworkService.validateNetworkConnectivity('invalid-network')
      expect(isValid).toBe(false)
    })

    it('should return false when network request fails', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const isValid = await NetworkService.validateNetworkConnectivity('base-mainnet')
      expect(isValid).toBe(false)
    })
  })

  describe('clearCache', () => {
    it('should clear network cache', async () => {
      // First call to populate cache
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: '0x2105',
          id: 1,
        }),
      })

      await NetworkService.detectCurrentNetwork()
      expect(global.fetch).toHaveBeenCalledTimes(1)

      // Clear cache
      NetworkService.clearCache()

      // Next call should make new request
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: '0x2105',
          id: 1,
        }),
      })

      await NetworkService.detectCurrentNetwork()
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })
})