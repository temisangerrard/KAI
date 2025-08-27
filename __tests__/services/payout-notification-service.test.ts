/**
 * Tests for Payout Notification Service
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { PayoutNotificationService } from '@/lib/services/payout-notification-service'
import { PayoutResult, PayoutCalculation } from '@/lib/services/prediction-payout-service'
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
  addDoc: jest.fn(),
  runTransaction: jest.fn(),
  query: jest.fn(),
  where: jest.fn()
}))

// Mock Firebase modules
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  runTransaction: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 })
  }
}))

describe('PayoutNotificationService', () => {
  const mockPredictionId = 'test-prediction-123'
  const mockPredictionTitle = 'Will it rain tomorrow?'

  const mockPayoutResult: PayoutResult = {
    predictionId: mockPredictionId,
    totalProcessed: 3,
    winnersCount: 2,
    losersCount: 1,
    totalPaidOut: 300,
    totalCollected: 100,
    calculations: [
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
        tokensCommitted: 200,
        isWinner: true,
        payoutAmount: 250,
        returnRatio: 1.25,
        originalOdds: 2.0
      },
      {
        userId: 'user-3',
        commitmentId: 'commitment-3',
        tokensCommitted: 100,
        isWinner: false,
        payoutAmount: 0,
        returnRatio: 0,
        originalOdds: 1.5
      }
    ],
    errors: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('createPayoutNotifications', () => {
    it('should create notifications for all users in payout result', async () => {
      // Mock prediction document
      const mockPredictionDoc = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ title: mockPredictionTitle })
        })
      }

      const mockDoc = jest.fn().mockReturnValue(mockPredictionDoc)
      require('@/lib/db/database').doc = mockDoc

      // Mock user preferences
      const mockPreferencesDoc = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            userId: 'user-1',
            emailNotifications: true,
            pushNotifications: true,
            inAppNotifications: true,
            winNotifications: true,
            lossNotifications: true,
            refundNotifications: true
          })
        }),
        set: jest.fn()
      }

      mockDoc.mockReturnValue(mockPreferencesDoc)

      // Mock addDoc for notifications
      const mockAddDoc = jest.fn().mockResolvedValue({ id: 'notification-123' })
      require('@/lib/db/database').addDoc = mockAddDoc

      // Mock runTransaction for updating notification status
      const mockRunTransaction = jest.fn().mockImplementation(async (db, callback) => {
        const mockTransaction = { update: jest.fn() }
        return await callback(mockTransaction)
      })
      require('@/lib/db/database').runTransaction = mockRunTransaction

      const notifications = await PayoutNotificationService.createPayoutNotifications(
        mockPredictionId,
        mockPayoutResult
      )

      expect(notifications).toHaveLength(3)
      
      // Check winner notifications
      const winnerNotifications = notifications.filter(n => n?.type === 'win')
      expect(winnerNotifications).toHaveLength(2)

      // Check loser notifications
      const loserNotifications = notifications.filter(n => n?.type === 'loss')
      expect(loserNotifications).toHaveLength(1)

      // Verify notification content for winner
      const user1Notification = winnerNotifications.find(n => n?.userId === 'user-1')
      expect(user1Notification).toBeDefined()
      expect(user1Notification!.tokensCommitted).toBe(100)
      expect(user1Notification!.payoutAmount).toBe(150)
      expect(user1Notification!.winnings).toBe(50)
      expect(user1Notification!.message).toContain('You won 50 tokens')

      // Verify notification content for loser
      const user3Notification = loserNotifications.find(n => n?.userId === 'user-3')
      expect(user3Notification).toBeDefined()
      expect(user3Notification!.tokensCommitted).toBe(100)
      expect(user3Notification!.payoutAmount).toBe(0)
      expect(user3Notification!.message).toContain("didn't win this time")
    })

    it('should skip notifications for users with disabled preferences', async () => {
      // Mock prediction document
      const mockPredictionDoc = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ title: mockPredictionTitle })
        })
      }

      const mockDoc = jest.fn().mockReturnValue(mockPredictionDoc)
      require('@/lib/db/database').doc = mockDoc

      // Mock user preferences with notifications disabled
      const mockPreferencesDoc = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            userId: 'user-1',
            emailNotifications: false,
            pushNotifications: false,
            inAppNotifications: false, // Disabled
            winNotifications: true,
            lossNotifications: true,
            refundNotifications: true
          })
        }),
        set: jest.fn()
      }

      mockDoc.mockReturnValue(mockPreferencesDoc)

      const notifications = await PayoutNotificationService.createPayoutNotifications(
        mockPredictionId,
        mockPayoutResult
      )

      // Should return empty array or only notifications for users with enabled preferences
      expect(notifications.filter(n => n !== null)).toHaveLength(0)
    })

    it('should handle missing prediction title gracefully', async () => {
      // Mock prediction document without title
      const mockPredictionDoc = {
        get: jest.fn().mockResolvedValue({
          exists: () => false
        })
      }

      const mockDoc = jest.fn().mockReturnValue(mockPredictionDoc)
      require('@/lib/db/database').doc = mockDoc

      // Mock user preferences
      const mockPreferencesDoc = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            userId: 'user-1',
            inAppNotifications: true,
            winNotifications: true,
            lossNotifications: true
          })
        })
      }

      mockDoc.mockReturnValue(mockPreferencesDoc)

      // Mock addDoc
      const mockAddDoc = jest.fn().mockResolvedValue({ id: 'notification-123' })
      require('@/lib/db/database').addDoc = mockAddDoc

      // Mock runTransaction
      const mockRunTransaction = jest.fn().mockImplementation(async (db, callback) => {
        const mockTransaction = { update: jest.fn() }
        return await callback(mockTransaction)
      })
      require('@/lib/db/database').runTransaction = mockRunTransaction

      const notifications = await PayoutNotificationService.createPayoutNotifications(
        mockPredictionId,
        mockPayoutResult
      )

      // Should still create notifications with default title
      const validNotifications = notifications.filter(n => n !== null)
      expect(validNotifications.length).toBeGreaterThan(0)
      validNotifications.forEach(notification => {
        expect(notification.predictionTitle).toBe('Unknown Prediction')
      })
    })
  })

  describe('createRefundNotifications', () => {
    it('should create refund notifications for cancelled predictions', async () => {
      const mockRefundResult: PayoutResult = {
        predictionId: mockPredictionId,
        totalProcessed: 2,
        winnersCount: 2, // Everyone gets refunded
        losersCount: 0,
        totalPaidOut: 300,
        totalCollected: 0,
        calculations: [
          {
            userId: 'user-1',
            commitmentId: 'commitment-1',
            tokensCommitted: 100,
            isWinner: true,
            payoutAmount: 100,
            returnRatio: 1.0,
            originalOdds: 2.0
          },
          {
            userId: 'user-2',
            commitmentId: 'commitment-2',
            tokensCommitted: 200,
            isWinner: true,
            payoutAmount: 200,
            returnRatio: 1.0,
            originalOdds: 1.5
          }
        ],
        errors: []
      }

      // Mock prediction document
      const mockPredictionDoc = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ title: mockPredictionTitle })
        })
      }

      const mockDoc = jest.fn().mockReturnValue(mockPredictionDoc)
      require('@/lib/db/database').doc = mockDoc

      // Mock user preferences
      const mockPreferencesDoc = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            userId: 'user-1',
            inAppNotifications: true,
            refundNotifications: true
          })
        })
      }

      mockDoc.mockReturnValue(mockPreferencesDoc)

      // Mock addDoc
      const mockAddDoc = jest.fn().mockResolvedValue({ id: 'notification-123' })
      require('@/lib/db/database').addDoc = mockAddDoc

      // Mock runTransaction
      const mockRunTransaction = jest.fn().mockImplementation(async (db, callback) => {
        const mockTransaction = { update: jest.fn() }
        return await callback(mockTransaction)
      })
      require('@/lib/db/database').runTransaction = mockRunTransaction

      const notifications = await PayoutNotificationService.createRefundNotifications(
        mockPredictionId,
        mockRefundResult
      )

      expect(notifications).toHaveLength(2)
      
      notifications.forEach(notification => {
        expect(notification.type).toBe('refund')
        expect(notification.returnRatio).toBe(1.0)
        expect(notification.message).toContain('have been refunded')
        expect(notification.message).toContain('due to cancellation')
      })
    })

    it('should skip refund notifications for users with disabled preferences', async () => {
      const mockRefundResult: PayoutResult = {
        predictionId: mockPredictionId,
        totalProcessed: 1,
        winnersCount: 1,
        losersCount: 0,
        totalPaidOut: 100,
        totalCollected: 0,
        calculations: [
          {
            userId: 'user-1',
            commitmentId: 'commitment-1',
            tokensCommitted: 100,
            isWinner: true,
            payoutAmount: 100,
            returnRatio: 1.0,
            originalOdds: 2.0
          }
        ],
        errors: []
      }

      // Mock prediction document
      const mockPredictionDoc = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ title: mockPredictionTitle })
        })
      }

      const mockDoc = jest.fn().mockReturnValue(mockPredictionDoc)
      require('@/lib/db/database').doc = mockDoc

      // Mock user preferences with refund notifications disabled
      const mockPreferencesDoc = {
        get: jest.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            userId: 'user-1',
            inAppNotifications: true,
            refundNotifications: false // Disabled
          })
        })
      }

      mockDoc.mockReturnValue(mockPreferencesDoc)

      const notifications = await PayoutNotificationService.createRefundNotifications(
        mockPredictionId,
        mockRefundResult
      )

      expect(notifications.filter(n => n !== null)).toHaveLength(0)
    })
  })

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const mockNotifications = [
        {
          id: 'notification-1',
          userId: 'user-1',
          type: 'win',
          predictionId: mockPredictionId,
          predictionTitle: mockPredictionTitle,
          tokensCommitted: 100,
          payoutAmount: 150,
          winnings: 50,
          returnRatio: 1.5,
          message: 'You won!',
          status: 'sent',
          createdAt: Timestamp.now()
        },
        {
          id: 'notification-2',
          userId: 'user-1',
          type: 'loss',
          predictionId: 'another-prediction',
          predictionTitle: 'Another prediction',
          tokensCommitted: 50,
          payoutAmount: 0,
          returnRatio: 0,
          message: 'You lost',
          status: 'sent',
          createdAt: Timestamp.now()
        }
      ]

      const mockGetDocs = jest.fn().mockResolvedValue({
        docs: mockNotifications.map(notification => ({
          id: notification.id,
          data: () => notification
        }))
      })

      require('@/lib/db/database').getDocs = mockGetDocs

      const notifications = await PayoutNotificationService.getUserNotifications('user-1')

      expect(notifications).toHaveLength(2)
      expect(notifications[0].type).toBe('win')
      expect(notifications[1].type).toBe('loss')
    })

    it('should throw error for invalid user ID', async () => {
      await expect(
        PayoutNotificationService.getUserNotifications('')
      ).rejects.toThrow('User ID is required')
    })
  })

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const mockRunTransaction = jest.fn().mockImplementation(async (db, callback) => {
        const mockTransaction = { update: jest.fn() }
        return await callback(mockTransaction)
      })

      require('@/lib/db/database').runTransaction = mockRunTransaction

      await PayoutNotificationService.markNotificationAsRead('notification-123')

      expect(mockRunTransaction).toHaveBeenCalled()
    })

    it('should throw error for invalid notification ID', async () => {
      await expect(
        PayoutNotificationService.markNotificationAsRead('')
      ).rejects.toThrow('Notification ID is required')
    })
  })

  describe('updateNotificationPreferences', () => {
    it('should update user notification preferences', async () => {
      const mockRunTransaction = jest.fn().mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              userId: 'user-1',
              emailNotifications: true,
              pushNotifications: true,
              inAppNotifications: true,
              winNotifications: true,
              lossNotifications: true,
              refundNotifications: true
            })
          }),
          set: jest.fn()
        }
        return await callback(mockTransaction)
      })

      require('@/lib/db/database').runTransaction = mockRunTransaction

      const updatedPreferences = await PayoutNotificationService.updateNotificationPreferences(
        'user-1',
        { winNotifications: false }
      )

      expect(updatedPreferences.winNotifications).toBe(false)
      expect(updatedPreferences.lossNotifications).toBe(true) // Should remain unchanged
    })

    it('should create default preferences for new user', async () => {
      const mockRunTransaction = jest.fn().mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => false
          }),
          set: jest.fn()
        }
        return await callback(mockTransaction)
      })

      require('@/lib/db/database').runTransaction = mockRunTransaction

      const preferences = await PayoutNotificationService.updateNotificationPreferences(
        'new-user',
        { emailNotifications: false }
      )

      expect(preferences.userId).toBe('new-user')
      expect(preferences.emailNotifications).toBe(false)
      expect(preferences.winNotifications).toBe(true) // Default value
    })

    it('should throw error for invalid user ID', async () => {
      await expect(
        PayoutNotificationService.updateNotificationPreferences('', {})
      ).rejects.toThrow('User ID is required')
    })
  })

  describe('notification message generation', () => {
    it('should generate appropriate win messages', async () => {
      const winCalculation: PayoutCalculation = {
        userId: 'user-1',
        commitmentId: 'commitment-1',
        tokensCommitted: 100,
        isWinner: true,
        payoutAmount: 150,
        returnRatio: 1.5,
        originalOdds: 2.0
      }

      // Access private method through any casting
      const service = PayoutNotificationService as any
      const message = service.generateNotificationMessage(winCalculation, mockPredictionTitle)

      expect(message).toContain('You won 50 tokens')
      expect(message).toContain(mockPredictionTitle)
      expect(message).toContain('🎉')
    })

    it('should generate appropriate loss messages', async () => {
      const lossCalculation: PayoutCalculation = {
        userId: 'user-1',
        commitmentId: 'commitment-1',
        tokensCommitted: 100,
        isWinner: false,
        payoutAmount: 0,
        returnRatio: 0,
        originalOdds: 1.5
      }

      // Access private method through any casting
      const service = PayoutNotificationService as any
      const message = service.generateNotificationMessage(lossCalculation, mockPredictionTitle)

      expect(message).toContain("didn't win this time")
      expect(message).toContain(mockPredictionTitle)
      expect(message).toContain('100 tokens')
    })

    it('should handle break-even wins', async () => {
      const breakEvenCalculation: PayoutCalculation = {
        userId: 'user-1',
        commitmentId: 'commitment-1',
        tokensCommitted: 100,
        isWinner: true,
        payoutAmount: 100, // Same as committed
        returnRatio: 1.0,
        originalOdds: 2.0
      }

      // Access private method through any casting
      const service = PayoutNotificationService as any
      const message = service.generateNotificationMessage(breakEvenCalculation, mockPredictionTitle)

      expect(message).toContain('was correct')
      expect(message).toContain('have been returned')
      expect(message).not.toContain('You won')
    })
  })
})