/**
 * Enhanced Commitment Creation Service
 * 
 * Provides backward-compatible commitment creation that supports both binary and multi-option markets.
 * Maintains full compatibility with existing PredictionCommitment component and dashboard systems.
 * 
 * BACKWARD COMPATIBILITY FEATURES:
 * - Supports existing position-based creation (yes/no) while also setting optionId
 * - Maintains all existing PredictionCommitment interface fields
 * - Works seamlessly with existing AdminCommitmentService and dashboards
 * - Preserves existing metadata structure with enhancements
 * 
 * NEW FEATURES:
 * - Direct optionId targeting for multi-option markets
 * - Enhanced validation for option existence and market state
 * - Comprehensive metadata capture for both binary and multi-option contexts
 * - Automatic compatibility layer between position and optionId fields
 */

import {
  collection,
  doc,
  getDoc,
  addDoc,
  runTransaction,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/db/database';
import {
  PredictionCommitment,
  TokenCommitmentRequest,
  UserBalance,
  TokenTransaction
} from '@/lib/types/token';
import { Market, MarketOption } from '@/lib/db/database';
import { CommitmentValidationService } from './commitment-validation-service';

// Enhanced commitment request that supports both binary and multi-option markets
export interface EnhancedCommitmentRequest extends TokenCommitmentRequest {
  // Enhanced market identification
  marketId?: string;                 // Clearer naming (alias for predictionId)
  
  // Enhanced option targeting
  optionId?: string;                 // Direct option targeting for multi-option markets
  
  // Additional context for enhanced metadata
  clientInfo?: {
    source?: 'web' | 'mobile' | 'api';
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface CommitmentCreationResult {
  success: boolean;
  commitmentId?: string;
  commitment?: PredictionCommitment;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class EnhancedCommitmentService {
  private static readonly COLLECTIONS = {
    predictionCommitments: 'prediction_commitments',
    markets: 'markets',
    userBalances: 'user_balances',
    tokenTransactions: 'token_transactions'
  } as const;

  /**
   * Create a commitment with enhanced support for both binary and multi-option markets
   * 
   * BACKWARD COMPATIBILITY: Maintains existing behavior for binary markets
   * NEW FUNCTIONALITY: Supports direct optionId targeting for multi-option markets
   */
  static async createCommitment(request: EnhancedCommitmentRequest): Promise<CommitmentCreationResult> {
    try {
      // Normalize request for backward compatibility
      const normalizedRequest = this.normalizeCommitmentRequest(request);
      
      // Validate request and get market/user data
      const validationResult = await this.validateCommitmentRequest(normalizedRequest);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: validationResult.errors.join('; '),
            details: { errors: validationResult.errors, warnings: validationResult.warnings }
          }
        };
      }

      const { market, userBalance } = validationResult;

      // Create commitment using atomic transaction
      const result = await runTransaction(db, async (transaction) => {
        // Re-validate user balance within transaction
        const balanceRef = doc(db, this.COLLECTIONS.userBalances, normalizedRequest.userId);
        const balanceSnap = await transaction.get(balanceRef);
        
        if (!balanceSnap.exists()) {
          throw new Error('User balance not found');
        }
        
        const currentBalance = balanceSnap.data() as UserBalance;
        if (currentBalance.availableTokens < normalizedRequest.tokensToCommit) {
          throw new Error('Insufficient available tokens');
        }

        // Create enhanced commitment record
        const commitment = await this.buildCommitmentRecord(normalizedRequest, market!, currentBalance);
        
        // Create commitment document
        const commitmentRef = doc(collection(db, this.COLLECTIONS.predictionCommitments));
        transaction.set(commitmentRef, commitment);
        
        // Update user balance (move tokens from available to committed)
        const updatedBalance: UserBalance = {
          ...currentBalance,
          availableTokens: currentBalance.availableTokens - normalizedRequest.tokensToCommit,
          committedTokens: currentBalance.committedTokens + normalizedRequest.tokensToCommit,
          lastUpdated: Timestamp.now(),
          version: currentBalance.version + 1
        };
        
        transaction.set(balanceRef, updatedBalance);
        
        // Create transaction record
        const transactionRef = doc(collection(db, this.COLLECTIONS.tokenTransactions));
        const tokenTransaction: Omit<TokenTransaction, 'id'> = {
          userId: normalizedRequest.userId,
          type: 'commit',
          amount: normalizedRequest.tokensToCommit,
          balanceBefore: currentBalance.availableTokens,
          balanceAfter: updatedBalance.availableTokens,
          relatedId: normalizedRequest.marketId || normalizedRequest.predictionId,
          metadata: {
            position: commitment.position,
            optionId: commitment.optionId,
            odds: commitment.odds,
            potentialWinning: commitment.potentialWinning,
            marketTitle: market!.title
          },
          timestamp: Timestamp.now(),
          status: 'completed'
        };
        
        transaction.set(transactionRef, tokenTransaction);
        
        return {
          commitmentId: commitmentRef.id,
          commitment: { id: commitmentRef.id, ...commitment }
        };
      });

      return {
        success: true,
        commitmentId: result.commitmentId,
        commitment: result.commitment
      };

    } catch (error) {
      console.error('[ENHANCED_COMMITMENT_SERVICE] Error creating commitment:', error);
      
      return {
        success: false,
        error: {
          code: 'CREATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create commitment',
          details: { originalError: error }
        }
      };
    }
  }

  /**
   * Normalize commitment request for backward compatibility
   * Ensures both binary and multi-option requests are handled consistently
   */
  private static normalizeCommitmentRequest(request: EnhancedCommitmentRequest): EnhancedCommitmentRequest {
    const normalized = { ...request };

    // Ensure marketId field exists (alias for predictionId)
    if (!normalized.marketId && normalized.predictionId) {
      normalized.marketId = normalized.predictionId;
    }
    if (!normalized.predictionId && normalized.marketId) {
      normalized.predictionId = normalized.marketId;
    }

    // Set default client info if not provided
    if (!normalized.clientInfo) {
      normalized.clientInfo = {
        source: 'web'
      };
    }

    return normalized;
  }

  /**
   * Validate commitment request and fetch required data
   */
  private static async validateCommitmentRequest(
    request: EnhancedCommitmentRequest
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    market?: Market;
    userBalance?: UserBalance;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Fetch market data
      const marketId = request.marketId || request.predictionId;
      if (!marketId) {
        errors.push('Market ID is required');
        return { isValid: false, errors, warnings };
      }

      const marketDoc = await getDoc(doc(db, this.COLLECTIONS.markets, marketId));
      if (!marketDoc.exists()) {
        errors.push(`Market not found: ${marketId}`);
        return { isValid: false, errors, warnings };
      }

      const market = { id: marketDoc.id, ...marketDoc.data() } as Market;

      // Ensure market has options array for compatibility
      if (!market.options || market.options.length === 0) {
        // Create default binary options for legacy markets
        market.options = [
          { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
          { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
        ];
        warnings.push('Market options were auto-generated for legacy market');
      }

      // Validate market state
      if (market.status !== 'active') {
        errors.push(`Market is not active (status: ${market.status})`);
      }

      // Check if market has ended
      const now = new Date();
      const endDate = market.endDate || market.endsAt?.toDate();
      if (endDate && endDate.getTime() <= now.getTime()) {
        errors.push('Market has already ended');
      }

      // Validate option targeting (enhanced for multi-option support)
      const validationResult = this.validateOptionTargeting(request, market);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);

      // Fetch user balance
      const userBalance = await this.getUserBalance(request.userId);
      if (!userBalance) {
        errors.push('User balance not found');
        return { isValid: false, errors, warnings };
      }

      // Validate sufficient balance
      if (userBalance.availableTokens < request.tokensToCommit) {
        errors.push(
          `Insufficient balance. Available: ${userBalance.availableTokens}, Required: ${request.tokensToCommit}`
        );
      }

      // Validate commitment amount
      if (request.tokensToCommit < 1) {
        errors.push('Minimum commitment is 1 token');
      }

      const maxCommitment = 1000; // Could be configurable
      if (request.tokensToCommit > maxCommitment) {
        errors.push(`Maximum commitment is ${maxCommitment} tokens`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        market,
        userBalance
      };

    } catch (error) {
      console.error('[ENHANCED_COMMITMENT_SERVICE] Validation error:', error);
      errors.push('Validation failed due to system error');
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Validate option targeting for both binary and multi-option markets
   * Ensures backward compatibility while supporting enhanced functionality
   */
  private static validateOptionTargeting(
    request: EnhancedCommitmentRequest,
    market: Market
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // For binary markets: maintain existing position-based validation
    if (market.options.length === 2) {
      // Binary market validation
      if (!request.position || !['yes', 'no'].includes(request.position)) {
        errors.push('Position must be "yes" or "no" for binary markets');
      }

      // If optionId is provided, validate it matches the position
      if (request.optionId) {
        const expectedOptionId = request.position === 'yes' ? market.options[0].id : market.options[1].id;
        if (request.optionId !== expectedOptionId) {
          warnings.push(`OptionId ${request.optionId} doesn't match position ${request.position}, using position`);
        }
      }
    } else {
      // Multi-option market validation
      if (request.optionId) {
        // Direct optionId targeting
        const targetOption = market.options.find(opt => opt.id === request.optionId);
        if (!targetOption) {
          errors.push(`Option not found: ${request.optionId}`);
        }
      } else if (request.position) {
        // Legacy position targeting for multi-option market
        if (request.position === 'yes' && market.options[0]) {
          // Map to first option
          warnings.push('Using first option for "yes" position in multi-option market');
        } else if (request.position === 'no' && market.options[1]) {
          // Map to second option
          warnings.push('Using second option for "no" position in multi-option market');
        } else {
          errors.push('Invalid position for multi-option market');
        }
      } else {
        errors.push('Either optionId or position must be specified');
      }
    }

    return { errors, warnings };
  }

  /**
   * Get user balance with error handling
   */
  private static async getUserBalance(userId: string): Promise<UserBalance | null> {
    try {
      const balanceRef = doc(db, this.COLLECTIONS.userBalances, userId);
      const balanceSnap = await getDoc(balanceRef);
      
      if (balanceSnap.exists()) {
        return balanceSnap.data() as UserBalance;
      }
      
      // Create initial balance if doesn't exist
      const initialBalance: UserBalance = {
        userId,
        availableTokens: 0,
        committedTokens: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: Timestamp.now(),
        version: 1
      };
      
      return initialBalance;
    } catch (error) {
      console.error('[ENHANCED_COMMITMENT_SERVICE] Error getting user balance:', error);
      return null;
    }
  }

  /**
   * Build comprehensive commitment record with backward compatibility
   * Ensures both binary and multi-option contexts are properly captured
   */
  private static async buildCommitmentRecord(
    request: EnhancedCommitmentRequest,
    market: Market,
    userBalance: UserBalance
  ): Promise<Omit<PredictionCommitment, 'id'>> {
    // Determine target option and derive compatibility fields
    const { targetOption, position, optionId } = this.resolveOptionTargeting(request, market);

    // Calculate odds and potential winnings
    const odds = this.calculateOdds(targetOption, market);
    const potentialWinning = request.tokensToCommit * odds;

    // Build comprehensive metadata
    const metadata = await this.buildCommitmentMetadata(
      request,
      market,
      targetOption,
      userBalance,
      odds
    );

    // Create backward-compatible commitment record
    const commitment: Omit<PredictionCommitment, 'id'> = {
      // Core identification
      userId: request.userId,
      
      // Market linking (backward compatible)
      predictionId: request.predictionId,
      marketId: request.marketId,
      
      // Option targeting (backward compatible)
      position,
      optionId,
      
      // Commitment details
      tokensCommitted: request.tokensToCommit,
      odds,
      potentialWinning,
      status: 'active',
      committedAt: Timestamp.now(),
      
      // Enhanced metadata
      metadata
    };

    return commitment;
  }

  /**
   * Resolve option targeting for both binary and multi-option markets
   * Provides the compatibility layer between position and optionId
   */
  private static resolveOptionTargeting(
    request: EnhancedCommitmentRequest,
    market: Market
  ): {
    targetOption: MarketOption;
    position: 'yes' | 'no';
    optionId: string;
  } {
    let targetOption: MarketOption;
    let position: 'yes' | 'no';
    let optionId: string;

    if (market.options.length === 2) {
      // Binary market: maintain existing position-based logic while setting optionId
      position = request.position || 'yes';
      optionId = position === 'yes' ? market.options[0].id : market.options[1].id;
      targetOption = market.options.find(opt => opt.id === optionId) || market.options[0];
    } else {
      // Multi-option market: use direct optionId targeting with position derived for compatibility
      if (request.optionId) {
        optionId = request.optionId;
        targetOption = market.options.find(opt => opt.id === optionId) || market.options[0];
        // Derive position for backward compatibility
        position = optionId === market.options[0].id ? 'yes' : 'no';
      } else {
        // Fallback to position-based targeting
        position = request.position || 'yes';
        optionId = position === 'yes' ? market.options[0].id : market.options[1].id;
        targetOption = market.options.find(opt => opt.id === optionId) || market.options[0];
      }
    }

    return { targetOption, position, optionId };
  }

  /**
   * Calculate odds for the target option
   * Supports both binary and multi-option market calculations
   */
  private static calculateOdds(targetOption: MarketOption, market: Market): number {
    const totalTokens = market.options.reduce((sum, opt) => sum + (opt.totalTokens || 0), 0);
    const targetTokens = targetOption.totalTokens || 0;
    
    if (totalTokens === 0) {
      return 2.0; // Default odds when no tokens committed yet
    }
    
    // Calculate odds based on token distribution
    const targetPercentage = targetTokens / totalTokens;
    const odds = targetPercentage > 0 ? 1 / targetPercentage : 2.0;
    
    // Ensure reasonable odds bounds
    return Math.max(1.1, Math.min(odds, 10.0));
  }

  /**
   * Build comprehensive commitment metadata for both binary and multi-option contexts
   * Maintains backward compatibility while adding enhanced tracking
   */
  private static async buildCommitmentMetadata(
    request: EnhancedCommitmentRequest,
    market: Market,
    targetOption: MarketOption,
    userBalance: UserBalance,
    odds: number
  ): Promise<PredictionCommitment['metadata']> {
    // Calculate market snapshot for both binary and multi-option contexts
    const totalTokens = market.options.reduce((sum, opt) => sum + (opt.totalTokens || 0), 0);
    
    // Binary odds snapshot (for backward compatibility)
    const firstOption = market.options[0];
    const secondOption = market.options[1];
    const firstOptionTokens = firstOption?.totalTokens || 0;
    const secondOptionTokens = secondOption?.totalTokens || 0;
    
    const yesOdds = totalTokens > 0 ? totalTokens / Math.max(firstOptionTokens, 1) : 2.0;
    const noOdds = totalTokens > 0 ? totalTokens / Math.max(secondOptionTokens, 1) : 2.0;

    // Multi-option odds snapshot (enhanced functionality)
    const optionOdds: { [optionId: string]: number } = {};
    const optionTokens: { [optionId: string]: number } = {};
    const optionParticipants: { [optionId: string]: number } = {};

    market.options.forEach(option => {
      optionOdds[option.id] = this.calculateOdds(option, market);
      optionTokens[option.id] = option.totalTokens || 0;
      optionParticipants[option.id] = option.participantCount || 0;
    });

    return {
      // Market state at commitment time
      marketStatus: market.status,
      marketTitle: market.title,
      marketEndsAt: market.endDate || market.endsAt || Timestamp.now(),
      
      // Enhanced odds snapshot (supports both binary and multi-option)
      oddsSnapshot: {
        // Legacy binary odds (preserved for backward compatibility)
        yesOdds,
        noOdds,
        totalYesTokens: firstOptionTokens,
        totalNoTokens: secondOptionTokens,
        totalParticipants: market.totalParticipants || 0,
        
        // Enhanced multi-option odds snapshot
        optionOdds,
        optionTokens,
        optionParticipants
      },
      
      // User context
      userBalanceAtCommitment: userBalance.availableTokens,
      commitmentSource: request.clientInfo?.source || 'web',
      ipAddress: request.clientInfo?.ipAddress,
      userAgent: request.clientInfo?.userAgent,
      
      // Enhanced option context
      selectedOptionText: targetOption.text || targetOption.name,
      marketOptionCount: market.options.length
    };
  }

  /**
   * Create commitment for binary markets (backward compatibility method)
   * Maintains existing API while internally using enhanced functionality
   */
  static async createBinaryCommitment(
    userId: string,
    marketId: string,
    position: 'yes' | 'no',
    tokensToCommit: number,
    clientInfo?: { source?: 'web' | 'mobile' | 'api'; ipAddress?: string; userAgent?: string }
  ): Promise<CommitmentCreationResult> {
    const request: EnhancedCommitmentRequest = {
      userId,
      predictionId: marketId,
      marketId,
      position,
      tokensToCommit,
      clientInfo
    };

    return this.createCommitment(request);
  }

  /**
   * Create commitment for multi-option markets (new functionality)
   * Direct optionId targeting with position derived for compatibility
   */
  static async createMultiOptionCommitment(
    userId: string,
    marketId: string,
    optionId: string,
    tokensToCommit: number,
    clientInfo?: { source?: 'web' | 'mobile' | 'api'; ipAddress?: string; userAgent?: string }
  ): Promise<CommitmentCreationResult> {
    const request: EnhancedCommitmentRequest = {
      userId,
      predictionId: marketId,
      marketId,
      optionId,
      tokensToCommit,
      clientInfo
    };

    return this.createCommitment(request);
  }

  /**
   * Validate commitment request using existing validation service
   * Provides additional layer of validation for enhanced requests
   */
  static async validateEnhancedCommitmentRequest(
    request: EnhancedCommitmentRequest
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const normalizedRequest = this.normalizeCommitmentRequest(request);
      const result = await this.validateCommitmentRequest(normalizedRequest);
      
      return {
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation failed due to system error'],
        warnings: []
      };
    }
  }
}