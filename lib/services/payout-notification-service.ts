/**
 * Payout Notification Service
 * Handles notifications for prediction payout events
 */

import {
  doc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  runTransaction
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { PayoutCalculation, PayoutResult } from './prediction-payout-service'

export interface PayoutNotification {
  id?: string
  userId: string
  type: 'win' | 'loss' | 'refund'
  predictionId: string
  predictionTitle: string
  tokensCommitted: number
  payoutAmount: number
  winnings?: number
  returnRatio: number
  message: string
  status: 'pending' | 'sent' | 'failed'
  createdAt: Timestamp
  sentAt?: Timestamp
  metadata?: {
    [key: string]: any
  }
}

export interface NotificationPreferences {
  userId: string
  emailNotifications: boolean
  pushNotifications: boolean
  inAppNotifications: boolean
  winNotifications: boolean
  lossNotifications: boolean
  refundNotifications: boolean
}

/**
 * Payout Notification Service
 * Manages notifications for prediction payout events
 */
export class PayoutNotificationService {
  private static readonly COLLECTIONS = {
    notifications: 'payout_notifications',
    preferences: 'notification_preferences',
    markets: 'markets'
  } as const

  /**
   * Create notifications for all users affected by a payout
   */
  static async createPayoutNotifications(
    predictionId: string,
    payoutResult: PayoutResult
  ): Promise<PayoutNotification[]> {
    if (!predictionId?.trim()) {
      throw new Error('Prediction ID is required')
    }

    try {
      // Get prediction details for notification content
      const predictionRef = doc(db, this.COLLECTIONS.markets, predictionId)
      const predictionSnap = await predictionRef.get()
      
      const predictionTitle = predictionSnap.exists() 
        ? predictionSnap.data()?.title || 'Unknown Prediction'
        : 'Unknown Prediction'

      const notifications: PayoutNotification[] = []

      // Create notifications for each user
      for (const calculation of payoutResult.calculations) {
        const notification = await this.createUserPayoutNotification(
          calculation,
          predictionId,
          predictionTitle
        )
        
        if (notification) {
          notifications.push(notification)
        }
      }

      return notifications
    } catch (error) {
      console.error('Error creating payout notifications:', error)
      throw new Error(`Failed to create payout notifications: ${error.message}`)
    }
  }

  /**
   * Create a notification for a specific user's payout
   */
  private static async createUserPayoutNotification(
    calculation: PayoutCalculation,
    predictionId: string,
    predictionTitle: string
  ): Promise<PayoutNotification | null> {
    try {
      // Check user notification preferences
      const preferences = await this.getUserNotificationPreferences(calculation.userId)
      
      if (!this.shouldSendNotification(calculation, preferences)) {
        console.log(`Skipping notification for user ${calculation.userId} based on preferences`)
        return null
      }

      const notificationType = calculation.isWinner ? 'win' : 'loss'
      const winnings = calculation.isWinner ? calculation.payoutAmount - calculation.tokensCommitted : 0
      
      const notification: Omit<PayoutNotification, 'id'> = {
        userId: calculation.userId,
        type: notificationType,
        predictionId,
        predictionTitle,
        tokensCommitted: calculation.tokensCommitted,
        payoutAmount: calculation.payoutAmount,
        winnings: winnings > 0 ? winnings : undefined,
        returnRatio: calculation.returnRatio,
        message: this.generateNotificationMessage(calculation, predictionTitle),
        status: 'pending',
        createdAt: Timestamp.now(),
        metadata: {
          originalOdds: calculation.originalOdds,
          commitmentId: calculation.commitmentId
        }
      }

      // Save notification to database
      const notificationRef = await addDoc(
        collection(db, this.COLLECTIONS.notifications),
        notification
      )

      const savedNotification: PayoutNotification = {
        id: notificationRef.id,
        ...notification
      }

      // Attempt to send the notification immediately
      await this.sendNotification(savedNotification, preferences)

      return savedNotification
    } catch (error) {
      console.error(`Error creating notification for user ${calculation.userId}:`, error)
      return null
    }
  }

  /**
   * Create refund notifications for cancelled predictions
   */
  static async createRefundNotifications(
    predictionId: string,
    payoutResult: PayoutResult
  ): Promise<PayoutNotification[]> {
    if (!predictionId?.trim()) {
      throw new Error('Prediction ID is required')
    }

    try {
      // Get prediction details
      const predictionRef = doc(db, this.COLLECTIONS.markets, predictionId)
      const predictionSnap = await predictionRef.get()
      
      const predictionTitle = predictionSnap.exists() 
        ? predictionSnap.data()?.title || 'Unknown Prediction'
        : 'Unknown Prediction'

      const notifications: PayoutNotification[] = []

      // Create refund notifications for each user
      for (const calculation of payoutResult.calculations) {
        const notification = await this.createUserRefundNotification(
          calculation,
          predictionId,
          predictionTitle
        )
        
        if (notification) {
          notifications.push(notification)
        }
      }

      return notifications
    } catch (error) {
      console.error('Error creating refund notifications:', error)
      throw new Error(`Failed to create refund notifications: ${error.message}`)
    }
  }

  /**
   * Create a refund notification for a specific user
   */
  private static async createUserRefundNotification(
    calculation: PayoutCalculation,
    predictionId: string,
    predictionTitle: string
  ): Promise<PayoutNotification | null> {
    try {
      // Check user notification preferences
      const preferences = await this.getUserNotificationPreferences(calculation.userId)
      
      if (!preferences.refundNotifications) {
        return null
      }

      const notification: Omit<PayoutNotification, 'id'> = {
        userId: calculation.userId,
        type: 'refund',
        predictionId,
        predictionTitle,
        tokensCommitted: calculation.tokensCommitted,
        payoutAmount: calculation.payoutAmount,
        returnRatio: 1.0,
        message: `Your ${calculation.tokensCommitted} tokens have been refunded for "${predictionTitle}" due to cancellation.`,
        status: 'pending',
        createdAt: Timestamp.now(),
        metadata: {
          commitmentId: calculation.commitmentId,
          reason: 'prediction_cancelled'
        }
      }

      // Save notification to database
      const notificationRef = await addDoc(
        collection(db, this.COLLECTIONS.notifications),
        notification
      )

      const savedNotification: PayoutNotification = {
        id: notificationRef.id,
        ...notification
      }

      // Attempt to send the notification immediately
      await this.sendNotification(savedNotification, preferences)

      return savedNotification
    } catch (error) {
      console.error(`Error creating refund notification for user ${calculation.userId}:`, error)
      return null
    }
  }

  /**
   * Get user notification preferences
   */
  private static async getUserNotificationPreferences(
    userId: string
  ): Promise<NotificationPreferences> {
    try {
      const preferencesRef = doc(db, this.COLLECTIONS.preferences, userId)
      const preferencesSnap = await preferencesRef.get()

      if (preferencesSnap.exists()) {
        return preferencesSnap.data() as NotificationPreferences
      }

      // Return default preferences if none exist
      const defaultPreferences: NotificationPreferences = {
        userId,
        emailNotifications: true,
        pushNotifications: true,
        inAppNotifications: true,
        winNotifications: true,
        lossNotifications: true,
        refundNotifications: true
      }

      // Save default preferences
      await preferencesRef.set(defaultPreferences)
      return defaultPreferences
    } catch (error) {
      console.error(`Error getting notification preferences for user ${userId}:`, error)
      
      // Return default preferences on error
      return {
        userId,
        emailNotifications: true,
        pushNotifications: true,
        inAppNotifications: true,
        winNotifications: true,
        lossNotifications: true,
        refundNotifications: true
      }
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private static shouldSendNotification(
    calculation: PayoutCalculation,
    preferences: NotificationPreferences
  ): boolean {
    if (!preferences.inAppNotifications) {
      return false
    }

    if (calculation.isWinner && !preferences.winNotifications) {
      return false
    }

    if (!calculation.isWinner && !preferences.lossNotifications) {
      return false
    }

    return true
  }

  /**
   * Generate notification message based on payout calculation
   */
  private static generateNotificationMessage(
    calculation: PayoutCalculation,
    predictionTitle: string
  ): string {
    if (calculation.isWinner) {
      const winnings = calculation.payoutAmount - calculation.tokensCommitted
      if (winnings > 0) {
        return `🎉 You won ${winnings} tokens on "${predictionTitle}"! Your ${calculation.tokensCommitted} tokens returned ${calculation.payoutAmount} total.`
      } else {
        return `Your prediction on "${predictionTitle}" was correct! Your ${calculation.tokensCommitted} tokens have been returned.`
      }
    } else {
      return `Your prediction on "${predictionTitle}" didn't win this time. Your ${calculation.tokensCommitted} tokens were added to the winning pool.`
    }
  }

  /**
   * Send notification to user (placeholder for actual notification delivery)
   */
  private static async sendNotification(
    notification: PayoutNotification,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      // This is where you would integrate with actual notification services
      // For now, we'll just mark it as sent and log it
      
      console.log(`Sending ${notification.type} notification to user ${notification.userId}:`, {
        message: notification.message,
        predictionTitle: notification.predictionTitle,
        payoutAmount: notification.payoutAmount
      })

      // In a real implementation, you would:
      // 1. Send push notification if preferences.pushNotifications
      // 2. Send email if preferences.emailNotifications
      // 3. Create in-app notification if preferences.inAppNotifications

      // Update notification status to sent
      if (notification.id) {
        const notificationRef = doc(db, this.COLLECTIONS.notifications, notification.id)
        await runTransaction(db, async (transaction) => {
          transaction.update(notificationRef, {
            status: 'sent',
            sentAt: Timestamp.now()
          })
        })
      }

      console.log(`Notification sent successfully to user ${notification.userId}`)
    } catch (error) {
      console.error(`Error sending notification to user ${notification.userId}:`, error)
      
      // Update notification status to failed
      if (notification.id) {
        const notificationRef = doc(db, this.COLLECTIONS.notifications, notification.id)
        await runTransaction(db, async (transaction) => {
          transaction.update(notificationRef, {
            status: 'failed',
            sentAt: Timestamp.now()
          })
        })
      }
      
      throw error
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 50
  ): Promise<PayoutNotification[]> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    try {
      const notificationsQuery = query(
        collection(db, this.COLLECTIONS.notifications),
        where('userId', '==', userId),
        // orderBy('createdAt', 'desc'),
        // limit(limit)
      )

      const notificationsSnap = await getDocs(notificationsQuery)
      return notificationsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PayoutNotification[]
    } catch (error) {
      console.error(`Error getting notifications for user ${userId}:`, error)
      throw new Error(`Failed to get notifications for user ${userId}: ${error.message}`)
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    if (!notificationId?.trim()) {
      throw new Error('Notification ID is required')
    }

    try {
      const notificationRef = doc(db, this.COLLECTIONS.notifications, notificationId)
      await runTransaction(db, async (transaction) => {
        transaction.update(notificationRef, {
          readAt: Timestamp.now()
        })
      })
    } catch (error) {
      console.error(`Error marking notification ${notificationId} as read:`, error)
      throw new Error(`Failed to mark notification as read: ${error.message}`)
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    try {
      const preferencesRef = doc(db, this.COLLECTIONS.preferences, userId)
      
      return await runTransaction(db, async (transaction) => {
        const currentPrefs = await transaction.get(preferencesRef)
        
        const updatedPreferences: NotificationPreferences = {
          userId,
          emailNotifications: true,
          pushNotifications: true,
          inAppNotifications: true,
          winNotifications: true,
          lossNotifications: true,
          refundNotifications: true,
          ...(currentPrefs.exists() ? currentPrefs.data() : {}),
          ...preferences
        }

        transaction.set(preferencesRef, updatedPreferences)
        return updatedPreferences
      })
    } catch (error) {
      console.error(`Error updating notification preferences for user ${userId}:`, error)
      throw new Error(`Failed to update notification preferences: ${error.message}`)
    }
  }
}