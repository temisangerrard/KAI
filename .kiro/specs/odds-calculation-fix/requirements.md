# Requirements Document

## Introduction

The KAI prediction platform currently uses incorrect odds calculation based on participant counts instead of actual token amounts staked. This creates inaccurate market representation that doesn't reflect real prediction market mechanics like Polymarket. The fix involves switching to token-based calculations for percentages, odds, and potential winnings to provide users with accurate market information and fair payout calculations.

## Requirements

### Requirement 1

**User Story:** As a user viewing market predictions, I want to see percentages based on actual token distribution, so that I can understand the real market sentiment based on financial commitment.

#### Acceptance Criteria

1. WHEN viewing a market THEN the system SHALL display percentages calculated from total tokens staked per option, not participant counts
2. WHEN a market has no tokens staked THEN the system SHALL display equal percentages across all options (e.g., 50%/50% for binary markets)
3. WHEN viewing market statistics THEN the system SHALL show "X tokens committed" instead of "X participants"
4. WHEN calculating percentages THEN the system SHALL ensure all option percentages add up to 100%

### Requirement 2

**User Story:** As a user considering a prediction, I want to see accurate odds for each option, so that I can make informed decisions about potential returns.

#### Acceptance Criteria

1. WHEN viewing market options THEN the system SHALL display odds in "X.Xx" format (e.g., "2.3x odds")
2. WHEN an option has more tokens staked THEN the system SHALL show lower odds for that option
3. WHEN an option has fewer tokens staked THEN the system SHALL show higher odds for that option
4. WHEN a market has no tokens staked THEN the system SHALL display default odds equal to the number of options (e.g., 2.0x for binary market)
5. WHEN calculating odds THEN the system SHALL use the formula: odds = totalTokensInMarket / optionTokensStaked

### Requirement 3

**User Story:** As a user making a prediction commitment, I want to see accurate potential winnings, so that I understand exactly what I could earn if my prediction is correct.

#### Acceptance Criteria

1. WHEN entering a token amount to commit THEN the system SHALL show potential payout based on pool distribution mechanics
2. WHEN calculating potential winnings THEN the system SHALL use the formula: userShare = userStake / newOptionTokens, potentialPayout = userShare × newTotalTokens
3. WHEN displaying potential winnings THEN the system SHALL show both total payout and profit separately
4. WHEN showing odds in commitment modal THEN the system SHALL display odds as potentialPayout / userStake
5. WHEN calculating winnings THEN the system SHALL account for the user's stake being added to the pool

### Requirement 4

**User Story:** As a developer maintaining the system, I want the data structure to properly track token amounts, so that all calculations are based on accurate financial data.

#### Acceptance Criteria

1. WHEN storing market option data THEN the system SHALL track totalTokensStaked as the primary metric
2. WHEN a user makes a commitment THEN the system SHALL update the option's totalTokensStaked amount
3. WHEN retrieving market data THEN the system SHALL calculate totals from actual token commitments, not participant counts
4. WHEN displaying market information THEN the system SHALL derive all statistics from token amounts, not user counts

### Requirement 5

**User Story:** As a user viewing market data, I want to see accurate calculations with real market scenarios, so that I can verify the system works correctly with actual trading data.

#### Acceptance Criteria

1. WHEN viewing a market with real token distribution THEN the system SHALL display accurate percentages based on actual stakes
2. WHEN viewing odds for real markets THEN the system SHALL show correct odds calculations reflecting true market conditions
3. WHEN users make actual commitments THEN the system SHALL calculate precise payouts based on real pool distributions
4. WHEN validating calculations THEN the displayed odds SHALL accurately match the actual payout ratios for real trades
5. WHEN handling real market data THEN the system SHALL process all edge cases including markets with minimal or zero token activity
