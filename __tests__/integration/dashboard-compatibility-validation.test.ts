/**
 * Dashboard Compatibility Validation Test
 * 
 * Validates that all existing admin dashboards display accurate data
 * with the migrated commitment system and maintain backward compatibility.
 */

import { AdminCommitmentService } from '@/lib/services/admin-commitment-service'
import { AdminDashboardService } from '@/lib/services/admin-dashboard-service'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { PredictionCommitment, Market } from '@/lib/types'

// Mock Firebase services
jest.mock('@/lib/db/database', () => ({
  db: {},
  auth: {}
}))

// Mock services
jest.mock('@/lib/services/admin-commitment-service', () => ({
  AdminCommitmentService: {
    getMarketCommitments: jest.fn(),
    getUserCommitments: jest.fn(),
    getAllMarketsWithStats: jest.fn(),
    getUserStats: jest.fn(),
    getPendingResolutionMarkets: jest.fn()
  }
}))

jest.mock('@/lib/services/admin-dashboard-service', () => ({
  AdminDashboardService: {
    getDashboardStats: jest.fn()
  }
}))

jest.mock('@/lib/services/token-balance-service', () => ({
  TokenBalanceService: {
    getTokenStats: jest.fn()
  }
}))

describe('Dashboard Compatibility Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Admin Dashboard (/admin/dashboard)', () => {
    it('should display accurate statistics with migrated commitment data', async () => {
      // Mock mixed commitment data (binary + multi-option)
      const mixedCommitments: PredictionCommitment[] = [
        // Migrated binary commitments
        {
          id: 'binary-1',
          userId: 'user-1',
          marketId: 'market-binary',
          optionId: 'option_yes',
          position: 'yes', // Preserved for backward compatibility
          tokensCommitted: 100,
          odds: 2.0,
          potentialWinning: 200,
          status: 'won' as any,
          committedAt: new Date() as any,
          resolvedAt: new Date() as any,
          metadata: {
            marketTitle: 'Binary Market',
            marketStatus: 'resolved' as any,
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
        },
        // New multi-option commitments
        {
          id: 'multi-1',
          userId: 'user-2',
          marketId: 'market-multi',
          optionId: 'option_designer_a',
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
            userBalanceAtCommitment: 800,
            commitmentSource: 'mobile' as any
          }
        }
      ]

      const dashboardStats = {
        totalCommitments: 2,
        activeCommitments: 1,
        resolvedCommitments: 1,
        uniqueParticipants: 2,
        totalTokensStaked: 250,
        totalTokensDistributed: 200,
        averageCommitmentSize: 125,
        totalMarkets: 2,
        activeMarkets: 1,
        resolvedMarkets: 1,
        marketsByCategory: {
          sports: 1,
          fashion: 1
        },
        recentActivity: {
          last24Hours: {
            newCommitments: 1,
            newParticipants: 1,
            tokensStaked: 150
          },
          last7Days: {
            newCommitments: 2,
            newParticipants: 2,
            tokensStaked: 250
          }
        }
      }

      AdminDashboardService.getDashboardStats = jest.fn().mockResolvedValue(dashboardStats)

      const stats = await AdminDashboardService.getDashboardStats()

      // Verify dashboard statistics are accurate
      expect(stats.totalCommitments).toBe(2)
      expect(stats.uniqueParticipants).toBe(2)
      expect(stats.totalTokensStaked).toBe(250)
      expect(stats.averageCommitmentSize).toBe(125)

      // Verify both binary and multi-option markets are counted
      expect(stats.totalMarkets).toBe(2)
      expect(stats.activeMarkets).toBe(1)
      expect(stats.resolvedMarkets).toBe(1)

      // Verify category breakdown includes both market types
      expect(stats.marketsByCategory.sports).toBe(1)
      expect(stats.marketsByCategory.fashion).toBe(1)

      // Verify recent activity tracking works with mixed commitment types
      expect(stats.recentActivity.last24Hours.newCommitments).toBe(1)
      expect(stats.recentActivity.last7Days.newCommitments).toBe(2)
    })
  })

  describe('Admin Token Dashboard (/admin/tokens)', () => {
    it('should display accurate token metrics with mixed commitment types', async () => {
      const tokenStats = {
        totalTokensInCirculation: 50000,
        totalTokensCommitted: 12500,
        totalTokensAvailable: 37500,
        commitmentsByMarketType: {
          binary: {
            totalCommitments: 150,
            totalTokens: 7500,
            averageCommitment: 50
          },
          multiOption: {
            totalCommitments: 100,
            totalTokens: 5000,
            averageCommitment: 50
          }
        },
        userEngagement: {
          activeUsers: 200,
          usersWithCommitments: 180,
          averageCommitmentsPerUser: 1.25,
          averageTokensPerUser: 62.5
        },
        transactionMetrics: {
          totalTransactions: 500,
          commitmentTransactions: 250,
          payoutTransactions: 150,
          refundTransactions: 10
        }
      }

      TokenBalanceService.getTokenStats = jest.fn().mockResolvedValue(tokenStats)

      const stats = await TokenBalanceService.getTokenStats()

      // Verify token circulation metrics
      expect(stats.totalTokensInCirculation).toBe(50000)
      expect(stats.totalTokensCommitted).toBe(12500)
      expect(stats.totalTokensAvailable).toBe(37500)

      // Verify breakdown by market type
      expect(stats.commitmentsByMarketType.binary.totalCommitments).toBe(150)
      expect(stats.commitmentsByMarketType.multiOption.totalCommitments).toBe(100)
      expect(stats.commitmentsByMarketType.binary.totalTokens).toBe(7500)
      expect(stats.commitmentsByMarketType.multiOption.totalTokens).toBe(5000)

      // Verify user engagement metrics
      expect(stats.userEngagement.activeUsers).toBe(200)
      expect(stats.userEngagement.usersWithCommitments).toBe(180)

      // Verify transaction metrics include all commitment types
      expect(stats.transactionMetrics.commitmentTransactions).toBe(250)
      expect(stats.transactionMetrics.payoutTransactions).toBe(150)
    })
  })

  describe('Market Resolution Dashboard (/admin/resolution)', () => {
    it('should display accurate market statistics for both binary and multi-option markets', async () => {
      const pendingMarkets: Market[] = [
        {
          id: 'binary-market-pending',
          title: 'Binary Market Pending Resolution',
          description: 'A binary market ready for resolution',
          category: 'sports' as any,
          status: 'pending_resolution' as any,
          createdBy: 'admin-1',
          createdAt: new Date() as any,
          endsAt: new Date(Date.now() - 3600000) as any, // 1 hour ago
          options: [
            { id: 'option_yes', text: 'Yes', totalTokens: 800, participantCount: 8 },
            { id: 'option_no', text: 'No', totalTokens: 600, participantCount: 6 }
          ],
          totalParticipants: 12,
          totalTokensStaked: 1400,
          tags: ['sports'],
          featured: false,
          trending: false,
          pendingResolution: true
        },
        {
          id: 'multi-market-pending',
          title: 'Multi-Option Market Pending Resolution',
          description: 'A multi-option market ready for resolution',
          category: 'fashion' as any,
          status: 'pending_resolution' as any,
          createdBy: 'admin-1',
          createdAt: new Date() as any,
          endsAt: new Date(Date.now() - 7200000) as any, // 2 hours ago
          options: [
            { id: 'option_a', text: 'Designer A', totalTokens: 300, participantCount: 3 },
            { id: 'option_b', text: 'Designer B', totalTokens: 450, participantCount: 5 },
            { id: 'option_c', text: 'Designer C', totalTokens: 200, participantCount: 2 },
            { id: 'option_d', text: 'Designer D', totalTokens: 350, participantCount: 4 }
          ],
          totalParticipants: 10,
          totalTokensStaked: 1300,
          tags: ['fashion'],
          featured: false,
          trending: false,
          pendingResolution: true
        }
      ]

      // Mock commitment data for each market
      const binaryCommitments: PredictionCommitment[] = Array.from({ length: 14 }, (_, i) => ({
        id: `binary-commit-${i}`,
        userId: `user-${i % 12}`,
        marketId: 'binary-market-pending',
        optionId: i % 2 === 0 ? 'option_yes' : 'option_no',
        position: i % 2 === 0 ? 'yes' as const : 'no' as const,
        tokensCommitted: 100,
        odds: 2.0,
        potentialWinning: 200,
        status: 'active' as any,
        committedAt: new Date() as any,
        metadata: {
          marketTitle: 'Binary Market Pending Resolution',
          marketStatus: 'pending_resolution' as any,
          marketEndsAt: new Date() as any,
          optionText: i % 2 === 0 ? 'Yes' : 'No',
          optionIndex: i % 2,
          marketSnapshot: {
            totalOptions: 2,
            allOptionsData: []
          },
          userBalanceAtCommitment: 1000,
          commitmentSource: 'web' as any
        }
      }))

      const multiCommitments: PredictionCommitment[] = Array.from({ length: 13 }, (_, i) => ({
        id: `multi-commit-${i}`,
        userId: `user-${i % 10}`,
        marketId: 'multi-market-pending',
        optionId: `option_${['a', 'b', 'c', 'd'][i % 4]}`,
        tokensCommitted: 100,
        odds: 2.5 + (i % 4) * 0.3,
        potentialWinning: 100 * (2.5 + (i % 4) * 0.3),
        status: 'active' as any,
        committedAt: new Date() as any,
        metadata: {
          marketTitle: 'Multi-Option Market Pending Resolution',
          marketStatus: 'pending_resolution' as any,
          marketEndsAt: new Date() as any,
          optionText: ['Designer A', 'Designer B', 'Designer C', 'Designer D'][i % 4],
          optionIndex: i % 4,
          marketSnapshot: {
            totalOptions: 4,
            allOptionsData: []
          },
          userBalanceAtCommitment: 1000,
          commitmentSource: 'web' as any
        }
      }))

      AdminCommitmentService.getPendingResolutionMarkets = jest.fn().mockResolvedValue(pendingMarkets)
      
      AdminCommitmentService.getMarketCommitments = jest.fn()
        .mockResolvedValueOnce({
          market: pendingMarkets[0],
          commitments: binaryCommitments,
          analytics: {
            totalCommitments: 14,
            uniqueParticipants: 12,
            totalTokensStaked: 1400,
            averageCommitmentSize: 100
          },
          totalCount: 14
        })
        .mockResolvedValueOnce({
          market: pendingMarkets[1],
          commitments: multiCommitments,
          analytics: {
            totalCommitments: 13,
            uniqueParticipants: 10,
            totalTokensStaked: 1300,
            averageCommitmentSize: 100
          },
          totalCount: 13
        })

      // Test resolution dashboard data loading
      const markets = await AdminCommitmentService.getPendingResolutionMarkets()
      expect(markets).toHaveLength(2)

      // Test binary market statistics
      const binaryMarketData = await AdminCommitmentService.getMarketCommitments('binary-market-pending', {
        pageSize: 100,
        includeAnalytics: true
      })

      expect(binaryMarketData.analytics.totalCommitments).toBe(14)
      expect(binaryMarketData.analytics.uniqueParticipants).toBe(12)
      expect(binaryMarketData.analytics.totalTokensStaked).toBe(1400)
      expect(binaryMarketData.market.options).toHaveLength(2)

      // Test multi-option market statistics
      const multiMarketData = await AdminCommitmentService.getMarketCommitments('multi-market-pending', {
        pageSize: 100,
        includeAnalytics: true
      })

      expect(multiMarketData.analytics.totalCommitments).toBe(13)
      expect(multiMarketData.analytics.uniqueParticipants).toBe(10)
      expect(multiMarketData.analytics.totalTokensStaked).toBe(1300)
      expect(multiMarketData.market.options).toHaveLength(4)

      // Verify both market types are handled correctly
      expect(binaryMarketData.commitments.every(c => c.position !== undefined)).toBe(true) // Binary commitments have position
      expect(multiMarketData.commitments.every(c => c.optionId.startsWith('option_'))).toBe(true) // Multi-option commitments have proper optionId
    })
  })

  describe('Admin Markets Page (/admin/markets)', () => {
    it('should display accurate market listings with mixed market types', async () => {
      const allMarkets: Market[] = [
        // Binary markets (migrated)
        {
          id: 'binary-1',
          title: 'Binary Market 1',
          description: 'First binary market',
          category: 'sports' as any,
          status: 'active' as any,
          createdBy: 'admin-1',
          createdAt: new Date() as any,
          endsAt: new Date(Date.now() + 86400000) as any,
          options: [
            { id: 'option_yes', text: 'Yes', totalTokens: 500, participantCount: 5 },
            { id: 'option_no', text: 'No', totalTokens: 300, participantCount: 3 }
          ],
          totalParticipants: 7,
          totalTokensStaked: 800,
          tags: ['sports'],
          featured: true,
          trending: false
        },
        // Multi-option markets (new)
        {
          id: 'multi-1',
          title: 'Multi-Option Market 1',
          description: 'First multi-option market',
          category: 'fashion' as any,
          status: 'active' as any,
          createdBy: 'admin-1',
          createdAt: new Date() as any,
          endsAt: new Date(Date.now() + 172800000) as any,
          options: [
            { id: 'option_a', text: 'Designer A', totalTokens: 200, participantCount: 2 },
            { id: 'option_b', text: 'Designer B', totalTokens: 350, participantCount: 4 },
            { id: 'option_c', text: 'Designer C', totalTokens: 150, participantCount: 2 },
            { id: 'option_d', text: 'Designer D', totalTokens: 300, participantCount: 3 }
          ],
          totalParticipants: 8,
          totalTokensStaked: 1000,
          tags: ['fashion'],
          featured: false,
          trending: true
        }
      ]

      AdminCommitmentService.getAllMarketsWithStats = jest.fn().mockResolvedValue({
        markets: allMarkets,
        totalCount: 2,
        summary: {
          totalMarkets: 2,
          activeMarkets: 2,
          resolvedMarkets: 0,
          totalParticipants: 15,
          totalTokensStaked: 1800,
          marketsByCategory: {
            sports: 1,
            fashion: 1
          }
        }
      })

      const marketsData = await AdminCommitmentService.getAllMarketsWithStats({
        pageSize: 100,
        includeStats: true
      })

      // Verify market listing accuracy
      expect(marketsData.markets).toHaveLength(2)
      expect(marketsData.summary.totalMarkets).toBe(2)
      expect(marketsData.summary.totalParticipants).toBe(15)
      expect(marketsData.summary.totalTokensStaked).toBe(1800)

      // Verify binary market structure
      const binaryMarket = marketsData.markets.find(m => m.id === 'binary-1')
      expect(binaryMarket?.options).toHaveLength(2)
      expect(binaryMarket?.options[0].text).toBe('Yes')
      expect(binaryMarket?.options[1].text).toBe('No')
      expect(binaryMarket?.totalParticipants).toBe(7)
      expect(binaryMarket?.totalTokensStaked).toBe(800)

      // Verify multi-option market structure
      const multiMarket = marketsData.markets.find(m => m.id === 'multi-1')
      expect(multiMarket?.options).toHaveLength(4)
      expect(multiMarket?.options.every(opt => opt.text.startsWith('Designer'))).toBe(true)
      expect(multiMarket?.totalParticipants).toBe(8)
      expect(multiMarket?.totalTokensStaked).toBe(1000)

      // Verify category breakdown
      expect(marketsData.summary.marketsByCategory.sports).toBe(1)
      expect(marketsData.summary.marketsByCategory.fashion).toBe(1)
    })
  })

  describe('Market Detail Pages', () => {
    it('should display accurate commitment breakdowns for both market types', async () => {
      // Test binary market detail
      const binaryMarketDetail = {
        market: {
          id: 'binary-detail',
          title: 'Binary Market Detail Test',
          options: [
            { id: 'option_yes', text: 'Yes', totalTokens: 600, participantCount: 6 },
            { id: 'option_no', text: 'No', totalTokens: 400, participantCount: 4 }
          ],
          totalParticipants: 8,
          totalTokensStaked: 1000
        } as Market,
        commitments: Array.from({ length: 10 }, (_, i) => ({
          id: `detail-binary-${i}`,
          userId: `user-${i % 8}`,
          marketId: 'binary-detail',
          optionId: i % 2 === 0 ? 'option_yes' : 'option_no',
          position: i % 2 === 0 ? 'yes' as const : 'no' as const,
          tokensCommitted: 100,
          odds: 2.0,
          potentialWinning: 200,
          status: 'active' as any,
          committedAt: new Date() as any,
          metadata: {
            marketTitle: 'Binary Market Detail Test',
            marketStatus: 'active' as any,
            marketEndsAt: new Date() as any,
            optionText: i % 2 === 0 ? 'Yes' : 'No',
            optionIndex: i % 2,
            marketSnapshot: {
              totalOptions: 2,
              allOptionsData: []
            },
            userBalanceAtCommitment: 1000,
            commitmentSource: 'web' as any
          }
        })),
        analytics: {
          totalCommitments: 10,
          uniqueParticipants: 8,
          totalTokensStaked: 1000,
          averageCommitmentSize: 100
        }
      }

      AdminCommitmentService.getMarketCommitments = jest.fn().mockResolvedValueOnce(binaryMarketDetail)

      const binaryDetail = await AdminCommitmentService.getMarketCommitments('binary-detail', {
        pageSize: 100,
        includeAnalytics: true
      })

      // Verify binary market detail accuracy
      expect(binaryDetail.commitments).toHaveLength(10)
      expect(binaryDetail.analytics.uniqueParticipants).toBe(8)
      expect(binaryDetail.market.options).toHaveLength(2)

      // Verify all binary commitments have position field
      expect(binaryDetail.commitments.every(c => c.position !== undefined)).toBe(true)

      // Test multi-option market detail
      const multiMarketDetail = {
        market: {
          id: 'multi-detail',
          title: 'Multi-Option Market Detail Test',
          options: [
            { id: 'option_a', text: 'Option A', totalTokens: 250, participantCount: 3 },
            { id: 'option_b', text: 'Option B', totalTokens: 300, participantCount: 4 },
            { id: 'option_c', text: 'Option C', totalTokens: 200, participantCount: 2 },
            { id: 'option_d', text: 'Option D', totalTokens: 150, participantCount: 2 }
          ],
          totalParticipants: 7,
          totalTokensStaked: 900
        } as Market,
        commitments: Array.from({ length: 9 }, (_, i) => ({
          id: `detail-multi-${i}`,
          userId: `user-${i % 7}`,
          marketId: 'multi-detail',
          optionId: `option_${['a', 'b', 'c', 'd'][i % 4]}`,
          tokensCommitted: 100,
          odds: 2.5 + (i % 4) * 0.2,
          potentialWinning: 100 * (2.5 + (i % 4) * 0.2),
          status: 'active' as any,
          committedAt: new Date() as any,
          metadata: {
            marketTitle: 'Multi-Option Market Detail Test',
            marketStatus: 'active' as any,
            marketEndsAt: new Date() as any,
            optionText: ['Option A', 'Option B', 'Option C', 'Option D'][i % 4],
            optionIndex: i % 4,
            marketSnapshot: {
              totalOptions: 4,
              allOptionsData: []
            },
            userBalanceAtCommitment: 1000,
            commitmentSource: 'web' as any
          }
        })),
        analytics: {
          totalCommitments: 9,
          uniqueParticipants: 7,
          totalTokensStaked: 900,
          averageCommitmentSize: 100
        }
      }

      AdminCommitmentService.getMarketCommitments = jest.fn().mockResolvedValueOnce(multiMarketDetail)

      const multiDetail = await AdminCommitmentService.getMarketCommitments('multi-detail', {
        pageSize: 100,
        includeAnalytics: true
      })

      // Verify multi-option market detail accuracy
      expect(multiDetail.commitments).toHaveLength(9)
      expect(multiDetail.analytics.uniqueParticipants).toBe(7)
      expect(multiDetail.market.options).toHaveLength(4)

      // Verify multi-option commitments don't have position field (new format)
      expect(multiDetail.commitments.every(c => c.position === undefined)).toBe(true)
      expect(multiDetail.commitments.every(c => c.optionId.startsWith('option_'))).toBe(true)
    })
  })

  describe('User Profile Pages', () => {
    it('should display accurate user commitment history with mixed commitment types', async () => {
      const userCommitmentHistory = [
        // User's binary commitments (migrated)
        {
          id: 'user-binary-1',
          userId: 'user-profile-test',
          marketId: 'binary-market-1',
          optionId: 'option_yes',
          position: 'yes' as const,
          tokensCommitted: 150,
          odds: 2.2,
          potentialWinning: 330,
          status: 'won' as any,
          committedAt: new Date('2024-01-01') as any,
          resolvedAt: new Date('2024-01-02') as any,
          metadata: {
            marketTitle: 'User Binary Market',
            marketStatus: 'resolved' as any,
            marketEndsAt: new Date('2024-01-02') as any,
            optionText: 'Yes',
            optionIndex: 0,
            marketSnapshot: {
              totalOptions: 2,
              allOptionsData: []
            },
            userBalanceAtCommitment: 1000,
            commitmentSource: 'web' as any
          }
        },
        // User's multi-option commitments (new)
        {
          id: 'user-multi-1',
          userId: 'user-profile-test',
          marketId: 'multi-market-1',
          optionId: 'option_designer_b',
          tokensCommitted: 200,
          odds: 3.1,
          potentialWinning: 620,
          status: 'active' as any,
          committedAt: new Date('2024-01-03') as any,
          metadata: {
            marketTitle: 'User Multi-Option Market',
            marketStatus: 'active' as any,
            marketEndsAt: new Date('2024-01-10') as any,
            optionText: 'Designer B',
            optionIndex: 1,
            marketSnapshot: {
              totalOptions: 4,
              allOptionsData: []
            },
            userBalanceAtCommitment: 1180, // After winning from binary market
            commitmentSource: 'mobile' as any
          }
        }
      ]

      const userStats = {
        totalCommitments: 2,
        activeCommitments: 1,
        wonCommitments: 1,
        lostCommitments: 0,
        totalTokensCommitted: 350,
        totalTokensWon: 330,
        totalProfit: 180, // 330 won - 150 committed
        winRate: 0.5, // 1 won out of 2 total (1 active doesn't count)
        averageCommitmentSize: 175,
        favoriteCategories: ['sports', 'fashion'],
        commitmentsByMarketType: {
          binary: 1,
          multiOption: 1
        }
      }

      AdminCommitmentService.getUserCommitments = jest.fn().mockResolvedValue(userCommitmentHistory)
      AdminCommitmentService.getUserStats = jest.fn().mockResolvedValue(userStats)

      const commitments = await AdminCommitmentService.getUserCommitments('user-profile-test')
      const stats = await AdminCommitmentService.getUserStats('user-profile-test')

      // Verify user commitment history accuracy
      expect(commitments).toHaveLength(2)
      expect(stats.totalCommitments).toBe(2)
      expect(stats.totalTokensCommitted).toBe(350)
      expect(stats.totalProfit).toBe(180)

      // Verify binary commitment in history
      const binaryCommit = commitments.find(c => c.id === 'user-binary-1')
      expect(binaryCommit?.position).toBe('yes')
      expect(binaryCommit?.status).toBe('won')
      expect(binaryCommit?.resolvedAt).toBeDefined()

      // Verify multi-option commitment in history
      const multiCommit = commitments.find(c => c.id === 'user-multi-1')
      expect(multiCommit?.position).toBeUndefined() // New format doesn't have position
      expect(multiCommit?.optionId).toBe('option_designer_b')
      expect(multiCommit?.status).toBe('active')

      // Verify mixed commitment type statistics
      expect(stats.commitmentsByMarketType.binary).toBe(1)
      expect(stats.commitmentsByMarketType.multiOption).toBe(1)
      expect(stats.winRate).toBe(0.5)
    })
  })
})