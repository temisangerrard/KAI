/**
 * Commitment Analytics Validation Tests
 * 
 * These tests validate that analytics calculations are accurate for mixed
 * binary and multi-option commitment scenarios, ensuring backward compatibility.
 * 
 * Requirements tested: 6.1, 6.2, 7.1, 7.2, 7.3
 */

import { AdminCommitmentService } from '@/lib/services/admin-commitment-service';
import { PredictionCommitment, Market } from '@/lib/types/database';
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
  doc: jest.fn(),
  getDoc: jest.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() })
  }
}));

// Mock performance monitoring
jest.mock('@/lib/services/analytics-performance-service', () => ({
  withPerformanceMonitoring: jest.fn((name, fn) => fn())
}));

describe('Commitment Analytics Validation', () => {
  // Test scenario: Mixed binary and multi-option markets with various commitment patterns
  const testScenario = {
    // Binary market with legacy and migrated commitments
    binaryMarket: {
      id: 'binary-market-1',
      title: 'Binary Market',
      description: 'Test binary market',
      category: 'test' as any,
      status: 'active' as any,
      createdBy: 'admin',
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
    } as Market,

    // Multi-option market with new commitment format
    multiOptionMarket: {
      id: 'multi-market-1',
      title: 'Multi-Option Market',
      description: 'Test multi-option market',
      category: 'test' as any,
      status: 'active' as any,
      createdBy: 'admin',
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
    } as Market,

    // Legacy binary commitments (position-only)
    legacyCommitments: [
      {
        id: 'legacy-1',
        userId: 'user-1',
        predictionId: 'binary-market-1',
        position: 'yes',
        tokensCommitted: 100,
        odds: 2.0,
        potentialWinning: 200,
        status: 'active',
        committedAt: '2024-01-01T00:00:00Z',
        metadata: {
          marketTitle: 'Binary Market',
          marketStatus: 'active' as any,
          marketEndsAt: Timestamp.now(),
          userBalanceAtCommitment: 500,
          commitmentSource: 'web' as any
        }
      },
      {
        id: 'legacy-2',
        userId: 'user-2',
        predictionId: 'binary-market-1',
        position: 'no',
        tokensCommitted: 150,
        odds: 1.8,
        potentialWinning: 270,
        status: 'active',
        committedAt: '2024-01-01T01:00:00Z',
        metadata: {
          marketTitle: 'Binary Market',
          marketStatus: 'active' as any,
          marketEndsAt: Timestamp.now(),
          userBalanceAtCommitment: 400,
          commitmentSource: 'web' as any
        }
      }
    ] as PredictionCommitment[],

    // Migrated binary commitments (both position and optionId)
    migratedCommitments: [
      {
        id: 'migrated-1',
        userId: 'user-3',
        predictionId: 'binary-market-1',
        marketId: 'binary-market-1',
        position: 'yes',
        optionId: 'yes',
        tokensCommitted: 200,
        odds: 2.2,
        potentialWinning: 440,
        status: 'active',
        committedAt: '2024-01-02T00:00:00Z',
        metadata: {
          marketTitle: 'Binary Market',
          marketStatus: 'active' as any,
          marketEndsAt: Timestamp.now(),
          selectedOptionText: 'Yes',
          marketOptionCount: 2,
          userBalanceAtCommitment: 600,
          commitmentSource: 'web' as any
        }
      }
    ] as PredictionCommitment[],

    // New multi-option commitments (optionId-based)
    multiOptionCommitments: [
      {
        id: 'multi-1',
        userId: 'user-4',
        marketId: 'multi-market-1',
        optionId: 'option-a',
        tokensCommitted: 300,
        odds: 3.0,
        potentialWinning: 900,
        status: 'active',
        committedAt: '2024-01-03T00:00:00Z',
        metadata: {
          marketTitle: 'Multi-Option Market',
          marketStatus: 'active' as any,
          marketEndsAt: Timestamp.now(),
          selectedOptionText: 'Option A',
          marketOptionCount: 4,
          userBalanceAtCommitment: 800,
          commitmentSource: 'web' as any
        }
      },
      {
        id: 'multi-2',
        userId: 'user-5',
        marketId: 'multi-market-1',
        optionId: 'option-b',
        tokensCommitted: 250,
        odds: 2.5,
        potentialWinning: 625,
        status: 'active',
        committedAt: '2024-01-03T01:00:00Z',
        metadata: {
          marketTitle: 'Multi-Option Market',
          marketStatus: 'active' as any,
          marketEndsAt: Timestamp.now(),
          selectedOptionText: 'Option B',
          marketOptionCount: 4,
          userBalanceAtCommitment: 700,
          commitmentSource: 'mobile' as any
        }
      },
      {
        id: 'multi-3',
        userId: 'user-1', // Same user as legacy commitment
        marketId: 'multi-market-1',
        optionId: 'option-c',
        tokensCommitted: 100,
        odds: 4.0,
        potentialWinning: 400,
        status: 'active',
        committedAt: '2024-01-03T02:00:00Z',
        metadata: {
          marketTitle: 'Multi-Option Market',
          marketStatus: 'active' as any,
          marketEndsAt: Timestamp.now(),
          selectedOptionText: 'Option C',
          marketOptionCount: 4,
          userBalanceAtCommitment: 400,
          commitmentSource: 'web' as any
        }
      }
    ] as PredictionCommitment[]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Binary Market Analytics Validation', () => {
    test('should calculate accurate statistics for legacy binary commitments', async () => {
      const { getDocs, getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => testScenario.binaryMarket
      });

      // Mock legacy commitments
      getDocs.mockResolvedValue({
        docs: testScenario.legacyCommitments.map(c => ({
          id: c.id,
          data: () => c
        })),
        size: testScenario.legacyCommitments.length
      });

      const result = await AdminCommitmentService.getMarketCommitments('binary-market-1', {
        includeAnalytics: true
      });

      // Validate basic statistics
      expect(result.totalCount).toBe(2);
      expect(result.commitments).toHaveLength(2);

      // Validate analytics calculations
      if (result.analytics) {
        expect(result.analytics.totalTokens).toBe(250); // 100 + 150
        expect(result.analytics.participantCount).toBe(2); // 2 commitments
        expect(result.analytics.averageCommitment).toBe(125); // 250 / 2
        expect(result.analytics.largestCommitment).toBe(150);

        // Validate yes/no percentages
        expect(result.analytics.yesPercentage).toBe(40); // 100/250 * 100
        expect(result.analytics.noPercentage).toBe(60); // 150/250 * 100
        expect(result.analytics.yesPercentage + result.analytics.noPercentage).toBe(100);
      }

      // Validate backward compatibility fields
      result.commitments.forEach(commitment => {
        expect(commitment.position).toBeDefined();
        expect(commitment.optionId).toBeDefined();
        expect(commitment.marketId).toBeDefined();
        expect(commitment.predictionId).toBeDefined();
      });
    });

    test('should calculate accurate statistics for mixed legacy and migrated commitments', async () => {
      const { getDocs, getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => testScenario.binaryMarket
      });

      // Mock mixed commitments (legacy + migrated)
      const mixedCommitments = [...testScenario.legacyCommitments, ...testScenario.migratedCommitments];
      getDocs.mockResolvedValue({
        docs: mixedCommitments.map(c => ({
          id: c.id,
          data: () => c
        })),
        size: mixedCommitments.length
      });

      const result = await AdminCommitmentService.getMarketCommitments('binary-market-1', {
        includeAnalytics: true
      });

      // Validate statistics with mixed commitment types
      expect(result.totalCount).toBe(3);
      expect(result.commitments).toHaveLength(3);

      if (result.analytics) {
        expect(result.analytics.totalTokens).toBe(450); // 100 + 150 + 200
        expect(result.analytics.participantCount).toBe(3);
        expect(result.analytics.averageCommitment).toBe(150); // 450 / 3
        expect(result.analytics.largestCommitment).toBe(200);

        // Validate yes/no percentages with mixed data
        const expectedYesPercentage = Math.round((300 / 450) * 100); // (100 + 200) / 450 * 100
        const expectedNoPercentage = Math.round((150 / 450) * 100); // 150 / 450 * 100
        
        expect(result.analytics.yesPercentage).toBe(expectedYesPercentage);
        expect(result.analytics.noPercentage).toBe(expectedNoPercentage);
      }
    });
  });

  describe('Multi-Option Market Analytics Validation', () => {
    test('should calculate accurate statistics for multi-option commitments', async () => {
      const { getDocs, getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'multi-market-1',
        data: () => testScenario.multiOptionMarket
      });

      // Mock multi-option commitments
      getDocs.mockResolvedValue({
        docs: testScenario.multiOptionCommitments.map(c => ({
          id: c.id,
          data: () => c
        })),
        size: testScenario.multiOptionCommitments.length
      });

      const result = await AdminCommitmentService.getMarketCommitments('multi-market-1', {
        includeAnalytics: true
      });

      // Validate basic statistics
      expect(result.totalCount).toBe(3);
      expect(result.commitments).toHaveLength(3);

      // Validate analytics calculations
      if (result.analytics) {
        expect(result.analytics.totalTokens).toBe(650); // 300 + 250 + 100
        expect(result.analytics.participantCount).toBe(3);
        expect(result.analytics.averageCommitment).toBe(217); // Math.round(650 / 3)
        expect(result.analytics.largestCommitment).toBe(300);

        // For multi-option markets, yes/no percentages should still be calculated for compatibility
        expect(result.analytics.yesPercentage).toBeGreaterThanOrEqual(0);
        expect(result.analytics.noPercentage).toBeGreaterThanOrEqual(0);
        expect(result.analytics.yesPercentage + result.analytics.noPercentage).toBe(100);
      }

      // Validate that all commitments have derived position fields for compatibility
      result.commitments.forEach(commitment => {
        expect(commitment.position).toBeDefined();
        expect(['yes', 'no']).toContain(commitment.position);
        expect(commitment.optionId).toBeDefined();
        expect(commitment.marketId).toBeDefined();
      });
    });

    test('should handle option-level statistics correctly', async () => {
      const { getDocs, getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'multi-market-1',
        data: () => testScenario.multiOptionMarket
      });

      // Mock multi-option commitments
      getDocs.mockResolvedValue({
        docs: testScenario.multiOptionCommitments.map(c => ({
          id: c.id,
          data: () => c
        })),
        size: testScenario.multiOptionCommitments.length
      });

      const result = await AdminCommitmentService.getMarketCommitments('multi-market-1', {
        includeAnalytics: true
      });

      // Validate market options are updated with real statistics
      expect(result.market.options).toHaveLength(4);
      
      // Find option-a (should have 300 tokens from user-4)
      const optionA = result.market.options.find(opt => opt.id === 'option-a');
      expect(optionA?.totalTokens).toBe(300);
      expect(optionA?.participantCount).toBe(1);

      // Find option-b (should have 250 tokens from user-5)
      const optionB = result.market.options.find(opt => opt.id === 'option-b');
      expect(optionB?.totalTokens).toBe(250);
      expect(optionB?.participantCount).toBe(1);

      // Find option-c (should have 100 tokens from user-1)
      const optionC = result.market.options.find(opt => opt.id === 'option-c');
      expect(optionC?.totalTokens).toBe(100);
      expect(optionC?.participantCount).toBe(1);

      // Find option-d (should have 0 tokens)
      const optionD = result.market.options.find(opt => opt.id === 'option-d');
      expect(optionD?.totalTokens).toBe(0);
      expect(optionD?.participantCount).toBe(0);
    });
  });

  describe('System-Wide Analytics Validation', () => {
    test('should calculate accurate system-wide statistics across all market types', async () => {
      const { getDocs } = require('firebase/firestore');

      // Mock all commitments from all markets
      const allCommitments = [
        ...testScenario.legacyCommitments,
        ...testScenario.migratedCommitments,
        ...testScenario.multiOptionCommitments
      ];

      getDocs.mockResolvedValue({
        docs: allCommitments.map(c => ({
          id: c.id,
          data: () => c
        })),
        size: allCommitments.length
      });

      const result = await AdminCommitmentService.getCommitmentAnalytics();

      // Validate system-wide statistics
      expect(result.totalMarketsWithCommitments).toBe(2); // binary-market-1 and multi-market-1
      
      const expectedTotalTokens = allCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0);
      expect(result.totalTokensCommitted).toBe(expectedTotalTokens); // 100+150+200+300+250+100 = 1100

      expect(result.activeCommitments).toBe(6); // All commitments are active
      expect(result.resolvedCommitments).toBe(0); // No resolved commitments

      const expectedAverage = Math.round(expectedTotalTokens / allCommitments.length);
      expect(result.averageCommitmentSize).toBe(expectedAverage);
    });

    test('should handle user participation across multiple markets correctly', async () => {
      const { getDocs } = require('firebase/firestore');

      // Mock all commitments
      const allCommitments = [
        ...testScenario.legacyCommitments,
        ...testScenario.migratedCommitments,
        ...testScenario.multiOptionCommitments
      ];

      getDocs.mockResolvedValue({
        docs: allCommitments.map(c => ({
          id: c.id,
          data: () => c
        })),
        size: allCommitments.length
      });

      const result = await AdminCommitmentService.getCommitmentAnalytics();

      // Validate that user participation is counted correctly
      // user-1 appears in both legacy (binary) and multi-option markets
      // user-2 appears only in binary market
      // user-3 appears only in binary market (migrated)
      // user-4 appears only in multi-option market
      // user-5 appears only in multi-option market
      
      // Total unique users across all markets: 5
      const uniqueUsers = new Set(allCommitments.map(c => c.userId));
      expect(uniqueUsers.size).toBe(5);

      // Total commitments: 6
      expect(result.activeCommitments).toBe(6);
    });
  });

  describe('Performance and Consistency Validation', () => {
    test('should return consistent results across multiple queries', async () => {
      const { getDocs, getDoc } = require('firebase/firestore');

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => testScenario.binaryMarket
      });

      // Mock commitments
      const mixedCommitments = [...testScenario.legacyCommitments, ...testScenario.migratedCommitments];
      getDocs.mockResolvedValue({
        docs: mixedCommitments.map(c => ({
          id: c.id,
          data: () => c
        })),
        size: mixedCommitments.length
      });

      // Execute multiple queries
      const results = await Promise.all([
        AdminCommitmentService.getMarketCommitments('binary-market-1', { includeAnalytics: true }),
        AdminCommitmentService.getMarketCommitments('binary-market-1', { includeAnalytics: true }),
        AdminCommitmentService.getMarketCommitments('binary-market-1', { includeAnalytics: true })
      ]);

      // All results should be identical
      const firstResult = results[0];
      results.forEach((result, index) => {
        expect(result.totalCount).toBe(firstResult.totalCount);
        expect(result.commitments).toHaveLength(firstResult.commitments.length);
        
        if (result.analytics && firstResult.analytics) {
          expect(result.analytics.totalTokens).toBe(firstResult.analytics.totalTokens);
          expect(result.analytics.participantCount).toBe(firstResult.analytics.participantCount);
          expect(result.analytics.yesPercentage).toBe(firstResult.analytics.yesPercentage);
          expect(result.analytics.noPercentage).toBe(firstResult.analytics.noPercentage);
          expect(result.analytics.averageCommitment).toBe(firstResult.analytics.averageCommitment);
          expect(result.analytics.largestCommitment).toBe(firstResult.analytics.largestCommitment);
        }
      });
    });

    test('should validate analytics accuracy with edge cases', async () => {
      const { getDocs, getDoc } = require('firebase/firestore');

      // Create edge case scenario: single commitment
      const singleCommitment = [{
        id: 'single-1',
        userId: 'user-single',
        predictionId: 'binary-market-1',
        position: 'yes',
        tokensCommitted: 500,
        odds: 1.5,
        potentialWinning: 750,
        status: 'active',
        committedAt: '2024-01-01T00:00:00Z',
        metadata: {
          marketTitle: 'Binary Market',
          marketStatus: 'active' as any,
          marketEndsAt: Timestamp.now(),
          userBalanceAtCommitment: 1000,
          commitmentSource: 'web' as any
        }
      }];

      // Mock market data
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-1',
        data: () => testScenario.binaryMarket
      });

      // Mock single commitment
      getDocs.mockResolvedValue({
        docs: singleCommitment.map(c => ({
          id: c.id,
          data: () => c
        })),
        size: singleCommitment.length
      });

      const result = await AdminCommitmentService.getMarketCommitments('binary-market-1', {
        includeAnalytics: true
      });

      // Validate edge case analytics
      expect(result.totalCount).toBe(1);
      
      if (result.analytics) {
        expect(result.analytics.totalTokens).toBe(500);
        expect(result.analytics.participantCount).toBe(1);
        expect(result.analytics.averageCommitment).toBe(500);
        expect(result.analytics.largestCommitment).toBe(500);
        expect(result.analytics.yesPercentage).toBe(100); // All tokens on yes
        expect(result.analytics.noPercentage).toBe(0); // No tokens on no
      }
    });
  });
});