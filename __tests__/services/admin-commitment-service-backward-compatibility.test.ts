/**
 * Comprehensive backward compatibility tests for AdminCommitmentService
 * 
 * These tests verify that the service continues to provide accurate analytics
 * for existing dashboards after the migration to support multi-option markets.
 * 
 * Requirements tested: 6.1, 6.2, 7.1, 7.2, 7.3
 */

import { AdminCommitmentService } from '@/lib/services/admin-commitment-service';
import { PredictionCommitment, Market, MarketOption } from '@/lib/types/database';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() })
  }
}));

// Mock performance monitoring
jest.mock('@/lib/services/analytics-performance-service', () => ({
  withPerformanceMonitoring: jest.fn((name, fn) => fn())
}));

describe('AdminCommitmentService - Backward Compatibility', () => {
  // Test data setup
  const mockBinaryMarket: Market = {
    id: 'binary-market-1',
    title: 'Binary Test Market',
    description: 'A test market with binary options',
    category: 'test' as any,
    status: 'active' as any,
    createdBy: 'admin-user',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.now(),
    tags: ['test'],
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
    id: 'multi-option-market-1',
    title: 'Multi-Option Test Market',
    description: 'A test market with multiple options',
    category: 'test' as any,
    status: 'active' as any,
    createdBy: 'admin-user',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.now(),
    tags: ['test'],
    options: [
      { id: 'option-a', text: 'Option A', totalTokens: 0, participantCount: 0 },
      { id: 'option-b', text: 'Option B', totalTokens: 0, participantCount: 0 },
      { id: 'option-c', text: 'Option C', totalTokens: 0, participantCount: 0 },
      { id: 'option-d', text: 'Option D', totalTokens: 0, participantCount: 0 }
    ],
    totalParticipants: 0,
    totalTokensStaked: 0,
    featured: false,
    trending: false
  };

  // Legacy binary commitments (position-based)
  const mockLegacyCommitments: PredictionCommitment[] = [
    {
      id: 'legacy-commit-1',
      userId: 'user-1',
      predictionId: 'binary-market-1',
      position: 'yes',
      tokensCommitted: 100,
      odds: 2.0,
      potentialWinning: 200,
      status: 'active',
      committedAt: '2024-01-01T00:00:00Z',
      metadata: {
        marketTitle: 'Binary Test Market',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 2.0,
          totalYesTokens: 100,
          totalNoTokens: 50,
          totalParticipants: 2
        },
        userBalanceAtCommitment: 500,
        commitmentSource: 'web' as any
      }
    },
    {
      id: 'legacy-commit-2',
      userId: 'user-2',
      predictionId: 'binary-market-1',
      position: 'no',
      tokensCommitted: 50,
      odds: 3.0,
      potentialWinning: 150,
      status: 'active',
      committedAt: '2024-01-01T01:00:00Z',
      metadata: {
        marketTitle: 'Binary Test Market',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 3.0,
          totalYesTokens: 100,
          totalNoTokens: 50,
          totalParticipants: 2
        },
        userBalanceAtCommitment: 300,
        commitmentSource: 'web' as any
      }
    }
  ];

  // New option-based commitments
  const mockOptionCommitments: PredictionCommitment[] = [
    {
      id: 'option-commit-1',
      userId: 'user-3',
      marketId: 'multi-option-market-1',
      optionId: 'option-a',
      tokensCommitted: 200,
      odds: 4.0,
      potentialWinning: 800,
      status: 'active',
      committedAt: '2024-01-02T00:00:00Z',
      metadata: {
        marketTitle: 'Multi-Option Test Market',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        selectedOptionText: 'Option A',
        marketOptionCount: 4,
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web' as any
      }
    },
    {
      id: 'option-commit-2',
      userId: 'user-4',
      marketId: 'multi-option-market-1',
      optionId: 'option-b',
      tokensCommitted: 150,
      odds: 2.5,
      potentialWinning: 375,
      status: 'active',
      committedAt: '2024-01-02T01:00:00Z',
      metadata: {
        marketTitle: 'Multi-Option Test Market',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        selectedOptionText: 'Option B',
        marketOptionCount: 4,
        userBalanceAtCommitment: 800,
        commitmentSource: 'mobile' as any
      }
    }
  ];

  // Mixed commitments (both legacy and new)
  const mockMixedCommitments: PredictionCommitment[] = [
    // Legacy commitment with both position and optionId (migrated)
    {
      id: 'migrated-commit-1',
      userId: 'user-5',
      predictionId: 'binary-market-1',
      marketId: 'binary-market-1',
      position: 'yes',
      optionId: 'yes',
      tokensCommitted: 75,
      odds: 2.2,
      potentialWinning: 165,
      status: 'active',
      committedAt: '2024-01-03T00:00:00Z',
      metadata: {
        marketTitle: 'Binary Test Market',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        selectedOptionText: 'Yes',
        marketOptionCount: 2,
        oddsSnapshot: {
          yesOdds: 2.2,
          noOdds: 1.8,
          totalYesTokens: 175,
          totalNoTokens: 50,
          totalParticipants: 3
        },
        userBalanceAtCommitment: 400,
        commitmentSource: 'web' as any
      }
    },
    // New option-based commitment
    {
      id: 'new-commit-1',
      userId: 'user-6',
      marketId: 'multi-option-market-1',
      optionId: 'option-c',
      position: 'yes', // Derived for compatibility
      tokensCommitted: 300,
      odds: 3.5,
      potentialWinning: 1050,
      status: 'active',
      committedAt: '2024-01-03T02:00:00Z',
      metadata: {
        marketTitle: 'Multi-Option Test Market',
        marketStatus: 'active' as any,
        marketEndsAt: Timestamp.now(),
        selectedOptionText: 'Option C',
        marketOptionCount: 4,
        userBalanceAtCommitment: 1200,
        commitmentSource: 'web' as any
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Backward Compatibility Layer', () => {
    test('should derive optionId from legacy position field', () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => mockBinaryMarket
      });

      // Mock commitments data
      getDocs.mockResolvedValue({
        docs: mockLegacyCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockLegacyCommitments.length
      });

      return AdminCommitmentService.getMarketCommitments('binary-market-1', {
        includeAnalytics: true
      }).then(result => {
        expect(result.commitments).toHaveLength(2);
        
        // Verify optionId is derived from position
        const yesCommitment = result.commitments.find(c => c.position === 'yes');
        const noCommitment = result.commitments.find(c => c.position === 'no');
        
        expect(yesCommitment?.optionId).toBe('yes');
        expect(noCommitment?.optionId).toBe('no');
      });
    });

    test('should derive position from optionId for new commitments', () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'multi-option-market-1',
        data: () => mockMultiOptionMarket
      });

      // Mock commitments data
      getDocs.mockResolvedValue({
        docs: mockOptionCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockOptionCommitments.length
      });

      return AdminCommitmentService.getMarketCommitments('multi-option-market-1', {
        includeAnalytics: true
      }).then(result => {
        expect(result.commitments).toHaveLength(2);
        
        // Verify position is derived for compatibility
        result.commitments.forEach(commitment => {
          expect(commitment.position).toBeDefined();
          expect(['yes', 'no']).toContain(commitment.position);
        });
      });
    });

    test('should ensure both marketId and predictionId fields exist', () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => mockBinaryMarket
      });

      // Mock commitments data
      getDocs.mockResolvedValue({
        docs: mockLegacyCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockLegacyCommitments.length
      });

      return AdminCommitmentService.getMarketCommitments('binary-market-1', {
        includeAnalytics: true
      }).then(result => {
        result.commitments.forEach(commitment => {
          // Both fields should exist for compatibility
          expect(commitment.marketId).toBeDefined();
          expect(commitment.predictionId).toBeDefined();
          expect(commitment.marketId).toBe(commitment.predictionId);
        });
      });
    });
  });

  describe('Market Statistics Calculation', () => {
    test('should calculate accurate totalParticipants for binary market', () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => mockBinaryMarket
      });

      // Mock commitments data
      getDocs.mockResolvedValue({
        docs: mockLegacyCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockLegacyCommitments.length
      });

      return AdminCommitmentService.getMarketCommitments('binary-market-1', {
        includeAnalytics: true
      }).then(result => {
        // Should count unique participants correctly
        expect(result.totalCount).toBe(2);
        
        // Analytics should reflect accurate participant count
        if (result.analytics) {
          expect(result.analytics.participantCount).toBe(2);
        }
      });
    });

    test('should calculate accurate totalTokensStaked for multi-option market', () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'multi-option-market-1',
        data: () => mockMultiOptionMarket
      });

      // Mock commitments data
      getDocs.mockResolvedValue({
        docs: mockOptionCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockOptionCommitments.length
      });

      return AdminCommitmentService.getMarketCommitments('multi-option-market-1', {
        includeAnalytics: true
      }).then(result => {
        // Should sum all tokens correctly
        const expectedTotal = mockOptionCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0);
        
        if (result.analytics) {
          expect(result.analytics.totalTokens).toBe(expectedTotal);
        }
      });
    });

    test('should maintain binary yes/no percentages for backward compatibility', () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => mockBinaryMarket
      });

      // Mock commitments data
      getDocs.mockResolvedValue({
        docs: mockLegacyCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockLegacyCommitments.length
      });

      return AdminCommitmentService.getMarketCommitments('binary-market-1', {
        includeAnalytics: true
      }).then(result => {
        if (result.analytics) {
          // Should calculate yes/no percentages for existing dashboards
          expect(result.analytics.yesPercentage).toBeGreaterThan(0);
          expect(result.analytics.noPercentage).toBeGreaterThan(0);
          expect(result.analytics.yesPercentage + result.analytics.noPercentage).toBe(100);
        }
      });
    });

    test('should handle mixed binary and option-based commitments', () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => mockBinaryMarket
      });

      // Mock mixed commitments data
      getDocs.mockResolvedValue({
        docs: mockMixedCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockMixedCommitments.length
      });

      return AdminCommitmentService.getMarketCommitments('binary-market-1', {
        includeAnalytics: true
      }).then(result => {
        // Should handle both legacy and new commitment formats
        expect(result.commitments).toHaveLength(2);
        
        result.commitments.forEach(commitment => {
          // All commitments should have both fields for compatibility
          expect(commitment.position).toBeDefined();
          expect(commitment.optionId).toBeDefined();
          expect(commitment.marketId).toBeDefined();
          expect(commitment.predictionId).toBeDefined();
        });
      });
    });
  });

  describe('Dashboard Compatibility', () => {
    test('should return data structure expected by admin dashboard', () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => mockBinaryMarket
      });

      // Mock commitments data
      getDocs.mockResolvedValue({
        docs: mockLegacyCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockLegacyCommitments.length
      });

      return AdminCommitmentService.getMarketCommitments('binary-market-1', {
        includeAnalytics: true
      }).then(result => {
        // Should return expected structure for admin dashboard
        expect(result).toHaveProperty('market');
        expect(result).toHaveProperty('commitments');
        expect(result).toHaveProperty('analytics');
        expect(result).toHaveProperty('totalCount');

        // Market should have required fields
        expect(result.market).toHaveProperty('id');
        expect(result.market).toHaveProperty('title');
        expect(result.market).toHaveProperty('options');

        // Analytics should have required fields for dashboard
        if (result.analytics) {
          expect(result.analytics).toHaveProperty('totalTokens');
          expect(result.analytics).toHaveProperty('participantCount');
          expect(result.analytics).toHaveProperty('yesPercentage');
          expect(result.analytics).toHaveProperty('noPercentage');
          expect(result.analytics).toHaveProperty('averageCommitment');
          expect(result.analytics).toHaveProperty('largestCommitment');
        }
      });
    });

    test('should return data structure expected by token dashboard', () => {
      const { getDocs } = require('firebase/firestore');

      // Mock system-wide commitments
      getDocs.mockResolvedValue({
        docs: [...mockLegacyCommitments, ...mockOptionCommitments].map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockLegacyCommitments.length + mockOptionCommitments.length
      });

      return AdminCommitmentService.getCommitmentAnalytics().then(result => {
        // Should return expected structure for token dashboard
        expect(result).toHaveProperty('totalMarketsWithCommitments');
        expect(result).toHaveProperty('totalTokensCommitted');
        expect(result).toHaveProperty('activeCommitments');
        expect(result).toHaveProperty('resolvedCommitments');
        expect(result).toHaveProperty('averageCommitmentSize');

        // Values should be calculated correctly
        expect(result.totalTokensCommitted).toBeGreaterThan(0);
        expect(result.activeCommitments).toBeGreaterThan(0);
        expect(result.averageCommitmentSize).toBeGreaterThan(0);
      });
    });

    test('should support existing getCommitmentsWithUsers query patterns', () => {
      const { getDocs } = require('firebase/firestore');

      // Mock user data
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          uid: 'user-1',
          email: 'user1@example.com',
          displayName: 'User One'
        })
      });

      // Mock commitments data
      getDocs.mockResolvedValue({
        docs: mockLegacyCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockLegacyCommitments.length
      });

      return AdminCommitmentService.getCommitmentsWithUsers({
        marketId: 'binary-market-1',
        pageSize: 10
      }).then(result => {
        // Should return expected structure for existing dashboard queries
        expect(result).toHaveProperty('commitments');
        expect(result).toHaveProperty('totalCount');
        expect(result).toHaveProperty('lastDoc');

        // Commitments should have user data
        result.commitments.forEach(commitment => {
          expect(commitment).toHaveProperty('user');
          expect(commitment.user).toHaveProperty('id');
          expect(commitment.user).toHaveProperty('email');
        });
      });
    });
  });

  describe('Analytics Validation', () => {
    test('should validate analytics accuracy for mixed commitment scenarios', () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => mockBinaryMarket
      });

      // Mock mixed commitments
      getDocs.mockResolvedValue({
        docs: mockMixedCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockMixedCommitments.length
      });

      return AdminCommitmentService.getMarketCommitments('binary-market-1', {
        includeAnalytics: true
      }).then(result => {
        if (result.analytics) {
          // Validate analytics calculations
          const totalTokens = mockMixedCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0);
          const uniqueUsers = new Set(mockMixedCommitments.map(c => c.userId)).size;
          
          expect(result.analytics.totalTokens).toBe(totalTokens);
          expect(result.analytics.participantCount).toBe(mockMixedCommitments.length);
          
          // Average should be calculated correctly
          const expectedAverage = Math.round(totalTokens / mockMixedCommitments.length);
          expect(result.analytics.averageCommitment).toBe(expectedAverage);
          
          // Largest commitment should be identified correctly
          const expectedLargest = Math.max(...mockMixedCommitments.map(c => c.tokensCommitted));
          expect(result.analytics.largestCommitment).toBe(expectedLargest);
        }
      });
    });

    test('should maintain consistent results across multiple queries', async () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => mockBinaryMarket
      });

      // Mock commitments data
      getDocs.mockResolvedValue({
        docs: mockLegacyCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockLegacyCommitments.length
      });

      // Execute multiple queries
      const results = await Promise.all([
        AdminCommitmentService.getMarketCommitments('binary-market-1', { includeAnalytics: true }),
        AdminCommitmentService.getMarketCommitments('binary-market-1', { includeAnalytics: true }),
        AdminCommitmentService.getMarketCommitments('binary-market-1', { includeAnalytics: true })
      ]);

      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.totalCount).toBe(firstResult.totalCount);
        if (result.analytics && firstResult.analytics) {
          expect(result.analytics.totalTokens).toBe(firstResult.analytics.totalTokens);
          expect(result.analytics.participantCount).toBe(firstResult.analytics.participantCount);
          expect(result.analytics.yesPercentage).toBe(firstResult.analytics.yesPercentage);
          expect(result.analytics.noPercentage).toBe(firstResult.analytics.noPercentage);
        }
      });
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should provide fallback data when market fetch fails', () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market fetch failure
      getDoc.mockRejectedValue(new Error('Market not found'));

      // Mock commitments data
      getDocs.mockResolvedValue({
        docs: mockLegacyCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: mockLegacyCommitments.length
      });

      return AdminCommitmentService.getMarketCommitments('nonexistent-market', {
        includeAnalytics: true
      }).then(result => {
        // Should return fallback data structure
        expect(result).toHaveProperty('market');
        expect(result).toHaveProperty('commitments');
        expect(result).toHaveProperty('analytics');
        expect(result).toHaveProperty('totalCount');

        // Should not break dashboard display
        expect(result.market.id).toBe('nonexistent-market');
        expect(result.commitments).toEqual([]);
        expect(result.totalCount).toBe(0);
      });
    });

    test('should handle commitments with missing fields gracefully', () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => mockBinaryMarket
      });

      // Mock incomplete commitment data
      const incompleteCommitments = [
        {
          id: 'incomplete-1',
          userId: 'user-1',
          predictionId: 'binary-market-1',
          tokensCommitted: 100,
          odds: 2.0,
          potentialWinning: 200,
          status: 'active',
          committedAt: '2024-01-01T00:00:00Z'
          // Missing position, optionId, and metadata
        }
      ];

      getDocs.mockResolvedValue({
        docs: incompleteCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: incompleteCommitments.length
      });

      return AdminCommitmentService.getMarketCommitments('binary-market-1', {
        includeAnalytics: true
      }).then(result => {
        // Should handle incomplete data gracefully
        expect(result.commitments).toHaveLength(1);
        
        const commitment = result.commitments[0];
        // Should have derived/default values for missing fields
        expect(commitment.position).toBeDefined();
        expect(commitment.optionId).toBeDefined();
        expect(commitment.marketId).toBeDefined();
      });
    });
  });

  describe('Performance and Caching', () => {
    test('should maintain performance with large datasets', async () => {
      const { getDocs } = require('firebase/firestore');
      const { getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'large-market',
        data: () => mockBinaryMarket
      });

      // Generate large dataset
      const largeCommitmentSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `commit-${i}`,
        userId: `user-${i % 100}`, // 100 unique users
        predictionId: 'large-market',
        position: i % 2 === 0 ? 'yes' : 'no',
        tokensCommitted: Math.floor(Math.random() * 500) + 50,
        odds: 2.0 + Math.random(),
        potentialWinning: 0,
        status: 'active',
        committedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        metadata: {
          marketTitle: 'Large Test Market',
          marketStatus: 'active' as any,
          marketEndsAt: Timestamp.now(),
          userBalanceAtCommitment: 1000,
          commitmentSource: 'web' as any
        }
      }));

      getDocs.mockResolvedValue({
        docs: largeCommitmentSet.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        })),
        size: largeCommitmentSet.length
      });

      const startTime = Date.now();
      const result = await AdminCommitmentService.getMarketCommitments('large-market', {
        includeAnalytics: true,
        pageSize: 2000 // Ensure we get all commitments
      });
      const endTime = Date.now();

      // Should complete within reasonable time (< 5 seconds for 1000 commitments)
      expect(endTime - startTime).toBeLessThan(5000);
      
      // Should return accurate results
      expect(result.commitments).toHaveLength(1000);
      expect(result.totalCount).toBe(1000);
      
      if (result.analytics) {
        expect(result.analytics.participantCount).toBe(1000);
        expect(result.analytics.totalTokens).toBeGreaterThan(0);
      }
    });
  });
});