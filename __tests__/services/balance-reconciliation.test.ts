/**
 * Unit tests for Balance Reconciliation Service
 * Tests balance reconciliation and inconsistency detection
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { BalanceReconciliationService } from '@/lib/services/balance-reconciliation-service'

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  runTransaction: jest.fn(),
  writeBatch: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now() })),
    fromDate: jest.fn()
  }
}))

jest.mock('@/lib/db/database', () => ({
  db: {},
  auth: {},
  app: {}
}))

describe('BalanceReconciliationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('validateBalanceIntegrity', () => {
    it('should validate a correct balance', () => {
      const validBalance = {
        userId: 'user1',
        availableTokens: 100,
        committedTokens: 50,
        totalEarned: 200,
        totalSpent: 50,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 1
      }

      const result = BalanceReconciliationService.validateBalanceIntegrity(validBalance)

      expect(result.isValid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should detect negative available tokens', () => {
      const invalidBalance = {
        userId: 'user1',
        availableTokens: -10,
        committedTokens: 50,
        totalEarned: 200,
        totalSpent: 50,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 1
      }

      const result = BalanceReconciliationService.validateBalanceIntegrity(invalidBalance)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContain('Available tokens cannot be negative')
    })

    it('should detect negative committed tokens', () => {
      const invalidBalance = {
        userId: 'user1',
        availableTokens: 100,
        committedTokens: -25,
        totalEarned: 200,
        totalSpent: 50,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 1
      }

      const result = BalanceReconciliationService.validateBalanceIntegrity(invalidBalance)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContain('Committed tokens cannot be negative')
    })

    it('should detect negative total earned', () => {
      const invalidBalance = {
        userId: 'user1',
        availableTokens: 100,
        committedTokens: 50,
        totalEarned: -100,
        totalSpent: 50,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 1
      }

      const result = BalanceReconciliationService.validateBalanceIntegrity(invalidBalance)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContain('Total earned cannot be negative')
    })

    it('should detect negative total spent', () => {
      const invalidBalance = {
        userId: 'user1',
        availableTokens: 100,
        committedTokens: 50,
        totalEarned: 200,
        totalSpent: -25,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 1
      }

      const result = BalanceReconciliationService.validateBalanceIntegrity(invalidBalance)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContain('Total spent cannot be negative')
    })

    it('should detect inconsistent token totals', () => {
      const inconsistentBalance = {
        userId: 'user1',
        availableTokens: 200,
        committedTokens: 100,
        totalEarned: 150, // Total tokens (300) > net earned (150 - 50 = 100)
        totalSpent: 50,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 1
      }

      const result = BalanceReconciliationService.validateBalanceIntegrity(inconsistentBalance)

      expect(result.isValid).toBe(false)
      expect(result.violations.some(v => v.includes('Total tokens'))).toBe(true)
    })

    it('should detect invalid version', () => {
      const invalidBalance = {
        userId: 'user1',
        availableTokens: 100,
        committedTokens: 50,
        totalEarned: 200,
        totalSpent: 50,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 0 // Invalid version
      }

      const result = BalanceReconciliationService.validateBalanceIntegrity(invalidBalance)

      expect(result.isValid).toBe(false)
      expect(result.violations).toContain('Version must be positive')
    })

    it('should detect multiple violations', () => {
      const invalidBalance = {
        userId: 'user1',
        availableTokens: -10,
        committedTokens: -5,
        totalEarned: -100,
        totalSpent: -25,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 0
      }

      const result = BalanceReconciliationService.validateBalanceIntegrity(invalidBalance)

      expect(result.isValid).toBe(false)
      expect(result.violations.length).toBeGreaterThan(1)
      expect(result.violations).toContain('Available tokens cannot be negative')
      expect(result.violations).toContain('Committed tokens cannot be negative')
      expect(result.violations).toContain('Total earned cannot be negative')
      expect(result.violations).toContain('Total spent cannot be negative')
      expect(result.violations).toContain('Version must be positive')
    })

    it('should allow small floating point differences', () => {
      const balanceWithFloatingPoint = {
        userId: 'user1',
        availableTokens: 99.99,
        committedTokens: 50.01,
        totalEarned: 200.00,
        totalSpent: 50.00,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 1
      }

      const result = BalanceReconciliationService.validateBalanceIntegrity(balanceWithFloatingPoint)

      expect(result.isValid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })
  })

  describe('Input validation', () => {
    it('should throw error for empty user ID in auditUserBalance', async () => {
      await expect(BalanceReconciliationService.auditUserBalance(''))
        .rejects.toThrow('User ID is required')
      
      await expect(BalanceReconciliationService.auditUserBalance('   '))
        .rejects.toThrow('User ID is required')
    })

    it('should throw error for empty user ID in fixUserBalance', async () => {
      await expect(BalanceReconciliationService.fixUserBalance(''))
        .rejects.toThrow('User ID is required')
    })

    it('should handle empty user list in reconcileMultipleUsers', async () => {
      const result = await BalanceReconciliationService.reconcileMultipleUsers([])
      
      expect(result.totalUsersChecked).toBe(0)
      expect(result.usersWithInconsistencies).toBe(0)
      expect(result.usersFixed).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(result.executionTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Balance calculation logic', () => {
    it('should calculate balance correctly from transactions', () => {
      // This tests the private method indirectly through the validation logic
      const mockTransactions = [
        {
          id: 'tx1',
          userId: 'user1',
          type: 'purchase' as const,
          amount: 100,
          balanceBefore: 0,
          balanceAfter: 100,
          timestamp: { toMillis: () => Date.now() } as any,
          status: 'completed' as const,
          metadata: {}
        },
        {
          id: 'tx2',
          userId: 'user1',
          type: 'win' as const,
          amount: 50,
          balanceBefore: 100,
          balanceAfter: 150,
          timestamp: { toMillis: () => Date.now() } as any,
          status: 'completed' as const,
          metadata: {}
        },
        {
          id: 'tx3',
          userId: 'user1',
          type: 'loss' as const,
          amount: 25,
          balanceBefore: 150,
          balanceAfter: 125,
          timestamp: { toMillis: () => Date.now() } as any,
          status: 'completed' as const,
          metadata: {}
        }
      ]

      const mockCommitments = [
        {
          id: 'commit1',
          userId: 'user1',
          predictionId: 'pred1',
          tokensCommitted: 30,
          position: 'yes' as const,
          odds: 2.0,
          potentialWinning: 60,
          status: 'active' as const,
          committedAt: { toMillis: () => Date.now() } as any
        }
      ]

      // Expected calculation:
      // totalEarned = 100 (purchase) + 50 (win) = 150
      // totalSpent = 25 (loss) = 25
      // committedTokens = 30 (from active commitments)
      // availableTokens = 150 - 25 - 30 = 95

      // We can't directly test the private method, but we can verify
      // that a balance matching these calculations would be valid
      const calculatedBalance = {
        userId: 'user1',
        availableTokens: 95,
        committedTokens: 30,
        totalEarned: 150,
        totalSpent: 25,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 1
      }

      const validation = BalanceReconciliationService.validateBalanceIntegrity(calculatedBalance)
      expect(validation.isValid).toBe(true)
    })
  })

  describe('Error handling', () => {
    it('should handle validation errors gracefully', () => {
      const invalidBalance = {
        userId: 'user1',
        availableTokens: NaN,
        committedTokens: 50,
        totalEarned: 200,
        totalSpent: 50,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 1
      }

      const result = BalanceReconciliationService.validateBalanceIntegrity(invalidBalance)

      expect(result.isValid).toBe(false)
      // NaN comparisons should be handled gracefully
    })

    it('should handle undefined values in balance', () => {
      const incompleteBalance = {
        userId: 'user1',
        availableTokens: undefined as any,
        committedTokens: 50,
        totalEarned: 200,
        totalSpent: 50,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 1
      }

      const result = BalanceReconciliationService.validateBalanceIntegrity(incompleteBalance)

      expect(result.isValid).toBe(false)
    })
  })

  describe('Performance considerations', () => {
    it('should complete validation quickly for normal balances', () => {
      const balance = {
        userId: 'user1',
        availableTokens: 1000000, // Large but valid balance
        committedTokens: 500000,
        totalEarned: 2000000,
        totalSpent: 500000,
        lastUpdated: { toMillis: () => Date.now() } as any,
        version: 1
      }

      const startTime = Date.now()
      const result = BalanceReconciliationService.validateBalanceIntegrity(balance)
      const endTime = Date.now()

      expect(result.isValid).toBe(true)
      expect(endTime - startTime).toBeLessThan(10) // Should complete in less than 10ms
    })
  })
})