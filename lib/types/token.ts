import { Timestamp } from 'firebase/firestore';

/**
 * User Balance Model
 * Represents a user's token balance and transaction summary
 */
export interface UserBalance {
  userId: string;
  availableTokens: number;
  committedTokens: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: Timestamp;
  version: number; // For optimistic locking
}

/**
 * Token Transaction Model
 * Represents all token-related transactions in the system
 */
export interface TokenTransaction {
  id: string;
  userId: string;
  type: 'purchase' | 'commit' | 'win' | 'loss' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  relatedId?: string; // predictionId or purchaseId
  metadata: {
    stripePaymentId?: string;
    predictionTitle?: string;
    packageId?: string;
    [key: string]: any;
  };
  timestamp: Timestamp;
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Token Package Model
 * Represents available token packages for purchase
 */
export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  priceUSD: number;
  bonusTokens: number;
  stripePriceId: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Timestamp;
}

/**
 * Prediction Commitment Model (Enhanced for Multi-Option Support)
 * Represents tokens committed to a specific prediction option
 * 
 * BACKWARD COMPATIBILITY: All existing fields preserved for dashboard compatibility
 * NEW FEATURES: Added optionId and marketId for multi-option market support
 */
export interface PredictionCommitment {
  // Core identification
  id: string;
  userId: string;
  
  // Market linking (enhanced for multi-option support)
  predictionId: string;              // ✅ PRESERVED: Existing field for backward compatibility
  marketId?: string;                 // 🆕 NEW: Alias for predictionId (clearer naming)
  
  // Option targeting (enhanced for multi-option support)
  position: 'yes' | 'no';           // ✅ PRESERVED: Binary position for backward compatibility
  optionId?: string;                 // 🆕 NEW: Direct link to MarketOption.id for multi-option markets
  
  // Commitment details
  tokensCommitted: number;
  odds: number;
  potentialWinning: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
  committedAt: Timestamp;
  resolvedAt?: Timestamp;
  
  // User display information (for admin views)
  userEmail?: string;
  userDisplayName?: string;
  
  // Enhanced commitment metadata tracking
  metadata: {
    // Market state at commitment time
    marketStatus: 'active' | 'closed' | 'resolved' | 'cancelled';
    marketTitle: string;
    marketEndsAt: Timestamp;
    
    // Enhanced odds snapshot (supports both binary and multi-option)
    oddsSnapshot: {
      // Legacy binary odds (preserved for backward compatibility)
      yesOdds: number;
      noOdds: number;
      totalYesTokens: number;
      totalNoTokens: number;
      totalParticipants: number;
      
      // 🆕 NEW: Multi-option odds snapshot
      optionOdds?: { [optionId: string]: number };           // Odds for each option
      optionTokens?: { [optionId: string]: number };         // Tokens committed to each option
      optionParticipants?: { [optionId: string]: number };   // Participants per option
    };
    
    // Additional tracking data
    userBalanceAtCommitment: number;
    commitmentSource: 'web' | 'mobile' | 'api';
    ipAddress?: string;
    userAgent?: string;
    
    // 🆕 NEW: Enhanced option context
    selectedOptionText?: string;      // Human-readable option text at commitment time
    marketOptionCount?: number;       // Total options available when commitment was made
  };
}

/**
 * Token Purchase Request
 * Used for initiating token purchases
 */
export interface TokenPurchaseRequest {
  packageId: string;
  userId: string;
  paymentMethodId?: string;
}

/**
 * Token Commitment Request (Enhanced for Multi-Option Support)
 * Used for committing tokens to predictions
 * 
 * BACKWARD COMPATIBILITY: All existing fields preserved
 * NEW FEATURES: Added optionId and marketId for multi-option market support
 */
export interface TokenCommitmentRequest {
  // Market identification (enhanced for multi-option support)
  predictionId: string;              // ✅ PRESERVED: Existing field for backward compatibility
  marketId?: string;                 // 🆕 NEW: Alias for predictionId (clearer naming)
  
  // Option targeting (enhanced for multi-option support)
  position: 'yes' | 'no';           // ✅ PRESERVED: Binary position for backward compatibility
  optionId?: string;                 // 🆕 NEW: Direct option targeting for multi-option markets
  
  // Commitment details
  tokensToCommit: number;
  userId: string;
}

/**
 * Balance Update Request
 * Used for updating user balances
 */
export interface BalanceUpdateRequest {
  userId: string;
  amount: number;
  type: TokenTransaction['type'];
  relatedId?: string;
  metadata?: TokenTransaction['metadata'];
}

/**
 * Commitment Detail with User Information
 * Extended commitment data for admin views
 */
export interface CommitmentWithUser extends PredictionCommitment {
  user: {
    id: string;
    email: string;
    displayName: string;
    photoURL?: string;
    isAdmin?: boolean;
  };
  marketTitle?: string;
  marketStatus?: string;
}

/**
 * Market Commitment Summary
 * Aggregated commitment data for a specific market
 */
export interface MarketCommitmentSummary {
  marketId: string;
  marketTitle: string;
  marketStatus: 'active' | 'closed' | 'resolved' | 'cancelled';
  totalTokensCommitted: number;
  participantCount: number;
  yesTokens: number;
  noTokens: number;
  averageCommitment: number;
  largestCommitment: number;
  commitments: CommitmentWithUser[];
}

/**
 * Daily Commitment Data
 * Represents commitment activity for a specific day
 */
export interface DailyCommitmentData {
  date: string; // YYYY-MM-DD format
  totalTokens: number;
  commitmentCount: number;
  yesTokens: number;
  noTokens: number;
}

/**
 * Market Analytics
 * Comprehensive analytics for market commitment data
 */
export interface MarketAnalytics {
  totalTokens: number;
  participantCount: number;
  yesPercentage: number;
  noPercentage: number;
  averageCommitment: number;
  largestCommitment: number;
  commitmentTrend: DailyCommitmentData[];
}

/**
 * Commitment Analytics
 * Overall system-wide commitment analytics
 */
export interface CommitmentAnalytics {
  totalMarketsWithCommitments: number;
  totalTokensCommitted: number;
  activeCommitments: number;
  resolvedCommitments: number;
  averageCommitmentSize: number;
}