# Implementation Plan

- [ ] 1. Create unified Market interface as single source of truth
  - Create new `lib/types/market.ts` file with comprehensive Market interface
  - Export unified MarketStatus enum with all status values
  - Export unified MarketOption interface with consistent property names
  - Create MarketCategory enum for type safety
  - Ensure interface matches the comprehensive structure from `lib/types/database.ts`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Create centralized MarketDataService for all transformations
  - Create `lib/services/market-data-service.ts` with transformation methods
  - Implement `fromFirestore()` method to handle legacy field mapping
  - Implement `toFirestore()` method for consistent data saving
  - Implement `validate()` method with comprehensive Zod schema
  - Implement `migrateLegacyData()` method for backward compatibility
  - **CRITICAL: Implement `calculateParticipationMetrics()` method to derive metrics from PredictionCommitment records**
  - **CRITICAL: Implement `getMarketCommitments()` method for market resolution**
  - **CRITICAL: Implement `normalizeOptionsWithCommitments()` method for real-time option data**
  - Add proper error handling and logging for transformation failures
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4_

- [ ] 3. Update Zod validation schemas to match unified interface
  - Update MarketSchema in `app/markets/create/market-service.ts` to use complete status enum
  - Create comprehensive UnifiedMarketSchema in MarketDataService
  - Ensure Zod schema exactly matches TypeScript interface structure
  - Add validation for all market fields including optional ones
  - Test schema validation with real market data from database
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Update trending service to use unified interface
  - Change import in `lib/services/trending-service.ts` to use unified Market interface
  - Update property access to use `totalParticipants` instead of `participants`
  - Update property access to use `totalTokensStaked` instead of `totalTokens`
  - Update property access to use `createdAt` instead of `startDate`
  - Update property access to use `endsAt` instead of `endDate`
  - Test trending calculations work with unified interface
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Update market service to use unified interface and centralized transformations
  - Update `app/markets/create/market-service.ts` to import unified Market interface
  - Replace direct Firestore data access with MarketDataService calls
  - Update `getAllMarkets()` to use MarketDataService.fromFirestore()
  - Update `getMarketById()` to use MarketDataService.fromFirestore()
  - Remove property transformation logic from market service
  - Test market loading works with unified interface
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Update database service to use unified interface
  - Update `lib/db/database.ts` to import unified Market interface
  - Replace local Market interface with import from unified source
  - Update `getAllMarkets()` to use MarketDataService for transformations
  - Update `getMarketById()` to use MarketDataService for transformations
  - Remove property transformation logic from database service
  - Mark old interface as deprecated with JSDoc comments
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Update admin services to use unified interface
  - Update admin commitment service to use unified Market interface
  - Update admin dashboard service to use unified Market interface
  - Update any admin-specific market operations to use unified interface
  - Ensure admin operations work with complete status enum
  - Test admin functionality with unified interface
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. Update resolution services to use unified interface
  - Update resolution service to import unified Market interface
  - Update resolution service to use complete MarketStatus enum
  - Update resolution service to use consistent property names
  - Ensure resolution status transitions use valid enum values
  - Test resolution workflow with unified interface
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 9. Implement comprehensive validation and error prevention
  - Add TypeScript strict mode enforcement for interface consistency
  - Add compile-time checks to prevent property name conflicts
  - Add runtime validation in MarketDataService for all market operations
  - Add graceful error handling for legacy data migration
  - Test validation prevents interface mismatches
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 10. Test complete system integration with unified interface
  - Test market loading works without Zod validation errors
  - Test trending service works with unified market data
  - Test market creation works with unified interface
  - Test admin operations work with unified interface
  - Test resolution operations work with unified interface
  - Verify no console errors from property access conflicts
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_

- [ ] 11. Clean up legacy interfaces and transformations
  - Mark old Market interfaces as deprecated with JSDoc comments
  - Remove property transformation logic from individual services
  - Consolidate all validation logic in MarketDataService
  - Update documentation to reference unified interface
  - Create migration guide for future developers
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 12. Integrate commitment tracking with unified market data
  - Ensure MarketDataService calculates participation metrics from PredictionCommitment records
  - Test that market.totalParticipants reflects actual unique users with commitments
  - Test that market.totalTokensStaked reflects actual committed tokens
  - Test that option-level metrics (totalTokens, participantCount) are accurate
  - Verify commitment data updates market metrics in real-time
  - Test integration between Market interface and PredictionCommitment interface
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 13. Validate market resolution works with unified structure and commitment tracking
  - Test complete market resolution workflow with unified interface
  - Verify resolution service can access all user commitments for payout calculation
  - Test that payout calculations use actual PredictionCommitment data
  - Verify status transitions work with complete MarketStatus enum
  - Test resolution service integration with other services
  - Verify admin resolution operations work correctly with commitment data
  - Test payout distribution works with unified market data and commitment tracking
  - Confirm no interface conflicts in resolution workflow
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_