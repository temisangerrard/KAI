/**
 * Trending Service for KAI platform
 * Handles trending market identification and analysis
 */

import { Market } from "@/app/auth/auth-context"

// Interface for trending market with additional metadata
export interface TrendingMarket extends Market {
  trendingScore: number
  trendingReason: string
  popularityIndicator: 'hot' | 'rising' | 'viral' | 'featured'
  growthRate: number
  engagementScore: number
}

// Interface for trending analysis parameters
interface TrendingAnalysisParams {
  timeWindow?: number // Hours to look back for trend analysis
  minParticipants?: number // Minimum participants to be considered trending
  weightParticipants?: number // Weight for participant count in scoring
  weightTokens?: number // Weight for token volume in scoring
  weightRecency?: number // Weight for market recency in scoring
  weightEngagement?: number // Weight for engagement metrics in scoring
}

/**
 * Default parameters for trending analysis
 */
const DEFAULT_TRENDING_PARAMS: Required<TrendingAnalysisParams> = {
  timeWindow: 24, // 24 hours
  minParticipants: 10,
  weightParticipants: 0.3,
  weightTokens: 0.4,
  weightRecency: 0.2,
  weightEngagement: 0.1
}

/**
 * Calculate trending score for a market
 * @param market Market to analyze
 * @param params Analysis parameters
 * @returns Trending score (0-100)
 */
export const calculateTrendingScore = (
  market: Market, 
  params: TrendingAnalysisParams = {}
): number => {
  const config = { ...DEFAULT_TRENDING_PARAMS, ...params }
  
  // Skip inactive markets
  if (market.status !== 'active') {
    return 0
  }
  
  // Skip markets with too few participants
  if (market.participants < config.minParticipants) {
    return 0
  }
  
  // Calculate individual scores (0-100 scale)
  const participantScore = Math.min((market.participants / 500) * 100, 100)
  const tokenScore = Math.min((market.totalTokens / 50000) * 100, 100)
  
  // Calculate recency score (newer markets get higher scores)
  const now = new Date()
  const marketAge = (now.getTime() - new Date(market.startDate).getTime()) / (1000 * 60 * 60) // hours
  const recencyScore = Math.max(100 - (marketAge / config.timeWindow) * 100, 0)
  
  // Calculate engagement score based on comments and social metrics
  // For now, we'll use a simple formula based on participants vs tokens ratio
  const engagementRatio = market.participants > 0 ? market.totalTokens / market.participants : 0
  const engagementScore = Math.min((engagementRatio / 100) * 100, 100)
  
  // Calculate weighted trending score
  const trendingScore = 
    (participantScore * config.weightParticipants) +
    (tokenScore * config.weightTokens) +
    (recencyScore * config.weightRecency) +
    (engagementScore * config.weightEngagement)
  
  return Math.round(trendingScore)
}

/**
 * Calculate growth rate for a market
 * @param market Market to analyze
 * @returns Growth rate percentage
 */
export const calculateGrowthRate = (market: Market): number => {
  // In a real implementation, this would compare current metrics with historical data
  // For now, we'll simulate growth rate based on market characteristics
  
  const now = new Date()
  const marketAge = (now.getTime() - new Date(market.startDate).getTime()) / (1000 * 60 * 60 * 24) // days
  
  // Newer markets tend to have higher growth rates
  if (marketAge < 1) {
    return Math.random() * 200 + 50 // 50-250% for very new markets
  } else if (marketAge < 7) {
    return Math.random() * 100 + 20 // 20-120% for recent markets
  } else {
    return Math.random() * 50 + 5 // 5-55% for older markets
  }
}

/**
 * Determine popularity indicator for a market
 * @param market Market to analyze
 * @param trendingScore Calculated trending score
 * @param growthRate Calculated growth rate
 * @returns Popularity indicator
 */
export const determinePopularityIndicator = (
  market: Market,
  trendingScore: number,
  growthRate: number
): 'hot' | 'rising' | 'viral' | 'featured' => {
  // Viral: Very high trending score and high growth rate
  if (trendingScore >= 80 && growthRate >= 100) {
    return 'viral'
  }
  
  // Hot: High trending score
  if (trendingScore >= 70) {
    return 'hot'
  }
  
  // Rising: Good growth rate even with moderate trending score
  if (growthRate >= 50 && trendingScore >= 40) {
    return 'rising'
  }
  
  // Featured: Moderate trending score, good for featuring
  if (trendingScore >= 50) {
    return 'featured'
  }
  
  // Default to featured for markets that meet minimum criteria
  return 'featured'
}

/**
 * Generate trending reason for a market
 * @param market Market to analyze
 * @param trendingScore Trending score
 * @param growthRate Growth rate
 * @param popularityIndicator Popularity indicator
 * @returns Human-readable trending reason
 */
