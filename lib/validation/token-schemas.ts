import { z } from 'zod';

/**
 * Zod schema for UserBalance validation
 */
export const UserBalanceSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  availableTokens: z.number().min(0, 'Available tokens cannot be negative'),
  committedTokens: z.number().min(0, 'Committed tokens cannot be negative'),
  totalEarned: z.number().min(0, 'Total earned cannot be negative'),
  totalSpent: z.number().min(0, 'Total spent cannot be negative'),
  lastUpdated: z.any(), // Timestamp type from Firebase
  version: z.number().int().min(0, 'Version must be a non-negative integer'),
});

/**
 * Zod schema for TokenTransaction validation
 */
export const TokenTransactionSchema = z.object({
  id: z.string().min(1, 'Transaction ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['purchase', 'commit', 'win', 'loss', 'refund'], {
    errorMap: () => ({ message: 'Invalid transaction type' }),
  }),
  amount: z.number().positive('Amount must be positive'),
  balanceBefore: z.number().min(0, 'Balance before cannot be negative'),
  balanceAfter: z.number().min(0, 'Balance after cannot be negative'),
  relatedId: z.string().optional(),
  metadata: z.object({
    stripePaymentId: z.string().optional(),
    predictionTitle: z.string().optional(),
    packageId: z.string().optional(),
  }).catchall(z.any()),
  timestamp: z.any(), // Timestamp type from Firebase
  status: z.enum(['pending', 'completed', 'failed'], {
    errorMap: () => ({ message: 'Invalid transaction status' }),
  }),
});

/**
 * Zod schema for TokenPackage validation
 */
export const TokenPackageSchema = z.object({
  id: z.string().min(1, 'Package ID is required'),
  name: z.string().min(1, 'Package name is required'),
  tokens: z.number().int().positive('Token amount must be a positive integer'),
  priceUSD: z.number().positive('Price must be positive'),
  bonusTokens: z.number().int().min(0, 'Bonus tokens cannot be negative'),
  stripePriceId: z.string().min(1, 'Stripe price ID is required'),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0, 'Sort order must be non-negative'),
  createdAt: z.any(), // Timestamp type from Firebase
});

/**
 * Zod schema for PredictionCommitment validation
 */
