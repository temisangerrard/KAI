# Requirements Document

## Introduction

This feature removes the social section from the KAI prediction platform since it contains only mock data and is not being used anywhere in the app. The main goals are to clean up the navigation by removing the Social tab and properly adjusting the remaining navigation layout for both mobile and desktop views.

## Requirements

### Requirement 1: Remove Social Tab from Navigation

**User Story:** As a user, I want a cleaner navigation experience without unused social features so that I can focus on the core prediction functionality.

#### Acceptance Criteria

1. WHEN a user views the mobile bottom navigation THEN the system SHALL display only Markets, Wallet, and Profile tabs
2. WHEN a user views the desktop top navigation THEN the system SHALL display only Markets, Wallet, and Profile links
3. WHEN the Social tab is removed THEN the remaining tabs SHALL be properly spaced and centered

### Requirement 2: Remove Social Page and Routes

**User Story:** As a developer, I want to remove unused social functionality so that the codebase is cleaner and more maintainable.

#### Acceptance Criteria

1. WHEN the social section is removed THEN the system SHALL delete the `/app/social/` directory
2. WHEN social routes are accessed THEN the system SHALL redirect to the markets page
3. WHEN social-related imports exist THEN the system SHALL remove them from components

### Requirement 3: Update Navigation Layout

**User Story:** As a user, I want the remaining navigation items to be properly laid out so that the interface looks balanced and professional.

#### Acceptance Criteria

1. WHEN the mobile bottom navigation has 3 items THEN the system SHALL distribute them evenly across the available space
2. WHEN the desktop navigation has 3 items THEN the system SHALL maintain proper spacing and alignment
3. WHEN navigation is updated THEN the active state highlighting SHALL work correctly for all remaining tabs

### Requirement 4: Clean Up Social References

**User Story:** As a developer, I want all social-related code removed so that there are no dead references or unused imports.

#### Acceptance Criteria

1. WHEN social functionality is removed THEN the system SHALL remove all social-related components
2. WHEN social references exist in routing THEN the system SHALL remove them from navigation logic
3. WHEN social-related types or interfaces exist THEN the system SHALL remove unused definitions

### Requirement 5: Maintain Responsive Design

**User Story:** As a user on any device, I want the navigation to remain responsive and accessible after the social section is removed.

#### Acceptance Criteria

1. WHEN viewing on mobile THEN the bottom navigation SHALL remain touch-friendly with proper spacing
2. WHEN viewing on desktop THEN the top navigation SHALL maintain proper proportions
3. WHEN switching between devices THEN the navigation SHALL adapt correctly without layout issues