export const generateTrendingReason = (
  market: Market,
  trendingScore: number,
  growthRate: number,
  popularityIndicator: 'hot' | 'rising' | 'viral' | 'featured'
): string => {
  const reasons = []
  
  // Add reason based on popularity indicator
  switch (popularityIndicator) {
    case 'viral':
      reasons.push('Going viral')
      break
    case 'hot':
      reasons.push('Trending hot')
      break
    case 'rising':
      reasons.push('Rising fast')
      break
    case 'featured':
      reasons.push('Popular choice')
      break
  }
  
  // Add specific reasons based on metrics
  if (market.participants >= 300) {
    reasons.push(`${market.participants}+ participants`)
  } else if (market.participants >= 100) {
    reasons.push('High participation')
  }
  
  if (market.totalTokens >= 20000) {
    reasons.push('High token volume')
  }
  
  if (growthRate >= 100) {
    reasons.push(`${Math.round(growthRate)}% growth`)
  }
  
  // Calculate days remaining
  const now = new Date()
  const daysRemaining = Math.ceil((new Date(market.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysRemaining <= 3 && daysRemaining > 0) {
    reasons.push('Ending soon')
  }
  
  // Return the most relevant reasons (max 2)
  return reasons.slice(0, 2).join(' • ')
}

/**
 * Get trending markets with full analysis
 * @param markets Array of markets to analyze
 * @param limit Maximum number of trending markets to return
 * @param params Analysis parameters
 * @returns Array of trending markets with metadata
 */
export const getTrendingMarkets = (
  markets: Market[],
  limit: number = 10,
  params: TrendingAnalysisParams = {}
): TrendingMarket[] => {
  // Calculate trending data for all markets
  const trendingMarkets: TrendingMarket[] = markets
    .map(market => {
      const trendingScore = calculateTrendingScore(market, params)
      const growthRate = calculateGrowthRate(market)
      const popularityIndicator = determinePopularityIndicator(market, trendingScore, growthRate)
      const trendingReason = generateTrendingReason(market, trendingScore, growthRate, popularityIndicator)
      
      return {
        ...market,
        trendingScore,
        trendingReason,
        popularityIndicator,
        growthRate,
        engagementScore: Math.min((market.totalTokens / Math.max(market.participants, 1)) / 10, 100)
      }
    })
    .filter(market => market.trendingScore > 0) // Only include markets with positive trending scores
    .sort((a, b) => b.trendingScore - a.trendingScore) // Sort by trending score
    .slice(0, limit)
  
  return trendingMarkets
}

/**
 * Get featured markets for homepage
 * @param markets Array of markets to analyze
 * @param limit Maximum number of featured markets to return
 * @returns Array of featured markets
 */
export const getFeaturedMarkets = (
  markets: Market[],
  limit: number = 6
): TrendingMarket[] => {
  // Get trending markets with slightly different parameters for featuring
  const featuredParams: TrendingAnalysisParams = {
    minParticipants: 5, // Lower threshold for featured markets
    weightParticipants: 0.25,
    weightTokens: 0.35,
    weightRecency: 0.25,
    weightEngagement: 0.15
  }
  
  const trendingMarkets = getTrendingMarkets(markets, limit * 2, featuredParams)
  
  // Ensure diversity in categories for featured markets
  const featuredMarkets: TrendingMarket[] = []
  const usedCategories = new Set<string>()
  
  // First pass: Add one market from each category
  for (const market of trendingMarkets) {
    if (!usedCategories.has(market.category) && featuredMarkets.length < limit) {
      featuredMarkets.push(market)
      usedCategories.add(market.category)
    }
  }
  
  // Second pass: Fill remaining slots with highest scoring markets
  for (const market of trendingMarkets) {
    if (featuredMarkets.length >= limit) break
    if (!featuredMarkets.find(fm => fm.id === market.id)) {
      featuredMarkets.push(market)
    }
  }
  
  return featuredMarkets
}

/**
 * Get trending categories based on market activity
 * @param markets Array of markets to analyze
 * @param limit Maximum number of categories to return
 * @returns Array of trending categories with metadata
 */
export interface TrendingCategory {
  category: string
  marketCount: number
  totalParticipants: number
  totalTokens: number
  averageTrendingScore: number
  growthRate: number
}

export const getTrendingCategories = (
  markets: Market[],
  limit: number = 5
): TrendingCategory[] => {
  // Group markets by category
  const categoryGroups = markets.reduce((groups, market) => {
    if (!groups[market.category]) {
      groups[market.category] = []
    }
    groups[market.category].push(market)
    return groups
  }, {} as Record<string, Market[]>)
  
  // Calculate trending data for each category
  const trendingCategories: TrendingCategory[] = Object.entries(categoryGroups)
    .map(([category, categoryMarkets]) => {
      const totalParticipants = categoryMarkets.reduce((sum, market) => sum + market.participants, 0)
      const totalTokens = categoryMarkets.reduce((sum, market) => sum + market.totalTokens, 0)
      const trendingScores = categoryMarkets.map(market => calculateTrendingScore(market))
      const averageTrendingScore = trendingScores.reduce((sum, score) => sum + score, 0) / trendingScores.length
      
      // Calculate category growth rate (simplified)
      const growthRate = Math.min((totalParticipants / categoryMarkets.length) * 2, 200)
      
      return {
        category,
        marketCount: categoryMarkets.length,
        totalParticipants,
        totalTokens,
        averageTrendingScore: Math.round(averageTrendingScore),
        growthRate: Math.round(growthRate)
      }
    })
    .sort((a, b) => b.averageTrendingScore - a.averageTrendingScore)
    .slice(0, limit)
  
  return trendingCategories
}