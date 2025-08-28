/**
 * Commitment Validation Service
 * Provides server-side validation for commitment data integrity
 */

import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/db/database';
import { 
  PredictionCommitment, 
  TokenCommitmentRequest,
  UserBalance 
} from '@/lib/types/token';
import { Market } from '@/lib/db/database';
import { 
  validatePredictionCommitment, 
  validateTokenCommitmentRequest 
} from '@/lib/validation/token-schemas';

export interface CommitmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedData?: PredictionCommitment;
}

export interface CommitmentIntegrityCheck {
  commitmentId: string;
  isValid: boolean;
  issues: {
    type: 'error' | 'warning';
    field: string;
    message: string;
    currentValue?: any;
    expectedValue?: any;
  }[];
}

export class CommitmentValidationService {
  private static readonly COLLECTIONS = {
    predictionCommitments: 'prediction_commitments',
    markets: 'markets',
    users: 'users',
    userBalances: 'user_balances',
  } as const;

  /**
   * Validate a commitment request before processing
   */
  static async validateCommitmentRequest(
    request: TokenCommitmentRequest,
    userBalance: UserBalance,
    market: Market
  ): Promise<CommitmentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic schema validation
      validateTokenCommitmentRequest(request);
    } catch (error) {
      errors.push(`Schema validation failed: ${error}`);
      return { isValid: false, errors, warnings };
    }

    // Business logic validation
    
    // 1. Check if market is active and accepting commitments
    if (market.status !== 'active') {
      errors.push(`Market is not active (status: ${market.status})`);
    }

    // 2. Check if market hasn't ended
    if (new Date(market.endDate).getTime() <= Date.now()) {
      errors.push('Market has already ended');
    }

    // 3. Check if user has sufficient balance
    if (userBalance.availableTokens < request.tokensToCommit) {
      errors.push(
        `Insufficient balance. Available: ${userBalance.availableTokens}, Required: ${request.tokensToCommit}`
      );
    }

    // 4. Check minimum/maximum commitment limits
    const minCommitment = 1;
    const maxCommitment = 1000; // Could be configurable
    
    if (request.tokensToCommit < minCommitment) {
      errors.push(`Minimum commitment is ${minCommitment} tokens`);
    }
    
    if (request.tokensToCommit > maxCommitment) {
      errors.push(`Maximum commitment is ${maxCommitment} tokens`);
    }

    // 5. Check for duplicate active commitments (if business rule requires)
    try {
      const existingCommitment = await this.getActiveCommitment(
        request.userId, 
        request.predictionId
      );
      
      if (existingCommitment) {
        warnings.push(
          `User already has an active commitment of ${existingCommitment.tokensCommitted} tokens on this market`
        );
      }
    } catch (error) {
      warnings.push('Could not check for existing commitments');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate commitment data integrity
   */
  static async validateCommitmentIntegrity(
    commitment: PredictionCommitment
  ): Promise<CommitmentIntegrityCheck> {
    const issues: CommitmentIntegrityCheck['issues'] = [];

    try {
      // Schema validation
      validatePredictionCommitment(commitment);
    } catch (error) {
      issues.push({
        type: 'error',
        field: 'schema',
        message: `Schema validation failed: ${error}`,
      });
    }

    // Business logic integrity checks

    // 1. Validate odds calculation
    if (commitment.odds <= 0) {
      issues.push({
        type: 'error',
        field: 'odds',
        message: 'Odds must be positive',
        currentValue: commitment.odds,
      });
    }

    // 2. Validate potential winning calculation
    const expectedWinning = commitment.tokensCommitted * commitment.odds;
    const tolerance = 0.01; // Allow small floating point differences
    
    if (Math.abs(commitment.potentialWinning - expectedWinning) > tolerance) {
      issues.push({
        type: 'error',
        field: 'potentialWinning',
        message: 'Potential winning calculation is incorrect',
        currentValue: commitment.potentialWinning,
        expectedValue: expectedWinning,
      });
    }

    // 3. Validate timestamp consistency
    if (commitment.resolvedAt && commitment.resolvedAt.toMillis() < commitment.committedAt.toMillis()) {
      issues.push({
        type: 'error',
        field: 'resolvedAt',
        message: 'Resolved timestamp cannot be before committed timestamp',
        currentValue: commitment.resolvedAt,
      });
    }

    // 4. Validate status consistency
    if (commitment.status !== 'active' && !commitment.resolvedAt) {
      issues.push({
        type: 'warning',
        field: 'status',
        message: 'Non-active commitment should have resolved timestamp',
        currentValue: commitment.status,
      });
    }

    // 5. Validate metadata consistency
    if (commitment.metadata) {
      // Check if market title matches
      try {
        const marketDoc = await getDoc(doc(db, this.COLLECTIONS.markets, commitment.predictionId));
        if (marketDoc.exists()) {
          const market = marketDoc.data() as Market;
          if (market.title !== commitment.metadata.marketTitle) {
            issues.push({
              type: 'warning',
              field: 'metadata.marketTitle',
              message: 'Market title in metadata does not match current market title',
              currentValue: commitment.metadata.marketTitle,
              expectedValue: market.title,
            });
          }
        }
      } catch (error) {
        issues.push({
          type: 'warning',
          field: 'metadata',
          message: 'Could not validate market metadata',
        });
      }

      // Check odds snapshot consistency
      const { oddsSnapshot } = commitment.metadata;
      if (oddsSnapshot.totalYesTokens + oddsSnapshot.totalNoTokens === 0) {
        issues.push({
          type: 'warning',
          field: 'metadata.oddsSnapshot',
          message: 'Odds snapshot shows no tokens committed',
        });
      }
    }

    return {
      commitmentId: commitment.id,
      isValid: issues.filter(i => i.type === 'error').length === 0,
      issues,
    };
  }

  /**
   * Batch validate multiple commitments
   */
  static async batchValidateCommitments(
    commitments: PredictionCommitment[]
  ): Promise<CommitmentIntegrityCheck[]> {
    const results: CommitmentIntegrityCheck[] = [];
    
    for (const commitment of commitments) {
      try {
        const result = await this.validateCommitmentIntegrity(commitment);
        results.push(result);
      } catch (error) {
        results.push({
          commitmentId: commitment.id,
          isValid: false,
          issues: [{
            type: 'error',
            field: 'validation',
            message: `Validation failed: ${error}`,
          }],
        });
      }
    }
    
    return results;
  }

  /**
   * Get active commitment for user and prediction
   */
  private static async getActiveCommitment(
    userId: string, 
    predictionId: string
  ): Promise<PredictionCommitment | null> {
    try {
      const commitmentsQuery = query(
        collection(db, this.COLLECTIONS.predictionCommitments),
        where('userId', '==', userId),
        where('predictionId', '==', predictionId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(commitmentsQuery);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as PredictionCommitment;
    } catch (error) {
      console.error('Error checking for existing commitment:', error);
      throw error;
    }
  }

  /**
   * Create commitment metadata from market and user data
   */
  static async createCommitmentMetadata(
    market: Market,
    userBalance: UserBalance,
    request: TokenCommitmentRequest,
    clientInfo?: {
      ipAddress?: string;
      userAgent?: string;
      source?: 'web' | 'mobile' | 'api';
    }
  ): Promise<PredictionCommitment['metadata']> {
    // Calculate current odds snapshot
    const selectedOption = market.options.find(o => o.id === request.position);
    const selectedOptionTokens = selectedOption?.totalTokens || 0;
    const totalTokens = market.options.reduce((sum, opt) => sum + (opt.totalTokens || 0), 0);
    
    // For binary markets, calculate odds for both options
    const firstOption = market.options[0];
    const secondOption = market.options[1];
    const firstOptionTokens = firstOption?.totalTokens || 0;
    const secondOptionTokens = secondOption?.totalTokens || 0;
    
    const firstOdds = totalTokens > 0 ? (totalTokens + request.tokensToCommit) / (firstOptionTokens + (request.position === firstOption?.id ? request.tokensToCommit : 0)) : 2.0;
    const secondOdds = totalTokens > 0 ? (totalTokens + request.tokensToCommit) / (secondOptionTokens + (request.position === secondOption?.id ? request.tokensToCommit : 0)) : 2.0;

    return {
      marketStatus: market.status,
      marketTitle: market.title,
      marketEndsAt: new Date(market.endDate),
      oddsSnapshot: {
        yesOdds: firstOdds,
        noOdds: secondOdds,
        totalYesTokens: firstOptionTokens,
        totalNoTokens: secondOptionTokens,
        totalParticipants: market.participants,
      },
      userBalanceAtCommitment: userBalance.availableTokens,
      commitmentSource: clientInfo?.source || 'web',
      ipAddress: clientInfo?.ipAddress,
      userAgent: clientInfo?.userAgent,
    };
  }
}