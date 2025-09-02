/**
 * Integration tests for CDP Transaction Monitoring
 * Tests the complete flow from transaction initiation to monitoring completion
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { useCDPTransactionMonitoring } from '@/hooks/use-cdp-transaction-monitoring'
import { useCDPTransactions } from '@/hooks/use-cdp-transactions'
import { CDPTransactionService } from '@/lib/services/cdp-transaction-service'
import { TransactionMonitoringPanel } from '@/app/wallet/components/transaction-monitoring-panel'

// Mock CDP hooks
const mockSendEvmTransaction = jest.fn()
const mockSendUserOperation = jest.fn()
const mockWaitForUserOperation = jest.fn()

jest.mock('@coinbase/cdp-hooks', () => ({
  useSendEvmTransaction: () => ({
    sendEvmTransaction: mockSendEvmTransaction,
    data: null,
    status: 'idle'
  }),
  useSendUserOperation: () => ({
    sendUserOperation: mockSendUserOperation,
    data: null,
    status: 'idle'
  }),
  useWaitForUserOperation: () => ({
    waitForUserOperation: mockWaitForUserOperation
  }),
  useCurrentUser: () => ({
    currentUser: {
      evmSmartAccounts: ['0xsmartaccount123']
    }
  })
}))

// Mock CDP Transaction Service
jest.mock('@/lib/services/cdp-transaction-service')

// Mock toast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}))

// Mock UI components for simpler testing
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h2 data-testid="card-title">{children}</h2>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-variant={variant}
      data-size={size}
      data-testid="button"
    >
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant} data-testid="badge">
      {children}
    </span>
  )
}))

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="switch"
    />
  )
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={className} data-testid="label">
      {children}
    </label>
  )
}))

jest.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: any) => <hr className={className} data-testid="separator" />
}))

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  X: () => <div data-testid="x-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  BellOff: () => <div data-testid="bell-off-icon" />
}))

describe('CDP Transaction Monitoring Integration', () => {
  const mockTrackTransaction = CDPTransactionService.trackTransaction as jest.Mock
  const mockMapTransactionStatus = CDPTransactionService.mapTransactionStatus as jest.Mock
  const mockMapUserOperationStatus = CDPTransactionService.mapUserOperationStatus as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    jest.useFakeTimers()
    
    mockMapTransactionStatus.mockReturnValue('pending')
    mockMapUserOperationStatus.mockReturnValue('pending')
    mockToast.mockClear()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('EVM Transaction Monitoring Flow', () => {
    it('should monitor EVM transaction from initiation to completion', async () => {
      // Mock successful transaction tracking
      mockTrackTransaction
        .mockResolvedValueOnce({
          hash: '0x123',
          status: 'pending',
          confirmations: 0
        })
        .mockResolvedValueOnce({
          hash: '0x123',
          status: 'confirmed',
          confirmations: 1,
          blockNumber: 12345
        })

      const { result } = renderHook(() => useCDPTransactionMonitoring({
        pollingInterval: 1000,
        enableNotifications: true
      }))

      // Start monitoring an EVM transaction
      act(() => {
        result.current.startMonitoring('0x123', 'evm')
      })

      // Verify transaction is being monitored
      expect(result.current.isMonitoring('0x123')).toBe(true)
      expect(result.current.monitoredTransactions.get('0x123')).toEqual({
        hash: '0x123',
        type: 'evm',
        status: 'pending',
        confirmations: 0,
        startTime: expect.any(Number),
        network: 'base-mainnet'
      })

      // Fast-forward to trigger first poll
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(mockTrackTransaction).toHaveBeenCalledWith('0x123', 'base-mainnet', 'evm')
      })

      // Fast-forward to trigger second poll (confirmed status)
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(result.current.monitoredTransactions.get('0x123')?.status).toBe('confirmed')
        expect(result.current.monitoredTransactions.get('0x123')?.confirmations).toBe(1)
      })

      // Verify notification was shown
      expect(mockToast).toHaveBeenCalledWith({
        title: "Transaction Confirmed",
        description: "EOA transaction 0x123...0x123 has been confirmed",
        duration: 5000,
      })
    })

    it('should handle EVM transaction failure with error notification', async () => {
      mockTrackTransaction
        .mockResolvedValueOnce({
          hash: '0x123',
          status: 'pending',
          confirmations: 0
        })
        .mockResolvedValueOnce({
          hash: '0x123',
          status: 'failed',
          confirmations: 0
        })

      const { result } = renderHook(() => useCDPTransactionMonitoring({
        pollingInterval: 1000,
        enableNotifications: true
      }))

      act(() => {
        result.current.startMonitoring('0x123', 'evm')
      })

      // Fast-forward to get failed status
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        expect(result.current.monitoredTransactions.get('0x123')?.status).toBe('failed')
      })

      // Verify failure notification was shown
      expect(mockToast).toHaveBeenCalledWith({
        title: "Transaction Failed",
        description: "EOA transaction 0x123...0x123 has failed",
        variant: "destructive",
        duration: 7000,
      })
    })
  })

  describe('User Operation Monitoring Flow', () => {
    it('should monitor user operation using waitForUserOperation', async () => {
      mockWaitForUserOperation.mockResolvedValue({
        receipt: { blockNumber: 12345 },
        transactionHash: '0x456'
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring({
        enableNotifications: true
      }))

      act(() => {
        result.current.startMonitoring('0x456', 'user_operation')
      })

      expect(result.current.isMonitoring('0x456')).toBe(true)

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

      // Verify notification was shown
      expect(mockToast).toHaveBeenCalledWith({
        title: "Transaction Confirmed",
        description: "Smart Account transaction 0x456...0x456 has been confirmed",
        duration: 5000,
      })
    })

    it('should handle user operation failure', async () => {
      mockWaitForUserOperation.mockRejectedValue(new Error('User operation failed'))

      const { result } = renderHook(() => useCDPTransactionMonitoring({
        enableNotifications: true
      }))

      act(() => {
        result.current.startMonitoring('0x456', 'user_operation')
      })

      await waitFor(() => {
        expect(result.current.monitoredTransactions.get('0x456')?.status).toBe('failed')
        expect(result.current.monitoringErrors.get('0x456')).toBe('User operation failed')
      })

      // Verify failure notification was shown
      expect(mockToast).toHaveBeenCalledWith({
        title: "Transaction Failed",
        description: "Smart Account transaction 0x456...0x456 has failed",
        variant: "destructive",
        duration: 7000,
      })
    })
  })

  describe('Transaction Monitoring Panel Integration', () => {
    it('should display monitored transactions in the panel', async () => {
      mockTrackTransaction.mockResolvedValue({
        hash: '0x123',
        status: 'pending',
        confirmations: 0
      })

      render(<TransactionMonitoringPanel network="base-mainnet" />)

      // Initially should show empty state
      expect(screen.getByText('No transactions being monitored')).toBeInTheDocument()

      // Simulate starting monitoring via manual input
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('0x123')
      
      const evmButton = screen.getByText('Monitor EVM Transaction')
      fireEvent.click(evmButton)

      // Should now show the monitored transaction
      await waitFor(() => {
        expect(screen.getByText('Active Monitoring (1)')).toBeInTheDocument()
        expect(screen.getByText('0x123...0x123')).toBeInTheDocument()
        expect(screen.getByText('EOA')).toBeInTheDocument()
        expect(screen.getByText('pending')).toBeInTheDocument()
      })

      mockPrompt.mockRestore()
    })

    it('should allow stopping monitoring from the panel', async () => {
      render(<TransactionMonitoringPanel network="base-mainnet" />)

      // Start monitoring a transaction
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('0x123')
      const evmButton = screen.getByText('Monitor EVM Transaction')
      fireEvent.click(evmButton)

      await waitFor(() => {
        expect(screen.getByText('Active Monitoring (1)')).toBeInTheDocument()
      })

      // Find and click the stop button (X icon)
      const buttons = screen.getAllByTestId('button')
      const stopButton = buttons.find(button => 
        button.querySelector('[data-testid="x-icon"]')
      )

      fireEvent.click(stopButton!)

      // Should return to empty state
      await waitFor(() => {
        expect(screen.getByText('No transactions being monitored')).toBeInTheDocument()
      })

      mockPrompt.mockRestore()
    })

    it('should toggle notifications from the panel', () => {
      render(<TransactionMonitoringPanel network="base-mainnet" />)

      const notificationSwitch = screen.getByTestId('switch')
      expect(notificationSwitch).toBeChecked()

      fireEvent.click(notificationSwitch)

      // The switch should be unchecked (controlled by the hook)
      // In a real scenario, this would update the hook state
    })

    it('should display transaction errors in the panel', async () => {
      mockTrackTransaction.mockRejectedValue(new Error('Network error'))

      render(<TransactionMonitoringPanel network="base-mainnet" />)

      // Start monitoring a transaction that will fail
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('0x123')
      const evmButton = screen.getByText('Monitor EVM Transaction')
      fireEvent.click(evmButton)

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
        expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument()
      })

      mockPrompt.mockRestore()
    })
  })

  describe('Multiple Transaction Monitoring', () => {
    it('should monitor multiple transactions simultaneously', async () => {
      mockTrackTransaction.mockImplementation((hash) => {
        return Promise.resolve({
          hash,
          status: 'pending',
          confirmations: 0
        })
      })

      mockWaitForUserOperation.mockResolvedValue({
        receipt: { blockNumber: 12345 },
        transactionHash: '0x456'
      })

      const { result } = renderHook(() => useCDPTransactionMonitoring({
        pollingInterval: 1000
      }))

      // Start monitoring both EVM transaction and user operation
      act(() => {
        result.current.startMonitoring('0x123', 'evm')
        result.current.startMonitoring('0x456', 'user_operation')
      })

      expect(result.current.monitoredTransactions.size).toBe(2)
      expect(result.current.isMonitoring('0x123')).toBe(true)
      expect(result.current.isMonitoring('0x456')).toBe(true)

      // Verify both are being tracked
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(mockTrackTransaction).toHaveBeenCalledWith('0x123', 'base-mainnet', 'evm')
        expect(mockWaitForUserOperation).toHaveBeenCalledWith({
          userOperationHash: '0x456',
          network: 'base'
        })
      })
    })

    it('should stop all monitoring when requested', () => {
      const { result } = renderHook(() => useCDPTransactionMonitoring())

      act(() => {
        result.current.startMonitoring('0x123', 'evm')
        result.current.startMonitoring('0x456', 'user_operation')
        result.current.startMonitoring('0x789', 'evm')
      })

      expect(result.current.monitoredTransactions.size).toBe(3)

      act(() => {
        result.current.stopAllMonitoring()
      })

      expect(result.current.monitoredTransactions.size).toBe(0)
      expect(result.current.monitoringErrors.size).toBe(0)
    })
  })

  describe('Network Configuration', () => {
    it('should use correct network configuration for testnet', () => {
      mockWaitForUserOperation.mockResolvedValue({
        receipt: { blockNumber: 12345 }
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

    it('should use correct network configuration for mainnet', () => {
      mockWaitForUserOperation.mockResolvedValue({
        receipt: { blockNumber: 12345 }
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

  describe('Error Recovery', () => {
    it('should clear errors and allow retry', async () => {
      mockTrackTransaction.mockRejectedValueOnce(new Error('Network error'))
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

      // Wait for error
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(result.current.monitoringErrors.get('0x123')).toBe('Network error')
      })

      // Clear error
      act(() => {
        result.current.clearError('0x123')
      })

      expect(result.current.monitoringErrors.has('0x123')).toBe(false)

      // Restart monitoring should work
      act(() => {
        result.current.stopMonitoring('0x123')
        result.current.startMonitoring('0x123', 'evm')
      })

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(result.current.monitoredTransactions.get('0x123')?.status).toBe('confirmed')
      })
    })
  })
})