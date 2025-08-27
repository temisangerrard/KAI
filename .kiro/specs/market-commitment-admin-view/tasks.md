# Implementation Plan

- [x] 1. Audit and optimize Firestore database structure for commitments
  - Review existing prediction_commitments collection schema and indexes
  - Create composite indexes for efficient market-based queries (predictionId + status, predictionId + committedAt)
  - Add user lookup optimization indexes (userId + status, userId + predictionId)
  - Implement data validation rules in Firestore security rules for commitment integrity
  - _Requirements: 2.1, 2.2, 3.1, 4.1_

- [x] 2. Create Firestore aggregation functions for market analytics
  - Build aggregation queries to calculate market-level statistics (total tokens, participant counts)
  - Implement efficient position distribution calculations (yes/no token breakdown)
  - Create real-time listeners for commitment data changes
  - Add caching strategy for frequently accessed market analytics
  - _Requirements: 2.3, 4.1, 4.2, 4.3, 4.4_

- [x] 3. Debug and fix token commitment API with proper database transactions
  - Investigate current commitment API failures and atomic transaction issues
  - Fix Firestore runTransaction implementation for commitment + balance updates
  - Implement proper rollback handling for failed commitment transactions
  - Add comprehensive logging for commitment transaction debugging
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. Enhance commitment data model and validation
  - Update PredictionCommitment interface to include user display information
  - Implement server-side validation for commitment data integrity
  - Add commitment metadata tracking (odds snapshot, market state at commitment time)
  - Create data migration script for existing commitments if needed
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 5. Create admin market commitments API with optimized database queries
  - Build GET /api/admin/markets/commitments endpoint with efficient Firestore queries
  - Implement pagination and filtering for large commitment datasets
  - Add user information joining (from users collection) for admin display
  - Optimize query performance with proper indexing and query structure
  - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2_

- [x] 6. Create market-specific commitments API with real-time capabilities
  - Build GET /api/admin/markets/[id]/commitments endpoint with live data
  - Implement Firestore real-time listeners for commitment updates
  - Add market analytics calculations with cached aggregations
  - Create efficient user data lookup for commitment details
  - _Requirements: 2.4, 3.1, 3.2, 3.3, 4.3, 4.4_

- [x] 7. Enhance commitment modal with proper database error handling
  - Update PredictionCommitment component to handle Firestore-specific errors
  - Add retry logic for network failures and transaction conflicts
  - Implement optimistic UI updates with rollback on failure
  - Add proper loading states during database operations
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 8. Build admin market commitments list with real-time data
  - Create MarketCommitmentsList component with Firestore real-time listeners
  - Implement efficient data loading and caching strategies
  - Add proper error handling for database connection issues
  - Create empty state handling for markets without commitments
  - _Requirements: 2.1, 2.2, 2.5, 4.1, 4.5_

- [x] 9. Build market commitment details view with user data integration
  - Create MarketCommitmentDetails component with user information lookup
  - Implement efficient batch queries for user details
  - Add commitment timeline and status tracking display
  - Create proper data refresh and real-time update handling
  - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.5_

- [x] 10. Add market commitments tab to admin interface with database monitoring
  - Integrate market commitments view into existing admin token management
  - Add database connection status monitoring and error display
  - Implement proper loading states for database operations
  - Add data refresh controls and real-time update toggles
  - _Requirements: 2.1, 4.5_

- [x] 11. Create comprehensive analytics dashboard with Firestore aggregations
  - Build CommitmentAnalytics component using optimized database queries
  - Implement cached analytics calculations with periodic updates
  - Add real-time statistics updates for active markets
  - Create performance monitoring for database query efficiency
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 12. Test database performance and data integrity end-to-end
  - Test commitment flow under load with multiple concurrent users
  - Verify database transaction integrity and rollback scenarios
  - Test admin analytics performance with large datasets
  - Validate data consistency between commitments, balances, and market statistics
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_