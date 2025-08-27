/**
 * Commitment Database Optimization Utilities
 * 
 * This module provides utilities for optimizing the prediction_commitments
 * collection structure and implementing efficient query patterns.
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  doc, 
  getDoc,
  writeBatch,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { PredictionCommitment } from '@/lib/types/token'

export interface CommitmentQueryOptions {
  predictionId?: string
  userId?: string
  status?: PredictionCommitment['status']
  limit?: number
  startAfter?: DocumentSnapshot
  orderBy?: 'committedAt' | 'resolvedAt'
  orderDirection?: 'asc' | 'desc'
}

export interface MarketCommitmentAnalytics {
  totalTokensCommitted: number
  participantCount: number
  yesTokens: number
  noTokens: number
  averageCommitment: number
  largestCommitment: number
  commitmentsByStatus: Record<PredictionCommitment['status'], number>
  commitmentTrend: {
    date: string
    count: number
    totalTokens: number
  }[]
}

export interface CommitmentWithUserInfo extends PredictionCommitment {
  userEmail?: string
  userDisplayName?: string
  marketTitle?: string
}

/**
 * Optimized Commitment Query Service
 * 
 * Provides efficient querying patterns using the optimized indexes
 */
export class OptimizedCommitmentQueries {
  
  /**
   * Get commitments for a specific market with efficient pagination
   * Uses: predictionId + status + committedAt index
   */
  static async getMarketCommitments(
    predictionId: string, 
    options: Omit<CommitmentQueryOptions, 'predictionId'> = {}
  ): Promise<{ commitments: PredictionCommitment[]; lastDoc?: DocumentSnapshot }> {
    
    const constraints: QueryConstraint[] = [
      where('predictionId', '==', predictionId)
    ]
    
    if (options.status) {
      constraints.push(where('status', '==', options.status))
    }
    
    // Use optimized ordering
    const orderField = options.orderBy || 'committedAt'
    const orderDir = options.orderDirection || 'desc'
    constraints.push(orderBy(orderField, orderDir))
    
    if (options.limit) {
      constraints.push(limit(options.limit))
    }
    
    if (options.startAfter) {
      constraints.push(startAfter(options.startAfter))
    }
    
    const q = query(collection(db, 'prediction_commitments'), ...constraints)
    const snapshot = await getDocs(q)
    
    const commitments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PredictionCommitment[]
    
    const lastDoc = snapshot.docs[snapshot.docs.length - 1]
    
    return { commitments, lastDoc }
  }
  
  /**
   * Get user commitments with efficient filtering
   * Uses: userId + predictionId + status index
   */
  static async getUserCommitments(
    userId: string,
    options: Omit<CommitmentQueryOptions, 'userId'> = {}
  ): Promise<{ commitments: PredictionCommitment[]; lastDoc?: DocumentSnapshot }> {
    
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId)
    ]
    
    if (options.predictionId) {
      constraints.push(where('predictionId', '==', options.predictionId))
    }
    
    if (options.status) {
      constraints.push(where('status', '==', options.status))
    }
    
    // Use optimized ordering
    const orderField = options.orderBy || 'committedAt'
    const orderDir = options.orderDirection || 'desc'
    constraints.push(orderBy(orderField, orderDir))
    
    if (options.limit) {
      constraints.push(limit(options.limit))
    }
    
    if (options.startAfter) {
      constraints.push(startAfter(options.startAfter))
    }
    
    const q = query(collection(db, 'prediction_commitments'), ...constraints)
    const snapshot = await getDocs(q)
    
    const commitments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PredictionCommitment[]
    
    const lastDoc = snapshot.docs[snapshot.docs.length - 1]
    
    return { commitments, lastDoc }
  }
  
  /**
   * Get commitments by status with time-based ordering
   * Uses: status + committedAt or status + resolvedAt indexes
   */
  static async getCommitmentsByStatus(
    status: PredictionCommitment['status'],
    options: Omit<CommitmentQueryOptions, 'status'> = {}
  ): Promise<{ commitments: PredictionCommitment[]; lastDoc?: DocumentSnapshot }> {
    
    const constraints: QueryConstraint[] = [
      where('status', '==', status)
    ]
    
    // Use appropriate ordering based on status
    const orderField = status === 'active' ? 'committedAt' : 'resolvedAt'
    const orderDir = options.orderDirection || 'desc'
    constraints.push(orderBy(orderField, orderDir))
    
    if (options.limit) {
      constraints.push(limit(options.limit))
    }
    
    if (options.startAfter) {
      constraints.push(startAfter(options.startAfter))
    }
    
    const q = query(collection(db, 'prediction_commitments'), ...constraints)
    const snapshot = await getDocs(q)
    
    const commitments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PredictionCommitment[]
    
    const lastDoc = snapshot.docs[snapshot.docs.length - 1]
    
    return { commitments, lastDoc }
  }
  
  /**
   * Get commitments with user information for admin display
   * Efficiently joins user data using batch queries
   */
  static async getCommitmentsWithUserInfo(
    commitments: PredictionCommitment[]
  ): Promise<CommitmentWithUserInfo[]> {
    
    if (commitments.length === 0) return []
    
    // Get unique user IDs
    const userIds = [...new Set(commitments.map(c => c.userId))]
    
    // Batch fetch user information
    const userInfoMap = new Map<string, { email?: string; displayName?: string }>()
    
    for (const userId of userIds) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          userInfoMap.set(userId, {
            email: userData.email,
            displayName: userData.displayName
          })
        }
      } catch (error) {
        console.warn(`Failed to fetch user info for ${userId}:`, error)
        userInfoMap.set(userId, {})
      }
    }
    
    // Get unique prediction IDs for market titles
    const predictionIds = [...new Set(commitments.map(c => c.predictionId))]
    const marketInfoMap = new Map<string, { title?: string }>()
    
    for (const predictionId of predictionIds) {
      try {
        const marketDoc = await getDoc(doc(db, 'markets', predictionId))
        if (marketDoc.exists()) {
          const marketData = marketDoc.data()
          marketInfoMap.set(predictionId, {
            title: marketData.title
          })
        }
      } catch (error) {
        console.warn(`Failed to fetch market info for ${predictionId}:`, error)
        marketInfoMap.set(predictionId, {})
      }
    }
    
    // Combine commitment data with user and market info
    return commitments.map(commitment => ({
      ...commitment,
      userEmail: userInfoMap.get(commitment.userId)?.email,
      userDisplayName: userInfoMap.get(commitment.userId)?.displayName,
      marketTitle: marketInfoMap.get(commitment.predictionId)?.title
    }))
  }
}

