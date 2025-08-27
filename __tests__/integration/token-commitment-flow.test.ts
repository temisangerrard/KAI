/**
 * Integration test for the complete token commitment flow
 * Tests the API, services, and error handling together
 */

/**
 * @jest-environment node
 */

// Mock Firebase dependencies
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ 
      seconds: 1234567890, 
      nanoseconds: 0,
      toMillis: () => 1234567890000,
      toDate: () => new Date(1234567890000)
    }))
  }
}))

// Mock NextRequest properly
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

import { POST } from '@/app/api/tokens/commit/route'
import { NextRequest } from 'next/server'
import { TokenBalanceService } from '@/lib/services/token-balance-service'
import { CommitmentRollbackService } from '@/lib/services/commitment-rollback-service'

// Mock the services
jest.mock('@/lib/services/token-balance-service')
jest.mock('@/lib/services/commitment-rollback-service')

const mockTokenBalanceService = TokenBalanceService as jest.Mocked<typeof TokenBalanceService>
const mockRollbackService = CommitmentRollbackService as jest.Mocked<typeof CommitmentRollbackService>

describe('Token Commitment Integration Flow', () => {
  const mockUserId = 'integration-user-123'
  const mockPredictionId = 'integration-prediction-456'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Successful Commitment Flow', () => {
    it('should complete full commitment flow successfully', async () => {
      // Setup mocks for successful flow
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

      const mockMarket = {
        id: mockPredictionId,
        title: 'Integration Test Prediction',
        status: 'active',
        endsAt: { toDate: () => new Date(Date.now() + 86400000) },
        totalTokensStaked: 5000,
        totalParticipants: 50,
        options: [
          { id: 'yes', totalTokens: 2500, participantCount: 25 },
          { id: 'no', totalTokens: 2500, participantCount: 25 }
        ]
      }

      // Mock Firebase operations
      const { doc, getDoc, runTransaction, collection } = require('firebase/firestore')
      doc.mockReturnValue({ id: 'mock-doc-id' })
      collection.mockReturnValue({ id: 'mock-collection' })
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockMarket
      })

      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockImplementation((ref) => {
            // Mock balance document
            if (ref.id === 'mock-doc-id' && ref.path?.includes('user_balances')) {
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
            // Mock market document
            if (ref.id === 'mock-doc-id' && ref.path?.includes('markets')) {
              return Promise.resolve({
                exists: () => true,
                data: () => mockMarket
              })
            }
            return Promise.resolve({ 
              exists: () => true,
              data: () => mockMarket
            })
          }),
          set: jest.fn(),
          update: jest.fn()
        }
        
        await callback(mockTransaction)
        
        return {
          id: 'commitment-123',
          userId: mockUserId,
          predictionId: mockPredictionId,
          tokensCommitted: 100,
          position: 'yes',
          odds: 1.0,
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

      // Execute the commitment
      const commitmentData = {
        predictionId: mockPredictionId,
        tokensToCommit: 100,
        position: 'yes' as const,
        userId: mockUserId
      }

      const request = new NextRequest('http://localhost:3000/api/tokens/commit', {
        method: 'POST',
        body: JSON.stringify(commitmentData)
      })

      const response = await POST(request)
      const data = await response.json()

      // Verify successful response
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.commitment).toBeDefined()
      expect(data.commitment.tokensCommitted).toBe(100)
      expect(data.commitment.position).toBe('yes')
      expect(data.updatedBalance).toBeDefined()
      expect(data.updatedBalance.availableTokens).toBe(900)
      expect(data.updatedBalance.committedTokens).toBe(300)

      // Verify balance validation was called
      expect(mockTokenBalanceService.validateSufficientBalance).toHaveBeenCalledWith(
        mockUserId,
        100
      )

      // Verify Firebase operations were called
      expect(getDoc).toHaveBeenCalled()
      expect(runTransaction).toHaveBeenCalled()
    })
  })

  describe('Error Handling and Rollback Flow', () => {
    it('should handle transaction failure and attempt rollback', async () => {
      // Setup mocks for transaction failure
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

      // Mock rollback service
      mockRollbackService.rollbackCommitment.mockResolvedValue({
        success: true,
        rollbackTransactionId: 'rollback-456'
      })

      // Mock Firebase operations to fail
      const { doc, getDoc, runTransaction, collection } = require('firebase/firestore')
      doc.mockReturnValue({ id: 'mock-doc-id' })
      collection.mockReturnValue({ id: 'mock-collection' })
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockMarket
      })

      runTransaction.mockRejectedValue(new Error('Database transaction failed'))

      // Execute the commitment
      const commitmentData = {
        predictionId: mockPredictionId,
        tokensToCommit: 100,
        position: 'yes' as const,
        userId: mockUserId
      }

      const request = new NextRequest('http://localhost:3000/api/tokens/commit', {
        method: 'POST',
        body: JSON.stringify(commitmentData)
      })

      const response = await POST(request)
      const data = await response.json()

      // Verify error response
      expect(response.status).toBe(500)
      expect(data.error).toBe('Transaction failed')
      expect(data.errorCode).toBe('TRANSACTION_FAILED')

      // Verify balance validation was called
      expect(mockTokenBalanceService.validateSufficientBalance).toHaveBeenCalledWith(
        mockUserId,
        100
      )

      // Verify transaction was attempted
      expect(runTransaction).toHaveBeenCalled()
    })

    it('should handle insufficient balance gracefully', async () => {
      // Setup mocks for insufficient balance
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

      // Execute the commitment
      const commitmentData = {
        predictionId: mockPredictionId,
        tokensToCommit: 100,
        position: 'yes' as const,
        userId: mockUserId
      }

      const request = new NextRequest('http://localhost:3000/api/tokens/commit', {
        method: 'POST',
        body: JSON.stringify(commitmentData)
      })

      const response = await POST(request)
      const data = await response.json()

      // Verify error response
      expect(response.status).toBe(400)
      expect(data.error).toBe('Insufficient balance')
      expect(data.errorCode).toBe('INSUFFICIENT_BALANCE')
      expect(data.availableTokens).toBe(50)
      expect(data.requiredTokens).toBe(100)

      // Verify balance validation was called
      expect(mockTokenBalanceService.validateSufficientBalance).toHaveBeenCalledWith(
        mockUserId,
        100
      )

      // Verify no transaction was attempted
      const { runTransaction } = require('firebase/firestore')
      expect(runTransaction).not.toHaveBeenCalled()
    })
  })

  describe('Market Validation Flow', () => {
    it('should reject commitment for inactive market', async () => {
      // Setup mocks for valid balance but inactive market
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
        title: 'Inactive Test Prediction',
        status: 'closed',
        endsAt: { toDate: () => new Date(Date.now() + 86400000) },
        totalTokensStaked: 5000,
        options: []
      }

      // Mock Firebase operations
      const { doc, getDoc } = require('firebase/firestore')
      doc.mockReturnValue({ id: mockPredictionId })
      
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockInactiveMarket
      })

      // Execute the commitment
      const commitmentData = {
        predictionId: mockPredictionId,
        tokensToCommit: 100,
        position: 'yes' as const,
        userId: mockUserId
      }

      const request = new NextRequest('http://localhost:3000/api/tokens/commit', {
        method: 'POST',
        body: JSON.stringify(commitmentData)
      })

      const response = await POST(request)
      const data = await response.json()

      // Verify error response
      expect(response.status).toBe(400)
      expect(data.error).toBe('Market is not active')
      expect(data.errorCode).toBe('MARKET_INACTIVE')
      expect(data.status).toBe('closed')

      // Verify balance validation was called
      expect(mockTokenBalanceService.validateSufficientBalance).toHaveBeenCalledWith(
        mockUserId,
        100
      )

      // Verify market was checked
      expect(getDoc).toHaveBeenCalled()

      // Verify no transaction was attempted
      const { runTransaction } = require('firebase/firestore')
      expect(runTransaction).not.toHaveBeenCalled()
    })
  })
})