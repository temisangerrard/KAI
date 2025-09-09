/**
 * Commitment Compatibility Utilities
 * 
 * Helper functions to convert between binary positions and option IDs
 * for backward compatibility during the multi-option migration.
 */

import { Market, MarketOption } from '@/lib/types/database';
import { PredictionCommitment } from '@/lib/types/token';

/**
 * Convert binary position to option ID based on market structure
 * 
 * @param position - Binary position ('yes' | 'no')
 * @param market - Market with options array
 * @returns Option ID corresponding to the position
 */
export function positionToOptionId(
  position: 'yes' | 'no', 
  market: Market
): string {
  if (!market.options || market.options.length === 0) {
    throw new Error(`Market ${market.id} has no options defined`);
  }
  
  // Standard mapping: 'yes' = first option, 'no' = second option
  if (position === 'yes') {
    return market.options[0].id;
  } else {
    // For 'no' position, use second option if available, otherwise first option
    return market.options.length > 1 ? market.options[1].id : market.options[0].id;
  }
}

/**
 * Convert option ID to binary position based on market structure
 * 
 * @param optionId - Option ID to convert
 * @param market - Market with options array
 * @returns Binary position ('yes' | 'no')
 */
export function optionIdToPosition(
  optionId: string, 
  market: Market
): 'yes' | 'no' {
  if (!market.options || market.options.length === 0) {
    throw new Error(`Market ${market.id} has no options defined`);
  }
  
  // Find the option index
  const optionIndex = market.options.findIndex(option => option.id === optionId);
  
  if (optionIndex === -1) {
    throw new Error(`Option ${optionId} not found in market ${market.id}`);
  }
  
  // Standard mapping: first option = 'yes', all others = 'no'
  return optionIndex === 0 ? 'yes' : 'no';
}

/**
 * Get the option ID from a commitment, handling both legacy and new formats
 * 
 * @param commitment - Commitment record (may have optionId or just position)
 * @param market - Market with options array
 * @returns Option ID for the commitment
 */
export function getCommitmentOptionId(
  commitment: PredictionCommitment, 
  market: Market
): string {
  // If commitment already has optionId, use it directly
  if (commitment.optionId) {
    return commitment.optionId;
  }
  
  // For legacy commitments, derive optionId from position
  if (commitment.position) {
    return positionToOptionId(commitment.position, market);
  }
  
  throw new Error(`Commitment ${commitment.id} has neither optionId nor position`);
}

/**
 * Get the binary position from a commitment, handling both legacy and new formats
 * 
 * @param commitment - Commitment record (may have position or just optionId)
 * @param market - Market with options array
 * @returns Binary position for the commitment
 */
export function getCommitmentPosition(
  commitment: PredictionCommitment, 
  market: Market
): 'yes' | 'no' {
  // If commitment already has position, use it directly
  if (commitment.position) {
    return commitment.position;
  }
  
  // For new commitments, derive position from optionId
  if (commitment.optionId) {
    return optionIdToPosition(commitment.optionId, market);
  }
  
  throw new Error(`Commitment ${commitment.id} has neither position nor optionId`);
}

/**
 * Ensure a commitment has both optionId and position fields for compatibility
 * 
 * @param commitment - Commitment record to enhance
 * @param market - Market with options array
 * @returns Enhanced commitment with both optionId and position
 */
export function ensureCommitmentCompatibility(
  commitment: PredictionCommitment, 
  market: Market
): PredictionCommitment {
  const enhanced = { ...commitment };
  
  // Ensure optionId is present
  if (!enhanced.optionId && enhanced.position) {
    enhanced.optionId = positionToOptionId(enhanced.position, market);
  }
  
  // Ensure position is present
  if (!enhanced.position && enhanced.optionId) {
    enhanced.position = optionIdToPosition(enhanced.optionId, market);
  }
  
  // Ensure marketId is present (alias for predictionId)
  if (!enhanced.marketId && enhanced.predictionId) {
    enhanced.marketId = enhanced.predictionId;
  }
  
  return enhanced;
}

