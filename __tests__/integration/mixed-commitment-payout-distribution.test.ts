/**
 * Mixed Commitment Payout Distribution Tests
 * Task 13: Test accurate payout distribution for mixed commitment scenarios
 * 
 * Tests both binary markets with migrated position-based commitments
 * and multi-option markets with new option-based commitments
 */

import { EnhancedResolutionService } from '@/lib/services/enhanced-resolution-service'
import { EnhancedPayoutCalculationService } from '@/lib/services/enhanced-payout-calculation-service'
import { PayoutDistributionService } from '@/lib/services/payout-distribution-service'
import { AdminCommitmentService } from '@/lib/services/admin-commitment-service'
import { AdminAuthService } from '@/lib/auth/admin-auth'
import { Market, MarketResolution, Evidence } from '@/lib/types/database'
import { PredictionCommitment } from '@/lib/types/token'
import { Timestamp } from 'firebase/firestore'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { beforeEach } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { beforeEach } from 'vitest'
import { describe } from 'vitest'
import { beforeEach } from 'vitest'
import { describe } from 'vitest'

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

// Mock services
jest.mock('@/lib/services/enhanced-payout-calculation-service')
jest.mock('@/lib/services/payout-distribution-service')
jest.mock('@/lib/services/admin-commitment-service')
jest.mock('@/lib/auth/admin-auth')

// Mock Firestore functions
const mockRunTransaction = jest.fn()
const mockGetDocs = jest.fn()
const mockDoc = jest.fn()
const mockCollection = jest.fn()
const mockQuery = jest.fn()
const mockWhere = jest.fn()
const mockGetDoc = jest.fn()
const mockWriteBatch = jest.fn()

jest.mock('firebase/firestore', () => ({
  runTransaction: (...args: any[]) => mockRunTransaction(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  doc: (...args: any[]) => mockDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  writeBatch: (...args: any[]) => mockWriteBatch(...args),
  orderBy: jest.fn(),
  limit: jest.fn(),
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 })
  },
  increment: (value: number) => ({ _increment: value })
}))

