import { Market, MarketOption } from '@/lib/types'

/**
 * Market utility functions for odds and statistics calculations
 * Designed to work with the Market interface supporting multiple prediction options
 */

export interface MarketOdds {
  [optionId: string]: number
}

export interface MarketStats {
  averageCommitment: number
  mostPopularOption: MarketOption
  competitiveness: number
  totalParticipants: number
  totalTokens: number
  participantDistribution: { [optionId: string]: number }
}

export interface PayoutCalculation {
  grossPayout: number
  netProfit: number
  roi: number
}

/**
 * Calculate odds for all options in a market based on token commitments
 * Returns odds in decimal format (e.g., 2.5 means 2.5:1 odds)
 */
export function calculateOdds(market: Market): MarketOdds {
  const odds: MarketOdds = {}
  
  // Handle edge case: no tokens committed yet
  const totalTokens = market.totalTokensStaked || market.totalTokens || 0
  if (totalTokens === 0 || market.options.length === 0) {
    // Return equal odds for all options
    const defaultOdds = market.options.length > 0 ? market.options.length : 2
    market.options.forEach(option => {
      odds[option.id] = defaultOdds
    })
    return odds
  }

  // Calculate odds based on token distribution
  market.options.forEach(option => {
    const optionTokens = option.totalTokens || option.tokens || 0
    if (optionTokens === 0) {
      // No tokens on this option - very high odds
      odds[option.id] = Math.min(999, totalTokens / 1)
    } else {
      // Standard odds calculation: total pool / option tokens
      const calculatedOdds = totalTokens / optionTokens
      // Ensure minimum odds of 1.01 (slight profit) and maximum of 999
      odds[option.id] = Math.max(1.01, Math.min(calculatedOdds, 999))
    }
  })

  return odds
}

/**
 * Calculate potential payout for a user's commitment
 */
export function calculatePayout(
  tokensToCommit: number, 
  optionId: string, 
  market: Market
): PayoutCalculation {
  if (tokensToCommit <= 0) {
    return { grossPayout: 0, netProfit: 0, roi: 0 }
  }

  const odds = calculateOdds(market)
  const optionOdds = odds[optionId] || 2.0

  // Calculate gross payout (what user gets if they win)
  const grossPayout = Math.floor(tokensToCommit * optionOdds)
  
  // Calculate net profit (gross payout minus original commitment)
  const netProfit = grossPayout - tokensToCommit
  
  // Calculate ROI as percentage
  const roi = tokensToCommit > 0 ? (netProfit / tokensToCommit) * 100 : 0

  return {
    grossPayout,
    netProfit,
    roi
  }
}

/**
 * Calculate real market statistics to replace mock data
 */
export function getRealStats(market: Market): MarketStats {
  // Handle empty market
  if (market.options.length === 0 || market.totalParticipants === 0) {
    return {
      averageCommitment: 0,
      mostPopularOption: market.options[0] || {
        id: 'none',
        text: 'No options',
        totalTokens: 0,
        participantCount: 0
      },
      competitiveness: 0,
      totalParticipants: 0,
      totalTokens: 0,
      participantDistribution: {}
    }
  }

  // Calculate average commitment per participant
  const averageCommitment = market.totalParticipants > 0 
    ? Math.round(market.totalTokensStaked / market.totalParticipants) 
    : 0

  // Find most popular option (by token amount)
  const mostPopularOption = market.options.reduce((prev, current) => 
    prev.totalTokens > current.totalTokens ? prev : current
  )

  // Calculate competitiveness (how evenly distributed the tokens are)
  const competitiveness = calculateCompetitiveness(market)

  // Calculate participant distribution
  const participantDistribution: { [optionId: string]: number } = {}
  market.options.forEach(option => {
    participantDistribution[option.id] = option.participantCount
  })

  return {
    averageCommitment,
    mostPopularOption,
    competitiveness,
    totalParticipants: market.totalParticipants,
    totalTokens: market.totalTokensStaked,
    participantDistribution
  }
}

/**
 * Calculate market competitiveness score (0-100)
 * Higher score means more evenly distributed tokens (more competitive)
 * Lower score means one option dominates (less competitive)
 */
