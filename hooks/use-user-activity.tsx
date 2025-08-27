"use client"

import { useState, useEffect } from 'react'
import { useUserCommitments } from './use-user-commitments'
import { useAuth } from '@/app/auth/auth-context'

export interface UserActivity {
  id: string
  type: 'commitment' | 'win' | 'loss' | 'market' | 'purchase'
  title: string
  date: Date
  tokens: number
  isWin?: boolean
  status?: string
}

/**
 * Consolidated hook for user activity (commitments + transactions)
 * This eliminates duplication between profile and wallet
 */
export function useUserActivity() {
  const { user } = useAuth()
  const { commitments, isLoading: commitmentsLoading, error } = useUserCommitments()
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (commitmentsLoading) {
      setIsLoading(true)
      return
    }

    const userActivities: UserActivity[] = []

    // Add commitment activities
    commitments.forEach(commitment => {
      userActivities.push({
        id: `commitment_${commitment.id}`,
        type: commitment.status === 'won' ? 'win' : commitment.status === 'lost' ? 'loss' : 'commitment',
        title: commitment.status === 'won'
          ? `Won commitment on "${commitment.marketTitle}"`
          : commitment.status === 'lost'
            ? `Lost commitment on "${commitment.marketTitle}"`
            : commitment.status === 'refunded'
              ? `Refunded commitment on "${commitment.marketTitle}"`
              : `Backed ${commitment.position} on "${commitment.marketTitle}"`,
        date: commitment.committedAt,
        tokens: commitment.status === 'won' ? commitment.potentialWinning : commitment.tokensCommitted,
        isWin: commitment.status === 'won',
        status: commitment.status
      })
    })

    // Sort by date (most recent first)
    userActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setActivities(userActivities)
    setIsLoading(false)
  }, [commitments, commitmentsLoading])

  return {
    activities,
    commitments, // Pass through for direct access
    isLoading,
    error
  }
}