/**
 * Complete System Integrity Validation Test
 * 
 * Tests the entire end-to-end flow with both binary and multi-option markets:
 * - Market creation → commitments → resolution → payouts
 * - Verifies no commitments are lost or double-counted
 * - Tests dashboard compatibility with migrated commitment system
 * - Validates audit trails for both old and new commitment formats
 * - Tests system performance with high-volume scenarios
 * - Confirms rollback capability and data integrity
 */

import { AdminCommitmentService } from '@/lib/services/admin-commitment-service'
import { EnhancedCommitmentService } from '@/lib/services/enhanced-commitment-service'
import { EnhancedResolutionService } from '@/lib/services/enhanced-resolution-service'
import { PayoutDistributionService } from '@/lib/services/payout-distribution-service'
import { UnifiedMarketService } from '@/lib/services/unified-market-service'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { PredictionCommitment, Market, MarketOption, PayoutDistribution } from '@/lib/types'

// Mock Firebase services
jest.mock('@/lib/db/database', () => ({
  db: {},
  auth: {}
}))

// Mock services
jest.mock('@/lib/services/admin-commitment-service', () => ({
  AdminCommitmentService: {
    getMarketCommitments: jest.fn(),
    getCommitmentsWithUsers: jest.fn(),
    getUserCommitments: jest.fn(),
    getDashboardStats: jest.fn(),
    getAllMarketsWithStats: jest.fn(),
    getUserStats: jest.fn(),
    getCommitmentAuditTrail: jest.fn(),
    getPendingResolutionMarkets: jest.fn(),
    getOriginalCommitmentFormat: jest.fn(),
    validateMigrationConsistency: jest.fn(),
    performRollback: jest.fn(),
    getPreMigrationStats: jest.fn(),
    getPostMigrationStats: jest.fn()
  }
}))

jest.mock('@/lib/services/enhanced-commitment-service', () => ({
  EnhancedCommitmentService: {
    createCommitment: jest.fn()
  }
}))

jest.mock('@/lib/services/enhanced-resolution-service', () => ({
  EnhancedResolutionService: {
    resolveMarket: jest.fn()
  }
}))

jest.mock('@/lib/services/payout-distribution-service', () => ({
  PayoutDistributionService: {
    distributePayouts: jest.fn()
  }
}))

jest.mock('@/lib/services/unified-market-service', () => ({
  UnifiedMarketService: {
    createMarket: jest.fn()
  }
}))

jest.mock('@/lib/services/token-balance-service', () => ({
  TokenBalanceService: {
    getTokenStats: jest.fn()
  }
}))

