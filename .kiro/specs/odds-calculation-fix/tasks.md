# Implementation Plan

- [x] 1. Examine current market calculation logic and identify inconsistencies
  - Review existing `lib/utils/market-utils.ts` and `calculateOdds` function
  - Identify where `participantCount` is used instead of `totalTokens` for calculations
  - Document current data flow from commitment → market stats → display
  - _Requirements: 4.1, 4.2_

- [x] 2. Fix existing market-utils calculateOdds function
  - Update `calculateOdds` function to use `option.totalTokens` instead of `participantCount`
  - Ensure odds calculation uses proper formula: `totalTokensInMarket / optionTokens`
  - Maintain backward compatibility with existing Market interface
  - Add unit tests for the updated calculation logic
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ] 3. Fix percentage calculation in market-detail-view component
  - Update percentage calculation to use `option.tokens / market.totalTokens` consistently
  - Remove any references to `participantCount` in percentage calculations
  - Ensure percentages are calculated from actual token commitments
  - Test with existing market data to ensure no breaking changes
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 4. Update OptimizedMarketService calculateOdds method
  - Fix the `calculateOdds` method in `OptimizedMarketService` to use proper token-based formula
  - Ensure consistency between service layer and utility layer calculations
  - Update the odds calculation to match prediction market standards
  - Verify the method works with existing market data structure
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 5. Fix potential winnings calculation in PredictionCommitment component
  - Update the potential winnings calculation to use proper pool-based math
  - Replace simple `tokensToCommit * odds` with pool simulation logic
  - Account for user's stake being added to the pool before calculating share
Ensure calculation matches what users will actually receive on market resolution considering the pool size after their commitment is added (simulating the continuous increment of the pool)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. Update market detail view display logic
  - Fix the display to show "X tokens committed" instead of mixing participant counts
  - Add proper odds display next to each option (currently missing or inconsistent)
  - Ensure the component uses `option.tokens` consistently for all calculations
  - Remove debug logging and clean up the calculation logic
  - _Requirements: 1.3, 2.1, 4.4_

- [ ] 7. Update prediction commitment modal
  - Integrate potential winnings calculation with real-time updates
  - Display both potential payout and profit separately in modal
  - Show effective odds for user's specific bet amount
  - Add input validation using new validation utilities
  - _Requirements: 3.1, 3.3, 3.4_

- [ ] 8. Update market statistics components
  - Replace all participant-based metrics with token-based equivalents
  - Add total value locked (TVL) display using sum of all option tokens
  - Update any remaining references to participant counts
  - Ensure consistent token amount formatting across components
  - _Requirements: 1.3, 4.4_

- [ ] 9. Create comprehensive unit tests
  - Test percentage calculations with various token distributions (0, equal, unequal)
  - Test odds calculations including edge cases (zero tokens, single option)
  - Test potential winnings with different stake amounts and market states
  - Test validation functions for input sanitization and error handling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Create integration tests with realistic scenarios
  - Test binary market scenario: 300/700 token split with expected 30%/70% and 3.33x/1.43x odds
  - Test user betting 100 tokens on minority option expecting ~275 token payout
  - Test multi-option market with three options and various token distributions
  - Verify that displayed odds match calculated effective odds after betting
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 11. Add error handling and edge case management
  - Implement graceful handling of empty markets with default values
  - Add protection against division by zero in odds calculations
  - Ensure rounding errors don't cause percentage totals to deviate from 100%
  - Add user-friendly error messages for invalid stake amounts
  - _Requirements: 1.2, 2.4, 5.5_

- [ ] 12. Verify market resolution works with corrected calculations
  - Test that the `resolveMarket` function in OptimizedMarketService works correctly
  - Ensure payout calculations use the same token-based logic as odds calculations
  - Verify that users receive correct payouts based on their token share of winning pool
  - Test end-to-end flow: commitment → odds display → market resolution → payout
  - _Requirements: 4.4, 1.3, 5.3_