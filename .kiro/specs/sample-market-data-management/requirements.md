# Requirements Document

## Introduction

The KAI prediction platform needs to clearly separate sample/demonstration data from real user-created markets. Currently, the platform shows hardcoded mock data alongside real markets without clear distinction, which can confuse users about which markets are functional versus demonstrative. This feature will implement a comprehensive sample data management system that tags demonstration markets, ensures they appear as 'ended' status, and provides clear visual indicators to users.

## Requirements

### Requirement 1

**User Story:** As a platform user, I want to clearly distinguish between sample/demo markets and real active markets, so that I understand which markets I can actually participate in.

#### Acceptance Criteria

1. WHEN viewing any market list THEN sample markets SHALL be visually distinguished with a 'Sample' badge or indicator
2. WHEN viewing a sample market detail page THEN the market SHALL display clear messaging that it's for demonstration purposes only
3. WHEN attempting to interact with a sample market THEN the system SHALL prevent actual token transactions
4. WHEN browsing markets THEN sample markets SHALL be clearly labeled in all views (grid, list, cards)

### Requirement 2

**User Story:** As a platform administrator, I want all sample markets to have 'ended' status, so that users understand these are historical examples rather than active predictions.

#### Acceptance Criteria

1. WHEN the system loads sample markets THEN all sample markets SHALL have status set to 'ended'
2. WHEN displaying sample markets THEN they SHALL show historical end dates in the past
3. WHEN filtering markets by status THEN sample markets SHALL appear only in 'ended' status filters
4. WHEN sample markets are created or updated THEN they SHALL automatically be assigned 'ended' status

### Requirement 3

**User Story:** As a developer, I want a centralized sample data management system, so that sample markets are consistent and easily maintainable across the platform.

#### Acceptance Criteria

1. WHEN sample markets are needed THEN they SHALL be loaded from a centralized sample data service
2. WHEN sample markets are displayed THEN they SHALL include the 'sample' tag in their metadata
3. WHEN the market service loads data THEN it SHALL properly merge sample data with real market data
4. WHEN sample data is updated THEN changes SHALL be reflected consistently across all market views

### Requirement 4

**User Story:** As a platform user, I want sample markets to show realistic data and interactions, so that I can understand how the platform works before creating real markets.

#### Acceptance Criteria

1. WHEN viewing sample markets THEN they SHALL display realistic token amounts, percentages, and participant counts
2. WHEN viewing sample market details THEN they SHALL show complete market information including descriptions, options, and historical data
3. WHEN sample markets are displayed THEN they SHALL cover diverse categories and market types
4. WHEN users interact with sample market UI elements THEN they SHALL receive feedback explaining the demonstration nature

### Requirement 5

**User Story:** As a platform user, I want the market page to properly display both sample and real market data, so that I can see examples while also accessing functional markets.

#### Acceptance Criteria

1. WHEN the market page loads THEN it SHALL display both sample and real markets with proper data integration
2. WHEN real markets exist THEN they SHALL be prioritized in display order over sample markets
3. WHEN no real markets exist THEN sample markets SHALL be shown to demonstrate platform functionality
4. WHEN market data fails to load THEN the system SHALL gracefully fall back to sample data with appropriate messaging