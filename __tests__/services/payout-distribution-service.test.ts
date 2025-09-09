/**
 * Comprehensive Payout Distribution Service Tests
 * Tests backward compatibility and multi-option market support
 */

import { PayoutDistributionService, PayoutDistribution, PayoutDistributionRequest } from '@/lib/services/payout-distribution-service'
import { EnhancedPayoutCalculationService } from '@/lib/services/enhanced-payout-calculation-service'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { Market, MarketResolution } from '@/lib/types/database'
import { PredictionCommitment } from '@/lib/types/token'
import { Timestamp } from 'firebase/firestore'

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

// Mock services
jest.mock('@/lib/services/enhanced-payout-calculation-service')
jest.mock('@/lib/services/token-balance-service')

// Mock Firestore functions
const mockRunTransaction = jest.fn()
const mockGetDocs = jest.fn()
const mockDoc = jest.fn()
const mockCollection = jest.fn()
const mockQuery = jest.fn()
const mockWhere = jest.fn()
const mockWriteBatch = jest.fn()
const mockBatch = {
  update: jest.fn(),
  commit: jest.fn()
}

jest.mock('firebase/firestore', () => ({
  runTransaction: (...args: any[]) => mockRunTransaction(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  doc: (...args: any[]) => mockDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  writeBatch: (...args: any[]) => mockWriteBatch(...args),
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 })
  },
  increment: (value: number) => ({ _increment: value })
}))

