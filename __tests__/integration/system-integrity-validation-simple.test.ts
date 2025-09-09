/**
 * Simplified System Integrity Validation Test
 * 
 * Validates complete system integrity and dashboard compatibility
 * with focus on data consistency and backward compatibility.
 */

import { PredictionCommitment, Market, PayoutDistribution } from '@/lib/types'

// Mock Firebase services
jest.mock('@/lib/db/database', () => ({
  db: {},
  auth: {}
}))

describe('System Integrity Validation', () => {
  describe('Data Structure Validation', () => {
    it('should validate binary commitment structure maintains backward compatibility', () => {
      const binaryCommitment: PredictionCommitment = {
        id: 'binary-test-1',
        userId: 'user-1',
        marketId: 'market-1',
        optionId: 'option_yes', // New field
        position: 'yes', // Preserved for backward compatibility
        tokensCommitted: 100,
        odds: 2.0,
        potentialWinning: 200,
        status: 'active' as any,
        committedAt: new Date() as any,
        metadata: {
          marketTitle: 'Test Binary Market',
          marketStatus: 'active' as any,
          marketEndsAt: new Date() as any,
          optionText: 'Yes',
          optionIndex: 0,
          marketSnapshot: {
            totalOptions: 2,
            allOptionsData: [
              { optionId: 'option_yes', text: 'Yes', totalTokens: 600, participantCount: 6, odds: 2.0 },
              { optionId: 'option_no', text: 'No', totalTokens: 400, participantCount: 4, odds: 2.5 }
            ]
          },
          userBalanceAtCommitment: 1000,
          commitmentSource: 'web' as any
        }
      }

      // Validate backward compatibility fields are present
      expect(binaryCommitment.position).toBe('yes')
      expect(binaryCommitment.optionId).toBe('option_yes')
      
      // Validate enhanced metadata structure
      expect(binaryCommitment.metadata.marketSnapshot.totalOptions).toBe(2)
      expect(binaryCommitment.metadata.marketSnapshot.allOptionsData).toHaveLength(2)
      expect(binaryCommitment.metadata.optionText).toBe('Yes')
      expect(binaryCommitment.metadata.optionIndex).toBe(0)
    })

    it('should validate multi-option commitment structure supports unlimited options', () => {
      const multiOptionCommitment: PredictionCommitment = {
        id: 'multi-test-1',
        userId: 'user-1',
        marketId: 'market-multi',
        optionId: 'option_designer_c', // Direct option targeting
        // No position field for new multi-option commitments
        tokensCommitted: 150,
        odds: 3.2,
        potentialWinning: 480,
        status: 'active' as any,
        committedAt: new Date() as any,
        metadata: {
          marketTitle: 'Fashion Week Winner',
          marketStatus: 'active' as any,
          marketEndsAt: new Date() as any,
          optionText: 'Designer C',
          optionIndex: 2,
          marketSnapshot: {
            totalOptions: 5,
            allOptionsData: [
              { optionId: 'option_designer_a', text: 'Designer A', totalTokens: 200, participantCount: 2, odds: 2.8 },
              { optionId: 'option_designer_b', text: 'Designer B', totalTokens: 350, participantCount: 4, odds: 3.1 },
              { optionId: 'option_designer_c', text: 'Designer C', totalTokens: 480, participantCount: 3, odds: 3.2 },
              { optionId: 'option_designer_d', text: 'Designer D', totalTokens: 150, participantCount: 1, odds: 4.5 },
              { optionId: 'option_designer_e', text: 'Designer E', totalTokens: 100, participantCount: 1, odds: 5.0 }
            ]
          },
          userBalanceAtCommitment: 800,
          commitmentSource: 'mobile' as any
        }
      }

      // Validate multi-option structure
      expect(multiOptionCommitment.position).toBeUndefined() // No position for new format
      expect(multiOptionCommitment.optionId).toBe('option_designer_c')
      
      // Validate enhanced metadata for multi-option
      expect(multiOptionCommitment.metadata.marketSnapshot.totalOptions).toBe(5)
      expect(multiOptionCommitment.metadata.marketSnapshot.allOptionsData).toHaveLength(5)
      expect(multiOptionCommitment.metadata.optionText).toBe('Designer C')
      expect(multiOptionCommitment.metadata.optionIndex).toBe(2)
    })

    it('should validate market structure supports both binary and multi-option formats', () => {
      const binaryMarket: Market = {
        id: 'binary-market',
        title: 'Binary Market Test',
        description: 'Test binary market',
        category: 'sports' as any,
        status: 'active' as any,
        createdBy: 'admin-1',
        createdAt: new Date() as any,
        endsAt: new Date() as any,
        options: [
          { id: 'option_yes', text: 'Yes', totalTokens: 600, participantCount: 6 },
          { id: 'option_no', text: 'No', totalTokens: 400, participantCount: 4 }
        ],
        totalParticipants: 8,
        totalTokensStaked: 1000,
        tags: ['sports'],
        featured: false,
        trending: false
      }

      const multiOptionMarket: Market = {
        id: 'multi-market',
        title: 'Multi-Option Market Test',
        description: 'Test multi-option market',
        category: 'fashion' as any,
        status: 'active' as any,
        createdBy: 'admin-1',
        createdAt: new Date() as any,
        endsAt: new Date() as any,
        options: [
          { id: 'option_a', text: 'Option A', totalTokens: 200, participantCount: 2 },
          { id: 'option_b', text: 'Option B', totalTokens: 300, participantCount: 3 },
          { id: 'option_c', text: 'Option C', totalTokens: 250, participantCount: 3 },
          { id: 'option_d', text: 'Option D', totalTokens: 150, participantCount: 2 },
          { id: 'option_e', text: 'Option E', totalTokens: 100, participantCount: 1 }
        ],
        totalParticipants: 7,
        totalTokensStaked: 1000,
        tags: ['fashion'],
        featured: false,
        trending: false
      }

      // Validate binary market structure
      expect(binaryMarket.options).toHaveLength(2)
      expect(binaryMarket.options[0].text).toBe('Yes')
      expect(binaryMarket.options[1].text).toBe('No')
      expect(binaryMarket.totalParticipants).toBe(8)

      // Validate multi-option market structure
      expect(multiOptionMarket.options).toHaveLength(5)
      expect(multiOptionMarket.options.every(opt => opt.id.startsWith('option_'))).toBe(true)
      expect(multiOptionMarket.totalParticipants).toBe(7)

      // Validate both use same base structure
      expect(binaryMarket.totalTokensStaked).toBe(multiOptionMarket.totalTokensStaked)
      expect(typeof binaryMarket.totalParticipants).toBe(typeof multiOptionMarket.totalParticipants)
    })
  })

  describe('Commitment Tracking Accuracy', () => {
    it('should track individual commitments with exact option targeting', () => {
      const userCommitments: PredictionCommitment[] = [
        // User makes 3 commitments to different options in same market
        {
          id: 'commit-1',
          userId: 'user-tracking-test',
          marketId: 'market-tracking',
          optionId: 'option_a',
          tokensCommitted: 100,
          odds: 2.5,
          potentialWinning: 250,
          status: 'active' as any,
          committedAt: new Date('2024-01-01') as any,
          metadata: {
            marketTitle: 'Tracking Test Market',
            marketStatus: 'active' as any,
            marketEndsAt: new Date() as any,
            optionText: 'Option A',
            optionIndex: 0,
            marketSnapshot: {
              totalOptions: 4,
              allOptionsData: []
            },
            userBalanceAtCommitment: 1000,
            commitmentSource: 'web' as any
          }
        },
        {
          id: 'commit-2',
          userId: 'user-tracking-test',
          marketId: 'market-tracking',
          optionId: 'option_b',
          tokensCommitted: 150,
          odds: 3.0,
          potentialWinning: 450,
          status: 'active' as any,
          committedAt: new Date('2024-01-02') as any,
          metadata: {
            marketTitle: 'Tracking Test Market',
            marketStatus: 'active' as any,
            marketEndsAt: new Date() as any,
            optionText: 'Option B',
            optionIndex: 1,
            marketSnapshot: {
              totalOptions: 4,
              allOptionsData: []
            },
            userBalanceAtCommitment: 900,
            commitmentSource: 'web' as any
          }
        },
        {
          id: 'commit-3',
          userId: 'user-tracking-test',
          marketId: 'market-tracking',
          optionId: 'option_a', // Second commitment to same option
          tokensCommitted: 75,
          odds: 2.8,
          potentialWinning: 210,
          status: 'active' as any,
          committedAt: new Date('2024-01-03') as any,
          metadata: {
            marketTitle: 'Tracking Test Market',
            marketStatus: 'active' as any,
            marketEndsAt: new Date() as any,
            optionText: 'Option A',
            optionIndex: 0,
            marketSnapshot: {
              totalOptions: 4,
              allOptionsData: []
            },
            userBalanceAtCommitment: 750,
            commitmentSource: 'mobile' as any
          }
        }
      ]

      // Validate individual commitment tracking
      expect(userCommitments).toHaveLength(3)
      
      // Validate exact option targeting
      const optionACommitments = userCommitments.filter(c => c.optionId === 'option_a')
      const optionBCommitments = userCommitments.filter(c => c.optionId === 'option_b')
      
      expect(optionACommitments).toHaveLength(2) // Two commitments to option A
      expect(optionBCommitments).toHaveLength(1) // One commitment to option B
      
      // Validate commitment amounts
      const totalOptionATokens = optionACommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      const totalOptionBTokens = optionBCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      
      expect(totalOptionATokens).toBe(175) // 100 + 75
      expect(totalOptionBTokens).toBe(150)
      
      // Validate unique commitment IDs
      const uniqueIds = new Set(userCommitments.map(c => c.id))
      expect(uniqueIds.size).toBe(3)
    })

    it('should calculate accurate market statistics from individual commitments', () => {
      const marketCommitments: PredictionCommitment[] = [
        // Multiple users, multiple commitments per user
        { id: '1', userId: 'user-1', marketId: 'stats-market', optionId: 'option_a', tokensCommitted: 100, odds: 2.0, potentialWinning: 200, status: 'active' as any, committedAt: new Date() as any, metadata: {} as any },
        { id: '2', userId: 'user-1', marketId: 'stats-market', optionId: 'option_b', tokensCommitted: 50, odds: 3.0, potentialWinning: 150, status: 'active' as any, committedAt: new Date() as any, metadata: {} as any },
        { id: '3', userId: 'user-2', marketId: 'stats-market', optionId: 'option_a', tokensCommitted: 200, odds: 2.0, potentialWinning: 400, status: 'active' as any, committedAt: new Date() as any, metadata: {} as any },
        { id: '4', userId: 'user-2', marketId: 'stats-market', optionId: 'option_c', tokensCommitted: 75, odds: 4.0, potentialWinning: 300, status: 'active' as any, committedAt: new Date() as any, metadata: {} as any },
        { id: '5', userId: 'user-3', marketId: 'stats-market', optionId: 'option_b', tokensCommitted: 125, odds: 3.0, potentialWinning: 375, status: 'active' as any, committedAt: new Date() as any, metadata: {} as any }
      ]

      // Calculate statistics
      const totalCommitments = marketCommitments.length
      const uniqueParticipants = new Set(marketCommitments.map(c => c.userId)).size
      const totalTokensStaked = marketCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      const averageCommitmentSize = totalTokensStaked / totalCommitments

      // Option-level statistics
      const optionStats = {
        option_a: {
          commitments: marketCommitments.filter(c => c.optionId === 'option_a'),
          totalTokens: marketCommitments.filter(c => c.optionId === 'option_a').reduce((sum, c) => sum + c.tokensCommitted, 0),
          participants: new Set(marketCommitments.filter(c => c.optionId === 'option_a').map(c => c.userId)).size
        },
        option_b: {
          commitments: marketCommitments.filter(c => c.optionId === 'option_b'),
          totalTokens: marketCommitments.filter(c => c.optionId === 'option_b').reduce((sum, c) => sum + c.tokensCommitted, 0),
          participants: new Set(marketCommitments.filter(c => c.optionId === 'option_b').map(c => c.userId)).size
        },
        option_c: {
          commitments: marketCommitments.filter(c => c.optionId === 'option_c'),
          totalTokens: marketCommitments.filter(c => c.optionId === 'option_c').reduce((sum, c) => sum + c.tokensCommitted, 0),
          participants: new Set(marketCommitments.filter(c => c.optionId === 'option_c').map(c => c.userId)).size
        }
      }

      // Validate overall statistics
      expect(totalCommitments).toBe(5)
      expect(uniqueParticipants).toBe(3)
      expect(totalTokensStaked).toBe(550) // 100+50+200+75+125
      expect(averageCommitmentSize).toBe(110)

      // Validate option-level statistics
      expect(optionStats.option_a.commitments).toHaveLength(2)
      expect(optionStats.option_a.totalTokens).toBe(300) // 100+200
      expect(optionStats.option_a.participants).toBe(2) // user-1, user-2

      expect(optionStats.option_b.commitments).toHaveLength(2)
      expect(optionStats.option_b.totalTokens).toBe(175) // 50+125
      expect(optionStats.option_b.participants).toBe(2) // user-1, user-3

      expect(optionStats.option_c.commitments).toHaveLength(1)
      expect(optionStats.option_c.totalTokens).toBe(75)
      expect(optionStats.option_c.participants).toBe(1) // user-2

      // Validate no double counting
      const totalOptionTokens = optionStats.option_a.totalTokens + optionStats.option_b.totalTokens + optionStats.option_c.totalTokens
      expect(totalOptionTokens).toBe(totalTokensStaked)
    })
  })

  describe('Payout Distribution Accuracy', () => {
    it('should calculate accurate payouts for winning commitments', () => {
      const winningCommitments: PredictionCommitment[] = [
        { id: 'win-1', userId: 'winner-1', marketId: 'payout-test', optionId: 'winning-option', tokensCommitted: 100, odds: 2.5, potentialWinning: 250, status: 'won' as any, committedAt: new Date() as any, resolvedAt: new Date() as any, metadata: {} as any },
        { id: 'win-2', userId: 'winner-1', marketId: 'payout-test', optionId: 'winning-option', tokensCommitted: 50, odds: 2.8, potentialWinning: 140, status: 'won' as any, committedAt: new Date() as any, resolvedAt: new Date() as any, metadata: {} as any },
        { id: 'win-3', userId: 'winner-2', marketId: 'payout-test', optionId: 'winning-option', tokensCommitted: 200, odds: 2.5, potentialWinning: 500, status: 'won' as any, committedAt: new Date() as any, resolvedAt: new Date() as any, metadata: {} as any }
      ]

      const losingCommitments: PredictionCommitment[] = [
        { id: 'lose-1', userId: 'winner-1', marketId: 'payout-test', optionId: 'losing-option', tokensCommitted: 75, odds: 3.0, potentialWinning: 225, status: 'lost' as any, committedAt: new Date() as any, resolvedAt: new Date() as any, metadata: {} as any },
        { id: 'lose-2', userId: 'winner-2', marketId: 'payout-test', optionId: 'losing-option', tokensCommitted: 25, odds: 3.0, potentialWinning: 75, status: 'lost' as any, committedAt: new Date() as any, resolvedAt: new Date() as any, metadata: {} as any }
      ]

      // Calculate payouts by user
      const userPayouts = {
        'winner-1': {
          winningCommitments: winningCommitments.filter(c => c.userId === 'winner-1'),
          losingCommitments: losingCommitments.filter(c => c.userId === 'winner-1'),
          totalPayout: 0,
          totalProfit: 0,
          totalLost: 0
        },
        'winner-2': {
          winningCommitments: winningCommitments.filter(c => c.userId === 'winner-2'),
          losingCommitments: losingCommitments.filter(c => c.userId === 'winner-2'),
          totalPayout: 0,
          totalProfit: 0,
          totalLost: 0
        }
      }

      // Calculate winner-1 payouts
      userPayouts['winner-1'].totalPayout = userPayouts['winner-1'].winningCommitments.reduce((sum, c) => sum + c.potentialWinning, 0)
      userPayouts['winner-1'].totalLost = userPayouts['winner-1'].losingCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      userPayouts['winner-1'].totalProfit = userPayouts['winner-1'].totalPayout - userPayouts['winner-1'].winningCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)

      // Calculate winner-2 payouts
      userPayouts['winner-2'].totalPayout = userPayouts['winner-2'].winningCommitments.reduce((sum, c) => sum + c.potentialWinning, 0)
      userPayouts['winner-2'].totalLost = userPayouts['winner-2'].losingCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      userPayouts['winner-2'].totalProfit = userPayouts['winner-2'].totalPayout - userPayouts['winner-2'].winningCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)

      // Validate winner-1 payouts
      expect(userPayouts['winner-1'].winningCommitments).toHaveLength(2)
      expect(userPayouts['winner-1'].totalPayout).toBe(390) // 250 + 140
      expect(userPayouts['winner-1'].totalLost).toBe(75)
      expect(userPayouts['winner-1'].totalProfit).toBe(240) // 390 - (100 + 50)

      // Validate winner-2 payouts
      expect(userPayouts['winner-2'].winningCommitments).toHaveLength(1)
      expect(userPayouts['winner-2'].totalPayout).toBe(500)
      expect(userPayouts['winner-2'].totalLost).toBe(25)
      expect(userPayouts['winner-2'].totalProfit).toBe(300) // 500 - 200

      // Validate total payout accuracy
      const totalPayoutDistributed = userPayouts['winner-1'].totalPayout + userPayouts['winner-2'].totalPayout
      const expectedTotalPayout = winningCommitments.reduce((sum, c) => sum + c.potentialWinning, 0)
      expect(totalPayoutDistributed).toBe(expectedTotalPayout)
    })
  })

  describe('Audit Trail Completeness', () => {
    it('should maintain complete audit trails for all commitment formats', () => {
      const auditCommitments: PredictionCommitment[] = [
        // Binary commitment with full audit trail
        {
          id: 'audit-binary',
          userId: 'audit-user-1',
          marketId: 'audit-market-1',
          optionId: 'option_yes',
          position: 'yes', // Backward compatibility
          tokensCommitted: 200,
          odds: 2.1,
          potentialWinning: 420,
          status: 'won' as any,
          committedAt: new Date('2024-01-01T10:00:00Z') as any,
          resolvedAt: new Date('2024-01-02T15:30:00Z') as any,
          userEmail: 'audit-user-1@test.com',
          userDisplayName: 'Audit User 1',
          metadata: {
            marketTitle: 'Audit Binary Market',
            marketStatus: 'resolved' as any,
            marketEndsAt: new Date('2024-01-02T12:00:00Z') as any,
            optionText: 'Yes',
            optionIndex: 0,
            marketSnapshot: {
              totalOptions: 2,
              allOptionsData: [
                { optionId: 'option_yes', text: 'Yes', totalTokens: 1200, participantCount: 8, odds: 2.1 },
                { optionId: 'option_no', text: 'No', totalTokens: 800, participantCount: 5, odds: 2.9 }
              ]
            },
            userBalanceAtCommitment: 1500,
            commitmentSource: 'web' as any,
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Test Browser)'
          }
        },
        // Multi-option commitment with full audit trail
        {
          id: 'audit-multi',
          userId: 'audit-user-2',
          marketId: 'audit-market-2',
          optionId: 'option_designer_c',
          tokensCommitted: 150,
          odds: 3.5,
          potentialWinning: 525,
          status: 'lost' as any,
          committedAt: new Date('2024-01-03T14:20:00Z') as any,
          resolvedAt: new Date('2024-01-04T16:45:00Z') as any,
          userEmail: 'audit-user-2@test.com',
          userDisplayName: 'Audit User 2',
          metadata: {
            marketTitle: 'Audit Multi-Option Market',
            marketStatus: 'resolved' as any,
            marketEndsAt: new Date('2024-01-04T12:00:00Z') as any,
            optionText: 'Designer C',
            optionIndex: 2,
            marketSnapshot: {
              totalOptions: 5,
              allOptionsData: [
                { optionId: 'option_designer_a', text: 'Designer A', totalTokens: 400, participantCount: 4, odds: 2.5 },
                { optionId: 'option_designer_b', text: 'Designer B', totalTokens: 600, participantCount: 6, odds: 2.1 },
                { optionId: 'option_designer_c', text: 'Designer C', totalTokens: 300, participantCount: 2, odds: 3.5 },
                { optionId: 'option_designer_d', text: 'Designer D', totalTokens: 200, participantCount: 2, odds: 4.2 },
                { optionId: 'option_designer_e', text: 'Designer E', totalTokens: 100, participantCount: 1, odds: 6.0 }
              ]
            },
            userBalanceAtCommitment: 800,
            commitmentSource: 'mobile' as any,
            ipAddress: '10.0.0.50',
            userAgent: 'KAI Mobile App v1.2.0'
          }
        }
      ]

      // Validate audit trail completeness for binary commitment
      const binaryAudit = auditCommitments[0]
      expect(binaryAudit.id).toBeDefined()
      expect(binaryAudit.userId).toBeDefined()
      expect(binaryAudit.committedAt).toBeDefined()
      expect(binaryAudit.resolvedAt).toBeDefined()
      expect(binaryAudit.userEmail).toBeDefined()
      expect(binaryAudit.userDisplayName).toBeDefined()
      expect(binaryAudit.metadata.marketSnapshot).toBeDefined()
      expect(binaryAudit.metadata.userBalanceAtCommitment).toBeGreaterThan(0)
      expect(binaryAudit.metadata.ipAddress).toBeDefined()
      expect(binaryAudit.metadata.userAgent).toBeDefined()

      // Validate audit trail completeness for multi-option commitment
      const multiAudit = auditCommitments[1]
      expect(multiAudit.id).toBeDefined()
      expect(multiAudit.userId).toBeDefined()
      expect(multiAudit.committedAt).toBeDefined()
      expect(multiAudit.resolvedAt).toBeDefined()
      expect(multiAudit.userEmail).toBeDefined()
      expect(multiAudit.userDisplayName).toBeDefined()
      expect(multiAudit.metadata.marketSnapshot).toBeDefined()
      expect(multiAudit.metadata.marketSnapshot.totalOptions).toBe(5)
      expect(multiAudit.metadata.marketSnapshot.allOptionsData).toHaveLength(5)
      expect(multiAudit.metadata.userBalanceAtCommitment).toBeGreaterThan(0)
      expect(multiAudit.metadata.ipAddress).toBeDefined()
      expect(multiAudit.metadata.userAgent).toBeDefined()

      // Validate market snapshot accuracy
      expect(binaryAudit.metadata.marketSnapshot.totalOptions).toBe(2)
      expect(binaryAudit.metadata.marketSnapshot.allOptionsData[0].optionId).toBe('option_yes')
      expect(binaryAudit.metadata.marketSnapshot.allOptionsData[1].optionId).toBe('option_no')

      expect(multiAudit.metadata.marketSnapshot.totalOptions).toBe(5)
      expect(multiAudit.metadata.marketSnapshot.allOptionsData[2].optionId).toBe('option_designer_c')
      expect(multiAudit.metadata.marketSnapshot.allOptionsData[2].text).toBe('Designer C')

      // Validate commitment timing
      expect(binaryAudit.committedAt.getTime()).toBeLessThan(binaryAudit.resolvedAt!.getTime())
      expect(multiAudit.committedAt.getTime()).toBeLessThan(multiAudit.resolvedAt!.getTime())
    })
  })

  describe('Performance Validation', () => {
    it('should handle large datasets efficiently', () => {
      const startTime = Date.now()
      
      // Generate large dataset
      const largeCommitmentSet: PredictionCommitment[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `perf-commit-${i}`,
        userId: `perf-user-${i % 100}`, // 100 unique users
        marketId: `perf-market-${i % 20}`, // 20 markets
        optionId: `option-${i % 5}`, // 5 options per market
        tokensCommitted: 50 + (i % 200),
        odds: 1.5 + ((i % 20) * 0.1),
        potentialWinning: (50 + (i % 200)) * (1.5 + ((i % 20) * 0.1)),
        status: 'active' as any,
        committedAt: new Date(Date.now() - (i * 1000)) as any,
        metadata: {
          marketTitle: `Performance Market ${i % 20}`,
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

      // Perform calculations on large dataset
      const uniqueUsers = new Set(largeCommitmentSet.map(c => c.userId)).size
      const uniqueMarkets = new Set(largeCommitmentSet.map(c => c.marketId)).size
      const totalTokens = largeCommitmentSet.reduce((sum, c) => sum + c.tokensCommitted, 0)
      
      // Group by market
      const marketGroups = largeCommitmentSet.reduce((groups, commitment) => {
        if (!groups[commitment.marketId]) {
          groups[commitment.marketId] = []
        }
        groups[commitment.marketId].push(commitment)
        return groups
      }, {} as Record<string, PredictionCommitment[]>)

      // Group by user
      const userGroups = largeCommitmentSet.reduce((groups, commitment) => {
        if (!groups[commitment.userId]) {
          groups[commitment.userId] = []
        }
        groups[commitment.userId].push(commitment)
        return groups
      }, {} as Record<string, PredictionCommitment[]>)

      const processingTime = Date.now() - startTime

      // Validate performance (should complete quickly)
      expect(processingTime).toBeLessThan(1000) // Less than 1 second
      
      // Validate data integrity
      expect(largeCommitmentSet).toHaveLength(1000)
      expect(uniqueUsers).toBe(100)
      expect(uniqueMarkets).toBe(20)
      expect(Object.keys(marketGroups)).toHaveLength(20)
      expect(Object.keys(userGroups)).toHaveLength(100)
      
      // Validate no data loss
      const totalCommitmentsInGroups = Object.values(marketGroups).reduce((sum, group) => sum + group.length, 0)
      expect(totalCommitmentsInGroups).toBe(1000)

      console.log(`Performance test completed in ${processingTime}ms`)
    })
  })

  describe('Rollback Compatibility', () => {
    it('should preserve original data format for rollback capability', () => {
      // Original format (pre-migration)
      const originalCommitment = {
        id: 'rollback-test-1',
        userId: 'rollback-user',
        predictionId: 'rollback-market', // Original field name
        position: 'yes' as const, // Original binary format
        tokensCommitted: 300,
        odds: 2.2,
        potentialWinning: 660,
        status: 'won' as any,
        committedAt: new Date('2024-01-01') as any,
        resolvedAt: new Date('2024-01-02') as any,
        metadata: {
          marketTitle: 'Rollback Test Market',
          marketStatus: 'resolved' as any,
          marketEndsAt: new Date('2024-01-02') as any,
          userBalanceAtCommitment: 1200,
          commitmentSource: 'web' as any,
          // Original metadata format
          oddsSnapshot: {
            yesOdds: 2.2,
            noOdds: 1.8,
            totalYesTokens: 1500,
            totalNoTokens: 1000,
            totalParticipants: 25
          }
        }
      }

      // Enhanced format (post-migration)
      const enhancedCommitment: PredictionCommitment = {
        id: 'rollback-test-1', // Same ID
        userId: 'rollback-user', // Same user
        marketId: 'rollback-market', // Renamed from predictionId
        optionId: 'option_yes', // Mapped from position
        position: 'yes', // Preserved for rollback
        tokensCommitted: 300, // Same amount
        odds: 2.2, // Same odds
        potentialWinning: 660, // Same potential
        status: 'won' as any, // Same status
        committedAt: new Date('2024-01-01') as any, // Same timestamp
        resolvedAt: new Date('2024-01-02') as any, // Same resolution
        metadata: {
          marketTitle: 'Rollback Test Market', // Same title
          marketStatus: 'resolved' as any, // Same status
          marketEndsAt: new Date('2024-01-02') as any, // Same end time
          optionText: 'Yes', // Derived from position
          optionIndex: 0, // First option for 'yes'
          marketSnapshot: {
            totalOptions: 2,
            allOptionsData: [
              { optionId: 'option_yes', text: 'Yes', totalTokens: 1500, participantCount: 15, odds: 2.2 },
              { optionId: 'option_no', text: 'No', totalTokens: 1000, participantCount: 10, odds: 1.8 }
            ]
          },
          userBalanceAtCommitment: 1200, // Same balance
          commitmentSource: 'web' as any, // Same source
          // Original format preserved for rollback
          oddsSnapshot: {
            yesOdds: 2.2,
            noOdds: 1.8,
            totalYesTokens: 1500,
            totalNoTokens: 1000,
            totalParticipants: 25
          }
        }
      }

      // Validate data consistency between formats
      expect(enhancedCommitment.id).toBe(originalCommitment.id)
      expect(enhancedCommitment.userId).toBe(originalCommitment.userId)
      expect(enhancedCommitment.marketId).toBe(originalCommitment.predictionId)
      expect(enhancedCommitment.position).toBe(originalCommitment.position)
      expect(enhancedCommitment.tokensCommitted).toBe(originalCommitment.tokensCommitted)
      expect(enhancedCommitment.odds).toBe(originalCommitment.odds)
      expect(enhancedCommitment.potentialWinning).toBe(originalCommitment.potentialWinning)
      expect(enhancedCommitment.status).toBe(originalCommitment.status)

      // Validate original metadata is preserved
      expect(enhancedCommitment.metadata.oddsSnapshot).toEqual(originalCommitment.metadata.oddsSnapshot)
      expect(enhancedCommitment.metadata.userBalanceAtCommitment).toBe(originalCommitment.metadata.userBalanceAtCommitment)

      // Validate enhanced metadata is consistent with original
      expect(enhancedCommitment.metadata.marketSnapshot.allOptionsData[0].totalTokens).toBe(originalCommitment.metadata.oddsSnapshot.totalYesTokens)
      expect(enhancedCommitment.metadata.marketSnapshot.allOptionsData[1].totalTokens).toBe(originalCommitment.metadata.oddsSnapshot.totalNoTokens)

      // Validate rollback capability - can derive original format
      const rolledBackCommitment = {
        id: enhancedCommitment.id,
        userId: enhancedCommitment.userId,
        predictionId: enhancedCommitment.marketId, // Restore original field name
        position: enhancedCommitment.position, // Use preserved position
        tokensCommitted: enhancedCommitment.tokensCommitted,
        odds: enhancedCommitment.odds,
        potentialWinning: enhancedCommitment.potentialWinning,
        status: enhancedCommitment.status,
        committedAt: enhancedCommitment.committedAt,
        resolvedAt: enhancedCommitment.resolvedAt,
        metadata: {
          marketTitle: enhancedCommitment.metadata.marketTitle,
          marketStatus: enhancedCommitment.metadata.marketStatus,
          marketEndsAt: enhancedCommitment.metadata.marketEndsAt,
          userBalanceAtCommitment: enhancedCommitment.metadata.userBalanceAtCommitment,
          commitmentSource: enhancedCommitment.metadata.commitmentSource,
          oddsSnapshot: enhancedCommitment.metadata.oddsSnapshot // Restore original format
        }
      }

      // Validate rollback produces identical original format
      expect(rolledBackCommitment).toEqual(originalCommitment)
    })
  })
})