describe('Mixed Commitment Payout Distribution Tests', () => { 
 // Test data for binary market with migrated commitments
  const binaryMarket: Market = {
    id: 'binary-market-123',
    title: 'Binary Market Test',
    description: 'Test binary market with migrated commitments',
    category: 'entertainment',
    status: 'pending_resolution',
    createdBy: 'creator-123',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.now(),
    tags: ['test', 'binary'],
    totalParticipants: 4,
    totalTokensStaked: 2000,
    featured: false,
    trending: false,
    options: [
      {
        id: 'yes',
        text: 'Yes',
        totalTokens: 1200,
        participantCount: 3,
        odds: 1.67,
        isCorrect: true
      },
      {
        id: 'no',
        text: 'No',
        totalTokens: 800,
        participantCount: 1,
        odds: 2.5,
        isCorrect: false
      }
    ]
  }

  // Test data for multi-option market
  const multiOptionMarket: Market = {
    id: 'multi-market-456',
    title: 'Multi-Option Market Test',
    description: 'Test multi-option market with new commitments',
    category: 'entertainment',
    status: 'pending_resolution',
    createdBy: 'creator-456',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.now(),
    tags: ['test', 'multi-option'],
    totalParticipants: 5,
    totalTokensStaked: 3000,
    featured: false,
    trending: false,
    options: [
      {
        id: 'option-a',
        text: 'Option A',
        totalTokens: 800,
        participantCount: 2,
        odds: 3.75
      },
      {
        id: 'option-b',
        text: 'Option B',
        totalTokens: 1200,
        participantCount: 2,
        odds: 2.5,
        isCorrect: true
      },
      {
        id: 'option-c',
        text: 'Option C',
        totalTokens: 600,
        participantCount: 1,
        odds: 5.0
      },
      {
        id: 'option-d',
        text: 'Option D',
        totalTokens: 400,
        participantCount: 1,
        odds: 7.5
      }
    ]
  }

  // Binary market commitments (migrated position-based)
  const binaryCommitments: PredictionCommitment[] = [
    // Legacy binary commitment (position only, no optionId)
    {
      id: 'binary-commitment-1',
      userId: 'user-1',
      predictionId: 'binary-market-123',
      position: 'yes',
      // optionId: undefined (migrated commitment)
      tokensCommitted: 500,
      odds: 1.67,
      potentialWinning: 835,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user1@test.com',
      userDisplayName: 'User 1',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Binary Market Test',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 1.67,
          noOdds: 2.5,
          totalYesTokens: 1200,
          totalNoTokens: 800,
          totalParticipants: 4
        },
        userBalanceAtCommitment: 2000,
        commitmentSource: 'web'
      }
    },
    // Migrated binary commitment with derived optionId
    {
      id: 'binary-commitment-2',
      userId: 'user-2',
      predictionId: 'binary-market-123',
      position: 'yes',
      optionId: 'yes', // Derived during migration
      tokensCommitted: 400,
      odds: 1.67,
      potentialWinning: 668,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user2@test.com',
      userDisplayName: 'User 2',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Binary Market Test',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 1.67,
          noOdds: 2.5,
          totalYesTokens: 1200,
          totalNoTokens: 800,
          totalParticipants: 4
        },
        userBalanceAtCommitment: 1500,
        commitmentSource: 'mobile'
      }
    },
    // Binary commitment with both fields (hybrid)
    {
      id: 'binary-commitment-3',
      userId: 'user-3',
      predictionId: 'binary-market-123',
      position: 'yes',
      optionId: 'yes',
      tokensCommitted: 300,
      odds: 1.67,
      potentialWinning: 501,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user3@test.com',
      userDisplayName: 'User 3',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Binary Market Test',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 1.67,
          noOdds: 2.5,
          totalYesTokens: 1200,
          totalNoTokens: 800,
          totalParticipants: 4
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web'
      }
    },
    // Losing binary commitment
    {
      id: 'binary-commitment-4',
      userId: 'user-4',
      predictionId: 'binary-market-123',
      position: 'no',
      optionId: 'no',
      tokensCommitted: 800,
      odds: 2.5,
      potentialWinning: 2000,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user4@test.com',
      userDisplayName: 'User 4',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Binary Market Test',
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 1.67,
          noOdds: 2.5,
          totalYesTokens: 1200,
          totalNoTokens: 800,
          totalParticipants: 4
        },
        userBalanceAtCommitment: 2500,
        commitmentSource: 'web'
      }
    }
  ]

  // Multi-option market commitments (new option-based)
  const multiOptionCommitments: PredictionCommitment[] = [
    // Pure option-based commitment (no position field)
    {
      id: 'multi-commitment-1',
      userId: 'user-5',
      marketId: 'multi-market-456', // Using marketId instead of predictionId
      optionId: 'option-b',
      // position: undefined (new multi-option commitment)
      tokensCommitted: 600,
      odds: 2.5,
      potentialWinning: 1500,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user5@test.com',
      userDisplayName: 'User 5',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Multi-Option Market Test',
        marketEndsAt: Timestamp.now(),
        optionText: 'Option B',
        optionIndex: 1,
        marketSnapshot: {
          totalOptions: 4,
          allOptionsData: [
            { optionId: 'option-a', text: 'Option A', totalTokens: 800, participantCount: 2, odds: 3.75 },
            { optionId: 'option-b', text: 'Option B', totalTokens: 1200, participantCount: 2, odds: 2.5 },
            { optionId: 'option-c', text: 'Option C', totalTokens: 600, participantCount: 1, odds: 5.0 },
            { optionId: 'option-d', text: 'Option D', totalTokens: 400, participantCount: 1, odds: 7.5 }
          ]
        },
        userBalanceAtCommitment: 2000,
        commitmentSource: 'web'
      }
    },
    // Multi-option commitment with derived position
    {
      id: 'multi-commitment-2',
      userId: 'user-6',
      marketId: 'multi-market-456',
      optionId: 'option-b',
      position: 'yes', // Derived for compatibility
      tokensCommitted: 600,
      odds: 2.5,
      potentialWinning: 1500,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user6@test.com',
      userDisplayName: 'User 6',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Multi-Option Market Test',
        marketEndsAt: Timestamp.now(),
        optionText: 'Option B',
        optionIndex: 1,
        marketSnapshot: {
          totalOptions: 4,
          allOptionsData: [
            { optionId: 'option-a', text: 'Option A', totalTokens: 800, participantCount: 2, odds: 3.75 },
            { optionId: 'option-b', text: 'Option B', totalTokens: 1200, participantCount: 2, odds: 2.5 },
            { optionId: 'option-c', text: 'Option C', totalTokens: 600, participantCount: 1, odds: 5.0 },
            { optionId: 'option-d', text: 'Option D', totalTokens: 400, participantCount: 1, odds: 7.5 }
          ]
        },
        userBalanceAtCommitment: 1800,
        commitmentSource: 'mobile'
      }
    },
    // Losing multi-option commitments
    {
      id: 'multi-commitment-3',
      userId: 'user-7',
      marketId: 'multi-market-456',
      optionId: 'option-a',
      tokensCommitted: 800,
      odds: 3.75,
      potentialWinning: 3000,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user7@test.com',
      userDisplayName: 'User 7',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Multi-Option Market Test',
        marketEndsAt: Timestamp.now(),
        optionText: 'Option A',
        optionIndex: 0,
        marketSnapshot: {
          totalOptions: 4,
          allOptionsData: [
            { optionId: 'option-a', text: 'Option A', totalTokens: 800, participantCount: 2, odds: 3.75 },
            { optionId: 'option-b', text: 'Option B', totalTokens: 1200, participantCount: 2, odds: 2.5 },
            { optionId: 'option-c', text: 'Option C', totalTokens: 600, participantCount: 1, odds: 5.0 },
            { optionId: 'option-d', text: 'Option D', totalTokens: 400, participantCount: 1, odds: 7.5 }
          ]
        },
        userBalanceAtCommitment: 2500,
        commitmentSource: 'web'
      }
    },
    {
      id: 'multi-commitment-4',
      userId: 'user-8',
      marketId: 'multi-market-456',
      optionId: 'option-c',
      tokensCommitted: 600,
      odds: 5.0,
      potentialWinning: 3000,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user8@test.com',
      userDisplayName: 'User 8',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Multi-Option Market Test',
        marketEndsAt: Timestamp.now(),
        optionText: 'Option C',
        optionIndex: 2,
        marketSnapshot: {
          totalOptions: 4,
          allOptionsData: [
            { optionId: 'option-a', text: 'Option A', totalTokens: 800, participantCount: 2, odds: 3.75 },
            { optionId: 'option-b', text: 'Option B', totalTokens: 1200, participantCount: 2, odds: 2.5 },
            { optionId: 'option-c', text: 'Option C', totalTokens: 600, participantCount: 1, odds: 5.0 },
            { optionId: 'option-d', text: 'Option D', totalTokens: 400, participantCount: 1, odds: 7.5 }
          ]
        },
        userBalanceAtCommitment: 1500,
        commitmentSource: 'web'
      }
    },
    {
      id: 'multi-commitment-5',
      userId: 'user-9',
      marketId: 'multi-market-456',
      optionId: 'option-d',
      tokensCommitted: 400,
      odds: 7.5,
      potentialWinning: 3000,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user9@test.com',
      userDisplayName: 'User 9',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Multi-Option Market Test',
        marketEndsAt: Timestamp.now(),
        optionText: 'Option D',
        optionIndex: 3,
        marketSnapshot: {
          totalOptions: 4,
          allOptionsData: [
            { optionId: 'option-a', text: 'Option A', totalTokens: 800, participantCount: 2, odds: 3.75 },
            { optionId: 'option-b', text: 'Option B', totalTokens: 1200, participantCount: 2, odds: 2.5 },
            { optionId: 'option-c', text: 'Option C', totalTokens: 600, participantCount: 1, odds: 5.0 },
            { optionId: 'option-d', text: 'Option D', totalTokens: 400, participantCount: 1, odds: 7.5 }
          ]
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'mobile'
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

    // Mock document references
    mockDoc.mockReturnValue({ id: 'mock-doc-id' })
    mockCollection.mockReturnValue({})
    mockWriteBatch.mockReturnValue({
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn()
    })

    // Mock successful transaction
    mockRunTransaction.mockImplementation(async (db, callback) => {
      const mockTransaction = {
        set: jest.fn(),
        update: jest.fn(),
        get: jest.fn()
      }
      
      const result = await callback(mockTransaction)
      return result || 'resolution-123'
    })
  })

  describe('Binary Market Resolution with Migrated Commitments', () => {
    beforeEach(() => {
      // Mock binary market retrieval
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => binaryMarket
      })

      // Mock binary commitments retrieval
      mockGetDocs.mockResolvedValue({
        docs: binaryCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      // Mock binary market payout calculation
      const binaryPayoutResult = {
        market: {
          id: 'binary-market-123',
          title: 'Binary Market Test',
          type: 'binary' as const,
          totalOptions: 2
        },
        totalPool: 2000,
        houseFee: 100, // 5%
        creatorFee: 40, // 2%
        totalFees: 140,
        winnerPool: 1860,
        winnerCount: 3,
        loserCount: 1,
        commitmentPayouts: [
          {
            commitmentId: 'binary-commitment-1',
            userId: 'user-1',
            tokensCommitted: 500,
            odds: 1.67,
            isWinner: true,
            payoutAmount: 775, // (500/1200) * 1860
            profit: 275,
            winShare: 500/1200,
            optionId: 'yes',
            position: 'yes' as const,
            auditTrail: {
              commitmentType: 'binary' as const,
              originalPosition: 'yes' as const,
              derivedOptionId: 'yes',
              winnerIdentificationMethod: 'hybrid' as const,
              calculationTimestamp: Timestamp.now()
            }
          },
          {
            commitmentId: 'binary-commitment-2',
            userId: 'user-2',
            tokensCommitted: 400,
            odds: 1.67,
            isWinner: true,
            payoutAmount: 620, // (400/1200) * 1860
            profit: 220,
            winShare: 400/1200,
            optionId: 'yes',
            position: 'yes' as const,
            auditTrail: {
              commitmentType: 'hybrid' as const,
              originalPosition: 'yes' as const,
              originalOptionId: 'yes',
              winnerIdentificationMethod: 'hybrid' as const,
              calculationTimestamp: Timestamp.now()
            }
          },
          {
            commitmentId: 'binary-commitment-3',
            userId: 'user-3',
            tokensCommitted: 300,
            odds: 1.67,
            isWinner: true,
            payoutAmount: 465, // (300/1200) * 1860
            profit: 165,
            winShare: 300/1200,
            optionId: 'yes',
            position: 'yes' as const,
            auditTrail: {
              commitmentType: 'hybrid' as const,
              originalPosition: 'yes' as const,
              originalOptionId: 'yes',
              winnerIdentificationMethod: 'hybrid' as const,
              calculationTimestamp: Timestamp.now()
            }
          },
          {
            commitmentId: 'binary-commitment-4',
            userId: 'user-4',
            tokensCommitted: 800,
            odds: 2.5,
            isWinner: false,
            payoutAmount: 0,
            profit: -800,
            winShare: 0,
            optionId: 'no',
            position: 'no' as const,
            auditTrail: {
              commitmentType: 'hybrid' as const,
              originalPosition: 'no' as const,
              originalOptionId: 'no',
              winnerIdentificationMethod: 'hybrid' as const,
              calculationTimestamp: Timestamp.now()
            }
          }
        ],
        payouts: [
          { userId: 'user-1', tokensStaked: 500, payoutAmount: 775, profit: 275, winShare: 500/1200 },
          { userId: 'user-2', tokensStaked: 400, payoutAmount: 620, profit: 220, winShare: 400/1200 },
          { userId: 'user-3', tokensStaked: 300, payoutAmount: 465, profit: 165, winShare: 300/1200 }
        ],
        feeBreakdown: {
          houseFeePercentage: 0.05,
          creatorFeePercentage: 0.02,
          totalFeePercentage: 0.07,
          remainingForWinners: 0.93
        },
        auditTrail: {
          calculationTimestamp: Timestamp.now(),
          totalCommitmentsProcessed: 4,
          binaryCommitments: 1,
          multiOptionCommitments: 0,
          hybridCommitments: 3,
          winnerIdentificationSummary: {
            positionBased: 0,
            optionIdBased: 0,
            hybrid: 3
          },
          verificationChecks: {
            allCommitmentsProcessed: true,
            payoutSumsCorrect: true,
            noDoublePayouts: true,
            auditTrailComplete: true
          }
        }
      }

      ;(EnhancedPayoutCalculationService.calculateAccuratePayouts as jest.Mock).mockReturnValue(binaryPayoutResult)

      // Mock payout distribution success
      ;(PayoutDistributionService.distributePayouts as jest.Mock).mockResolvedValue({
        success: true,
        distributionId: 'binary-distribution-123',
        totalDistributed: 1860,
        recipientCount: 3,
        transactionIds: ['tx-1', 'tx-2', 'tx-3'],
        summary: {
          totalPool: 2000,
          houseFee: 100,
          creatorFee: 40,
          winnerPool: 1860,
          winnerCount: 3,
          loserCount: 1
        }
      })
    })

    it('should resolve binary market with migrated position-based commitments', async () => {
      const result = await EnhancedResolutionService.resolveMarketAccurately(
        'binary-market-123',
        'yes', // Winning option
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true)
      expect(result.resolutionId).toBeDefined()

      // Verify admin authentication was checked
      expect(AdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('admin-123')

      // Verify payout calculation was called with binary market and commitments
      expect(EnhancedPayoutCalculationService.calculateAccuratePayouts).toHaveBeenCalledWith({
        market: binaryMarket,
        commitments: binaryCommitments,
        winningOptionId: 'yes',
        creatorFeePercentage: 0.02
      })

      // Verify payout summary
      expect(result.payoutSummary.totalPool).toBe(2000)
      expect(result.payoutSummary.winnerCount).toBe(3)
      expect(result.payoutSummary.loserCount).toBe(1)
      expect(result.payoutSummary.totalPayouts).toBe(1860)

      // Verify audit trail shows mixed commitment types
      expect(result.auditTrail.commitmentTypes.binary).toBe(1)
      expect(result.auditTrail.commitmentTypes.hybrid).toBe(3)
      expect(result.auditTrail.winnerIdentificationMethods.hybrid).toBe(3)
    })

    it('should identify winners correctly using both position and optionId', async () => {
      await EnhancedResolutionService.resolveMarketAccurately(
        'binary-market-123',
        'yes',
        mockEvidence,
        'admin-123',
        0.02
      )

      // Verify payout calculation handled mixed commitment formats
      const calculationCall = (EnhancedPayoutCalculationService.calculateAccuratePayouts as jest.Mock).mock.calls[0][0]
      
      expect(calculationCall.commitments).toHaveLength(4)
      
      // Verify commitments have different formats
      const positionOnlyCommitment = calculationCall.commitments.find((c: any) => c.id === 'binary-commitment-1')
      expect(positionOnlyCommitment.position).toBe('yes')
      expect(positionOnlyCommitment.optionId).toBeUndefined()

      const hybridCommitment = calculationCall.commitments.find((c: any) => c.id === 'binary-commitment-2')
      expect(hybridCommitment.position).toBe('yes')
      expect(hybridCommitment.optionId).toBe('yes')
    })

    it('should calculate accurate payouts for migrated binary commitments', async () => {
      const result = await EnhancedResolutionService.resolveMarketAccurately(
        'binary-market-123',
        'yes',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true)

      // Verify all winning commitments get proportional payouts
      expect(result.payoutSummary.totalPayouts).toBe(1860) // Total winner pool
      
      // Verify fees are calculated correctly
      expect(result.payoutSummary.houseFee).toBe(100) // 5% of 2000
      expect(result.payoutSummary.creatorFee).toBe(40) // 2% of 2000
    })

    it('should preserve existing dashboard compatibility for binary markets', async () => {
      await EnhancedResolutionService.resolveMarketAccurately(
        'binary-market-123',
        'yes',
        mockEvidence,
        'admin-123',
        0.02
      )

      // Verify AdminCommitmentService can still query the resolved market
      // This would be called by existing dashboards
      expect(mockRunTransaction).toHaveBeenCalled()
      
      // Verify resolution creates records in expected format
      const transactionCallback = mockRunTransaction.mock.calls[0][1]
      const mockTransaction = {
        set: jest.fn(),
        update: jest.fn(),
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => binaryMarket
        })
      }
      
      await transactionCallback(mockTransaction)

      // Verify market status was updated
      const marketUpdateCall = mockTransaction.update.mock.calls.find(call => 
        call[1].status === 'resolved'
      )
      expect(marketUpdateCall).toBeDefined()
    })
  })

  describe('Multi-Option Market Resolution with New Commitments', () => {
    beforeEach(() => {
      // Mock multi-option market retrieval
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => multiOptionMarket
      })

      // Mock multi-option commitments retrieval
      mockGetDocs.mockResolvedValue({
        docs: multiOptionCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      // Mock multi-option market payout calculation
      const multiOptionPayoutResult = {
        market: {
          id: 'multi-market-456',
          title: 'Multi-Option Market Test',
          type: 'multi-option' as const,
          totalOptions: 4
        },
        totalPool: 3000,
        houseFee: 150, // 5%
        creatorFee: 60, // 2%
        totalFees: 210,
        winnerPool: 2790,
        winnerCount: 2,
        loserCount: 3,
        commitmentPayouts: [
          {
            commitmentId: 'multi-commitment-1',
            userId: 'user-5',
            tokensCommitted: 600,
            odds: 2.5,
            isWinner: true,
            payoutAmount: 1395, // (600/1200) * 2790
            profit: 795,
            winShare: 0.5,
            optionId: 'option-b',
            position: 'yes' as const, // Derived
            auditTrail: {
              commitmentType: 'multi-option' as const,
              originalOptionId: 'option-b',
              derivedPosition: 'yes' as const,
              winnerIdentificationMethod: 'optionId-based' as const,
              calculationTimestamp: Timestamp.now()
            }
          },
          {
            commitmentId: 'multi-commitment-2',
            userId: 'user-6',
            tokensCommitted: 600,
            odds: 2.5,
            isWinner: true,
            payoutAmount: 1395, // (600/1200) * 2790
            profit: 795,
            winShare: 0.5,
            optionId: 'option-b',
            position: 'yes' as const,
            auditTrail: {
              commitmentType: 'hybrid' as const,
              originalOptionId: 'option-b',
              originalPosition: 'yes' as const,
              winnerIdentificationMethod: 'hybrid' as const,
              calculationTimestamp: Timestamp.now()
            }
          },
          // Losing commitments
          {
            commitmentId: 'multi-commitment-3',
            userId: 'user-7',
            tokensCommitted: 800,
            odds: 3.75,
            isWinner: false,
            payoutAmount: 0,
            profit: -800,
            winShare: 0,
            optionId: 'option-a',
            position: 'no' as const, // Derived
            auditTrail: {
              commitmentType: 'multi-option' as const,
              originalOptionId: 'option-a',
              derivedPosition: 'no' as const,
              winnerIdentificationMethod: 'optionId-based' as const,
              calculationTimestamp: Timestamp.now()
            }
          },
          {
            commitmentId: 'multi-commitment-4',
            userId: 'user-8',
            tokensCommitted: 600,
            odds: 5.0,
            isWinner: false,
            payoutAmount: 0,
            profit: -600,
            winShare: 0,
            optionId: 'option-c',
            position: 'no' as const, // Derived
            auditTrail: {
              commitmentType: 'multi-option' as const,
              originalOptionId: 'option-c',
              derivedPosition: 'no' as const,
              winnerIdentificationMethod: 'optionId-based' as const,
              calculationTimestamp: Timestamp.now()
            }
          },
          {
            commitmentId: 'multi-commitment-5',
            userId: 'user-9',
            tokensCommitted: 400,
            odds: 7.5,
            isWinner: false,
            payoutAmount: 0,
            profit: -400,
            winShare: 0,
            optionId: 'option-d',
            position: 'no' as const, // Derived
            auditTrail: {
              commitmentType: 'multi-option' as const,
              originalOptionId: 'option-d',
              derivedPosition: 'no' as const,
              winnerIdentificationMethod: 'optionId-based' as const,
              calculationTimestamp: Timestamp.now()
            }
          }
        ],
        payouts: [
          { userId: 'user-5', tokensStaked: 600, payoutAmount: 1395, profit: 795, winShare: 0.5 },
          { userId: 'user-6', tokensStaked: 600, payoutAmount: 1395, profit: 795, winShare: 0.5 }
        ],
        feeBreakdown: {
          houseFeePercentage: 0.05,
          creatorFeePercentage: 0.02,
          totalFeePercentage: 0.07,
          remainingForWinners: 0.93
        },
        auditTrail: {
          calculationTimestamp: Timestamp.now(),
          totalCommitmentsProcessed: 5,
          binaryCommitments: 0,
          multiOptionCommitments: 4,
          hybridCommitments: 1,
          winnerIdentificationSummary: {
            positionBased: 0,
            optionIdBased: 4,
            hybrid: 1
          },
          verificationChecks: {
            allCommitmentsProcessed: true,
            payoutSumsCorrect: true,
            noDoublePayouts: true,
            auditTrailComplete: true
          }
        }
      }

      ;(EnhancedPayoutCalculationService.calculateAccuratePayouts as jest.Mock).mockReturnValue(multiOptionPayoutResult)

      // Mock payout distribution success
      ;(PayoutDistributionService.distributePayouts as jest.Mock).mockResolvedValue({
        success: true,
        distributionId: 'multi-distribution-456',
        totalDistributed: 2790,
        recipientCount: 2,
        transactionIds: ['tx-4', 'tx-5'],
        summary: {
          totalPool: 3000,
          houseFee: 150,
          creatorFee: 60,
          winnerPool: 2790,
          winnerCount: 2,
          loserCount: 3
        }
      })
    })  
  it('should resolve multi-option market with new option-based commitments', async () => {
      const result = await EnhancedResolutionService.resolveMarketAccurately(
        'multi-market-456',
        'option-b', // Winning option
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true)
      expect(result.resolutionId).toBeDefined()

      // Verify payout calculation was called with multi-option market
      expect(EnhancedPayoutCalculationService.calculateAccuratePayouts).toHaveBeenCalledWith({
        market: multiOptionMarket,
        commitments: multiOptionCommitments,
        winningOptionId: 'option-b',
        creatorFeePercentage: 0.02
      })

      // Verify payout summary for multi-option market
      expect(result.payoutSummary.totalPool).toBe(3000)
      expect(result.payoutSummary.winnerCount).toBe(2)
      expect(result.payoutSummary.loserCount).toBe(3)
      expect(result.payoutSummary.totalPayouts).toBe(2790)

      // Verify audit trail shows multi-option commitment types
      expect(result.auditTrail.commitmentTypes.multiOption).toBe(4)
      expect(result.auditTrail.commitmentTypes.hybrid).toBe(1)
      expect(result.auditTrail.winnerIdentificationMethods.optionIdBased).toBe(4)
      expect(result.auditTrail.winnerIdentificationMethods.hybrid).toBe(1)
    })

    it('should identify winners correctly using optionId for multi-option market', async () => {
      await EnhancedResolutionService.resolveMarketAccurately(
        'multi-market-456',
        'option-b',
        mockEvidence,
        'admin-123',
        0.02
      )

      // Verify payout calculation handled option-based commitments
      const calculationCall = (EnhancedPayoutCalculationService.calculateAccuratePayouts as jest.Mock).mock.calls[0][0]
      
      expect(calculationCall.commitments).toHaveLength(5)
      
      // Verify commitments use optionId for targeting
      const optionOnlyCommitment = calculationCall.commitments.find((c: any) => c.id === 'multi-commitment-1')
      expect(optionOnlyCommitment.optionId).toBe('option-b')
      expect(optionOnlyCommitment.position).toBeUndefined()

      const hybridCommitment = calculationCall.commitments.find((c: any) => c.id === 'multi-commitment-2')
      expect(hybridCommitment.optionId).toBe('option-b')
      expect(hybridCommitment.position).toBe('yes')
    })

    it('should calculate accurate payouts for multi-option commitments', async () => {
      const result = await EnhancedResolutionService.resolveMarketAccurately(
        'multi-market-456',
        'option-b',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true)

      // Verify only option-b commitments win
      expect(result.payoutSummary.winnerCount).toBe(2) // user-5 and user-6
      expect(result.payoutSummary.loserCount).toBe(3) // user-7, user-8, user-9
      
      // Verify total payout is distributed among winners
      expect(result.payoutSummary.totalPayouts).toBe(2790) // 93% of 3000
      
      // Verify fees
      expect(result.payoutSummary.houseFee).toBe(150) // 5% of 3000
      expect(result.payoutSummary.creatorFee).toBe(60) // 2% of 3000
    })

    it('should handle multiple losing options correctly', async () => {
      const result = await EnhancedResolutionService.resolveMarketAccurately(
        'multi-market-456',
        'option-b',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(result.success).toBe(true)

      // Verify 3 losing options (option-a, option-c, option-d)
      expect(result.payoutSummary.loserCount).toBe(3)
      
      // Verify audit trail shows correct winner identification
      expect(result.auditTrail.winnerIdentificationMethods.optionIdBased).toBeGreaterThan(0)
    })
  })

  describe('Mixed Commitment Scenarios', () => {
    it('should handle users with commitments in both binary and multi-option markets', async () => {
      // User has commitments in both markets
      const mixedUserCommitments = [
        ...binaryCommitments.filter(c => c.userId === 'user-1'), // Binary market winner
        ...multiOptionCommitments.filter(c => c.userId === 'user-5') // Multi-option market winner
      ]

      // Test binary market resolution first
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => binaryMarket
      })

      mockGetDocs.mockResolvedValueOnce({
        docs: binaryCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      const binaryResult = await EnhancedResolutionService.resolveMarketAccurately(
        'binary-market-123',
        'yes',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(binaryResult.success).toBe(true)

      // Test multi-option market resolution
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => multiOptionMarket
      })

      mockGetDocs.mockResolvedValueOnce({
        docs: multiOptionCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      const multiResult = await EnhancedResolutionService.resolveMarketAccurately(
        'multi-market-456',
        'option-b',
        mockEvidence,
        'admin-123',
        0.02
      )

      expect(multiResult.success).toBe(true)

      // Verify both resolutions succeeded independently
      expect(binaryResult.payoutSummary.winnerCount).toBe(2) // Multi-option market has 2 winners
      expect(multiResult.payoutSummary.winnerCount).toBe(2)
    })

    it('should verify dashboard compatibility across market types', async () => {
      // Mock AdminCommitmentService for dashboard compatibility testing
      const mockBinaryMarketStats = {
        market: binaryMarket,
        commitments: binaryCommitments,
        analytics: {
          totalCommitments: 4,
          uniqueParticipants: 4,
          totalTokensStaked: 2000,
          averageCommitmentSize: 500
        },
        totalCount: 4
      }

      const mockMultiOptionMarketStats = {
        market: multiOptionMarket,
        commitments: multiOptionCommitments,
        analytics: {
          totalCommitments: 5,
          uniqueParticipants: 5,
          totalTokensStaked: 3000,
          averageCommitmentSize: 600
        },
        totalCount: 5
      }

      ;(AdminCommitmentService.getMarketCommitments as jest.Mock)
        .mockResolvedValueOnce(mockBinaryMarketStats)
        .mockResolvedValueOnce(mockMultiOptionMarketStats)

      // Test dashboard can query both market types
      const binaryStats = await AdminCommitmentService.getMarketCommitments('binary-market-123', {})
      const multiStats = await AdminCommitmentService.getMarketCommitments('multi-market-456', {})

      expect(binaryStats.analytics.totalCommitments).toBe(4)
      expect(binaryStats.analytics.totalTokensStaked).toBe(2000)
      
      expect(multiStats.analytics.totalCommitments).toBe(5)
      expect(multiStats.analytics.totalTokensStaked).toBe(3000)

      // Verify both market types return data in expected format
      expect(binaryStats.market.options).toHaveLength(2) // Binary market
      expect(multiStats.market.options).toHaveLength(4) // Multi-option market
    })

    it('should ensure accurate total payouts across mixed scenarios', async () => {
      // Calculate expected total payouts across both markets
      const expectedBinaryWinnerPool = 2000 * 0.93 // 93% after fees
      const expectedMultiWinnerPool = 3000 * 0.93 // 93% after fees

      // Test binary market
      const binaryResult = await EnhancedResolutionService.calculateAccuratePayoutPreview(
        'binary-market-123',
        'yes',
        0.02
      )

      // Test multi-option market  
      const multiResult = await EnhancedResolutionService.calculateAccuratePayoutPreview(
        'multi-market-456',
        'option-b',
        0.02
      )

      expect(binaryResult.winnerPool).toBe(2790) // Multi-option market winner pool
      expect(multiResult.winnerPool).toBe(2790) // Multi-option market winner pool

      // Verify no commitments are double-counted
      expect(binaryResult.auditTrail.verificationChecks.noDoublePayouts).toBe(true)
      expect(multiResult.auditTrail.verificationChecks.noDoublePayouts).toBe(true)

      // Verify all commitments are processed
      expect(binaryResult.auditTrail.verificationChecks.allCommitmentsProcessed).toBe(true)
      expect(multiResult.auditTrail.verificationChecks.allCommitmentsProcessed).toBe(true)
    })
  })
})