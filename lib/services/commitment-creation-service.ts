/**
 * Commitment Creation Service
 * 
 * Unified API for creating commitments that works seamlessly with existing components
 * while providing enhanced multi-option market support.
 * 
 * BACKWARD COMPATIBILITY:
 * - Works with existing PredictionCommitment component without changes
 * - Maintains all existing API signatures and behavior
 * - Supports existing binary market workflows
 * 
 * NEW FEATURES:
 * - Automatic market type detection (binary vs multi-option)
 * - Enhanced validation and error handling
 * - Comprehensive metadata capture
 * - Direct optionId targeting for multi-option markets
 */

import { EnhancedCommitmentService, EnhancedCommitmentRequest, CommitmentCreationResult } from './enhanced-commitment-service';
import { PredictionCommitmentService } from './token-database';
import { PredictionCommitment } from '@/lib/types/token';
import { Market } from '@/lib/db/database';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/db/database';

export interface CommitmentRequest {
  userId: string;
  marketId: string;
  position?: 'yes' | 'no';        // For binary markets (backward compatibility)
  optionId?: string;              // For multi-option markets (new functionality)
  tokensToCommit: number;
  clientInfo?: {
    source?: 'web' | 'mobile' | 'api';
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface CommitmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  marketType: 'binary' | 'multi-option';
  recommendedOptionId?: string;
}

export class CommitmentCreationService {
  
  /**
   * Create a commitment with automatic market type detection
   * 
   * This is the main entry point that existing components should use.
   * It automatically detects whether the market is binary or multi-option
   * and handles the commitment creation appropriately.
   */
  static async createCommitment(request: CommitmentRequest): Promise<CommitmentCreationResult> {
    try {
      // Validate and detect market type
      const validation = await this.validateAndDetectMarketType(request);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: validation.errors.join('; '),
            details: { errors: validation.errors, warnings: validation.warnings }
          }
        };
      }

      // Build enhanced request based on market type
      const enhancedRequest = this.buildEnhancedRequest(request, validation);

