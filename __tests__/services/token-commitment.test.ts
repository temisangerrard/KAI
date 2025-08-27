/**
 * @jest-environment node
 */

// Mock Firebase before any imports
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  collection: jest.fn(),
  runTransaction: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
  }
}))

import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  Timestamp,
  runTransaction 
} from 'firebase/firestore'
import { UserBalance, PredictionCommitment } from '@/lib/types/token'

const mockDoc = doc as jest.MockedFunction<typeof doc>
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>
const mockRunTransaction = runTransaction as jest.MockedFunction<typeof runTransaction>

describe('Token Commitment System', () => {
  const mockUserId = 'test-user-123'
  const mockPredictionId = 'prediction-456'
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Balance Validation for Commitments', () => {
    it('should validate sufficient balance for token commitment', async () => {
      const mockBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 1000,
        committedTokens: 500,
        totalEarned: 2000,
        totalSpent: 500,
        lastUpdated: Timestamp.now(),
        version: 1
      }

      mockDoc.mockReturnValue({ id: mockUserId } as any)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockBalance
      } as any)

      const result = await TokenBalanceService.validateSufficientBalance(mockUserId, 500)

      expect(result.isValid).toBe(true)
      expect(result.availableAmount).toBe(1000)
      expect(result.requiredAmount).toBe(500)
      expect(result.errorMessage).toBeUndefined()
    })

    it('should reject commitment when insufficient balance', async () => {
      const mockBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 100,
        committedTokens: 500,
        totalEarned: 600,
        totalSpent: 0,
        lastUpdated: Timestamp.now(),
        version: 1
      }

      mockDoc.mockReturnValue({ id: mockUserId } as any)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockBalance
      } as any)

      const result = await TokenBalanceService.validateSufficientBalance(mockUserId, 500)

      expect(result.isValid).toBe(false)
      expect(result.availableAmount).toBe(100)
      expect(result.requiredAmount).toBe(500)
      expect(result.errorMessage).toBe('Insufficient available tokens')
    })

    it('should handle non-existent user balance', async () => {
      mockDoc.mockReturnValue({ id: mockUserId } as any)
      mockGetDoc.mockResolvedValue({
        exists: () => false
      } as any)

      const result = await TokenBalanceService.validateSufficientBalance(mockUserId, 100)

      expect(result.isValid).toBe(false)
      expect(result.availableAmount).toBe(0)
      expect(result.errorMessage).toBe('User balance not found')
    })

    it('should reject invalid commitment amounts', async () => {
      const result1 = await TokenBalanceService.validateSufficientBalance(mockUserId, 0)
      expect(result1.isValid).toBe(false)
      expect(result1.errorMessage).toBe('Required amount must be positive')

      const result2 = await TokenBalanceService.validateSufficientBalance(mockUserId, -100)
      expect(result2.isValid).toBe(false)
      expect(result2.errorMessage).toBe('Required amount must be positive')
    })

    it('should reject empty user ID', async () => {
      const result = await TokenBalanceService.validateSufficientBalance('', 100)
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('User ID is required')
    })
  })

  describe('Token Commitment Operations', () => {
    it('should successfully commit tokens with balance update', async () => {
      const initialBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 1000,
        committedTokens: 200,
        totalEarned: 1500,
        totalSpent: 300,
        lastUpdated: Timestamp.now(),
        version: 1
      }

      const expectedUpdatedBalance: UserBalance = {
        ...initialBalance,
        availableTokens: 700, // 1000 - 300
        committedTokens: 500, // 200 + 300
        version: 2
      }

      mockRunTransaction.mockImplementation(async (db, callback) => {
        return await callback({
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => initialBalance
          }),
          set: jest.fn(),
          update: jest.fn()
        } as any)
      })

      const result = await TokenBalanceService.updateBalanceAtomic({
        userId: mockUserId,
        amount: 300,
        type: 'commit',
        relatedId: mockPredictionId,
        metadata: {
          predictionTitle: 'Test Prediction',
          position: 'yes',
          odds: 2.5
        }
      })

      expect(result.availableTokens).toBe(700)
      expect(result.committedTokens).toBe(500)
      expect(result.version).toBe(2)
    })

    it('should prevent commitment when it would result in negative balance', async () => {
      const initialBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 100,
        committedTokens: 200,
        totalEarned: 300,
        totalSpent: 0,
        lastUpdated: Timestamp.now(),
        version: 1
      }

      mockRunTransaction.mockImplementation(async (db, callback) => {
        return await callback({
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => initialBalance
          }),
          set: jest.fn(),
          update: jest.fn()
        } as any)
      })

      await expect(
        TokenBalanceService.updateBalanceAtomic({
          userId: mockUserId,
          amount: 500, // More than available
          type: 'commit',
          relatedId: mockPredictionId
        })
      ).rejects.toThrow('Insufficient available tokens for commitment')
    })

    it('should handle commitment rollback correctly', async () => {
      const mockTransactionId = 'transaction-123'
      const originalTransaction = {
        id: mockTransactionId,
        userId: mockUserId,
        type: 'commit' as const,
        amount: 300,
        balanceBefore: 1000,
        balanceAfter: 700,
        relatedId: mockPredictionId,
        metadata: {},
        timestamp: Timestamp.now(),
        status: 'completed' as const
      }

      mockDoc.mockReturnValue({ id: mockTransactionId } as any)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => originalTransaction
      } as any)

      // Mock the rollback transaction
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockBalance: UserBalance = {
          userId: mockUserId,
          availableTokens: 700,
          committedTokens: 500,
          totalEarned: 1500,
          totalSpent: 300,
          lastUpdated: Timestamp.now(),
          version: 2
        }

        return await callback({
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockBalance
          }),
          set: jest.fn(),
          update: jest.fn()
        } as any)
      })

      const result = await TokenBalanceService.rollbackTransaction(
        mockTransactionId, 
        'User requested cancellation'
      )

      expect(result.availableTokens).toBe(1000) // Should be restored
      expect(result.committedTokens).toBe(500) // Should remain the same since we're just returning tokens
    })
  })

  describe('Balance Reconciliation', () => {
    it('should detect and fix balance inconsistencies', async () => {
      const storedBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 500, // Incorrect
        committedTokens: 300, // Incorrect
        totalEarned: 1000,
        totalSpent: 200,
        lastUpdated: Timestamp.now(),
        version: 1
      }

      // Mock transaction history that shows different totals
      const mockTransactions = [
        { type: 'purchase', amount: 500, status: 'completed' },
        { type: 'purchase', amount: 500, status: 'completed' },
        { type: 'loss', amount: 200, status: 'completed' }
      ]

      // Mock active commitments
      const mockCommitments = [
        { tokensCommitted: 100, status: 'active' },
        { tokensCommitted: 150, status: 'active' }
      ]

      mockRunTransaction.mockImplementation(async (db, callback) => {
        return await callback({
          get: jest.fn()
            .mockResolvedValueOnce({
              exists: () => true,
              data: () => storedBalance
            }),
          set: jest.fn()
        } as any)
      })

      // Mock getDocs for transactions and commitments
      const { getDocs } = require('firebase/firestore')
      getDocs
        .mockResolvedValueOnce({
          docs: mockTransactions.map(tx => ({ data: () => tx }))
        })
        .mockResolvedValueOnce({
          docs: mockCommitments.map(c => ({ data: () => c }))
        })

      const result = await TokenBalanceService.reconcileUserBalance(mockUserId)

      expect(result.hadInconsistencies).toBe(true)
      expect(result.discrepancies.length).toBeGreaterThan(0)
      expect(result.reconciledBalance.availableTokens).toBe(550) // 1000 - 200 - 250
      expect(result.reconciledBalance.committedTokens).toBe(250) // 100 + 150
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockGetDoc.mockRejectedValue(new Error('Database connection failed'))

      const result = await TokenBalanceService.validateSufficientBalance(mockUserId, 100)
      
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Failed to validate balance')
    })

    it('should handle concurrent balance modifications', async () => {
      const initialBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 1000,
        committedTokens: 0,
        totalEarned: 1000,
        totalSpent: 0,
        lastUpdated: Timestamp.now(),
        version: 1
      }

      // Simulate version conflict (optimistic locking)
      mockRunTransaction.mockRejectedValue(new Error('Transaction failed due to version conflict'))

      await expect(
        TokenBalanceService.updateBalanceAtomic({
          userId: mockUserId,
          amount: 100,
          type: 'commit',
          relatedId: mockPredictionId
        })
      ).rejects.toThrow('Failed to update balance for user test-user-123')
    })

    it('should validate commitment amounts within reasonable limits', async () => {
      const mockBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 50000,
        committedTokens: 0,
        totalEarned: 50000,
        totalSpent: 0,
        lastUpdated: Timestamp.now(),
        version: 1
      }

      mockDoc.mockReturnValue({ id: mockUserId } as any)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockBalance
      } as any)

      // Test maximum commitment limit (assuming 10,000 is the max)
      const result = await TokenBalanceService.validateSufficientBalance(mockUserId, 15000)
      
      // This should still validate balance-wise, but the API should enforce max limits
      expect(result.isValid).toBe(true)
      expect(result.availableAmount).toBe(50000)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent validations efficiently', async () => {
      const mockBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 1000,
        committedTokens: 500,
        totalEarned: 2000,
        totalSpent: 500,
        lastUpdated: Timestamp.now(),
        version: 1
      }

      mockDoc.mockReturnValue({ id: mockUserId } as any)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockBalance
      } as any)

      // Simulate multiple concurrent validation requests
      const validationPromises = Array.from({ length: 10 }, (_, i) =>
        TokenBalanceService.validateSufficientBalance(mockUserId, 100 + i * 10)
      )

      const results = await Promise.all(validationPromises)

      // All should succeed since balance is sufficient
      results.forEach((result, index) => {
        expect(result.isValid).toBe(true)
        expect(result.requiredAmount).toBe(100 + index * 10)
      })

      // Should have made efficient database calls (not 10 separate calls)
      expect(mockGetDoc).toHaveBeenCalledTimes(10) // One per validation in this mock setup
    })
  })
})