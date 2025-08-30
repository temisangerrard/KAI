# Requirements Document

## Introduction

Market resolution is a critical feature that determines the outcome of prediction markets, processes payouts to winners, and maintains platform integrity. The system must handle various resolution scenarios including manual admin resolution, automatic resolution based on external data sources, dispute handling, and edge cases like cancelled or invalid markets. This feature ensures fair and transparent outcomes while maintaining user trust in the platform.

## Requirements

### Requirement 1: Admin Market Resolution Interface

**User Story:** As a platform administrator, I want to manually resolve markets with clear outcome selection, so that I can ensure accurate and fair market outcomes.

#### Acceptance Criteria

1. WHEN an admin accesses the market resolution interface THEN the system SHALL display all markets eligible for resolution (status: active, closed, or pending_resolution)
2. WHEN an admin selects a market to resolve THEN the system SHALL show market details, all options, current token distribution, and participant counts
3. WHEN an admin selects a winning option THEN the system SHALL require confirmation before processing the resolution
4. WHEN an admin confirms resolution THEN the system SHALL validate the winning option exists and update market status to 'resolved'
5. IF a market has no commitments THEN the system SHALL allow resolution but skip payout processing
6. WHEN resolution is complete THEN the system SHALL log the resolution action with admin ID, timestamp, and winning option

### Requirement 2: Automated Payout Processing

**User Story:** As a user who made correct predictions, I want to automatically receive my winnings when markets are resolved, so that I can access my earned tokens immediately.

#### Acceptance Criteria

1. WHEN a market is resolved THEN the system SHALL calculate payouts for all winning commitments using proportional distribution
2. WHEN calculating payouts THEN the system SHALL use the formula: user_payout = user_stake + (losing_pool * user_stake / winning_pool)
3. WHEN processing payouts THEN the system SHALL update user balances atomically to prevent double-spending or lost tokens
4. WHEN a user wins THEN the system SHALL move tokens from committed to available balance and record the transaction
5. WHEN a user loses THEN the system SHALL remove committed tokens and update their total spent amount
6. IF payout processing fails for any user THEN the system SHALL rollback the entire resolution and log the error

### Requirement 3: Market Status and Lifecycle Management

**User Story:** As a platform user, I want to see clear market status updates throughout the resolution process, so that I understand when outcomes are final.

#### Acceptance Criteria

1. WHEN a market reaches its end date THEN the system SHALL automatically update status from 'active' to 'closed'
2. WHEN a market is being resolved THEN the system SHALL update status to 'resolving' to prevent new commitments
3. WHEN resolution is complete THEN the system SHALL update status to 'resolved' with resolution timestamp
4. WHEN a market is cancelled THEN the system SHALL update status to 'cancelled' and refund all commitments
5. IF a market is disputed THEN the system SHALL update status to 'disputed' and halt further processing
6. WHEN status changes THEN the system SHALL emit real-time updates to all connected clients

### Requirement 4: Resolution Validation and Error Handling

**User Story:** As a platform administrator, I want the system to validate resolution actions and handle errors gracefully, so that market integrity is maintained.

#### Acceptance Criteria

1. WHEN resolving a market THEN the system SHALL validate the market exists and is in a resolvable state
2. WHEN selecting a winning option THEN the system SHALL validate the option ID exists in the market
3. WHEN processing resolution THEN the system SHALL use database transactions to ensure atomicity
4. IF resolution fails THEN the system SHALL rollback all changes and maintain original market state
5. WHEN validation fails THEN the system SHALL return clear error messages to the administrator
6. IF database errors occur THEN the system SHALL log detailed error information for debugging

### Requirement 5: Resolution History and Audit Trail

**User Story:** As a platform administrator, I want to track all resolution actions and maintain an audit trail, so that I can review decisions and ensure accountability.

#### Acceptance Criteria

1. WHEN a market is resolved THEN the system SHALL create a resolution record with admin ID, timestamp, and outcome
2. WHEN resolution occurs THEN the system SHALL log all payout transactions with amounts and recipients
3. WHEN viewing resolution history THEN the system SHALL display chronological list of all resolutions
4. WHEN accessing audit details THEN the system SHALL show complete resolution information including before/after states
5. IF disputes arise THEN the system SHALL provide complete transaction history for investigation
6. WHEN exporting data THEN the system SHALL include resolution information in market analytics

### Requirement 6: Dispute and Appeal Process

**User Story:** As a user who disagrees with a market resolution, I want to submit a dispute with evidence, so that incorrect outcomes can be reviewed and corrected.

#### Acceptance Criteria

1. WHEN a market is resolved THEN users SHALL have 24 hours to submit disputes
2. WHEN submitting a dispute THEN users SHALL provide evidence and reasoning for the challenge
3. WHEN a dispute is submitted THEN the system SHALL notify administrators and update market status
4. WHEN reviewing disputes THEN administrators SHALL see original resolution details and dispute evidence
5. IF a dispute is upheld THEN the system SHALL reverse the original resolution and process new payouts
6. WHEN disputes are resolved THEN the system SHALL notify all affected users of the final outcome

### Requirement 7: Bulk Resolution and Automation

**User Story:** As a platform administrator, I want to resolve multiple markets efficiently and set up automated resolution rules, so that I can manage high volumes of markets effectively.

#### Acceptance Criteria

1. WHEN selecting multiple markets THEN the system SHALL allow batch resolution with the same outcome pattern
2. WHEN processing bulk resolutions THEN the system SHALL handle each market atomically and report individual results
3. WHEN setting automation rules THEN administrators SHALL define conditions for automatic resolution
4. WHEN automation triggers THEN the system SHALL resolve markets according to predefined rules
5. IF bulk processing fails THEN the system SHALL continue with remaining markets and report failures
6. WHEN automation runs THEN the system SHALL log all automatic resolutions for audit purposes

### Requirement 8: Integration with External Data Sources

**User Story:** As a platform administrator, I want to integrate with external data sources for automatic resolution, so that objective markets can be resolved without manual intervention.

#### Acceptance Criteria

1. WHEN configuring external sources THEN administrators SHALL specify API endpoints and data mapping rules
2. WHEN external data is available THEN the system SHALL automatically fetch and validate the information
3. WHEN data validation passes THEN the system SHALL resolve markets according to the external outcome
4. IF external data is unavailable THEN the system SHALL fall back to manual resolution process
5. WHEN using external data THEN the system SHALL log the source and data used for resolution
6. IF data conflicts occur THEN the system SHALL flag markets for manual review