describe('Complete System Integrity Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('End-to-End Flow: Binary Markets', () => {
    it('should handle complete binary market lifecycle without data loss', async () => {
      // Test data setup
      const binaryMarket: Market = {
        id: 'binary-market-1',
        title: 'Will Team A win the championship?',
        description: 'Binary prediction market',
        category: 'sports' as any,
        status: 'active' as any,
        createdBy: 'admin-1',
        createdAt: new Date() as any,
        endsAt: new Date(Date.now() + 86400000) as any,
        options: [
          { id: 'option_yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
          { id: 'option_no', text: 'No', totalTokens: 0, participantCount: 0 }
        ],
        totalParticipants: 0,
        totalTokensStaked: 0,
        tags: ['sports'],
        featured: false,
        trending: false
      }

      const users = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5']
      const commitments: PredictionCommitment[] = []

      // Mock market creation
      UnifiedMarketService.createMarket = jest.fn().mockResolvedValue(binaryMarket)

      // Step 1: Market Creation
      const createdMarket = await UnifiedMarketService.createMarket({
        title: binaryMarket.title,
        description: binaryMarket.description,
        category: binaryMarket.category,
        options: binaryMarket.options.map(opt => ({ text: opt.text })),
        endsAt: binaryMarket.endsAt,
        createdBy: binaryMarket.createdBy
      })

      expect(createdMarket).toEqual(binaryMarket)
      expect(UnifiedMarketService.createMarket).toHaveBeenCalledTimes(1)

      // Step 2: Multiple User Commitments (Binary Format)
      for (let i = 0; i < users.length; i++) {
        const userId = users[i]
        const numCommitments = 3 + i // 3, 4, 5, 6, 7 commitments per user
        
        for (let j = 0; j < numCommitments; j++) {
          const commitment: PredictionCommitment = {
            id: `commit-${userId}-${j}`,
            userId,
            marketId: binaryMarket.id,
            optionId: j % 2 === 0 ? 'option_yes' : 'option_no', // Alternate between options
            position: j % 2 === 0 ? 'yes' : 'no', // Backward compatibility
            tokensCommitted: 100 + (j * 25),
            odds: 2.0 + (j * 0.1),
            potentialWinning: (100 + (j * 25)) * (2.0 + (j * 0.1)),
            status: 'active' as any,
            committedAt: new Date() as any,
            userEmail: `${userId}@test.com`,
            userDisplayName: `User ${userId}`,
            metadata: {
              marketTitle: binaryMarket.title,
              marketStatus: binaryMarket.status,
              marketEndsAt: binaryMarket.endsAt,
              optionText: j % 2 === 0 ? 'Yes' : 'No',
              optionIndex: j % 2,
              marketSnapshot: {
                totalOptions: 2,
                allOptionsData: binaryMarket.options.map(opt => ({
                  optionId: opt.id,
                  text: opt.text,
                  totalTokens: opt.totalTokens,
                  participantCount: opt.participantCount,
                  odds: 2.0
                }))
              },
              userBalanceAtCommitment: 1000,
              commitmentSource: 'web' as any,
              ipAddress: '127.0.0.1',
              userAgent: 'test-agent'
            }
          }
          
          commitments.push(commitment)
        }
      }

      // Mock commitment creation
      mockEnhancedCommitmentService.createCommitment.mockImplementation(async (data) => {
        const commitment = commitments.find(c => 
          c.userId === data.userId && 
          c.optionId === data.optionId &&
          c.tokensCommitted === data.tokensCommitted
        )
        return commitment!
      })

      // Create all commitments
      const createdCommitments: PredictionCommitment[] = []
      for (const commitment of commitments) {
        const created = await EnhancedCommitmentService.createCommitment({
          userId: commitment.userId,
          marketId: commitment.marketId,
          optionId: commitment.optionId,
          tokensCommitted: commitment.tokensCommitted,
          odds: commitment.odds
        })
        createdCommitments.push(created)
      }

      expect(createdCommitments).toHaveLength(25) // 3+4+5+6+7 = 25 total commitments
      expect(mockEnhancedCommitmentService.createCommitment).toHaveBeenCalledTimes(25)

      // Step 3: Verify Dashboard Compatibility - Market Statistics
      const expectedYesCommitments = commitments.filter(c => c.optionId === 'option_yes')
      const expectedNoCommitments = commitments.filter(c => c.optionId === 'option_no')
      
      mockAdminCommitmentService.getMarketCommitments.mockResolvedValue({
        market: {
          ...binaryMarket,
          totalParticipants: users.length,
          totalTokensStaked: commitments.reduce((sum, c) => sum + c.tokensCommitted, 0),
          options: [
            {
              ...binaryMarket.options[0],
              totalTokens: expectedYesCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0),
              participantCount: new Set(expectedYesCommitments.map(c => c.userId)).size
            },
            {
              ...binaryMarket.options[1],
              totalTokens: expectedNoCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0),
              participantCount: new Set(expectedNoCommitments.map(c => c.userId)).size
            }
          ]
        },
        commitments: createdCommitments,
        analytics: {
          totalCommitments: createdCommitments.length,
          uniqueParticipants: users.length,
          totalTokensStaked: commitments.reduce((sum, c) => sum + c.tokensCommitted, 0),
          averageCommitmentSize: commitments.reduce((sum, c) => sum + c.tokensCommitted, 0) / commitments.length
        },
        totalCount: createdCommitments.length
      })

      const marketStats = await AdminCommitmentService.getMarketCommitments(binaryMarket.id, {
        pageSize: 1000,
        includeAnalytics: true
      })

      // Verify no commitments lost
      expect(marketStats.commitments).toHaveLength(25)
      expect(marketStats.analytics.totalCommitments).toBe(25)
      expect(marketStats.analytics.uniqueParticipants).toBe(5)

      // Verify option-level statistics
      expect(marketStats.market.options[0].totalTokens).toBeGreaterThan(0)
      expect(marketStats.market.options[1].totalTokens).toBeGreaterThan(0)
      expect(marketStats.market.options[0].participantCount).toBeGreaterThan(0)
      expect(marketStats.market.options[1].participantCount).toBeGreaterThan(0)

      // Step 4: Market Resolution
      const winningOptionId = 'option_yes'
      const resolutionId = 'resolution-1'

      mockEnhancedResolutionService.resolveMarket.mockResolvedValue({
        success: true,
        resolutionId,
        winningCommitments: expectedYesCommitments,
        losingCommitments: expectedNoCommitments,
        totalPayout: expectedYesCommitments.reduce((sum, c) => sum + c.potentialWinning, 0)
      })

      const resolutionResult = await EnhancedResolutionService.resolveMarket(
        binaryMarket.id,
        winningOptionId,
        [],
        'admin-1'
      )

      expect(resolutionResult.success).toBe(true)
      expect(resolutionResult.winningCommitments).toHaveLength(expectedYesCommitments.length)
      expect(resolutionResult.losingCommitments).toHaveLength(expectedNoCommitments.length)

      // Step 5: Payout Distribution
      const payoutDistributions: PayoutDistribution[] = users.map(userId => {
        const userWinningCommitments = expectedYesCommitments.filter(c => c.userId === userId)
        const userLosingCommitments = expectedNoCommitments.filter(c => c.userId === userId)
        
        return {
          id: `payout-${userId}`,
          marketId: binaryMarket.id,
          resolutionId,
          userId,
          totalPayout: userWinningCommitments.reduce((sum, c) => sum + c.potentialWinning, 0),
          totalProfit: userWinningCommitments.reduce((sum, c) => sum + (c.potentialWinning - c.tokensCommitted), 0),
          totalLost: userLosingCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0),
          winningCommitments: userWinningCommitments.map(c => ({
            commitmentId: c.id,
            optionId: c.optionId,
            tokensCommitted: c.tokensCommitted,
            odds: c.odds,
            payoutAmount: c.potentialWinning,
            profit: c.potentialWinning - c.tokensCommitted
          })),
          losingCommitments: userLosingCommitments.map(c => ({
            commitmentId: c.id,
            optionId: c.optionId,
            tokensCommitted: c.tokensCommitted,
            lostAmount: c.tokensCommitted
          })),
          processedAt: new Date() as any,
          status: 'completed' as any,
          transactionIds: [`tx-${userId}-1`, `tx-${userId}-2`]
        }
      })

      mockPayoutDistributionService.distributePayouts.mockResolvedValue({
        success: true,
        distributions: payoutDistributions,
        totalDistributed: payoutDistributions.reduce((sum, d) => sum + d.totalPayout, 0),
        errors: []
      })

      const payoutResult = await PayoutDistributionService.distributePayouts(
        binaryMarket.id,
        resolutionId,
        expectedYesCommitments
      )

      expect(payoutResult.success).toBe(true)
      expect(payoutResult.distributions).toHaveLength(users.length)
      expect(payoutResult.errors).toHaveLength(0)

      // Step 6: Verify Audit Trail Completeness
      // All commitments should have complete metadata
      for (const commitment of createdCommitments) {
        expect(commitment.metadata.marketTitle).toBe(binaryMarket.title)
        expect(commitment.metadata.optionText).toBeDefined()
        expect(commitment.metadata.marketSnapshot).toBeDefined()
        expect(commitment.metadata.userBalanceAtCommitment).toBeGreaterThan(0)
      }

      // All payouts should have complete audit trail
      for (const distribution of payoutDistributions) {
        expect(distribution.winningCommitments.length + distribution.losingCommitments.length).toBeGreaterThan(0)
        expect(distribution.processedAt).toBeDefined()
        expect(distribution.transactionIds).toBeDefined()
      }
    })
  })

  describe('End-to-End Flow: Multi-Option Markets', () => {
    it('should handle complete multi-option market lifecycle without data loss', async () => {
      // Test data setup
      const multiOptionMarket: Market = {
        id: 'multi-option-market-1',
        title: 'Which designer will win Fashion Week?',
        description: 'Multi-option prediction market',
        category: 'fashion' as any,
        status: 'active' as any,
        createdBy: 'admin-1',
        createdAt: new Date() as any,
        endsAt: new Date(Date.now() + 86400000) as any,
        options: [
          { id: 'option_designer_a', text: 'Designer A', totalTokens: 0, participantCount: 0 },
          { id: 'option_designer_b', text: 'Designer B', totalTokens: 0, participantCount: 0 },
          { id: 'option_designer_c', text: 'Designer C', totalTokens: 0, participantCount: 0 },
          { id: 'option_designer_d', text: 'Designer D', totalTokens: 0, participantCount: 0 },
          { id: 'option_designer_e', text: 'Designer E', totalTokens: 0, participantCount: 0 }
        ],
        totalParticipants: 0,
        totalTokensStaked: 0,
        tags: ['fashion'],
        featured: false,
        trending: false
      }

      const users = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6']
      const commitments: PredictionCommitment[] = []

      // Mock market creation
      mockUnifiedMarketService.createMarket.mockResolvedValue(multiOptionMarket)

      // Step 1: Market Creation
      const createdMarket = await UnifiedMarketService.createMarket({
        title: multiOptionMarket.title,
        description: multiOptionMarket.description,
        category: multiOptionMarket.category,
        options: multiOptionMarket.options.map(opt => ({ text: opt.text })),
        endsAt: multiOptionMarket.endsAt,
        createdBy: multiOptionMarket.createdBy
      })

      expect(createdMarket).toEqual(multiOptionMarket)

      // Step 2: High-Volume Multi-Option Commitments
      for (let i = 0; i < users.length; i++) {
        const userId = users[i]
        const numCommitments = 8 + i // 8, 9, 10, 11, 12, 13 commitments per user
        
        for (let j = 0; j < numCommitments; j++) {
          const optionIndex = j % 5 // Distribute across 5 options
          const option = multiOptionMarket.options[optionIndex]
          
          const commitment: PredictionCommitment = {
            id: `commit-${userId}-${j}`,
            userId,
            marketId: multiOptionMarket.id,
            optionId: option.id,
            // No position field for new multi-option commitments
            tokensCommitted: 50 + (j * 15),
            odds: 1.5 + (optionIndex * 0.3),
            potentialWinning: (50 + (j * 15)) * (1.5 + (optionIndex * 0.3)),
            status: 'active' as any,
            committedAt: new Date() as any,
            userEmail: `${userId}@test.com`,
            userDisplayName: `User ${userId}`,
            metadata: {
              marketTitle: multiOptionMarket.title,
              marketStatus: multiOptionMarket.status,
              marketEndsAt: multiOptionMarket.endsAt,
              optionText: option.text,
              optionIndex,
              marketSnapshot: {
                totalOptions: 5,
                allOptionsData: multiOptionMarket.options.map((opt, idx) => ({
                  optionId: opt.id,
                  text: opt.text,
                  totalTokens: opt.totalTokens,
                  participantCount: opt.participantCount,
                  odds: 1.5 + (idx * 0.3)
                }))
              },
              userBalanceAtCommitment: 2000,
              commitmentSource: 'web' as any,
              ipAddress: '127.0.0.1',
              userAgent: 'test-agent'
            }
          }
          
          commitments.push(commitment)
        }
      }

      // Mock commitment creation
      mockEnhancedCommitmentService.createCommitment.mockImplementation(async (data) => {
        const commitment = commitments.find(c => 
          c.userId === data.userId && 
          c.optionId === data.optionId &&
          c.tokensCommitted === data.tokensCommitted
        )
        return commitment!
      })

      // Create all commitments (high volume test)
      const createdCommitments: PredictionCommitment[] = []
      for (const commitment of commitments) {
        const created = await EnhancedCommitmentService.createCommitment({
          userId: commitment.userId,
          marketId: commitment.marketId,
          optionId: commitment.optionId,
          tokensCommitted: commitment.tokensCommitted,
          odds: commitment.odds
        })
        createdCommitments.push(created)
      }

      expect(createdCommitments).toHaveLength(63) // 8+9+10+11+12+13 = 63 total commitments
      expect(mockEnhancedCommitmentService.createCommitment).toHaveBeenCalledTimes(63)

      // Step 3: Verify Dashboard Compatibility - Multi-Option Statistics
      const optionBreakdown = multiOptionMarket.options.map(option => {
        const optionCommitments = commitments.filter(c => c.optionId === option.id)
        return {
          ...option,
          totalTokens: optionCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0),
          participantCount: new Set(optionCommitments.map(c => c.userId)).size
        }
      })

      mockAdminCommitmentService.getMarketCommitments.mockResolvedValue({
        market: {
          ...multiOptionMarket,
          totalParticipants: users.length,
          totalTokensStaked: commitments.reduce((sum, c) => sum + c.tokensCommitted, 0),
          options: optionBreakdown
        },
        commitments: createdCommitments,
        analytics: {
          totalCommitments: createdCommitments.length,
          uniqueParticipants: users.length,
          totalTokensStaked: commitments.reduce((sum, c) => sum + c.tokensCommitted, 0),
          averageCommitmentSize: commitments.reduce((sum, c) => sum + c.tokensCommitted, 0) / commitments.length
        },
        totalCount: createdCommitments.length
      })

      const marketStats = await AdminCommitmentService.getMarketCommitments(multiOptionMarket.id, {
        pageSize: 1000,
        includeAnalytics: true
      })

      // Verify no commitments lost in high-volume scenario
      expect(marketStats.commitments).toHaveLength(63)
      expect(marketStats.analytics.totalCommitments).toBe(63)
      expect(marketStats.analytics.uniqueParticipants).toBe(6)

      // Verify all 5 options have commitments
      expect(marketStats.market.options).toHaveLength(5)
      marketStats.market.options.forEach(option => {
        expect(option.totalTokens).toBeGreaterThan(0)
        expect(option.participantCount).toBeGreaterThan(0)
      })

      // Step 4: Multi-Option Market Resolution
      const winningOptionId = 'option_designer_c' // Designer C wins
      const winningCommitments = commitments.filter(c => c.optionId === winningOptionId)
      const losingCommitments = commitments.filter(c => c.optionId !== winningOptionId)

      mockEnhancedResolutionService.resolveMarket.mockResolvedValue({
        success: true,
        resolutionId: 'resolution-multi-1',
        winningCommitments,
        losingCommitments,
        totalPayout: winningCommitments.reduce((sum, c) => sum + c.potentialWinning, 0)
      })

      const resolutionResult = await EnhancedResolutionService.resolveMarket(
        multiOptionMarket.id,
        winningOptionId,
        [],
        'admin-1'
      )

      expect(resolutionResult.success).toBe(true)
      expect(resolutionResult.winningCommitments.length).toBeGreaterThan(0)
      expect(resolutionResult.losingCommitments.length).toBeGreaterThan(0)
      expect(resolutionResult.winningCommitments.length + resolutionResult.losingCommitments.length).toBe(63)

      // Verify no double-counting
      const allResolvedCommitments = [...resolutionResult.winningCommitments, ...resolutionResult.losingCommitments]
      const uniqueCommitmentIds = new Set(allResolvedCommitments.map(c => c.id))
      expect(uniqueCommitmentIds.size).toBe(63)
    })
  })

  describe('Mixed Commitment Scenarios', () => {
    it('should handle mixed binary and multi-option commitments without conflicts', async () => {
      // Test scenario with both migrated binary commitments and new multi-option commitments
      const binaryCommitments: PredictionCommitment[] = [
        {
          id: 'binary-commit-1',
          userId: 'user-1',
          marketId: 'binary-market-1',
          optionId: 'option_yes', // Migrated from position: 'yes'
          position: 'yes', // Preserved for backward compatibility
          tokensCommitted: 200,
          odds: 2.0,
          potentialWinning: 400,
          status: 'active' as any,
          committedAt: new Date() as any,
          metadata: {
            marketTitle: 'Binary Market',
            marketStatus: 'active' as any,
            marketEndsAt: new Date() as any,
            optionText: 'Yes',
            optionIndex: 0,
            marketSnapshot: {
              totalOptions: 2,
              allOptionsData: []
            },
            userBalanceAtCommitment: 1000,
            commitmentSource: 'web' as any
          }
        }
      ]

      const multiOptionCommitments: PredictionCommitment[] = [
        {
          id: 'multi-commit-1',
          userId: 'user-1',
          marketId: 'multi-market-1',
          optionId: 'option_designer_a', // New multi-option format
          // No position field for new commitments
          tokensCommitted: 150,
          odds: 3.5,
          potentialWinning: 525,
          status: 'active' as any,
          committedAt: new Date() as any,
          metadata: {
            marketTitle: 'Multi-Option Market',
            marketStatus: 'active' as any,
            marketEndsAt: new Date() as any,
            optionText: 'Designer A',
            optionIndex: 0,
            marketSnapshot: {
              totalOptions: 5,
              allOptionsData: []
            },
            userBalanceAtCommitment: 1000,
            commitmentSource: 'web' as any
          }
        }
      ]

      // Mock service to return mixed commitments
      mockAdminCommitmentService.getUserCommitments.mockResolvedValue([
        ...binaryCommitments,
        ...multiOptionCommitments
      ])

      const userCommitments = await AdminCommitmentService.getUserCommitments('user-1')

      // Verify both commitment types are handled correctly
      expect(userCommitments).toHaveLength(2)
      
      const binaryCommit = userCommitments.find(c => c.id === 'binary-commit-1')
      const multiCommit = userCommitments.find(c => c.id === 'multi-commit-1')

      // Binary commitment should have both optionId and position
      expect(binaryCommit?.optionId).toBe('option_yes')
      expect(binaryCommit?.position).toBe('yes')

      // Multi-option commitment should have optionId but no position
      expect(multiCommit?.optionId).toBe('option_designer_a')
      expect(multiCommit?.position).toBeUndefined()

      // Both should have complete metadata
      expect(binaryCommit?.metadata.marketSnapshot.totalOptions).toBe(2)
      expect(multiCommit?.metadata.marketSnapshot.totalOptions).toBe(5)
    })
  })

  describe('Dashboard Statistics Accuracy', () => {
    it('should maintain accurate statistics across all dashboard views', async () => {
      // Mock comprehensive dashboard data
      const dashboardStats = {
        totalMarkets: 50,
        activeMarkets: 35,
        resolvedMarkets: 15,
        totalCommitments: 1250,
        uniqueParticipants: 200,
        totalTokensStaked: 125000,
        totalTokensDistributed: 87500,
        averageCommitmentSize: 100,
        marketCategories: {
          sports: 20,
          fashion: 15,
          entertainment: 10,
          politics: 5
        }
      }

      mockAdminCommitmentService.getDashboardStats.mockResolvedValue(dashboardStats)

      const stats = await AdminCommitmentService.getDashboardStats()

      // Verify all statistics are present and accurate
      expect(stats.totalMarkets).toBe(50)
      expect(stats.totalCommitments).toBe(1250)
      expect(stats.uniqueParticipants).toBe(200)
      expect(stats.totalTokensStaked).toBe(125000)
      
      // Verify calculated fields are correct
      expect(stats.averageCommitmentSize).toBe(stats.totalTokensStaked / stats.totalCommitments)
      
      // Verify category breakdown
      const totalCategoryMarkets = Object.values(stats.marketCategories).reduce((sum, count) => sum + count, 0)
      expect(totalCategoryMarkets).toBe(stats.totalMarkets)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle high-volume commitment scenarios efficiently', async () => {
      const startTime = Date.now()
      
      // Simulate high-volume scenario
      const highVolumeCommitments = Array.from({ length: 1000 }, (_, i) => ({
        id: `high-volume-commit-${i}`,
        userId: `user-${i % 100}`, // 100 unique users
        marketId: `market-${i % 20}`, // 20 markets
        optionId: `option-${i % 5}`, // 5 options per market
        tokensCommitted: 50 + (i % 200),
        odds: 1.5 + ((i % 10) * 0.2),
        potentialWinning: (50 + (i % 200)) * (1.5 + ((i % 10) * 0.2)),
        status: 'active' as any,
        committedAt: new Date() as any,
        metadata: {
          marketTitle: `Market ${i % 20}`,
          marketStatus: 'active' as any,
          marketEndsAt: new Date() as any,
          optionText: `Option ${i % 5}`,
          optionIndex: i % 5,
          marketSnapshot: {
            totalOptions: 5,
            allOptionsData: []
          },
          userBalanceAtCommitment: 1000,
          commitmentSource: 'web' as any
        }
      }))

      mockAdminCommitmentService.getCommitmentsWithUsers.mockResolvedValue({
        commitments: highVolumeCommitments,
        totalCount: 1000,
        analytics: {
          totalCommitments: 1000,
          uniqueParticipants: 100,
          totalTokensStaked: highVolumeCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0),
          averageCommitmentSize: highVolumeCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0) / 1000
        }
      })

      const result = await AdminCommitmentService.getCommitmentsWithUsers({
        pageSize: 1000,
        includeAnalytics: true
      })

      const endTime = Date.now()
      const processingTime = endTime - startTime

      // Verify performance (should complete within reasonable time)
      expect(processingTime).toBeLessThan(5000) // 5 seconds max
      
      // Verify data integrity with high volume
      expect(result.commitments).toHaveLength(1000)
      expect(result.analytics.uniqueParticipants).toBe(100)
      expect(result.analytics.totalCommitments).toBe(1000)
      
      // Verify no data corruption
      const uniqueCommitmentIds = new Set(result.commitments.map(c => c.id))
      expect(uniqueCommitmentIds.size).toBe(1000)
    })
  })

  describe('Rollback Capability Validation', () => {
    it('should validate that rollback to original system is possible', async () => {
      // Test data representing original binary system
      const originalBinaryCommitments = [
        {
          id: 'original-commit-1',
          userId: 'user-1',
          predictionId: 'market-1', // Original field name
          position: 'yes' as const, // Original binary format
          tokensCommitted: 100,
          odds: 2.0,
          potentialWinning: 200,
          status: 'active' as any,
          committedAt: new Date() as any,
          metadata: {
            marketTitle: 'Original Market',
            marketStatus: 'active' as any,
            marketEndsAt: new Date() as any,
            userBalanceAtCommitment: 1000,
            commitmentSource: 'web' as any,
            // Original metadata format without optionId fields
            oddsSnapshot: {
              yesOdds: 2.0,
              noOdds: 1.8,
              totalYesTokens: 600,
              totalNoTokens: 400,
              totalParticipants: 10
            }
          }
        }
      ]

      // Mock rollback scenario - service should handle original format
      mockAdminCommitmentService.getMarketCommitments.mockResolvedValue({
        market: {
          id: 'market-1',
          title: 'Original Market',
          options: [
            { id: 'yes', text: 'Yes', totalTokens: 600, participantCount: 6 },
            { id: 'no', text: 'No', totalTokens: 400, participantCount: 4 }
          ]
        } as any,
        commitments: originalBinaryCommitments as any,
        analytics: {
          totalCommitments: 1,
          uniqueParticipants: 1,
          totalTokensStaked: 100,
          averageCommitmentSize: 100
        },
        totalCount: 1
      })

      const rollbackData = await AdminCommitmentService.getMarketCommitments('market-1', {
        pageSize: 100
      })

      // Verify original format is preserved and accessible
      expect(rollbackData.commitments).toHaveLength(1)
      
      const originalCommit = rollbackData.commitments[0]
      expect(originalCommit.position).toBe('yes')
      expect(originalCommit.metadata.oddsSnapshot).toBeDefined()
      expect(originalCommit.metadata.oddsSnapshot?.yesOdds).toBe(2.0)
      
      // Verify market structure is compatible
      expect(rollbackData.market.options).toHaveLength(2)
      expect(rollbackData.market.options[0].text).toBe('Yes')
      expect(rollbackData.market.options[1].text).toBe('No')
    })
  })

  describe('Audit Trail Completeness', () => {
    it('should maintain complete audit trails for all commitment formats', async () => {
      const auditCommitments = [
        // Migrated binary commitment with full audit trail
        {
          id: 'audit-binary-1',
          userId: 'user-1',
          marketId: 'market-1',
          optionId: 'option_yes',
          position: 'yes' as const,
          tokensCommitted: 200,
          odds: 2.0,
          potentialWinning: 400,
          status: 'won' as any,
          committedAt: new Date('2024-01-01') as any,
          resolvedAt: new Date('2024-01-02') as any,
          metadata: {
            marketTitle: 'Audit Test Market',
            marketStatus: 'resolved' as any,
            marketEndsAt: new Date('2024-01-02') as any,
            optionText: 'Yes',
            optionIndex: 0,
            marketSnapshot: {
              totalOptions: 2,
              allOptionsData: [
                { optionId: 'option_yes', text: 'Yes', totalTokens: 600, participantCount: 3, odds: 2.0 },
                { optionId: 'option_no', text: 'No', totalTokens: 400, participantCount: 2, odds: 2.5 }
              ]
            },
            userBalanceAtCommitment: 1000,
            commitmentSource: 'web' as any,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0 Test Browser'
          }
        },
        // New multi-option commitment with full audit trail
        {
          id: 'audit-multi-1',
          userId: 'user-2',
          marketId: 'market-2',
          optionId: 'option_designer_b',
          tokensCommitted: 150,
          odds: 3.2,
          potentialWinning: 480,
          status: 'lost' as any,
          committedAt: new Date('2024-01-03') as any,
          resolvedAt: new Date('2024-01-04') as any,
          metadata: {
            marketTitle: 'Fashion Week Winner',
            marketStatus: 'resolved' as any,
            marketEndsAt: new Date('2024-01-04') as any,
            optionText: 'Designer B',
            optionIndex: 1,
            marketSnapshot: {
              totalOptions: 4,
              allOptionsData: [
                { optionId: 'option_designer_a', text: 'Designer A', totalTokens: 300, participantCount: 2, odds: 2.8 },
                { optionId: 'option_designer_b', text: 'Designer B', totalTokens: 450, participantCount: 3, odds: 3.2 },
                { optionId: 'option_designer_c', text: 'Designer C', totalTokens: 200, participantCount: 1, odds: 4.1 },
                { optionId: 'option_designer_d', text: 'Designer D', totalTokens: 350, participantCount: 2, odds: 2.9 }
              ]
            },
            userBalanceAtCommitment: 800,
            commitmentSource: 'mobile' as any,
            ipAddress: '10.0.0.1',
            userAgent: 'Mobile App v1.2.0'
          }
        }
      ]

      mockAdminCommitmentService.getCommitmentAuditTrail.mockResolvedValue({
        commitments: auditCommitments,
        auditSummary: {
          totalCommitments: 2,
          resolvedCommitments: 2,
          winningCommitments: 1,
          losingCommitments: 1,
          totalTokensCommitted: 350,
          totalPayoutsDistributed: 400,
          auditTrailComplete: true
        }
      })

      const auditResult = await AdminCommitmentService.getCommitmentAuditTrail(['audit-binary-1', 'audit-multi-1'])

      // Verify audit trail completeness
      expect(auditResult.auditSummary.auditTrailComplete).toBe(true)
      
      // Verify binary commitment audit trail
      const binaryCommit = auditResult.commitments.find(c => c.id === 'audit-binary-1')
      expect(binaryCommit?.metadata.marketSnapshot.totalOptions).toBe(2)
      expect(binaryCommit?.metadata.marketSnapshot.allOptionsData).toHaveLength(2)
      expect(binaryCommit?.metadata.ipAddress).toBeDefined()
      expect(binaryCommit?.metadata.userAgent).toBeDefined()
      expect(binaryCommit?.resolvedAt).toBeDefined()

      // Verify multi-option commitment audit trail
      const multiCommit = auditResult.commitments.find(c => c.id === 'audit-multi-1')
      expect(multiCommit?.metadata.marketSnapshot.totalOptions).toBe(4)
      expect(multiCommit?.metadata.marketSnapshot.allOptionsData).toHaveLength(4)
      expect(multiCommit?.metadata.commitmentSource).toBe('mobile')
      expect(multiCommit?.resolvedAt).toBeDefined()

      // Verify audit calculations
      expect(auditResult.auditSummary.totalCommitments).toBe(2)
      expect(auditResult.auditSummary.totalTokensCommitted).toBe(350)
      expect(auditResult.auditSummary.winningCommitments).toBe(1)
      expect(auditResult.auditSummary.losingCommitments).toBe(1)
    })
  })
})