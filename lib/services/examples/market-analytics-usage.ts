/**
 * Example usage of MarketAnalyticsService
 * This file demonstrates how to use the market analytics functions
 */

import { MarketAnalyticsService } from '../market-analytics-service'
import { calculateOdds, formatAnalyticsForDisplay } from '../../utils/market-analytics-utils'

/**
 * Example: Get comprehensive market analytics
 */
export async function getMarketAnalyticsExample(marketId: string) {
  try {
    // Get market analytics with caching
    const analytics = await MarketAnalyticsService.calculateMarketAnalytics(marketId, true)
    
    console.log('Market Analytics:', {
      marketId: analytics.marketId,
      totalTokens: analytics.totalTokensCommitted,
      participants: analytics.participantCount,
      yesPercentage: analytics.yesPercentage,
      noPercentage: analytics.noPercentage,
      averageCommitment: analytics.averageCommitment
    })

    // Format for display
    const formatted = formatAnalyticsForDisplay(analytics)
    console.log('Formatted Analytics:', formatted)

    // Calculate current odds
    const odds = calculateOdds(analytics.yesTokens, analytics.noTokens)
    console.log('Current Odds:', odds)

    return { analytics, formatted, odds }
  } catch (error) {
    console.error('Error getting market analytics:', error)
    throw error
  }
}

/**
 * Example: Set up real-time analytics monitoring
 */
export function setupRealTimeAnalytics(marketId: string) {
  console.log(`Setting up real-time analytics for market: ${marketId}`)
  
  const unsubscribe = MarketAnalyticsService.subscribeToMarketAnalytics(
    marketId,
    (analytics) => {
      console.log('Real-time analytics update:', {
        totalTokens: analytics.totalTokensCommitted,
        participants: analytics.participantCount,
        yesPercentage: analytics.yesPercentage.toFixed(1) + '%',
        noPercentage: analytics.noPercentage.toFixed(1) + '%',
        lastUpdated: analytics.lastUpdated
      })
    }
  )

  // Return cleanup function
  return () => {
    console.log('Cleaning up real-time analytics subscription')
    unsubscribe()
  }
}

/**
 * Example: Get market commitments with user information
 */
export async function getMarketCommitmentsExample(marketId: string) {
  try {
    const commitments = await MarketAnalyticsService.getMarketCommitmentsWithUsers(marketId, 20)
    
    console.log(`Found ${commitments.length} commitments for market ${marketId}`)
    
    commitments.forEach((commitment, index) => {
      console.log(`Commitment ${index + 1}:`, {
        user: commitment.userDisplayName || commitment.userEmail,
        tokens: commitment.tokensCommitted,
        position: commitment.position,
        status: commitment.status,
        potentialWinning: commitment.potentialWinning
      })
    })

    return commitments
  } catch (error) {
    console.error('Error getting market commitments:', error)
    throw error
  }
}

/**
 * Example: Monitor real-time commitment changes
 */
export function monitorMarketCommitments(marketId: string) {
  console.log(`Monitoring real-time commitments for market: ${marketId}`)
  
  const unsubscribe = MarketAnalyticsService.subscribeToMarketCommitments(
    marketId,
    (commitments) => {
      console.log(`Commitment update: ${commitments.length} total commitments`)
      
      // Show latest commitment
      if (commitments.length > 0) {
        const latest = commitments[0]
        console.log('Latest commitment:', {
          user: latest.userDisplayName,
          tokens: latest.tokensCommitted,
          position: latest.position,
          timestamp: latest.committedAt
        })
      }
    }
  )

  return unsubscribe
}

/**
 * Example: Get global analytics across all markets
 */
export async function getGlobalAnalyticsExample() {
  try {
    const globalAnalytics = await MarketAnalyticsService.calculateGlobalAnalytics(true)
    
    console.log('Global Analytics:', {
      totalMarkets: globalAnalytics.totalMarketsWithCommitments,
      totalTokens: globalAnalytics.totalTokensCommitted,
      activeCommitments: globalAnalytics.activeCommitments,
      resolvedCommitments: globalAnalytics.resolvedCommitments,
      averageCommitmentSize: globalAnalytics.averageCommitmentSize.toFixed(2),
      totalParticipants: globalAnalytics.totalParticipants
    })

    return globalAnalytics
  } catch (error) {
    console.error('Error getting global analytics:', error)
    throw error
  }
}

/**
 * Example: Cache management
 */
export function cacheManagementExample() {
  // Clear cache for specific market
  MarketAnalyticsService.clearCache('market123')
  console.log('Cleared cache for market123')
  
  // Clear all cache
  MarketAnalyticsService.clearCache()
  console.log('Cleared all analytics cache')
  
  // Cleanup all listeners and cache
  MarketAnalyticsService.cleanup()
  console.log('Cleaned up all analytics resources')
}

/**
 * Example: Complete analytics dashboard data
 */
export async function getAnalyticsDashboardData(marketId: string) {
  try {
    // Get all analytics data needed for a dashboard
    const [analytics, commitments, globalAnalytics] = await Promise.all([
      MarketAnalyticsService.calculateMarketAnalytics(marketId),
      MarketAnalyticsService.getMarketCommitmentsWithUsers(marketId, 10),
      MarketAnalyticsService.calculateGlobalAnalytics()
    ])

    const formatted = formatAnalyticsForDisplay(analytics)
    const odds = calculateOdds(analytics.yesTokens, analytics.noTokens)

    return {
      marketAnalytics: {
        ...analytics,
        formatted,
        odds
      },
      recentCommitments: commitments,
      globalStats: globalAnalytics
    }
  } catch (error) {
    console.error('Error getting dashboard data:', error)
    throw error
  }
}