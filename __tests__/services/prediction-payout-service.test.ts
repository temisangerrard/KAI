/**
 * Tests for Prediction Payout Service
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { PredictionPayoutService } from '@/lib/services/prediction-payout-service'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { PredictionCommitment, UserBalance } from '@/lib/types/token'
import { Timestamp } from 'firebase/firestore'

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {},
  auth: {},
  analytics: null,
  app: {},
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  writeBatch: jest.fn()
}))

// Mock Firebase modules
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  writeBatch: jest.fn(),
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 })
  }
}))

// Mock TokenBalanceService
jest.mock('@/lib/services/token-balance-service')

describe('PredictionPayoutService', () => {
  const mockPredictionId = 'test-prediction-123'
  const mockWinningOptionId = 'option-yes'
  const mockLosingOptionId = 'option-no'

  const mockCommitments: (PredictionCommitment & { id: string })[] = [
    {
      id: 'commitment-1',
      userId: 'user-1',
      predictionId: mockPredictionId,
      tokensCommitted: 100,
      position: 'yes',
      odds: 2.0,
      potentialWinning: 200,
      status: 'active',
      committedAt: Timestamp.now()
    },
    {
      id: 'commitment-2',
      userId: 'user-2',
      predictionId: mockPredictionId,
      tokensCommitted: 200,
      position: 'yes',
      odds: 2.0,
      potentialWinning: 400,
      status: 'active',
      committedAt: Timestamp.now()
    },
    {
      id: 'commitment-3',
      userId: 'user-3',
      predictionId: mockPredictionId,
      tokensCommitted: 150,
      position: 'no',
      odds: 1.5,
      potentialWinning: 225,
      status: 'active',
      committedAt: Timestamp.now()
    },
    {
      id: 'commitment-4',
      userId: 'user-4',
      predictionId: mockPredictionId,
      tokensCommitted: 50,
      position: 'no',
      odds: 1.5,
      potentialWinning: 75,
      status: 'active',
      committedAt: Timestamp.now()
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('calculatePayouts', () => {
    it('should calculate correct payouts for winners and losers', async () => {
      // Mock Firebase query to return commitments
      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: mockCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      const mockQuery = jest.fn()
      const mockWhere = jest.fn()
      const mockCollection = jest.fn()

      require('@/lib/db/database').getDocs = mockGetDocs
      require('@/lib/db/database').query = mockQuery
      require('@/lib/db/database').where = mockWhere
      require('@/lib/db/database').collection = mockCollection

      mockQuery.mockReturnValue('mock-query')
      mockWhere.mockReturnValue('mock-where')
      mockCollection.mockReturnValue('mock-collection')

      const calculations = await PredictionPayoutService.calculatePayouts(
        mockPredictionId,
        mockWinningOptionId
      )

      expect(calculations).toHaveLength(4)

      // Check winners (users 1 and 2 who bet on 'yes')
      const winners = calculations.filter(c => c.isWinner)
      const losers = calculations.filter(c => !c.isWinner)

      expect(winners).toHaveLength(2)
      expect(losers).toHaveLength(2)

      // Total pool: 100 + 200 + 150 + 50 = 500
      // Winning pool: 100 + 200 = 300
      // Losing pool: 150 + 50 = 200
      // House edge: 200 * 0.05 = 10
      // Distributable: 200 - 10 = 190

      const totalPool = 500
      const winningPool = 300
      const losingPool = 200
      const houseEdge = losingPool * 0.05
      const distributable = losingPool - houseEdge

      // User 1: (100/300) * 190 = 63.33 winnings + 100 original = 163.33
      const user1Calculation = winners.find(c => c.userId === 'user-1')
      expect(user1Calculation).toBeDefined()
      expect(user1Calculation!.tokensCommitted).toBe(100)
      expect(user1Calculation!.payoutAmount).toBeCloseTo(163.33, 2)

      // User 2: (200/300) * 190 = 126.67 winnings + 200 original = 326.67
      const user2Calculation = winners.find(c => c.userId === 'user-2')
      expect(user2Calculation).toBeDefined()
      expect(user2Calculation!.tokensCommitted).toBe(200)
      expect(user2Calculation!.payoutAmount).toBeCloseTo(326.67, 2)

      // Losers get nothing
      losers.forEach(loser => {
        expect(loser.payoutAmount).toBe(0)
        expect(loser.returnRatio).toBe(0)
      })
    })

    it('should handle edge case where no one wins', async () => {
      const noWinnerCommitments = mockCommitments.map(c => ({
        ...c,
        position: 'no' // All bet on 'no', but 'yes' wins
      }))

      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: noWinnerCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      require('@/lib/db/database').getDocs = mockGetDocs

      const calculations = await PredictionPayoutService.calculatePayouts(
        mockPredictionId,
        'yes' // 'yes' wins but no one bet on it
      )

      expect(calculations).toHaveLength(4)
      calculations.forEach(calc => {
        expect(calc.isWinner).toBe(false)
        expect(calc.payoutAmount).toBe(0)
      })
    })

    it('should handle edge case where everyone wins', async () => {
      const allWinnerCommitments = mockCommitments.map(c => ({
        ...c,
        position: 'yes' // All bet on 'yes', and 'yes' wins
      }))

      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: allWinnerCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      require('@/lib/db/database').getDocs = mockGetDocs

      const calculations = await PredictionPayoutService.calculatePayouts(
        mockPredictionId,
        'yes'
      )

      expect(calculations).toHaveLength(4)
      calculations.forEach(calc => {
        expect(calc.isWinner).toBe(true)
        // When everyone wins, they just get their original tokens back (no losing pool)
        expect(calc.payoutAmount).toBe(calc.tokensCommitted)
        expect(calc.returnRatio).toBe(1.0)
      })
    })

    it('should throw error for invalid inputs', async () => {
      await expect(
        PredictionPayoutService.calculatePayouts('', 'option-1')
      ).rejects.toThrow('Prediction ID and winning option ID are required')

      await expect(
        PredictionPayoutService.calculatePayouts('prediction-1', '')
      ).rejects.toThrow('Prediction ID and winning option ID are required')
    })
  })

  describe('processPayouts', () => {
    it('should process payouts and update balances correctly', async () => {
      // Mock the calculatePayouts method
      const mockCalculations = [
        {
          userId: 'user-1',
          commitmentId: 'commitment-1',
          tokensCommitted: 100,
          isWinner: true,
          payoutAmount: 150,
          returnRatio: 1.5,
          originalOdds: 2.0
        },
        {
          userId: 'user-2',
          commitmentId: 'commitment-2',
          tokensCommitted: 50,
          isWinner: false,
          payoutAmount: 0,
          returnRatio: 0,
          originalOdds: 1.5
        }
      ]

      jest.spyOn(PredictionPayoutService, 'calculatePayouts')
        .mockResolvedValue(mockCalculations)

      // Mock Firebase transaction
      const mockTransaction = {
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn()
      }

      const mockRunTransaction = jest.fn().mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      require('@/lib/db/database').runTransaction = mockRunTransaction

      // Mock balance snapshots
      mockTransaction.get.mockResolvedValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          availableTokens: 200,
          committedTokens: 100,
          totalEarned: 300,
          totalSpent: 0,
          version: 1
        })
      })

      const result = await PredictionPayoutService.processPayouts(
        mockPredictionId,
        mockWinningOptionId
      )

      expect(result.predictionId).toBe(mockPredictionId)
      expect(result.totalProcessed).toBe(2)
      expect(result.winnersCount).toBe(1)
      expect(result.losersCount).toBe(1)
      expect(result.totalPaidOut).toBe(150)
      expect(result.totalCollected).toBe(50)
      expect(result.calculations).toEqual(mockCalculations)
    })

    it('should handle processing errors gracefully', async () => {
      jest.spyOn(PredictionPayoutService, 'calculatePayouts')
        .mockRejectedValue(new Error('Database error'))

      await expect(
        PredictionPayoutService.processPayouts(mockPredictionId, mockWinningOptionId)
      ).rejects.toThrow('Failed to process payouts for prediction')
    })
  })

  describe('refundPrediction', () => {
    it('should refund all commitments for cancelled prediction', async () => {
      // Mock Firebase query to return commitments
      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: mockCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      require('@/lib/db/database').getDocs = mockGetDocs

      // Mock Firebase transaction
      const mockTransaction = {
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn()
      }

      const mockRunTransaction = jest.fn().mockImplementation(async (db, callback) => {
        return await callback(mockTransaction)
      })

      require('@/lib/db/database').runTransaction = mockRunTransaction

      // Mock balance snapshots
      mockTransaction.get.mockResolvedValue({
        exists: () => true,
        data: () => ({
          userId: 'user-1',
          availableTokens: 200,
          committedTokens: 100,
          totalEarned: 300,
          totalSpent: 0,
          version: 1
        })
      })

      const result = await PredictionPayoutService.refundPrediction(mockPredictionId)

      expect(result.predictionId).toBe(mockPredictionId)
      expect(result.totalProcessed).toBe(4)
      expect(result.winnersCount).toBe(4) // Everyone gets refunded
      expect(result.losersCount).toBe(0)
      expect(result.totalPaidOut).toBe(500) // Total of all commitments
      expect(result.calculations).toHaveLength(4)

      // All calculations should be refunds
      result.calculations.forEach(calc => {
        expect(calc.isWinner).toBe(true)
        expect(calc.payoutAmount).toBe(calc.tokensCommitted)
        expect(calc.returnRatio).toBe(1.0)
      })
    })

    it('should handle empty commitments gracefully', async () => {
      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: []
      })

      require('@/lib/db/database').getDocs = mockGetDocs

      const result = await PredictionPayoutService.refundPrediction(mockPredictionId)

      expect(result.totalProcessed).toBe(0)
      expect(result.calculations).toHaveLength(0)
    })
  })

  describe('createPayoutJob', () => {
    it('should create payout job and start processing', async () => {
      const mockJobRef = {
        id: 'job-123'
      }

      const mockDoc = jest.fn().mockReturnValue(mockJobRef)
      const mockCollection = jest.fn()
      const mockRunTransaction = jest.fn().mockImplementation(async (db, callback) => {
        const mockTransaction = {
          set: jest.fn()
        }
        return await callback(mockTransaction)
      })

      require('@/lib/db/database').doc = mockDoc
      require('@/lib/db/database').collection = mockCollection
      require('@/lib/db/database').runTransaction = mockRunTransaction

      // Mock the processPayoutJob method to avoid actual processing
      jest.spyOn(PredictionPayoutService as any, 'processPayoutJob')
        .mockResolvedValue(undefined)

      const job = await PredictionPayoutService.createPayoutJob(
        mockPredictionId,
        mockWinningOptionId
      )

      expect(job.id).toBe('job-123')
      expect(job.predictionId).toBe(mockPredictionId)
      expect(job.status).toBe('pending')
      expect(job.retryCount).toBe(0)
      expect(job.maxRetries).toBe(3)
    })
  })

  describe('getPayoutJobStatus', () => {
    it('should return job status when job exists', async () => {
      const mockJobData = {
        predictionId: mockPredictionId,
        status: 'completed',
        startedAt: Timestamp.now(),
        completedAt: Timestamp.now(),
        retryCount: 0,
        maxRetries: 3
      }

      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        id: 'job-123',
        data: () => mockJobData
      })

      require('@/lib/db/database').getDoc = mockGetDoc

      const status = await PredictionPayoutService.getPayoutJobStatus('job-123')

      expect(status).toBeDefined()
      expect(status!.id).toBe('job-123')
      expect(status!.status).toBe('completed')
      expect(status!.predictionId).toBe(mockPredictionId)
    })

    it('should return null when job does not exist', async () => {
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => false
      })

      require('@/lib/db/database').getDoc = mockGetDoc

      const status = await PredictionPayoutService.getPayoutJobStatus('nonexistent-job')

      expect(status).toBeNull()
    })

    it('should throw error for invalid job ID', async () => {
      await expect(
        PredictionPayoutService.getPayoutJobStatus('')
      ).rejects.toThrow('Job ID is required')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle zero token commitments', async () => {
      const zeroTokenCommitments = [{
        id: 'commitment-1',
        userId: 'user-1',
        predictionId: mockPredictionId,
        tokensCommitted: 0,
        position: 'yes',
        odds: 2.0,
        potentialWinning: 0,
        status: 'active',
        committedAt: Timestamp.now()
      }]

      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: zeroTokenCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      require('@/lib/db/database').getDocs = mockGetDocs

      const calculations = await PredictionPayoutService.calculatePayouts(
        mockPredictionId,
        'yes'
      )

      expect(calculations).toHaveLength(1)
      expect(calculations[0].tokensCommitted).toBe(0)
      expect(calculations[0].payoutAmount).toBe(0)
    })

    it('should handle very large token amounts', async () => {
      const largeTokenCommitments = [{
        id: 'commitment-1',
        userId: 'user-1',
        predictionId: mockPredictionId,
        tokensCommitted: 1000000,
        position: 'yes',
        odds: 2.0,
        potentialWinning: 2000000,
        status: 'active',
        committedAt: Timestamp.now()
      }]

      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: largeTokenCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      require('@/lib/db/database').getDocs = mockGetDocs

      const calculations = await PredictionPayoutService.calculatePayouts(
        mockPredictionId,
        'yes'
      )

      expect(calculations).toHaveLength(1)
      expect(calculations[0].tokensCommitted).toBe(1000000)
      expect(calculations[0].payoutAmount).toBe(1000000) // No losing pool, so just return original
    })

    it('should handle precision issues with decimal calculations', async () => {
      const decimalCommitments = [
        {
          id: 'commitment-1',
          userId: 'user-1',
          predictionId: mockPredictionId,
          tokensCommitted: 33.33,
          position: 'yes',
          odds: 2.0,
          potentialWinning: 66.66,
          status: 'active',
          committedAt: Timestamp.now()
        },
        {
          id: 'commitment-2',
          userId: 'user-2',
          predictionId: mockPredictionId,
          tokensCommitted: 66.67,
          position: 'no',
          odds: 1.5,
          potentialWinning: 100.01,
          status: 'active',
          committedAt: Timestamp.now()
        }
      ]

      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: decimalCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      require('@/lib/db/database').getDocs = mockGetDocs

      const calculations = await PredictionPayoutService.calculatePayouts(
        mockPredictionId,
        'yes'
      )

      expect(calculations).toHaveLength(2)
      
      const winner = calculations.find(c => c.isWinner)
      expect(winner).toBeDefined()
      expect(winner!.payoutAmount).toBeGreaterThan(0)
      expect(Number.isFinite(winner!.payoutAmount)).toBe(true)
    })
  })
})