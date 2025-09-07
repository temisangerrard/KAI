import { ResolutionService, ResolutionServiceError, ResolutionErrorType } from '@/lib/services/resolution-service'
import { Timestamp } from 'firebase/firestore'
import { Evidence, MarketStatus } from '@/lib/types/database'

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'mock-collection'),
  doc: jest.fn(() => ({ id: 'mock-doc-id' })),
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

describe('ResolutionService Enhanced Integration', () => {
  const {
    getDoc: mockGetDoc,
    getDocs: mockGetDocs,
    addDoc: mockAddDoc,
    updateDoc: mockUpdateDoc,
    runTransaction: mockRunTransaction
  } = jest.requireMock('firebase/firestore')

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default transaction mock
    mockRunTransaction.mockImplementation(async (db, callback) => {
      const mockTransaction = {
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn()
      }
      return await callback(mockTransaction)
    })

    // Setup default addDoc mock for logging
    mockAddDoc.mockResolvedValue({ id: 'log-id' })

    // Setup default writeBatch mock
    const { writeBatch: mockWriteBatch } = jest.requireMock('firebase/firestore')
    mockWriteBatch.mockReturnValue({
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    })
  })

  describe('Enhanced Resolution Workflow with Rollback', () => {
    const mockMarket = {
      id: 'market-123',
      title: 'Will Drake release an album in 2024?',
      description: 'Prediction about Drake album release',
      category: 'entertainment',
      status: 'pending_resolution' as MarketStatus,
      createdBy: 'creator-123',
      createdAt: Timestamp.now(),
      endsAt: Timestamp.now(),
      tags: ['music', 'drake'],
      options: [
        { id: 'yes', text: 'Yes', totalTokens: 600, participantCount: 3 },
        { id: 'no', text: 'No', totalTokens: 400, participantCount: 2 }
      ],
      totalParticipants: 5,
      totalTokensStaked: 1000,
      featured: false,
      trending: false
    }

    const mockCommitments = [
      {
        id: 'commitment-1',
        userId: 'user-1',
        predictionId: 'market-123',
        tokensCommitted: 400,
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
      },
      {
        id: 'commitment-3',
        userId: 'user-3',
        predictionId: 'market-123',
        tokensCommitted: 400,
        position: 'no',
        status: 'active',
        userEmail: 'user3@example.com',
        userDisplayName: 'User 3'
      }
    ]

    const validEvidence: Evidence[] = [
      {
        id: '1',
        type: 'url',
        content: 'https://pitchfork.com/news/drake-announces-new-album',
        description: 'Official announcement on Pitchfork',
        uploadedAt: Timestamp.now()
      },
      {
        id: '2',
        type: 'description',
        content: 'Drake officially announced his new album "For All The Dogs" on October 6, 2024, confirming the prediction outcome.',
        uploadedAt: Timestamp.now()
      }
    ]

    beforeEach(() => {
      // Setup market and commitments mocks
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'market-123',
        data: () => mockMarket
      })

      mockGetDocs.mockResolvedValue({
        docs: mockCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment,
          ref: { id: commitment.id }
        }))
      })

      mockUpdateDoc.mockResolvedValue(undefined)
    })

    it('should complete successful resolution with proper logging', async () => {
      // Mock successful transaction
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn()
        }
        return await callback(mockTransaction)
      })

      const result = await ResolutionService.resolveMarket(
        'market-123',
        'yes',
        validEvidence,
        'admin-123',
        0.03
      )

      expect(result.success).toBe(true)
      expect(result.resolutionId).toBeDefined()

      // Verify logging calls
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          marketId: 'market-123',
          action: 'resolution_started',
          adminId: 'admin-123'
        })
      )

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'evidence_validated'
        })
      )

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'payouts_calculated'
        })
      )

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'resolution_completed'
        })
      )
    })

    it('should handle transaction failure and reset market status', async () => {
      // Mock transaction failure
      mockRunTransaction.mockRejectedValueOnce(new Error('Database transaction failed'))

      await expect(
        ResolutionService.resolveMarket(
          'market-123',
          'yes',
          validEvidence,
          'admin-123',
          0.03
        )
      ).rejects.toThrow(ResolutionServiceError)

      // Verify failure logging
      const logCalls = mockAddDoc.mock.calls
      const resolutionFailed = logCalls.some(call => 
        call[1] && call[1].action === 'resolution_failed'
      )

      expect(resolutionFailed).toBe(true)

      // Verify market status reset was attempted
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'pending_resolution'
        })
      )
    })

    it('should handle evidence validation failure', async () => {
      const invalidEvidence: Evidence[] = [
        {
          id: '1',
          type: 'url',
          content: 'not-a-valid-url',
          uploadedAt: Timestamp.now()
        }
      ]

      await expect(
        ResolutionService.resolveMarket(
          'market-123',
          'yes',
          invalidEvidence,
          'admin-123'
        )
      ).rejects.toThrow(ResolutionServiceError)

      // Should log failure but not attempt rollback (no resolution created)
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'resolution_failed'
        })
      )
    })

    it('should handle market not found error', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      })

      await expect(
        ResolutionService.resolveMarket(
          'nonexistent-market',
          'yes',
          validEvidence,
          'admin-123'
        )
      ).rejects.toThrow(ResolutionServiceError)

      const error = await ResolutionService.resolveMarket(
        'nonexistent-market',
        'yes',
        validEvidence,
        'admin-123'
      ).catch(e => e)

      expect(error.type).toBe(ResolutionErrorType.MARKET_NOT_FOUND)
      expect(error.marketId).toBe('nonexistent-market')
    })

    it('should handle already resolved market error', async () => {
      const resolvedMarket = {
        ...mockMarket,
        status: 'resolved' as MarketStatus
      }

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => resolvedMarket
      })

      await expect(
        ResolutionService.resolveMarket(
          'market-123',
          'yes',
          validEvidence,
          'admin-123'
        )
      ).rejects.toThrow(ResolutionServiceError)

      const error = await ResolutionService.resolveMarket(
        'market-123',
        'yes',
        validEvidence,
        'admin-123'
      ).catch(e => e)

      expect(error.type).toBe(ResolutionErrorType.MARKET_ALREADY_RESOLVED)
    })
  })

  describe('Market Cancellation Workflow', () => {
    it('should cancel market and process refunds', async () => {
      const mockMarket = {
        id: 'market-123',
        title: 'Test Market',
        status: 'pending_resolution' as MarketStatus,
        createdBy: 'creator-123'
      }

      const mockCommitments = [
        {
          id: 'commitment-1',
          userId: 'user-1',
          predictionId: 'market-123',
          tokensCommitted: 100,
          status: 'active'
        },
        {
          id: 'commitment-2',
          userId: 'user-2',
          predictionId: 'market-123',
          tokensCommitted: 200,
          status: 'active'
        }
      ]

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockMarket
      })

      mockGetDocs.mockResolvedValue({
        docs: mockCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment,
          ref: { id: commitment.id }
        }))
      })

      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn()
        }
        return await callback(mockTransaction)
      })

      const result = await ResolutionService.cancelMarket(
        'market-123',
        'Market outcome cannot be determined',
        'admin-123',
        true
      )

      expect(result.success).toBe(true)
      expect(result.refundsProcessed).toBe(2)

      // Verify logging
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'resolution_started',
          details: expect.objectContaining({
            action: 'cancel_market',
            reason: 'Market outcome cannot be determined'
          })
        })
      )
    })

    it('should cancel market without refunds when specified', async () => {
      const mockMarket = {
        id: 'market-123',
        title: 'Test Market',
        status: 'pending_resolution' as MarketStatus,
        createdBy: 'creator-123'
      }

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockMarket
      })

      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn(),
          set: jest.fn(),
          update: jest.fn()
        }
        return await callback(mockTransaction)
      })

      const result = await ResolutionService.cancelMarket(
        'market-123',
        'Market violated terms',
        'admin-123',
        false // No refunds
      )

      expect(result.success).toBe(true)
      expect(result.refundsProcessed).toBe(0)
    })
  })

  describe('Resolution Status Tracking', () => {
    it('should return correct resolution status', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          marketId: 'market-123',
          action: 'resolution_started',
          adminId: 'admin-123',
          timestamp: Timestamp.now()
        },
        {
          id: 'log-2',
          marketId: 'market-123',
          action: 'evidence_validated',
          adminId: 'admin-123',
          timestamp: Timestamp.now()
        },
        {
          id: 'log-3',
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
      expect(status.logs).toHaveLength(3)
      expect(status.lastAction?.action).toBe('resolution_completed')
    })

    it('should return not_started for market with no logs', async () => {
      mockGetDocs.mockResolvedValue({
        docs: []
      })

      const status = await ResolutionService.getResolutionStatus('market-123')

      expect(status.status).toBe('not_started')
      expect(status.logs).toHaveLength(0)
    })

    it('should return failed status for failed resolution', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          marketId: 'market-123',
          action: 'resolution_started',
          adminId: 'admin-123',
          timestamp: Timestamp.now()
        },
        {
          id: 'log-2',
          marketId: 'market-123',
          action: 'resolution_failed',
          adminId: 'admin-123',
          timestamp: Timestamp.now(),
          error: 'Database transaction failed'
        }
      ]

      mockGetDocs.mockResolvedValue({
        docs: mockLogs.map(log => ({
          id: log.id,
          data: () => log
        }))
      })

      const status = await ResolutionService.getResolutionStatus('market-123')

      expect(status.status).toBe('failed')
      expect(status.error).toBe('Database transaction failed')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should provide detailed error information', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      })

      try {
        await ResolutionService.resolveMarket(
          'nonexistent-market',
          'yes',
          validEvidence,
          'admin-123'
        )
      } catch (error) {
        expect(error).toBeInstanceOf(ResolutionServiceError)
        expect(error.type).toBe(ResolutionErrorType.MARKET_NOT_FOUND)
        expect(error.marketId).toBe('nonexistent-market')
        expect(error.message).toBe('Market not found')
      }
    })

    it('should test rollback functionality directly', async () => {
      // Test rollback method directly since it's hard to trigger through resolveMarket
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'payout-1',
            data: () => ({
              userId: 'user-1',
              payoutAmount: 500,
              resolutionId: 'resolution-123'
            }),
            ref: { id: 'payout-1' }
          }
        ]
      })

      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              marketId: 'market-123',
              winningOptionId: 'yes',
              totalPayout: 920
            })
          }),
          set: jest.fn(),
          update: jest.fn()
        }
        return await callback(mockTransaction)
      })

      await ResolutionService.rollbackResolution('market-123', 'resolution-123', 'admin-123')

      // Verify rollback logging
      const logCalls = mockAddDoc.mock.calls
      const rollbackInitiated = logCalls.some(call => 
        call[1] && call[1].action === 'rollback_initiated'
      )
      const rollbackCompleted = logCalls.some(call => 
        call[1] && call[1].action === 'rollback_completed'
      )

      expect(rollbackInitiated).toBe(true)
      expect(rollbackCompleted).toBe(true)
    })

    it('should handle rollback failure gracefully', async () => {
      // Test the rollbackResolution method directly
      mockGetDocs.mockResolvedValue({
        docs: []
      })

      mockRunTransaction.mockRejectedValue(new Error('Rollback transaction failed'))

      await expect(
        ResolutionService.rollbackResolution('market-123', 'resolution-123', 'admin-123')
      ).rejects.toThrow(ResolutionServiceError)

      const error = await ResolutionService.rollbackResolution('market-123', 'resolution-123', 'admin-123')
        .catch(e => e)

      expect(error.type).toBe(ResolutionErrorType.ROLLBACK_FAILED)
      expect(error.message).toBe('Failed to rollback resolution')
    })
  })

  const validEvidence: Evidence[] = [
    {
      id: '1',
      type: 'url',
      content: 'https://example.com/proof',
      description: 'Valid evidence',
      uploadedAt: Timestamp.now()
    }
  ]
})