# Requirements Document

## Introduction

The KAI Market Resolution System enables administrators to definitively resolve prediction markets and automatically distribute payouts to winning participants. This system ensures fair, transparent, and verifiable market outcomes while maintaining the integrity of the prediction platform through clear resolution criteria and evidence-based decision making.

## Requirements

### Requirement 1: Market Resolution Criteria

**User Story:** As a platform administrator, I want clear guidelines for what makes a market resolvable, so that I can ensure all markets can be definitively resolved with verifiable outcomes.

#### Acceptance Criteria

1. WHEN a market is created THEN the system SHALL enforce that it has a clear end date when the outcome will be known
2. WHEN a market is created THEN the system SHALL ensure only one option can be the correct outcome
3. WHEN a market is created THEN the system SHALL require that the outcome can be verified with external evidence
4. IF a market contains subjective language (best, worst, good, bad) THEN the system SHALL flag it for review
5. WHEN a market lacks a specific end date THEN the system SHALL reject the creation

### Requirement 2: Payout Calculation System

**User Story:** As a winning participant, I want to receive my fair share of the total market pool, so that my payout is proportional to my stake among all winners.

#### Acceptance Criteria

1. WHEN a market is resolved THEN the system SHALL calculate payouts where winners split the entire market pool proportionally
2. WHEN calculating payouts THEN the system SHALL use the formula: user_payout = (user_stake / total_winner_stakes) × total_market_pool
3. WHEN distributing payouts THEN the system SHALL ensure the sum of all payouts equals the total market pool
4. WHEN a user wins THEN the system SHALL record their original stake, payout amount, and profit separately
5. WHEN payout calculation fails THEN the system SHALL log the error and prevent resolution until fixed

### Requirement 3: Admin Resolution Interface

**User Story:** As a platform administrator, I want a comprehensive resolution interface, so that I can efficiently resolve markets with proper evidence and oversight.

#### Acceptance Criteria

1. WHEN accessing the resolution interface THEN the system SHALL display all markets past their end date awaiting resolution
2. WHEN resolving a market THEN the system SHALL require the admin to select exactly one winning option
3. WHEN resolving a market THEN the system SHALL mandate evidence including source URLs and descriptions
4. WHEN resolving a market THEN the system SHALL show a payout preview with winner count and distribution amounts
5. WHEN evidence is insufficient THEN the system SHALL prevent resolution until adequate proof is provided
6. WHEN resolution is completed THEN the system SHALL record the admin who performed the resolution and timestamp

### Requirement 4: Evidence and Audit Trail

**User Story:** As a platform user, I want to see the evidence and reasoning behind market resolutions, so that I can trust the fairness and accuracy of outcomes.

#### Acceptance Criteria

1. WHEN a market is resolved THEN the system SHALL store source URLs, screenshots, and written explanations
2. WHEN a resolution is completed THEN the system SHALL make the evidence publicly viewable
3. WHEN storing evidence THEN the system SHALL include the resolution date and admin identifier
4. WHEN displaying resolution details THEN the system SHALL show all evidence used in the decision
5. WHEN evidence files are uploaded THEN the system SHALL validate file types and store them securely

### Requirement 5: Market Creation Validation

**User Story:** As a market creator, I want real-time validation feedback, so that I can create markets that meet resolution criteria and avoid rejection.

#### Acceptance Criteria

1. WHEN creating a market title THEN the system SHALL check for subjective words and provide warnings
2. WHEN setting an end date THEN the system SHALL ensure it's in the future and within 12 months
3. WHEN adding market options THEN the system SHALL enforce 2-5 options with mutually exclusive outcomes
4. WHEN validation fails THEN the system SHALL provide specific guidance on how to fix the issues
5. WHEN a market meets all criteria THEN the system SHALL allow creation and mark it as resolvable

### Requirement 6: Automated Payout Distribution

**User Story:** As a winning participant, I want to receive my payout automatically after market resolution, so that I don't need to manually claim rewards.

#### Acceptance Criteria

1. WHEN a market is resolved THEN the system SHALL automatically calculate and distribute all payouts
2. WHEN distributing payouts THEN the system SHALL update user token balances immediately
3. WHEN payout distribution completes THEN the system SHALL record the transaction for each user
4. WHEN payout fails for any user THEN the system SHALL retry and log the failure for manual review
5. WHEN all payouts are processed THEN the system SHALL mark the resolution as completed

### Requirement 7: Resolution Status Tracking

**User Story:** As a platform administrator, I want to track the status of market resolutions, so that I can monitor the resolution process and handle any issues.

#### Acceptance Criteria

1. WHEN markets reach their end date THEN the system SHALL automatically mark them as "pending resolution"
2. WHEN resolution begins THEN the system SHALL update status to "resolving" 
3. WHEN payouts are distributed THEN the system SHALL update status to "completed"
4. WHEN resolution fails THEN the system SHALL update status to "failed" with error details
5. WHEN a market cannot be resolved THEN the system SHALL allow marking it as "cancelled" with reason