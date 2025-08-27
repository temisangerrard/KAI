/**
 * Tests for CommitmentValidationService
 */

import { Timestamp } from 'firebase/firestore';
import { CommitmentValidationService } from '@/lib/services/commitment-validation-service';
import { PredictionCommitment, TokenCommitmentRequest, UserBalance } from '@/lib/types/token';
import { Market } from '@/lib/types/database';

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  Timestamp: {
    now: () => ({ toMillis: () => Date.now() }),
    fromDate: (date: Date) => ({ toMillis: () => date.getTime() })
  }
}));

describe('CommitmentValidationService', () => {
  const mockUserBalance: UserBalance = {
    userId: 'user1',
    availableTokens: 1000,
    committedTokens: 500,
    totalEarned: 2000,
    totalSpent: 1500,
    lastUpdated: Timestamp.now(),
    version: 1
  };

  const mockMarket: Market = {
    id: 'market1',
    title: 'Test Market',
    description: 'Test market description',
    category: 'entertainment',
    status: 'active',
    createdBy: 'admin',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.fromDate(new Date(Date.now() + 86400000)), // 24 hours from now
    options: [
      {
        id: 'yes',
        text: 'Yes',
        totalTokens: 500,
        participantCount: 10,
        odds: 2.0
      },
      {
        id: 'no',
        text: 'No',
        totalTokens: 300,
        participantCount: 8,
        odds: 1.5
      }
    ],
    totalParticipants: 18,
    totalTokensStaked: 800,
    featured: false,
    trending: false,
    tags: ['test']
  };

  const mockCommitmentRequest: TokenCommitmentRequest = {
    predictionId: 'market1',
    tokensToCommit: 100,
    position: 'yes',
    userId: 'user1'
  };

  describe('validateCommitmentRequest', () => {
    it('should validate a valid commitment request', async () => {
      const result = await CommitmentValidationService.validateCommitmentRequest(
        mockCommitmentRequest,
        mockUserBalance,
        mockMarket
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject commitment when market is not active', async () => {
      const inactiveMarket = { ...mockMarket, status: 'closed' as const };
      
      const result = await CommitmentValidationService.validateCommitmentRequest(
        mockCommitmentRequest,
        mockUserBalance,
        inactiveMarket
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Market is not active (status: closed)');
    });

    it('should reject commitment when market has ended', async () => {
      const endedMarket = { 
        ...mockMarket, 
        endsAt: Timestamp.fromDate(new Date(Date.now() - 3600000)) // 1 hour ago
      };
      
      const result = await CommitmentValidationService.validateCommitmentRequest(
        mockCommitmentRequest,
        mockUserBalance,
        endedMarket
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Market has already ended');
    });

    it('should reject commitment when user has insufficient balance', async () => {
      const lowBalanceUser = { ...mockUserBalance, availableTokens: 50 };
      
      const result = await CommitmentValidationService.validateCommitmentRequest(
        mockCommitmentRequest,
        lowBalanceUser,
        mockMarket
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Insufficient balance. Available: 50, Required: 100');
    });

    it('should reject commitment below minimum amount', async () => {
      const lowCommitmentRequest = { ...mockCommitmentRequest, tokensToCommit: 0 };
      
      const result = await CommitmentValidationService.validateCommitmentRequest(
        lowCommitmentRequest,
        mockUserBalance,
        mockMarket
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('positive') || error.includes('Minimum'))).toBe(true);
    });

    it('should reject commitment above maximum amount', async () => {
      const highCommitmentRequest = { ...mockCommitmentRequest, tokensToCommit: 2000 };
      
      const result = await CommitmentValidationService.validateCommitmentRequest(
        highCommitmentRequest,
        mockUserBalance,
        mockMarket
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum commitment is 1000 tokens');
    });
  });

  describe('validateCommitmentIntegrity', () => {
    const mockCommitment: PredictionCommitment = {
      id: 'commitment1',
      userId: 'user1',
      predictionId: 'market1',
      tokensCommitted: 100,
      position: 'yes',
      odds: 2.0,
      potentialWinning: 200,
      status: 'active',
      committedAt: Timestamp.now(),
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Test Market',
        marketEndsAt: Timestamp.fromDate(new Date(Date.now() + 86400000)),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 1.5,
          totalYesTokens: 500,
          totalNoTokens: 300,
          totalParticipants: 18
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web'
      }
    };

    it('should validate a valid commitment', async () => {
      const result = await CommitmentValidationService.validateCommitmentIntegrity(mockCommitment);

      expect(result.isValid).toBe(true);
      expect(result.issues.filter(i => i.type === 'error')).toHaveLength(0);
    });

    it('should detect invalid odds', async () => {
      const invalidCommitment = { ...mockCommitment, odds: -1 };
      
      const result = await CommitmentValidationService.validateCommitmentIntegrity(invalidCommitment);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual({
        type: 'error',
        field: 'odds',
        message: 'Odds must be positive',
        currentValue: -1
      });
    });

    it('should detect incorrect potential winning calculation', async () => {
      const invalidCommitment = { ...mockCommitment, potentialWinning: 150 }; // Should be 200
      
      const result = await CommitmentValidationService.validateCommitmentIntegrity(invalidCommitment);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual({
        type: 'error',
        field: 'potentialWinning',
        message: 'Potential winning calculation is incorrect',
        currentValue: 150,
        expectedValue: 200
      });
    });

    it('should detect invalid timestamp consistency', async () => {
      const invalidCommitment = { 
        ...mockCommitment, 
        resolvedAt: Timestamp.fromDate(new Date(Date.now() - 3600000)), // Before committed time
        status: 'won' as const
      };
      
      const result = await CommitmentValidationService.validateCommitmentIntegrity(invalidCommitment);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual({
        type: 'error',
        field: 'resolvedAt',
        message: 'Resolved timestamp cannot be before committed timestamp',
        currentValue: invalidCommitment.resolvedAt
      });
    });
  });

  describe('createCommitmentMetadata', () => {
    it('should create proper metadata for a commitment', async () => {
      const clientInfo = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        source: 'web' as const
      };

      const metadata = await CommitmentValidationService.createCommitmentMetadata(
        mockMarket,
        mockUserBalance,
        mockCommitmentRequest,
        clientInfo
      );

      expect(metadata).toEqual({
        marketStatus: 'active',
        marketTitle: 'Test Market',
        marketEndsAt: mockMarket.endsAt,
        oddsSnapshot: {
          yesOdds: expect.any(Number),
          noOdds: expect.any(Number),
          totalYesTokens: 500,
          totalNoTokens: 300,
          totalParticipants: 18
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      });
    });

    it('should handle missing client info gracefully', async () => {
      const metadata = await CommitmentValidationService.createCommitmentMetadata(
        mockMarket,
        mockUserBalance,
        mockCommitmentRequest
      );

      expect(metadata.commitmentSource).toBe('web');
      expect(metadata.ipAddress).toBeUndefined();
      expect(metadata.userAgent).toBeUndefined();
    });
  });

  describe('batchValidateCommitments', () => {
    const mockCommitment: PredictionCommitment = {
      id: 'commitment1',
      userId: 'user1',
      predictionId: 'market1',
      tokensCommitted: 100,
      position: 'yes',
      odds: 2.0,
      potentialWinning: 200,
      status: 'active',
      committedAt: Timestamp.now(),
      metadata: {
        marketStatus: 'active',
        marketTitle: 'Test Market',
        marketEndsAt: Timestamp.fromDate(new Date(Date.now() + 86400000)),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 1.5,
          totalYesTokens: 500,
          totalNoTokens: 300,
          totalParticipants: 18
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web'
      }
    };

    it('should validate multiple commitments', async () => {
      const commitments = [
        { ...mockCommitment, id: 'commitment1' } as PredictionCommitment,
        { ...mockCommitment, id: 'commitment2', odds: -1 } as PredictionCommitment
      ];

      const results = await CommitmentValidationService.batchValidateCommitments(commitments);

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[1].issues).toContainEqual({
        type: 'error',
        field: 'odds',
        message: 'Odds must be positive',
        currentValue: -1
      });
    });
  });
});