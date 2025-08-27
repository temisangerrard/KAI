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
  updateDoc: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ 
      seconds: 1234567890, 
      nanoseconds: 0,
      toMillis: () => 1234567890000
    }))
  }
}))

import { CommitmentRollbackService } from '@/lib/services/commitment-rollback-service'

describe('CommitmentRollbackService', () => {
  const mockUserId = 'test-user-123'
  const mockCommitmentId = 'commitment-456'
  const mockTransactionId = 'transaction-789'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rollbackCommitment', () => {
    it('should successfully rollback a commitment', async () => {
      const mockCommitment = {
        id: mockCommitmentId,
        userId: mockUserId,
        predictionId: 'prediction-123',
        tokensCommitted: 100,
        position: 'yes' as const,
        odds: 1.5,
        potentialWinning: 150,
        status: 'active' as const,
        committedAt: { seconds: 1234567890, nanoseconds: 0, toMillis: () => 1234567890000 }
      }

      const mockBalance = {
        userId: mockUserId,
        availableTokens: 500,
        committedTokens: 200,
        totalEarned: 1000,
        totalSpent: 300,
        lastUpdated: { seconds: 1234567890, nanoseconds: 0 },
        version: 1
      }

      // Mock Firebase operations
      const { getDoc, runTransaction, doc, collection } = require('firebase/firestore')
      
      getDoc.mockResolvedValue({
        exists: () => true,
        id: mockCommitmentId,
        data: () => mockCommitment
      })

      doc.mockReturnValue({ id: 'mock-doc-id' })
      collection.mockReturnValue({ id: 'mock-collection' })

      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => mockBalance
          }),
          update: jest.fn(),
          set: jest.fn()
        }
        
        await callback(mockTransaction)
        
        return {
          rollbackTransactionId: 'rollback-123',
          updatedBalance: {
            ...mockBalance,
            availableTokens: mockBalance.availableTokens + mockCommitment.tokensCommitted,
            committedTokens: mockBalance.committedTokens - mockCommitment.tokensCommitted,
            version: mockBalance.version + 1
          }
        }
      })

      const result = await CommitmentRollbackService.rollbackCommitment({
        userId: mockUserId,
        commitmentId: mockCommitmentId,
        reason: 'Test rollback',
        rollbackType: 'manual_refund'
      })

      expect(result.success).toBe(true)
      expect(result.rollbackTransactionId).toBe('rollback-123')
      expect(result.updatedBalance?.availableTokens).toBe(600) // 500 + 100
      expect(result.updatedBalance?.committedTokens).toBe(100) // 200 - 100
      expect(result.details?.rollbackAmount).toBe(100)
    })

    it('should handle rollback when commitment not found', async () => {
      const { getDoc } = require('firebase/firestore')
      
      getDoc.mockResolvedValue({
        exists: () => false
      })

      const result = await CommitmentRollbackService.rollbackCommitment({
        userId: mockUserId,
        commitmentId: 'non-existent',
        reason: 'Test rollback',
        rollbackType: 'manual_refund'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('No commitment or transaction found')
    })

    it('should handle transaction errors during rollback', async () => {
      const mockCommitment = {
        id: mockCommitmentId,
        userId: mockUserId,
        predictionId: 'prediction-123',
        tokensCommitted: 100,
        position: 'yes' as const,
        status: 'active' as const
      }

      const { getDoc, runTransaction } = require('firebase/firestore')
      
      getDoc.mockResolvedValue({
        exists: () => true,
        id: mockCommitmentId,
        data: () => mockCommitment
      })

      runTransaction.mockRejectedValue(new Error('Transaction failed'))

      const result = await CommitmentRollbackService.rollbackCommitment({
        userId: mockUserId,
        commitmentId: mockCommitmentId,
        reason: 'Test rollback',
        rollbackType: 'manual_refund'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Rollback failed')
    })
  })

  describe('canRollback', () => {
    it('should allow rollback for active commitment', async () => {
      const mockCommitment = {
        status: 'active',
        committedAt: { 
          toMillis: () => Date.now() - 1000 // 1 second ago
        }
      }

      const { getDoc } = require('firebase/firestore')
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockCommitment
      })

      const result = await CommitmentRollbackService.canRollback(mockCommitmentId)

      expect(result.canRollback).toBe(true)
      expect(result.commitment).toBeDefined()
    })

    it('should not allow rollback for resolved commitment', async () => {
      const mockCommitment = {
        status: 'won',
        committedAt: { 
          toMillis: () => Date.now() - 1000
        }
      }

      const { getDoc } = require('firebase/firestore')
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockCommitment
      })

      const result = await CommitmentRollbackService.canRollback(mockCommitmentId)

      expect(result.canRollback).toBe(false)
      expect(result.reason).toContain('already won')
    })

    it('should not allow rollback for old commitment', async () => {
      const mockCommitment = {
        status: 'active',
        committedAt: { 
          toMillis: () => Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
        }
      }

      const { getDoc } = require('firebase/firestore')
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockCommitment
      })

      const result = await CommitmentRollbackService.canRollback(mockCommitmentId)

      expect(result.canRollback).toBe(false)
      expect(result.reason).toContain('too old')
    })
  })
})