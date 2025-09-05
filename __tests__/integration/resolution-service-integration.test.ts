import { ResolutionService } from '@/lib/services/resolution-service'
import { Timestamp } from 'firebase/firestore'
import { Evidence } from '@/lib/types/database'

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
  increment: jest.fn((value) => ({ _increment: value }))
}))

describe('ResolutionService Integration', () => {
  const {
    getDoc: mockGetDoc,
    getDocs: mockGetDocs,
    writeBatch: mockWriteBatch
  } = jest.requireMock('firebase/firestore')

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default batch mock
    mockWriteBatch.mockReturnValue({
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    })
  })

  describe('Complete Resolution Workflow', () => {
    it('should handle end-to-end market resolution with fees', async () => {
      // Mock market data
      const mockMarket = {
        id: 'market-123',
        title: 'Will Drake release an album in 2024?',
        description: 'Prediction about Drake album release',
        category: 'entertainment',
        status: 'pending_resolution',
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

      // Mock commitments data
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

      // Setup mocks
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'market-123',
        data: () => mockMarket
      })

      mockGetDocs.mockResolvedValue({
        docs: mockCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      // Valid evidence
      const evidence: Evidence[] = [
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

      // Test payout calculation first
      const payoutPreview = await ResolutionService.calculatePayoutPreview('market-123', 'yes', 0.03)

      // Verify fee calculations
      expect(payoutPreview.totalPool).toBe(1000) // Total tokens
      expect(payoutPreview.houseFee).toBe(50) // 5% house fee
      expect(payoutPreview.creatorFee).toBe(30) // 3% creator fee
      expect(payoutPreview.winnerPool).toBe(920) // 1000 - 50 - 30
      expect(payoutPreview.winnerCount).toBe(2) // Two yes voters

      // Verify individual payouts
      expect(payoutPreview.payouts).toHaveLength(2)
      
      // user-1: (400/600) * 920 = 613 tokens
      const user1Payout = payoutPreview.payouts.find(p => p.userId === 'user-1')
      expect(user1Payout?.projectedPayout).toBe(613)
      expect(user1Payout?.projectedProfit).toBe(213) // 613 - 400

      // user-2: (200/600) * 920 = 306 tokens  
      const user2Payout = payoutPreview.payouts.find(p => p.userId === 'user-2')
      expect(user2Payout?.projectedPayout).toBe(306)
      expect(user2Payout?.projectedProfit).toBe(106) // 306 - 200

      // Verify creator payout
      expect(payoutPreview.creatorPayout.userId).toBe('creator-123')
      expect(payoutPreview.creatorPayout.feeAmount).toBe(30)
      expect(payoutPreview.creatorPayout.feePercentage).toBe(3)

      // Test evidence validation
      const evidenceValidation = ResolutionService.validateEvidence(evidence)
      expect(evidenceValidation.isValid).toBe(true)
      expect(evidenceValidation.errors).toHaveLength(0)

      // Test complete resolution
      const resolutionResult = await ResolutionService.resolveMarket(
        'market-123',
        'yes',
        evidence,
        'admin-123',
        0.03
      )

      expect(resolutionResult.success).toBe(true)
      expect(resolutionResult.resolutionId).toBeDefined()

      // Verify batch operations were called
      const batchMock = mockWriteBatch()
      expect(batchMock.set).toHaveBeenCalled()
      expect(batchMock.update).toHaveBeenCalled()
      expect(batchMock.commit).toHaveBeenCalled()
    })

    it('should handle resolution with invalid evidence', async () => {
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
      ).rejects.toThrow('Invalid evidence')
    })

    it('should handle resolution of already resolved market', async () => {
      const resolvedMarket = {
        id: 'market-123',
        status: 'resolved',
        title: 'Already Resolved Market'
      }

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'market-123',
        data: () => resolvedMarket
      })

      const validEvidence: Evidence[] = [
        {
          id: '1',
          type: 'description',
          content: 'Valid evidence description with sufficient detail',
          uploadedAt: Timestamp.now()
        }
      ]

      await expect(
        ResolutionService.resolveMarket(
          'market-123',
          'yes',
          validEvidence,
          'admin-123'
        )
      ).rejects.toThrow('Market is already resolved')
    })
  })

  describe('Fee Structure Validation', () => {
    it('should correctly distribute fees across different scenarios', async () => {
      const scenarios = [
        { totalPool: 1000, creatorFee: 0.01, expectedHouse: 50, expectedCreator: 10, expectedWinner: 940 },
        { totalPool: 1000, creatorFee: 0.05, expectedHouse: 50, expectedCreator: 50, expectedWinner: 900 },
        { totalPool: 500, creatorFee: 0.02, expectedHouse: 25, expectedCreator: 10, expectedWinner: 465 },
        { totalPool: 2000, creatorFee: 0.03, expectedHouse: 100, expectedCreator: 60, expectedWinner: 1840 }
      ]

      for (const scenario of scenarios) {
        // Mock market and commitments for each scenario
        const mockMarket = {
          id: 'test-market',
          createdBy: 'creator-123',
          status: 'pending_resolution'
        }

        const mockCommitments = [
          {
            id: 'commitment-1',
            userId: 'user-1',
            predictionId: 'test-market',
            tokensCommitted: scenario.totalPool,
            position: 'yes',
            status: 'active'
          }
        ]

        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => mockMarket
        })

        mockGetDocs.mockResolvedValue({
          docs: mockCommitments.map(c => ({ id: c.id, data: () => c }))
        })

        const preview = await ResolutionService.calculatePayoutPreview(
          'test-market',
          'yes',
          scenario.creatorFee
        )

        expect(preview.totalPool).toBe(scenario.totalPool)
        expect(preview.houseFee).toBe(scenario.expectedHouse)
        expect(preview.creatorFee).toBe(scenario.expectedCreator)
        expect(preview.winnerPool).toBe(scenario.expectedWinner)
      }
    })
  })
})