/**
 * Check if a market is binary (2 options) or multi-option (3+ options)
 * 
 * @param market - Market to check
 * @returns True if market has exactly 2 options (binary), false otherwise
 */
export function isBinaryMarket(market: Market): boolean {
  return market.options && market.options.length === 2;
}

/**
 * Check if a market supports multi-option commitments
 * 
 * @param market - Market to check
 * @returns True if market has 3 or more options
 */
export function isMultiOptionMarket(market: Market): boolean {
  return market.options && market.options.length > 2;
}

/**
 * Get option text for display purposes
 * 
 * @param optionId - Option ID to look up
 * @param market - Market with options array
 * @returns Human-readable option text
 */
export function getOptionText(optionId: string, market: Market): string {
  const option = market.options?.find(opt => opt.id === optionId);
  return option?.text || `Option ${optionId}`;
}

/**
 * Validate that an option ID exists in a market
 * 
 * @param optionId - Option ID to validate
 * @param market - Market with options array
 * @returns True if option exists, false otherwise
 */
export function isValidOptionId(optionId: string, market: Market): boolean {
  return market.options?.some(option => option.id === optionId) || false;
}

/**
 * Get all option IDs for a market
 * 
 * @param market - Market with options array
 * @returns Array of option IDs
 */
export function getMarketOptionIds(market: Market): string[] {
  return market.options?.map(option => option.id) || [];
}

/**
 * Create enhanced metadata for new commitments with multi-option support
 * 
 * @param market - Market being committed to
 * @param optionId - Selected option ID
 * @param existingMetadata - Existing metadata to enhance (optional)
 * @returns Enhanced metadata with multi-option support
 */
export function createEnhancedMetadata(
  market: Market,
  optionId: string,
  existingMetadata?: Partial<PredictionCommitment['metadata']>
): PredictionCommitment['metadata'] {
  const selectedOption = market.options?.find(opt => opt.id === optionId);
  
  // Calculate option-level statistics
  const optionOdds: { [optionId: string]: number } = {};
  const optionTokens: { [optionId: string]: number } = {};
  const optionParticipants: { [optionId: string]: number } = {};
  
  market.options?.forEach(option => {
    optionOdds[option.id] = option.odds || 1.0;
    optionTokens[option.id] = option.totalTokens || 0;
    optionParticipants[option.id] = option.participantCount || 0;
  });
  
  // Create legacy binary odds for backward compatibility
  const firstOption = market.options?.[0];
  const secondOption = market.options?.[1];
  
  return {
    // Existing metadata fields
    marketStatus: market.status,
    marketTitle: market.title,
    marketEndsAt: market.endsAt,
    
    // Enhanced odds snapshot with both legacy and new formats
    oddsSnapshot: {
      // Legacy binary odds (for backward compatibility)
      yesOdds: firstOption?.odds || 1.0,
      noOdds: secondOption?.odds || 1.0,
      totalYesTokens: firstOption?.totalTokens || 0,
      totalNoTokens: secondOption?.totalTokens || 0,
      totalParticipants: market.totalParticipants || 0,
      
      // New multi-option odds
      optionOdds,
      optionTokens,
      optionParticipants,
    },
    
    // Enhanced option context
    selectedOptionText: selectedOption?.text || `Option ${optionId}`,
    marketOptionCount: market.options?.length || 0,
    
    // Preserve existing metadata
    ...existingMetadata,
  };
}

/**
 * Migration helper: Convert legacy binary commitment to enhanced format
 * 
 * @param legacyCommitment - Legacy commitment with only position field
 * @param market - Market with options array
 * @returns Enhanced commitment with optionId and enhanced metadata
 */
export function migrateLegacyCommitment(
  legacyCommitment: PredictionCommitment,
  market: Market
): PredictionCommitment {
  // Derive optionId from position
  const optionId = positionToOptionId(legacyCommitment.position, market);
  
  // Create enhanced metadata while preserving existing data
  const enhancedMetadata = createEnhancedMetadata(
    market,
    optionId,
    legacyCommitment.metadata
  );
  
  return {
    ...legacyCommitment,
    optionId,
    marketId: legacyCommitment.predictionId,
    metadata: enhancedMetadata,
  };
}