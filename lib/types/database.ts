import { Timestamp } from 'firebase/firestore'

// User Profile (extends the auth user)
export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  createdAt: Timestamp
  lastLoginAt: Timestamp
  tokenBalance: number
  level: number
  totalPredictions: number
  correctPredictions: number
  streak: number
  isAdmin?: boolean
  bio?: string
  location?: string
}

// Market/Prediction Topic
export interface Market {
  id: string
  title: string
  description: string
  category: MarketCategory
  status: MarketStatus
  createdBy: string // User ID
  createdAt: Timestamp
  endsAt: Timestamp
  resolvedAt?: Timestamp
  imageUrl?: string
  tags: string[]
  
  // Prediction options
  options: MarketOption[]
  
  // Stats
  totalParticipants: number
  totalTokensStaked: number
  
  // Resolution fields
  pendingResolution?: boolean // True when market needs resolution
  resolution?: MarketResolution // Resolution details when resolved
  creatorFeePercentage?: number // 1-5% configurable creator fee
  
  // Admin fields
  featured: boolean
  trending: boolean
  adminNotes?: string
}

export interface MarketOption {
  id: string
  text: string
  imageUrl?: string
  totalTokens: number
  participantCount: number
  odds?: number // Calculated odds
  isCorrect?: boolean // Set when market resolves
}

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
  | 'draft'              // Created but not published
  | 'active'             // Live and accepting predictions
  | 'closed'             // No longer accepting predictions
  | 'pending_resolution' // Past end date, awaiting admin resolution
  | 'resolving'          // Currently being resolved by admin
  | 'resolved'           // Outcome determined and payouts distributed
  | 'cancelled'          // Market cancelled

// User Predictions
export interface Prediction {
  id: string
  userId: string
  marketId: string
  optionId: string
  tokensStaked: number
  createdAt: Timestamp
  
  // Calculated when market resolves
  tokensWon?: number
  isWinning?: boolean
}

// Comments/Social Features
export interface Comment {
  id: string
  userId: string
  marketId: string
  content: string
  createdAt: Timestamp
  updatedAt?: Timestamp
  likes: number
  likedBy: string[] // User IDs
  parentId?: string // For replies
  isDeleted?: boolean
}

// Notifications
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  createdAt: Timestamp
  read: boolean
  actionUrl?: string
  metadata?: Record<string, any>
}

export type NotificationType = 
  | 'market_resolved'
  | 'prediction_won'
  | 'prediction_lost'
  | 'new_market'
  | 'market_ending_soon'
  | 'comment_reply'
  | 'level_up'
  | 'achievement'

// Transactions/Token History
export interface Transaction {
  id: string
  userId: string
  type: TransactionType
  amount: number // Positive for gains, negative for spending
  description: string
  createdAt: Timestamp
  marketId?: string
  predictionId?: string
  metadata?: Record<string, any>
}

export type TransactionType = 
  | 'signup_bonus'
  | 'prediction_stake'
  | 'prediction_win'
  | 'daily_bonus'
  | 'referral_bonus'
  | 'admin_adjustment'
  | 'creator_fee'

// Leaderboards
export interface LeaderboardEntry {
  userId: string
  displayName: string
  photoURL?: string
  score: number
  rank: number
  period: 'daily' | 'weekly' | 'monthly' | 'all-time'
  updatedAt: Timestamp
}

// Admin Analytics
export interface Analytics {
  id: string
  date: string // YYYY-MM-DD format
  totalUsers: number
  activeUsers: number
  newUsers: number
  totalMarkets: number
  activeMarkets: number
  totalPredictions: number
  totalTokensStaked: number
  averageTokensPerUser: number
  topCategories: { category: MarketCategory; count: number }[]
  createdAt: Timestamp
}

// Market Resolution System

// Core resolution data
export interface MarketResolution {
  id: string
  marketId: string
  winningOptionId: string
  resolvedBy: string // Admin user ID
  resolvedAt: Timestamp
  evidence: Evidence[]
  totalPayout: number
  winnerCount: number
  status: 'completed' | 'disputed' | 'cancelled'
  creatorFeeAmount?: number
  houseFeeAmount?: number
}

// Evidence for resolution decisions
export interface Evidence {
  id: string
  type: 'url' | 'screenshot' | 'description'
  content: string
  description?: string
  uploadedAt: Timestamp
}

// Individual winner payouts
export interface ResolutionPayout {
  id: string
  resolutionId: string
  userId: string
  optionId: string
  tokensStaked: number
  payoutAmount: number
  profit: number
  processedAt: Timestamp
  status: 'completed' | 'failed' | 'pending'
}

// Creator fee payouts
export interface CreatorPayout {
  id: string
  resolutionId: string
  creatorId: string
  feeAmount: number
  feePercentage: number
  processedAt: Timestamp
  status: 'completed' | 'failed' | 'pending'
}

// House fee tracking
export interface HousePayout {
  id: string
  resolutionId: string
  feeAmount: number
  feePercentage: number // Always 5%
  processedAt: Timestamp
  status: 'completed' | 'failed' | 'pending'
}

// Payout preview for admin interface
export interface PayoutPreview {
  totalPool: number
  houseFee: number
  creatorFee: number
  winnerPool: number
  winnerCount: number
  largestPayout: number
  smallestPayout: number
  creatorPayout: {
    userId: string
    feeAmount: number
    feePercentage: number
  }
  payouts: {
    userId: string
    currentStake: number
    projectedPayout: number
    projectedProfit: number
  }[]
}

// Resolution validation and errors
export interface ResolutionValidation {
  isValid: boolean
  errors: ResolutionError[]
  warnings: ResolutionWarning[]
}

export interface ResolutionError {
  field: string
  message: string
  code: string
}

export interface ResolutionWarning {
  field: string
  message: string
  code: string
}

// Market validation for creation
export interface MarketValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
}

// App Configuration
export interface AppConfig {
  id: 'config'
  maintenanceMode: boolean
  signupBonus: number
  dailyBonus: number
  maxTokensPerPrediction: number
  minTokensPerPrediction: number
  featuredMarketIds: string[]
  announcements: {
    id: string
    title: string
    message: string
    type: 'info' | 'warning' | 'success'
    active: boolean
    createdAt: Timestamp
  }[]
  updatedAt: Timestamp
}