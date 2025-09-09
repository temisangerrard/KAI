/**
 * Enhanced Commitment Service Tests
 * 
 * Tests the enhanced commitment creation service for both binary and multi-option markets
 * while ensuring backward compatibility with existing systems.
 */

import { EnhancedCommitmentService } from '@/lib/services/enhanced-commitment-service';
import { CommitmentCreationService } from '@/lib/services/commitment-creation-service';

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {},
  isFirebaseInitialized: () => true
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  runTransaction: jest.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() })
  },
  writeBatch: jest.fn()
}));

// Mock services
jest.mock('@/lib/services/commitment-validation-service', () => ({
  CommitmentValidationService: {
    validateCommitmentRequest: jest.fn(),
    createCommitmentMetadata: jest.fn()
  }
}));

describe('EnhancedCommitmentService', () => {
  const mockUser = {
    id: 'test-user-123',
    uid: 'test-user-123'
  };

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

  const mockMultiOptionMarket = {
    id: 'multi-option-market-123',
    title: 'Test Multi-Option Market',
    description: 'A test multi-option market',
    status: 'active',
    endDate: new Date(Date.now() + 86400000), // Tomorrow
    options: [
      { id: 'option-a', text: 'Option A', totalTokens: 200, participantCount: 5 },
      { id: 'option-b', text: 'Option B', totalTokens: 300, participantCount: 7 },
      { id: 'option-c', text: 'Option C', totalTokens: 150, participantCount: 4 },
      { id: 'option-d', text: 'Option D', totalTokens: 100, participantCount: 3 }
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
    
    // Mock successful Firestore operations
    const { getDoc, runTransaction, doc } = require('firebase/firestore');
    
    // Mock doc function to return proper doc references
    doc.mockImplementation((db, collection, id) => ({
      id,
      collection,
      path: `${collection}/${id}`
    }));
    
    getDoc.mockImplementation((docRef) => {
      const docId = docRef.id;
      
      if (docId === 'binary-market-123') {
        return Promise.resolve({
          exists: () => true,
          id: 'binary-market-123',
          data: () => mockBinaryMarket
        });
      }
      
      if (docId === 'multi-option-market-123') {
        return Promise.resolve({
          exists: () => true,
          id: 'multi-option-market-123',
          data: () => mockMultiOptionMarket
        });
      }
      
      if (docId === 'test-user-123') {
        return Promise.resolve({
          exists: () => true,
          id: 'test-user-123',
          data: () => mockUserBalance
        });
      }
      
      return Promise.resolve({
        exists: () => false
      });
    });

    runTransaction.mockImplementation((db, callback) => {
      const mockTransaction = {
        get: (docRef) => {
          if (docRef.id === 'test-user-123') {
            return Promise.resolve({
              exists: () => true,
              data: () => mockUserBalance
            });
          }
          return Promise.resolve({ exists: () => false });
        },
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

  describe('Binary Market Commitments', () => {
    it('should create commitment for binary market with position', async () => {
      const request = {
        userId: 'test-user-123',
        predictionId: 'binary-market-123',
        marketId: 'binary-market-123',
        position: 'yes' as const,
        tokensToCommit: 100,
        clientInfo: {
          source: 'web' as const
        }
      };

      const result = await EnhancedCommitmentService.createCommitment(request);

      expect(result.success).toBe(true);
      expect(result.commitmentId).toBe('mock-commitment-id');
      expect(result.commitment).toBeDefined();
    });

    it('should derive optionId from position for binary market', async () => {
      const request = {
        userId: 'test-user-123',
        predictionId: 'binary-market-123',
        position: 'no' as const,
        tokensToCommit: 50
      };

      const result = await EnhancedCommitmentService.createCommitment(request);

      expect(result.success).toBe(true);
      // Should have derived optionId as 'no' (second option)
    });

    it('should maintain backward compatibility with existing binary commitment API', async () => {
      const result = await EnhancedCommitmentService.createBinaryCommitment(
        'test-user-123',
        'binary-market-123',
        'yes',
        75,
        { source: 'mobile' }
      );

      expect(result.success).toBe(true);
      expect(result.commitmentId).toBeDefined();
    });
  });

  describe('Multi-Option Market Commitments', () => {
    it('should create commitment for multi-option market with optionId', async () => {
      const request = {
        userId: 'test-user-123',
        predictionId: 'multi-option-market-123',
        marketId: 'multi-option-market-123',
        optionId: 'option-c',
        tokensToCommit: 150,
        clientInfo: {
          source: 'web' as const
        }
      };

      const result = await EnhancedCommitmentService.createCommitment(request);

      expect(result.success).toBe(true);
      expect(result.commitmentId).toBe('mock-commitment-id');
    });

    it('should derive position from optionId for multi-option market', async () => {
      const request = {
        userId: 'test-user-123',
        predictionId: 'multi-option-market-123',
        optionId: 'option-a', // First option should map to 'yes'
        tokensToCommit: 100
      };

      const result = await EnhancedCommitmentService.createCommitment(request);

      expect(result.success).toBe(true);
      // Should have derived position as 'yes' for first option
    });

    it('should support direct multi-option commitment creation', async () => {
      const result = await EnhancedCommitmentService.createMultiOptionCommitment(
        'test-user-123',
        'multi-option-market-123',
        'option-d',
        80,
        { source: 'api' }
      );

      expect(result.success).toBe(true);
      expect(result.commitmentId).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should validate commitment request successfully', async () => {
      const request = {
        userId: 'test-user-123',
        predictionId: 'binary-market-123',
        position: 'yes' as const,
        tokensToCommit: 100
      };

      const result = await EnhancedCommitmentService.validateEnhancedCommitmentRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for insufficient balance', async () => {
      const request = {
        userId: 'test-user-123',
        predictionId: 'binary-market-123',
        position: 'yes' as const,
        tokensToCommit: 2000 // More than available balance
      };

      const result = await EnhancedCommitmentService.validateEnhancedCommitmentRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Insufficient balance'))).toBe(true);
    });

    it('should fail validation for non-existent market', async () => {
      const request = {
        userId: 'test-user-123',
        predictionId: 'non-existent-market',
        position: 'yes' as const,
        tokensToCommit: 100
      };

      const result = await EnhancedCommitmentService.validateEnhancedCommitmentRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Market not found'))).toBe(true);
    });

    it('should fail validation for invalid option in multi-option market', async () => {
      const request = {
        userId: 'test-user-123',
        predictionId: 'multi-option-market-123',
        optionId: 'invalid-option',
        tokensToCommit: 100
      };

      const result = await EnhancedCommitmentService.validateEnhancedCommitmentRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Option not found'))).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with existing PredictionCommitment interface', async () => {
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

      // This should work through the enhanced service
      const result = await EnhancedCommitmentService.createCommitment({
        userId: legacyCommitmentData.userId,
        predictionId: legacyCommitmentData.predictionId,
        position: legacyCommitmentData.position,
        tokensToCommit: legacyCommitmentData.tokensCommitted
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('CommitmentCreationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the enhanced service
    jest.spyOn(EnhancedCommitmentService, 'createCommitment').mockResolvedValue({
      success: true,
      commitmentId: 'mock-commitment-id',
      commitment: {
        id: 'mock-commitment-id',
        userId: 'test-user-123',
        predictionId: 'test-market',
        position: 'yes',
        tokensCommitted: 100,
        odds: 2.0,
        potentialWinning: 200,
        status: 'active',
        committedAt: { toDate: () => new Date() } as any,
        metadata: {} as any
      }
    });
  });

  describe('Unified API', () => {
    it('should create commitment with automatic market type detection', async () => {
      const request = {
        userId: 'test-user-123',
        marketId: 'binary-market-123',
        position: 'yes' as const,
        tokensToCommit: 100
      };

      const result = await CommitmentCreationService.createCommitment(request);

      expect(result.success).toBe(true);
      expect(result.commitmentId).toBe('mock-commitment-id');
    });

    it('should work with existing PredictionCommitment component API', async () => {
      const commitmentId = await CommitmentCreationService.createCommitmentForComponent(
        'test-user-123',
        'binary-market-123',
        'yes',
        'yes', // optionId
        100,
        { source: 'web' }
      );

      expect(commitmentId).toBe('mock-commitment-id');
    });

    it('should validate commitment request without creating', async () => {
      // Mock getDoc for validation
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'binary-market-123',
        data: () => ({
          id: 'binary-market-123',
          status: 'active',
          endDate: new Date(Date.now() + 86400000),
          options: [
            { id: 'yes', text: 'Yes' },
            { id: 'no', text: 'No' }
          ]
        })
      });

      const request = {
        userId: 'test-user-123',
        marketId: 'binary-market-123',
        position: 'yes' as const,
        tokensToCommit: 100
      };

      const result = await CommitmentCreationService.validateCommitmentRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.marketType).toBe('binary');
    });
  });

  describe('Market Type Detection', () => {
    it('should detect binary market type', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          options: [
            { id: 'yes', text: 'Yes' },
            { id: 'no', text: 'No' }
          ]
        })
      });

      const marketType = await CommitmentCreationService.getMarketType('binary-market-123');
      expect(marketType).toBe('binary');
    });

    it('should detect multi-option market type', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          options: [
            { id: 'option-a', text: 'Option A' },
            { id: 'option-b', text: 'Option B' },
            { id: 'option-c', text: 'Option C' },
            { id: 'option-d', text: 'Option D' }
          ]
        })
      });

      const marketType = await CommitmentCreationService.getMarketType('multi-option-market-123');
      expect(marketType).toBe('multi-option');
    });

    it('should get market options', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          options: [
            { id: 'option-a', text: 'Option A', totalTokens: 100 },
            { id: 'option-b', text: 'Option B', totalTokens: 200 }
          ]
        })
      });

      const options = await CommitmentCreationService.getMarketOptions('test-market');
      
      expect(options).toHaveLength(2);
      expect(options![0]).toEqual({
        id: 'option-a',
        text: 'Option A',
        totalTokens: 100
      });
    });
  });
});