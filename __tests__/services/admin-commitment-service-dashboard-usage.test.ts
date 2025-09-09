import { AdminCommitmentService } from '@/lib/services/admin-commitment-service';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ 
    exists: () => false,
    id: 'test-market',
    data: () => ({})
  })),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: () => ({ 
      toDate: () => new Date(), 
      toMillis: () => Date.now(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0
    })
  }
}));

// Mock database
jest.mock('@/lib/db/database', () => ({
  db: {}
}));

// Mock performance monitoring
jest.mock('@/lib/services/analytics-performance-service', () => ({
  withPerformanceMonitoring: jest.fn((name, fn) => fn())
}));

describe('AdminCommitmentService Dashboard Usage Patterns', () => {
  describe('Existing Dashboard Method Signatures', () => {
    it('should support getMarketCommitments with existing parameters', async () => {
      // This is how existing dashboards call the method
      const result = await AdminCommitmentService.getMarketCommitments('market-123', {
        pageSize: 1000,
        includeAnalytics: true
      });

      // Should return the expected structure (even if empty due to mocking)
      expect(result).toHaveProperty('market');
      expect(result).toHaveProperty('commitments');
      expect(result).toHaveProperty('analytics');
      expect(result).toHaveProperty('totalCount');

      // Should be arrays/objects as expected
      expect(Array.isArray(result.commitments)).toBe(true);
      expect(typeof result.totalCount).toBe('number');
    });

    it('should support getMarketCommitments with position filtering (existing feature)', async () => {
      // This is how existing dashboards filter by position
      const result = await AdminCommitmentService.getMarketCommitments('market-123', {
        pageSize: 50,
        position: 'yes',
        includeAnalytics: true
      });

      // Should return the expected structure
      expect(result).toHaveProperty('market');
      expect(result).toHaveProperty('commitments');
      expect(result).toHaveProperty('analytics');
      expect(result).toHaveProperty('totalCount');
    });

    it('should support getCommitmentsWithUsers with existing parameters', async () => {
      // This is how existing dashboards call the method
      const result = await AdminCommitmentService.getCommitmentsWithUsers({
        page: 1,
        pageSize: 20,
        status: 'active',
        marketId: 'market-123',
        position: 'yes',
        sortBy: 'committedAt',
        sortOrder: 'desc'
      });

      // Should return the expected structure
      expect(result).toHaveProperty('commitments');
      expect(result).toHaveProperty('totalCount');
      expect(Array.isArray(result.commitments)).toBe(true);
      expect(typeof result.totalCount).toBe('number');
    });

    it('should support new optionId parameter without breaking existing calls', async () => {
      // New parameter should work
      const resultWithOption = await AdminCommitmentService.getMarketCommitments('market-123', {
        pageSize: 50,
        optionId: 'option-1', // NEW parameter
        includeAnalytics: true
      });

      // Should return the expected structure
      expect(resultWithOption).toHaveProperty('market');
      expect(resultWithOption).toHaveProperty('commitments');
      expect(resultWithOption).toHaveProperty('analytics');

      // Old parameters should still work
      const resultWithPosition = await AdminCommitmentService.getMarketCommitments('market-123', {
        pageSize: 50,
        position: 'yes', // OLD parameter
        includeAnalytics: true
      });

      expect(resultWithPosition).toHaveProperty('market');
      expect(resultWithPosition).toHaveProperty('commitments');
      expect(resultWithPosition).toHaveProperty('analytics');
    });
  });

  describe('Real-time Listener Compatibility', () => {
    it('should support createMarketCommitmentsListener with existing parameters', () => {
      const mockCallback = jest.fn();

      // This is how existing dashboards create listeners
      expect(() => {
        AdminCommitmentService.createMarketCommitmentsListener(
          'market-123',
          mockCallback,
          {
            status: 'active',
            position: 'yes',
            sortBy: 'committedAt',
            sortOrder: 'desc',
            pageSize: 50
          }
        );
      }).not.toThrow();
    });

    it('should support createMarketCommitmentsListener with new optionId parameter', () => {
      const mockCallback = jest.fn();

      // New parameter should work without breaking
      expect(() => {
        AdminCommitmentService.createMarketCommitmentsListener(
          'market-123',
          mockCallback,
          {
            status: 'active',
            optionId: 'option-1', // NEW parameter
            sortBy: 'committedAt',
            sortOrder: 'desc',
            pageSize: 50
          }
        );
      }).not.toThrow();
    });

    it('should support createMarketAnalyticsListener', () => {
      const mockCallback = jest.fn();

      expect(() => {
        AdminCommitmentService.createMarketAnalyticsListener('market-123', mockCallback);
      }).not.toThrow();
    });
  });

  describe('Caching and Performance Methods', () => {
    it('should support getCachedMarketAnalytics', async () => {
      const analytics = await AdminCommitmentService.getCachedMarketAnalytics('market-123');

      // Should return analytics structure
      expect(analytics).toHaveProperty('totalTokens');
      expect(analytics).toHaveProperty('participantCount');
      expect(analytics).toHaveProperty('yesPercentage');
      expect(analytics).toHaveProperty('noPercentage');
      expect(analytics).toHaveProperty('averageCommitment');
      expect(analytics).toHaveProperty('largestCommitment');
      expect(analytics).toHaveProperty('commitmentTrend');

      // Should be numbers
      expect(typeof analytics.totalTokens).toBe('number');
      expect(typeof analytics.participantCount).toBe('number');
      expect(typeof analytics.yesPercentage).toBe('number');
      expect(typeof analytics.noPercentage).toBe('number');
    });

    it('should support getCommitmentAnalytics', async () => {
      const analytics = await AdminCommitmentService.getCommitmentAnalytics();

      // Should return system-wide analytics structure
      expect(analytics).toHaveProperty('totalMarketsWithCommitments');
      expect(analytics).toHaveProperty('totalTokensCommitted');
      expect(analytics).toHaveProperty('activeCommitments');
      expect(analytics).toHaveProperty('resolvedCommitments');
      expect(analytics).toHaveProperty('averageCommitmentSize');

      // Should be numbers
      expect(typeof analytics.totalMarketsWithCommitments).toBe('number');
      expect(typeof analytics.totalTokensCommitted).toBe('number');
      expect(typeof analytics.activeCommitments).toBe('number');
    });
  });

  describe('New Backward Compatibility Methods', () => {
    it('should support testBackwardCompatibility method', async () => {
      const testResult = await AdminCommitmentService.testBackwardCompatibility('market-123');

      // Should return test result structure
      expect(testResult).toHaveProperty('success');
      expect(testResult).toHaveProperty('issues');
      expect(testResult).toHaveProperty('statistics');

      expect(typeof testResult.success).toBe('boolean');
      expect(Array.isArray(testResult.issues)).toBe(true);
      expect(testResult.statistics).toHaveProperty('totalCommitments');
      expect(testResult.statistics).toHaveProperty('binaryCommitments');
      expect(testResult.statistics).toHaveProperty('optionCommitments');
      expect(testResult.statistics).toHaveProperty('missingFields');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should provide fallback responses instead of throwing errors', async () => {
      // Should not throw errors even with invalid data
      await expect(AdminCommitmentService.getMarketCommitments('invalid-market', {
        pageSize: 100,
        includeAnalytics: true
      })).resolves.toBeDefined();

      await expect(AdminCommitmentService.getCommitmentsWithUsers({
        marketId: 'invalid-market',
        pageSize: 20
      })).resolves.toBeDefined();

      await expect(AdminCommitmentService.getCachedMarketAnalytics('invalid-market')).resolves.toBeDefined();

      await expect(AdminCommitmentService.getCommitmentAnalytics()).resolves.toBeDefined();
    });

    it('should handle empty results gracefully', async () => {
      const result = await AdminCommitmentService.getMarketCommitments('empty-market', {
        pageSize: 100,
        includeAnalytics: true
      });

      // Should have safe default values
      expect(result.commitments).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.market).toBeDefined();
      expect(result.analytics).toBeDefined();
    });
  });

  describe('Method Availability', () => {
    it('should have all expected public methods', () => {
      // Verify all methods that existing dashboards depend on are available
      expect(typeof AdminCommitmentService.getMarketCommitments).toBe('function');
      expect(typeof AdminCommitmentService.getCommitmentsWithUsers).toBe('function');
      expect(typeof AdminCommitmentService.getCommitmentDetails).toBe('function');
      expect(typeof AdminCommitmentService.getCommitmentAnalytics).toBe('function');
      expect(typeof AdminCommitmentService.createMarketCommitmentsListener).toBe('function');
      expect(typeof AdminCommitmentService.createMarketAnalyticsListener).toBe('function');
      expect(typeof AdminCommitmentService.getCachedMarketAnalytics).toBe('function');
      expect(typeof AdminCommitmentService.batchFetchUsers).toBe('function');
      expect(typeof AdminCommitmentService.testBackwardCompatibility).toBe('function');
    });

    it('should maintain static method pattern', () => {
      // All methods should be static (callable on the class)
      const methods = [
        'getMarketCommitments',
        'getCommitmentsWithUsers', 
        'getCommitmentDetails',
        'getCommitmentAnalytics',
        'createMarketCommitmentsListener',
        'createMarketAnalyticsListener',
        'getCachedMarketAnalytics',
        'batchFetchUsers',
        'testBackwardCompatibility'
      ];

      methods.forEach(methodName => {
        expect(AdminCommitmentService[methodName]).toBeDefined();
        expect(typeof AdminCommitmentService[methodName]).toBe('function');
      });
    });
  });
});