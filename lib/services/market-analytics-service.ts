import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  Unsubscribe
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { PredictionCommitment } from '@/lib/types/token'

/**
 * Market Analytics Data Models
 */
export interface MarketAnalytics {
  marketId: string
  totalTokensCommitted: number
  participantCount: number
  yesTokens: number
  noTokens: number
  yesPercentage: number
  noPercentage: number
  averageCommitment: number
  largestCommitment: number
  smallestCommitment: number
  commitmentCount: number
  lastUpdated: Timestamp
}

export interface MarketCommitmentSummary {
  marketId: string
  marketTitle: string
  status: 'active' | 'resolved' | 'cancelled'
  analytics: MarketAnalytics
  recentCommitments: CommitmentWithUser[]
}

export interface CommitmentWithUser {
  id: string
  userId: string
  userEmail?: string
  userDisplayName?: string
  tokensCommitted: number
  position: 'yes' | 'no'
  odds: number
  potentialWinning: number
  status: 'active' | 'won' | 'lost' | 'refunded'
  committedAt: Timestamp
}

export interface GlobalCommitmentAnalytics {
  totalMarketsWithCommitments: number
  totalTokensCommitted: number
  activeCommitments: number
  resolvedCommitments: number
  averageCommitmentSize: number
  totalParticipants: number
  lastUpdated: Timestamp
}

/**
 * Cache configuration for analytics
 */
interface AnalyticsCache {
  data: MarketAnalytics | GlobalCommitmentAnalytics
  timestamp: number
  ttl: number // Time to live in milliseconds
}

/**
 * Market Analytics Service
 * Provides efficient aggregation functions for market commitment analytics
 */
export class MarketAnalyticsService {
  private static readonly COLLECTIONS = {
    predictionCommitments: 'prediction_commitments',
    markets: 'markets',
    users: 'users',
    marketAnalytics: 'market_analytics',
    globalAnalytics: 'global_analytics'
  } as const

  // Cache configuration
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private static readonly REAL_TIME_CACHE_TTL = 30 * 1000 // 30 seconds for real-time data
  private static cache = new Map<string, AnalyticsCache>()
  private static listeners = new Map<string, Unsubscribe>()

  /**
   * Calculate comprehensive market analytics for a specific market
   */
  static async calculateMarketAnalytics(marketId: string, useCache = true): Promise<MarketAnalytics> {
    const cacheKey = `market_analytics_${marketId}`
    
    // Check cache first
    if (useCache) {
      const cached = this.getCachedData<MarketAnalytics>(cacheKey)
      if (cached) return cached
    }

    try {
      // Query all commitments for this market (simplified to avoid index requirement)
      const commitmentsQuery = query(
        collection(db, this.COLLECTIONS.predictionCommitments),
        where('predictionId', '==', marketId)
      )

      const commitmentsSnap = await getDocs(commitmentsQuery)
      const commitments = commitmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[]

      const analytics = this.processCommitmentData(marketId, commitments)
      
      // Cache the result
      this.setCachedData(cacheKey, analytics, this.CACHE_TTL)
      
      // Store in Firestore for persistence
      await this.storeMarketAnalytics(analytics)
      
      return analytics
    } catch (error) {
      console.error(`Error calculating market analytics for ${marketId}:`, error)
      throw new Error(`Failed to calculate market analytics: ${error}`)
    }
  }

  /**
   * Get market analytics with real-time updates
   */
  static subscribeToMarketAnalytics(
    marketId: string,
    callback: (analytics: MarketAnalytics) => void
  ): Unsubscribe {
    const listenerKey = `market_${marketId}`
    
    // Clean up existing listener
    if (this.listeners.has(listenerKey)) {
      this.listeners.get(listenerKey)?.()
    }

    const commitmentsQuery = query(
      collection(db, this.COLLECTIONS.predictionCommitments),
      where('predictionId', '==', marketId)
    )

    const unsubscribe = onSnapshot(commitmentsQuery, (snapshot) => {
      try {
        const commitments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PredictionCommitment[]

        const analytics = this.processCommitmentData(marketId, commitments)
        
        // Cache with shorter TTL for real-time data
        const cacheKey = `market_analytics_${marketId}`
        this.setCachedData(cacheKey, analytics, this.REAL_TIME_CACHE_TTL)
        
        callback(analytics)
      } catch (error) {
        console.error(`Error in real-time market analytics for ${marketId}:`, error)
      }
    })

    this.listeners.set(listenerKey, unsubscribe)
    return unsubscribe
  }

