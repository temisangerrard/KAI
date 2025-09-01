# Requirements Document

## Introduction

The admin token issuance system is broken because it uses a different authentication method than the rest of the admin interface. The admin pages use the existing `useAdminAuth` hook which checks `user.id || user.address` in the `admin_users` collection, but the token issuance API expects a `x-user-id` header and has its own `verifyAdminAuth` function. This creates an authentication mismatch where admins can access the admin interface but cannot issue tokens. The fix is to make the token issuance API use the same authentication logic as the rest of the admin system.

## Requirements

### Requirement 1

**User Story:** As an admin who can access the admin interface, I want to issue tokens using the same authentication system, so that token issuance works seamlessly.

#### Acceptance Criteria

1. WHEN an admin accesses the token issuance feature THEN the system SHALL use the same authentication logic as other admin features
2. WHEN the token issuance API receives a request THEN it SHALL check admin status using the same method as the admin interface
3. WHEN admin authentication succeeds THEN the token issuance SHALL proceed normally
4. WHEN admin authentication fails THEN the system SHALL provide the same error handling as other admin features
5. IF the user is not an admin THEN the system SHALL deny access consistently across all admin features

### Requirement 2

**User Story:** As a developer, I want the token issuance system to use the existing admin authentication infrastructure, so that there's no code duplication or inconsistency.

#### Acceptance Criteria

1. WHEN implementing token issuance authentication THEN the system SHALL reuse the existing admin authentication service
2. WHEN checking admin status THEN the system SHALL use the same `admin_users` collection lookup as other admin features
3. WHEN handling authentication errors THEN the system SHALL use consistent error messages and status codes
4. WHEN logging authentication events THEN the system SHALL use the same logging patterns as other admin features
5. IF authentication logic changes THEN it SHALL automatically apply to all admin features including token issuance