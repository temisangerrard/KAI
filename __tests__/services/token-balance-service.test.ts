/**
 * Unit tests for TokenBalanceService
 * Tests all balance calculation and update operations
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { Timestamp } from 'firebase/firestore'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { UserBalance, TokenTransaction, PredictionCommitment } from '@/lib/types/token'

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now() })),
    fromDate: jest.fn()
  },
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  writeBatch: jest.fn(),
  increment: jest.fn()
}))

jest.mock('@/lib/db/database', () => ({
  db: {}
}))

// Import mocked functions
import { doc, getDoc, runTransaction, collection, query, where, getDocs } from 'firebase/firestore'

const mockDoc = doc as jest.MockedFunction<typeof doc>
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>
const mockRunTransaction = runTransaction as jest.MockedFunction<typeof runTransaction>
const mockCollection = collection as jest.MockedFunction<typeof collection>
const mockQuery = query as jest.MockedFunction<typeof query>
const mockWhere = where as jest.MockedFunction<typeof where>
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>

describe('TokenBalanceService', () => {
  const mockUserId = 'test-user-123'
  const mockTimestamp = Timestamp.now()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getUserBalance', () => {
    it('should return user balance when it exists', async () => {
      const mockBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 100,
        committedTokens: 50,
        totalEarned: 200,
        totalSpent: 50,
        lastUpdated: mockTimestamp,
        version: 1
      }

      mockDoc.mockReturnValue({ id: mockUserId })
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockBalance
      })

      const result = await TokenBalanceService.getUserBalance(mockUserId)

      expect(result).toEqual(mockBalance)
      expect(mockDoc).toHaveBeenCalledWith({}, 'user_balances', mockUserId)
      expect(mockGetDoc).toHaveBeenCalled()
    })

    it('should return null when balance does not exist', async () => {
      mockDoc.mockReturnValue({ id: mockUserId })
      mockGetDoc.mockResolvedValue({
        exists: () => false
      })

      const result = await TokenBalanceService.getUserBalance(mockUserId)

      expect(result).toBeNull()
    })

    it('should throw error for invalid user ID', async () => {
      await expect(TokenBalanceService.getUserBalance('')).rejects.toThrow('User ID is required')
      await expect(TokenBalanceService.getUserBalance('   ')).rejects.toThrow('User ID is required')
    })
  })

  describe('createInitialBalance', () => {
    it('should create initial balance for new user', async () => {
      const expectedBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 0,
        committedTokens: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: mockTimestamp,
        version: 1
      }

      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({ exists: () => false }),
          set: jest.fn()
        }
        return await callback(mockTransaction)
      })

      const result = await TokenBalanceService.createInitialBalance(mockUserId)

      expect(result).toEqual(expectedBalance)
      expect(mockRunTransaction).toHaveBeenCalled()
    })

    it('should throw error for invalid user ID', async () => {
      await expect(TokenBalanceService.createInitialBalance('')).rejects.toThrow('User ID is required')
    })
  })

  describe('validateSufficientBalance', () => {
    it('should return valid result when user has sufficient balance', async () => {
      const mockBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 100,
        committedTokens: 50,
        totalEarned: 200,
        totalSpent: 50,
        lastUpdated: mockTimestamp,
        version: 1
      }

      const getUserBalanceSpy = jest.spyOn(TokenBalanceService, 'getUserBalance')
      getUserBalanceSpy.mockResolvedValue(mockBalance)

      const result = await TokenBalanceService.validateSufficientBalance(mockUserId, 50)

      expect(result).toEqual({
        isValid: true,
        currentBalance: mockBalance,
        requiredAmount: 50,
        availableAmount: 100,
        errorMessage: undefined
      })
    })

    it('should return invalid result when user has insufficient balance', async () => {
      const mockBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 30,
        committedTokens: 50,
        totalEarned: 200,
        totalSpent: 50,
        lastUpdated: mockTimestamp,
        version: 1
      }

      const getUserBalanceSpy = jest.spyOn(TokenBalanceService, 'getUserBalance')
      getUserBalanceSpy.mockResolvedValue(mockBalance)

      const result = await TokenBalanceService.validateSufficientBalance(mockUserId, 50)

      expect(result).toEqual({
        isValid: false,
        currentBalance: mockBalance,
        requiredAmount: 50,
        availableAmount: 30,
        errorMessage: 'Insufficient available tokens'
      })
    })

    it('should validate input parameters', async () => {
      const result1 = await TokenBalanceService.validateSufficientBalance('', 50)
      expect(result1.isValid).toBe(false)
      expect(result1.errorMessage).toBe('User ID is required')

      const result2 = await TokenBalanceService.validateSufficientBalance(mockUserId, 0)
      expect(result2.isValid).toBe(false)
      expect(result2.errorMessage).toBe('Required amount must be positive')
    })
  })

  describe('updateBalanceAtomic', () => {
    it('should update balance for purchase transaction', async () => {
      const currentBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 100,
        committedTokens: 50,
        totalEarned: 200,
        totalSpent: 50,
        lastUpdated: mockTimestamp,
        version: 1
      }

      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => currentBalance
          }),
          set: jest.fn()
        }
        return await callback(mockTransaction)
      })

      const result = await TokenBalanceService.updateBalanceAtomic({
        userId: mockUserId,
        amount: 50,
        type: 'purchase',
        relatedId: 'purchase-123',
        metadata: { packageId: 'pkg-1' }
      })

      expect(result.availableTokens).toBe(150)
      expect(result.totalEarned).toBe(250)
      expect(result.version).toBe(2)
    })

    it('should validate input parameters', async () => {
      await expect(TokenBalanceService.updateBalanceAtomic({
        userId: '',
        amount: 50,
        type: 'purchase'
      })).rejects.toThrow('User ID is required')

      await expect(TokenBalanceService.updateBalanceAtomic({
        userId: mockUserId,
        amount: 0,
        type: 'purchase'
      })).rejects.toThrow('Amount cannot be zero')
    })
  })

  describe('getBalanceSummary', () => {
    it('should return balances for multiple users', async () => {
      const userIds = ['user1', 'user2', 'user3']
      const mockBalances = [
        {
          userId: 'user1',
          availableTokens: 100,
          committedTokens: 50,
          totalEarned: 200,
          totalSpent: 50,
          lastUpdated: mockTimestamp,
          version: 1
        },
        {
          userId: 'user2',
          availableTokens: 75,
          committedTokens: 25,
          totalEarned: 150,
          totalSpent: 50,
          lastUpdated: mockTimestamp,
          version: 1
        }
      ]

      const getUserBalanceSpy = jest.spyOn(TokenBalanceService, 'getUserBalance')
      getUserBalanceSpy
        .mockResolvedValueOnce(mockBalances[0])
        .mockResolvedValueOnce(mockBalances[1])
        .mockResolvedValueOnce(null) // user3 has no balance

      const result = await TokenBalanceService.getBalanceSummary(userIds)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(mockBalances[0])
      expect(result[1]).toEqual(mockBalances[1])
    })

    it('should return empty array for empty input', async () => {
      const result = await TokenBalanceService.getBalanceSummary([])
      expect(result).toEqual([])
    })
  })

  describe('rollbackTransaction', () => {
    it('should rollback a purchase transaction', async () => {
      const originalTransaction: TokenTransaction = {
        id: 'tx-123',
        userId: mockUserId,
        type: 'purchase',
        amount: 100,
        balanceBefore: 0,
        balanceAfter: 100,
        timestamp: mockTimestamp,
        status: 'completed',
        metadata: { packageId: 'pkg-1' }
      }

      mockDoc.mockReturnValue({ id: 'tx-123' })
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => originalTransaction
      })

      const updateBalanceAtomicSpy = jest.spyOn(TokenBalanceService, 'updateBalanceAtomic')
      updateBalanceAtomicSpy.mockResolvedValue({
        userId: mockUserId,
        availableTokens: 0,
        committedTokens: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: mockTimestamp,
        version: 2
      })

      await TokenBalanceService.rollbackTransaction('tx-123', 'User requested refund')

      expect(updateBalanceAtomicSpy).toHaveBeenCalledWith({
        userId: mockUserId,
        amount: -100, // Negative amount for refund
        type: 'refund',
        relatedId: 'tx-123',
        metadata: {
          packageId: 'pkg-1',
          rollbackReason: 'User requested refund',
          originalTransactionId: 'tx-123'
        }
      })
    })

    it('should validate transaction ID', async () => {
      await expect(TokenBalanceService.rollbackTransaction('', 'Test'))
        .rejects.toThrow('Transaction ID is required')
    })
  })
})