export function calculateCompetitiveness(market: Market): number {
  if (market.options.length < 2 || market.totalTokensStaked === 0) {
    return 0
  }

  // Calculate the percentage of tokens for each option
  const percentages = market.options.map(option => 
    option.totalTokens / market.totalTokensStaked
  )

  // Calculate how far we are from perfect distribution
  const perfectShare = 1 / market.options.length
  const deviationSum = percentages.reduce((sum, percentage) => 
    sum + Math.abs(percentage - perfectShare), 0
  )

  // Convert to competitiveness score (0-100)
  // Maximum possible deviation occurs when one option has 100% and others have 0%
  // For n options, max deviation = 2 * (n-1) / n
  const maxDeviation = 2 * (market.options.length - 1) / market.options.length
  const competitiveness = Math.max(0, 100 - (deviationSum / maxDeviation) * 100)

  return Math.round(competitiveness)
}

/**
 * Preview how a user's commitment would affect market odds
 */
export function previewOddsImpact(
  tokensToCommit: number,
  optionId: string,
  market: Market
): {
  currentOdds: MarketOdds
  projectedOdds: MarketOdds
  impactLevel: 'minimal' | 'moderate' | 'significant'
} {
  const currentOdds = calculateOdds(market)

  // Create a simulated market with the user's commitment added
  const simulatedMarket: Market = {
    ...market,
    totalTokensStaked: market.totalTokensStaked + tokensToCommit,
    totalParticipants: market.totalParticipants + 1,
    options: market.options.map(option => 
      option.id === optionId
        ? {
            ...option,
            totalTokens: option.totalTokens + tokensToCommit,
            participantCount: option.participantCount + 1
          }
        : option
    )
  }

  const projectedOdds = calculateOdds(simulatedMarket)

  // Calculate impact level based on odds change
  const oddsChange = Math.abs(currentOdds[optionId] - projectedOdds[optionId])
  const percentageChange = currentOdds[optionId] > 0 
    ? (oddsChange / currentOdds[optionId]) * 100 
    : 0

  let impactLevel: 'minimal' | 'moderate' | 'significant'
  if (percentageChange < 5) {
    impactLevel = 'minimal'
  } else if (percentageChange < 15) {
    impactLevel = 'moderate'
  } else {
    impactLevel = 'significant'
  }

  return {
    currentOdds,
    projectedOdds,
    impactLevel
  }
}

/**
 * Format token amounts for display with proper separators
 */
export function formatTokenAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`
  }
  return amount.toLocaleString()
}

/**
 * Format odds for display (e.g., "3.2:1" or "Even")
 */
export function formatOdds(odds: number): string {
  if (!odds || isNaN(odds)) {
    return '2.0:1' // Default odds
  }
  if (odds >= 1.95 && odds <= 2.05) {
    return 'Even'
  }
  return `${odds.toFixed(1)}:1`
}

/**
 * Validate market data for calculations
 */
export function validateMarketData(market: Market): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!market.id || market.id.trim() === '') {
    errors.push('Market ID is required')
  }

  if (!market.options || market.options.length === 0) {
    errors.push('Market must have at least one option')
  }

  if (market.totalTokensStaked < 0) {
    errors.push('Total tokens staked cannot be negative')
  }

  if (market.totalParticipants < 0) {
    errors.push('Total participants cannot be negative')
  }

  // Validate each option
  market.options?.forEach((option, index) => {
    if (!option.id || option.id.trim() === '') {
      errors.push(`Option ${index + 1} must have an ID`)
    }
    if (!option.text || option.text.trim() === '') {
      errors.push(`Option ${index + 1} must have text`)
    }
    if (option.totalTokens < 0) {
      errors.push(`Option ${index + 1} cannot have negative tokens`)
    }
    if (option.participantCount < 0) {
      errors.push(`Option ${index + 1} cannot have negative participant count`)
    }
  })

  // Validate totals consistency
  const sumTokens = market.options?.reduce((sum, option) => sum + option.totalTokens, 0) || 0
  if (Math.abs(sumTokens - market.totalTokensStaked) > 0.01) {
    errors.push('Sum of option tokens does not match total tokens staked')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}