      // Create commitment using enhanced service
      return await EnhancedCommitmentService.createCommitment(enhancedRequest);

    } catch (error) {
      console.error('[COMMITMENT_CREATION_SERVICE] Error creating commitment:', error);
      
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
   * Create commitment for existing PredictionCommitment component
   * 
   * This method maintains exact compatibility with the existing component API
   * while internally using the enhanced service for better functionality.
   */
  static async createCommitmentForComponent(
    userId: string,
    predictionId: string,
    position: 'yes' | 'no',
    optionId: string,
    tokensToCommit: number,
    clientInfo?: { source?: 'web' | 'mobile' | 'api'; ipAddress?: string; userAgent?: string }
  ): Promise<string> {
    const request: CommitmentRequest = {
      userId,
      marketId: predictionId,
      position,
      optionId,
      tokensToCommit,
      clientInfo
    };

    const result = await this.createCommitment(request);
    
    if (result.success && result.commitmentId) {
      return result.commitmentId;
    } else {
      throw new Error(result.error?.message || 'Failed to create commitment');
    }
  }

  /**
   * Validate commitment request and detect market type
   */
  private static async validateAndDetectMarketType(request: CommitmentRequest): Promise<CommitmentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Fetch market to determine type
      const marketDoc = await getDoc(doc(db, 'markets', request.marketId));
      if (!marketDoc.exists()) {
        return {
          isValid: false,
          errors: [`Market not found: ${request.marketId}`],
          warnings: [],
          marketType: 'binary'
        };
      }

      const market = { id: marketDoc.id, ...marketDoc.data() } as Market;

      // Ensure market has options
      if (!market.options || market.options.length === 0) {
        market.options = [
          { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
          { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
        ];
        warnings.push('Market options were auto-generated for legacy market');
      }

      // Determine market type
      const marketType: 'binary' | 'multi-option' = market.options.length === 2 ? 'binary' : 'multi-option';

      // Validate based on market type
      if (marketType === 'binary') {
        // Binary market validation
        if (!request.position || !['yes', 'no'].includes(request.position)) {
          errors.push('Position must be "yes" or "no" for binary markets');
        }

        // Recommend optionId based on position
        const recommendedOptionId = request.position === 'yes' ? market.options[0].id : market.options[1].id;

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          marketType,
          recommendedOptionId
        };
      } else {
        // Multi-option market validation
        if (request.optionId) {
          // Direct optionId targeting
          const targetOption = market.options.find(opt => opt.id === request.optionId);
          if (!targetOption) {
            errors.push(`Option not found: ${request.optionId}`);
          }
        } else if (request.position) {
          // Legacy position targeting
          if (request.position === 'yes' && market.options[0]) {
            warnings.push('Using first option for "yes" position in multi-option market');
          } else if (request.position === 'no' && market.options[1]) {
            warnings.push('Using second option for "no" position in multi-option market');
          } else {
            errors.push('Invalid position for multi-option market');
          }
        } else {
          errors.push('Either optionId or position must be specified for multi-option markets');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          marketType,
          recommendedOptionId: request.optionId || (request.position === 'yes' ? market.options[0]?.id : market.options[1]?.id)
        };
      }

    } catch (error) {
      console.error('[COMMITMENT_CREATION_SERVICE] Validation error:', error);
      return {
        isValid: false,
        errors: ['Validation failed due to system error'],
        warnings: [],
        marketType: 'binary'
      };
    }
  }

  /**
   * Build enhanced request from validated input
   */
  private static buildEnhancedRequest(
    request: CommitmentRequest,
    validation: CommitmentValidationResult
  ): EnhancedCommitmentRequest {
    const enhancedRequest: EnhancedCommitmentRequest = {
      userId: request.userId,
      predictionId: request.marketId,
      marketId: request.marketId,
      tokensToCommit: request.tokensToCommit,
      clientInfo: request.clientInfo
    };

    // Set targeting based on market type and available data
    if (validation.marketType === 'binary') {
      // Binary market: maintain position-based targeting
      enhancedRequest.position = request.position;
      enhancedRequest.optionId = validation.recommendedOptionId;
    } else {
      // Multi-option market: prefer optionId targeting
      enhancedRequest.optionId = request.optionId || validation.recommendedOptionId;
      // Derive position for backward compatibility
      enhancedRequest.position = request.position || (request.optionId === validation.recommendedOptionId ? 'yes' : 'no');
    }

    return enhancedRequest;
  }

  /**
   * Validate commitment request without creating it
   * Useful for pre-validation in UI components
   */
  static async validateCommitmentRequest(request: CommitmentRequest): Promise<CommitmentValidationResult> {
    return await this.validateAndDetectMarketType(request);
  }

  /**
   * Get market type for a given market ID
   * Useful for UI components to adapt their interface
   */
  static async getMarketType(marketId: string): Promise<'binary' | 'multi-option' | null> {
    try {
      const marketDoc = await getDoc(doc(db, 'markets', marketId));
      if (!marketDoc.exists()) {
        return null;
      }

      const market = { id: marketDoc.id, ...marketDoc.data() } as Market;
      
      if (!market.options || market.options.length === 0) {
        return 'binary'; // Default for legacy markets
      }

      return market.options.length === 2 ? 'binary' : 'multi-option';
    } catch (error) {
      console.error('[COMMITMENT_CREATION_SERVICE] Error getting market type:', error);
      return null;
    }
  }

  /**
   * Get available options for a market
   * Useful for UI components to display option choices
   */
  static async getMarketOptions(marketId: string): Promise<Array<{ id: string; text: string; totalTokens: number }> | null> {
    try {
      const marketDoc = await getDoc(doc(db, 'markets', marketId));
      if (!marketDoc.exists()) {
        return null;
      }

      const market = { id: marketDoc.id, ...marketDoc.data() } as Market;
      
      if (!market.options || market.options.length === 0) {
        // Return default binary options for legacy markets
        return [
          { id: 'yes', text: 'Yes', totalTokens: 0 },
          { id: 'no', text: 'No', totalTokens: 0 }
        ];
      }

      return market.options.map(option => ({
        id: option.id,
        text: option.text || option.name || `Option ${option.id}`,
        totalTokens: option.totalTokens || 0
      }));
    } catch (error) {
      console.error('[COMMITMENT_CREATION_SERVICE] Error getting market options:', error);
      return null;
    }
  }

  /**
   * Legacy method for backward compatibility with existing code
   * Wraps the PredictionCommitmentService.createCommitment method
   */
  static async createLegacyCommitment(commitmentData: Omit<PredictionCommitment, 'id' | 'committedAt'>): Promise<string> {
    return await PredictionCommitmentService.createCommitment(commitmentData);
  }
}