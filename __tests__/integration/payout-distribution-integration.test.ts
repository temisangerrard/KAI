/**
 * Payout Distribution Integration Tests
 * Tests the integration between ResolutionService and PayoutDistributionService
 * with backward compatibility verification
 */

import { ResolutionService } from '@/lib/services/resolution-service'
import { PayoutDistributionService } from '@/lib/services/payout-distribution-service'
import { EnhancedPayoutCalculationService } from '@/lib/services/enhanced-payout-calculation-service'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { AdminAuthService } from '@/lib/auth/admin-auth'
import { Market, MarketResolution, Evidence } from '@/lib/types/database'
import { PredictionCommitment } from '@/lib/types/token'
import { Timestamp } from 'firebase/firestore'

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

// Mock services
jest.mock('@/lib/services/payout-distribution-service')
jest.mock('@/lib/services/enhanced-payout-calculation-service')
jest.mock('@/lib/services/token-balance-service')
jest.mock('@/lib/auth/admin-auth')

// Mock Firestore functions
const mockRunTransaction = jest.fn()
const mockGetDocs = jest.fn()
const mockDoc = jest.fn()
const mockCollection = jest.fn()
const mockQuery = jest.fn()
const mockWhere = jest.fn()
const mockGetDoc = jest.fn()

jest.mock('firebase/firestore', () => ({
  runTransaction: (...args: any[]) => mockRunTransaction(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  doc: (...args: any[]) => mockDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: jest.fn(),
  limit: jest.fn(),
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 })
  },
  increment: (value: number) => ({ _increment: value }),
  writeBatch: jest.fn()
}))

