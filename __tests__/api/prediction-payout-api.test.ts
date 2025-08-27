/**
 * Tests for Prediction Payout API Routes
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Mock the services
jest.mock('@/lib/services/prediction-payout-service')
jest.mock('@/lib/db/database', () => ({
  db: {},
  auth: {},
  analytics: null,
  app: {},
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  runTransaction: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 })
  }
}))

// Mock Firebase modules
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  runTransaction: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 })
  }
}))

// Import the API handlers
import { POST as resolveHandler } from '@/app/api/predictions/[id]/resolve/route'
import { POST as cancelHandler } from '@/app/api/predictions/[id]/cancel/route'
import { GET as statusHandler } from '@/app/api/predictions/[id]/payout-status/route'

describe('Prediction Payout API Routes', () => {
  const mockPredictionId = 'test-prediction-123'
  const mockWinningOptionId = 'option-yes'
  const mockAdminUserId = 'admin-user-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('POST /api/predictions/[id]/resolve', () => {
    it('should resolve prediction successfully', async () => {
      // Mock Firebase operations
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'active',
          options: [
            { id: 'option-yes', name: 'Yes' },
            { id: 'option-no', name: 'No' }
          ]
        })
      })

      const mockUpdateDoc = jest.fn().mockResolvedValue(undefined)

      require('@/lib/db/database').getDoc = mockGetDoc
      require('@/lib/db/database').updateDoc = mockUpdateDoc
      require('@/lib/db/database').doc = jest.fn()
      require('@/lib/db/database').Timestamp = {
        now: () => ({ seconds: 1234567890 })
      }

      // Mock PredictionPayoutService
      const mockCreatePayoutJob = jest.fn().mockResolvedValue({
        id: 'job-123',
        predictionId: mockPredictionId,
        status: 'pending'
      })

      require('@/lib/services/prediction-payout-service').PredictionPayoutService = {
        createPayoutJob: mockCreatePayoutJob
      }

      // Create mock request
      const request = new NextRequest('http://localhost/api/predictions/test-prediction-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          winningOptionId: mockWinningOptionId,
          adminUserId: mockAdminUserId
        })
      })

      const response = await resolveHandler(request, { params: { id: mockPredictionId } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.predictionId).toBe(mockPredictionId)
      expect(responseData.winningOptionId).toBe(mockWinningOptionId)
      expect(responseData.payoutJobId).toBe('job-123')
      expect(mockCreatePayoutJob).toHaveBeenCalledWith(mockPredictionId, mockWinningOptionId)
    })

    it('should return 400 for missing prediction ID', async () => {
      const request = new NextRequest('http://localhost/api/predictions//resolve', {
        method: 'POST',
        body: JSON.stringify({
          winningOptionId: mockWinningOptionId,
          adminUserId: mockAdminUserId
        })
      })

      const response = await resolveHandler(request, { params: { id: '' } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Prediction ID is required')
    })

    it('should return 400 for missing winning option ID', async () => {
      const request = new NextRequest('http://localhost/api/predictions/test-prediction-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          adminUserId: mockAdminUserId
        })
      })

      const response = await resolveHandler(request, { params: { id: mockPredictionId } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Winning option ID and admin user ID are required')
    })

    it('should return 404 for non-existent prediction', async () => {
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => false
      })

      require('@/lib/db/database').getDoc = mockGetDoc
      require('@/lib/db/database').doc = jest.fn()

      const request = new NextRequest('http://localhost/api/predictions/nonexistent/resolve', {
        method: 'POST',
        body: JSON.stringify({
          winningOptionId: mockWinningOptionId,
          adminUserId: mockAdminUserId
        })
      })

      const response = await resolveHandler(request, { params: { id: 'nonexistent' } })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Prediction not found')
    })

    it('should return 400 for already resolved prediction', async () => {
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'resolved', // Already resolved
          options: [
            { id: 'option-yes', name: 'Yes' },
            { id: 'option-no', name: 'No' }
          ]
        })
      })

      require('@/lib/db/database').getDoc = mockGetDoc
      require('@/lib/db/database').doc = jest.fn()

      const request = new NextRequest('http://localhost/api/predictions/test-prediction-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          winningOptionId: mockWinningOptionId,
          adminUserId: mockAdminUserId
        })
      })

      const response = await resolveHandler(request, { params: { id: mockPredictionId } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Prediction has already been resolved')
    })

    it('should return 400 for invalid winning option ID', async () => {
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'active',
          options: [
            { id: 'option-yes', name: 'Yes' },
            { id: 'option-no', name: 'No' }
          ]
        })
      })

      require('@/lib/db/database').getDoc = mockGetDoc
      require('@/lib/db/database').doc = jest.fn()

      const request = new NextRequest('http://localhost/api/predictions/test-prediction-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          winningOptionId: 'invalid-option',
          adminUserId: mockAdminUserId
        })
      })

      const response = await resolveHandler(request, { params: { id: mockPredictionId } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid winning option ID')
    })

    it('should handle service errors gracefully', async () => {
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'active',
          options: [{ id: mockWinningOptionId, name: 'Yes' }]
        })
      })

      const mockUpdateDoc = jest.fn().mockResolvedValue(undefined)

      require('@/lib/db/database').getDoc = mockGetDoc
      require('@/lib/db/database').updateDoc = mockUpdateDoc
      require('@/lib/db/database').doc = jest.fn()
      require('@/lib/db/database').Timestamp = {
        now: () => ({ seconds: 1234567890 })
      }

      // Mock service to throw error
      const mockCreatePayoutJob = jest.fn().mockRejectedValue(new Error('Service error'))

      require('@/lib/services/prediction-payout-service').PredictionPayoutService = {
        createPayoutJob: mockCreatePayoutJob
      }

      const request = new NextRequest('http://localhost/api/predictions/test-prediction-123/resolve', {
        method: 'POST',
        body: JSON.stringify({
          winningOptionId: mockWinningOptionId,
          adminUserId: mockAdminUserId
        })
      })

      const response = await resolveHandler(request, { params: { id: mockPredictionId } })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to resolve prediction')
      expect(responseData.details).toBe('Service error')
    })
  })

  describe('POST /api/predictions/[id]/cancel', () => {
    it('should cancel prediction successfully', async () => {
      // Mock Firebase operations
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'active'
        })
      })

      const mockUpdateDoc = jest.fn().mockResolvedValue(undefined)

      require('@/lib/db/database').getDoc = mockGetDoc
      require('@/lib/db/database').updateDoc = mockUpdateDoc
      require('@/lib/db/database').doc = jest.fn()
      require('@/lib/db/database').Timestamp = {
        now: () => ({ seconds: 1234567890 })
      }

      // Mock PredictionPayoutService
      const mockRefundPrediction = jest.fn().mockResolvedValue({
        predictionId: mockPredictionId,
        totalProcessed: 5,
        winnersCount: 5,
        losersCount: 0,
        totalPaidOut: 500,
        totalCollected: 0,
        calculations: [],
        errors: []
      })

      require('@/lib/services/prediction-payout-service').PredictionPayoutService = {
        refundPrediction: mockRefundPrediction
      }

      const request = new NextRequest('http://localhost/api/predictions/test-prediction-123/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Technical issues',
          adminUserId: mockAdminUserId
        })
      })

      const response = await cancelHandler(request, { params: { id: mockPredictionId } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.predictionId).toBe(mockPredictionId)
      expect(responseData.reason).toBe('Technical issues')
      expect(responseData.refundResult.totalProcessed).toBe(5)
      expect(mockRefundPrediction).toHaveBeenCalledWith(mockPredictionId)
    })

    it('should return 400 for missing reason', async () => {
      const request = new NextRequest('http://localhost/api/predictions/test-prediction-123/cancel', {
        method: 'POST',
        body: JSON.stringify({
          adminUserId: mockAdminUserId
        })
      })

      const response = await cancelHandler(request, { params: { id: mockPredictionId } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Cancellation reason and admin user ID are required')
    })

    it('should return 400 for already resolved prediction', async () => {
      const mockGetDoc = jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'resolved'
        })
      })

      require('@/lib/db/database').getDoc = mockGetDoc
      require('@/lib/db/database').doc = jest.fn()

      const request = new NextRequest('http://localhost/api/predictions/test-prediction-123/cancel', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Technical issues',
          adminUserId: mockAdminUserId
        })
      })

      const response = await cancelHandler(request, { params: { id: mockPredictionId } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Prediction cannot be cancelled in its current state')
    })
  })

  describe('GET /api/predictions/[id]/payout-status', () => {
    it('should return payout status successfully', async () => {
      const mockPayoutJobs = [
        {
          id: 'job-123',
          predictionId: mockPredictionId,
          status: 'completed',
          startedAt: { seconds: 1234567890 },
          completedAt: { seconds: 1234567900 },
          retryCount: 0,
          maxRetries: 3
        }
      ]

      const mockGetPayoutJobsForPrediction = jest.fn().mockResolvedValue(mockPayoutJobs)

      require('@/lib/services/prediction-payout-service').PredictionPayoutService = {
        getPayoutJobsForPrediction: mockGetPayoutJobsForPrediction
      }

      const request = new NextRequest('http://localhost/api/predictions/test-prediction-123/payout-status')

      const response = await statusHandler(request, { params: { id: mockPredictionId } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.predictionId).toBe(mockPredictionId)
      expect(responseData.status).toBe('completed')
      expect(responseData.latestJob.id).toBe('job-123')
      expect(responseData.allJobs).toHaveLength(1)
      expect(responseData.message).toBe('All payouts have been processed successfully')
    })

    it('should return no payouts status when no jobs exist', async () => {
      const mockGetPayoutJobsForPrediction = jest.fn().mockResolvedValue([])

      require('@/lib/services/prediction-payout-service').PredictionPayoutService = {
        getPayoutJobsForPrediction: mockGetPayoutJobsForPrediction
      }

      const request = new NextRequest('http://localhost/api/predictions/test-prediction-123/payout-status')

      const response = await statusHandler(request, { params: { id: mockPredictionId } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.status).toBe('no_payouts')
      expect(responseData.message).toBe('No payout jobs found for this prediction')
    })

    it('should return 400 for missing prediction ID', async () => {
      const request = new NextRequest('http://localhost/api/predictions//payout-status')

      const response = await statusHandler(request, { params: { id: '' } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Prediction ID is required')
    })

    it('should handle service errors gracefully', async () => {
      const mockGetPayoutJobsForPrediction = jest.fn().mockRejectedValue(new Error('Database error'))

      require('@/lib/services/prediction-payout-service').PredictionPayoutService = {
        getPayoutJobsForPrediction: mockGetPayoutJobsForPrediction
      }

      const request = new NextRequest('http://localhost/api/predictions/test-prediction-123/payout-status')

      const response = await statusHandler(request, { params: { id: mockPredictionId } })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to get payout status')
      expect(responseData.details).toBe('Database error')
    })
  })

  describe('status message helper', () => {
    // Test the getStatusMessage function indirectly through the API
    it('should return correct status messages', async () => {
      const testCases = [
        { status: 'pending', expectedMessage: 'Payout processing is queued' },
        { status: 'processing', expectedMessage: 'Payouts are currently being processed' },
        { status: 'completed', expectedMessage: 'All payouts have been processed successfully' },
        { status: 'failed', expectedMessage: 'Payout processing failed' },
        { status: 'unknown', expectedMessage: 'Unknown payout status' }
      ]

      for (const testCase of testCases) {
        const mockGetPayoutJobsForPrediction = jest.fn().mockResolvedValue([
          {
            id: 'job-123',
            predictionId: mockPredictionId,
            status: testCase.status,
            startedAt: { seconds: 1234567890 },
            retryCount: 0,
            maxRetries: 3
          }
        ])

        require('@/lib/services/prediction-payout-service').PredictionPayoutService = {
          getPayoutJobsForPrediction: mockGetPayoutJobsForPrediction
        }

        const request = new NextRequest('http://localhost/api/predictions/test-prediction-123/payout-status')
        const response = await statusHandler(request, { params: { id: mockPredictionId } })
        const responseData = await response.json()

        expect(responseData.message).toBe(testCase.expectedMessage)
      }
    })
  })
})