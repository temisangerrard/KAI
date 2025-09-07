# Implementation Plan

- [x] 1. Fix React state loop in PayoutNotifications component
  - Fix the infinite re-render loop at line 33:7 in app/components/payout-notifications.tsx
  - Address the complete error chain: PayoutNotifications -> TopNavigation -> MarketsPage -> ClientPageRoot
  - Investigate Radix UI Popover useEffect causing dispatchSetState loop in PopperAnchor (Popper.tsx:84:15)
  - Fix the PopoverTrigger component interaction at Popover.tsx:157:7
  - Resolve the enqueueConcurrentHookUpdate and dispatchSetStateInternal React DOM errors
  - Fix useEffect dependency array to prevent cascading state updates
  - Ensure Radix UI Popover integration doesn't conflict with component state management
  - Test that MarketsPage and ProfilePage load without maximum update depth errors
  - _Requirements: 2.1, 2.2, 3.1, 3.3_

- [x] 2. Investigate and document current authentication patterns
  - Review existing hybrid CDP + Firebase authentication implementation
  - Document how CDP users are registered for Firestore access
  - Identify the correct authentication context patterns used throughout the app
  - Map out user registration flow for both CDP and Firebase systems
  - _Requirements: 2.1, 2.2, 4.1_

- [x] 3. Analyze market resolution authentication conflicts
  - Review all market resolution code for authentication patterns
  - Identify Firestore operations that may be using incorrect authentication context
  - Check if resolution operations properly authenticate with Firebase
  - Document specific authentication conflicts found in resolution implementation
  - _Requirements: 2.1, 2.2, 4.2_

- [ ] 4. Fix Firebase Firestore internal assertion error (ID: ca9)
  - Investigate the specific Firestore operations causing the internal assertion failure
  - Check for concurrent query operations or improper listener cleanup in market resolution code
  - Identify any transaction conflicts or query subscription management issues
  - Fix the root cause of the "Unexpected state" error in Firestore's internal system
  - _Requirements: 2.2, 3.1, 4.3_

- [x] 5. Add missing admin verification to ResolutionService methods
  - Add `AdminAuthService.checkUserIsAdmin(adminId)` call to `resolveMarket()` method
  - Add admin verification to other critical ResolutionService methods (if any)
  - Throw `ResolutionServiceError` with `UNAUTHORIZED` type when admin verification fails
  - Test that non-admin users are properly blocked from resolution operations
  - _Requirements: 3.2, 4.1, 4.2, 4.3_

- [ ] 6. Systematic console error collection and documentation
  - Start development server and navigate through all application pages
  - Document all remaining console errors with context (page, action, stack trace)
  - Categorize errors by type (Firebase, React, TypeScript, etc.) and severity
  - Create prioritized list of remaining errors to fix
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 7. Fix remaining high-priority console errors
  - Address each high-priority error one at a time
  - Verify each fix doesn't introduce new console errors
  - Test related functionality after each fix to prevent regressions
  - Document fix approach and verification steps for each error
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 8. Fix medium and low-priority console errors
  - Clean up remaining warnings and non-critical errors
  - Optimize performance-related console messages
  - Address TypeScript warnings and React development warnings
  - Ensure clean console output across all application features
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 9. Comprehensive application testing and verification
  - Test all major user flows without console errors
  - Verify Firebase operations work correctly without internal assertion errors
  - Test market resolution functionality end-to-end
  - Confirm hybrid authentication system works properly across all features
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_

- [ ] 10. Performance and stability validation
  - Monitor application performance after all fixes
  - Verify Firebase connection stability and proper cleanup
  - Test real-time features for proper listener management
  - Confirm memory usage and component lifecycle management
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 11. Document clean baseline and prevention measures
  - Document the final error-free state of the application
  - Create guidelines for maintaining console error-free development
  - Establish monitoring practices for future development
  - Document authentication patterns to prevent future conflicts
  - _Requirements: 5.1, 5.2, 5.3, 5.4_