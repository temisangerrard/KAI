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
 * Zod schema for PredictionCommitment validation (Enhanced for Multi-Option Support)
 * 
 * BACKWARD COMPATIBILITY: All existing fields preserved and optional new fields added
 * VALIDATION: Supports both legacy binary positions and new option IDs
 */
export const PredictionCommitmentSchema = z.object({
  // Core identification
  id: z.string().min(1, 'Commitment ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  
  // Market linking (enhanced for multi-option support)
  predictionId: z.string().min(1, 'Prediction ID is required'),
  marketId: z.string().min(1, 'Market ID is required').optional(),
  
  // Option targeting (enhanced for multi-option support)
  position: z.enum(['yes', 'no'], {
    errorMap: () => ({ message: 'Position must be "yes" or "no"' }),
  }),
  optionId: z.string().min(1, 'Option ID must be provided').optional(),
  
  // Commitment details
  tokensCommitted: z.number().int().positive('Tokens committed must be positive'),
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
  
  // Enhanced commitment metadata tracking
  metadata: z.object({
    // Market state at commitment time
    marketStatus: z.enum(['active', 'closed', 'resolved', 'cancelled'], {
      errorMap: () => ({ message: 'Invalid market status' }),
    }),
    marketTitle: z.string().min(1, 'Market title is required'),
    marketEndsAt: z.any(), // Timestamp type from Firebase
    
    // Enhanced odds snapshot (supports both binary and multi-option)
    oddsSnapshot: z.object({
      // Legacy binary odds (preserved for backward compatibility)
      yesOdds: z.number().positive('Yes odds must be positive'),
      noOdds: z.number().positive('No odds must be positive'),
      totalYesTokens: z.number().min(0, 'Total yes tokens cannot be negative'),
      totalNoTokens: z.number().min(0, 'Total no tokens cannot be negative'),
      totalParticipants: z.number().int().min(0, 'Total participants cannot be negative'),
      
      // New multi-option odds snapshot (optional for backward compatibility)
      optionOdds: z.record(z.string(), z.number().positive()).optional(),
      optionTokens: z.record(z.string(), z.number().min(0)).optional(),
      optionParticipants: z.record(z.string(), z.number().int().min(0)).optional(),
    }),
    
    // Additional tracking data
    userBalanceAtCommitment: z.number().min(0, 'User balance cannot be negative'),
    commitmentSource: z.enum(['web', 'mobile', 'api'], {
      errorMap: () => ({ message: 'Invalid commitment source' }),
    }),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    
    // Enhanced option context (optional for backward compatibility)
    selectedOptionText: z.string().optional(),
    marketOptionCount: z.number().int().min(2).optional(),
  }),
}).refine(
  (data) => {
    // Ensure at least one targeting method is provided
    return data.position || data.optionId;
  },
  {
    message: 'Either position (yes/no) or optionId must be provided',
    path: ['position', 'optionId'],
  }
);

/**
 * Zod schema for TokenPurchaseRequest validation
 */
export const TokenPurchaseRequestSchema = z.object({
  packageId: z.string().min(1, 'Package ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  paymentMethodId: z.string().optional(),
});

/**
 * Zod schema for TokenCommitmentRequest validation (Enhanced for Multi-Option Support)
 * 
 * BACKWARD COMPATIBILITY: Accepts both legacy binary positions and new option IDs
 * VALIDATION: Ensures at least one targeting method (position or optionId) is provided
 */
export const TokenCommitmentRequestSchema = z.object({
  // Market identification (enhanced for multi-option support)
  predictionId: z.string().min(1, 'Prediction ID is required'),
  marketId: z.string().min(1, 'Market ID is required').optional(),
  
  // Option targeting (enhanced for multi-option support)
  position: z.enum(['yes', 'no'], {
    errorMap: () => ({ message: 'Position must be "yes" or "no"' }),
  }),
  optionId: z.string().min(1, 'Option ID must be provided').optional(),
  
  // Commitment details
  tokensToCommit: z.number().int().positive('Tokens to commit must be positive'),
  userId: z.string().min(1, 'User ID is required'),
}).refine(
  (data) => {
    // Ensure at least one targeting method is provided
    return data.position || data.optionId;
  },
  {
    message: 'Either position (yes/no) or optionId must be provided',
    path: ['position', 'optionId'],
  }
);

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

/**
 * Zod schema for MarketCreationData validation
 */
export const MarketCreationDataSchema = z.object({
  title: z.string().min(1, 'Market title is required'),
  description: z.string().min(1, 'Market description is required'),
  endDate: z.date({
    required_error: 'End date is required',
    invalid_type_error: 'End date must be a valid date'
  }),
  options: z.array(z.object({
    id: z.string().min(1, 'Option ID is required'),
    text: z.string().min(1, 'Option text is required')
  })).min(1, 'At least one option is required'),
  category: z.string().optional()
});

/**
 * Zod schema for ValidationError
 */
export const ValidationErrorSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  message: z.string().min(1, 'Error message is required'),
  code: z.string().min(1, 'Error code is required')
});

/**
 * Zod schema for ValidationWarning
 */
export const ValidationWarningSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  message: z.string().min(1, 'Warning message is required'),
  code: z.string().min(1, 'Warning code is required')
});

/**
 * Zod schema for MarketValidationResult
 */
export const MarketValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationWarningSchema)
});

export const validateMarketCreationData = (data: unknown) => {
  return MarketCreationDataSchema.parse(data);
};

export const validateValidationError = (data: unknown) => {
  return ValidationErrorSchema.parse(data);
};

export const validateValidationWarning = (data: unknown) => {
  return ValidationWarningSchema.parse(data);
};

export const validateMarketValidationResult = (data: unknown) => {
  return MarketValidationResultSchema.parse(data);
};