"use client"

import { useState, useEffect, useCallback } from 'react'
import { PredictionCommitmentService } from '@/lib/services/token-database'
import { PredictionCommitment } from '@/lib/types/token'
import { useAuth } from '@/app/auth/auth-context'

export interface UserCommitmentData {
  id: string
  marketId: string
  marketTitle: string
  position: 'yes' | 'no'
  tokensCommitted: number
  potentialWinning: number
  status: 'active' | 'won' | 'lost' | 'refunded'
  committedAt: Date
  resolvedAt?: Date
}

export function useUserCommitments() {
  const { user } = useAuth()
  const [commitments, setCommitments] = useState<UserCommitmentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCommitments() {
      if (!user?.id) {
        setCommitments([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        console.log('[USE_USER_COMMITMENTS] Fetching commitments for user:', user.id)
        
        const rawCommitments = await PredictionCommitmentService.getUserCommitments(user.id)
        console.log('[USE_USER_COMMITMENTS] Raw commitments:', rawCommitments.length)
        
        // Transform the raw commitments to the display format
        const transformedCommitments: UserCommitmentData[] = rawCommitments.map(commitment => ({
          id: commitment.id,
          marketId: commitment.predictionId, // Using predictionId as marketId for now
          marketTitle: commitment.metadata?.marketTitle || `Market ${commitment.predictionId}`,
          position: commitment.position,
          tokensCommitted: commitment.tokensCommitted,
          potentialWinning: commitment.potentialWinning,
          status: commitment.status,
          committedAt: commitment.committedAt?.toDate?.() || new Date(),
          resolvedAt: commitment.resolvedAt?.toDate?.()
        }))

        console.log('[USE_USER_COMMITMENTS] Transformed commitments:', transformedCommitments.length)
        setCommitments(transformedCommitments)
      } catch (err) {
        console.error('[USE_USER_COMMITMENTS] Error fetching commitments:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load commitments'
        
        // If it's an index error, provide a more helpful message
        if (errorMessage.includes('index')) {
          setError('Database index required - commitments will load once configured')
        } else {
          setError(errorMessage)
        }
        
        setCommitments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCommitments()
  }, [user?.id])

  const refetch = useCallback(() => {
    if (user?.id) {
      setIsLoading(true)
      // Re-trigger the effect by updating a dependency
    }
  }, [user?.id])

  return {
    commitments,
    isLoading,
    error,
    refetch
  }
}