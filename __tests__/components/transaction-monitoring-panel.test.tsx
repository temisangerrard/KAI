/**
 * Tests for Transaction Monitoring Panel Component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionMonitoringPanel } from '@/app/wallet/components/transaction-monitoring-panel'
import { useCDPTransactionMonitoring } from '@/hooks/use-cdp-transaction-monitoring'

// Mock the CDP transaction monitoring hook
jest.mock('@/hooks/use-cdp-transaction-monitoring')

// Mock UI components
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

describe('TransactionMonitoringPanel', () => {
  const mockUseCDPTransactionMonitoring = useCDPTransactionMonitoring as jest.MockedFunction<typeof useCDPTransactionMonitoring>

  const defaultMockReturn = {
    monitoredTransactions: new Map(),
    isMonitoring: jest.fn().mockReturnValue(false),
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    stopAllMonitoring: jest.fn(),
    getTransactionStatus: jest.fn().mockReturnValue(null),
    enableNotifications: true,
    setEnableNotifications: jest.fn(),
    monitoringErrors: new Map(),
    clearError: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCDPTransactionMonitoring.mockReturnValue(defaultMockReturn)
  })

  describe('Basic rendering', () => {
    it('should render the transaction monitoring panel', () => {
      render(<TransactionMonitoringPanel />)

      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getByTestId('card-title')).toHaveTextContent('Transaction Monitoring')
    })

    it('should render with custom network and className', () => {
      render(<TransactionMonitoringPanel network="base-sepolia" className="custom-class" />)

      expect(screen.getByTestId('card')).toHaveClass('custom-class')
      expect(mockUseCDPTransactionMonitoring).toHaveBeenCalledWith({ network: 'base-sepolia' })
    })

    it('should show empty state when no transactions are monitored', () => {
      render(<TransactionMonitoringPanel />)

      expect(screen.getByText('No transactions being monitored')).toBeInTheDocument()
      expect(screen.getByText('Transactions will appear here automatically when sent')).toBeInTheDocument()
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    })
  })

  describe('Notification controls', () => {
    it('should display notification toggle switch', () => {
      render(<TransactionMonitoringPanel />)

      const notificationSwitch = screen.getByTestId('switch')
      expect(notificationSwitch).toBeChecked()
      expect(screen.getByText('Enable transaction notifications')).toBeInTheDocument()
    })

    it('should toggle notifications when switch is clicked', () => {
      const mockSetEnableNotifications = jest.fn()
      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        setEnableNotifications: mockSetEnableNotifications
      })

      render(<TransactionMonitoringPanel />)

      const notificationSwitch = screen.getByTestId('switch')
      fireEvent.click(notificationSwitch)

      expect(mockSetEnableNotifications).toHaveBeenCalledWith(false)
    })

    it('should show correct notification button state', () => {
      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        enableNotifications: true
      })

      render(<TransactionMonitoringPanel />)

      expect(screen.getByTestId('bell-icon')).toBeInTheDocument()
      expect(screen.getByText('Notifications On')).toBeInTheDocument()
    })

    it('should show notifications off state', () => {
      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        enableNotifications: false
      })

      render(<TransactionMonitoringPanel />)

      expect(screen.getByTestId('bell-off-icon')).toBeInTheDocument()
      expect(screen.getByText('Notifications Off')).toBeInTheDocument()
    })
  })

  describe('Monitored transactions display', () => {
    it('should display monitored transactions', () => {
      const mockTransactions = new Map([
        ['0x123', {
          hash: '0x123',
          type: 'evm' as const,
          status: 'pending' as const,
          confirmations: 0,
          startTime: Date.now() - 5000,
          network: 'base-mainnet'
        }],
        ['0x456', {
          hash: '0x456',
          type: 'user_operation' as const,
          status: 'confirmed' as const,
          confirmations: 1,
          startTime: Date.now() - 10000,
          network: 'base-mainnet'
        }]
      ])

      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        monitoredTransactions: mockTransactions
      })

      render(<TransactionMonitoringPanel />)

      expect(screen.getByText('Active Monitoring (2)')).toBeInTheDocument()
      expect(screen.getByText('0x123...0x123')).toBeInTheDocument()
      expect(screen.getByText('0x456...0x456')).toBeInTheDocument()
    })

    it('should display correct transaction type badges', () => {
      const mockTransactions = new Map([
        ['0x123', {
          hash: '0x123',
          type: 'evm' as const,
          status: 'pending' as const,
          confirmations: 0,
          startTime: Date.now(),
          network: 'base-mainnet'
        }],
        ['0x456', {
          hash: '0x456',
          type: 'user_operation' as const,
          status: 'confirmed' as const,
          confirmations: 1,
          startTime: Date.now(),
          network: 'base-mainnet'
        }]
      ])

      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        monitoredTransactions: mockTransactions
      })

      render(<TransactionMonitoringPanel />)

      const badges = screen.getAllByTestId('badge')
      expect(badges).toHaveLength(4) // 2 type badges + 2 status badges
      expect(screen.getByText('EOA')).toBeInTheDocument()
      expect(screen.getByText('Smart Account')).toBeInTheDocument()
    })

    it('should display correct status icons and badges', () => {
      const mockTransactions = new Map([
        ['0x123', {
          hash: '0x123',
          type: 'evm' as const,
          status: 'pending' as const,
          confirmations: 0,
          startTime: Date.now(),
          network: 'base-mainnet'
        }],
        ['0x456', {
          hash: '0x456',
          type: 'user_operation' as const,
          status: 'confirmed' as const,
          confirmations: 1,
          startTime: Date.now(),
          network: 'base-mainnet'
        }],
        ['0x789', {
          hash: '0x789',
          type: 'evm' as const,
          status: 'failed' as const,
          confirmations: 0,
          startTime: Date.now(),
          network: 'base-mainnet'
        }]
      ])

      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        monitoredTransactions: mockTransactions
      })

      render(<TransactionMonitoringPanel />)

      expect(screen.getByTestId('clock-icon')).toBeInTheDocument() // pending
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument() // confirmed
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument() // failed

      expect(screen.getByText('pending')).toBeInTheDocument()
      expect(screen.getByText('confirmed')).toBeInTheDocument()
      expect(screen.getByText('failed')).toBeInTheDocument()
    })

    it('should display transaction duration and confirmations', () => {
      const mockTransactions = new Map([
        ['0x123', {
          hash: '0x123',
          type: 'evm' as const,
          status: 'confirmed' as const,
          confirmations: 3,
          startTime: Date.now() - 65000, // 1 minute 5 seconds ago
          network: 'base-mainnet'
        }]
      ])

      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        monitoredTransactions: mockTransactions
      })

      render(<TransactionMonitoringPanel />)

      expect(screen.getByText(/Duration: 1m/)).toBeInTheDocument()
      expect(screen.getByText('Confirmations: 3')).toBeInTheDocument()
    })
  })

  describe('Transaction errors', () => {
    it('should display transaction errors', () => {
      const mockTransactions = new Map([
        ['0x123', {
          hash: '0x123',
          type: 'evm' as const,
          status: 'failed' as const,
          confirmations: 0,
          startTime: Date.now(),
          network: 'base-mainnet'
        }]
      ])

      const mockErrors = new Map([
        ['0x123', 'Network timeout error']
      ])

      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        monitoredTransactions: mockTransactions,
        monitoringErrors: mockErrors
      })

      render(<TransactionMonitoringPanel />)

      expect(screen.getByText('Network timeout error')).toBeInTheDocument()
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument()
    })

    it('should clear transaction error when X button is clicked', () => {
      const mockClearError = jest.fn()
      const mockTransactions = new Map([
        ['0x123', {
          hash: '0x123',
          type: 'evm' as const,
          status: 'failed' as const,
          confirmations: 0,
          startTime: Date.now(),
          network: 'base-mainnet'
        }]
      ])

      const mockErrors = new Map([
        ['0x123', 'Network timeout error']
      ])

      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        monitoredTransactions: mockTransactions,
        monitoringErrors: mockErrors,
        clearError: mockClearError
      })

      render(<TransactionMonitoringPanel />)

      const clearButtons = screen.getAllByTestId('button')
      const errorClearButton = clearButtons.find(button => 
        button.querySelector('[data-testid="x-icon"]')
      )

      fireEvent.click(errorClearButton!)
      expect(mockClearError).toHaveBeenCalledWith('0x123')
    })
  })

  describe('Transaction controls', () => {
    it('should stop monitoring when X button is clicked', () => {
      const mockStopMonitoring = jest.fn()
      const mockTransactions = new Map([
        ['0x123', {
          hash: '0x123',
          type: 'evm' as const,
          status: 'pending' as const,
          confirmations: 0,
          startTime: Date.now(),
          network: 'base-mainnet'
        }]
      ])

      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        monitoredTransactions: mockTransactions,
        stopMonitoring: mockStopMonitoring
      })

      render(<TransactionMonitoringPanel />)

      const buttons = screen.getAllByTestId('button')
      const stopButton = buttons.find(button => 
        button.querySelector('[data-testid="x-icon"]') && 
        !button.textContent?.includes('Network timeout error')
      )

      fireEvent.click(stopButton!)
      expect(mockStopMonitoring).toHaveBeenCalledWith('0x123')
    })

    it('should show and hide stop all button based on monitored transactions', () => {
      // First render with no transactions
      const { rerender } = render(<TransactionMonitoringPanel />)
      expect(screen.queryByText('Stop All')).not.toBeInTheDocument()

      // Rerender with transactions
      const mockTransactions = new Map([
        ['0x123', {
          hash: '0x123',
          type: 'evm' as const,
          status: 'pending' as const,
          confirmations: 0,
          startTime: Date.now(),
          network: 'base-mainnet'
        }]
      ])

      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        monitoredTransactions: mockTransactions
      })

      rerender(<TransactionMonitoringPanel />)
      expect(screen.getByText('Stop All')).toBeInTheDocument()
    })

    it('should stop all monitoring when stop all button is clicked', () => {
      const mockStopAllMonitoring = jest.fn()
      const mockTransactions = new Map([
        ['0x123', {
          hash: '0x123',
          type: 'evm' as const,
          status: 'pending' as const,
          confirmations: 0,
          startTime: Date.now(),
          network: 'base-mainnet'
        }]
      ])

      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        monitoredTransactions: mockTransactions,
        stopAllMonitoring: mockStopAllMonitoring
      })

      render(<TransactionMonitoringPanel />)

      const stopAllButton = screen.getByText('Stop All')
      fireEvent.click(stopAllButton)

      expect(mockStopAllMonitoring).toHaveBeenCalled()
    })
  })

  describe('Manual monitoring controls', () => {
    it('should show manual monitoring buttons', () => {
      render(<TransactionMonitoringPanel />)

      expect(screen.getByText('Monitor EVM Transaction')).toBeInTheDocument()
      expect(screen.getByText('Monitor User Operation')).toBeInTheDocument()
    })

    it('should start monitoring EVM transaction when button is clicked', () => {
      const mockStartMonitoring = jest.fn()
      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        startMonitoring: mockStartMonitoring
      })

      // Mock window.prompt
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('0x123abc')

      render(<TransactionMonitoringPanel />)

      const evmButton = screen.getByText('Monitor EVM Transaction')
      fireEvent.click(evmButton)

      expect(mockPrompt).toHaveBeenCalledWith('Enter transaction hash to monitor:')
      expect(mockStartMonitoring).toHaveBeenCalledWith('0x123abc', 'evm')

      mockPrompt.mockRestore()
    })

    it('should start monitoring user operation when button is clicked', () => {
      const mockStartMonitoring = jest.fn()
      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        startMonitoring: mockStartMonitoring
      })

      // Mock window.prompt
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('0x456def')

      render(<TransactionMonitoringPanel />)

      const userOpButton = screen.getByText('Monitor User Operation')
      fireEvent.click(userOpButton)

      expect(mockPrompt).toHaveBeenCalledWith('Enter user operation hash to monitor:')
      expect(mockStartMonitoring).toHaveBeenCalledWith('0x456def', 'user_operation')

      mockPrompt.mockRestore()
    })

    it('should not start monitoring if prompt is cancelled', () => {
      const mockStartMonitoring = jest.fn()
      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        startMonitoring: mockStartMonitoring
      })

      // Mock window.prompt to return null (cancelled)
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue(null)

      render(<TransactionMonitoringPanel />)

      const evmButton = screen.getByText('Monitor EVM Transaction')
      fireEvent.click(evmButton)

      expect(mockStartMonitoring).not.toHaveBeenCalled()

      mockPrompt.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for form controls', () => {
      render(<TransactionMonitoringPanel />)

      const notificationLabel = screen.getByTestId('label')
      expect(notificationLabel).toHaveAttribute('for', 'notifications')
      expect(notificationLabel).toHaveTextContent('Enable transaction notifications')
    })

    it('should have proper button attributes', () => {
      const mockTransactions = new Map([
        ['0x123', {
          hash: '0x123',
          type: 'evm' as const,
          status: 'pending' as const,
          confirmations: 0,
          startTime: Date.now(),
          network: 'base-mainnet'
        }]
      ])

      mockUseCDPTransactionMonitoring.mockReturnValue({
        ...defaultMockReturn,
        monitoredTransactions: mockTransactions
      })

      render(<TransactionMonitoringPanel />)

      const buttons = screen.getAllByTestId('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('data-variant')
        expect(button).toHaveAttribute('data-size')
      })
    })
  })
})