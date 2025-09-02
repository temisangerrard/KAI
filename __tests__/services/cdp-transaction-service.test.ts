/**
 * Unit tests for CDP Transaction Service
 */

import {
  CDPTransactionService,
  CDPTransactionServiceFactory,
  CDPTransaction,
  CDPTransactionHistory,
  CDPTransactionStatus,
  CDPTransactionRequest,
  CDPUserOperationRequest
} from '@/lib/services/cdp-transaction-service'

// Mock console methods to avoid noise in tests
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  log: jest.spyOn(console, 'log').mockImplementation(() => {})
}

describe('CDPTransactionService', () => {
  beforeEach(() => {
    // Clear cache before each test
    CDPTransactionService.clearCache()
    jest.clearAllMocks()
  })

  afterAll(() => {
    consoleSpy.error.mockRestore()
    consoleSpy.log.mockRestore()
  })

  describe('trackTransaction', () => {
    it('should track a transaction and return status', async () => {
      const hash = '0x1234567890abcdef'
      const network = 'base-mainnet'

      const status = await CDPTransactionService.trackTransaction(hash, network)

      expect(status).toEqual({
        hash,
        status: 'pending',
        confirmations: 0,
        blockNumber: undefined,
        receipt: null,
        error: undefined
      })
    })

    it('should return cached status when available', async () => {
      const hash = '0x1234567890abcdef'
      const network = 'base-mainnet'

      // First call
      const status1 = await CDPTransactionService.trackTransaction(hash, network)
      
      // Second call should return cached result
      const status2 = await CDPTransactionService.trackTransaction(hash, network)

      expect(status1).toEqual(status2)
    })

    it('should handle tracking errors gracefully', async () => {
      const hash = '0xinvalid'
      const network = 'invalid-network'

      // Mock an error scenario by using invalid data
      await expect(CDPTransactionService.trackTransaction(hash, network))
        .resolves.toEqual({
          hash,
          status: 'pending',
          confirmations: 0,
          blockNumber: undefined,
          receipt: null,
          error: undefined
        })
    })

    it('should support different transaction types', async () => {
      const hash = '0x1234567890abcdef'
      const network = 'base-mainnet'

      const evmStatus = await CDPTransactionService.trackTransaction(hash, network, 'evm')
      const userOpStatus = await CDPTransactionService.trackTransaction(hash, network, 'user_operation')

      expect(evmStatus.hash).toBe(hash)
      expect(userOpStatus.hash).toBe(hash)
    })
  })

  describe('getTransactionHistory', () => {
    it('should return transaction history for an address', async () => {
      const address = '0x1234567890123456789012345678901234567890'
      const network = 'base-mainnet'

      const history = await CDPTransactionService.getTransactionHistory(address, network)

      expect(history).toEqual({
        address,
        transactions: [],
        lastUpdated: expect.any(Date),
        hasMore: false,
        network
      })
    })

    it('should return cached history when available', async () => {
      const address = '0x1234567890123456789012345678901234567890'
      const network = 'base-mainnet'

      // First call
      const history1 = await CDPTransactionService.getTransactionHistory(address, network)
      
      // Second call should return cached result
      const history2 = await CDPTransactionService.getTransactionHistory(address, network)

      expect(history1.lastUpdated).toEqual(history2.lastUpdated)
    })

    it('should support custom limit parameter', async () => {
      const address = '0x1234567890123456789012345678901234567890'
      const network = 'base-mainnet'
      const limit = 25

      const history = await CDPTransactionService.getTransactionHistory(address, network, limit)

      expect(history.address).toBe(address)
      expect(history.network).toBe(network)
    })

    it('should handle history fetch errors gracefully', async () => {
      const address = '0xinvalid'
      const network = 'invalid-network'

      await expect(CDPTransactionService.getTransactionHistory(address, network))
        .resolves.toEqual({
          address,
          transactions: [],
          lastUpdated: expect.any(Date),
          hasMore: false,
          network
        })
    })
  })

  describe('monitorTransaction', () => {
    it('should monitor transaction status with polling', async () => {
      const hash = '0x1234567890abcdef'
      const network = 'base-mainnet'
      const onStatusChange = jest.fn()

      const finalStatus = await CDPTransactionService.monitorTransaction(
        hash,
        network,
        onStatusChange,
        1, // maxAttempts
        100 // intervalMs
      )

      expect(finalStatus.hash).toBe(hash)
      expect(onStatusChange).toHaveBeenCalled()
    })

    it('should stop polling when transaction is confirmed', async () => {
      const hash = '0x1234567890abcdef'
      const network = 'base-mainnet'
      const onStatusChange = jest.fn()

      // Mock a confirmed transaction
      jest.spyOn(CDPTransactionService, 'trackTransaction').mockResolvedValue({
        hash,
        status: 'confirmed',
        confirmations: 1,
        blockNumber: 12345,
        receipt: { blockNumber: 12345 }
      })

      const finalStatus = await CDPTransactionService.monitorTransaction(
        hash,
        network,
        onStatusChange,
        5,
        100
      )

      expect(finalStatus.status).toBe('confirmed')
      expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({
        status: 'confirmed'
      }))
    })

    it('should stop polling when transaction fails', async () => {
      const hash = '0x1234567890abcdef'
      const network = 'base-mainnet'
      const onStatusChange = jest.fn()

      // Mock a failed transaction
      jest.spyOn(CDPTransactionService, 'trackTransaction').mockResolvedValue({
        hash,
        status: 'failed',
        confirmations: 0,
        error: 'Transaction reverted'
      })

      const finalStatus = await CDPTransactionService.monitorTransaction(
        hash,
        network,
        onStatusChange,
        5,
        100
      )

      expect(finalStatus.status).toBe('failed')
      expect(finalStatus.error).toBe('Transaction reverted')
    })

    it('should handle monitoring errors', async () => {
      const hash = '0x1234567890abcdef'
      const network = 'base-mainnet'
      const onStatusChange = jest.fn()

      // Mock an error in tracking
      jest.spyOn(CDPTransactionService, 'trackTransaction').mockRejectedValue(
        new Error('Network error')
      )

      await expect(CDPTransactionService.monitorTransaction(
        hash,
        network,
        onStatusChange,
        1,
        100
      )).rejects.toThrow('Network error')
    })
  })

  describe('createTransactionRecord', () => {
    it('should create transaction record from EVM transaction data', () => {
      const transactionData = {
        hash: '0x1234567890abcdef',
        value: BigInt('1000000000000000000'), // 1 ETH in wei
        from: '0xfrom123',
        to: '0xto456',
        status: 'success',
        receipt: {
          gasUsed: BigInt('21000'),
          blockNumber: 12345
        },
        gasPrice: BigInt('20000000000')
      }

      const record = CDPTransactionService.createTransactionRecord(
        transactionData,
        null,
        'base-mainnet'
      )

      expect(record).toEqual({
        hash: '0x1234567890abcdef',
        type: 'send',
        value: '1000000000000000000',
        asset: 'ETH',
        timestamp: expect.any(Number),
        from: '0xfrom123',
        to: '0xto456',
        status: 'confirmed',
        gasUsed: '21000',
        gasPrice: '20000000000',
        blockNumber: 12345,
        network: 'base-mainnet',
        transactionType: 'evm',
        receipt: transactionData.receipt
      })
    })

    it('should create transaction record from user operation data', () => {
      const userOperationData = {
        transactionHash: '0xabcdef1234567890',
        userOperationHash: '0xuserop123',
        sender: '0xsender123',
        target: '0xtarget456',
        status: 'complete',
        receipt: { blockNumber: 12346 }
      }

      const record = CDPTransactionService.createTransactionRecord(
        null,
        userOperationData,
        'base-mainnet'
      )

      expect(record).toEqual({
        hash: '0xabcdef1234567890',
        type: 'user_operation',
        value: '0',
        asset: 'ETH',
        timestamp: expect.any(Number),
        from: '0xsender123',
        to: '0xtarget456',
        status: 'confirmed',
        network: 'base-mainnet',
        transactionType: 'user_operation',
        userOperationHash: '0xuserop123',
        receipt: userOperationData.receipt
      })
    })

    it('should throw error when no valid data is provided', () => {
      expect(() => {
        CDPTransactionService.createTransactionRecord(null, null, 'base-mainnet')
      }).toThrow('No valid transaction or user operation data provided')
    })
  })

  describe('status mapping', () => {
    it('should map transaction statuses correctly', () => {
      const testCases = [
        { input: 'success', expected: 'confirmed' },
        { input: 'confirmed', expected: 'confirmed' },
        { input: 'complete', expected: 'confirmed' },
        { input: 'failed', expected: 'failed' },
        { input: 'error', expected: 'failed' },
        { input: 'reverted', expected: 'failed' },
        { input: 'pending', expected: 'pending' },
        { input: 'submitted', expected: 'pending' },
        { input: 'unknown', expected: 'pending' }
      ]

      testCases.forEach(({ input, expected }) => {
        const transactionData = {
          hash: '0x123',
          status: input,
          from: '0xfrom',
          to: '0xto'
        }

        const record = CDPTransactionService.createTransactionRecord(
          transactionData,
          null,
          'base-mainnet'
        )

        expect(record.status).toBe(expected)
      })
    })
  })

  describe('cache management', () => {
    beforeEach(() => {
      // Restore any mocks before cache tests
      jest.restoreAllMocks()
    })

    it('should cache and retrieve transaction status', async () => {
      const hash = '0x1234567890abcdef'
      const network = 'base-mainnet'

      // First call should cache the result
      await CDPTransactionService.trackTransaction(hash, network)

      // Get cached result
      const cached = CDPTransactionService.getCachedTransactionStatus(hash, network)

      expect(cached).toBeTruthy()
      expect(cached?.hash).toBe(hash)
    })

    it('should cache and retrieve transaction history', async () => {
      const address = '0x1234567890123456789012345678901234567890'
      const network = 'base-mainnet'

      // First call should cache the result
      await CDPTransactionService.getTransactionHistory(address, network)

      // Get cached result
      const cached = CDPTransactionService.getCachedTransactionHistory(address, network)

      expect(cached).toBeTruthy()
      expect(cached?.address).toBe(address)
    })

    it('should clear cache with pattern', async () => {
      const address = '0x1234567890123456789012345678901234567890'
      const network = 'base-mainnet'

      // Cache some data
      await CDPTransactionService.getTransactionHistory(address, network)

      // Clear cache with pattern
      CDPTransactionService.clearCache(address)

      // Should return null after clearing
      const cached = CDPTransactionService.getCachedTransactionHistory(address, network)
      expect(cached).toBeNull()
    })

    it('should clear all cache when no pattern provided', async () => {
      const address = '0x1234567890123456789012345678901234567890'
      const network = 'base-mainnet'

      // Cache some data
      await CDPTransactionService.getTransactionHistory(address, network)

      // Clear all cache
      CDPTransactionService.clearCache()

      // Should return null after clearing
      const cached = CDPTransactionService.getCachedTransactionHistory(address, network)
      expect(cached).toBeNull()
    })
  })
})

