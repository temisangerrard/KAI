# Design Document

## Overview

This design enhances the existing market detail view by replacing placeholder statistics with real data and adding odds/payout information. The approach builds directly on the current working implementation without breaking existing functionality.

## Architecture

### Simple Enhancement Strategy

Build on existing components:
- **MarketDetailView**: Add odds display to existing prediction options
- **MarketStatistics**: Replace mock data with real calculations from market data
- **PredictionCommitment**: Show potential payout based on current odds

### Data Flow

1. Use existing Market interface and data loading (no changes)
2. Add simple utility functions for odds and payout calculations
3. Enhance existing UI components to display calculated data

## Components and Interfaces

### Market Utility Functions

```typescript
// Simple utility functions that work with existing Market data
export const MarketUtils = {
  // Calculate basic odds from market.options data
  calculateOdds(market: Market): Record<string, number> {
    const totalTokens = market.totalTokens || 1
    const odds: Record<string, number> = {}
    
    market.options.forEach(option => {
      if (option.tokens === 0) {
        odds[option.id] = 5.0 // Default odds for no commitments
      } else {
        // Simple odds calculation: total pool / option tokens
        odds[option.id] = Math.max(1.1, totalTokens / option.tokens)
      }
    })
    
    return odds
  },
  
  // Calculate potential payout for user commitment
  calculatePayout(tokensToCommit: number, optionId: string, market: Market): number {
    const odds = this.calculateOdds(market)
    return Math.floor(tokensToCommit * odds[optionId])
  },
  
  // Calculate real statistics from existing market data
  getRealStats(market: Market) {
    return {
      averageCommitment: market.participants > 0 ? 
        Math.round(market.totalTokens / market.participants) : 0,
      mostPopularOption: market.options.reduce((prev, current) => 
        prev.tokens > current.tokens ? prev : current),
      competitiveness: this.calculateCompetitiveness(market)
    }
  },
  
  // Simple competitiveness calculation
  calculateCompetitiveness(market: Market): number {
    if (market.options.length < 2) return 0
    const maxTokens = Math.max(...market.options.map(o => o.tokens))
    return maxTokens > 0 ? 100 - Math.round((maxTokens / market.totalTokens) * 100) : 50
  }
}
```

## Implementation Approach

### Phase 1: Replace Mock Data with Real Calculations
1. Create `lib/utils/market-utils.ts` with odds and statistics calculations
2. Update `MarketStatistics` component to use real data instead of mock values
3. Add odds display to existing prediction option cards

### Phase 2: Enhanced Commitment Experience  
1. Update `PredictionCommitment` component to show potential payout
2. Add odds information to commitment flow
3. Display commitment amounts on option cards

### Phase 3: Visual Improvements
1. Add better visual indicators for market competitiveness
2. Improve commitment amount display formatting


## Key Changes to Existing Components

### MarketDetailView Enhancements
- Add odds display to existing option cards
- Show actual committed token amounts
- Display potential payout when hovering over "Back This Opinion" buttons

### MarketStatistics Improvements
- Replace mock engagement percentages with real calculations
- Show actual participant distribution
- Display real competitiveness metrics based on token distribution

### PredictionCommitment Updates
- Calculate and display potential payout based on current odds
- Show how user's commitment affects their potential return
- Add simple ROI calculation

## Error Handling

Simple error handling for edge cases:
- Handle markets with zero commitments (show default odds)
- Validate calculation results (ensure odds are reasonable)
- Fallback to existing behavior if calculations fail

## Testing Strategy

- Unit tests for odds calculation functions
- Test edge cases (zero commitments, single option markets)
- Verify calculations match expected prediction market behavior

This simplified approach focuses on enhancing the user experience with real data while building directly on the existing, working implementation.