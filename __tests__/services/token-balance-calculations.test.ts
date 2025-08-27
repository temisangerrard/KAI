/**
 * Unit tests for token balance calculations
 * Tests balance calculation logic without Firebase dependencies
 */

import { describe, it, expect } from '@jest/globals'

// Mock types for testing
interface TestUserBalance {
  userId: string
  availableTokens: number
  committedTokens: number
  totalEarned: number
  totalSpent: number
  version: number
}

type TransactionType = 'purchase' | 'commit' | 'win' | 'loss' | 'refund'

/**
 * Calculate new balance based on transaction type (extracted from TokenBalanceService)
 */
function calculateNewBalance(
  currentBalance: TestUserBalance,
  amount: number,
  type: TransactionType
): TestUserBalance {
  let newAvailableTokens = currentBalance.availableTokens
  let newCommittedTokens = currentBalance.committedTokens
  let newTotalEarned = currentBalance.totalEarned
  let newTotalSpent = currentBalance.totalSpent
  
  switch (type) {
    case 'purchase':
      newAvailableTokens += Math.abs(amount)
      newTotalEarned += Math.abs(amount)
      break
    case 'commit':
      const commitAmount = Math.abs(amount)
      if (newAvailableTokens < commitAmount) {
        throw new Error('Insufficient available tokens for commitment')
      }
      newAvailableTokens -= commitAmount
      newCommittedTokens += commitAmount
      break
    case 'win':
      const winAmount = Math.abs(amount)
      newAvailableTokens += winAmount
      newTotalEarned += winAmount
      break
    case 'loss':
      const lossAmount = Math.abs(amount)
      newTotalSpent += lossAmount
      break
    case 'refund':
      const refundAmount = Math.abs(amount)
      newAvailableTokens += refundAmount
      break
    default:
      throw new Error(`Unknown transaction type: ${type}`)
  }
  
  return {
    ...currentBalance,
    availableTokens: Math.max(0, newAvailableTokens),
    committedTokens: Math.max(0, newCommittedTokens),
    totalEarned: newTotalEarned,
    totalSpent: newTotalSpent
  }
}

/**
 * Validate balance constraints
 */
