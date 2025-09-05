import { PayoutPreviewService } from '@/lib/services/payout-preview-service'
import { Market, MarketStatus } from '@/lib/types/database'
import { Timestamp } from 'firebase/firestore'

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date() })
  }
}))

const mockGetDocs = require('firebase/firestore').getDocs

describe('PayoutPreviewService', () => {
  const mockMarket: Market = {
    id: 'market-123',
    title: 'Test Market',
    description: 'Test description',
    category: 'entertainment',
    status: 'pending_resolution' as MarketStatus,
    createdBy: 'creator-123',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.now(),
    tags: ['test'],
    options: [
      { id: 'yes', text: 'Yes', totalTokens: 600, participantCount: 3 },
      { id: 'no', text: 'No', totalTokens: 400, participantCount: 2 }
    ],
    totalParticipants: 5,
    totalTokensStaked: 1000,
    featured: false,
    trending: false
  }

  const mockCommitments = [
    {
      id: 'commitment-1',
      userId: 'user-1',
      predictionId: 'market-123',
      position: 'yes' as const,
      tokensCommitted: 300,
      status: 'active'
    },
    {
      id: 'commitment-2',
      userId: 'user-2',
      predictionId: 'market-123',
      position: 'yes' as const,
      tokensCommitted: 200,
      status: 'active'
    },
    {
      id: 'commitment-3',
      userId: 'user-3',
      predictionId: 'market-123',
      position: 'no' as const,
      tokensCommitted: 400,
      status: 'active'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock getDocs to return our test commitments
    mockGetDocs.mockResolvedValue({
      docs: mockCommitments.map(commitment => ({
        id: commitment.id,
        data: () => commitment
      }))
    })
  })

  describe('generatePayoutPreview', () => {
    it('should generate payout preview for yes winning option', async () => {
      const result = await PayoutPreviewService.generatePayoutPreview(
        mockMarket,
        'yes',
        0.02 // 2% creator fee
      )

      // Total pool: 300 + 200 + 400 = 900
      // House fee: 900 * 0.05 = 45
      // Creator fee: 900 * 0.02 = 18
      // Winner pool: 900 - 45 - 18 = 837
      // Winning tokens: 300 + 200 = 500
      // User1: (300/500) * 837 = 502.2 -> 502
      // User2: (200/500) * 837 = 334.8 -> 334

      expect(result.totalPool).toBe(900)
      expect(result.houseFee).toBe(45)
      expect(result.creatorFee).toBe(18)
      expect(result.winnerPool).toBe(837)
      expect(result.winnerCount).toBe(2)

      expect(result.payouts).toHaveLength(2)
      expect(result.payouts[0]).toEqual({
        userId: 'user-1',
        tokensStaked: 300,
        payoutAmount: 502,
        profit: 202,
        winShare: 0.6
      })
      expect(result.payouts[1]).toEqual({
        userId: 'user-2',
        tokensStaked: 200,
        payoutAmount: 334,
        profit: 134,
        winShare: 0.4
      })

      expect(result.marketInfo).toEqual({
        id: 'market-123',
        title: 'Test Market',
        totalPool: 900,
        winningOption: 'Yes'
      })

      expect(result.creatorInfo).toEqual({
        creatorId: 'creator-123',
        feeAmount: 18,
        feePercentage: 2
      })
    })

    it('should generate payout preview for no winning option', async () => {
      const result = await PayoutPreviewService.generatePayoutPreview(
        mockMarket,
        'no',
        0.03 // 3% creator fee
      )

      // Total pool: 900
      // House fee: 900 * 0.05 = 45
      // Creator fee: 900 * 0.03 = 27
      // Winner pool: 900 - 45 - 27 = 828
      // Winning tokens: 400 (only user-3)
      // User3: (400/400) * 828 = 828

      expect(result.totalPool).toBe(900)
      expect(result.houseFee).toBe(45)
      expect(result.creatorFee).toBe(27)
      expect(result.winnerPool).toBe(828)
      expect(result.winnerCount).toBe(1)

      expect(result.payouts).toHaveLength(1)
      expect(result.payouts[0]).toEqual({
        userId: 'user-3',
        tokensStaked: 400,
        payoutAmount: 828,
        profit: 428,
        winShare: 1
      })

      expect(result.marketInfo.winningOption).toBe('No')
      expect(result.creatorInfo.feePercentage).toBe(3)
    })

    it('should handle invalid winning option', async () => {
      await expect(
        PayoutPreviewService.generatePayoutPreview(mockMarket, 'invalid', 0.02)
      ).rejects.toThrow('Invalid winning option ID: invalid')
    })

    it('should handle invalid creator fee percentage', async () => {
      await expect(
        PayoutPreviewService.generatePayoutPreview(mockMarket, 'yes', 0.06)
      ).rejects.toThrow('Creator fee percentage must be between 1% and 5%')
    })

    it('should handle market with no commitments', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] })

      const result = await PayoutPreviewService.generatePayoutPreview(
        mockMarket,
        'yes',
        0.02
      )

      expect(result.totalPool).toBe(0)
      expect(result.winnerCount).toBe(0)
      expect(result.payouts).toHaveLength(0)
      expect(result.largestPayout).toBe(0)
      expect(result.smallestPayout).toBe(0)
    })
  })

  describe('getFeeBreakdownForMarket', () => {
    it('should return fee breakdown for market', async () => {
      const result = await PayoutPreviewService.getFeeBreakdownForMarket(
        'market-123',
        0.025 // 2.5%
      )

      expect(result).toEqual({
        totalPool: 900,
        houseFee: 45,
        houseFeePercentage: 0.05,
        creatorFee: 22, // 900 * 0.025 = 22.5 -> 22
        creatorFeePercentage: 0.025,
        totalFees: 67,
        totalFeePercentage: 0.08, // Rounded
        winnerPool: 833,
        winnerPoolPercentage: 0.93 // Rounded (1 - 0.075 = 0.925 -> 0.93)
      })
    })

    it('should handle market with no commitments', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] })

      const result = await PayoutPreviewService.getFeeBreakdownForMarket(
        'market-123',
        0.02
      )

      expect(result.totalPool).toBe(0)
      expect(result.houseFee).toBe(0)
      expect(result.creatorFee).toBe(0)
      expect(result.winnerPool).toBe(0)
    })
  })

  describe('validateResolutionParameters', () => {
    it('should validate valid resolution parameters', () => {
      const result = PayoutPreviewService.validateResolutionParameters(
        mockMarket,
        'yes',
        0.02
      )

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject already resolved market', () => {
      const resolvedMarket = {
        ...mockMarket,
        status: 'resolved' as MarketStatus
      }

      const result = PayoutPreviewService.validateResolutionParameters(
        resolvedMarket,
        'yes',
        0.02
      )

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Market is already resolved')
    })

    it('should reject invalid market status', () => {
      const draftMarket = {
        ...mockMarket,
        status: 'draft' as MarketStatus
      }

      const result = PayoutPreviewService.validateResolutionParameters(
        draftMarket,
        'yes',
        0.02
      )

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Market is not ready for resolution')
    })

    it('should reject invalid winning option', () => {
      const result = PayoutPreviewService.validateResolutionParameters(
        mockMarket,
        'invalid',
        0.02
      )

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid winning option: invalid')
    })

    it('should reject invalid creator fee', () => {
      const result = PayoutPreviewService.validateResolutionParameters(
        mockMarket,
        'yes',
        0.06 // Too high
      )

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Creator fee percentage must be between 1% and 5%')
    })

    it('should warn about market with no participants', () => {
      const emptyMarket = {
        ...mockMarket,
        totalParticipants: 0
      }

      const result = PayoutPreviewService.validateResolutionParameters(
        emptyMarket,
        'yes',
        0.02
      )

      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Market has no participants - no payouts will be distributed')
    })
  })

  describe('calculateUserPotentialProfit', () => {
    it('should calculate user potential profit correctly', () => {
      const result = PayoutPreviewService.calculateUserPotentialProfit(
        300, // User commitment
        1000, // Total winning pool
        500, // Total winner tokens
        0.02 // 2% creator fee
      )

      // House fee: 1000 * 0.05 = 50
      // Creator fee: 1000 * 0.02 = 20
      // Winner pool: 1000 - 50 - 20 = 930
      // User share: 300/500 = 0.6
      // Potential payout: 930 * 0.6 = 558
      // Potential profit: 558 - 300 = 258
      // Fees paid: 0.6 * (50 + 20) = 42

      expect(result).toEqual({
        potentialPayout: 558,
        potentialProfit: 258,
        winShare: 0.6,
        feesPaid: 42
      })
    })

    it('should handle zero winner tokens', () => {
      const result = PayoutPreviewService.calculateUserPotentialProfit(
        300,
        1000,
        0, // No winner tokens
        0.02
      )

      expect(result).toEqual({
        potentialPayout: 0,
        potentialProfit: 0,
        winShare: 0,
        feesPaid: 0
      })
    })

    it('should handle edge case with small amounts', () => {
      const result = PayoutPreviewService.calculateUserPotentialProfit(
        1, // Very small commitment
        10, // Very small pool
        5, // Small winner tokens
        0.01 // 1% creator fee
      )

      // House fee: 10 * 0.05 = 0.5 -> 0
      // Creator fee: 10 * 0.01 = 0.1 -> 0
      // Winner pool: 10 - 0 - 0 = 10
      // User share: 1/5 = 0.2
      // Potential payout: 10 * 0.2 = 2

      expect(result.potentialPayout).toBe(2)
      expect(result.potentialProfit).toBe(1)
      expect(result.winShare).toBe(0.2)
      expect(result.feesPaid).toBe(0)
    })
  })
})