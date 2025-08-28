# Requirements Document

## Introduction

This feature enhances the market detail view to provide users with meaningful, real-time data about market commitments, odds, potential payouts, and engagement metrics. The goal is to create a compelling prediction experience that shows users exactly what they stand to gain and helps them make informed decisions about backing their opinions with tokens.

## Requirements

### Requirement 1

**User Story:** As a user viewing a market, I want to see how many tokens have been committed to each option, so that I can understand the current market sentiment and make informed decisions.

#### Acceptance Criteria

1. WHEN a user views a market detail page THEN the system SHALL display the total token amount committed to each prediction option
2. WHEN tokens are committed to an option THEN the system SHALL update the commitment totals in real-time
3. WHEN displaying commitment amounts THEN the system SHALL show both absolute numbers and percentages of total market commitment
4. WHEN no tokens have been committed to an option THEN the system SHALL display "0 tokens committed" clearly

### Requirement 2

**User Story:** As a user considering making a commitment, I want to see the current odds for each option, so that I can understand the risk and potential reward.

#### Acceptance Criteria

1. WHEN a user views prediction options THEN the system SHALL calculate and display current odds based on token commitments
2. WHEN odds change due to new commitments THEN the system SHALL update the displayed odds in real-time
3. WHEN displaying odds THEN the system SHALL use a clear format (e.g., "3:1" or "25%" probability)
4. WHEN market has no commitments THEN the system SHALL show equal odds for all options

### Requirement 3

**User Story:** As a user about to commit tokens, I want to see exactly how many tokens I could win based on my commitment amount, so that I can evaluate the potential return on my prediction.

#### Acceptance Criteria

1. WHEN a user enters a commitment amount THEN the system SHALL calculate and display potential payout in real-time
2. WHEN market odds change THEN the system SHALL update potential payout calculations immediately
3. WHEN displaying potential payouts THEN the system SHALL show both gross payout and net profit
4. WHEN commitment would result in minimal payout THEN the system SHALL warn the user about low returns

### Requirement 4

**User Story:** As a user exploring markets, I want to see meaningful engagement metrics, so that I can identify active and interesting markets to participate in.

#### Acceptance Criteria

1. WHEN viewing market statistics THEN the system SHALL display actual participant count instead of placeholder numbers
2. WHEN showing engagement metrics THEN the system SHALL include total committed tokens, number of unique participants, and recent activity
3. WHEN displaying market activity THEN the system SHALL show commitment trends over time
4. WHEN market has high engagement THEN the system SHALL highlight it as a "trending" or "active" market

### Requirement 5

**User Story:** As a user making predictions, I want to see how market dynamics change as more people participate, so that I can time my commitments strategically.

#### Acceptance Criteria

1. WHEN viewing market timeline THEN the system SHALL show commitment events with amounts and impact on odds
2. WHEN new commitments are made THEN the system SHALL update the timeline in real-time
3. WHEN displaying commitment history THEN the system SHALL show how each commitment affected the overall market odds
4. WHEN market approaches resolution THEN the system SHALL highlight final commitment opportunities

### Requirement 6

**User Story:** As a user on mobile, I want the enhanced market view to be touch-friendly and accessible, so that I can easily interact with commitment options and view detailed information.

#### Acceptance Criteria

1. WHEN using the market view on mobile THEN the system SHALL ensure all interactive elements meet 44px minimum touch target requirements
2. WHEN viewing odds and payouts THEN the system SHALL provide clear visual hierarchy and readable text sizes
3. WHEN committing tokens THEN the system SHALL provide haptic feedback and clear confirmation states
4. WHEN screen reader is active THEN the system SHALL announce odds changes and payout calculations

### Requirement 7

**User Story:** As a user comparing different commitment amounts, I want to see how my potential commitment would affect the market odds, so that I can understand my impact on the market.

#### Acceptance Criteria

1. WHEN a user adjusts their commitment amount THEN the system SHALL show preview of how odds would change
2. WHEN commitment would significantly impact odds THEN the system SHALL highlight this effect to the user
3. WHEN displaying market impact preview THEN the system SHALL show both current and projected odds side by side
4. WHEN user has insufficient tokens THEN the system SHALL clearly indicate maximum possible commitment and resulting payout