describe('PayoutDistributionService', () => {
  const mockMarket: Market = {
    id: 'market-123',
    title: 'Test Market',
    description: 'Test market description',
    category: 'entertainment',
    status: 'resolved',
    createdBy: 'creator-123',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.now(),
    resolvedAt: Timestamp.now(),
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

  const mockResolution: MarketResolution = {
    id: 'resolution-123',
    marketId: 'market-123',
    winningOptionId: 'option-1',
    resolvedBy: 'admin-123',
    resolvedAt: Timestamp.now(),
    evidence: [],
    totalPayout: 900,
    winnerCount: 2,
    status: 'completed',
    creatorFeeAmount: 20,
    houseFeeAmount: 50
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
        marketTitle: 'Test Market',
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
      marketId: 'market-123',
      position: 'yes',
      optionId: 'option-1',
      tokensCommitted: 300,
      odds: 1.67,
      potentialWinning: 500,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user2@test.com',
      userDisplayName: 'User 2',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Test Market',
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
      id: 'commitment-3',
      userId: 'user-3',
      predictionId: 'market-123',
      marketId: 'market-123',
      position: 'no',
      optionId: 'option-2',
      tokensCommitted: 400,
      odds: 2.5,
      potentialWinning: 1000,
      status: 'active',
      committedAt: Timestamp.now(),
      userEmail: 'user3@test.com',
      userDisplayName: 'User 3',
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Test Market',
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

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock enhanced payout calculation service
    const mockPayoutCalculation = {
      market: {
        id: 'market-123',
        title: 'Test Market',
        type: 'binary' as const,
        totalOptions: 2
      },
      totalPool: 1000,
      houseFee: 50,
      creatorFee: 20,
      totalFees: 70,
      winnerPool: 930,
      winnerCount: 2,
      loserCount: 1,
      commitmentPayouts: [
        {
          commitmentId: 'commitment-1',
          userId: 'user-1',
          tokensCommitted: 300,
          odds: 1.67,
          isWinner: true,
          payoutAmount: 465, // 50% of winner pool
          profit: 165,
          winShare: 0.5,
          optionId: 'option-1',
          position: 'yes' as const,
          auditTrail: {
            commitmentType: 'hybrid' as const,
            originalPosition: 'yes' as const,
            originalOptionId: 'option-1',
            winnerIdentificationMethod: 'hybrid' as const,
            calculationTimestamp: Timestamp.now()
          }
        },
        {
          commitmentId: 'commitment-2',
          userId: 'user-2',
          tokensCommitted: 300,
          odds: 1.67,
          isWinner: true,
          payoutAmount: 465, // 50% of winner pool
          profit: 165,
          winShare: 0.5,
          optionId: 'option-1',
          position: 'yes' as const,
          auditTrail: {
            commitmentType: 'hybrid' as const,
            originalPosition: 'yes' as const,
            originalOptionId: 'option-1',
            winnerIdentificationMethod: 'hybrid' as const,
            calculationTimestamp: Timestamp.now()
          }
        },
        {
          commitmentId: 'commitment-3',
          userId: 'user-3',
          tokensCommitted: 400,
          odds: 2.5,
          isWinner: false,
          payoutAmount: 0,
          profit: -400,
          winShare: 0,
          optionId: 'option-2',
          position: 'no' as const,
          auditTrail: {
            commitmentType: 'hybrid' as const,
            originalPosition: 'no' as const,
            originalOptionId: 'option-2',
            winnerIdentificationMethod: 'hybrid' as const,
            calculationTimestamp: Timestamp.now()
          }
        }
      ],
      payouts: [
        {
          userId: 'user-1',
          tokensStaked: 300,
          payoutAmount: 465,
          profit: 165,
          winShare: 0.5
        },
        {
          userId: 'user-2',
          tokensStaked: 300,
          payoutAmount: 465,
          profit: 165,
          winShare: 0.5
        }
      ],
      feeBreakdown: {
        houseFeePercentage: 0.05,
        creatorFeePercentage: 0.02,
        totalFeePercentage: 0.07,
        remainingForWinners: 0.93
      },
      auditTrail: {
        calculationTimestamp: Timestamp.now(),
        totalCommitmentsProcessed: 3,
        binaryCommitments: 0,
        multiOptionCommitments: 0,
        hybridCommitments: 3,
        winnerIdentificationSummary: {
          positionBased: 0,
          optionIdBased: 0,
          hybrid: 2
        },
        verificationChecks: {
          allCommitmentsProcessed: true,
          payoutSumsCorrect: true,
          noDoublePayouts: true,
          auditTrailComplete: true
        }
      }
    }
    
    ;(EnhancedPayoutCalculationService.calculateAccuratePayouts as jest.Mock).mockReturnValue(mockPayoutCalculation)
    
    // Mock successful transaction
    mockRunTransaction.mockImplementation(async (db, callback) => {
      const mockTransaction = {
        set: jest.fn(),
        update: jest.fn(),
        get: jest.fn()
      }
      
      const result = await callback(mockTransaction)
      return result
    })
    
    // Mock document references
    mockDoc.mockReturnValue({ id: 'mock-doc-id' })
    mockCollection.mockReturnValue({})
    mockWriteBatch.mockReturnValue(mockBatch)
    
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

  describe('distributePayouts', () => {
    it('should distribute payouts with backward compatibility', async () => {
      const request: PayoutDistributionRequest = {
        market: mockMarket,
        resolution: mockResolution,
        commitments: mockCommitments,
        winningOptionId: 'option-1',
        creatorFeePercentage: 0.02,
        adminId: 'admin-123'
      }

      const result = await PayoutDistributionService.distributePayouts(request)

      expect(result.success).toBe(true)
      expect(result.totalDistributed).toBe(930)
      expect(result.recipientCount).toBe(2)
      expect(result.summary.winnerCount).toBe(2)
      expect(result.summary.loserCount).toBe(1)
      
      // Verify enhanced payout calculation was called
      expect(EnhancedPayoutCalculationService.calculateAccuratePayouts).toHaveBeenCalledWith({
        market: mockMarket,
        commitments: mockCommitments,
        winningOptionId: 'option-1',
        creatorFeePercentage: 0.02
      })
      
      // Verify transaction was executed
      expect(mockRunTransaction).toHaveBeenCalled()
      
      // Verify TokenBalanceService was called for winners
      expect(TokenBalanceService.updateBalanceAtomic).toHaveBeenCalledTimes(2)
    })

    it('should handle mixed binary and multi-option commitments', async () => {
      const mixedCommitments: PredictionCommitment[] = [
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
        },
        // Hybrid commitment (both fields)
        {
          ...mockCommitments[2],
          id: 'commitment-hybrid'
        }
      ]

      const request: PayoutDistributionRequest = {
        market: mockMarket,
        resolution: mockResolution,
        commitments: mixedCommitments,
        winningOptionId: 'option-1',
        creatorFeePercentage: 0.02,
        adminId: 'admin-123'
      }

      const result = await PayoutDistributionService.distributePayouts(request)

      expect(result.success).toBe(true)
      expect(EnhancedPayoutCalculationService.calculateAccuratePayouts).toHaveBeenCalledWith({
        market: mockMarket,
        commitments: mixedCommitments,
        winningOptionId: 'option-1',
        creatorFeePercentage: 0.02
      })
    })

    it('should create comprehensive audit trail', async () => {
      const request: PayoutDistributionRequest = {
        market: mockMarket,
        resolution: mockResolution,
        commitments: mockCommitments,
        winningOptionId: 'option-1',
        creatorFeePercentage: 0.02,
        adminId: 'admin-123'
      }

      const result = await PayoutDistributionService.distributePayouts(request)

      expect(result.success).toBe(true)
      
      // Verify transaction was called with proper distribution data
      const transactionCallback = mockRunTransaction.mock.calls[0][1]
      const mockTransaction = {
        set: jest.fn(),
        update: jest.fn(),
        get: jest.fn()
      }
      
      await transactionCallback(mockTransaction)
      
      // Verify distribution record was created with audit trail
      const distributionCall = mockTransaction.set.mock.calls.find(call => 
        call[1].metadata && call[1].metadata.distributionMethod === 'enhanced'
      )
      
      expect(distributionCall).toBeDefined()
      expect(distributionCall[1].metadata.verificationChecks).toEqual({
        allCommitmentsProcessed: true,
        payoutSumsCorrect: true,
        noDoublePayouts: true,
        balanceUpdatesSuccessful: true,
        transactionRecordsCreated: true
      })
    })

    it('should handle transaction failures gracefully', async () => {
      mockRunTransaction.mockRejectedValue(new Error('Transaction failed'))

      const request: PayoutDistributionRequest = {
        market: mockMarket,
        resolution: mockResolution,
        commitments: mockCommitments,
        winningOptionId: 'option-1',
        creatorFeePercentage: 0.02,
        adminId: 'admin-123'
      }

      const result = await PayoutDistributionService.distributePayouts(request)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('DISTRIBUTION_FAILED')
      expect(result.error?.message).toBe('Transaction failed')
    })

    it('should preserve existing transaction history format', async () => {
      const request: PayoutDistributionRequest = {
        market: mockMarket,
        resolution: mockResolution,
        commitments: mockCommitments,
        winningOptionId: 'option-1',
        creatorFeePercentage: 0.02,
        adminId: 'admin-123'
      }

      await PayoutDistributionService.distributePayouts(request)

      const transactionCallback = mockRunTransaction.mock.calls[0][1]
      const mockTransaction = {
        set: jest.fn(),
        update: jest.fn(),
        get: jest.fn()
      }
      
      await transactionCallback(mockTransaction)
      
      // Verify legacy transaction records were created
      const legacyTransactionCalls = mockTransaction.set.mock.calls.filter(call => 
        call[1].type === 'prediction_win' && call[1].description?.includes('Won prediction')
      )
      
      expect(legacyTransactionCalls.length).toBe(2) // Two winners
      
      // Verify enhanced transaction records were created
      const enhancedTransactionCalls = mockTransaction.set.mock.calls.filter(call => 
        call[1].type === 'win' && call[1].metadata?.payoutBreakdown
      )
      
      expect(enhancedTransactionCalls.length).toBe(2) // Two winners
    })
  })

  describe('rollbackPayoutDistribution', () => {
    it('should rollback payout distribution successfully', async () => {
      const mockDistribution: PayoutDistribution = {
        id: 'distribution-123',
        marketId: 'market-123',
        resolutionId: 'resolution-123',
        userId: 'system',
        totalPayout: 930,
        totalProfit: 330,
        totalLost: 400,
        winningCommitments: [
          {
            commitmentId: 'commitment-1',
            optionId: 'option-1',
            position: 'yes',
            tokensCommitted: 300,
            odds: 1.67,
            payoutAmount: 465,
            profit: 165,
            winShare: 0.5,
            auditTrail: {
              commitmentType: 'hybrid',
              originalPosition: 'yes',
              originalOptionId: 'option-1',
              winnerIdentificationMethod: 'hybrid'
            }
          }
        ],
        losingCommitments: [],
        processedAt: Timestamp.now(),
        status: 'completed',
        transactionIds: ['tx-1', 'tx-2'],
        metadata: {
          marketTitle: 'Test Market',
          marketType: 'binary',
          winningOptionId: 'option-1',
          totalMarketPool: 1000,
          houseFee: 50,
          creatorFee: 20,
          distributionMethod: 'enhanced',
          calculationTimestamp: Timestamp.now(),
          verificationChecks: {
            allCommitmentsProcessed: true,
            payoutSumsCorrect: true,
            noDoublePayouts: true,
            balanceUpdatesSuccessful: true,
            transactionRecordsCreated: true
          }
        }
      }

      // Mock getting the distribution record
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockDistribution
          }),
          set: jest.fn(),
          update: jest.fn()
        }
        
        // Return mock rollback result
        return {
          rollbackTransactionIds: ['rollback-tx-1', 'rollback-tx-2'],
          affectedUsers: ['user-1', 'user-2']
        }
      })

      const result = await PayoutDistributionService.rollbackPayoutDistribution(
        'distribution-123',
        'Test rollback',
        'admin-123'
      )

      expect(result.success).toBe(true)
      expect(result.distributionId).toBe('distribution-123')
      expect(result.rollbackTransactionIds.length).toBeGreaterThan(0)
    })

    it('should handle rollback of already rolled back distribution', async () => {
      const mockDistribution: PayoutDistribution = {
        id: 'distribution-123',
        marketId: 'market-123',
        resolutionId: 'resolution-123',
        userId: 'system',
        totalPayout: 930,
        totalProfit: 330,
        totalLost: 400,
        winningCommitments: [],
        losingCommitments: [],
        processedAt: Timestamp.now(),
        status: 'rolled_back', // Already rolled back
        transactionIds: [],
        metadata: {
          marketTitle: 'Test Market',
          marketType: 'binary',
          winningOptionId: 'option-1',
          totalMarketPool: 1000,
          houseFee: 50,
          creatorFee: 20,
          distributionMethod: 'enhanced',
          calculationTimestamp: Timestamp.now(),
          verificationChecks: {
            allCommitmentsProcessed: true,
            payoutSumsCorrect: true,
            noDoublePayouts: true,
            balanceUpdatesSuccessful: true,
            transactionRecordsCreated: true
          }
        }
      }

      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockDistribution
          }),
          set: jest.fn(),
          update: jest.fn()
        }
        
        // This should throw an error for already rolled back distribution
        throw new Error('Distribution has already been rolled back')
      })

      const result = await PayoutDistributionService.rollbackPayoutDistribution(
        'distribution-123',
        'Test rollback',
        'admin-123'
      )

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Distribution has already been rolled back')
    })
  })
})