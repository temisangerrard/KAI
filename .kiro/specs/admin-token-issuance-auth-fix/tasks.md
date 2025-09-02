# Implementation Plan

- [x] 1. Update token issuance API to use existing AdminAuthService
  - Replace the custom verifyAdminAuth function in app/api/admin/tokens/issue/route.ts
  - Import and use AdminAuthService.checkUserIsAdmin instead of custom Firestore query
  - Remove the duplicate admin verification code
  - Keep the same x-user-id header logic but use the proven admin check method
  - Test that admin authentication now works consistently
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [x] 2. Ensure frontend sends correct user ID using same logic as admin interface
  - Update TokenIssuanceModal component to use user.id || user.address for x-user-id header
  - Verify this matches the same logic used by useAdminAuth hook
  - Add error handling for cases where user ID is not available
  - Test that the correct user ID is being sent to the API
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 3. Standardize error handling and messages across admin features
  - Update token issuance API error messages to match other admin endpoints
  - Use consistent HTTP status codes for authentication failures
  - Ensure error logging follows the same patterns as other admin features
  - Test that error handling is consistent across the admin interface
  - _Requirements: 1.4, 1.5, 2.3, 2.4_

- [x] 4. Test the complete admin token issuance flow
  - Verify that admins can now successfully issue tokens
  - Test that non-admins are properly denied access
  - Confirm that the same user who can access admin interface can also issue tokens
  - Test error scenarios and ensure proper feedback is provided
  - Verify that audit logging still works correctly
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.5_