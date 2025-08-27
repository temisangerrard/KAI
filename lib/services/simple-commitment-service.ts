/**
 * Simple Commitment Service
 * Fallback service that uses basic queries without complex indexes
 */

import {
  collection,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { PredictionCommitment } from '@/lib/types/token'

export class SimpleCommitmentService {
  /**
   * Get user commitments using simple query (no orderBy to avoid index requirements)
   */
  static async getUserCommitments(userId: string): Promise<PredictionCommitment[]> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    try {
      console.log('[SIMPLE_COMMITMENT] Fetching commitments for user:', userId)
      
      // Simple query without orderBy to avoid index requirements
      const commitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('userId', '==', userId),
        limit(100) // Reasonable limit
      )

      const snapshot = await getDocs(commitmentsQuery)
      let commitments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[]

      // Sort on client side by committedAt (newest first)
      commitments.sort((a, b) => {
        const aTime = a.committedAt?.toMillis?.() || 0
        const bTime = b.committedAt?.toMillis?.() || 0
        return bTime - aTime
      })

      console.log('[SIMPLE_COMMITMENT] Found commitments:', commitments.length)
      return commitments
    } catch (error) {
      console.error('[SIMPLE_COMMITMENT] Error fetching commitments:', error)
      
      // If it's still an index error, return empty array
      if (error.message?.includes('index')) {
        console.warn('[SIMPLE_COMMITMENT] Index error, returning empty array')
        return []
      }
      
      throw error
    }
  }

  /**
   * Get active commitments only (for real-time updates)
   */
  static async getActiveCommitments(userId: string): Promise<PredictionCommitment[]> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    try {
      const commitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        limit(50)
      )

      const snapshot = await getDocs(commitmentsQuery)
      const commitments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[]

      // Sort on client side
      commitments.sort((a, b) => {
        const aTime = a.committedAt?.toMillis?.() || 0
        const bTime = b.committedAt?.toMillis?.() || 0
        return bTime - aTime
      })

      return commitments
    } catch (error) {
      console.error('[SIMPLE_COMMITMENT] Error fetching active commitments:', error)
      
      // Fallback: get all commitments and filter client-side
      try {
        const allCommitments = await this.getUserCommitments(userId)
        return allCommitments.filter(c => c.status === 'active')
      } catch (fallbackError) {
        console.error('[SIMPLE_COMMITMENT] Fallback also failed:', fallbackError)
        return []
      }
    }
  }
}