/**
 * Market Analytics Service
 * 
 * Provides efficient analytics calculations using optimized queries
 */
export class MarketAnalyticsService {
  
  /**
   * Calculate comprehensive market analytics
   * Uses optimized queries to minimize database reads
   */
  static async calculateMarketAnalytics(
    predictionId: string
  ): Promise<MarketCommitmentAnalytics> {
    
    // Get all commitments for the market
    const { commitments } = await OptimizedCommitmentQueries.getMarketCommitments(
      predictionId,
      { limit: 1000 } // Reasonable limit for analytics
    )
    
    if (commitments.length === 0) {
      return {
        totalTokensCommitted: 0,
        participantCount: 0,
        yesTokens: 0,
        noTokens: 0,
        averageCommitment: 0,
        largestCommitment: 0,
        commitmentsByStatus: {
          active: 0,
          won: 0,
          lost: 0,
          refunded: 0
        },
        commitmentTrend: []
      }
    }
    
    // Calculate basic metrics
    const totalTokensCommitted = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
    const participantCount = new Set(commitments.map(c => c.userId)).size
    
    const yesTokens = commitments
      .filter(c => c.position === 'yes')
      .reduce((sum, c) => sum + c.tokensCommitted, 0)
    
    const noTokens = commitments
      .filter(c => c.position === 'no')
      .reduce((sum, c) => sum + c.tokensCommitted, 0)
    
    const averageCommitment = totalTokensCommitted / commitments.length
    const largestCommitment = Math.max(...commitments.map(c => c.tokensCommitted))
    
    // Calculate commitments by status
    const commitmentsByStatus = commitments.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {} as Record<PredictionCommitment['status'], number>)
    
    // Ensure all statuses are present
    const statusCounts = {
      active: commitmentsByStatus.active || 0,
      won: commitmentsByStatus.won || 0,
      lost: commitmentsByStatus.lost || 0,
      refunded: commitmentsByStatus.refunded || 0
    }
    
    // Calculate commitment trend (group by day)
    const commitmentTrend = this.calculateCommitmentTrend(commitments)
    