export const PredictionCommitmentSchema = z.object({
  id: z.string().min(1, 'Commitment ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  predictionId: z.string().min(1, 'Prediction ID is required'),
  tokensCommitted: z.number().int().positive('Tokens committed must be positive'),
  position: z.enum(['yes', 'no'], {
    errorMap: () => ({ message: 'Position must be either "yes" or "no"' }),
  }),
  odds: z.number().positive('Odds must be positive'),
  potentialWinning: z.number().min(0, 'Potential winning cannot be negative'),
  status: z.enum(['active', 'won', 'lost', 'refunded'], {
    errorMap: () => ({ message: 'Invalid commitment status' }),
  }),
  committedAt: z.any(), // Timestamp type from Firebase
  resolvedAt: z.any().optional(), // Timestamp type from Firebase
  
  // User display information (optional for backward compatibility)
  userEmail: z.string().email().optional(),
  userDisplayName: z.string().optional(),
  
  // Commitment metadata tracking
  metadata: z.object({
    // Market state at commitment time
    marketStatus: z.enum(['active', 'closed', 'resolved', 'cancelled'], {
      errorMap: () => ({ message: 'Invalid market status' }),
    }),
    marketTitle: z.string().min(1, 'Market title is required'),
    marketEndsAt: z.any(), // Timestamp type from Firebase
    
    // Odds snapshot at commitment time
    oddsSnapshot: z.object({
      yesOdds: z.number().positive('Yes odds must be positive'),
      noOdds: z.number().positive('No odds must be positive'),
      totalYesTokens: z.number().min(0, 'Total yes tokens cannot be negative'),
      totalNoTokens: z.number().min(0, 'Total no tokens cannot be negative'),
      totalParticipants: z.number().int().min(0, 'Total participants cannot be negative'),
    }),
    
    // Additional tracking data
    userBalanceAtCommitment: z.number().min(0, 'User balance cannot be negative'),
    commitmentSource: z.enum(['web', 'mobile', 'api'], {
      errorMap: () => ({ message: 'Invalid commitment source' }),
    }),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
  }),
});

/**
 * Zod schema for TokenPurchaseRequest validation
 */
export const TokenPurchaseRequestSchema = z.object({
  packageId: z.string().min(1, 'Package ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  paymentMethodId: z.string().optional(),
});

/**
 * Zod schema for TokenCommitmentRequest validation
 */
export const TokenCommitmentRequestSchema = z.object({
  predictionId: z.string().min(1, 'Prediction ID is required'),
  tokensToCommit: z.number().int().positive('Tokens to commit must be positive'),
  position: z.enum(['yes', 'no'], {
    errorMap: () => ({ message: 'Position must be either "yes" or "no"' }),
  }),
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * Zod schema for BalanceUpdateRequest validation
 */
export const BalanceUpdateRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['purchase', 'commit', 'win', 'loss', 'refund'], {
    errorMap: () => ({ message: 'Invalid transaction type' }),
  }),
  relatedId: z.string().optional(),
  metadata: z.object({
    stripePaymentId: z.string().optional(),
    predictionTitle: z.string().optional(),
    packageId: z.string().optional(),
  }).catchall(z.any()).optional(),
});

/**
 * Validation helper functions
 */
export const validateUserBalance = (data: unknown) => {
  return UserBalanceSchema.parse(data);
};

export const validateTokenTransaction = (data: unknown) => {
  return TokenTransactionSchema.parse(data);
};

export const validateTokenPackage = (data: unknown) => {
  return TokenPackageSchema.parse(data);
};

export const validatePredictionCommitment = (data: unknown) => {
  return PredictionCommitmentSchema.parse(data);
};

export const validateTokenPurchaseRequest = (data: unknown) => {
  return TokenPurchaseRequestSchema.parse(data);
};

export const validateTokenCommitmentRequest = (data: unknown) => {
  return TokenCommitmentRequestSchema.parse(data);
};

export const validateBalanceUpdateRequest = (data: unknown) => {
  return BalanceUpdateRequestSchema.parse(data);
};

/**
 * Zod schema for CommitmentWithUser validation
 */
export const CommitmentWithUserSchema = PredictionCommitmentSchema.extend({
  user: z.object({
    id: z.string().min(1, 'User ID is required'),
    email: z.string().email('Valid email is required'),
    displayName: z.string().min(1, 'Display name is required'),
    photoURL: z.string().url().optional(),
    isAdmin: z.boolean().optional(),
  }),
});

/**
 * Zod schema for MarketCommitmentSummary validation
 */
export const MarketCommitmentSummarySchema = z.object({
  marketId: z.string().min(1, 'Market ID is required'),
  marketTitle: z.string().min(1, 'Market title is required'),
  marketStatus: z.enum(['active', 'closed', 'resolved', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid market status' }),
  }),
  totalTokensCommitted: z.number().min(0, 'Total tokens committed cannot be negative'),
  participantCount: z.number().int().min(0, 'Participant count cannot be negative'),
  yesTokens: z.number().min(0, 'Yes tokens cannot be negative'),
  noTokens: z.number().min(0, 'No tokens cannot be negative'),
  averageCommitment: z.number().min(0, 'Average commitment cannot be negative'),
  largestCommitment: z.number().min(0, 'Largest commitment cannot be negative'),
  commitments: z.array(CommitmentWithUserSchema),
});

export const validateCommitmentWithUser = (data: unknown) => {
  return CommitmentWithUserSchema.parse(data);
};

export const validateMarketCommitmentSummary = (data: unknown) => {
  return MarketCommitmentSummarySchema.parse(data);
};