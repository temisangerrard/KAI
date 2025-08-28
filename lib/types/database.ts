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
  | 'draft'      // Created but not published
  | 'active'     // Live and accepting predictions
  | 'closed'     // No longer accepting predictions
  | 'resolved'   // Outcome determined
  | 'cancelled'  // Market cancelled

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