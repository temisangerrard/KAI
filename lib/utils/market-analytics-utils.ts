import { Timestamp } from 'firebase/firestore'
import { PredictionCommitment } from '@/lib/types/token'

/**
 * Utility functions for market analytics calculations and optimizations
 */

/**
 * Calculate odds based on token distribution
 */
export function calculateOdds(yesTokens: number, noTokens: number): {
  yesOdds: number
  noOdds: number
  impliedYesProbability: number
  impliedNoProbability: number
} {
  const totalTokens = yesTokens + noTokens
  
  if (totalTokens === 0) {
    return {
      yesOdds: 2.0,
      noOdds: 2.0,
      impliedYesProbability: 0.5,
      impliedNoProbability: 0.5
    }
  }

  const yesPercentage = yesTokens / totalTokens
  const noPercentage = noTokens / totalTokens
  
  // Calculate decimal odds (1 / probability)
  const yesOdds = yesPercentage > 0 ? 1 / yesPercentage : 999
  const noOdds = noPercentage > 0 ? 1 / noPercentage : 999

  return {
    yesOdds: Math.max(1.01, Math.min(yesOdds, 999)), // Cap between 1.01 and 999
    noOdds: Math.max(1.01, Math.min(noOdds, 999)),
    impliedYesProbability: yesPercentage,
    impliedNoProbability: noPercentage
  }
}

/**
 * Calculate potential winnings for a commitment
 */
export function calculatePotentialWinnings(
  tokensCommitted: number,
  position: 'yes' | 'no',
  yesTokens: number,
  noTokens: number
): number {
  const totalTokens = yesTokens + noTokens
  
  if (totalTokens === 0) {
    return tokensCommitted * 2 // Default 2x multiplier
  }

  const winningPool = position === 'yes' ? yesTokens : noTokens
  const losingPool = position === 'yes' ? noTokens : yesTokens
  
  if (winningPool === 0) {
    return tokensCommitted + losingPool // Get all losing tokens
  }

  // Calculate proportional share of losing pool
  const shareOfWinningPool = tokensCommitted / winningPool
  const winningsFromLosingPool = losingPool * shareOfWinningPool
  
  return tokensCommitted + winningsFromLosingPool
}

/**
 * Batch process commitments for efficient analytics calculation
 */
export function batchProcessCommitments(
  commitments: PredictionCommitment[],
  batchSize = 100
): {
  totalBatches: number
  processBatch: (batchIndex: number) => PredictionCommitment[]
} {
  const totalBatches = Math.ceil(commitments.length / batchSize)
  
  const processBatch = (batchIndex: number): PredictionCommitment[] => {
    const startIndex = batchIndex * batchSize
    const endIndex = Math.min(startIndex + batchSize, commitments.length)
    return commitments.slice(startIndex, endIndex)
  }

  return {
    totalBatches,
    processBatch
  }
}

/**
 * Calculate commitment trends over time
 */
