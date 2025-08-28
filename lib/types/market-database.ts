/**
 * Optimized Market Database Schema
 * Designed for efficient token commitment tracking and real-time odds calculation
 */

import { Timestamp } from 'firebase/firestore'

/**
 * Core Market Model - Optimized for real-time updates
 */
export interface Market {
  id: string
  title: string
  description: string
  category: MarketCategory
  status: MarketStatus
  createdBy: string
  createdAt: Timestamp
  endsAt: Timestamp
  resolvedAt?: Timestamp
  imageUrl?: string
  tags: string[]
  
  // Market Configuration
  options: MarketOption[]
  minCommitment: number // Minimum tokens per commitment
  maxCommitment: number // Maximum tokens per commitment
  
  // Real-time Statistics (updated atomically with commitments)
  stats: MarketStats
  
  // Admin fields
  featured: boolean
  trending: boolean
  adminNotes?: string
}

/**
 * Market Options with embedded statistics
 */
export interface MarketOption {
  id: string
  text: string
  imageUrl?: string
  
  // Real-time token tracking (updated atomically)
  totalTokens: number
  participantCount: number
  commitmentCount: number
  
  // Calculated fields (computed on read)
  percentage?: number
  odds?: number
  
  // Resolution data
  isCorrect?: boolean
  resolvedAt?: Timestamp
}

/**
 * Market Statistics - Updated atomically with each commitment
 */
export interface MarketStats {
  totalTokensCommitted: number
  totalParticipants: number // Unique users who have committed
  totalCommitments: number // Total number of commitment transactions
  
  // Token distribution
  tokenDistribution: {
    [optionId: string]: number
  }
  
  // Participant distribution
  participantDistribution: {
    [optionId: string]: number
  }
  
  // Analytics
  averageCommitment: number
  largestCommitment: number
  smallestCommitment: number
  
  // Timestamps
  firstCommitmentAt?: Timestamp
  lastCommitmentAt?: Timestamp
  lastUpdated: Timestamp
}

/**
 * User Commitment - Simplified and optimized
 */
export interface UserCommitment {
  id: string
  userId: string
  marketId: string
  optionId: string
  tokensCommitted: number
  
  // Calculated at commitment time
  oddsAtCommitment: number
  potentialPayout: number
  
  // Status tracking
  status: CommitmentStatus
  committedAt: Timestamp
  resolvedAt?: Timestamp
  
  // Payout information (set when market resolves)
  actualPayout?: number
  payoutMultiplier?: number
}

/**
 * User Balance - Simplified for atomic operations
 */
export interface UserBalance {
  userId: string
  availableTokens: number
  committedTokens: number
  
  // Lifetime statistics
  totalEarned: number
  totalSpent: number
  totalCommitments: number
  
  // Version for optimistic locking
  version: number
  lastUpdated: Timestamp
}

/**
 * Token Transaction - Comprehensive transaction log
 */
export interface TokenTransaction {
  id: string
  userId: string
  type: TransactionType
  amount: number
  
  // Balance tracking
  balanceBefore: number
  balanceAfter: number
  
  // Related entities
  marketId?: string
  commitmentId?: string
  
  // Transaction metadata
  description: string
  metadata: Record<string, any>
  
  // Status and timing
  status: TransactionStatus
  createdAt: Timestamp
  processedAt?: Timestamp
}

/**
 * Market Analytics Cache - Pre-computed analytics for performance
 */
export interface MarketAnalyticsCache {
  marketId: string
  
  // Current state
  currentOdds: {
    [optionId: string]: number
  }
  
  // Trend data (last 24 hours)
  hourlyCommitments: Array<{
    hour: string // ISO hour string
    totalTokens: number
    commitmentCount: number
    optionBreakdown: {
      [optionId: string]: number
    }
  }>
  
  // Participant insights
  participantInsights: {
    newParticipants24h: number
    returningParticipants24h: number
    averageCommitmentSize: number
    medianCommitmentSize: number
  }
  
  // Market momentum
  momentum: {
    direction: 'up' | 'down' | 'stable'
    strength: number // 0-100
    leadingOption: string
    changingOption?: string // Option gaining/losing momentum
  }
  
  // Cache metadata
  lastUpdated: Timestamp
  expiresAt: Timestamp
}

/**
 * Enums and Types
 */
export type MarketCategory = 
  | 'entertainment'
  | 'sports' 
  | 'politics'
  | 'technology'
  | 'culture'
  | 'reality-tv'
  | 'fashion'
  | 'music'
  | 'other'

export type MarketStatus = 
  | 'draft'      // Created but not published
  | 'active'     // Live and accepting commitments
  | 'closed'     // No longer accepting commitments
  | 'resolved'   // Outcome determined
  | 'cancelled'  // Market cancelled

export type CommitmentStatus = 
  | 'active'     // Commitment is live
  | 'won'        // User won this commitment
  | 'lost'       // User lost this commitment
  | 'refunded'   // Commitment was refunded

export type TransactionType = 
  | 'signup_bonus'
  | 'purchase'
  | 'commitment'
  | 'payout'
  | 'refund'
  | 'admin_adjustment'

export type TransactionStatus = 
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'

/**
 * Database Collections Structure
 */
export const COLLECTIONS = {
  markets: 'markets',
  userCommitments: 'user_commitments',
  userBalances: 'user_balances',
  tokenTransactions: 'token_transactions',
  marketAnalytics: 'market_analytics_cache',
  users: 'users'
} as const

/**
 * Firestore Indexes Required
 */
export const REQUIRED_INDEXES = [
  // User commitments
  { collection: 'user_commitments', fields: ['userId', 'status', 'committedAt'] },
  { collection: 'user_commitments', fields: ['marketId', 'status', 'committedAt'] },
  { collection: 'user_commitments', fields: ['userId', 'marketId', 'status'] },
  
  // Markets
  { collection: 'markets', fields: ['status', 'featured', 'createdAt'] },
  { collection: 'markets', fields: ['status', 'trending', 'createdAt'] },
  { collection: 'markets', fields: ['category', 'status', 'createdAt'] },
  
  // Transactions
  { collection: 'token_transactions', fields: ['userId', 'status', 'createdAt'] },
  { collection: 'token_transactions', fields: ['marketId', 'status', 'createdAt'] },
  
  // Analytics
  { collection: 'market_analytics_cache', fields: ['marketId', 'lastUpdated'] }
] as const