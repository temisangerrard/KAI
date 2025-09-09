/**
 * Enhanced Resolution Service Tests
 * Tests accurate market resolution for both binary and multi-option markets
 * with full backward compatibility verification
 */

import { EnhancedResolutionService } from '@/lib/services/enhanced-resolution-service'
import { PredictionCommitment } from '@/lib/types/token'
import { Market, Evidence } from '@/lib/types/database'
import { Timestamp } from 'firebase/firestore'

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  runTransaction: jest.fn(),
  writeBatch: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
  }
}))

// Mock services
jest.mock('@/lib/services/token-balance-service', () => ({
  TokenBalanceService: {
    updateBalanceAtomic: jest.fn().mockResolvedValue(true)
  }
}))

jest.mock('@/lib/auth/admin-auth', () => ({
  AdminAuthService: {
    checkUserIsAdmin: jest.fn().mockResolvedValue(true)
  }
}))

jest.mock('@/lib/db/database', () => ({
  db: {}
}))

describe('EnhancedResolutionService', () => {
  const mockGetDoc = require('firebase/firestore').getDoc
  const mockGetDocs = require('firebase/firestore').getDocs
  const mockRunTransaction = require('firebase/firestore').runTransaction
  const mockWriteBatch = require('firebase/firestore').writeBatch

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createBinaryMarket = (): Market => ({
    id: 'binary-market-1',
    title: 'Will it rain tomorrow?',
    description: 'Binary market test',
    category: 'weather' as any,
    status: 'active' as any,
    createdBy: 'creator-1',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.now(),
    options: [
      { id: 'yes', text: 'Yes', totalTokens: 300, participantCount: 2 },
      { id: 'no', text: 'No', totalTokens: 400, participantCount: 2 }
    ],
    totalParticipants: 4,
    totalTokensStaked: 700,
    tags: [],
    featured: false,
    trending: false
  })

  const createMultiOptionMarket = (): Market => ({
    id: 'multi-market-1',
    title: 'Which designer will win?',
    description: 'Multi-option market test',
    category: 'fashion' as any,
    status: 'active' as any,
    createdBy: 'creator-1',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.now(),
    options: [
      { id: 'designer-a', text: 'Designer A', totalTokens: 300, participantCount: 2 },
      { id: 'designer-b', text: 'Designer B', totalTokens: 400, participantCount: 2 },
      { id: 'designer-c', text: 'Designer C', totalTokens: 200, participantCount: 1 },
      { id: 'designer-d', text: 'Designer D', totalTokens: 100, participantCount: 1 }
    ],
    totalParticipants: 6,
    totalTokensStaked: 1000,
    tags: [],
    featured: false,
    trending: false
  })

  const createBinaryCommitments = (): PredictionCommitment[] => [
    {
      id: 'c1',
      userId: 'user1',
      predictionId: 'binary-market-1',
      position: 'yes',
      optionId: 'yes',
      tokensCommitted: 100,
      odds: 2.0,
      potentialWinning: 200,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user1@test.com',
      userDisplayName: 'User 1',
      metadata: {
        marketStatus: 'active' as any,
        marketTitle: 'Will it rain tomorrow?',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 2.0,
          totalYesTokens: 300,
          totalNoTokens: 400,
          totalParticipants: 4
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web' as any
      }
    },
    {
      id: 'c2',
      userId: 'user2',
      predictionId: 'binary-market-1',
      position: 'yes',
      optionId: 'yes',
      tokensCommitted: 200,
      odds: 2.0,
      potentialWinning: 400,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user2@test.com',
      userDisplayName: 'User 2',
      metadata: {
        marketStatus: 'active' as any,
        marketTitle: 'Will it rain tomorrow?',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 2.0,
          totalYesTokens: 300,
          totalNoTokens: 400,
          totalParticipants: 4
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web' as any
      }
    },
    {
      id: 'c3',
      userId: 'user3',
      predictionId: 'binary-market-1',
      position: 'no',
      optionId: 'no',
      tokensCommitted: 150,
      odds: 1.75,
      potentialWinning: 262.5,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user3@test.com',
      userDisplayName: 'User 3',
      metadata: {
        marketStatus: 'active' as any,
        marketTitle: 'Will it rain tomorrow?',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 2.0,
          totalYesTokens: 300,
          totalNoTokens: 400,
          totalParticipants: 4
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web' as any
      }
    },
    {
      id: 'c4',
      userId: 'user4',
      predictionId: 'binary-market-1',
      position: 'no',
      optionId: 'no',
      tokensCommitted: 250,
      odds: 1.75,
      potentialWinning: 437.5,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user4@test.com',
      userDisplayName: 'User 4',
      metadata: {
        marketStatus: 'active' as any,
        marketTitle: 'Will it rain tomorrow?',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 2.0,
          totalYesTokens: 300,
          totalNoTokens: 400,
          totalParticipants: 4
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web' as any
      }
    }
  ]

  const createMultiOptionCommitments = (): PredictionCommitment[] => [
    {
      id: 'c1',
      userId: 'user1',
      predictionId: 'multi-market-1',
      position: 'yes',
      optionId: 'designer-a',
      tokensCommitted: 100,
      odds: 3.0,
      potentialWinning: 300,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user1@test.com',
      userDisplayName: 'User 1',
      metadata: {
        marketStatus: 'active' as any,
        marketTitle: 'Which designer will win?',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 2.0,
          totalYesTokens: 500,
          totalNoTokens: 500,
          totalParticipants: 6,
          optionOdds: {
            'designer-a': 3.0,
            'designer-b': 2.5,
            'designer-c': 4.0,
            'designer-d': 5.0
          }
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web' as any,
        selectedOptionText: 'Designer A',
        marketOptionCount: 4
      }
    },
    {
      id: 'c2',
      userId: 'user2',
      predictionId: 'multi-market-1',
      position: 'yes',
      optionId: 'designer-a',
      tokensCommitted: 200,
      odds: 3.0,
      potentialWinning: 600,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user2@test.com',
      userDisplayName: 'User 2',
      metadata: {
        marketStatus: 'active' as any,
        marketTitle: 'Which designer will win?',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 2.0,
          totalYesTokens: 500,
          totalNoTokens: 500,
          totalParticipants: 6,
          optionOdds: {
            'designer-a': 3.0,
            'designer-b': 2.5,
            'designer-c': 4.0,
            'designer-d': 5.0
          }
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web' as any,
        selectedOptionText: 'Designer A',
        marketOptionCount: 4
      }
    },
    {
      id: 'c3',
      userId: 'user3',
      predictionId: 'multi-market-1',
      position: 'no',
      optionId: 'designer-b',
      tokensCommitted: 150,
      odds: 2.5,
      potentialWinning: 375,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user3@test.com',
      userDisplayName: 'User 3',
      metadata: {
        marketStatus: 'active' as any,
        marketTitle: 'Which designer will win?',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 2.0,
          totalYesTokens: 500,
          totalNoTokens: 500,
          totalParticipants: 6,
          optionOdds: {
            'designer-a': 3.0,
            'designer-b': 2.5,
            'designer-c': 4.0,
            'designer-d': 5.0
          }
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web' as any,
        selectedOptionText: 'Designer B',
        marketOptionCount: 4
      }
    }
  ]

  const createEvidence = (): Evidence[] => [
    {
      type: 'url',
      content: 'https://example.com/proof',
      description: 'Official announcement'
    },
    {
      type: 'description',
      content: 'The weather service confirmed it rained at 3 PM today.',
      description: 'Weather confirmation'
    }
  ]

  describe('Accurate Payout Preview Calculation', () => {
    it('should calculate accurate payout preview for binary market', async () => {
      const market = createBinaryMarket()
      const commitments = createBinaryCommitments()

      // Mock Firebase calls
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: market.id,
        data: () => market
      })

      mockGetDocs.mockResolvedValue({
        docs: commitments.map(c => ({
          id: c.id,
          data: () => c
        }))
      })

      const result = await EnhancedResolutionService.calculateAccuratePayoutPreview(
        'binary-market-1',
        'yes',
        0.02
      )

      expect(result.totalPool).toBe(700) // 100 + 200 + 150 + 250
      expect(result.houseFee).toBe(35) // 5% of 700
      expect(result.creatorFee).toBe(14) // 2% of 700
      expect(result.winnerPool).toBe(651) // 700 - 35 - 14
      expect(result.winnerCount).toBe(2) // user1 and user2
      expect(result.loserCount).toBe(2) // user3 and user4
      expect(result.market.type).toBe('binary')
      expect(result.auditTrail.verificationChecks.allCommitmentsProcessed).toBe(true)
    })

    it('should calculate accurate payout preview for multi-option market', async () => {
      const market = createMultiOptionMarket()
      const commitments = createMultiOptionCommitments()

      // Mock Firebase calls
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: market.id,
        data: () => market
      })

      mockGetDocs.mockResolvedValue({
        docs: commitments.map(c => ({
          id: c.id,
          data: () => c
        }))
      })

      const result = await EnhancedResolutionService.calculateAccuratePayoutPreview(
        'multi-market-1',
        'designer-a',
        0.03
      )

      expect(result.totalPool).toBe(450) // 100 + 200 + 150
      expect(result.houseFee).toBe(22) // 5% of 450
      expect(result.creatorFee).toBe(13) // 3% of 450
      expect(result.winnerPool).toBe(415) // 450 - 22 - 13
      expect(result.winnerCount).toBe(2) // user1 and user2
      expect(result.loserCount).toBe(1) // user3
      expect(result.market.type).toBe('multi-option')
      expect(result.market.totalOptions).toBe(4)
    })

    it('should handle market with no commitments', async () => {
      const market = createBinaryMarket()

      // Mock Firebase calls
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: market.id,
        data: () => market
      })

      mockGetDocs.mockResolvedValue({
        docs: []
      })

      const result = await EnhancedResolutionService.calculateAccuratePayoutPreview(
        'binary-market-1',
        'yes',
        0.02
      )

      expect(result.totalPool).toBe(0)
      expect(result.winnerCount).toBe(0)
      expect(result.loserCount).toBe(0)
      expect(result.commitmentPayouts).toHaveLength(0)
      expect(result.auditTrail.verificationChecks.allCommitmentsProcessed).toBe(true)
    })
  })

  describe('Market Resolution', () => {
    it('should resolve binary market accurately', async () => {
      const market = createBinaryMarket()
      const commitments = createBinaryCommitments()
      const evidence = createEvidence()

      // Mock Firebase calls for payout preview
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: market.id,
        data: () => market
      })

      mockGetDocs.mockResolvedValue({
        docs: commitments.map(c => ({
          id: c.id,
          data: () => c
        }))
      })

      // Mock Firebase calls for resolution
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: market.id,
        data: () => market
      })

      // Mock transaction
      mockRunTransaction.mockResolvedValue('mock-resolution-id')

      // Mock batch operations
      const mockBatch = {
        update: jest.fn(),
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      }
      mockWriteBatch.mockReturnValue(mockBatch)

      const result = await EnhancedResolutionService.resolveMarketAccurately(
        'binary-market-1',
        'yes',
        evidence,
        'admin-1',
        0.02
      )

      expect(result.success).toBe(true)
      expect(result.resolutionId).toBe('mock-resolution-id')
      expect(result.payoutSummary.totalPool).toBe(700)
      expect(result.payoutSummary.winnerCount).toBe(2)
      expect(result.payoutSummary.loserCount).toBe(2)
      expect(result.auditTrail.verificationPassed).toBe(true)
      expect(result.auditTrail.commitmentTypes.binary + result.auditTrail.commitmentTypes.hybrid).toBeGreaterThan(0)
    })

    it('should resolve multi-option market accurately', async () => {
      const market = createMultiOptionMarket()
      const commitments = createMultiOptionCommitments()
      const evidence = createEvidence()

      // Mock Firebase calls for payout preview
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: market.id,
        data: () => market
      })

      mockGetDocs.mockResolvedValue({
        docs: commitments.map(c => ({
          id: c.id,
          data: () => c
        }))
      })

      // Mock Firebase calls for resolution
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: market.id,
        data: () => market
      })

      // Mock transaction
      mockRunTransaction.mockResolvedValue('mock-resolution-id')

      // Mock batch operations
      const mockBatch = {
        update: jest.fn(),
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      }
      mockWriteBatch.mockReturnValue(mockBatch)

      const result = await EnhancedResolutionService.resolveMarketAccurately(
        'multi-market-1',
        'designer-a',
        evidence,
        'admin-1',
        0.03
      )

      expect(result.success).toBe(true)
      expect(result.resolutionId).toBe('mock-resolution-id')
      expect(result.payoutSummary.winnerCount).toBe(2)
      expect(result.payoutSummary.loserCount).toBe(1)
      expect(result.auditTrail.verificationPassed).toBe(true)
      expect(result.auditTrail.commitmentTypes.multiOption + result.auditTrail.commitmentTypes.hybrid).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should throw error for non-existent market', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false
      })

      await expect(
        EnhancedResolutionService.calculateAccuratePayoutPreview(
          'non-existent-market',
          'yes',
          0.02
        )
      ).rejects.toThrow('Market not found')
    })

    it('should throw error for insufficient evidence', async () => {
      const market = createBinaryMarket()

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: market.id,
        data: () => market
      })

      await expect(
        EnhancedResolutionService.resolveMarketAccurately(
          'binary-market-1',
          'yes',
          [], // No evidence
          'admin-1',
          0.02
        )
      ).rejects.toThrow('At least one piece of evidence is required')
    })

    it('should throw error for already resolved market', async () => {
      const market = { ...createBinaryMarket(), status: 'resolved' as any }
      const evidence = createEvidence()

      // Mock Firebase call for market validation (this is the first call in resolveMarketAccurately)
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: market.id,
        data: () => market
      })

      await expect(
        EnhancedResolutionService.resolveMarketAccurately(
          'binary-market-1',
          'yes',
          evidence,
          'admin-1',
          0.02
        )
      ).rejects.toThrow('Market is already resolved')
    })

    it('should throw error for invalid winning option', async () => {
      const market = createMultiOptionMarket()
      const evidence = createEvidence()

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: market.id,
        data: () => market
      })

      await expect(
        EnhancedResolutionService.resolveMarketAccurately(
          'multi-market-1',
          'invalid-option',
          evidence,
          'admin-1',
          0.02
        )
      ).rejects.toThrow('does not exist in market')
    })
  })

  describe('Backward Compatibility', () => {
    it('should handle mixed commitment types correctly', async () => {
      const market = createBinaryMarket()
      const mixedCommitments = [
        // Legacy position-only commitment
        { ...createBinaryCommitments()[0], optionId: undefined },
        // New optionId-only commitment
        { ...createBinaryCommitments()[1], position: undefined as any },
        // Hybrid commitment
        createBinaryCommitments()[2]
      ]

      // Mock Firebase calls
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: market.id,
        data: () => market
      })

      mockGetDocs.mockResolvedValue({
        docs: mixedCommitments.map(c => ({
          id: c.id,
          data: () => c
        }))
      })

      const result = await EnhancedResolutionService.calculateAccuratePayoutPreview(
        'binary-market-1',
        'yes',
        0.02
      )

      expect(result.auditTrail.binaryCommitments).toBeGreaterThan(0)
      expect(result.auditTrail.multiOptionCommitments).toBeGreaterThan(0)
      expect(result.auditTrail.hybridCommitments).toBeGreaterThan(0)
      expect(result.auditTrail.verificationChecks.allCommitmentsProcessed).toBe(true)
    })
  })
})