  /**
   * Calculate position distribution for efficient yes/no breakdown
   */
  static calculatePositionDistribution(commitments: PredictionCommitment[]): {
    yesTokens: number
    noTokens: number
    yesPercentage: number
    noPercentage: number
    yesCount: number
    noCount: number
  } {
    const yesCommitments = commitments.filter(c => c.position === 'yes')
    const noCommitments = commitments.filter(c => c.position === 'no')
    
    const yesTokens = yesCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
    const noTokens = noCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
    const totalTokens = yesTokens + noTokens
    
    return {
      yesTokens,
      noTokens,
      yesPercentage: totalTokens > 0 ? (yesTokens / totalTokens) * 100 : 0,
      noPercentage: totalTokens > 0 ? (noTokens / totalTokens) * 100 : 0,
      yesCount: yesCommitments.length,
      noCount: noCommitments.length
    }
  }

  /**
   * Get global commitment analytics across all markets
   */
  static async calculateGlobalAnalytics(useCache = true): Promise<GlobalCommitmentAnalytics> {
    const cacheKey = 'global_analytics'
    
    // Check cache first
    if (useCache) {
      const cached = this.getCachedData<GlobalCommitmentAnalytics>(cacheKey)
      if (cached) return cached
    }

    try {
      // Get all commitments
      const commitmentsQuery = query(
        collection(db, this.COLLECTIONS.predictionCommitments),
        orderBy('committedAt', 'desc')
      )

      const commitmentsSnap = await getDocs(commitmentsQuery)
      const commitments = commitmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[]

      // Calculate global statistics
      const uniqueMarkets = new Set(commitments.map(c => c.predictionId))
      const uniqueUsers = new Set(commitments.map(c => c.userId))
      const totalTokens = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      const activeCommitments = commitments.filter(c => c.status === 'active').length
      const resolvedCommitments = commitments.filter(c => 
        c.status === 'won' || c.status === 'lost' || c.status === 'refunded'
      ).length

      const analytics: GlobalCommitmentAnalytics = {
        totalMarketsWithCommitments: uniqueMarkets.size,
        totalTokensCommitted: totalTokens,
        activeCommitments,
        resolvedCommitments,
        averageCommitmentSize: commitments.length > 0 ? totalTokens / commitments.length : 0,
        totalParticipants: uniqueUsers.size,
        lastUpdated: Timestamp.now()
      }

      // Cache the result
      this.setCachedData(cacheKey, analytics, this.CACHE_TTL)
      
      // Store in Firestore for persistence
      await this.storeGlobalAnalytics(analytics)
      
      return analytics
    } catch (error) {
      console.error('Error calculating global analytics:', error)
      throw new Error(`Failed to calculate global analytics: ${error}`)
    }
  }