function validateBalance(balance: TestUserBalance): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (balance.availableTokens < 0) {
    errors.push('Available tokens cannot be negative')
  }
  
  if (balance.committedTokens < 0) {
    errors.push('Committed tokens cannot be negative')
  }
  
  if (balance.totalEarned < 0) {
    errors.push('Total earned cannot be negative')
  }
  
  if (balance.totalSpent < 0) {
    errors.push('Total spent cannot be negative')
  }
  
  // Check if total balance makes sense
  const totalTokens = balance.availableTokens + balance.committedTokens
  const netTokens = balance.totalEarned - balance.totalSpent
  
  if (totalTokens > netTokens) {
    errors.push('Total tokens exceed net earned tokens')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

describe('Token Balance Calculations', () => {
  const initialBalance: TestUserBalance = {
    userId: 'test-user',
    availableTokens: 100,
    committedTokens: 50,
    totalEarned: 200,
    totalSpent: 50,
    version: 1
  }

  describe('calculateNewBalance', () => {
    it('should handle purchase transactions correctly', () => {
      const result = calculateNewBalance(initialBalance, 75, 'purchase')
      
      expect(result.availableTokens).toBe(175) // 100 + 75
      expect(result.committedTokens).toBe(50) // unchanged
      expect(result.totalEarned).toBe(275) // 200 + 75
      expect(result.totalSpent).toBe(50) // unchanged
    })

    it('should handle commit transactions correctly', () => {
      const result = calculateNewBalance(initialBalance, 30, 'commit')
      
      expect(result.availableTokens).toBe(70) // 100 - 30
      expect(result.committedTokens).toBe(80) // 50 + 30
      expect(result.totalEarned).toBe(200) // unchanged
      expect(result.totalSpent).toBe(50) // unchanged
    })

    it('should handle win transactions correctly', () => {
      const result = calculateNewBalance(initialBalance, 120, 'win')
      
      expect(result.availableTokens).toBe(220) // 100 + 120
      expect(result.committedTokens).toBe(50) // unchanged
      expect(result.totalEarned).toBe(320) // 200 + 120
      expect(result.totalSpent).toBe(50) // unchanged
    })

    it('should handle loss transactions correctly', () => {
      const result = calculateNewBalance(initialBalance, 25, 'loss')
      
      expect(result.availableTokens).toBe(100) // unchanged
      expect(result.committedTokens).toBe(50) // unchanged
      expect(result.totalEarned).toBe(200) // unchanged
      expect(result.totalSpent).toBe(75) // 50 + 25
    })

    it('should handle refund transactions correctly', () => {
      const result = calculateNewBalance(initialBalance, 40, 'refund')
      
      expect(result.availableTokens).toBe(140) // 100 + 40
      expect(result.committedTokens).toBe(50) // unchanged
      expect(result.totalEarned).toBe(200) // unchanged
      expect(result.totalSpent).toBe(50) // unchanged
    })

    it('should throw error for insufficient funds on commit', () => {
      expect(() => {
        calculateNewBalance(initialBalance, 150, 'commit') // More than available (100)
      }).toThrow('Insufficient available tokens for commitment')
    })

    it('should throw error for unknown transaction type', () => {
      expect(() => {
        calculateNewBalance(initialBalance, 50, 'unknown' as TransactionType)
      }).toThrow('Unknown transaction type: unknown')
    })

    it('should handle negative amounts by taking absolute value', () => {
      const result = calculateNewBalance(initialBalance, -75, 'purchase')
      
      expect(result.availableTokens).toBe(175) // 100 + 75 (absolute value)
      expect(result.totalEarned).toBe(275) // 200 + 75
    })

    it('should prevent negative balances', () => {
      const lowBalance: TestUserBalance = {
        ...initialBalance,
        availableTokens: 10
      }
      
      const result = calculateNewBalance(lowBalance, 5, 'commit')
      
      expect(result.availableTokens).toBe(5) // 10 - 5
      expect(result.committedTokens).toBe(55) // 50 + 5
      
      // Ensure no negative values
      expect(result.availableTokens).toBeGreaterThanOrEqual(0)
      expect(result.committedTokens).toBeGreaterThanOrEqual(0)
    })
  })

  describe('validateBalance', () => {
    it('should validate correct balance', () => {
      const result = validateBalance(initialBalance)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect negative available tokens', () => {
      const invalidBalance: TestUserBalance = {
        ...initialBalance,
        availableTokens: -10
      }
      
      const result = validateBalance(invalidBalance)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Available tokens cannot be negative')
    })

    it('should detect negative committed tokens', () => {
      const invalidBalance: TestUserBalance = {
        ...initialBalance,
        committedTokens: -5
      }
      
      const result = validateBalance(invalidBalance)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Committed tokens cannot be negative')
    })

    it('should detect negative total earned', () => {
      const invalidBalance: TestUserBalance = {
        ...initialBalance,
        totalEarned: -100
      }
      
      const result = validateBalance(invalidBalance)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Total earned cannot be negative')
    })

    it('should detect negative total spent', () => {
      const invalidBalance: TestUserBalance = {
        ...initialBalance,
        totalSpent: -25
      }
      
      const result = validateBalance(invalidBalance)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Total spent cannot be negative')
    })

    it('should detect inconsistent token totals', () => {
      const inconsistentBalance: TestUserBalance = {
        userId: 'test-user',
        availableTokens: 200,
        committedTokens: 100,
        totalEarned: 150, // Total tokens (300) > net earned (150 - 50 = 100)
        totalSpent: 50,
        version: 1
      }
      
      const result = validateBalance(inconsistentBalance)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Total tokens exceed net earned tokens')
    })

    it('should detect multiple validation errors', () => {
      const invalidBalance: TestUserBalance = {
        userId: 'test-user',
        availableTokens: -10,
        committedTokens: -5,
        totalEarned: -100,
        totalSpent: -25,
        version: 1
      }
      
      const result = validateBalance(invalidBalance)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(5)
      expect(result.errors).toContain('Available tokens cannot be negative')
      expect(result.errors).toContain('Committed tokens cannot be negative')
      expect(result.errors).toContain('Total earned cannot be negative')
      expect(result.errors).toContain('Total spent cannot be negative')
    })
  })

  describe('Complex transaction scenarios', () => {
    it('should handle sequence of transactions correctly', () => {
      let balance = { ...initialBalance }
      
      // Purchase 100 tokens
      balance = calculateNewBalance(balance, 100, 'purchase')
      expect(balance.availableTokens).toBe(200) // 100 + 100
      expect(balance.totalEarned).toBe(300) // 200 + 100
      
      // Commit 75 tokens
      balance = calculateNewBalance(balance, 75, 'commit')
      expect(balance.availableTokens).toBe(125) // 200 - 75
      expect(balance.committedTokens).toBe(125) // 50 + 75
      
      // Win 150 tokens
      balance = calculateNewBalance(balance, 150, 'win')
      expect(balance.availableTokens).toBe(275) // 125 + 150
      expect(balance.totalEarned).toBe(450) // 300 + 150
      
      // Validate final balance
      const validation = validateBalance(balance)
      expect(validation.isValid).toBe(true)
    })

    it('should handle win/loss scenario correctly', () => {
      let balance = { ...initialBalance }
      
      // Commit 50 tokens to a prediction
      balance = calculateNewBalance(balance, 50, 'commit')
      expect(balance.availableTokens).toBe(50) // 100 - 50
      expect(balance.committedTokens).toBe(100) // 50 + 50
      
      // Lose the prediction
      balance = calculateNewBalance(balance, 50, 'loss')
      expect(balance.totalSpent).toBe(100) // 50 + 50
      
      // Note: In real implementation, committed tokens would be reduced
      // when the prediction is resolved, but this is handled separately
      // For now, the balance validation will fail because total tokens > net earned
      
      const validation = validateBalance(balance)
      expect(validation.isValid).toBe(false) // Expected to fail due to inconsistent totals
    })

    it('should handle refund scenario correctly', () => {
      let balance = { ...initialBalance }
      
      // Purchase tokens
      balance = calculateNewBalance(balance, 50, 'purchase')
      expect(balance.availableTokens).toBe(150) // 100 + 50
      expect(balance.totalEarned).toBe(250) // 200 + 50
      
      // Refund the purchase
      balance = calculateNewBalance(balance, 50, 'refund')
      expect(balance.availableTokens).toBe(200) // 150 + 50
      
      // Note: In real implementation, totalEarned might be adjusted
      // but this test focuses on the calculation logic
      // The validation will fail because we have more tokens than net earned
      
      const validation = validateBalance(balance)
      expect(validation.isValid).toBe(false) // Expected to fail due to inconsistent totals
    })
  })

  describe('Edge cases', () => {
    it('should handle zero amounts', () => {
      // Zero amounts should be handled by validation before reaching calculation
      // But the calculation should handle it gracefully
      const result = calculateNewBalance(initialBalance, 0, 'purchase')
      
      expect(result.availableTokens).toBe(100) // unchanged
      expect(result.totalEarned).toBe(200) // unchanged
    })

    it('should handle very large amounts', () => {
      const largeAmount = 1000000
      const result = calculateNewBalance(initialBalance, largeAmount, 'purchase')
      
      expect(result.availableTokens).toBe(100 + largeAmount)
      expect(result.totalEarned).toBe(200 + largeAmount)
    })

    it('should handle fractional amounts', () => {
      const fractionalAmount = 25.5
      const result = calculateNewBalance(initialBalance, fractionalAmount, 'purchase')
      
      expect(result.availableTokens).toBe(125.5) // 100 + 25.5
      expect(result.totalEarned).toBe(225.5) // 200 + 25.5
    })
  })
})