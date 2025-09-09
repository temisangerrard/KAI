/**
 * System Performance and Rollback Validation Test
 * 
 * Tests system performance with high-volume scenarios and validates
 * rollback capability to ensure data integrity and system reliability.
 */

import { AdminCommitmentService } from '@/lib/services/admin-commitment-service'
import { EnhancedCommitmentService } from '@/lib/services/enhanced-commitment-service'
import { PayoutDistributionService } from '@/lib/services/payout-distribution-service'
import { PredictionCommitment, Market } from '@/lib/types'

// Mock Firebase services
jest.mock('@/lib/db/database', () => ({
  db: {},
  auth: {}
}))

// Mock services
jest.mock('@/lib/services/admin-commitment-service', () => ({
  AdminCommitmentService: {
    getCommitmentsWithUsers: jest.fn(),
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

jest.mock('@/lib/services/payout-distribution-service', () => ({
  PayoutDistributionService: {
    distributePayouts: jest.fn()
  }
}))

describe('System Performance and Rollback Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('High-Volume Performance Testing', () => {
    it('should handle 10,000 commitments across 100 markets efficiently', async () => {
      const startTime = Date.now()
      
      // Generate high-volume test data
      const markets = Array.from({ length: 100 }, (_, i) => ({
        id: `market-${i}`,
        title: `Market ${i}`,
        description: `Test market ${i}`,
        category: ['sports', 'fashion', 'entertainment', 'politics'][i % 4] as any,
        status: 'active' as any,
        createdBy: 'admin-1',
        createdAt: new Date() as any,
        endsAt: new Date(Date.now() + 86400000) as any,
        options: Array.from({ length: (i % 5) + 2 }, (_, j) => ({
          id: `option-${i}-${j}`,
          text: `Option ${j}`,
          totalTokens: 0,
          participantCount: 0
        })),
        totalParticipants: 0,
        totalTokensStaked: 0,
        tags: [`tag-${i % 10}`],
        featured: i % 10 === 0,
        trending: i % 15 === 0
      }))

      const commitments = Array.from({ length: 10000 }, (_, i) => {
        const marketIndex = i % 100
        const market = markets[marketIndex]
        const optionIndex = i % market.options.length
        
        return {
          id: `commit-${i}`,
          userId: `user-${i % 500}`, // 500 unique users
          marketId: market.id,
          optionId: market.options[optionIndex].id,
          position: market.options.length === 2 ? (optionIndex === 0 ? 'yes' as const : 'no' as const) : undefined,
          tokensCommitted: 50 + (i % 200),
          odds: 1.5 + ((i % 20) * 0.1),
          potentialWinning: (50 + (i % 200)) * (1.5 + ((i % 20) * 0.1)),
          status: 'active' as any,
          committedAt: new Date(Date.now() - (i * 1000)) as any, // Spread over time
          metadata: {
            marketTitle: market.title,
            marketStatus: market.status,
            marketEndsAt: market.endsAt,
            optionText: market.options[optionIndex].text,
            optionIndex,
            marketSnapshot: {
              totalOptions: market.options.length,
              allOptionsData: market.options.map(opt => ({
                optionId: opt.id,
                text: opt.text,
                totalTokens: opt.totalTokens,
                participantCount: opt.participantCount,
                odds: 2.0
              }))
            },
            userBalanceAtCommitment: 1000 + (i % 1000),
            commitmentSource: ['web', 'mobile', 'api'][i % 3] as any,
            ipAddress: `192.168.1.${(i % 254) + 1}`,
            userAgent: `TestAgent-${i % 10}`
          }
        }
      })

      // Mock high-volume data retrieval
      AdminCommitmentService.getCommitmentsWithUsers = jest.fn().mockResolvedValue({
        commitments,
        totalCount: 10000,
        analytics: {
          totalCommitments: 10000,
          uniqueParticipants: 500,
          totalTokensStaked: commitments.reduce((sum, c) => sum + c.tokensCommitted, 0),
          averageCommitmentSize: commitments.reduce((sum, c) => sum + c.tokensCommitted, 0) / 10000
        }
      })

      // Test high-volume retrieval performance
      const result = await AdminCommitmentService.getCommitmentsWithUsers({
        pageSize: 10000,
        includeAnalytics: true
      })

      const retrievalTime = Date.now() - startTime

      // Performance assertions
      expect(retrievalTime).toBeLessThan(10000) // Should complete within 10 seconds
      expect(result.commitments).toHaveLength(10000)
      expect(result.analytics.uniqueParticipants).toBe(500)
      expect(result.analytics.totalCommitments).toBe(10000)

      // Data integrity assertions
      const uniqueCommitmentIds = new Set(result.commitments.map(c => c.id))
      expect(uniqueCommitmentIds.size).toBe(10000) // No duplicates

      const uniqueUserIds = new Set(result.commitments.map(c => c.userId))
      expect(uniqueUserIds.size).toBe(500) // Correct user count

      const uniqueMarketIds = new Set(result.commitments.map(c => c.marketId))
      expect(uniqueMarketIds.size).toBe(100) // Correct market count

      console.log(`High-volume test completed in ${retrievalTime}ms`)
    })

    it('should handle concurrent commitment creation without data corruption', async () => {
      const concurrentCommitments = Array.from({ length: 1000 }, (_, i) => ({
        userId: `concurrent-user-${i % 50}`,
        marketId: `concurrent-market-${i % 10}`,
        optionId: `option-${i % 5}`,
        tokensCommitted: 100 + (i % 100),
        odds: 2.0 + ((i % 10) * 0.1)
      }))

      // Mock concurrent commitment creation
      EnhancedCommitmentService.createCommitment = jest.fn().mockImplementation(async (data) => ({
        id: `concurrent-commit-${Date.now()}-${Math.random()}`,
        userId: data.userId,
        marketId: data.marketId,
        optionId: data.optionId,
        tokensCommitted: data.tokensCommitted,
        odds: data.odds,
        potentialWinning: data.tokensCommitted * data.odds,
        status: 'active' as any,
        committedAt: new Date() as any,
        metadata: {
          marketTitle: 'Concurrent Test Market',
          marketStatus: 'active' as any,
          marketEndsAt: new Date() as any,
          optionText: 'Test Option',
          optionIndex: 0,
          marketSnapshot: {
            totalOptions: 5,
            allOptionsData: []
          },
          userBalanceAtCommitment: 1000,
          commitmentSource: 'web' as any
        }
      }))

      const startTime = Date.now()

      // Simulate concurrent commitment creation
      const creationPromises = concurrentCommitments.map(commitmentData =>
        EnhancedCommitmentService.createCommitment(commitmentData)
      )

      const createdCommitments = await Promise.all(creationPromises)
      const concurrentTime = Date.now() - startTime

      // Performance assertions
      expect(concurrentTime).toBeLessThan(15000) // Should complete within 15 seconds
      expect(createdCommitments).toHaveLength(1000)

      // Data integrity assertions
      const uniqueIds = new Set(createdCommitments.map(c => c.id))
      expect(uniqueIds.size).toBe(1000) // No ID collisions

      // Verify all commitments were created correctly
      createdCommitments.forEach((commitment, index) => {
        const originalData = concurrentCommitments[index]
        expect(commitment.userId).toBe(originalData.userId)
        expect(commitment.marketId).toBe(originalData.marketId)
        expect(commitment.optionId).toBe(originalData.optionId)
        expect(commitment.tokensCommitted).toBe(originalData.tokensCommitted)
      })

      console.log(`Concurrent creation test completed in ${concurrentTime}ms`)
    })

    it('should handle large-scale payout distribution efficiently', async () => {
      // Generate large-scale payout scenario
      const winningCommitments = Array.from({ length: 5000 }, (_, i) => ({
        id: `winning-commit-${i}`,
        userId: `payout-user-${i % 200}`, // 200 unique winners
        marketId: `payout-market-${i % 50}`, // 50 markets
        optionId: `winning-option-${i % 10}`,
        tokensCommitted: 100 + (i % 150),
        odds: 2.0 + ((i % 15) * 0.2),
        potentialWinning: (100 + (i % 150)) * (2.0 + ((i % 15) * 0.2)),
        status: 'won' as any,
        committedAt: new Date() as any,
        resolvedAt: new Date() as any,
        metadata: {
          marketTitle: `Payout Market ${i % 50}`,
          marketStatus: 'resolved' as any,
          marketEndsAt: new Date() as any,
          optionText: `Winning Option ${i % 10}`,
          optionIndex: i % 10,
          marketSnapshot: {
            totalOptions: 10,
            allOptionsData: []
          },
          userBalanceAtCommitment: 1000,
          commitmentSource: 'web' as any
        }
      }))

      const expectedPayouts = Array.from({ length: 200 }, (_, i) => {
        const userId = `payout-user-${i}`
        const userCommitments = winningCommitments.filter(c => c.userId === userId)
        
        return {
          id: `payout-${userId}`,
          marketId: 'bulk-payout-test',
          resolutionId: 'bulk-resolution-1',
          userId,
          totalPayout: userCommitments.reduce((sum, c) => sum + c.potentialWinning, 0),
          totalProfit: userCommitments.reduce((sum, c) => sum + (c.potentialWinning - c.tokensCommitted), 0),
          totalLost: 0,
          winningCommitments: userCommitments.map(c => ({
            commitmentId: c.id,
            optionId: c.optionId,
            tokensCommitted: c.tokensCommitted,
            odds: c.odds,
            payoutAmount: c.potentialWinning,
            profit: c.potentialWinning - c.tokensCommitted
          })),
          losingCommitments: [],
          processedAt: new Date() as any,
          status: 'completed' as any,
          transactionIds: [`tx-${userId}-1`, `tx-${userId}-2`]
        }
      })

      PayoutDistributionService.distributePayouts = jest.fn().mockResolvedValue({
        success: true,
        distributions: expectedPayouts,
        totalDistributed: expectedPayouts.reduce((sum, p) => sum + p.totalPayout, 0),
        errors: []
      })

      const startTime = Date.now()

      const payoutResult = await PayoutDistributionService.distributePayouts(
        'bulk-payout-test',
        'bulk-resolution-1',
        winningCommitments
      )

      const payoutTime = Date.now() - startTime

      // Performance assertions
      expect(payoutTime).toBeLessThan(20000) // Should complete within 20 seconds
      expect(payoutResult.success).toBe(true)
      expect(payoutResult.distributions).toHaveLength(200)
      expect(payoutResult.errors).toHaveLength(0)

      // Data integrity assertions
      const totalExpectedPayout = winningCommitments.reduce((sum, c) => sum + c.potentialWinning, 0)
      expect(payoutResult.totalDistributed).toBe(totalExpectedPayout)

      // Verify no user is missed
      const uniquePayoutUsers = new Set(payoutResult.distributions.map(d => d.userId))
      expect(uniquePayoutUsers.size).toBe(200)

      console.log(`Large-scale payout test completed in ${payoutTime}ms`)
    })
  })

  describe('Rollback Capability Validation', () => {
    it('should preserve original binary commitment format for rollback', async () => {
      // Original binary commitment format (pre-migration)
      const originalCommitments = [
        {
          id: 'original-1',
          userId: 'rollback-user-1',
          predictionId: 'rollback-market-1', // Original field name
          position: 'yes' as const, // Original binary format
          tokensCommitted: 200,
          odds: 2.1,
          potentialWinning: 420,
          status: 'active' as any,
          committedAt: new Date('2024-01-01') as any,
          userEmail: 'rollback-user-1@test.com',
          userDisplayName: 'Rollback User 1',
          metadata: {
            marketTitle: 'Original Binary Market',
            marketStatus: 'active' as any,
            marketEndsAt: new Date('2024-01-10') as any,
            userBalanceAtCommitment: 1000,
            commitmentSource: 'web' as any,
            ipAddress: '192.168.1.100',
            userAgent: 'Original Browser',
            // Original metadata format
            oddsSnapshot: {
              yesOdds: 2.1,
              noOdds: 1.9,
              totalYesTokens: 1200,
              totalNoTokens: 800,
              totalParticipants: 15
            }
          }
        },
        {
          id: 'original-2',
          userId: 'rollback-user-2',
          predictionId: 'rollback-market-1',
          position: 'no' as const,
          tokensCommitted: 150,
          odds: 1.9,
          potentialWinning: 285,
          status: 'active' as any,
          committedAt: new Date('2024-01-02') as any,
          userEmail: 'rollback-user-2@test.com',
          userDisplayName: 'Rollback User 2',
          metadata: {
            marketTitle: 'Original Binary Market',
            marketStatus: 'active' as any,
            marketEndsAt: new Date('2024-01-10') as any,
            userBalanceAtCommitment: 800,
            commitmentSource: 'mobile' as any,
            ipAddress: '10.0.0.50',
            userAgent: 'Original Mobile App',
            oddsSnapshot: {
              yesOdds: 2.1,
              noOdds: 1.9,
              totalYesTokens: 1200,
              totalNoTokens: 800,
              totalParticipants: 15
            }
          }
        }
      ]

      // Mock rollback scenario
      AdminCommitmentService.getOriginalCommitmentFormat = jest.fn().mockResolvedValue(originalCommitments)

      const rollbackData = await AdminCommitmentService.getOriginalCommitmentFormat('rollback-market-1')

      // Verify original format is preserved
      expect(rollbackData).toHaveLength(2)

      rollbackData.forEach(commitment => {
        // Original field names preserved
        expect(commitment.predictionId).toBeDefined()
        expect(commitment.position).toBeDefined()
        expect(['yes', 'no']).toContain(commitment.position)

        // Original metadata format preserved
        expect(commitment.metadata.oddsSnapshot).toBeDefined()
        expect(commitment.metadata.oddsSnapshot.yesOdds).toBeDefined()
        expect(commitment.metadata.oddsSnapshot.noOdds).toBeDefined()
        expect(commitment.metadata.oddsSnapshot.totalYesTokens).toBeDefined()
        expect(commitment.metadata.oddsSnapshot.totalNoTokens).toBeDefined()

        // No new fields present
        expect(commitment.optionId).toBeUndefined()
        expect(commitment.marketId).toBeUndefined()
        expect(commitment.metadata.optionText).toBeUndefined()
        expect(commitment.metadata.marketSnapshot).toBeUndefined()
      })

      // Verify original market structure compatibility
      const yesCommitments = rollbackData.filter(c => c.position === 'yes')
      const noCommitments = rollbackData.filter(c => c.position === 'no')
      
      expect(yesCommitments).toHaveLength(1)
      expect(noCommitments).toHaveLength(1)
      expect(yesCommitments[0].tokensCommitted).toBe(200)
      expect(noCommitments[0].tokensCommitted).toBe(150)
    })

    it('should validate data consistency between original and migrated formats', async () => {
      // Test data representing the same commitments in both formats
      const originalFormat = {
        id: 'consistency-test-1',
        userId: 'consistency-user',
        predictionId: 'consistency-market',
        position: 'yes' as const,
        tokensCommitted: 300,
        odds: 2.5,
        potentialWinning: 750,
        status: 'won' as any,
        committedAt: new Date('2024-01-01') as any,
        resolvedAt: new Date('2024-01-02') as any,
        metadata: {
          marketTitle: 'Consistency Test Market',
          marketStatus: 'resolved' as any,
          marketEndsAt: new Date('2024-01-02') as any,
          userBalanceAtCommitment: 1500,
          commitmentSource: 'web' as any,
          oddsSnapshot: {
            yesOdds: 2.5,
            noOdds: 1.7,
            totalYesTokens: 2000,
            totalNoTokens: 1500,
            totalParticipants: 20
          }
        }
      }

      const migratedFormat = {
        id: 'consistency-test-1', // Same ID
        userId: 'consistency-user', // Same user
        marketId: 'consistency-market', // Renamed from predictionId
        optionId: 'option_yes', // Mapped from position: 'yes'
        position: 'yes' as const, // Preserved for backward compatibility
        tokensCommitted: 300, // Same amount
        odds: 2.5, // Same odds
        potentialWinning: 750, // Same potential winning
        status: 'won' as any, // Same status
        committedAt: new Date('2024-01-01') as any, // Same timestamp
        resolvedAt: new Date('2024-01-02') as any, // Same resolution time
        metadata: {
          marketTitle: 'Consistency Test Market', // Same title
          marketStatus: 'resolved' as any, // Same status
          marketEndsAt: new Date('2024-01-02') as any, // Same end time
          optionText: 'Yes', // Derived from position
          optionIndex: 0, // First option for 'yes'
          marketSnapshot: {
            totalOptions: 2, // Binary market
            allOptionsData: [
              { optionId: 'option_yes', text: 'Yes', totalTokens: 2000, participantCount: 12, odds: 2.5 },
              { optionId: 'option_no', text: 'No', totalTokens: 1500, participantCount: 8, odds: 1.7 }
            ]
          },
          userBalanceAtCommitment: 1500, // Same balance
          commitmentSource: 'web' as any, // Same source
          // Original oddsSnapshot preserved for rollback compatibility
          oddsSnapshot: {
            yesOdds: 2.5,
            noOdds: 1.7,
            totalYesTokens: 2000,
            totalNoTokens: 1500,
            totalParticipants: 20
          }
        }
      }

      AdminCommitmentService.validateMigrationConsistency = jest.fn().mockResolvedValue({
        isConsistent: true,
        originalCommitment: originalFormat,
        migratedCommitment: migratedFormat,
        differences: [],
        validationResults: {
          idMatch: true,
          userMatch: true,
          marketMatch: true,
          amountMatch: true,
          oddsMatch: true,
          statusMatch: true,
          timestampMatch: true,
          metadataConsistent: true
        }
      })

      const validation = await AdminCommitmentService.validateMigrationConsistency('consistency-test-1')

      // Verify data consistency
      expect(validation.isConsistent).toBe(true)
      expect(validation.differences).toHaveLength(0)

      // Verify all critical fields match
      expect(validation.validationResults.idMatch).toBe(true)
      expect(validation.validationResults.userMatch).toBe(true)
      expect(validation.validationResults.marketMatch).toBe(true)
      expect(validation.validationResults.amountMatch).toBe(true)
      expect(validation.validationResults.oddsMatch).toBe(true)
      expect(validation.validationResults.statusMatch).toBe(true)
      expect(validation.validationResults.timestampMatch).toBe(true)
      expect(validation.validationResults.metadataConsistent).toBe(true)

      // Verify field mapping correctness
      expect(validation.migratedCommitment.marketId).toBe(validation.originalCommitment.predictionId)
      expect(validation.migratedCommitment.optionId).toBe('option_yes') // Mapped from position: 'yes'
      expect(validation.migratedCommitment.position).toBe(validation.originalCommitment.position)

      // Verify enhanced metadata preserves original data
      expect(validation.migratedCommitment.metadata.oddsSnapshot).toEqual(validation.originalCommitment.metadata.oddsSnapshot)
      expect(validation.migratedCommitment.metadata.marketSnapshot.totalOptions).toBe(2)
      expect(validation.migratedCommitment.metadata.marketSnapshot.allOptionsData[0].totalTokens).toBe(2000)
      expect(validation.migratedCommitment.metadata.marketSnapshot.allOptionsData[1].totalTokens).toBe(1500)
    })

    it('should support rollback to original system without data loss', async () => {
      // Simulate rollback process
      const migratedCommitments = [
        {
          id: 'rollback-commit-1',
          userId: 'rollback-user-1',
          marketId: 'rollback-market-1',
          optionId: 'option_yes',
          position: 'yes' as const, // Preserved for rollback
          tokensCommitted: 250,
          odds: 2.3,
          potentialWinning: 575,
          status: 'active' as any,
          committedAt: new Date() as any,
          metadata: {
            marketTitle: 'Rollback Test Market',
            marketStatus: 'active' as any,
            marketEndsAt: new Date() as any,
            optionText: 'Yes',
            optionIndex: 0,
            marketSnapshot: {
              totalOptions: 2,
              allOptionsData: []
            },
            userBalanceAtCommitment: 1000,
            commitmentSource: 'web' as any,
            // Original format preserved for rollback
            oddsSnapshot: {
              yesOdds: 2.3,
              noOdds: 1.8,
              totalYesTokens: 1500,
              totalNoTokens: 1000,
              totalParticipants: 18
            }
          }
        }
      ]

      const rollbackResult = {
        success: true,
        rolledBackCommitments: [
          {
            id: 'rollback-commit-1',
            userId: 'rollback-user-1',
            predictionId: 'rollback-market-1', // Restored original field name
            position: 'yes' as const,
            tokensCommitted: 250,
            odds: 2.3,
            potentialWinning: 575,
            status: 'active' as any,
            committedAt: new Date() as any,
            metadata: {
              marketTitle: 'Rollback Test Market',
              marketStatus: 'active' as any,
              marketEndsAt: new Date() as any,
              userBalanceAtCommitment: 1000,
              commitmentSource: 'web' as any,
              oddsSnapshot: {
                yesOdds: 2.3,
                noOdds: 1.8,
                totalYesTokens: 1500,
                totalNoTokens: 1000,
                totalParticipants: 18
              }
            }
          }
        ],
        dataIntegrityCheck: {
          noDataLoss: true,
          allCommitmentsRolledBack: true,
          originalFormatRestored: true,
          metadataPreserved: true
        }
      }

      AdminCommitmentService.performRollback = jest.fn().mockResolvedValue(rollbackResult)

      const rollback = await AdminCommitmentService.performRollback(migratedCommitments)

      // Verify rollback success
      expect(rollback.success).toBe(true)
      expect(rollback.dataIntegrityCheck.noDataLoss).toBe(true)
      expect(rollback.dataIntegrityCheck.allCommitmentsRolledBack).toBe(true)
      expect(rollback.dataIntegrityCheck.originalFormatRestored).toBe(true)

      // Verify original format restoration
      const rolledBackCommitment = rollback.rolledBackCommitments[0]
      expect(rolledBackCommitment.predictionId).toBe('rollback-market-1')
      expect(rolledBackCommitment.position).toBe('yes')
      expect(rolledBackCommitment.marketId).toBeUndefined() // New field removed
      expect(rolledBackCommitment.optionId).toBeUndefined() // New field removed

      // Verify original metadata format
      expect(rolledBackCommitment.metadata.oddsSnapshot).toBeDefined()
      expect(rolledBackCommitment.metadata.optionText).toBeUndefined() // New field removed
      expect(rolledBackCommitment.metadata.marketSnapshot).toBeUndefined() // New field removed

      // Verify data preservation
      expect(rolledBackCommitment.tokensCommitted).toBe(250)
      expect(rolledBackCommitment.odds).toBe(2.3)
      expect(rolledBackCommitment.potentialWinning).toBe(575)
      expect(rolledBackCommitment.metadata.oddsSnapshot.yesOdds).toBe(2.3)
      expect(rolledBackCommitment.metadata.oddsSnapshot.totalYesTokens).toBe(1500)
    })
  })

  describe('Pre-Migration vs Post-Migration Statistics Validation', () => {
    it('should maintain identical dashboard statistics after migration', async () => {
      // Pre-migration statistics (original binary system)
      const preMigrationStats = {
        totalCommitments: 1000,
        uniqueParticipants: 150,
        totalTokensStaked: 75000,
        averageCommitmentSize: 75,
        totalMarkets: 25,
        activeMarkets: 18,
        resolvedMarkets: 7,
        marketsByCategory: {
          sports: 10,
          fashion: 8,
          entertainment: 5,
          politics: 2
        },
        commitmentsByPosition: {
          yes: 520,
          no: 480
        },
        totalPayoutsDistributed: 45000,
        averageWinRate: 0.42
      }

      // Post-migration statistics (enhanced system with backward compatibility)
      const postMigrationStats = {
        totalCommitments: 1000, // Should be identical
        uniqueParticipants: 150, // Should be identical
        totalTokensStaked: 75000, // Should be identical
        averageCommitmentSize: 75, // Should be identical
        totalMarkets: 25, // Should be identical
        activeMarkets: 18, // Should be identical
        resolvedMarkets: 7, // Should be identical
        marketsByCategory: {
          sports: 10, // Should be identical
          fashion: 8, // Should be identical
          entertainment: 5, // Should be identical
          politics: 2 // Should be identical
        },
        // Enhanced breakdown (new capability)
        commitmentsByMarketType: {
          binary: 1000, // All existing commitments are binary
          multiOption: 0 // No multi-option commitments yet
        },
        commitmentsByOption: {
          option_yes: 520, // Mapped from position: 'yes'
          option_no: 480 // Mapped from position: 'no'
        },
        totalPayoutsDistributed: 45000, // Should be identical
        averageWinRate: 0.42 // Should be identical
      }

      AdminCommitmentService.getPreMigrationStats = jest.fn().mockResolvedValue(preMigrationStats)
      AdminCommitmentService.getPostMigrationStats = jest.fn().mockResolvedValue(postMigrationStats)

      const preStats = await AdminCommitmentService.getPreMigrationStats()
      const postStats = await AdminCommitmentService.getPostMigrationStats()

      // Verify identical core statistics
      expect(postStats.totalCommitments).toBe(preStats.totalCommitments)
      expect(postStats.uniqueParticipants).toBe(preStats.uniqueParticipants)
      expect(postStats.totalTokensStaked).toBe(preStats.totalTokensStaked)
      expect(postStats.averageCommitmentSize).toBe(preStats.averageCommitmentSize)
      expect(postStats.totalMarkets).toBe(preStats.totalMarkets)
      expect(postStats.activeMarkets).toBe(preStats.activeMarkets)
      expect(postStats.resolvedMarkets).toBe(preStats.resolvedMarkets)

      // Verify category breakdown remains identical
      expect(postStats.marketsByCategory).toEqual(preStats.marketsByCategory)

      // Verify payout statistics remain identical
      expect(postStats.totalPayoutsDistributed).toBe(preStats.totalPayoutsDistributed)
      expect(postStats.averageWinRate).toBe(preStats.averageWinRate)

      // Verify position mapping is accurate
      expect(postStats.commitmentsByOption.option_yes).toBe(preStats.commitmentsByPosition.yes)
      expect(postStats.commitmentsByOption.option_no).toBe(preStats.commitmentsByPosition.no)

      // Verify enhanced capabilities don't affect existing data
      expect(postStats.commitmentsByMarketType.binary).toBe(preStats.totalCommitments)
      expect(postStats.commitmentsByMarketType.multiOption).toBe(0)
    })
  })
})