  /**
   * Get market commitments with user information for admin display
   */
  static async getMarketCommitmentsWithUsers(
    marketId: string,
    limitCount = 50
  ): Promise<CommitmentWithUser[]> {
    try {
      // Get commitments for the market
      const commitmentsQuery = query(
        collection(db, this.COLLECTIONS.predictionCommitments),
        where('predictionId', '==', marketId),
        orderBy('committedAt', 'desc'),
        limit(limitCount)
      )

      const commitmentsSnap = await getDocs(commitmentsQuery)
      const commitments = commitmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (PredictionCommitment & { id: string })[]

      // Get unique user IDs
      const userIds = [...new Set(commitments.map(c => c.userId))]
      
      // Batch fetch user information
      const userPromises = userIds.map(async (userId) => {
        try {
          const userDoc = await getDoc(doc(db, this.COLLECTIONS.users, userId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            return {
              userId,
              email: userData.email,
              displayName: userData.displayName
            }
          }
          return { userId, email: 'Unknown', displayName: 'Unknown User' }
        } catch (error) {
          console.warn(`Failed to fetch user ${userId}:`, error)
          return { userId, email: 'Unknown', displayName: 'Unknown User' }
        }
      })

      const users = await Promise.all(userPromises)
      const userMap = new Map(users.map(u => [u.userId, u]))

      // Combine commitment and user data
      const commitmentsWithUsers: CommitmentWithUser[] = commitments.map(commitment => {
        const user = userMap.get(commitment.userId)
        return {
          id: commitment.id,
          userId: commitment.userId,
          userEmail: user?.email,
          userDisplayName: user?.displayName,
          tokensCommitted: commitment.tokensCommitted,
          position: commitment.position,
          odds: commitment.odds,
          potentialWinning: commitment.potentialWinning,
          status: commitment.status,
          committedAt: commitment.committedAt
        }
      })

      return commitmentsWithUsers
    } catch (error) {
      console.error(`Error getting market commitments with users for ${marketId}:`, error)
      throw new Error(`Failed to get market commitments: ${error}`)
    }
  }

  /**
   * Subscribe to real-time commitment changes for a market
   */
  static subscribeToMarketCommitments(
    marketId: string,
    callback: (commitments: CommitmentWithUser[]) => void
  ): Unsubscribe {
    const listenerKey = `commitments_${marketId}`
    
    // Clean up existing listener
    if (this.listeners.has(listenerKey)) {
      this.listeners.get(listenerKey)?.()
    }

    const commitmentsQuery = query(
      collection(db, this.COLLECTIONS.predictionCommitments),
      where('predictionId', '==', marketId),
      orderBy('committedAt', 'desc'),
      limit(50)
    )

    const unsubscribe = onSnapshot(commitmentsQuery, async (snapshot) => {
      try {
        const commitments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as (PredictionCommitment & { id: string })[]

        // Get user information for new commitments
        const commitmentsWithUsers = await this.enrichCommitmentsWithUserData(commitments)
        callback(commitmentsWithUsers)
      } catch (error) {
        console.error(`Error in real-time commitments for ${marketId}:`, error)
      }
    })

    this.listeners.set(listenerKey, unsubscribe)
    return unsubscribe
  }

  /**
   * Process commitment data to generate analytics
   */
  private static processCommitmentData(marketId: string, commitments: PredictionCommitment[]): MarketAnalytics {
    if (commitments.length === 0) {
      return {
        marketId,
        totalTokensCommitted: 0,
        participantCount: 0,
        yesTokens: 0,
        noTokens: 0,
        yesPercentage: 0,
        noPercentage: 0,
        averageCommitment: 0,
        largestCommitment: 0,
        smallestCommitment: 0,
        commitmentCount: 0,
        lastUpdated: Timestamp.now()
      }
    }

    const uniqueParticipants = new Set(commitments.map(c => c.userId))
    const totalTokens = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
    const distribution = this.calculatePositionDistribution(commitments)
    const commitmentAmounts = commitments.map(c => c.tokensCommitted)

    return {
      marketId,
      totalTokensCommitted: totalTokens,
      participantCount: uniqueParticipants.size,
      yesTokens: distribution.yesTokens,
      noTokens: distribution.noTokens,
      yesPercentage: distribution.yesPercentage,
      noPercentage: distribution.noPercentage,
      averageCommitment: totalTokens / commitments.length,
      largestCommitment: Math.max(...commitmentAmounts),
      smallestCommitment: Math.min(...commitmentAmounts),
      commitmentCount: commitments.length,
      lastUpdated: Timestamp.now()
    }
  }

  /**
   * Enrich commitments with user data
   */
  private static async enrichCommitmentsWithUserData(
    commitments: (PredictionCommitment & { id: string })[]
  ): Promise<CommitmentWithUser[]> {
    const userIds = [...new Set(commitments.map(c => c.userId))]
    
    const userPromises = userIds.map(async (userId) => {
      try {
        const userDoc = await getDoc(doc(db, this.COLLECTIONS.users, userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          return {
            userId,
            email: userData.email,
            displayName: userData.displayName
          }
        }
        return { userId, email: 'Unknown', displayName: 'Unknown User' }
      } catch (error) {
        return { userId, email: 'Unknown', displayName: 'Unknown User' }
      }
    })

    const users = await Promise.all(userPromises)
    const userMap = new Map(users.map(u => [u.userId, u]))

    return commitments.map(commitment => {
      const user = userMap.get(commitment.userId)
      return {
        id: commitment.id,
        userId: commitment.userId,
        userEmail: user?.email,
        userDisplayName: user?.displayName,
        tokensCommitted: commitment.tokensCommitted,
        position: commitment.position,
        odds: commitment.odds,
        potentialWinning: commitment.potentialWinning,
        status: commitment.status,
        committedAt: commitment.committedAt
      }
    })
  }

  /**
   * Store market analytics in Firestore for persistence
   */
  private static async storeMarketAnalytics(analytics: MarketAnalytics): Promise<void> {
    try {
      const analyticsRef = doc(db, this.COLLECTIONS.marketAnalytics, analytics.marketId)
      await setDoc(analyticsRef, analytics, { merge: true })
    } catch (error) {
      console.warn('Failed to store market analytics:', error)
    }
  }

  /**
   * Store global analytics in Firestore for persistence
   */
  private static async storeGlobalAnalytics(analytics: GlobalCommitmentAnalytics): Promise<void> {
    try {
      const analyticsRef = doc(db, this.COLLECTIONS.globalAnalytics, 'global')
      await setDoc(analyticsRef, analytics, { merge: true })
    } catch (error) {
      console.warn('Failed to store global analytics:', error)
    }
  }

  /**
   * Cache management utilities
   */
  private static getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T
    }
    this.cache.delete(key)
    return null
  }

  private static setCachedData<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Clean up all listeners and cache
   */
  static cleanup(): void {
    // Unsubscribe from all listeners
    this.listeners.forEach(unsubscribe => unsubscribe())
    this.listeners.clear()
    
    // Clear cache
    this.cache.clear()
  }

  /**
   * Clear cache for specific market or all cache
   */
  static clearCache(marketId?: string): void {
    if (marketId) {
      this.cache.delete(`market_analytics_${marketId}`)
    } else {
      this.cache.clear()
    }
  }
}