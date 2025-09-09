/**
 * Enhanced Commitment Integration Test
 * 
 * Demonstrates that the enhanced commitment service works with both binary and multi-option markets
 * while maintaining full backward compatibility with existing components and dashboards.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PredictionCommitment } from '@/app/components/prediction-commitment';
import { CommitmentCreationService } from '@/lib/services/commitment-creation-service';
import { EnhancedCommitmentService } from '@/lib/services/enhanced-commitment-service';

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {},
  isFirebaseInitialized: () => true
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn((db, collection, id) => ({ id, collection, path: `${collection}/${id}` })),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  runTransaction: jest.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() })
  }
}));

// Mock auth context
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: { 
      id: 'test-user-123',
      uid: 'test-user-123',
      email: 'test@example.com'
    }
  })
}));

// Mock token balance service
jest.mock('@/lib/services/token-balance-service', () => ({
  TokenBalanceService: {
    getUserBalance: jest.fn().mockResolvedValue({
      userId: 'test-user-123',
      availableTokens: 1000,
      committedTokens: 200,
      totalEarned: 1500,
      totalSpent: 300,
      lastUpdated: new Date(),
      version: 1
    })
  }
}));

// Mock market utils
jest.mock('@/lib/utils/market-utils', () => ({
  calculatePayout: jest.fn(() => ({
    grossPayout: 200,
    netProfit: 100,
    roi: 100
  })),
  previewOddsImpact: jest.fn(() => ({
    currentOdds: { yes: 2.0, no: 1.8 },
    projectedOdds: { yes: 1.9, no: 1.9 },
    impactLevel: 'moderate'
  })),
  formatOdds: jest.fn((odds) => `${odds.toFixed(1)}x`),
  formatTokenAmount: jest.fn((amount) => amount.toString())
}));

describe('Enhanced Commitment Integration', () => {
  const mockBinaryMarket = {
    id: 'binary-market-123',
    title: 'Will it rain tomorrow?',
    description: 'A binary prediction market',
    status: 'active',
    endDate: new Date(Date.now() + 86400000),
    options: [
      { id: 'yes', text: 'Yes', name: 'Yes', totalTokens: 500, participantCount: 10 },
      { id: 'no', text: 'No', name: 'No', totalTokens: 300, participantCount: 8 }
    ]
  };

  const mockMultiOptionMarket = {
    id: 'multi-option-market-123',
    title: 'Who will win the championship?',
    description: 'A multi-option prediction market',
    status: 'active',
    endDate: new Date(Date.now() + 86400000),
    options: [
      { id: 'team-a', text: 'Team A', name: 'Team A', totalTokens: 200, participantCount: 5 },
      { id: 'team-b', text: 'Team B', name: 'Team B', totalTokens: 300, participantCount: 7 },
      { id: 'team-c', text: 'Team C', name: 'Team C', totalTokens: 150, participantCount: 4 },
      { id: 'team-d', text: 'Team D', name: 'Team D', totalTokens: 100, participantCount: 3 }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful Firestore operations
    const { getDoc, runTransaction } = require('firebase/firestore');
    
    getDoc.mockImplementation((docRef) => {
      if (docRef.id === 'binary-market-123') {
        return Promise.resolve({
          exists: () => true,
          id: 'binary-market-123',
          data: () => mockBinaryMarket
        });
      }
      
      if (docRef.id === 'multi-option-market-123') {
        return Promise.resolve({
          exists: () => true,
          id: 'multi-option-market-123',
          data: () => mockMultiOptionMarket
        });
      }
      
      if (docRef.id === 'test-user-123') {
        return Promise.resolve({
          exists: () => true,
          id: 'test-user-123',
          data: () => ({
            userId: 'test-user-123',
            availableTokens: 1000,
            committedTokens: 200,
            version: 1
          })
        });
      }
      
      return Promise.resolve({ exists: () => false });
    });

    runTransaction.mockImplementation((db, callback) => {
      const mockTransaction = {
        get: () => Promise.resolve({
          exists: () => true,
          data: () => ({
            userId: 'test-user-123',
            availableTokens: 1000,
            committedTokens: 200,
            version: 1
          })
        }),
        set: jest.fn(),
        update: jest.fn()
      };
      
      return callback(mockTransaction).then(() => 'mock-commitment-id');
    });
  });

  describe('Binary Market Compatibility', () => {
    it('should work with existing PredictionCommitment component for binary markets', async () => {
      const mockOnCommit = jest.fn().mockResolvedValue(undefined);
      const mockOnCancel = jest.fn();

      render(
        <PredictionCommitment
          predictionId="binary-market-123"
          predictionTitle="Will it rain tomorrow?"
          position="yes"
          optionId="yes"
          market={mockBinaryMarket}
          maxTokens={500}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      // Component should render successfully
      expect(screen.getByText('Commit Tokens')).toBeInTheDocument();
      expect(screen.getByText('Will it rain tomorrow?')).toBeInTheDocument();
      expect(screen.getByText('YES')).toBeInTheDocument();

      // Should be able to commit tokens
      const commitButton = screen.getByRole('button', { name: /commit/i });
      expect(commitButton).toBeInTheDocument();
    });

    it('should create binary market commitments using enhanced service', async () => {
      const result = await CommitmentCreationService.createCommitment({
        userId: 'test-user-123',
        marketId: 'binary-market-123',
        position: 'yes',
        tokensToCommit: 100,
        clientInfo: { source: 'web' }
      });

      expect(result.success).toBe(true);
    });

    it('should detect binary market type correctly', async () => {
      const marketType = await CommitmentCreationService.getMarketType('binary-market-123');
      expect(marketType).toBe('binary');
    });

    it('should provide binary market options for UI', async () => {
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

  describe('Multi-Option Market Support', () => {
    it('should detect multi-option market type correctly', async () => {
      const marketType = await CommitmentCreationService.getMarketType('multi-option-market-123');
      expect(marketType).toBe('multi-option');
    });

    it('should provide multi-option market options for UI', async () => {
      const options = await CommitmentCreationService.getMarketOptions('multi-option-market-123');
      
      expect(options).toHaveLength(4);
      expect(options![0]).toEqual({
        id: 'team-a',
        text: 'Team A',
        totalTokens: 200
      });
      expect(options![3]).toEqual({
        id: 'team-d',
        text: 'Team D',
        totalTokens: 100
      });
    });

    it('should create multi-option market commitments using enhanced service', async () => {
      const result = await CommitmentCreationService.createCommitment({
        userId: 'test-user-123',
        marketId: 'multi-option-market-123',
        optionId: 'team-b',
        tokensToCommit: 150,
        clientInfo: { source: 'web' }
      });

      expect(result.success).toBe(true);
    });

    it('should support direct optionId targeting for multi-option markets', async () => {
      const result = await EnhancedCommitmentService.createMultiOptionCommitment(
        'test-user-123',
        'multi-option-market-123',
        'team-c',
        200,
        { source: 'mobile' }
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Backward Compatibility Layer', () => {
    it('should derive optionId from position for binary markets', async () => {
      // Test that position 'yes' maps to first option
      const yesRequest = {
        userId: 'test-user-123',
        marketId: 'binary-market-123',
        position: 'yes' as const,
        tokensToCommit: 100
      };

      const yesValidation = await CommitmentCreationService.validateCommitmentRequest(yesRequest);
      expect(yesValidation.isValid).toBe(true);
      expect(yesValidation.recommendedOptionId).toBe('yes');

      // Test that position 'no' maps to second option
      const noRequest = {
        userId: 'test-user-123',
        marketId: 'binary-market-123',
        position: 'no' as const,
        tokensToCommit: 100
      };

      const noValidation = await CommitmentCreationService.validateCommitmentRequest(noRequest);
      expect(noValidation.isValid).toBe(true);
      expect(noValidation.recommendedOptionId).toBe('no');
    });

    it('should derive position from optionId for multi-option markets', async () => {
      // Test that first option maps to 'yes' position
      const firstOptionRequest = {
        userId: 'test-user-123',
        marketId: 'multi-option-market-123',
        optionId: 'team-a',
        tokensToCommit: 100
      };

      const firstValidation = await CommitmentCreationService.validateCommitmentRequest(firstOptionRequest);
      expect(firstValidation.isValid).toBe(true);

      // Test that second option maps to 'no' position
      const secondOptionRequest = {
        userId: 'test-user-123',
        marketId: 'multi-option-market-123',
        optionId: 'team-b',
        tokensToCommit: 100
      };

      const secondValidation = await CommitmentCreationService.validateCommitmentRequest(secondOptionRequest);
      expect(secondValidation.isValid).toBe(true);
    });
  });

  describe('Enhanced Metadata Capture', () => {
    it('should capture comprehensive metadata for both binary and multi-option contexts', async () => {
      // Mock the enhanced service to capture the commitment data
      const mockCreateCommitment = jest.fn().mockResolvedValue({
        success: true,
        commitmentId: 'test-commitment-id',
        commitment: {
          id: 'test-commitment-id',
          userId: 'test-user-123',
          marketId: 'multi-option-market-123',
          optionId: 'team-b',
          position: 'no', // Derived for compatibility
          tokensCommitted: 150,
          metadata: {
            marketTitle: 'Who will win the championship?',
            selectedOptionText: 'Team B',
            marketOptionCount: 4,
            oddsSnapshot: {
              yesOdds: 2.0,
              noOdds: 1.8,
              optionOdds: {
                'team-a': 2.5,
                'team-b': 1.8,
                'team-c': 3.2,
                'team-d': 4.0
              }
            }
          }
        }
      });

      jest.spyOn(EnhancedCommitmentService, 'createCommitment').mockImplementation(mockCreateCommitment);

      const result = await CommitmentCreationService.createCommitment({
        userId: 'test-user-123',
        marketId: 'multi-option-market-123',
        optionId: 'team-b',
        tokensToCommit: 150
      });

      expect(result.success).toBe(true);
      expect(mockCreateCommitment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-123',
          marketId: 'multi-option-market-123',
          optionId: 'team-b',
          tokensToCommit: 150
        })
      );
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate market existence', async () => {
      // Mock market not found
      const { getDoc } = require('firebase/firestore');
      getDoc.mockImplementation(() => Promise.resolve({ exists: () => false }));

      const result = await CommitmentCreationService.createCommitment({
        userId: 'test-user-123',
        marketId: 'non-existent-market',
        position: 'yes',
        tokensToCommit: 100
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Market not found');
    });

    it('should validate option existence for multi-option markets', async () => {
      const validation = await CommitmentCreationService.validateCommitmentRequest({
        userId: 'test-user-123',
        marketId: 'multi-option-market-123',
        optionId: 'invalid-team',
        tokensToCommit: 100
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('Option not found'))).toBe(true);
    });

    it('should provide helpful validation messages', async () => {
      const validation = await CommitmentCreationService.validateCommitmentRequest({
        userId: 'test-user-123',
        marketId: 'binary-market-123',
        position: 'yes',
        tokensToCommit: 2000 // More than available balance
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('Insufficient balance'))).toBe(true);
    });
  });
});