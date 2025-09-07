import { ResolutionService, ResolutionServiceError, ResolutionErrorType } from '@/lib/services/resolution-service'
import { Timestamp } from 'firebase/firestore'
import {
  Market,
  Evidence,
  MarketStatus,
  PayoutPreview
} from '@/lib/types/database'
import { PredictionCommitment } from '@/lib/types/token'

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  Timestamp: {
    now: () => ({ toMillis: () => Date.now() })
  },
  writeBatch: jest.fn(),
  runTransaction: jest.fn(),
  increment: jest.fn((value) => ({ _increment: value }))
}))

// Get the mocked functions
const {
  collection: mockCollection,
  doc: mockDoc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  writeBatch: mockWriteBatch,
  runTransaction: mockRunTransaction
} = jest.requireMock('firebase/firestore')

describe('ResolutionService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock implementations
    mockWriteBatch.mockReturnValue({
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    })
    
    mockRunTransaction.mockImplementation(async (db, callback) => {
      const mockTransaction = {
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn()
      }
      return await callback(mockTransaction)
    })
    
    mockAddDoc.mockResolvedValue({ id: 'mock-log-id' })
    mockUpdateDoc.mockResolvedValue(undefined)
    
    mockCollection.mockReturnValue('mock-collection')
    mockDoc.mockReturnValue({ id: 'mock-doc-id' })
    mockQuery.mockReturnValue('mock-query')
    mockWhere.mockReturnValue('mock-where')
    mockOrderBy.mockReturnValue('mock-order-by')
  })

  describe('validateEvidence', () => {
    it('should require at least one piece of evidence', () => {
      const result = ResolutionService.validateEvidence([])
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.code === 'NO_EVIDENCE')).toBe(true)
    })

    it('should require either URL or description', () => {
      const evidence: Evidence[] = [
        {
          id: '1',
          type: 'screenshot',
          content: 'image.jpg',
          uploadedAt: Timestamp.now()
        }
      ]
      
      const result = ResolutionService.validateEvidence(evidence)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INSUFFICIENT_EVIDENCE')).toBe(true)
    })

    it('should validate URL format', () => {
      const evidence: Evidence[] = [
        {
          id: '1',
          type: 'url',
          content: 'not-a-valid-url',
          uploadedAt: Timestamp.now()
        }
      ]
      
      const result = ResolutionService.validateEvidence(evidence)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_URL')).toBe(true)
    })

    it('should accept valid evidence', () => {
      const evidence: Evidence[] = [
        {
          id: '1',
          type: 'url',
          content: 'https://example.com/proof',
          description: 'Official announcement',
          uploadedAt: Timestamp.now()
        },
        {
          id: '2',
          type: 'description',
          content: 'Detailed explanation of the outcome with sufficient detail',
          uploadedAt: Timestamp.now()
        }
      ]
      
      const result = ResolutionService.validateEvidence(evidence)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should warn about short evidence content', () => {
      const evidence: Evidence[] = [
        {
          id: '1',
          type: 'description',
          content: 'Short',
          uploadedAt: Timestamp.now()
        }
      ]
      
      const result = ResolutionService.validateEvidence(evidence)
      
      expect(result.warnings.some(w => w.code === 'SHORT_EVIDENCE')).toBe(true)
    })
  })

  describe('calculatePayoutPreview', () => {
    const mockMarket: Market = {
      id: 'market-123',
      title: 'Test Market',
      description: 'Test description',
      category: 'entertainment',
      status: 'pending_resolution' as MarketStatus,
      createdBy: 'creator-123',
      createdAt: Timestamp.now(),
      endsAt: Timestamp.now(),
      tags: [],
      options: [
        { id: 'yes', text: 'Yes', totalTokens: 600, participantCount: 3 },
        { id: 'no', text: 'No', totalTokens: 400, participantCount: 2 }
      ],
      totalParticipants: 5,
      totalTokensStaked: 1000,
      featured: false,
      trending: false
    }

    const mockCommitments: PredictionCommitment[] = [
      {
        id: 'commitment-1',
        userId: 'user-1',
        predictionId: 'market-123',
        tokensCommitted: 300,
        position: 'yes',
        odds: 1.67,
        potentialWinning: 500,
        status: 'active',
        committedAt: Timestamp.now(),
        userEmail: 'user1@example.com',
        userDisplayName: 'User 1',
        metadata: {
          marketStatus: 'active',
          marketTitle: 'Test Market',
          marketEndsAt: Timestamp.now(),
          oddsSnapshot: {
            yesOdds: 1.67,
            noOdds: 2.5,
            totalYesTokens: 600,
            totalNoTokens: 400,
            totalParticipants: 5
          },
          userBalanceAtCommitment: 1000,
          commitmentSource: 'web'
        }
      },
      {
        id: 'commitment-2',
        userId: 'user-2',
        predictionId: 'market-123',
        tokensCommitted: 300,
        position: 'yes',
        odds: 1.67,
        potentialWinning: 500,
        status: 'active',
        committedAt: Timestamp.now(),
        userEmail: 'user2@example.com',
        userDisplayName: 'User 2',
        metadata: {
          marketStatus: 'active',
          marketTitle: 'Test Market',
          marketEndsAt: Timestamp.now(),
          oddsSnapshot: {
            yesOdds: 1.67,
            noOdds: 2.5,
            totalYesTokens: 600,
            totalNoTokens: 400,
            totalParticipants: 5
          },
          userBalanceAtCommitment: 800,
          commitmentSource: 'web'
        }
      },
      {
        id: 'commitment-3',
        userId: 'user-3',
        predictionId: 'market-123',
        tokensCommitted: 400,
        position: 'no',
        odds: 2.5,
        potentialWinning: 1000,
        status: 'active',
        committedAt: Timestamp.now(),
        userEmail: 'user3@example.com',
        userDisplayName: 'User 3',
        metadata: {
          marketStatus: 'active',
          marketTitle: 'Test Market',
          marketEndsAt: Timestamp.now(),
          oddsSnapshot: {
            yesOdds: 1.67,
            noOdds: 2.5,
            totalYesTokens: 600,
            totalNoTokens: 400,
            totalParticipants: 5
          },
          userBalanceAtCommitment: 1200,
          commitmentSource: 'web'
        }
      }
    ]

    beforeEach(() => {
      // Mock market retrieval
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'market-123',
        data: () => mockMarket
      })

      // Mock commitments retrieval
      mockGetDocs.mockResolvedValue({
        docs: mockCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })
    })

    it('should calculate correct payouts with house and creator fees', async () => {
      const preview = await ResolutionService.calculatePayoutPreview('market-123', 'yes', 0.02)

      // Total pool: 1000 tokens
      // House fee (5%): 50 tokens
      // Creator fee (2%): 20 tokens  
      // Winner pool: 930 tokens
      // Winners: user-1 (300 tokens) + user-2 (300 tokens) = 600 tokens total
      
      expect(preview.totalPool).toBe(1000)
      expect(preview.houseFee).toBe(50) // 5% of 1000
      expect(preview.creatorFee).toBe(20) // 2% of 1000
      expect(preview.winnerPool).toBe(930) // 1000 - 50 - 20
      expect(preview.winnerCount).toBe(2)
      
      // Each winner should get their proportional share of the winner pool
      // user-1: (300/600) * 930 = 465 tokens
      // user-2: (300/600) * 930 = 465 tokens
      expect(preview.payouts).toHaveLength(2)
      expect(preview.payouts[0].projectedPayout).toBe(465)
      expect(preview.payouts[1].projectedPayout).toBe(465)
      expect(preview.payouts[0].projectedProfit).toBe(165) // 465 - 300
      expect(preview.payouts[1].projectedProfit).toBe(165) // 465 - 300
    })

    it('should handle different creator fee percentages', async () => {
      const preview = await ResolutionService.calculatePayoutPreview('market-123', 'yes', 0.05) // 5% creator fee

      expect(preview.houseFee).toBe(50) // Always 5%
      expect(preview.creatorFee).toBe(50) // 5% of 1000
      expect(preview.winnerPool).toBe(900) // 1000 - 50 - 50
      expect(preview.creatorPayout.feePercentage).toBe(5)
    })

    it('should handle single winner scenario', async () => {
      // Mock single winner commitment
      const singleWinnerCommitments = [mockCommitments[0]] // Only user-1 wins
      
      mockGetDocs.mockResolvedValue({
        docs: mockCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      const preview = await ResolutionService.calculatePayoutPreview('market-123', 'yes', 0.02)

      expect(preview.winnerCount).toBe(2) // Both yes voters win
      expect(preview.payouts).toHaveLength(2)
    })

    it('should handle no winners scenario', async () => {
      // Mock empty commitments for the winning option
      mockGetDocs.mockResolvedValueOnce({
        docs: mockCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      }).mockResolvedValueOnce({
        docs: [] // No commitments for 'maybe' option
      })

      const preview = await ResolutionService.calculatePayoutPreview('market-123', 'maybe', 0.02)

      expect(preview.winnerCount).toBe(0)
      expect(preview.payouts).toHaveLength(0)
      expect(preview.winnerPool).toBe(930) // Fees still deducted
    })
  })

  describe('getUserBets', () => {
    it('should retrieve user bets for a specific option', async () => {
      const mockCommitments = [
        {
          id: 'commitment-1',
          userId: 'user-1',
          predictionId: 'market-123',
          tokensCommitted: 300,
          position: 'yes',
          status: 'active',
          userEmail: 'user1@example.com',
          userDisplayName: 'User 1'
        },
        {
          id: 'commitment-2',
          userId: 'user-2',
          predictionId: 'market-123',
          tokensCommitted: 200,
          position: 'yes',
          status: 'active',
          userEmail: 'user2@example.com',
          userDisplayName: 'User 2'
        }
      ]

      // Reset and setup fresh mock for this test
      mockGetDocs.mockReset()
      mockGetDocs.mockResolvedValue({
        docs: mockCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      const bets = await ResolutionService.getUserBets('market-123', 'yes')

      expect(bets).toHaveLength(2)
      expect(bets[0]).toEqual({
        userId: 'user-1',
        tokensStaked: 300,
        userEmail: 'user1@example.com',
        userDisplayName: 'User 1'
      })
      expect(bets[1]).toEqual({
        userId: 'user-2',
        tokensStaked: 200,
        userEmail: 'user2@example.com',
        userDisplayName: 'User 2'
      })
    })

    it('should handle empty results', async () => {
      mockGetDocs.mockResolvedValue({
        docs: []
      })

      const bets = await ResolutionService.getUserBets('market-123', 'yes')

      expect(bets).toHaveLength(0)
    })
  })

  describe('getPendingResolutionMarkets', () => {
    it('should return markets past their end date', async () => {
      const pastDate = new Date()
      pastDate.setHours(pastDate.getHours() - 1) // 1 hour ago

      const mockMarkets = [
        {
          id: 'market-1',
          title: 'Past Market 1',
          status: 'active',
          endsAt: { toMillis: () => pastDate.getTime() }
        },
        {
          id: 'market-2', 
          title: 'Past Market 2',
          status: 'active',
          endsAt: { toMillis: () => pastDate.getTime() }
        }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockMarkets.map(market => ({
          id: market.id,
          data: () => market
        }))
      })

      const markets = await ResolutionService.getPendingResolutionMarkets()

      expect(markets).toHaveLength(2)
      expect(markets[0].status).toBe('pending_resolution')
      expect(markets[0].pendingResolution).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('Database error'))

      await expect(
        ResolutionService.getPendingResolutionMarkets()
      ).rejects.toThrow('Failed to retrieve pending resolution markets')
    })

    it('should handle missing market in payout calculation', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      })

      await expect(
        ResolutionService.calculatePayoutPreview('nonexistent-market', 'yes')
      ).rejects.toThrow('Failed to calculate payout preview')
    })

    it('should throw ResolutionServiceError with proper error types', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      })

      try {
        await ResolutionService.getUserResolutionPayouts('nonexistent-user')
      } catch (error) {
        expect(error).toBeInstanceOf(ResolutionServiceError)
        expect(error.type).toBe(ResolutionErrorType.DATABASE_TRANSACTION_FAILED)
        expect(error.message).toBe('Failed to retrieve user payouts')
      }
    })
  })

  describe('resolution status tracking', () => {
    it('should track resolution logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          marketId: 'market-123',
          action: 'resolution_started',
          adminId: 'admin-123',
          timestamp: Timestamp.now()
        }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockLogs.map(log => ({
          id: log.id,
          data: () => log
        }))
      })

      const logs = await ResolutionService.getResolutionLogs('market-123')
      expect(logs).toHaveLength(1)
      expect(logs[0].action).toBe('resolution_started')
    })

    it('should determine resolution status correctly', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          marketId: 'market-123',
          action: 'resolution_completed',
          adminId: 'admin-123',
          timestamp: Timestamp.now()
        }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockLogs.map(log => ({
          id: log.id,
          data: () => log
        }))
      })

      const status = await ResolutionService.getResolutionStatus('market-123')
      expect(status.status).toBe('completed')
      expect(status.lastAction?.action).toBe('resolution_completed')
    })
  })
})