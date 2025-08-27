# Requirements Document

## Introduction

The KAI prediction platform currently has issues with token commitment functionality and lacks basic admin visibility into market commitments. Users are experiencing problems when trying to commit tokens to markets, and administrators cannot see which tokens are committed to which markets. This feature will fix the token commitment process and provide essential admin analytics.

## Requirements

### Requirement 1

**User Story:** As a user, I want to successfully commit tokens to markets, so that I can participate in predictions without errors.

#### Acceptance Criteria

1. WHEN a user clicks "Back This Opinion" on a market THEN the system SHALL open a functional commitment modal
2. WHEN a user enters a valid token amount and clicks commit THEN the system SHALL successfully process the commitment
3. WHEN a commitment is successful THEN the system SHALL update the user's balance and show confirmation
4. WHEN a commitment fails THEN the system SHALL display a clear error message explaining the issue
5. IF a user has insufficient tokens THEN the system SHALL prevent commitment and show available balance

### Requirement 2

**User Story:** As an admin, I want to view basic commitment data for markets, so that I can understand which markets have token activity.

#### Acceptance Criteria

1. WHEN an admin navigates to the admin token section THEN the system SHALL provide a "Market Commitments" view
2. WHEN viewing market commitments THEN the system SHALL display a list of markets with basic commitment statistics
3. WHEN viewing a market's data THEN the system SHALL show total tokens committed, number of participants, and yes/no position breakdown
4. WHEN an admin selects a market THEN the system SHALL show individual commitments for that market
5. IF a market has no commitments THEN the system SHALL display "No commitments yet"

### Requirement 3

**User Story:** As an admin, I want to see individual commitment details, so that I can verify the token commitment system is working correctly.

#### Acceptance Criteria

1. WHEN viewing market commitments THEN the system SHALL display each commitment with user ID, token amount, position, and timestamp
2. WHEN viewing commitments THEN the system SHALL show commitment status (active, won, lost, refunded)
3. WHEN a commitment is displayed THEN the system SHALL show the odds at time of commitment
4. WHEN viewing commitment details THEN the system SHALL display potential winnings calculated at commitment time
5. IF commitment data is missing THEN the system SHALL show "Data unavailable" instead of errors

### Requirement 4

**User Story:** As an admin, I want basic market analytics, so that I can monitor the health of the token economy.

#### Acceptance Criteria

1. WHEN viewing market commitments THEN the system SHALL display total tokens committed across all markets
2. WHEN viewing analytics THEN the system SHALL show the number of active commitments vs resolved commitments
3. WHEN viewing market data THEN the system SHALL display average commitment size for each market
4. WHEN analytics are shown THEN the system SHALL include simple position distribution (percentage yes vs no)
5. IF no commitment data exists THEN the system SHALL display "No data available" message