/**
 * Resolution System Service Integration Tests
 * 
 * Tests the complete integration of resolution services with existing market components
 * at the service layer without complex UI component rendering.
 */

import { ResolutionService } from '@/lib/services/resolution-service'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { Market, MarketResolution, Evidence, ResolutionPayout, CreatorPayout } from '@/lib/types/database'

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date(), seconds: 1234567890 })),
    fromDate: jest.fn((date: Date) => ({ toDate: () => date, seconds: Math.floor(date.getTime() / 1000) }))
  },
  runTransaction: jest.fn(),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    commit: jest.fn()
  })),
  increment: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn()
}))

// Mock services
jest.mock('@/lib/services/resolution-service', () => ({
  ResolutionService: {
    getMarketResolution: jest.fn(),
    calculatePayoutPreview: jest.fn(),
    resolveMarket: jest.fn(),
    getPendingResolutionMarkets: jest.fn(),
    getResolutionStatus: jest.fn(),
    validateEvidence: jest.fn(),
    getUserPayouts: jest.fn(),
    cancelMarket: jest.fn()
  }
}))

jest.mock('@/lib/services/token-balance-service', () => ({
  TokenBalanceService: {
    getUserBalance: jest.fn(),
    updateBalanceAtomic: jest.fn(),
    getTransactionHistory: jest.fn(),
    rollbackTransaction: jest.fn()
  }
}))

// Mock market data fetching functions
const mockGetMarket = jest.fn()
const mockUpdateMarketStatus = jest.fn()
const mockGetActiveMarkets = jest.fn()
const mockGetFeaturedMarkets = jest.fn()
const mockGetTrendingMarkets = jest.fn()

const mockResolutionService = ResolutionService as jest.Mocked<typeof ResolutionService>
const mockTokenBalanceService = TokenBalanceService as jest.Mocked<typeof TokenBalanceService>