export function calculateCommitmentTrends(
  commitments: PredictionCommitment[],
  timeWindow: 'hour' | 'day' | 'week' = 'day'
): {
  timestamp: number
  yesTokens: number
  noTokens: number
  commitmentCount: number
}[] {
  // Sort commitments by time
  const sortedCommitments = [...commitments].sort((a, b) => 
    a.committedAt.toMillis() - b.committedAt.toMillis()
  )

  // Determine time bucket size
  const bucketSize = timeWindow === 'hour' ? 3600000 : 
                    timeWindow === 'day' ? 86400000 : 
                    604800000 // week

  const buckets = new Map<number, {
    yesTokens: number
    noTokens: number
    commitmentCount: number
  }>()

  sortedCommitments.forEach(commitment => {
    const timestamp = commitment.committedAt.toMillis()
    const bucketKey = Math.floor(timestamp / bucketSize) * bucketSize

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        yesTokens: 0,
        noTokens: 0,
        commitmentCount: 0
      })
    }

    const bucket = buckets.get(bucketKey)!
    bucket.commitmentCount++
    
    if (commitment.position === 'yes') {
      bucket.yesTokens += commitment.tokensCommitted
    } else {
      bucket.noTokens += commitment.tokensCommitted
    }
  })

  return Array.from(buckets.entries())
    .map(([timestamp, data]) => ({
      timestamp,
      ...data
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Calculate market momentum based on recent activity
 */
export function calculateMarketMomentum(
  commitments: PredictionCommitment[],
  timeWindowHours = 24
): {
  momentum: 'bullish' | 'bearish' | 'neutral'
  recentYesPercentage: number
  recentNoPercentage: number
  recentCommitmentCount: number
  momentumScore: number // -1 to 1, where 1 is strongly bullish
} {
  const cutoffTime = Timestamp.fromMillis(
    Date.now() - (timeWindowHours * 60 * 60 * 1000)
  )

  const recentCommitments = commitments.filter(
    c => c.committedAt.toMillis() > cutoffTime.toMillis()
  )

  if (recentCommitments.length === 0) {
    return {
      momentum: 'neutral',
      recentYesPercentage: 0,
      recentNoPercentage: 0,
      recentCommitmentCount: 0,
      momentumScore: 0
    }
  }

  const recentYesTokens = recentCommitments
    .filter(c => c.position === 'yes')
    .reduce((sum, c) => sum + c.tokensCommitted, 0)
  
  const recentNoTokens = recentCommitments
    .filter(c => c.position === 'no')
    .reduce((sum, c) => sum + c.tokensCommitted, 0)

  const totalRecentTokens = recentYesTokens + recentNoTokens
  const recentYesPercentage = totalRecentTokens > 0 ? (recentYesTokens / totalRecentTokens) * 100 : 0
  const recentNoPercentage = totalRecentTokens > 0 ? (recentNoTokens / totalRecentTokens) * 100 : 0

  // Calculate momentum score (-1 to 1)
  const momentumScore = totalRecentTokens > 0 ? 
    (recentYesTokens - recentNoTokens) / totalRecentTokens : 0

  let momentum: 'bullish' | 'bearish' | 'neutral'
  if (momentumScore > 0.1) {
    momentum = 'bullish'
  } else if (momentumScore < -0.1) {
    momentum = 'bearish'
  } else {
    momentum = 'neutral'
  }

  return {
    momentum,
    recentYesPercentage,
    recentNoPercentage,
    recentCommitmentCount: recentCommitments.length,
    momentumScore
  }
}

/**
 * Validate commitment data for analytics processing
 */
export function validateCommitmentData(commitment: PredictionCommitment): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!commitment.id || commitment.id.trim() === '') {
    errors.push('Commitment ID is required')
  }

  if (!commitment.userId || commitment.userId.trim() === '') {
    errors.push('User ID is required')
  }

  if (!commitment.predictionId || commitment.predictionId.trim() === '') {
    errors.push('Prediction ID is required')
  }

  if (commitment.tokensCommitted <= 0) {
    errors.push('Tokens committed must be positive')
  }

  if (!['yes', 'no'].includes(commitment.position)) {
    errors.push('Position must be either "yes" or "no"')
  }

  if (!['active', 'won', 'lost', 'refunded'].includes(commitment.status)) {
    errors.push('Invalid commitment status')
  }

  if (!commitment.committedAt) {
    errors.push('Committed timestamp is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Format analytics data for display
 */
export function formatAnalyticsForDisplay(analytics: {
  totalTokensCommitted: number
  participantCount: number
  yesPercentage: number
  noPercentage: number
  averageCommitment: number
  largestCommitment: number
  smallestCommitment: number
}): {
  formattedTotalTokens: string
  formattedAverageCommitment: string
  formattedLargestCommitment: string
  formattedSmallestCommitment: string
  yesPercentageDisplay: string
  noPercentageDisplay: string
} {
  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`
    }
    return tokens.toLocaleString()
  }

  return {
    formattedTotalTokens: formatTokens(analytics.totalTokensCommitted),
    formattedAverageCommitment: formatTokens(Math.round(analytics.averageCommitment)),
    formattedLargestCommitment: formatTokens(analytics.largestCommitment),
    formattedSmallestCommitment: formatTokens(analytics.smallestCommitment),
    yesPercentageDisplay: `${analytics.yesPercentage.toFixed(1)}%`,
    noPercentageDisplay: `${analytics.noPercentage.toFixed(1)}%`
  }
}

/**
 * Create optimized query constraints for large datasets
 */
export function createOptimizedQueryConstraints(filters: {
  marketId?: string
  userId?: string
  status?: string[]
  dateRange?: {
    start: Timestamp
    end: Timestamp
  }
  limit?: number
}): {
  whereConstraints: any[]
  orderConstraints: any[]
  limitConstraint?: any
} {
  const whereConstraints: any[] = []
  const orderConstraints: any[] = []

  // Add where constraints
  if (filters.marketId) {
    whereConstraints.push(['predictionId', '==', filters.marketId])
  }

  if (filters.userId) {
    whereConstraints.push(['userId', '==', filters.userId])
  }

  if (filters.status && filters.status.length > 0) {
    // For multiple status values, we'd need to use 'in' operator
    if (filters.status.length === 1) {
      whereConstraints.push(['status', '==', filters.status[0]])
    } else {
      whereConstraints.push(['status', 'in', filters.status])
    }
  }

  if (filters.dateRange) {
    whereConstraints.push(['committedAt', '>=', filters.dateRange.start])
    whereConstraints.push(['committedAt', '<=', filters.dateRange.end])
  }

  // Add order constraints
  orderConstraints.push(['committedAt', 'desc'])

  return {
    whereConstraints,
    orderConstraints,
    limitConstraint: filters.limit ? ['limit', filters.limit] : undefined
  }
}