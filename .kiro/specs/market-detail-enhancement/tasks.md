# Implementation Plan

- [x] 1. Create market utility functions for odds and statistics calculations
  - Create `lib/utils/market-utils.ts` with simple odds calculation functions
  - Implement `calculateOdds()` function that works with existing Market data
  - Implement `calculatePayout()` function for potential winnings
  - Implement `getRealStats()` function to replace mock statistics
  - Add unit tests for all calculation functions
  - _Requirements: 2.1, 2.2, 4.1_

- [x] 2. Enhance prediction option cards to show odds and commitment amounts
  - Update option cards in `MarketDetailView` to display current odds
  - Show actual committed token amounts instead of just percentages
  - 
  - Format large token amounts with proper number formatting
  - _Requirements: 1.1, 1.3, 2.1, 2.3_

- [x] 3. Replace mock statistics with real data calculations
  - Update `MarketStatistics` component to use `MarketUtils.getRealStats()`
  - Replace hardcoded engagement percentages with calculated values
  - Show real participant distribution based on actual market data
  - Display actual competitiveness metrics based on token distribution
  - Remove placeholder "Market Insights" section with fake data
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Enhance commitment flow with payout calculations
  - Update `PredictionCommitment` component to show potential payout
  - Display "You could win X tokens" based on current odds
  - Show ROI percentage for the commitment amount
  - Update commitment preview to include odds information
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Add commitment amount display to option cards
  - Show "X tokens committed" on each prediction option
  - Display number of supporters based on actual participant data
  - Update progress bars to reflect real commitment distribution
  - Add visual indicators for highly committed vs. less committed options
  - _Requirements: 1.1, 1.2, 4.2_

- [ ] 6. Implement odds preview for commitment impact
  - Show how user's potential commitment would affect odds
  - Display "Odds would become X.X:1" when user enters commitment amount
  - Add simple preview of market impact (minimal/moderate/significant)
  - Update commitment modal to show before/after odds comparison
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 7. Add error handling and edge case management
  - Handle markets with zero commitments (show default odds)
  - Add validation for calculation results (ensure odds are reasonable)
  - Implement fallback to existing behavior if calculations fail
  - Add error boundaries around new calculation components
  - _Requirements: 1.4, 2.4, 3.4_

- [ ] 8. Improve mobile accessibility for new features
  - Ensure odds display is readable on mobile screens
  - Make commitment amount text touch-friendly
  - Add proper ARIA labels for odds and payout information
  - Test screen reader compatibility with new data displays
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 9. Add visual polish and formatting improvements
  - Format token amounts with proper thousands separators
  - Add subtle animations for odds changes
  - Improve visual hierarchy of commitment information
  - Add color coding for different odds ranges (high/medium/low)
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 10. Test and validate the enhanced market experience
  - Create test scenarios with different market states
  - Verify odds calculations match expected prediction market behavior
  - Test commitment flow with real payout calculations
  - Validate that existing functionality still works correctly
  - _Requirements: All requirements validation_