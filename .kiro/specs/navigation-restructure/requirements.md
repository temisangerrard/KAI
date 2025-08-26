# Requirements Document

## Introduction

This feature restructures the KAI prediction platform's navigation and user flow to follow best practices. The main goals are to simplify navigation, make markets the primary landing page after login, and implement a hamburger menu system for secondary actions.

## Requirements

### Requirement 1: Post-Login Landing Page

**User Story:** As a user who has successfully logged in, I want to immediately see available markets so that I can quickly participate in predictions.

#### Acceptance Criteria

1. WHEN a user successfully logs in THEN the system SHALL redirect them to `/markets`
2. WHEN an authenticated user visits the root path THEN the system SHALL redirect them to `/markets`
3. WHEN a user accesses `/markets` THEN the system SHALL display all available markets with filtering and sorting

### Requirement 2: Hamburger Menu Navigation

**User Story:** As a user, I want a hamburger menu for secondary actions so that I can access less frequently used features.

#### Acceptance Criteria

1. WHEN a user is on any page THEN the system SHALL display a hamburger menu icon
2. WHEN a user clicks the hamburger menu THEN the system SHALL show a drawer with Create Market, Settings, and Sign Out options
3. WHEN a user clicks outside the menu or presses escape THEN the system SHALL close the menu

### Requirement 3: Mobile Bottom Navigation

**User Story:** As a mobile user, I want simplified bottom navigation so that I can easily access the main app sections.

#### Acceptance Criteria

1. WHEN a user is on mobile THEN the system SHALL display a bottom tab bar with Markets, Social, Wallet, and Profile
2. WHEN a user taps a tab THEN the system SHALL navigate to that page and highlight the active tab
3. WHEN a user is on desktop THEN the bottom navigation SHALL be hidden

### Requirement 4: Unified Markets Page

**User Story:** As a user, I want all markets in one place with filtering and sorting so that I can find markets based on my preferences.

#### Acceptance Criteria

1. WHEN a user visits `/markets` THEN the system SHALL display all available markets
2. WHEN a user is on markets THEN the system SHALL provide category and status filters
3. WHEN a user is on markets THEN the system SHALL provide sorting by trending, newest, ending soon, and participants
4. WHEN a user applies filters/sorting THEN the system SHALL update the list without page reload

### Requirement 5: Profile Page Enhancement

**User Story:** As a user, I want my personal dashboard content in my profile so that I can view my stats and activity.

#### Acceptance Criteria

1. WHEN a user visits `/profile` THEN the system SHALL display personal stats, recent activity, and achievements
2. WHEN a user views profile THEN the system SHALL show token balance, prediction count, and win rate
3. WHEN a user is on profile THEN the system SHALL provide Activity, Predictions, and Markets Created tabs

### Requirement 6: Desktop Navigation

**User Story:** As a desktop user, I want top navigation that follows web conventions so that I can efficiently navigate.

#### Acceptance Criteria

1. WHEN a user is on desktop THEN the system SHALL display a top nav with logo, main items, and user menu
2. WHEN the top nav is displayed THEN the system SHALL show Markets, Social, Wallet, and Profile
3. WHEN a user clicks their avatar THEN the system SHALL show dropdown with Create Market, Settings, and Sign Out

### Requirement 7: Market Creation Access

**User Story:** As a user, I want easy access to market creation so that I can quickly create new markets.

#### Acceptance Criteria

1. WHEN a user is on markets THEN the system SHALL display a floating action button for creating markets
2. WHEN a user opens the hamburger menu THEN the system SHALL show "Create Market" prominently
3. WHEN a user creates a market THEN the system SHALL redirect back to markets upon completion

### Requirement 8: Remove Standalone Trending

**User Story:** As a user, I want trending as a sort option rather than a separate page so that I can easily switch between market views.

#### Acceptance Criteria

1. WHEN a user wants trending markets THEN the system SHALL provide "Trending" as a sort option on markets
2. WHEN trending sort is selected THEN the system SHALL order markets by trending score
3. WHEN standalone trending pages are removed THEN all functionality SHALL be preserved in markets sorting