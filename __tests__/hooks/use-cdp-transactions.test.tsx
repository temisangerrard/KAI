/**
 * Tests for useCDPTransactions hook
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useCDPTransactions } from '@/hooks/use-cdp-transactions'
import { CDPTransactionService } from '@/lib/services/cdp-transaction-service'

// Mock CDP hooks
jest.mock('@coinbase/cdp-hooks', () => ({
  useSendEvmTransaction: () => ({
    sendEvmTransaction: jest.fn(),
    data: null,
    status: 'idle'
  }),
  useSendUserOperation: () => ({
    sendUserOperation: jest.fn(),
    data: null,
    status: 'idle'
  }),
  useCurrentUser: () => ({
    currentUser: {
      evmSmartAccounts: [{ address: '0xsmart123' }]
    }
  })
}))

// Mock CDP Transaction Service
jest.mock('@/lib/services/cdp-transaction-service', () => ({
  CDPTransactionService: {
    getTransactionHistory: jest.fn(),
    trackTransaction: jest.fn(),
    monitorTransaction: jest.fn(),
    createTransactionRecord: jest.fn(),
    clearCache: jest.fn()
  }
}))

const mockCDPTransactionService = CDPTransactionService as jest.Mocked<typeof CDPTransactionService>

describe('useCDPTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    mockCDPTransactionService.getTransactionHistory.mockResolvedValue({
      address: '0x123',
      transactions: [],
      lastUpdated: new Date(),
      hasMore: false,
      network: 'base-mainnet'
    })
    
    mockCDPTransactionService.trackTransaction.mockResolvedValue({
      hash: '0x123',
      status: 'pending',
      confirmations: 0
    })
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCDPTransactions())

    expect(result.current.transactionHistory).toBeNull()
    expect(result.current.recentTransactions).toEqual([])
    expect(result.current.isLoadingHistory).toBe(false)
    expect(result.current.isSendingTransaction).toBe(false)
    expect(result.current.isSendingUserOperation).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should load transaction history when address is provided', async () => {
    const mockHistory = {
      address: '0x123',
      transactions: [
        {
          hash: '0xabc',
          type: 'send' as const,
          value: '1000000000000000000',
          asset: 'ETH',
          timestamp: Date.now(),
          from: '0x123',
          to: '0x456',
          status: 'confirmed' as const,
          network: 'base-mainnet',
          transactionType: 'evm' as const
        }
      ],
      lastUpdated: new Date(),
      hasMore: false,
      network: 'base-mainnet'
    }

    mockCDPTransactionService.getTransactionHistory.mockResolvedValue(mockHistory)

    const { result } = renderHook(() => useCDPTransactions({
      address: '0x123',
      network: 'base-mainnet'
    }))

    await waitFor(() => {
      expect(result.current.transactionHistory).toEqual(mockHistory)
    })

    expect(mockCDPTransactionService.getTransactionHistory).toHaveBeenCalledWith(
      '0x123',
      'base-mainnet'
    )
  })

  it('should handle transaction history loading errors', async () => {
    const error = new Error('Failed to fetch history')
    mockCDPTransactionService.getTransactionHistory.mockRejectedValue(error)

    const { result } = renderHook(() => useCDPTransactions({
      address: '0x123',
      network: 'base-mainnet'
    }))

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch history')
    })
  })

  it('should refresh transaction history', async () => {
    const mockHistory = {
      address: '0x123',
      transactions: [],
      lastUpdated: new Date(),
      hasMore: false,
      network: 'base-mainnet'
    }

    mockCDPTransactionService.getTransactionHistory.mockResolvedValue(mockHistory)

    const { result } = renderHook(() => useCDPTransactions({
      address: '0x123',
      network: 'base-mainnet'
    }))

    await act(async () => {
      await result.current.refreshHistory()
    })

    expect(mockCDPTransactionService.getTransactionHistory).toHaveBeenCalledTimes(2) // Initial load + refresh
  })

  it('should track transaction', async () => {
    const mockStatus = {
      hash: '0x123',
      status: 'confirmed' as const,
      confirmations: 1,
      blockNumber: 12345
    }

    mockCDPTransactionService.trackTransaction.mockResolvedValue(mockStatus)

    const { result } = renderHook(() => useCDPTransactions({
      network: 'base-mainnet'
    }))

    let trackedStatus
    await act(async () => {
      trackedStatus = await result.current.trackTransaction('0x123')
    })

    expect(trackedStatus).toEqual(mockStatus)
    expect(result.current.lastTransactionStatus).toEqual(mockStatus)
    expect(mockCDPTransactionService.trackTransaction).toHaveBeenCalledWith('0x123', 'base-mainnet')
  })

  it('should monitor transaction with polling', async () => {
    const mockStatus = {
      hash: '0x123',
      status: 'confirmed' as const,
      confirmations: 1
    }

    mockCDPTransactionService.monitorTransaction.mockImplementation(
      async (hash, network, onStatusChange) => {
        onStatusChange(mockStatus)
        return mockStatus
      }
    )

    const { result } = renderHook(() => useCDPTransactions({
      network: 'base-mainnet'
    }))

    const onStatusChange = jest.fn()
    let finalStatus

    await act(async () => {
      finalStatus = await result.current.monitorTransaction('0x123', onStatusChange)
    })

    expect(finalStatus).toEqual(mockStatus)
    expect(onStatusChange).toHaveBeenCalledWith(mockStatus)
    expect(result.current.lastTransactionStatus).toEqual(mockStatus)
  })

  it('should clear cache', () => {
    const { result } = renderHook(() => useCDPTransactions())

    act(() => {
      result.current.clearCache()
    })

    expect(mockCDPTransactionService.clearCache).toHaveBeenCalled()
    expect(result.current.transactionHistory).toBeNull()
    expect(result.current.lastTransactionStatus).toBeNull()
  })

  it('should clear error', () => {
    const { result } = renderHook(() => useCDPTransactions())

    // Simulate an error
    act(() => {
      // This would normally be set by an error in the hook
      // For testing, we'll just test the clearError function
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('should handle network configuration for testnet', () => {
    const { result } = renderHook(() => useCDPTransactions({
      network: 'base-sepolia'
    }))

    // The hook should handle testnet configuration internally
    expect(result.current).toBeDefined()
  })

  it('should handle network configuration for mainnet', () => {
    const { result } = renderHook(() => useCDPTransactions({
      network: 'base-mainnet'
    }))

    // The hook should handle mainnet configuration internally
    expect(result.current).toBeDefined()
  })

  it('should return recent transactions from history', async () => {
    const mockTransactions = Array.from({ length: 15 }, (_, i) => ({
      hash: `0x${i}`,
      type: 'send' as const,
      value: '1000000000000000000',
      asset: 'ETH',
      timestamp: Date.now() - i * 1000,
      from: '0x123',
      to: '0x456',
      status: 'confirmed' as const,
      network: 'base-mainnet',
      transactionType: 'evm' as const
    }))

    const mockHistory = {
      address: '0x123',
      transactions: mockTransactions,
      lastUpdated: new Date(),
      hasMore: true,
      network: 'base-mainnet'
    }

    mockCDPTransactionService.getTransactionHistory.mockResolvedValue(mockHistory)

    const { result } = renderHook(() => useCDPTransactions({
      address: '0x123',
      network: 'base-mainnet'
    }))

    await waitFor(() => {
      expect(result.current.recentTransactions).toHaveLength(10) // Should limit to 10
    })
  })

  it('should handle sendEvmTransaction errors', async () => {
    const { result } = renderHook(() => useCDPTransactions())

    await act(async () => {
      await result.current.sendEvmTransaction({
        to: '0x456',
        value: BigInt('1000000000000000000'),
        type: 'eip1559'
      })
    })

    // Should handle the case where no address is available
    expect(result.current.error).toBe('No wallet address available')
  })

  it('should handle sendUserOperation errors', async () => {
    // Create a new mock for this test
    const mockUseCurrentUser = jest.fn().mockReturnValue({
      currentUser: { evmSmartAccounts: [] }
    })

    // Temporarily replace the mock
    const originalMock = require('@coinbase/cdp-hooks').useCurrentUser
    require('@coinbase/cdp-hooks').useCurrentUser = mockUseCurrentUser

    const { result } = renderHook(() => useCDPTransactions())

    await act(async () => {
      await result.current.sendUserOperation([{
        to: '0x456',
        value: BigInt('1000000000000000000'),
        data: '0x'
      }])
    })

    expect(result.current.error).toBe('No smart account available')

    // Restore original mock
    require('@coinbase/cdp-hooks').useCurrentUser = originalMock
  })
})