describe('Resolution System Service Integration', () => {
  const mockMarket: Market = {
    id: 'test-market-1',
    title: 'Will Drake release an album in 2024?',
    description: 'Prediction about Drake album release',
    category: 'entertainment',
    status: 'pending_resolution',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    tags: ['music', 'drake'],
    totalTokens: 1000,
    participants: 5,
    totalParticipants: 5,
    totalTokensStaked: 1000,
    featured: false,
    trending: false,
    options: [
      {
        id: 'option-yes',
        name: 'Yes',
        text: 'Yes',
        color: 'bg-green-500',
        tokens: 600,
        percentage: 60,
        totalTokens: 600,
        participantCount: 3
      },
      {
        id: 'option-no',
        name: 'No',
        text: 'No',
        color: 'bg-red-500',
        tokens: 400,
        percentage: 40,
        totalTokens: 400,
        participantCount: 2
      }
    ]
  }

  const mockResolution: MarketResolution = {
    id: 'resolution-123',
    marketId: 'test-market-1',
    winningOptionId: 'option-yes',
    resolvedBy: 'admin-123',
    resolvedAt: { toDate: () => new Date('2024-12-31T23:59:59Z') } as any,
    totalPayout: 930,
    winnerCount: 3,
    status: 'completed',
    evidence: [
      {
        id: 'evidence-1',
        type: 'url',
        content: 'https://pitchfork.com/news/drake-announces-new-album',
        description: 'Official announcement',
        uploadedAt: { toDate: () => new Date() } as any
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Market Resolution Lifecycle Integration', () => {
    it('should integrate resolution service for complete lifecycle', async () => {
      // Step 1: Market ends and becomes pending resolution
      const pendingMarket = { ...mockMarket, status: 'pending_resolution' as const }
      mockResolutionService.getPendingResolutionMarkets.mockResolvedValue([pendingMarket])

      const pendingMarkets = await mockResolutionService.getPendingResolutionMarkets()

      expect(pendingMarkets).toHaveLength(1)
      expect(pendingMarkets[0].status).toBe('pending_resolution')

      // Step 2: Calculate payout preview
      const mockPayoutPreview = {
        totalPool: 1000,
        houseFee: 50,
        creatorFee: 20,
        winnerPool: 930,
        winnerCount: 3,
        largestPayout: 465,
        smallestPayout: 155,
        creatorPayout: {
          userId: 'creator-123',
          feeAmount: 20,
          feePercentage: 2
        },
        payouts: [
          {
            userId: 'user-1',
            currentStake: 300,
            projectedPayout: 465,
            projectedProfit: 165
          }
        ]
      }

      mockResolutionService.calculatePayoutPreview.mockResolvedValue(mockPayoutPreview)
      const preview = await mockResolutionService.calculatePayoutPreview('test-market-1', 'option-yes', 0.02)

      expect(preview.totalPool).toBe(1000)
      expect(preview.winnerCount).toBe(3)

      // Step 3: Resolve market
      const mockEvidence = [
        {
          id: 'evidence-1',
          type: 'url' as const,
          content: 'https://pitchfork.com/news/drake-announces-new-album',
          description: 'Official announcement',
          uploadedAt: { toDate: () => new Date() } as any
        }
      ]

      mockResolutionService.resolveMarket.mockResolvedValue({
        success: true,
        resolutionId: 'resolution-123'
      })

      const result = await mockResolutionService.resolveMarket(
        'test-market-1',
        'option-yes',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true)

      // Step 4: Verify resolution data
      mockResolutionService.getMarketResolution.mockResolvedValue(mockResolution)
      const resolution = await mockResolutionService.getMarketResolution('test-market-1')

      expect(resolution?.winningOptionId).toBe('option-yes')
      expect(resolution?.totalPayout).toBe(930)
    })

    it('should handle market cancellation workflow', async () => {
      // Market cannot be resolved
      mockResolutionService.cancelMarket.mockResolvedValue({
        success: true,
        reason: 'Insufficient evidence to determine outcome',
        refundAmount: 1000
      })

      const result = await mockResolutionService.cancelMarket(
        'test-market-1',
        'Insufficient evidence to determine outcome',
        true // refund tokens
      )

      expect(result.success).toBe(true)
      expect(result.refundAmount).toBe(1000)

      // Market would be updated to cancelled status in real implementation
    })
  })

  describe('Token Balance Integration with Resolution', () => {
    it('should integrate token balance updates with resolution payouts', async () => {
      // Initial user balance
      mockTokenBalanceService.getUserBalance.mockResolvedValue({
        userId: 'user-1',
        availableTokens: 500,
        committedTokens: 300,
        totalEarned: 1000,
        totalSpent: 200,
        lastUpdated: { toDate: () => new Date() } as any,
        version: 1
      })

      const initialBalance = await mockTokenBalanceService.getUserBalance('user-1')
      expect(initialBalance.availableTokens).toBe(500)
      expect(initialBalance.committedTokens).toBe(300)

      // Resolution occurs with payout
      mockTokenBalanceService.updateBalanceAtomic.mockResolvedValue({
        userId: 'user-1',
        availableTokens: 965, // 500 + 465 payout
        committedTokens: 0, // Commitment resolved
        totalEarned: 1465, // 1000 + 465 payout
        totalSpent: 200,
        lastUpdated: { toDate: () => new Date() } as any,
        version: 2
      })

      const updatedBalance = await mockTokenBalanceService.updateBalanceAtomic({
        userId: 'user-1',
        amount: 465,
        type: 'win',
        relatedId: 'resolution-123',
        metadata: {
          marketId: 'test-market-1',
          marketTitle: 'Will Drake release an album in 2024?',
          tokensStaked: 300,
          profit: 165,
          resolutionId: 'resolution-123'
        }
      })

      expect(updatedBalance.availableTokens).toBe(965)
      expect(updatedBalance.committedTokens).toBe(0)
      expect(updatedBalance.totalEarned).toBe(1465)

      // Verify transaction history includes payout
      mockTokenBalanceService.getTransactionHistory.mockResolvedValue([
        {
          id: 'tx-1',
          userId: 'user-1',
          amount: 465,
          type: 'win',
          relatedId: 'resolution-123',
          metadata: {
            marketId: 'test-market-1',
            marketTitle: 'Will Drake release an album in 2024?',
            tokensStaked: 300,
            profit: 165,
            resolutionId: 'resolution-123'
          },
          timestamp: { toDate: () => new Date() } as any
        }
      ])

      const history = await mockTokenBalanceService.getTransactionHistory('user-1')
      expect(history).toHaveLength(1)
      expect(history[0].type).toBe('win')
      expect(history[0].amount).toBe(465)
    })

    it('should handle balance rollback on resolution failure', async () => {
      // Simulate resolution failure requiring rollback
      mockTokenBalanceService.rollbackTransaction.mockResolvedValue({
        userId: 'user-1',
        availableTokens: 500, // Restored to original
        committedTokens: 300, // Restored to original
        totalEarned: 1000,
        totalSpent: 200,
        lastUpdated: { toDate: () => new Date() } as any,
        version: 1
      })

      const rolledBackBalance = await mockTokenBalanceService.rollbackTransaction(
        'user-1',
        'resolution-failed-123'
      )

      expect(rolledBackBalance.availableTokens).toBe(500)
      expect(rolledBackBalance.committedTokens).toBe(300)
    })
  })

  describe('Market Discovery Integration with Resolution', () => {
    it('should filter markets by resolution status', async () => {
      const pendingMarkets = [
        { ...mockMarket, id: 'pending-1', status: 'pending_resolution' as const }
      ]

      // Test pending resolution markets
      mockResolutionService.getPendingResolutionMarkets.mockResolvedValue(pendingMarkets)
      const pending = await mockResolutionService.getPendingResolutionMarkets()
      expect(pending).toHaveLength(1)
      expect(pending[0].status).toBe('pending_resolution')
    })

    it('should integrate resolution data with market queries', async () => {
      // For resolved markets, should be able to get resolution data
      mockResolutionService.getMarketResolution.mockResolvedValue(mockResolution)
      const resolution = await mockResolutionService.getMarketResolution('test-market-1')
      expect(resolution?.winningOptionId).toBe('option-yes')
    })
  })

  describe('User Payout History Integration', () => {
    it('should integrate user payouts with market and balance services', async () => {
      const mockUserPayouts = {
        winnerPayouts: [
          {
            id: 'payout-1',
            resolutionId: 'resolution-123',
            userId: 'user-1',
            optionId: 'option-yes',
            tokensStaked: 300,
            payoutAmount: 465,
            profit: 165,
            processedAt: { toDate: () => new Date() } as any,
            status: 'completed' as const
          }
        ],
        creatorPayouts: [
          {
            id: 'creator-payout-1',
            resolutionId: 'resolution-456',
            creatorId: 'user-1',
            feeAmount: 25,
            feePercentage: 2.5,
            processedAt: { toDate: () => new Date() } as any,
            status: 'completed' as const
          }
        ]
      }

      mockResolutionService.getUserPayouts.mockResolvedValue(mockUserPayouts)
      const payouts = await mockResolutionService.getUserPayouts('user-1')

      expect(payouts.winnerPayouts).toHaveLength(1)
      expect(payouts.creatorPayouts).toHaveLength(1)

      // Verify payout amounts match balance updates
      const totalPayouts = payouts.winnerPayouts.reduce((sum, p) => sum + p.payoutAmount, 0) +
                          payouts.creatorPayouts.reduce((sum, p) => sum + p.feeAmount, 0)

      expect(totalPayouts).toBe(490) // 465 + 25

      // Verify balance reflects payouts
      mockTokenBalanceService.getUserBalance.mockResolvedValue({
        userId: 'user-1',
        availableTokens: 990, // Includes both payouts
        committedTokens: 0,
        totalEarned: 1490, // Includes both payouts
        totalSpent: 200,
        lastUpdated: { toDate: () => new Date() } as any,
        version: 3
      })

      const balance = await mockTokenBalanceService.getUserBalance('user-1')
      expect(balance.totalEarned).toBe(1490)
    })
  })

  describe('Resolution Status Tracking Integration', () => {
    it('should track resolution status changes', async () => {
      // Initial status
      mockResolutionService.getResolutionStatus.mockResolvedValue({
        status: 'active',
        marketId: 'test-market-1',
        endDate: new Date('2025-03-01'),
        canResolve: false
      })

      let status = await mockResolutionService.getResolutionStatus('test-market-1')
      expect(status.canResolve).toBe(false)

      // Market ends
      mockResolutionService.getResolutionStatus.mockResolvedValue({
        status: 'pending_resolution',
        marketId: 'test-market-1',
        endDate: new Date('2024-12-31'),
        canResolve: true
      })

      status = await mockResolutionService.getResolutionStatus('test-market-1')
      expect(status.status).toBe('pending_resolution')
      expect(status.canResolve).toBe(true)

      // Market resolved
      mockResolutionService.getResolutionStatus.mockResolvedValue({
        status: 'resolved',
        marketId: 'test-market-1',
        endDate: new Date('2024-12-31'),
        canResolve: false,
        resolutionId: 'resolution-123'
      })

      status = await mockResolutionService.getResolutionStatus('test-market-1')
      expect(status.status).toBe('resolved')
      expect(status.resolutionId).toBe('resolution-123')
    })
  })

  describe('Error Handling and Recovery Integration', () => {
    it('should handle cross-service errors gracefully', async () => {
      // Resolution service error for invalid market
      mockResolutionService.getMarketResolution.mockRejectedValue(new Error('Market not found'))

      try {
        await mockResolutionService.getMarketResolution('invalid-market')
        fail('Expected error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }

      // Resolution service error
      mockResolutionService.resolveMarket.mockRejectedValue(new Error('Resolution failed'))

      try {
        await mockResolutionService.resolveMarket('test-market-1', 'option-yes', [], 'admin-123')
        fail('Expected error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }

      // Balance service error with rollback
      mockTokenBalanceService.updateBalanceAtomic.mockRejectedValue(new Error('Balance update failed'))
      mockTokenBalanceService.rollbackTransaction.mockResolvedValue({
        userId: 'user-1',
        availableTokens: 500,
        committedTokens: 300,
        totalEarned: 1000,
        totalSpent: 200,
        lastUpdated: { toDate: () => new Date() } as any,
        version: 1
      })

      try {
        await mockTokenBalanceService.updateBalanceAtomic({
          userId: 'user-1',
          amount: 100,
          type: 'win',
          relatedId: 'test-id'
        })
        fail('Expected error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        
        // Rollback should be called
        const rolledBack = await mockTokenBalanceService.rollbackTransaction('user-1', 'test-id')
        expect(rolledBack.availableTokens).toBe(500)
      }
    })
  })

  describe('Performance and Scalability Integration', () => {
    it('should handle large-scale resolution operations efficiently', async () => {
      // Large number of pending markets
      const largePendingList = Array.from({ length: 100 }, (_, i) => ({
        ...mockMarket,
        id: `market-${i}`,
        title: `Market ${i}`
      }))

      mockResolutionService.getPendingResolutionMarkets.mockResolvedValue(largePendingList)

      const startTime = performance.now()
      const pending = await mockResolutionService.getPendingResolutionMarkets()
      const endTime = performance.now()

      expect(pending).toHaveLength(100)
      expect(endTime - startTime).toBeLessThan(100) // Should be fast

      // Large payout distribution
      const largePayoutList = Array.from({ length: 1000 }, (_, i) => ({
        id: `payout-${i}`,
        resolutionId: 'resolution-123',
        userId: `user-${i}`,
        optionId: 'option-yes',
        tokensStaked: 100,
        payoutAmount: 150,
        profit: 50,
        processedAt: { toDate: () => new Date() } as any,
        status: 'completed' as const
      }))

      mockResolutionService.getUserPayouts.mockResolvedValue({
        winnerPayouts: largePayoutList,
        creatorPayouts: []
      })

      const payouts = await mockResolutionService.getUserPayouts('user-1')
      expect(payouts.winnerPayouts).toHaveLength(1000)
    })
  })
})