/**
 * Tests for CDP Transaction Monitoring Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useCDPTransactionMonitoring } from '@/hooks/use-cdp-transaction-monitoring'
import { CDPTransactionService } from '@/lib/services/cdp-transaction-service'

// Mock CDP hooks
jest.mock('@coinbase/cdp-hooks', () => ({
  useWaitForUserOperation: () => ({
    waitForUserOperation: jest.fn()
  }),
  useSendEvmTransaction: () => ({
    data: null,
    status: 'idle'
  }),
  useSendUserOperation: () => ({
    data: null,
    status: 'idle'
  })
}))

// Mock CDP Transaction Service
jest.mock('@/lib/services/cdp-transaction-service', () => ({
  CDPTransactionService: {
    trackTransaction: jest.fn(),
    mapTransactionStatus: jest.fn(),
    mapUserOperationStatus: jest.fn()
  }
}))

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

describe('useCDPTransactionMonitoring', () => {
  const mockTrackTransaction = CDPTransactionService.trackTransaction as jest.Mock
  const mockMapTransactionStatus = CDPTransactionService.mapTransactionStatus as jest.Mock
  const mockMapUserOperationStatus = CDPTransactionService.mapUserOperationStatus as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    jest.useFakeTimers()
    
    mockMapTransactionStatus.mockReturnValue('pending')
    mockMapUserOperationStatus.mockReturnValue('pending')
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Basic functionality', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useCDPTransactionMonitoring())

      expect(result.current.monitoredTransactions.size).toBe(0)
      expect(result.current.monitoringErrors.size).toBe(0)
      expect(result.current.enableNotifications).toBe(true)
    })

    it('should start monitoring EVM transaction', async () => {
      mockTrackTransaction.mockResolvedValue({
        hash: '0x123',
        status: 'pending',
        confirmations: 0
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x123', 'evm')
      })

      expect(result.current.isMonitoring('0x123')).toBe(true)
      expect(result.current.monitoredTransactions.get('0x123')).toEqual({
        hash: '0x123',
        type: 'evm',
        status: 'pending',
        confirmations: 0,
        startTime: expect.any(Number),
        network: 'base-mainnet'
      })
    })

    it('should start monitoring user operation', async () => {
      const mockWaitForUserOperation = jest.fn().mockResolvedValue({
        receipt: { blockNumber: 123 },
        transactionHash: '0x456'
      })

      jest.mocked(require('@coinbase/cdp-hooks').useWaitForUserOperation).mockReturnValue({
        waitForUserOperation: mockWaitForUserOperation
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x456', 'user_operation')
      })

      expect(result.current.isMonitoring('0x456')).toBe(true)
      expect(result.current.monitoredTransactions.get('0x456')).toEqual({
        hash: '0x456',
        type: 'user_operation',
        status: 'pending',
        confirmations: 0,
        startTime: expect.any(Number),
        network: 'base-mainnet'
      })

      await waitFor(() => {
        expect(mockWaitForUserOperation).toHaveBeenCalledWith({
          userOperationHash: '0x456',
          network: 'base'
        })
      })
    })

    it('should stop monitoring transaction', () => {
      const { result } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x123', 'evm')
      })

      expect(result.current.isMonitoring('0x123')).toBe(true)

      act(() => {
        result.current.stopMonitoring('0x123')
      })

      expect(result.current.isMonitoring('0x123')).toBe(false)
      expect(result.current.monitoredTransactions.size).toBe(0)
    })

    it('should stop all monitoring', () => {
      const { result } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x123', 'evm')
        result.current.startMonitoring('0x456', 'user_operation')
      })

      expect(result.current.monitoredTransactions.size).toBe(2)

      act(() => {
        result.current.stopAllMonitoring()
      })

      expect(result.current.monitoredTransactions.size).toBe(0)
    })
  })

  describe('EVM transaction monitoring', () => {
    it('should poll EVM transaction status', async () => {
      mockTrackTransaction
        .mockResolvedValueOnce({
          hash: '0x123',
          status: 'pending',
          confirmations: 0
        })
        .mockResolvedValueOnce({
          hash: '0x123',
          status: 'confirmed',
          confirmations: 1
        })

      const { result } = renderHook(() => useCDPTransactionMonitoring({
        pollingInterval: 1000
      }))

      act(() => {
        result.current.startMonitoring('0x123', 'evm')
      })

      // Initial status should be pending
      expect(result.current.monitoredTransactions.get('0x123')?.status).toBe('pending')

      // Fast-forward polling interval
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(mockTrackTransaction).toHaveBeenCalledWith('0x123', 'base-mainnet', 'evm')
      })

      // Fast-forward another interval to get confirmed status
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(result.current.monitoredTransactions.get('0x123')?.status).toBe('confirmed')
      })
    })

    it('should handle EVM transaction monitoring timeout', async () => {
      mockTrackTransaction.mockResolvedValue({
        hash: '0x123',
        status: 'pending',
        confirmations: 0
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring({
        maxMonitoringTime: 5000
      }))

      act(() => {
        result.current.startMonitoring('0x123', 'evm')
      })

      // Fast-forward past timeout
      act(() => {
        jest.advanceTimersByTime(6000)
      })

      await waitFor(() => {
        expect(result.current.monitoredTransactions.get('0x123')?.status).toBe('failed')
        expect(result.current.monitoringErrors.get('0x123')).toBe('Transaction monitoring timed out')
      })
    })

    it('should handle EVM transaction monitoring errors', async () => {
      mockTrackTransaction.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x123', 'evm')
      })

      // Fast-forward to trigger polling
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        expect(result.current.monitoringErrors.get('0x123')).toBe('Network error')
      })
    })
  })

  describe('User operation monitoring', () => {
    it('should monitor user operation with waitForUserOperation', async () => {
      const mockWaitForUserOperation = jest.fn().mockResolvedValue({
        receipt: { blockNumber: 123 },
        transactionHash: '0x456'
      })

      jest.mocked(require('@coinbase/cdp-hooks').useWaitForUserOperation).mockReturnValue({
        waitForUserOperation: mockWaitForUserOperation
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x456', 'user_operation')
      })

      await waitFor(() => {
        expect(mockWaitForUserOperation).toHaveBeenCalledWith({
          userOperationHash: '0x456',
          network: 'base'
        })
      })

      await waitFor(() => {
        expect(result.current.monitoredTransactions.get('0x456')?.status).toBe('confirmed')
        expect(result.current.monitoredTransactions.get('0x456')?.confirmations).toBe(1)
      })
    })

    it('should handle user operation monitoring failure', async () => {
      const mockWaitForUserOperation = jest.fn().mockRejectedValue(new Error('User operation failed'))

      jest.mocked(require('@coinbase/cdp-hooks').useWaitForUserOperation).mockReturnValue({
        waitForUserOperation: mockWaitForUserOperation
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x456', 'user_operation')
      })

      await waitFor(() => {
        expect(result.current.monitoredTransactions.get('0x456')?.status).toBe('failed')
        expect(result.current.monitoringErrors.get('0x456')).toBe('User operation failed')
      })
    })

    it('should handle user operation without receipt', async () => {
      const mockWaitForUserOperation = jest.fn().mockResolvedValue({
        receipt: null,
        transactionHash: '0x456'
      })

      jest.mocked(require('@coinbase/cdp-hooks').useWaitForUserOperation).mockReturnValue({
        waitForUserOperation: mockWaitForUserOperation
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x456', 'user_operation')
      })

      await waitFor(() => {
        expect(result.current.monitoredTransactions.get('0x456')?.status).toBe('failed')
        expect(result.current.monitoredTransactions.get('0x456')?.confirmations).toBe(0)
      })
    })
  })

  describe('Automatic monitoring from CDP hooks', () => {
    it('should automatically monitor EVM transactions from hook data', () => {
      jest.mocked(require('@coinbase/cdp-hooks').useSendEvmTransaction).mockReturnValue({
        data: { hash: '0x123' },
        status: 'pending'
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring())

      expect(result.current.isMonitoring('0x123')).toBe(true)
      expect(result.current.monitoredTransactions.get('0x123')?.type).toBe('evm')
    })

    it('should automatically monitor user operations from hook data', () => {
      jest.mocked(require('@coinbase/cdp-hooks').useSendUserOperation).mockReturnValue({
        data: { userOperationHash: '0x456' },
        status: 'pending'
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring())

      expect(result.current.isMonitoring('0x456')).toBe(true)
      expect(result.current.monitoredTransactions.get('0x456')?.type).toBe('user_operation')
    })

    it('should update transaction status from CDP hook changes', () => {
      const { rerender } = renderHook(() => useCDPTransactionMonitoring())

      // Mock initial EVM transaction
      jest.mocked(require('@coinbase/cdp-hooks').useSendEvmTransaction).mockReturnValue({
        data: { hash: '0x123' },
        status: 'pending'
      })

      rerender()

      // Mock status change to confirmed
      mockMapTransactionStatus.mockReturnValue('confirmed')
      jest.mocked(require('@coinbase/cdp-hooks').useSendEvmTransaction).mockReturnValue({
        data: { hash: '0x123' },
        status: 'success'
      })

      rerender()

      // Status should be updated
      expect(mockMapTransactionStatus).toHaveBeenCalledWith('success')
    })
  })

  describe('Notifications', () => {
    it('should enable/disable notifications', () => {
      const { result } = renderHook(() => useCDPTransactionMonitoring({
        enableNotifications: false
      }))

      expect(result.current.enableNotifications).toBe(false)

      act(() => {
        result.current.setEnableNotifications(true)
      })

      expect(result.current.enableNotifications).toBe(true)
    })

    it('should show notification when transaction is confirmed', async () => {
      const mockToast = jest.fn()
      jest.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
        toast: mockToast
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x123', 'evm')
      })

      // Simulate status change to confirmed
      act(() => {
        const transaction = result.current.monitoredTransactions.get('0x123')!
        result.current.monitoredTransactions.set('0x123', {
          ...transaction,
          status: 'confirmed'
        })
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Transaction Confirmed",
        description: "EOA transaction 0x123...0x123 has been confirmed",
        duration: 5000,
      })
    })

    it('should show notification when transaction fails', async () => {
      const mockToast = jest.fn()
      jest.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
        toast: mockToast
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x456', 'user_operation')
      })

      // Simulate status change to failed
      act(() => {
        const transaction = result.current.monitoredTransactions.get('0x456')!
        result.current.monitoredTransactions.set('0x456', {
          ...transaction,
          status: 'failed'
        })
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: "Transaction Failed",
        description: "Smart Account transaction 0x456...0x456 has failed",
        variant: "destructive",
        duration: 7000,
      })
    })

    it('should not show notifications when disabled', async () => {
      const mockToast = jest.fn()
      jest.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
        toast: mockToast
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring({
        enableNotifications: false
      }))

      act(() => {
        result.current.startMonitoring('0x123', 'evm')
      })

      // Simulate status change to confirmed
      act(() => {
        const transaction = result.current.monitoredTransactions.get('0x123')!
        result.current.monitoredTransactions.set('0x123', {
          ...transaction,
          status: 'confirmed'
        })
      })

      expect(mockToast).not.toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should clear specific transaction error', () => {
      const { result } = renderHook(() => useCDPTransactionMonitoring())

      // Manually add an error
      act(() => {
        result.current.monitoringErrors.set('0x123', 'Test error')
      })

      expect(result.current.monitoringErrors.get('0x123')).toBe('Test error')

      act(() => {
        result.current.clearError('0x123')
      })

      expect(result.current.monitoringErrors.has('0x123')).toBe(false)
    })

    it('should prevent duplicate monitoring', () => {
      const { result } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x123', 'evm')
      })

      expect(result.current.monitoredTransactions.size).toBe(1)

      // Try to start monitoring the same transaction again
      act(() => {
        result.current.startMonitoring('0x123', 'evm')
      })

      // Should still only have one transaction
      expect(result.current.monitoredTransactions.size).toBe(1)
    })
  })

  describe('Network configuration', () => {
    it('should use correct network for testnet', () => {
      const mockWaitForUserOperation = jest.fn()

      jest.mocked(require('@coinbase/cdp-hooks').useWaitForUserOperation).mockReturnValue({
        waitForUserOperation: mockWaitForUserOperation
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring({
        network: 'base-sepolia'
      }))

      act(() => {
        result.current.startMonitoring('0x456', 'user_operation')
      })

      expect(mockWaitForUserOperation).toHaveBeenCalledWith({
        userOperationHash: '0x456',
        network: 'base-sepolia'
      })
    })

    it('should use correct network for mainnet', () => {
      const mockWaitForUserOperation = jest.fn()

      jest.mocked(require('@coinbase/cdp-hooks').useWaitForUserOperation).mockReturnValue({
        waitForUserOperation: mockWaitForUserOperation
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring({
        network: 'base-mainnet'
      }))

      act(() => {
        result.current.startMonitoring('0x456', 'user_operation')
      })

      expect(mockWaitForUserOperation).toHaveBeenCalledWith({
        userOperationHash: '0x456',
        network: 'base'
      })
    })
  })

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x123', 'evm')
        result.current.startMonitoring('0x456', 'user_operation')
      })

      expect(result.current.monitoredTransactions.size).toBe(2)

      unmount()

      // All timers should be cleared (no way to directly test this, but it shouldn't throw)
    })
  })
})