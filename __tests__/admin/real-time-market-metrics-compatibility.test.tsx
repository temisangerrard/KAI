/**
 * Real-time Market Metrics Compatibility Tests
 * 
 * Verifies that real-time market metrics calculation works correctly with both
 * binary and multi-option commitments, ensuring accurate statistics are displayed
 * across all dashboard components.
 */

import { AdminCommitmentService } from '@/lib/services/admin-commitment-service';
import { AdminDashboardService } from '@/lib/services/admin-dashboard-service';
import { Market, MarketOption } from '@/lib/types/database';
import { PredictionCommitment } from '@/lib/types/token';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  Timestamp: {
    now: () => ({ toMillis: () => Date.now() })
  }
}));

// Mock AdminCommitmentService
jest.mock('@/lib/services/admin-commitment-service');

// Mock AdminDashboardService
jest.mock('@/lib/services/admin-dashboard-service');

describe('Real-time Market Metrics Compatibility', () => {
  const now = Date.now();

  // Test data setup
  const mockBinaryMarket: Market = {
    id: 'binary-market-123',
    title: 'Will it rain tomorrow?',
    description: 'Binary market with yes/no options',
    category: 'weather' as any,
    status: 'active' as any,
    createdBy: 'user-123',
    createdAt: { toMillis: () => now - 7 * 24 * 60 * 60 * 1000 } as any,
    endsAt: { toMillis: () => now + 24 * 60 * 60 * 1000 } as any,
    tags: ['weather'],
    options: [
      { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
      { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
    ],
    totalParticipants: 0,
    totalTokensStaked: 0,
    featured: false,
    trending: false
  };

  const mockMultiOptionMarket: Market = {
    id: 'multi-option-market-456',
    title: 'Who will win the fashion award?',
    description: 'Multi-option market with 4 designers',
    category: 'fashion' as any,
    status: 'active' as any,
    createdBy: 'user-456',
    createdAt: { toMillis: () => now - 5 * 24 * 60 * 60 * 1000 } as any,
    endsAt: { toMillis: () => now + 10 * 24 * 60 * 60 * 1000 } as any,
    tags: ['fashion', 'awards'],
    options: [
      { id: 'designer-a', text: 'Designer A', totalTokens: 0, participantCount: 0 },
      { id: 'designer-b', text: 'Designer B', totalTokens: 0, participantCount: 0 },
      { id: 'designer-c', text: 'Designer C', totalTokens: 0, participantCount: 0 },
      { id: 'designer-d', text: 'Designer D', totalTokens: 0, participantCount: 0 }
    ],
    totalParticipants: 0,
    totalTokensStaked: 0,
    featured: true,
    trending: false
  };

  // Complex commitment scenario with multiple users and commitments
  const mockComplexCommitments: PredictionCommitment[] = [
    // Binary market commitments
    {
      id: 'commit-1',
      userId: 'user-1',
      marketId: 'binary-market-123',
      predictionId: 'binary-market-123',
      optionId: 'yes',
      position: 'yes',
      tokensCommitted: 100,
      odds: 1.67,
      potentialWinning: 167,
      status: 'active',
      committedAt: '2024-01-15T10:00:00Z',
      metadata: {
        marketTitle: 'Will it rain tomorrow?',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        optionText: 'Yes',
        optionIndex: 0,
        marketSnapshot: {
          totalOptions: 2,
          allOptionsData: []
        },
        userBalanceAtCommitment: 500,
        commitmentSource: 'web' as any
      }
    },
    {
      id: 'commit-2',
      userId: 'user-1', // Same user, different commitment
      marketId: 'binary-market-123',
      predictionId: 'binary-market-123',
      optionId: 'yes',
      position: 'yes',
      tokensCommitted: 50,
      odds: 1.67,
      potentialWinning: 83.5,
      status: 'active',
      committedAt: '2024-01-15T11:00:00Z',
      metadata: {
        marketTitle: 'Will it rain tomorrow?',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        optionText: 'Yes',
        optionIndex: 0,
        marketSnapshot: {
          totalOptions: 2,
          allOptionsData: []
        },
        userBalanceAtCommitment: 450,
        commitmentSource: 'mobile' as any
      }
    },
    {
      id: 'commit-3',
      userId: 'user-2',
      marketId: 'binary-market-123',
      predictionId: 'binary-market-123',
      optionId: 'no',
      position: 'no',
      tokensCommitted: 200,
      odds: 2.5,
      potentialWinning: 500,
      status: 'active',
      committedAt: '2024-01-15T12:00:00Z',
      metadata: {
        marketTitle: 'Will it rain tomorrow?',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        optionText: 'No',
        optionIndex: 1,
        marketSnapshot: {
          totalOptions: 2,
          allOptionsData: []
        },
        userBalanceAtCommitment: 300,
        commitmentSource: 'web' as any
      }
    },
    {
      id: 'commit-4',
      userId: 'user-3',
      marketId: 'binary-market-123',
      predictionId: 'binary-market-123',
      optionId: 'no',
      position: 'no',
      tokensCommitted: 75,
      odds: 2.5,
      potentialWinning: 187.5,
      status: 'active',
      committedAt: '2024-01-15T13:00:00Z',
      metadata: {
        marketTitle: 'Will it rain tomorrow?',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        optionText: 'No',
        optionIndex: 1,
        marketSnapshot: {
          totalOptions: 2,
          allOptionsData: []
        },
        userBalanceAtCommitment: 400,
        commitmentSource: 'web' as any
      }
    },

    // Multi-option market commitments
    {
      id: 'commit-5',
      userId: 'user-4',
      marketId: 'multi-option-market-456',
      predictionId: 'multi-option-market-456',
      optionId: 'designer-a',
      position: 'yes', // Derived for backward compatibility
      tokensCommitted: 300,
      odds: 3.75,
      potentialWinning: 1125,
      status: 'active',
      committedAt: '2024-01-15T14:00:00Z',
      metadata: {
        marketTitle: 'Who will win the fashion award?',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        optionText: 'Designer A',
        optionIndex: 0,
        marketSnapshot: {
          totalOptions: 4,
          allOptionsData: []
        },
        userBalanceAtCommitment: 800,
        commitmentSource: 'web' as any
      }
    },
    {
      id: 'commit-6',
      userId: 'user-4', // Same user, different option
      marketId: 'multi-option-market-456',
      predictionId: 'multi-option-market-456',
      optionId: 'designer-b',
      position: 'no', // Derived for backward compatibility
      tokensCommitted: 150,
      odds: 2.5,
      potentialWinning: 375,
      status: 'active',
      committedAt: '2024-01-15T15:00:00Z',
      metadata: {
        marketTitle: 'Who will win the fashion award?',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        optionText: 'Designer B',
        optionIndex: 1,
        marketSnapshot: {
          totalOptions: 4,
          allOptionsData: []
        },
        userBalanceAtCommitment: 500,
        commitmentSource: 'mobile' as any
      }
    },
    {
      id: 'commit-7',
      userId: 'user-5',
      marketId: 'multi-option-market-456',
      predictionId: 'multi-option-market-456',
      optionId: 'designer-b',
      position: 'no', // Derived for backward compatibility
      tokensCommitted: 400,
      odds: 2.5,
      potentialWinning: 1000,
      status: 'active',
      committedAt: '2024-01-15T16:00:00Z',
      metadata: {
        marketTitle: 'Who will win the fashion award?',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        optionText: 'Designer B',
        optionIndex: 1,
        marketSnapshot: {
          totalOptions: 4,
          allOptionsData: []
        },
        userBalanceAtCommitment: 600,
        commitmentSource: 'web' as any
      }
    },
    {
      id: 'commit-8',
      userId: 'user-6',
      marketId: 'multi-option-market-456',
      predictionId: 'multi-option-market-456',
      optionId: 'designer-c',
      position: 'no', // Derived for backward compatibility
      tokensCommitted: 100,
      odds: 5.0,
      potentialWinning: 500,
      status: 'active',
      committedAt: '2024-01-15T17:00:00Z',
      metadata: {
        marketTitle: 'Who will win the fashion award?',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        optionText: 'Designer C',
        optionIndex: 2,
        marketSnapshot: {
          totalOptions: 4,
          allOptionsData: []
        },
        userBalanceAtCommitment: 300,
        commitmentSource: 'web' as any
      }
    },
    {
      id: 'commit-9',
      userId: 'user-7',
      marketId: 'multi-option-market-456',
      predictionId: 'multi-option-market-456',
      optionId: 'designer-d',
      position: 'no', // Derived for backward compatibility
      tokensCommitted: 50,
      odds: 7.5,
      potentialWinning: 375,
      status: 'active',
      committedAt: '2024-01-15T18:00:00Z',
      metadata: {
        marketTitle: 'Who will win the fashion award?',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        optionText: 'Designer D',
        optionIndex: 3,
        marketSnapshot: {
          totalOptions: 4,
          allOptionsData: []
        },
        userBalanceAtCommitment: 200,
        commitmentSource: 'mobile' as any
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Binary Market Metrics Calculation', () => {
    it('should calculate accurate participant counts with multiple commitments per user', async () => {
      const mockService = AdminCommitmentService as jest.Mocked<typeof AdminCommitmentService>;
      
      const binaryCommitments = mockComplexCommitments.filter(c => c.marketId === 'binary-market-123');
      
      mockService.getMarketCommitments.mockResolvedValue({
        market: mockBinaryMarket,
        commitments: binaryCommitments.map(c => ({
          ...c,
          user: { id: c.userId, email: `${c.userId}@example.com`, displayName: `User ${c.userId}` }
        })),
        analytics: {
          totalTokens: 425, // 100 + 50 + 200 + 75
          participantCount: 4, // Total commitments
          yesPercentage: 35, // (100 + 50) / 425 ≈ 35%
          noPercentage: 65, // (200 + 75) / 425 ≈ 65%
          averageCommitment: 106, // 425 / 4 ≈ 106
          largestCommitment: 200,
          commitmentTrend: []
        },
        totalCount: 4
      });

      const result = await AdminCommitmentService.getMarketCommitments('binary-market-123', {
        includeAnalytics: true
      });

      // Verify total commitments
      expect(result.totalCount).toBe(4);
      
      // Verify unique participants (user-1, user-2, user-3 = 3 unique users)
      const uniqueUsers = new Set(binaryCommitments.map(c => c.userId));
      expect(uniqueUsers.size).toBe(3);
      
      // Verify token calculations
      expect(result.analytics!.totalTokens).toBe(425);
      expect(result.analytics!.yesPercentage).toBe(35);
      expect(result.analytics!.noPercentage).toBe(65);
      
      // Verify option-level calculations
      const yesTokens = binaryCommitments
        .filter(c => c.optionId === 'yes')
        .reduce((sum, c) => sum + c.tokensCommitted, 0);
      expect(yesTokens).toBe(150); // 100 + 50
      
      const noTokens = binaryCommitments
        .filter(c => c.optionId === 'no')
        .reduce((sum, c) => sum + c.tokensCommitted, 0);
      expect(noTokens).toBe(275); // 200 + 75
    });

    it('should handle backward compatibility with position-based filtering', async () => {
      const mockService = AdminCommitmentService as jest.Mocked<typeof AdminCommitmentService>;
      
      const yesCommitments = mockComplexCommitments.filter(c => 
        c.marketId === 'binary-market-123' && c.position === 'yes'
      );
      
      mockService.getCommitmentsWithUsers.mockResolvedValue({
        commitments: yesCommitments.map(c => ({
          ...c,
          user: { id: c.userId, email: `${c.userId}@example.com`, displayName: `User ${c.userId}` }
        })),
        totalCount: yesCommitments.length
      });

      const result = await AdminCommitmentService.getCommitmentsWithUsers({
        marketId: 'binary-market-123',
        position: 'yes',
        pageSize: 50
      });

      // Should return only 'yes' position commitments
      expect(result.commitments).toHaveLength(2);
      result.commitments.forEach(commitment => {
        expect(commitment.position).toBe('yes');
        expect(commitment.optionId).toBe('yes');
      });
    });
  });

  describe('Multi-Option Market Metrics Calculation', () => {
    it('should calculate accurate metrics across all options', async () => {
      const mockService = AdminCommitmentService as jest.Mocked<typeof AdminCommitmentService>;
      
      const multiOptionCommitments = mockComplexCommitments.filter(c => c.marketId === 'multi-option-market-456');
      
      // Calculate expected option-level metrics
      const optionBreakdown = multiOptionCommitments.reduce((acc, commitment) => {
        if (!acc[commitment.optionId]) {
          acc[commitment.optionId] = { tokens: 0, participants: new Set() };
        }
        acc[commitment.optionId].tokens += commitment.tokensCommitted;
        acc[commitment.optionId].participants.add(commitment.userId);
        return acc;
      }, {} as Record<string, { tokens: number; participants: Set<string> }>);

      const updatedMarket = {
        ...mockMultiOptionMarket,
        options: [
          { 
            id: 'designer-a', 
            text: 'Designer A', 
            totalTokens: optionBreakdown['designer-a']?.tokens || 0,
            participantCount: optionBreakdown['designer-a']?.participants.size || 0
          },
          { 
            id: 'designer-b', 
            text: 'Designer B', 
            totalTokens: optionBreakdown['designer-b']?.tokens || 0,
            participantCount: optionBreakdown['designer-b']?.participants.size || 0
          },
          { 
            id: 'designer-c', 
            text: 'Designer C', 
            totalTokens: optionBreakdown['designer-c']?.tokens || 0,
            participantCount: optionBreakdown['designer-c']?.participants.size || 0
          },
          { 
            id: 'designer-d', 
            text: 'Designer D', 
            totalTokens: optionBreakdown['designer-d']?.tokens || 0,
            participantCount: optionBreakdown['designer-d']?.participants.size || 0
          }
        ],
        totalParticipants: new Set(multiOptionCommitments.map(c => c.userId)).size,
        totalTokensStaked: multiOptionCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      };

      mockService.getMarketCommitments.mockResolvedValue({
        market: updatedMarket,
        commitments: multiOptionCommitments.map(c => ({
          ...c,
          user: { id: c.userId, email: `${c.userId}@example.com`, displayName: `User ${c.userId}` }
        })),
        analytics: {
          totalTokens: 1000, // 300 + 150 + 400 + 100 + 50
          participantCount: 5, // Total commitments
          yesPercentage: 30, // Designer A (first option): 300/1000 = 30%
          noPercentage: 70, // Other options: 700/1000 = 70%
          averageCommitment: 200, // 1000/5 = 200
          largestCommitment: 400,
          commitmentTrend: []
        },
        totalCount: 5
      });

      const result = await AdminCommitmentService.getMarketCommitments('multi-option-market-456', {
        includeAnalytics: true
      });

      // Verify total metrics
      expect(result.totalCount).toBe(5);
      expect(result.analytics!.totalTokens).toBe(1000);
      
      // Verify unique participants (user-4, user-5, user-6, user-7 = 4 unique users)
      const uniqueUsers = new Set(multiOptionCommitments.map(c => c.userId));
      expect(uniqueUsers.size).toBe(4);
      expect(result.market.totalParticipants).toBe(4);
      
      // Verify option-level metrics
      expect(result.market.options[0].totalTokens).toBe(300); // Designer A
      expect(result.market.options[1].totalTokens).toBe(550); // Designer B (150 + 400)
      expect(result.market.options[2].totalTokens).toBe(100); // Designer C
      expect(result.market.options[3].totalTokens).toBe(50);  // Designer D
      
      // Verify participant counts per option
      expect(result.market.options[0].participantCount).toBe(1); // Designer A: user-4
      expect(result.market.options[1].participantCount).toBe(2); // Designer B: user-4, user-5
      expect(result.market.options[2].participantCount).toBe(1); // Designer C: user-6
      expect(result.market.options[3].participantCount).toBe(1); // Designer D: user-7
    });

    it('should handle option-based filtering correctly', async () => {
      const mockService = AdminCommitmentService as jest.Mocked<typeof AdminCommitmentService>;
      
      const designerBCommitments = mockComplexCommitments.filter(c => 
        c.marketId === 'multi-option-market-456' && c.optionId === 'designer-b'
      );
      
      mockService.getCommitmentsWithUsers.mockResolvedValue({
        commitments: designerBCommitments.map(c => ({
          ...c,
          user: { id: c.userId, email: `${c.userId}@example.com`, displayName: `User ${c.userId}` }
        })),
        totalCount: designerBCommitments.length
      });

      const result = await AdminCommitmentService.getCommitmentsWithUsers({
        marketId: 'multi-option-market-456',
        optionId: 'designer-b',
        pageSize: 50
      });

      // Should return only Designer B commitments
      expect(result.commitments).toHaveLength(2);
      result.commitments.forEach(commitment => {
        expect(commitment.optionId).toBe('designer-b');
      });
      
      // Verify token amounts
      const totalTokens = result.commitments.reduce((sum, c) => sum + c.tokensCommitted, 0);
      expect(totalTokens).toBe(550); // 150 + 400
    });
  });

  describe('Cross-Market Analytics', () => {
    it('should calculate accurate dashboard statistics across mixed market types', async () => {
      const mockDashboardService = AdminDashboardService as jest.Mocked<typeof AdminDashboardService>;
      
      // Mock dashboard stats that include both binary and multi-option markets
      mockDashboardService.getDashboardStats.mockResolvedValue({
        users: {
          totalUsers: 7, // All unique users across both markets
          activeUsers: 7, // All users are active
          newUsersToday: 2,
          newUsersThisWeek: 7
        },
        tokens: {
          totalTokensIssued: 10000,
          totalTokensInCirculation: 8575, // 10000 - 1425 (committed)
          totalTokensCommitted: 1425, // 425 (binary) + 1000 (multi-option)
          totalTokensAvailable: 7150
        },
        markets: {
          totalMarkets: 2,
          activeMarkets: 2,
          resolvedMarkets: 0,
          marketsCreatedToday: 0
        },
        activity: {
          dailyActiveUsers: 7,
          weeklyActiveUsers: 7,
          totalCommitments: 9, // 4 (binary) + 5 (multi-option)
          commitmentsToday: 9
        },
        financial: {
          totalRevenue: 1425, // Based on committed tokens
          dailyRevenue: 1425,
          weeklyRevenue: 1425,
          averageTransactionValue: 158 // 1425 / 9 ≈ 158
        }
      });

      const stats = await AdminDashboardService.getDashboardStats();

      // Verify cross-market calculations
      expect(stats.users.totalUsers).toBe(7);
      expect(stats.tokens.totalTokensCommitted).toBe(1425);
      expect(stats.activity.totalCommitments).toBe(9);
      expect(stats.financial.averageTransactionValue).toBe(158);
    });

    it('should handle real-time updates correctly', async () => {
      const mockService = AdminCommitmentService as jest.Mocked<typeof AdminCommitmentService>;
      
      // Simulate initial state
      const initialBinaryCommitments = mockComplexCommitments
        .filter(c => c.marketId === 'binary-market-123')
        .slice(0, 2); // First 2 commitments
      
      mockService.getMarketCommitments.mockResolvedValueOnce({
        market: mockBinaryMarket,
        commitments: initialBinaryCommitments.map(c => ({
          ...c,
          user: { id: c.userId, email: `${c.userId}@example.com`, displayName: `User ${c.userId}` }
        })),
        analytics: {
          totalTokens: 150, // 100 + 50
          participantCount: 2,
          yesPercentage: 100, // All tokens on 'yes'
          noPercentage: 0,
          averageCommitment: 75,
          largestCommitment: 100,
          commitmentTrend: []
        },
        totalCount: 2
      });

      const initialResult = await AdminCommitmentService.getMarketCommitments('binary-market-123', {
        includeAnalytics: true
      });

      expect(initialResult.analytics!.totalTokens).toBe(150);
      expect(initialResult.analytics!.yesPercentage).toBe(100);

      // Simulate real-time update with new commitments
      const updatedBinaryCommitments = mockComplexCommitments
        .filter(c => c.marketId === 'binary-market-123'); // All 4 commitments
      
      mockService.getMarketCommitments.mockResolvedValueOnce({
        market: mockBinaryMarket,
        commitments: updatedBinaryCommitments.map(c => ({
          ...c,
          user: { id: c.userId, email: `${c.userId}@example.com`, displayName: `User ${c.userId}` }
        })),
        analytics: {
          totalTokens: 425, // 100 + 50 + 200 + 75
          participantCount: 4,
          yesPercentage: 35, // (100 + 50) / 425 ≈ 35%
          noPercentage: 65, // (200 + 75) / 425 ≈ 65%
          averageCommitment: 106,
          largestCommitment: 200,
          commitmentTrend: []
        },
        totalCount: 4
      });

      const updatedResult = await AdminCommitmentService.getMarketCommitments('binary-market-123', {
        includeAnalytics: true
      });

      // Verify real-time updates
      expect(updatedResult.analytics!.totalTokens).toBe(425);
      expect(updatedResult.analytics!.yesPercentage).toBe(35);
      expect(updatedResult.analytics!.noPercentage).toBe(65);
      expect(updatedResult.totalCount).toBe(4);
    });
  });

  describe('Performance and Accuracy', () => {
    it('should maintain calculation accuracy with large datasets', async () => {
      const mockService = AdminCommitmentService as jest.Mocked<typeof AdminCommitmentService>;
      
      // Generate large dataset
      const largeCommitmentSet: PredictionCommitment[] = [];
      for (let i = 0; i < 1000; i++) {
        largeCommitmentSet.push({
          id: `commit-large-${i}`,
          userId: `user-${i % 100}`, // 100 unique users
          marketId: 'large-market',
          predictionId: 'large-market',
          optionId: `option-${i % 10}`, // 10 options
          position: i % 2 === 0 ? 'yes' : 'no',
          tokensCommitted: Math.floor(Math.random() * 100) + 1,
          odds: 2.0,
          potentialWinning: 0,
          status: 'active',
          committedAt: new Date().toISOString(),
          metadata: {
            marketTitle: 'Large Market',
            marketStatus: 'active' as any,
            marketEndsAt: Timestamp.now(),
            optionText: `Option ${i % 10}`,
            optionIndex: i % 10,
            marketSnapshot: {
              totalOptions: 10,
              allOptionsData: []
            },
            userBalanceAtCommitment: 1000,
            commitmentSource: 'web' as any
          }
        });
      }

      const totalTokens = largeCommitmentSet.reduce((sum, c) => sum + c.tokensCommitted, 0);
      const uniqueUsers = new Set(largeCommitmentSet.map(c => c.userId)).size;
      const uniqueOptions = new Set(largeCommitmentSet.map(c => c.optionId)).size;

      mockService.getMarketCommitments.mockResolvedValue({
        market: {
          ...mockMultiOptionMarket,
          id: 'large-market',
          totalParticipants: uniqueUsers,
          totalTokensStaked: totalTokens
        },
        commitments: largeCommitmentSet.map(c => ({
          ...c,
          user: { id: c.userId, email: `${c.userId}@example.com`, displayName: `User ${c.userId}` }
        })),
        analytics: {
          totalTokens,
          participantCount: largeCommitmentSet.length,
          yesPercentage: 50, // Approximately 50% due to random distribution
          noPercentage: 50,
          averageCommitment: Math.round(totalTokens / largeCommitmentSet.length),
          largestCommitment: Math.max(...largeCommitmentSet.map(c => c.tokensCommitted)),
          commitmentTrend: []
        },
        totalCount: largeCommitmentSet.length
      });

      const result = await AdminCommitmentService.getMarketCommitments('large-market', {
        includeAnalytics: true
      });

      // Verify accuracy with large dataset
      expect(result.totalCount).toBe(1000);
      expect(result.market.totalParticipants).toBe(100); // 100 unique users
      expect(result.analytics!.totalTokens).toBe(totalTokens);
      expect(result.analytics!.participantCount).toBe(1000); // Total commitments
      
      // Verify calculations are within expected ranges
      expect(result.analytics!.averageCommitment).toBeGreaterThan(0);
      expect(result.analytics!.largestCommitment).toBeGreaterThan(0);
      expect(result.analytics!.yesPercentage + result.analytics!.noPercentage).toBe(100);
    });

    it('should handle edge cases gracefully', async () => {
      const mockService = AdminCommitmentService as jest.Mocked<typeof AdminCommitmentService>;
      
      // Test with zero commitments
      mockService.getMarketCommitments.mockResolvedValueOnce({
        market: mockBinaryMarket,
        commitments: [],
        analytics: {
          totalTokens: 0,
          participantCount: 0,
          yesPercentage: 0,
          noPercentage: 0,
          averageCommitment: 0,
          largestCommitment: 0,
          commitmentTrend: []
        },
        totalCount: 0
      });

      const emptyResult = await AdminCommitmentService.getMarketCommitments('empty-market', {
        includeAnalytics: true
      });

      expect(emptyResult.totalCount).toBe(0);
      expect(emptyResult.analytics!.totalTokens).toBe(0);
      expect(emptyResult.analytics!.averageCommitment).toBe(0);

      // Test with single commitment
      const singleCommitment = [mockComplexCommitments[0]];
      
      mockService.getMarketCommitments.mockResolvedValueOnce({
        market: mockBinaryMarket,
        commitments: singleCommitment.map(c => ({
          ...c,
          user: { id: c.userId, email: `${c.userId}@example.com`, displayName: `User ${c.userId}` }
        })),
        analytics: {
          totalTokens: 100,
          participantCount: 1,
          yesPercentage: 100,
          noPercentage: 0,
          averageCommitment: 100,
          largestCommitment: 100,
          commitmentTrend: []
        },
        totalCount: 1
      });

      const singleResult = await AdminCommitmentService.getMarketCommitments('single-market', {
        includeAnalytics: true
      });

      expect(singleResult.totalCount).toBe(1);
      expect(singleResult.analytics!.totalTokens).toBe(100);
      expect(singleResult.analytics!.averageCommitment).toBe(100);
      expect(singleResult.analytics!.yesPercentage).toBe(100);
    });
  });
});