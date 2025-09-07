# Implementation Plan

## Current Status
**Previous implementation was incomplete** - only basic timeline UI was added. The core resolution infrastructure (database schema, services, APIs, admin interface) was not implemented despite being mentioned in the PR.

## Fee Structure (Updated)
- **House Fee**: 5% (goes to platform)
- **Creator Fee**: 1-5% (configurable per market, goes to market creator)
- **Winner Pool**: 90-94% (distributed proportionally among winners)

## Priority Tasks (Fix the Foundation)

- [x] **CRITICAL: Fix Database Schema** 
  - The PR claimed to add `pendingResolution` and `resolution` fields but they don't exist
  - Must implement proper Market interface updates in `lib/types/database.ts`
  - Add resolution workflow state tracking

- [x] **CRITICAL: Implement Core Services**
  - Create `ResolutionService` for processing market resolutions
  - Implement payout calculation with house + creator fees
  - Add evidence validation and storage

- [x] **CRITICAL: Build Admin Interface**
  - Create the missing `admin-resolution-actions.tsx` component mentioned in PR
  - Implement resolution dashboard for pending markets
  - Add evidence collection and winner selection forms

## Completed Tasks

- [x] 14. Basic timeline integration (PARTIAL)
  - Updated market timeline to show resolution status events
  - Added "Awaiting Resolution" and "Market Resolved" timeline events
  - Updated status messages for different market states
  - _Note: Only UI timeline updates completed, core resolution system missing_

## Remaining Tasks

- [x] 1. Set up database schema and core data models
  - Add pendingResolution and resolution fields to Market interface in database.ts
  - Create TypeScript interfaces for ResolutionPayout, CreatorPayout, and PayoutPreview
  - Update Market interface to support resolution workflow states
  - _Requirements: 2.4, 4.3, 6.3_
  - _Note: House takes 5%, creator gets 1-5% configurable, winners split remaining 90-94%_

- [x] 2. Implement market validation service for creation criteria
  - Create MarketValidationService with real-time validation logic
Add validation for subjective language, end dates, and option constraints (DEFERRED - Future Work)
  - Market participants will receive refunds for unresolvable markets
  - Complex validation logic postponed to focus on core resolution system
  - Implement validation error and warning types with specific error codes
  - Write unit tests for all validation scenarios and edge cases
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3. Build payout calculation engine with house and creator fees
  - Implement calculatePayouts function with 5% house fee and 1-5% configurable creator fee
  - Create proportional distribution logic for winners from remaining 90-94% pool
  - Add payout preview calculation functionality showing all fee breakdowns
  - Write comprehensive unit tests for payout calculations including edge cases
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Note: Total fees = 5% house + 1-5% creator = 6-10% total, winners get 90-94%_

- [ ] 4. Create market resolution monitoring system
Implement simple market filtering for closed markets needing resolution
- Add admin dashboard filtering to identify markets past their end date needing resolution
  - Create utility functions to check market resolution status for admin interface
  - Write tests for market filtering and status checking logic

- [x] 5. Build admin resolution interface components
  - Create MarketResolutionDashboard component for pending markets list
  - Implement MarketResolutionForm with winner selection and evidence collection
  - Add EvidenceCollectionForm component for URLs, descriptions, and file uploads
  - Create PayoutPreviewCard component showing creator fee and winner distribution
  - Write component tests for all resolution interface interactions
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 6. Implement evidence validation and storage system
Create evidence validation service for URLs, files, and descriptions with strict Firestore-safe sanitization
  - Implement comprehensive input sanitization to prevent Firestore document corruption
  - Add strict character filtering to remove unsupported Unicode characters and control sequences
  - Validate URL formats and sanitize special characters that could break Firestore queries
  - Implement file type validation with safe filename sanitization for storage paths
  - Add description text validation to strip dangerous characters and normalize encoding
  - Create Firestore-safe field name validation to prevent document write failures
  - Add comprehensive error handling for invalid characters with detailed rejection messages
  - Add secure file upload handling for screenshots and documents
  - Implement evidence storage with proper file type validation
  - Create evidence retrieval and display functionality
  - Write tests for evidence validation and storage operations
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Build resolution processing service
  - Create ResolutionService with market resolution workflow
  - Implement evidence validation, payout calculation, and token distribution
  - Add rollback mechanisms for failed resolutions
  - Create resolution status tracking and error handling
  - Write integration tests for complete resolution workflow
  - _Requirements: 3.6, 6.1, 6.2, 6.3, 6.4, 6.5, 7.3, 7.4, 7.5_

- [x] 8. Implement automated token distribution system
  - Create token distribution service for winner payouts
  - Add house fee collection (5% to platform)
  - Add creator fee distribution functionality (1-5% configurable)
  - Implement transaction recording for all payout operations (winners, house, creator)
  - Add retry logic for failed token distributions
  - Write tests for token distribution accuracy and failure handling
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 9. Create admin resolution API endpoints
  - Implement GET /api/admin/markets/pending-resolution endpoint
  - Add GET /api/admin/markets/{id}/payout-preview endpoint with house + creator fee calculation
  - Create POST /api/admin/markets/{id}/resolve endpoint with evidence handling
  - Add POST /api/admin/markets/{id}/cancel endpoint for unresolvable markets
  - Add POST /api/admin/markets/{id}/creator-fee endpoint to set creator fee percentage (1-5%)
  - Write API tests for all admin resolution endpoints
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 10. Build user-facing resolution APIs
  - Create GET /api/user/payouts endpoint returning both winner and creator payouts
  - Implement GET /api/markets/{id}/resolution endpoint for resolution details
  - Add GET /api/markets/{id}/resolution/evidence endpoint for evidence display
  - Write API tests for user-facing resolution endpoints
  - _Requirements: 4.4_

- [ ] 11. Integrate market creation validation into UI
  - Add MarketCreationValidator component to market creation form
  - Implement real-time validation feedback with error and warning messages
  - Create validation guidance with good/bad market examples
  - Add form submission prevention for invalid markets
  - Write component tests for validation UI interactions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 12. Create resolution audit trail and history views
  - Build resolution history display for completed markets
  - Add evidence viewer component for resolution details
  - Create admin audit trail showing all resolution actions
  - Implement user payout history with creator fee breakdown
  - Write tests for audit trail and history functionality
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 13. Add comprehensive error handling and recovery
  - Implement ResolutionError types and error handling throughout system
  - Add rollback mechanisms for partial resolution failures
  - Create error logging and notification system for failed operations
  - Add data consistency checks and validation
  - Write tests for error scenarios and recovery mechanisms
  - _Requirements: 2.5, 6.4, 7.4, 7.5_

- [ ] 14. Integrate resolution system with existing market components (PARTIAL)
  - [x] Update market timeline to show resolution status events
  - [x] Add "Awaiting Resolution" and "Market Resolved" timeline events  
  - [x] Update status messages for different market states
  - [x] Add resolution information to market cards and listings ✅
  - [x] Create resolution submission form for users when markets end
  - [ ] Add admin resolution actions component (mentioned in PR but not implemented)
  - [ ] Integrate payout notifications into user dashboard
  - [x] Update user balance displays to reflect resolution payouts
  - [x] Write integration tests for resolution system with existing components
  - _Requirements: 4.4, 6.5_
  - _Note: Only basic timeline UI completed, core resolution workflow missing