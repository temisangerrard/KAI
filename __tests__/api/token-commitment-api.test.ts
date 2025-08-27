/**
 * @jest-environment node
 */

// Mock dependencies first
jest.mock('@/lib/services/token-balance-service')
jest.mock('@/lib/services/commitment-rollback-service')
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

// Mock NextRequest to avoid cookie issues
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    method: options?.method || 'GET',
    json: jest.fn().mockResolvedValue(options?.body ? JSON.parse(options.body) : {}),
    headers: new Map(),
    cookies: new Map()
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      json: jest.fn().mockResolvedValue(data),
      status: options?.status || 200
    }))
  }
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
  collection: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0, toMillis: () => 1234567890000 }))
  },
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn()
}))

import { POST, GET } from '@/app/api/tokens/commit/route'
import { NextRequest } from 'next/server'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { CommitmentRollbackService } from '@/lib/services/commitment-rollback-service'

const mockTokenBalanceService = TokenBalanceService as jest.Mocked<typeof TokenBalanceService>
const mockRollbackService = CommitmentRollbackService as jest.Mocked<typeof CommitmentRollbackService>

describe('/api/tokens/commit', () => {
  const mockUserId = 'test-user-123'
  const mockPredictionId = 'prediction-456'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/tokens/commit', () => {
    const validCommitmentData = {
      predictionId: mockPredictionId,
      tokensToCommit: 100,
      position: 'yes' as const,
      userId: mockUserId
    }

    it('should successfully commit tokens with valid data', async () => {
      // Mock successful balance validation
      mockTokenBalanceService.validateSufficientBalance.mockResolvedValue({
        isValid: true,
        currentBalance: {
          userId: mockUserId,
          availableTokens: 1000,
          committedTokens: 200,
          totalEarned: 1500,
          totalSpent: 300,
          lastUpdated: { seconds: 1234567890, nanoseconds: 0 } as any,
          version: 1
        },
        requiredAmount: 100,
        availableAmount: 1000
      })

      // Mock successful balance update
      mockTokenBalanceService.updateBalanceAtomic.mockResolvedValue({
        userId: mockUserId,
        availableTokens: 900,
        committedTokens: 300,
        totalEarned: 1500,
        totalSpent: 300,
        lastUpdated: { seconds: 1234567890, nanoseconds: 0 } as any,
        version: 2
      })

      // Mock market data
      const mockMarket = {
        id: mockPredictionId,
        title: 'Test Prediction',
        status: 'active',
        endsAt: { toDate: () => new Date(Date.now() + 86400000) }, // 1 day from now
        totalTokensStaked: 5000,
        totalParticipants: 50,
        options: [
          { id: 'yes', totalTokens: 2500, participantCount: 25 },
          { id: 'no', totalTokens: 2500, participantCount: 25 }
        ]
      }

      // Mock Firebase operations
      const { doc, getDoc, runTransaction, collection } = require('firebase/firestore')
      doc.mockReturnValue({ id: mockPredictionId })
      collection.mockReturnValue({ id: 'mock-collection' })
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockMarket
      })
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockImplementation((ref) => {
            if (ref.id === mockUserId) {
              return Promise.resolve({
                exists: () => true,
                data: () => ({
                  userId: mockUserId,
                  availableTokens: 1000,
                  committedTokens: 200,
                  totalEarned: 1500,
                  totalSpent: 300,
                  lastUpdated: { seconds: 1234567890, nanoseconds: 0 },
                  version: 1
                })
              })
            }
            if (ref.id === mockPredictionId) {
              return Promise.resolve({
                exists: () => true,
                data: () => mockMarket
              })
            }
            return Promise.resolve({ exists: () => false })
          }),
          set: jest.fn(),
          update: jest.fn()
        }
        const result = await callback(mockTransaction)
        return {
          id: 'mock-commitment-id',
          userId: mockUserId,
          predictionId: mockPredictionId,
          tokensCommitted: 100,
          position: 'yes',
          odds: 1,
          potentialWinning: 100,
          status: 'active',
          committedAt: { seconds: 1234567890, nanoseconds: 0 },
          updatedBalance: {
            userId: mockUserId,
            availableTokens: 900,
            committedTokens: 300,
            totalEarned: 1500,
            totalSpent: 300,
            lastUpdated: { seconds: 1234567890, nanoseconds: 0 },
            version: 2
          }
        }
      })

      const request = new NextRequest('http://localhost:3000/api/tokens/commit', {
        method: 'POST',
        body: JSON.stringify(validCommitmentData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.commitment).toBeDefined()
      expect(data.commitment.tokensCommitted).toBe(100)
      expect(data.commitment.position).toBe('yes')
      expect(data.updatedBalance).toBeDefined()
      expect(data.updatedBalance.availableTokens).toBe(900)
    })

    it('should reject commitment with insufficient balance', async () => {
      mockTokenBalanceService.validateSufficientBalance.mockResolvedValue({
        isValid: false,
        currentBalance: {
          userId: mockUserId,
          availableTokens: 50,
          committedTokens: 200,
          totalEarned: 250,
          totalSpent: 0,
          lastUpdated: { seconds: 1234567890, nanoseconds: 0 } as any,
          version: 1
        },
        requiredAmount: 100,
        availableAmount: 50,
        errorMessage: 'Insufficient available tokens'
      })

      const request = new NextRequest('http://localhost:3000/api/tokens/commit', {
        method: 'POST',
        body: JSON.stringify(validCommitmentData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Insufficient balance')
      expect(data.availableTokens).toBe(50)
      expect(data.requiredTokens).toBe(100)
    })

    it('should reject commitment for non-existent market', async () => {
      mockTokenBalanceService.validateSufficientBalance.mockResolvedValue({
        isValid: true,
        currentBalance: {
          userId: mockUserId,
          availableTokens: 1000,
          committedTokens: 0,
          totalEarned: 1000,
          totalSpent: 0,
          lastUpdated: { seconds: 1234567890, nanoseconds: 0 } as any,
          version: 1
        },
        requiredAmount: 100,
        availableAmount: 1000
      })

      const { doc, getDoc } = require('firebase/firestore')
      doc.mockReturnValue({ id: mockPredictionId })
      getDoc.mockResolvedValue({
        exists: () => false
      })

      const request = new NextRequest('http://localhost:3000/api/tokens/commit', {
        method: 'POST',
        body: JSON.stringify(validCommitmentData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Market not found')
    })

    it('should reject commitment for inactive market', async () => {
      mockTokenBalanceService.validateSufficientBalance.mockResolvedValue({
        isValid: true,
        currentBalance: {
          userId: mockUserId,
          availableTokens: 1000,
          committedTokens: 0,
          totalEarned: 1000,
          totalSpent: 0,
          lastUpdated: { seconds: 1234567890, nanoseconds: 0 } as any,
          version: 1
        },
        requiredAmount: 100,
        availableAmount: 1000
      })

      const mockInactiveMarket = {
        id: mockPredictionId,
        title: 'Test Prediction',
        status: 'closed',
        endsAt: { toDate: () => new Date(Date.now() + 86400000) },
        totalTokensStaked: 5000,
        options: []
      }

      const { doc, getDoc } = require('firebase/firestore')
      doc.mockReturnValue({ id: mockPredictionId })
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockInactiveMarket
      })

      const request = new NextRequest('http://localhost:3000/api/tokens/commit', {
        method: 'POST',
        body: JSON.stringify(validCommitmentData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Market is not active')
      expect(data.status).toBe('closed')
    })

    it('should reject commitment for expired market', async () => {
      mockTokenBalanceService.validateSufficientBalance.mockResolvedValue({
        isValid: true,
        currentBalance: {
          userId: mockUserId,
          availableTokens: 1000,
          committedTokens: 0,
          totalEarned: 1000,
          totalSpent: 0,
          lastUpdated: { seconds: 1234567890, nanoseconds: 0 } as any,
          version: 1
        },
        requiredAmount: 100,
        availableAmount: 1000
      })

      const mockExpiredMarket = {
        id: mockPredictionId,
        title: 'Test Prediction',
        status: 'active',
        endsAt: { toDate: () => new Date(Date.now() - 86400000) }, // 1 day ago
        totalTokensStaked: 5000,
        options: []
      }

      const { doc, getDoc } = require('firebase/firestore')
      doc.mockReturnValue({ id: mockPredictionId })
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockExpiredMarket
      })

      const request = new NextRequest('http://localhost:3000/api/tokens/commit', {
        method: 'POST',
        body: JSON.stringify(validCommitmentData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Market has ended')
    })

    it('should validate request data schema', async () => {
      const invalidData = {
        predictionId: '', // Invalid: empty string
        tokensToCommit: -10, // Invalid: negative
        position: 'maybe', // Invalid: not yes/no
        userId: '' // Invalid: empty string
      }

      const request = new NextRequest('http://localhost:3000/api/tokens/commit', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
      expect(Array.isArray(data.details)).toBe(true)
    })

    it('should enforce maximum token commitment limits', async () => {
      const largeCommitmentData = {
        ...validCommitmentData,
        tokensToCommit: 15000 // Above max limit
      }

      const request = new NextRequest('http://localhost:3000/api/tokens/commit', {
        method: 'POST',
        body: JSON.stringify(largeCommitmentData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details.some((detail: any) => 
        detail.message.includes('Cannot commit more than 10,000 tokens')
      )).toBe(true)
    })

    it('should handle database transaction failures gracefully', async () => {
      mockTokenBalanceService.validateSufficientBalance.mockResolvedValue({
        isValid: true,
        currentBalance: {
          userId: mockUserId,
          availableTokens: 1000,
          committedTokens: 0,
          totalEarned: 1000,
          totalSpent: 0,
          lastUpdated: { seconds: 1234567890, nanoseconds: 0 } as any,
          version: 1
        },
        requiredAmount: 100,
        availableAmount: 1000
      })

      const mockMarket = {
        id: mockPredictionId,
        title: 'Test Prediction',
        status: 'active',
        endsAt: { toDate: () => new Date(Date.now() + 86400000) },
        totalTokensStaked: 5000,
        options: [
          { id: 'yes', totalTokens: 2500, participantCount: 25 },
          { id: 'no', totalTokens: 2500, participantCount: 25 }
        ]
      }

      const { doc, getDoc, runTransaction, collection } = require('firebase/firestore')
      doc.mockReturnValue({ id: mockPredictionId })
      collection.mockReturnValue({ id: 'mock-collection' })
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockMarket
      })
      runTransaction.mockRejectedValue(new Error('Transaction failed'))

      const request = new NextRequest('http://localhost:3000/api/tokens/commit', {
        method: 'POST',
        body: JSON.stringify(validCommitmentData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Transaction failed')
    })
  })

  describe('GET /api/tokens/commit', () => {
    it('should fetch user commitments successfully', async () => {
      const mockCommitments = [
        {
          id: 'commitment-1',
          userId: mockUserId,
          predictionId: 'prediction-1',
          tokensCommitted: 100,
          position: 'yes',
          status: 'active'
        },
        {
          id: 'commitment-2',
          userId: mockUserId,
          predictionId: 'prediction-2',
          tokensCommitted: 200,
          position: 'no',
          status: 'active'
        }
      ]

      const { getDocs } = require('firebase/firestore')
      getDocs.mockResolvedValue({
        docs: mockCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      const request = new NextRequest(`http://localhost:3000/api/tokens/commit?userId=${mockUserId}`)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.commitments).toHaveLength(2)
      expect(data.commitments[0].id).toBe('commitment-1')
      expect(data.commitments[1].tokensCommitted).toBe(200)
    })

    it('should filter commitments by prediction ID', async () => {
      const mockCommitments = [
        {
          id: 'commitment-1',
          userId: mockUserId,
          predictionId: mockPredictionId,
          tokensCommitted: 100,
          position: 'yes',
          status: 'active'
        }
      ]

      const { getDocs } = require('firebase/firestore')
      getDocs.mockResolvedValue({
        docs: mockCommitments.map(commitment => ({
          id: commitment.id,
          data: () => commitment
        }))
      })

      const request = new NextRequest(
        `http://localhost:3000/api/tokens/commit?userId=${mockUserId}&predictionId=${mockPredictionId}`
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.commitments).toHaveLength(1)
      expect(data.commitments[0].predictionId).toBe(mockPredictionId)
    })

    it('should require user ID parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/tokens/commit')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User ID is required')
    })

    it('should handle database query failures', async () => {
      const { getDocs } = require('firebase/firestore')
      getDocs.mockRejectedValue(new Error('Database query failed'))

      const request = new NextRequest(`http://localhost:3000/api/tokens/commit?userId=${mockUserId}`)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch commitments')
    })
  })
})