describe('CDPTransactionServiceFactory', () => {
  it('should create transaction service with CDP hooks', () => {
    const mockHooks = {
      sendEvmTransaction: jest.fn(),
      sendUserOperation: jest.fn(),
      transactionData: { hash: '0x123' },
      userOperationData: { userOperationHash: '0x456' }
    }

    const service = CDPTransactionServiceFactory.create(mockHooks)

    expect(service).toHaveProperty('sendEvmTransaction')
    expect(service).toHaveProperty('sendUserOperation')
    expect(service).toHaveProperty('trackTransaction')
    expect(service).toHaveProperty('getTransactionHistory')
  })

  it('should call CDP hooks when sending EVM transaction', async () => {
    const mockSendEvmTransaction = jest.fn().mockResolvedValue({ hash: '0x123' })
    const mockHooks = {
      sendEvmTransaction: mockSendEvmTransaction,
      sendUserOperation: jest.fn(),
      transactionData: null,
      userOperationData: null
    }

    const service = CDPTransactionServiceFactory.create(mockHooks)

    const request: CDPTransactionRequest = {
      to: '0xto123',
      from: '0xfrom456',
      value: BigInt('1000000000000000000'),
      chainId: 8453,
      type: 'eip1559'
    }

    await service.sendEvmTransaction(request)

    expect(mockSendEvmTransaction).toHaveBeenCalledWith({
      evmAccount: '0xfrom456',
      network: 'base',
      transaction: {
        to: '0xto123',
        value: BigInt('1000000000000000000'),
        data: '0x',
        gas: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        chainId: 8453,
        type: 'eip1559',
        nonce: undefined
      }
    })
  })

  it('should call CDP hooks when sending user operation', async () => {
    const mockSendUserOperation = jest.fn().mockResolvedValue({ userOperationHash: '0x456' })
    const mockHooks = {
      sendEvmTransaction: jest.fn(),
      sendUserOperation: mockSendUserOperation,
      transactionData: null,
      userOperationData: null
    }

    const service = CDPTransactionServiceFactory.create(mockHooks)

    const request: CDPUserOperationRequest = {
      evmSmartAccount: { address: '0xsmart123' },
      network: 'base-mainnet',
      calls: [{
        to: '0xto123',
        value: BigInt('1000000000000000000'),
        data: '0x'
      }]
    }

    await service.sendUserOperation(request)

    expect(mockSendUserOperation).toHaveBeenCalledWith(request)
  })
})