    return {
      totalTokensCommitted,
      participantCount,
      yesTokens,
      noTokens,
      averageCommitment,
      largestCommitment,
      commitmentsByStatus: statusCounts,
      commitmentTrend
    }
  }
  
  /**
   * Calculate daily commitment trends
   */
  private static calculateCommitmentTrend(
    commitments: PredictionCommitment[]
  ): MarketCommitmentAnalytics['commitmentTrend'] {
    
    const dailyData = new Map<string, { count: number; totalTokens: number }>()
    
    commitments.forEach(commitment => {
      const date = commitment.committedAt.toDate().toISOString().split('T')[0]
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { count: 0, totalTokens: 0 })
      }
      
      const dayData = dailyData.get(date)!
      dayData.count += 1
      dayData.totalTokens += commitment.tokensCommitted
    })
    
    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        totalTokens: data.totalTokens
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }
  
  /**
   * Get global commitment analytics across all markets
   */
  static async getGlobalAnalytics(): Promise<{
    totalMarkets: number
    totalCommitments: number
    totalTokensCommitted: number
    activeCommitments: number
    resolvedCommitments: number
  }> {
    
    // Get active commitments
    const { commitments: activeCommitments } = await OptimizedCommitmentQueries
      .getCommitmentsByStatus('active', { limit: 1000 })
    
    // Get resolved commitments (won + lost)
    const { commitments: wonCommitments } = await OptimizedCommitmentQueries
      .getCommitmentsByStatus('won', { limit: 1000 })
    
    const { commitments: lostCommitments } = await OptimizedCommitmentQueries
      .getCommitmentsByStatus('lost', { limit: 1000 })
    
    const allCommitments = [...activeCommitments, ...wonCommitments, ...lostCommitments]
    
    const totalTokensCommitted = allCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
    const uniqueMarkets = new Set(allCommitments.map(c => c.predictionId))
    
    return {
      totalMarkets: uniqueMarkets.size,
      totalCommitments: allCommitments.length,
      totalTokensCommitted,
      activeCommitments: activeCommitments.length,
      resolvedCommitments: wonCommitments.length + lostCommitments.length
    }
  }
}

/**
 * Database Maintenance Utilities
 * 
 * Provides utilities for maintaining commitment data integrity
 */
export class CommitmentMaintenanceUtils {
  
  /**
   * Validate commitment data integrity
   */
  static async validateCommitmentIntegrity(): Promise<{
    validCommitments: number
    invalidCommitments: number
    issues: string[]
  }> {
    
    const { commitments } = await OptimizedCommitmentQueries.getCommitmentsByStatus('active')
    
    let validCommitments = 0
    let invalidCommitments = 0
    const issues: string[] = []
    
    for (const commitment of commitments) {
      const isValid = this.validateCommitmentData(commitment)
      
      if (isValid.valid) {
        validCommitments++
      } else {
        invalidCommitments++
        issues.push(`Commitment ${commitment.id}: ${isValid.errors.join(', ')}`)
      }
    }
    
    return {
      validCommitments,
      invalidCommitments,
      issues
    }
  }
  
  /**
   * Validate individual commitment data
   */
  private static validateCommitmentData(commitment: PredictionCommitment): {
    valid: boolean
    errors: string[]
  } {
    
    const errors: string[] = []
    
    // Required field validation
    if (!commitment.userId) errors.push('Missing userId')
    if (!commitment.predictionId) errors.push('Missing predictionId')
    if (!commitment.tokensCommitted || commitment.tokensCommitted <= 0) {
      errors.push('Invalid tokensCommitted')
    }
    if (!['yes', 'no'].includes(commitment.position)) {
      errors.push('Invalid position')
    }
    if (!commitment.odds || commitment.odds <= 0) {
      errors.push('Invalid odds')
    }
    if (!['active', 'won', 'lost', 'refunded'].includes(commitment.status)) {
      errors.push('Invalid status')
    }
    if (!commitment.committedAt) {
      errors.push('Missing committedAt')
    }
    
    // Business logic validation
    if (commitment.potentialWinning < 0) {
      errors.push('Negative potential winning')
    }
    
    if (commitment.tokensCommitted > 10000) {
      errors.push('Tokens committed exceeds maximum')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Clean up orphaned commitments (commitments to non-existent markets)
   */
  static async cleanupOrphanedCommitments(): Promise<{
    orphanedCount: number
    cleanedUp: number
  }> {
    
    const { commitments } = await OptimizedCommitmentQueries.getCommitmentsByStatus('active')
    
    let orphanedCount = 0
    let cleanedUp = 0
    
    const batch = writeBatch(db)
    let batchCount = 0
    
    for (const commitment of commitments) {
      try {
        const marketDoc = await getDoc(doc(db, 'markets', commitment.predictionId))
        
        if (!marketDoc.exists()) {
          orphanedCount++
          
          // Mark as refunded instead of deleting
          const commitmentRef = doc(db, 'prediction_commitments', commitment.id)
          batch.update(commitmentRef, {
            status: 'refunded',
            resolvedAt: Timestamp.now()
          })
          
          batchCount++
          cleanedUp++
          
          // Commit batch if it gets too large
          if (batchCount >= 500) {
            await batch.commit()
            batchCount = 0
          }
        }
      } catch (error) {
        console.warn(`Error checking market ${commitment.predictionId}:`, error)
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit()
    }
    
    return {
      orphanedCount,
      cleanedUp
    }
  }
}

export {
  OptimizedCommitmentQueries,
  MarketAnalyticsService,
  CommitmentMaintenanceUtils
}