/**
 * User Profile Data Service
 * Fetches real user predictions and markets from Firestore
 */

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { Market, Prediction, MarketOption } from '@/lib/types/database'
import { PredictionCommitment } from '@/lib/types/token'
import { PredictionCommitmentService } from '@/lib/services/token-database'

export interface UserPredictionData {
  id: string
  marketId: string
  marketTitle: string
  optionId: string
  optionName: string
  tokensAllocated: number
  potentialWin: number
  predictionDate: Date
  status: 'active' | 'won' | 'lost' | 'refunded'
}

export interface UserMarketData {
  id: string
  title: string
  description: string
  category: string
  status: 'active' | 'resolved' | 'cancelled'
  startDate: Date
  participants: number
  totalTokens: number
}

export interface UserProfileData {
  predictions: UserPredictionData[]
  marketsCreated: UserMarketData[]
  predictionsCount: number
  marketsCreatedCount: number
  winRate: number
  tokensEarned: number
}

export class UserProfileDataService {
  /**
   * Get comprehensive user profile data including real predictions and markets
   */
  static async getUserProfileData(userId: string): Promise<UserProfileData> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    try {
      console.log('[USER_PROFILE_DATA] Fetching profile data for user:', userId)

      // Fetch user predictions with error handling
      let predictions: UserPredictionData[] = []
      try {
        predictions = await this.getUserPredictions(userId)
        console.log('[USER_PROFILE_DATA] Found predictions:', predictions.length)
      } catch (predError) {
        console.error('[USER_PROFILE_DATA] Error fetching predictions:', predError)
        // Continue with empty predictions array
      }

      // Fetch markets created by user with error handling
      let marketsCreated: UserMarketData[] = []
      try {
        marketsCreated = await this.getUserCreatedMarkets(userId)
        console.log('[USER_PROFILE_DATA] Found created markets:', marketsCreated.length)
      } catch (marketError) {
        console.error('[USER_PROFILE_DATA] Error fetching markets:', marketError)
        // Continue with empty markets array
      }

      // Calculate statistics
      const stats = this.calculateUserStats(predictions)

      return {
        predictions,
        marketsCreated,
        predictionsCount: predictions.length,
        marketsCreatedCount: marketsCreated.length,
        winRate: stats.winRate,
        tokensEarned: stats.tokensEarned
      }
    } catch (error) {
      console.error('[USER_PROFILE_DATA] Error fetching user profile data:', error)
      // Return empty data instead of throwing
      return {
        predictions: [],
        marketsCreated: [],
        predictionsCount: 0,
        marketsCreatedCount: 0,
        winRate: 0,
        tokensEarned: 0
      }
    }
  }

  /**
   * Get user's predictions with market details (now using real commitments)
   */
  static async getUserPredictions(userId: string): Promise<UserPredictionData[]> {
    try {
      console.log('[USER_PROFILE_DATA] Fetching commitments for userId:', userId)
      
      // Use the PredictionCommitmentService to get real user commitments
      const commitments = await PredictionCommitmentService.getUserCommitments(userId)
      console.log('[USER_PROFILE_DATA] Raw commitments count:', commitments.length)
      
      if (commitments.length === 0) {
        console.log('[USER_PROFILE_DATA] No commitments found for user')
        return []
      }

      // Transform commitments to prediction data format
      const predictionData: UserPredictionData[] = commitments.map(commitment => ({
        id: commitment.id,
        marketId: commitment.predictionId,
        marketTitle: commitment.metadata?.marketTitle || `Market ${commitment.predictionId}`,
        optionId: commitment.position, // Using position as optionId
        optionName: commitment.position === 'yes' ? 'Yes' : 'No',
        tokensAllocated: commitment.tokensCommitted,
        potentialWin: commitment.potentialWinning,
        predictionDate: commitment.committedAt?.toDate?.() || new Date(),
        status: commitment.status
      }))

      console.log('[USER_PROFILE_DATA] Processed commitments as predictions:', predictionData.length)
      return predictionData
    } catch (error) {
      console.error('[USER_PROFILE_DATA] Error fetching user commitments:', error)
      return []
    }
  }

  /**
   * Get markets created by user
   */
  static async getUserCreatedMarkets(userId: string): Promise<UserMarketData[]> {
    try {
      console.log('[USER_PROFILE_DATA] Fetching markets for userId:', userId)
      
      const marketsQuery = query(
        collection(db, 'markets'),
        where('createdBy', '==', userId),
        limit(10) // Reduced limit for testing
      )

      const marketsSnap = await getDocs(marketsQuery)
      console.log('[USER_PROFILE_DATA] Raw markets count:', marketsSnap.docs.length)
      
      if (marketsSnap.docs.length === 0) {
        console.log('[USER_PROFILE_DATA] No markets found for user')
        return []
      }

      const markets = marketsSnap.docs.map(doc => {
        const data = doc.data()
        console.log('[USER_PROFILE_DATA] Raw market data:', { id: doc.id, ...data })
        return {
          id: doc.id,
          ...data
        }
      }) as Market[]

      // Sort on client side to avoid index requirement
      markets.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0)
        const bTime = b.createdAt?.toDate?.() || new Date(0)
        return bTime.getTime() - aTime.getTime()
      })

      const marketData = markets.map(market => ({
        id: market.id,
        title: market.title || 'Untitled Market',
        description: market.description || 'No description',
        category: market.category || 'other',
        status: (market.status as 'active' | 'resolved' | 'cancelled') || 'active',
        startDate: market.createdAt?.toDate?.() || new Date(),
        participants: market.totalParticipants || 0,
        totalTokens: market.totalTokensStaked || 0
      }))

      console.log('[USER_PROFILE_DATA] Processed markets:', marketData.length)
      return marketData
    } catch (error) {
      console.error('[USER_PROFILE_DATA] Error fetching user created markets:', error)
      return []
    }
  }

  /**
   * Calculate potential win for a prediction
   */
  private static calculatePotentialWin(
    tokensStaked: number, 
    option: MarketOption, 
    market: Market
  ): number {
    // Simple calculation: if option wins, user gets their stake back plus proportional share
    // This is a simplified version - real calculation would be more complex
    const totalStaked = market.totalTokensStaked
    const optionStaked = option.totalTokens
    
    if (optionStaked === 0) return tokensStaked * 2 // Default 2x if no other stakes
    
    const odds = totalStaked / optionStaked
    return Math.round(tokensStaked * Math.max(1.1, odds)) // Minimum 10% return
  }

  /**
   * Calculate user statistics from predictions
   */
  private static calculateUserStats(predictions: UserPredictionData[]) {
    const resolvedPredictions = predictions.filter(p => p.status === 'won' || p.status === 'lost')
    const wonPredictions = predictions.filter(p => p.status === 'won')
    
    const winRate = resolvedPredictions.length > 0 
      ? Math.round((wonPredictions.length / resolvedPredictions.length) * 100)
      : 0

    const tokensEarned = wonPredictions.reduce((total, prediction) => {
      return total + (prediction.potentialWin - prediction.tokensAllocated)
    }, 0)

    return {
      winRate,
      tokensEarned: Math.max(0, tokensEarned) // Don't show negative earnings
    }
  }

  /**
   * Get recent activity combining predictions and market creation
   */
  static async getRecentActivity(userId: string, limit: number = 20) {
    try {
      const profileData = await this.getUserProfileData(userId)
      const activities = []

      // Add prediction activities
      profileData.predictions.forEach(prediction => {
        activities.push({
          id: `pred_${prediction.id}`,
          type: prediction.status === 'won' ? 'win' : 'prediction',
          title: prediction.status === 'won'
            ? `Won prediction on "${prediction.marketTitle}"`
            : `Backed opinion on "${prediction.marketTitle}"`,
          date: prediction.predictionDate,
          tokens: prediction.status === 'won' ? prediction.potentialWin : prediction.tokensAllocated,
          isWin: prediction.status === 'won'
        })
      })

      // Add market creation activities
      profileData.marketsCreated.forEach(market => {
        activities.push({
          id: `market_${market.id}`,
          type: 'market',
          title: `Created market "${market.title}"`,
          date: market.startDate,
          tokens: 0
        })
      })

      // Sort by date (most recent first) and limit
      return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit)
    } catch (error) {
      console.error('[USER_PROFILE_DATA] Error fetching recent activity:', error)
      return []
    }
  }
}