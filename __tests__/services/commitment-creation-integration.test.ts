/**
 * Commitment Creation Integration Test
 * 
 * Tests the integration between the enhanced commitment service and existing components
 * to ensure backward compatibility is maintained.
 */

import { CommitmentCreationService } from '@/lib/services/commitment-creation-service';
import { PredictionCommitmentService } from '@/lib/services/token-database';

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {},
  isFirebaseInitialized: () => true
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn((db, collection, id) => ({ id, collection, path: `${collection}/${id}` })),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  runTransaction: jest.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() })
  },
  writeBatch: jest.fn()
}));

describe('Commitment Creation Integration', () => {
  const mockBinaryMarket = {
    id: 'binary-market-123',
    title: 'Test Binary Market',
    description: 'A test binary market',
    status: 'active',
    endDate: new Date(Date.now() + 86400000), // Tomorrow
    options: [
      { id: 'yes', text: 'Yes', totalTokens: 500, participantCount: 10 },
      { id: 'no', text: 'No', totalTokens: 300, participantCount: 8 }
    ]
  };

  const mockUserBalance = {
    userId: 'test-user-123',
    availableTokens: 1000,
    committedTokens: 200,
    totalEarned: 1500,
    totalSpent: 300,
    lastUpdated: { toDate: () => new Date() },
    version: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { getDoc, runTransaction } = require('firebase/firestore');
    
    // Mock successful market and user data retrieval
    getDoc.mockImplementation((docRef) => {
      if (docRef.id === 'binary-market-123') {
        return Promise.resolve({
          exists: () => true,
          id: 'binary-market-123',
          data: () => mockBinaryMarket
        });
      }
      
      if (docRef.id === 'test-user-123') {
        return Promise.resolve({
          exists: () => true,
          id: 'test-user-123',
          data: () => mockUserBalance
        });
      }
      
      return Promise.resolve({ exists: () => false });
    });

    // Mock successful transaction
    runTransaction.mockImplementation((db, callback) => {
      const mockTransaction = {
        get: (docRef) => Promise.resolve({
          exists: () => true,
          data: () => mockUserBalance
        }),
        set: jest.fn(),
        update: jest.fn()
      };
      
      return callback(mockTransaction).then(() => ({
        commitmentId: 'mock-commitment-id',
        commitment: {
          id: 'mock-commitment-id',
          userId: 'test-user-123',
          tokensCommitted: 100
        }
      }));
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with existing PredictionCommitment component API', async () => {
      // This simulates how the existing PredictionCommitment component calls the service
      const commitmentId = await CommitmentCreationService.createCommitmentForComponent(
        'test-user-123',
        'binary-market-123',
        'yes',
        'yes', // optionId matches position for binary markets
        100,
        { source: 'web' }
      );

      expect(commitmentId).toBe('mock-commitment-id');
    });

    it('should maintain compatibility with legacy PredictionCommitmentService', async () => {
      // Mock the enhanced service to return success
      jest.doMock('@/lib/services/enhanced-commitment-service', () => ({
        EnhancedCommitmentService: {
          createCommitment: jest.fn().mockResolvedValue({
            success: true,
            commitmentId: 'enhanced-commitment-id',
            commitment: {
              id: 'enhanced-commitment-id',
              userId: 'test-user-123',
              tokensCommitted: 100
            }
          })
        }
      }));

      // Test that the legacy service now uses the enhanced service internally
      const legacyCommitmentData = {
        userId: 'test-user-123',
        predictionId: 'binary-market-123',
        position: 'yes' as const,
        tokensCommitted: 100,
        odds: 2.5,
        potentialWinning: 250,
        status: 'active' as const,
        metadata: {
          marketStatus: 'active' as const,
          marketTitle: 'Test Market',
          marketEndsAt: new Date(),
          oddsSnapshot: {
            yesOdds: 2.5,
            noOdds: 1.8,
            totalYesTokens: 500,
            totalNoTokens: 300,
            totalParticipants: 18
          },
          userBalanceAtCommitment: 1000,
          commitmentSource: 'web' as const
        }
      };

      const commitmentId = await PredictionCommitmentService.createCommitment(legacyCommitmentData);
      expect(commitmentId).toBeDefined();
    });
  });

  describe('Market Type Detection', () => {
    it('should correctly identify binary markets', async () => {
      const marketType = await CommitmentCreationService.getMarketType('binary-market-123');
      expect(marketType).toBe('binary');
    });

    it('should provide market options for UI components', async () => {
      const options = await CommitmentCreationService.getMarketOptions('binary-market-123');
      
      expect(options).toHaveLength(2);
      expect(options![0]).toEqual({
        id: 'yes',
        text: 'Yes',
        totalTokens: 500
      });
      expect(options![1]).toEqual({
        id: 'no',
        text: 'No',
        totalTokens: 300
      });
    });
  });

  describe('Enhanced Functionality', () => {
    it('should support both position and optionId targeting', async () => {
      // Test position-based targeting (existing functionality)
      const positionRequest = {
        userId: 'test-user-123',
        marketId: 'binary-market-123',
        position: 'yes' as const,
        tokensToCommit: 100
      };

      const positionResult = await CommitmentCreationService.createCommitment(positionRequest);
      expect(positionResult.success).toBe(true);

      // Test optionId-based targeting (new functionality)
      const optionRequest = {
        userId: 'test-user-123',
        marketId: 'binary-market-123',
        optionId: 'yes',
        tokensToCommit: 100
      };

      const optionResult = await CommitmentCreationService.createCommitment(optionRequest);
      expect(optionResult.success).toBe(true);
    });

    it('should validate requests before creation', async () => {
      const request = {
        userId: 'test-user-123',
        marketId: 'binary-market-123',
        position: 'yes' as const,
        tokensToCommit: 100
      };

      const validation = await CommitmentCreationService.validateCommitmentRequest(request);
      
      expect(validation.isValid).toBe(true);
      expect(validation.marketType).toBe('binary');
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock market not found
      const { getDoc } = require('firebase/firestore');
      getDoc.mockImplementation(() => Promise.resolve({ exists: () => false }));

      const request = {
        userId: 'test-user-123',
        marketId: 'non-existent-market',
        position: 'yes' as const,
        tokensToCommit: 100
      };

      const result = await CommitmentCreationService.createCommitment(request);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_FAILED');
      expect(result.error?.message).toContain('Market not found');
    });

    it('should provide meaningful error messages', async () => {
      const request = {
        userId: 'test-user-123',
        marketId: 'binary-market-123',
        position: 'yes' as const,
        tokensToCommit: 2000 // More than available balance
      };

      const validation = await CommitmentCreationService.validateCommitmentRequest(request);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('Insufficient balance'))).toBe(true);
    });
  });
});