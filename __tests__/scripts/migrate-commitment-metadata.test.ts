/**
 * Tests for commitment metadata migration script
 */

import { Timestamp } from 'firebase/firestore';
import { CommitmentMetadataMigration } from '../../scripts/migrate-commitment-metadata';

// Mock Firebase
jest.mock('../../lib/db/database', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    commit: jest.fn()
  })),
  Timestamp: {
    now: () => ({ toMillis: () => Date.now() }),
    fromDate: (date: Date) => ({ toMillis: () => date.getTime() })
  }
}));

describe('CommitmentMetadataMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('dryRun', () => {
    it('should analyze commitments without making changes', async () => {
      const mockCommitments = [
        { id: 'commitment1', data: () => ({ userId: 'user1', metadata: {} }) },
        { id: 'commitment2', data: () => ({ userId: 'user2' }) }, // Missing metadata
        { id: 'commitment3', data: () => ({ userId: 'user3', metadata: {} }) }
      ];

      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        size: 3,
        docs: mockCommitments
      });

      const result = await CommitmentMetadataMigration.dryRun();

      expect(result).toEqual({
        totalCommitments: 3,
        needsMigration: 1,
        alreadyMigrated: 2
      });
    });
  });

  describe('generateMetadataForCommitment', () => {
    it('should generate metadata for legacy commitment', async () => {
      const legacyCommitment = {
        id: 'commitment1',
        userId: 'user1',
        predictionId: 'market1',
        tokensCommitted: 100,
        position: 'yes' as const,
        odds: 2.0,
        potentialWinning: 200,
        status: 'active' as const,
        committedAt: Timestamp.now()
      };

      const mockMarket = {
        id: 'market1',
        title: 'Test Market',
        status: 'active',
        endsAt: Timestamp.fromDate(new Date(Date.now() + 86400000)),
        options: [
          { id: 'yes', totalTokens: 500 },
          { id: 'no', totalTokens: 300 }
        ],
        totalParticipants: 18
      };

      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockMarket
      });

      // Access the private method through the class
      const metadata = await (CommitmentMetadataMigration as any).generateMetadataForCommitment(legacyCommitment);

      expect(metadata).toEqual({
        marketStatus: 'active',
        marketTitle: 'Test Market',
        marketEndsAt: mockMarket.endsAt,
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 2.0,
          totalYesTokens: 500,
          totalNoTokens: 300,
          totalParticipants: 18
        },
        userBalanceAtCommitment: 100,
        commitmentSource: 'web',
        ipAddress: undefined,
        userAgent: undefined
      });
    });

    it('should return null for non-existent market', async () => {
      const legacyCommitment = {
        id: 'commitment1',
        userId: 'user1',
        predictionId: 'nonexistent',
        tokensCommitted: 100,
        position: 'yes' as const,
        odds: 2.0,
        potentialWinning: 200,
        status: 'active' as const,
        committedAt: Timestamp.now()
      };

      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => false
      });

      const metadata = await (CommitmentMetadataMigration as any).generateMetadataForCommitment(legacyCommitment);

      expect(metadata).toBeNull();
    });
  });
});