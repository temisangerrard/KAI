"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/auth/auth-context'
import { onSnapshot, query, collection, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { ResolutionPayout, CreatorPayout } from '@/lib/types/database'
import { useToast } from '@/hooks/use-toast'

interface PayoutNotification {
  id: string
  type: 'winner_payout' | 'creator_payout'
  amount: number
  marketTitle?: string
  profit?: number
  timestamp: Date
  isNew: boolean
}

export function usePayoutNotifications() {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<PayoutNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastNotificationTime, setLastNotificationTime] = useState<Date | null>(null)



  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    let winnerUnsubscribe: (() => void) | null = null
    let creatorUnsubscribe: (() => void) | null = null

    const setupListeners = async () => {
      try {
        setIsLoading(true)

        // Set initial timestamp to avoid showing old notifications as new
        const initialTimestamp = new Date()
        setLastNotificationTime(initialTimestamp)

        // Listen for winner payouts
        const winnerPayoutsQuery = query(
          collection(db, 'resolutionPayouts'),
          where('userId', '==', user.id),
          orderBy('processedAt', 'desc'),
          limit(10)
        )

        winnerUnsubscribe = onSnapshot(
          winnerPayoutsQuery,
          (snapshot) => {
            const newPayouts: PayoutNotification[] = []
            
            snapshot.docs.forEach(doc => {
              const payout = doc.data() as ResolutionPayout
              const timestamp = payout.processedAt.toDate()
              const isNew = timestamp > initialTimestamp
              
              const notification: PayoutNotification = {
                id: `winner_${doc.id}`,
                type: 'winner_payout',
                amount: payout.payoutAmount,
                profit: payout.profit,
                timestamp,
                isNew
              }
              
              newPayouts.push(notification)
              
              // Show toast for new payouts - inline to avoid dependency issues
              if (isNew) {
                toast({
                  title: "🎉 You Won!",
                  description: `You earned ${notification.amount} tokens${notification.profit ? ` (profit: +${notification.profit})` : ''} from "${notification.marketTitle}"`,
                  duration: 8000,
                })
              }
            })

            setNotifications(prev => {
              const filtered = prev.filter(n => n.type !== 'winner_payout')
              return [...filtered, ...newPayouts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            })
          },
          (error) => {
            console.error('[PAYOUT_NOTIFICATIONS] Winner payouts listener error:', error)
          }
        )

        // Listen for creator payouts
        const creatorPayoutsQuery = query(
          collection(db, 'creatorPayouts'),
          where('creatorId', '==', user.id),
          orderBy('processedAt', 'desc'),
          limit(10)
        )

        creatorUnsubscribe = onSnapshot(
          creatorPayoutsQuery,
          (snapshot) => {
            const newPayouts: PayoutNotification[] = []
            
            snapshot.docs.forEach(doc => {
              const payout = doc.data() as CreatorPayout
              const timestamp = payout.processedAt.toDate()
              const isNew = timestamp > initialTimestamp
              
              const notification: PayoutNotification = {
                id: `creator_${doc.id}`,
                type: 'creator_payout',
                amount: payout.feeAmount,
                timestamp,
                isNew
              }
              
              newPayouts.push(notification)
              
              // Show toast for new payouts - inline to avoid dependency issues
              if (isNew) {
                toast({
                  title: "💰 Creator Fee Earned!",
                  description: `You earned ${notification.amount} tokens as creator fee from "${notification.marketTitle}"`,
                  duration: 8000,
                })
              }
            })

            setNotifications(prev => {
              const filtered = prev.filter(n => n.type !== 'creator_payout')
              return [...filtered, ...newPayouts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            })
          },
          (error) => {
            console.error('[PAYOUT_NOTIFICATIONS] Creator payouts listener error:', error)
          }
        )

      } catch (error) {
        console.error('[PAYOUT_NOTIFICATIONS] Error setting up listeners:', error)
      } finally {
        setIsLoading(false)
      }
    }

    setupListeners()

    // Cleanup listeners
    return () => {
      if (winnerUnsubscribe) winnerUnsubscribe()
      if (creatorUnsubscribe) creatorUnsubscribe()
    }
  }, [user?.id, isAuthenticated, toast]) // Only depend on stable values

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isNew: false } : n
      )
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isNew: false }))
    )
  }, [])

  const newNotificationCount = notifications.filter(n => n.isNew).length

  return {
    notifications,
    isLoading,
    newNotificationCount,
    markAsRead,
    markAllAsRead
  }
}