describe('Payout Distribution Integration', () => {
  const mockMarket: Market = {
    id: 'market-123',
    title: 'Test Market Integration',
    description: 'Integration test market',
    category: 'entertainment',
    status: 'pending_resolution',
    createdBy: 'creator-123',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.now(),
    tags: ['test'],
    totalParticipants: 3,
    totalTokensStaked: 1000,
    featured: false,
    trending: false,
    options: [
      {
        id: 'option-1',
        text: 'Option A',
        totalTokens: 600,
        participantCount: 2,
        odds: 1.67,
        isCorrect: true
      },
      {
        id: 'option-2',
        text: 'Option B', 
        totalTokens: 400,
        participantCount: 1,
        odds: 2.5,
        isCorrect: false
      }
    ]
  }

  const mockCommitments: PredictionCommitment[] = [
    {
      id: 'commitment-1',
      userId: 'user-1',
      predictionId: 'market-123',
      marketId: 'market-123',
      position: 'yes',
      optionId: 'option-1',
      tokensCommitted: 300,
      odds: 1.67,
      potentialWinning: 500,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user1@test.com',
      userDisplayName: 'User 1',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Test Market Integration',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 1.67,
          noOdds: 2.5,
          totalYesTokens: 600,
          totalNoTokens: 400,
          totalParticipants: 3
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web'
      }
    },
    {
      id: 'commitment-2',
      userId: 'user-2',
      predictionId: 'market-123',
      position: 'no',
      optionId: 'option-2',
      tokensCommitted: 400,
      odds: 2.5,
      potentialWinning: 1000,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user2@test.com',
      userDisplayName: 'User 2',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Test Market Integration',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 1.67,
          noOdds: 2.5,
          totalYesTokens: 600,
          totalNoTokens: 400,
          totalParticipants: 3
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web'
      }
    }
  ]

  const mockEvidence: Evidence[] = [
    {
      id: 'evidence-1',
      type: 'url',
      content: 'https://example.com/proof',
      description: 'Official announcement',
      uploadedAt: Timestamp.now()
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock admin authentication
    ;(AdminAuthService.checkUserIsAdmin as jest.Mock).mockResolvedValue(true)

    // Mock market retrieval
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockMarket
    })

    // Mock commitments retrieval
    mockGetDocs.mockResolvedValue({
      docs: mockCommitments.map(commitment => ({
        id: commitment.id,
        data: () => commitment
      }))
    })

    // Mock successful transaction
    mockRunTransaction.mockImplementation(async (db, callback) => {
      const mockTransaction = {
        set: jest.fn(),
        update: jest.fn(),
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockMarket
        })
      }
      
      const result = await callback(mockTransaction)
      return result || 'resolution-123'
    })

    // Mock document references
    mockDoc.mockReturnValue({ id: 'mock-doc-id' })
    mockCollection.mockReturnValue({})

    // Mock payout distribution service
    ;(PayoutDistributionService.distributePayouts as jest.Mock).mockResolvedValue({
      success: true,
      distributionId: 'distribution-123',
      totalDistributed: 930,
      recipientCount: 1,
      transactionIds: ['tx-1', 'tx-2'],
      summary: {
        totalPool: 1000,
        houseFee: 50,
        creatorFee: 20,
        winnerPool: 930,
        winnerCount: 1,
        loserCount: 1
      }
    })

    // Mock TokenBalanceService
    ;(TokenBalanceService.updateBalanceAtomic as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      availableTokens: 1000,
      committedTokens: 0,
      totalEarned: 1000,
      totalSpent: 0,
      lastUpdated: Timestamp.now(),
      version: 2
    })
  })

  describe('ResolutionService with PayoutDistributionService Integration', () => {
    it('should resolve market using comprehensive payout distribution system', async () => {
      const result = await ResolutionService.resolveMarket(
        'market-123',
        'option-1',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true)
      expect(result.resolutionId).toBeDefined()

      // Verify admin authentication was checked
      expect(AdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('admin-123')

      // Verify market resolution transaction was executed
      expect(mockRunTransaction).toHaveBeenCalled()

      // Verify comprehensive payout distribution was called
      expect(PayoutDistributionService.distributePayouts).toHaveBeenCalledWith({
        market: mockMarket,
        resolution: expect.objectContaining({
          marketId: 'market-123',
          winningOptionId: 'option-1',
          resolvedBy: 'admin-123',
          evidence: mockEvidence
        }),
        commitments: mockCommitments,
        winningOptionId: 'option-1',
        creatorFeePercentage: 0.02,
        adminId: 'admin-123'
      })
    })

    it('should handle mixed binary and multi-option commitments in resolution', async () => {
      const mixedCommitments = [
        // Binary commitment (position only)
        {
          ...mockCommitments[0],
          id: 'commitment-binary',
          optionId: undefined
        },
        // Multi-option commitment (optionId only)
        {
          ...mockCommitments[1],
          id: 'commitment-multi',
          position: undefined as any
        }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mixedCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      const result = await ResolutionService.resolveMarket(
        'market-123',
        'option-1',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true)

      // Verify payout distribution was called with mixed commitments
      expect(PayoutDistributionService.distributePayouts).toHaveBeenCalledWith(
        expect.objectContaining({
          commitments: mixedCommitments
        })
      )
    })

    it('should fallback to legacy payout system when comprehensive distribution fails', async () => {
      // Mock payout distribution failure
      ;(PayoutDistributionService.distributePayouts as jest.Mock).mockResolvedValue({
        success: false,
        distributionId: '',
        totalDistributed: 0,
        recipientCount: 0,
        transactionIds: [],
        summary: {
          totalPool: 0,
          houseFee: 0,
          creatorFee: 0,
          winnerPool: 0,
          winnerCount: 0,
          loserCount: 0
        },
        error: {
          message: 'Distribution failed',
          code: 'DISTRIBUTION_FAILED'
        }
      })

      const result = await ResolutionService.resolveMarket(
        'market-123',
        'option-1',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true) // Resolution should still succeed

      // Verify fallback to TokenBalanceService was attempted
      expect(TokenBalanceService.updateBalanceAtomic).toHaveBeenCalled()
    })

    it('should handle commitments with both predictionId and marketId fields', async () => {
      const commitmentsWithBothFields = mockCommitments.map(commitment => ({
        ...commitment,
        predictionId: 'market-123',
        marketId: 'market-123'
      }))

      mockGetDocs.mockResolvedValue({
        docs: commitmentsWithBothFields.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      const result = await ResolutionService.resolveMarket(
        'market-123',
        'option-1',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true)

      // Verify payout distribution handled both field formats
      expect(PayoutDistributionService.distributePayouts).toHaveBeenCalledWith(
        expect.objectContaining({
          commitments: commitmentsWithBothFields
        })
      )
    })

    it('should preserve existing dashboard compatibility', async () => {
      const result = await ResolutionService.resolveMarket(
        'market-123',
        'option-1',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true)

      // Verify legacy payout records were created in transaction
      const transactionCallback = mockRunTransaction.mock.calls[0][1]
      const mockTransaction = {
        set: jest.fn(),
        update: jest.fn(),
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockMarket
        })
      }
      
      await transactionCallback(mockTransaction)

      // Verify legacy ResolutionPayout records were created
      const resolutionPayoutCalls = mockTransaction.set.mock.calls.filter(call => 
        call[1].resolutionId && call[1].userId && call[1].payoutAmount !== undefined
      )
      
      expect(resolutionPayoutCalls.length).toBeGreaterThan(0)

      // Verify CreatorPayout record was created
      const creatorPayoutCalls = mockTransaction.set.mock.calls.filter(call => 
        call[1].creatorId && call[1].feeAmount !== undefined
      )
      
      expect(creatorPayoutCalls.length).toBeGreaterThan(0)

      // Verify HousePayout record was created
      const housePayoutCalls = mockTransaction.set.mock.calls.filter(call => 
        call[1].feeAmount !== undefined && call[1].feePercentage === 5.0
      )
      
      expect(housePayoutCalls.length).toBeGreaterThan(0)
    })

    it('should handle admin authentication failure', async () => {
      ;(AdminAuthService.checkUserIsAdmin as jest.Mock).mockResolvedValue(false)

      await expect(
        ResolutionService.resolveMarket(
          'market-123',
          'option-1',
          mockEvidence,
          'non-admin-123',
          0.02
        )
      ).rejects.toThrow('Admin privileges required for this operation')

      // Verify payout distribution was not called
      expect(PayoutDistributionService.distributePayouts).not.toHaveBeenCalled()
    })

    it('should handle empty commitments gracefully', async () => {
      mockGetDocs.mockResolvedValue({
        docs: []
      })

      const result = await ResolutionService.resolveMarket(
        'market-123',
        'option-1',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true)

      // Verify payout distribution was called with empty commitments
      expect(PayoutDistributionService.distributePayouts).toHaveBeenCalledWith(
        expect.objectContaining({
          commitments: []
        })
      )
    })
  })

  describe('Backward Compatibility Verification', () => {
    it('should maintain existing transaction record format', async () => {
      await ResolutionService.resolveMarket(
        'market-123',
        'option-1',
        mockEvidence,
        'admin-123',
        0.02
      )

      // Verify comprehensive payout distribution creates both legacy and enhanced records
      expect(PayoutDistributionService.distributePayouts).toHaveBeenCalledWith(
        expect.objectContaining({
          market: expect.objectContaining({
            id: 'market-123',
            title: 'Test Market Integration'
          }),
          resolution: expect.objectContaining({
            marketId: 'market-123',
            winningOptionId: 'option-1'
          })
        })
      )
    })

    it('should support both binary and multi-option market resolution', async () => {
      // Test with multi-option market
      const multiOptionMarket = {
        ...mockMarket,
        options: [
          { id: 'option-1', text: 'Option A', totalTokens: 300, participantCount: 1, odds: 3.33 },
          { id: 'option-2', text: 'Option B', totalTokens: 300, participantCount: 1, odds: 3.33 },
          { id: 'option-3', text: 'Option C', totalTokens: 400, participantCount: 1, odds: 2.5 }
        ]
      }

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => multiOptionMarket
      })

      const result = await ResolutionService.resolveMarket(
        'market-123',
        'option-3',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true)

      // Verify payout distribution handled multi-option market
      expect(PayoutDistributionService.distributePayouts).toHaveBeenCalledWith(
        expect.objectContaining({
          market: multiOptionMarket,
          winningOptionId: 'option-3'
        })
      )
    })
  })
})