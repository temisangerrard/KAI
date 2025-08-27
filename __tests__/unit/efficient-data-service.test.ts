/**
 * Unit tests for EfficientDataService
 * Tests caching, pagination, and selective listeners
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { EfficientDataService } from '@/lib/services/efficient-data-service'
import { TokenTransaction, PredictionCommitment, UserBalance } from '@/lib/types/token'
import { Timestamp } from 'firebase/firestore'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date(), toMillis: () => Date.now() }))
  }
}))

vi.mock('@/lib/db/database', () => ({
  db: {}
}))

// Mock TokenBalanceService
vi.mock('@/lib/services/token-balance-service', () => ({
  TokenBalanceService: {
    getUserBalance: vi.fn()
  }
}))

describe('EfficientDataService', () => {
  const mockUserId = 'test-user-123'
  
  beforeEach(() => {
    // Clear all caches before each test
    EfficientDataService.cleanup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    EfficientDataService.cleanup()
  })

  describe('getUserBalance', () => {
    it('should return cached balance on second call', async () => {
      const mockBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 1000,
        committedTokens: 500,
        totalEarned: 2000,
        totalSpent: 500,
        lastUpdated: Timestamp.now(),
        version: 1
      }

      const { TokenBalanceService } = await import('@/lib/services/token-balance-service')
      const mockGetUserBalance = TokenBalanceService.getUserBalance as Mock
      mockGetUserBalance.mockResolvedValue(mockBalance)

      // First call should hit the service
      const result1 = await EfficientDataService.getUserBalance(mockUserId, false)
      expect(result1).toEqual(mockBalance)
      expect(mockGetUserBalance).toHaveBeenCalledTimes(1)

      // Second call should use cache (within TTL)
      const result2 = await EfficientDataService.getUserBalance(mockUserId, false)
      expect(result2).toEqual(mockBalance)
      expect(mockGetUserBalance).toHaveBeenCalledTimes(1) // Still only called once
    })

    it('should throw error for invalid user ID', async () => {
      await expect(EfficientDataService.getUserBalance('', false))
        .rejects.toThrow('User ID is required')
      
      await expect(EfficientDataService.getUserBalance('   ', false))
        .rejects.toThrow('User ID is required')
    })
  })

  describe('getUserTransactions', () => {
    it('should implement pagination correctly', async () => {
      const { getDocs } = await import('firebase/firestore')
      const mockGetDocs = getDocs as Mock

      const mockTransactions: TokenTransaction[] = [
        {
          id: 'tx1',
          userId: mockUserId,
          type: 'purchase',
          amount: 100,
          balanceBefore: 900,
          balanceAfter: 1000,
          metadata: {},
          timestamp: Timestamp.now(),
          status: 'completed'
        },
        {
          id: 'tx2',
          userId: mockUserId,
          type: 'commit',
          amount: -50,
          balanceBefore: 1000,
          balanceAfter: 950,
          metadata: {},
          timestamp: Timestamp.now(),
          status: 'completed'
        }
      ]

      // Mock Firestore response
      mockGetDocs.mockResolvedValue({
        docs: mockTransactions.map(tx => ({
          id: tx.id,
          data: () => tx
        }))
      })

      const result = await EfficientDataService.getUserTransactions(mockUserId, 10, false)
      
      expect(result.transactions).toHaveLength(2)
      expect(result.transactions[0].id).toBe('tx1')
      expect(result.pagination.hasMore).toBe(false) // Less than page size
      expect(result.pagination.isLoading).toBe(false)
    })

    it('should cache transaction results', async () => {
      const { getDocs } = await import('firebase/firestore')
      const mockGetDocs = getDocs as Mock

      mockGetDocs.mockResolvedValue({
        docs: []
      })

      // First call
      const result1 = await EfficientDataService.getUserTransactions(mockUserId, 10, false)
      expect(mockGetDocs).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result2 = await EfficientDataService.getUserTransactions(mockUserId, 10, false)
      expect(mockGetDocs).toHaveBeenCalledTimes(1) // Still only called once
      expect(result2).toEqual(result1)
    })

    it('should handle load more correctly', async () => {
      const { getDocs } = await import('firebase/firestore')
      const mockGetDocs = getDocs as Mock

      // First page
      mockGetDocs.mockResolvedValueOnce({
        docs: Array.from({ length: 10 }, (_, i) => ({
          id: `tx${i}`,
          data: () => ({
            id: `tx${i}`,
            userId: mockUserId,
            type: 'purchase',
            amount: 100,
            balanceBefore: 900,
            balanceAfter: 1000,
            metadata: {},
            timestamp: Timestamp.now(),
            status: 'completed'
          })
        }))
      })

      const firstPage = await EfficientDataService.getUserTransactions(mockUserId, 10, false)
      expect(firstPage.transactions).toHaveLength(10)
      expect(firstPage.pagination.hasMore).toBe(true)

      // Second page
      mockGetDocs.mockResolvedValueOnce({
        docs: Array.from({ length: 5 }, (_, i) => ({
          id: `tx${i + 10}`,
          data: () => ({
            id: `tx${i + 10}`,
            userId: mockUserId,
            type: 'purchase',
            amount: 100,
            balanceBefore: 900,
            balanceAfter: 1000,
            metadata: {},
            timestamp: Timestamp.now(),
            status: 'completed'
          })
        }))
      })

      const secondPage = await EfficientDataService.getUserTransactions(mockUserId, 10, true)
      expect(secondPage.transactions).toHaveLength(5)
      expect(secondPage.pagination.hasMore).toBe(false) // Less than page size
    })
  })

  describe('getUserCommitments', () => {
    it('should implement pagination for commitments', async () => {
      const { getDocs } = await import('firebase/firestore')
      const mockGetDocs = getDocs as Mock

      const mockCommitments: PredictionCommitment[] = [
        {
          id: 'commit1',
          userId: mockUserId,
          predictionId: 'pred1',
          position: 'yes',
          tokensCommitted: 100,
          potentialWinning: 180,
          status: 'active',
          committedAt: Timestamp.now(),
          metadata: { marketTitle: 'Test Market' }
        }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockCommitments.map(c => ({
          id: c.id,
          data: () => c
        }))
      })

      const result = await EfficientDataService.getUserCommitments(mockUserId, 20, false)
      
      expect(result.commitments).toHaveLength(1)
      expect(result.commitments[0].id).toBe('commit1')
      expect(result.pagination.hasMore).toBe(false)
    })
  })

  describe('Cache Management', () => {
    it('should invalidate user cache correctly', async () => {
      const { TokenBalanceService } = await import('@/lib/services/token-balance-service')
      const mockGetUserBalance = TokenBalanceService.getUserBalance as Mock
      
      const mockBalance: UserBalance = {
        userId: mockUserId,
        availableTokens: 1000,
        committedTokens: 500,
        totalEarned: 2000,
        totalSpent: 500,
        lastUpdated: Timestamp.now(),
        version: 1
      }

      mockGetUserBalance.mockResolvedValue(mockBalance)

      // First call to populate cache
      await EfficientDataService.getUserBalance(mockUserId, false)
      expect(mockGetUserBalance).toHaveBeenCalledTimes(1)

      // Second call should use cache
      await EfficientDataService.getUserBalance(mockUserId, false)
      expect(mockGetUserBalance).toHaveBeenCalledTimes(1)

      // Invalidate cache
      EfficientDataService.invalidateUserCache(mockUserId)

      // Third call should hit service again
      await EfficientDataService.getUserBalance(mockUserId, false)
      expect(mockGetUserBalance).toHaveBeenCalledTimes(2)
    })

    it('should provide cache statistics', () => {
      const stats = EfficientDataService.getCacheStats()
      
      expect(stats).toHaveProperty('balance')
      expect(stats).toHaveProperty('transactions')
      expect(stats).toHaveProperty('commitments')
      expect(stats).toHaveProperty('activeListeners')
      expect(stats).toHaveProperty('paginationStates')
      
      expect(typeof stats.balance.size).toBe('number')
      expect(typeof stats.balance.maxSize).toBe('number')
      expect(typeof stats.balance.ttl).toBe('number')
    })

    it('should reset pagination correctly', () => {
      // This is more of an integration test, but we can verify the method exists
      expect(() => EfficientDataService.resetPagination(mockUserId)).not.toThrow()
    })
  })

  describe('Preload functionality', () => {
    it('should preload user data without throwing', async () => {
      const { TokenBalanceService } = await import('@/lib/services/token-balance-service')
      const { getDocs } = await import('firebase/firestore')
      
      const mockGetUserBalance = TokenBalanceService.getUserBalance as Mock
      const mockGetDocs = getDocs as Mock

      mockGetUserBalance.mockResolvedValue({
        userId: mockUserId,
        availableTokens: 1000,
        committedTokens: 500,
        totalEarned: 2000,
        totalSpent: 500,
        lastUpdated: Timestamp.now(),
        version: 1
      })

      mockGetDocs.mockResolvedValue({ docs: [] })

      // Should not throw even if some operations fail
      await expect(EfficientDataService.preloadUserData(mockUserId)).resolves.toBeUndefined()
    })

    it('should handle empty user ID gracefully', async () => {
      await expect(EfficientDataService.preloadUserData('')).resolves.toBeUndefined()
      await expect(EfficientDataService.preloadUserData('   ')).resolves.toBeUndefined()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup all resources', () => {
      // Add some mock listeners
      const mockUnsubscribe = vi.fn()
      
      // Simulate active listeners (this would normally be done internally)
      // We can't easily test this without exposing internals, but we can verify cleanup doesn't throw
      expect(() => EfficientDataService.cleanup()).not.toThrow()
    })
  })
})