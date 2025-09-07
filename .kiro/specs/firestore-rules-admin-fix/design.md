# Design Document

## Overview

The current Firestore security rules are missing critical rules for the `admin_users` collection, which breaks the `isAdmin()` helper function and prevents admin authentication from working. Additionally, the rules need to be updated to properly support the hybrid CDP/Firebase authentication system while maintaining security. This design addresses the immediate authentication issues while preserving the existing security model.

## Architecture

### Current Authentication Flow
1. Users authenticate via CDP (Coinbase Developer Platform) or Firebase Auth
2. CDP users are mapped to Firebase UIDs via the `wallet_uid_mappings` collection
3. Admin status is verified by checking the `admin_users` collection
4. The `isAdmin()` helper function in Firestore rules checks for admin privileges

### Problem Analysis
The current Firestore rules have several critical issues:

1. **Missing `admin_users` Collection Rules**: No rules defined for the `admin_users` collection, making it completely inaccessible
2. **Broken `isAdmin()` Function**: Cannot read from `admin_users` collection to verify admin status
3. **Overly Permissive Temporary Rules**: Some collections have `allow read, write: if true` which is insecure
4. **Hybrid Authentication Context Issues**: Rules don't properly handle the CDP/Firebase hybrid authentication system

### Hybrid Authentication System Understanding
The platform uses a hybrid authentication approach:

1. **CDP Users**: Authenticate via Coinbase Developer Platform with wallet addresses
2. **Firebase Mapping**: CDP wallet addresses are mapped to Firebase UIDs via `wallet_uid_mappings` collection
3. **User Data**: All user data is stored using Firebase UIDs as document IDs (maintaining existing structure)
4. **Admin Verification**: Admin status is checked using either `user.id` (Firebase UID) or `user.address` (wallet address)

**Key Authentication Flow**:
- CDP users authenticate with wallet address
- `WalletUidMappingService.getFirebaseUid(walletAddress)` maps to Firebase UID
- User data is accessed using the mapped Firebase UID
- Admin status is checked using `user.id || user.address` pattern

## Components and Interfaces

### Firestore Security Rules Structure

#### Core Helper Functions
- `isAuthenticated()`: Checks if user is authenticated
- `isOwner(userId)`: Checks if authenticated user owns the resource
- `isAdmin()`: Checks if user has admin privileges (currently broken)
- `isValidCommitment(data)`: Validates commitment data structure

#### Collection Access Patterns
- **User Collections**: Users can access their own data, admins can access all
- **Admin Collections**: Only admins can access
- **Public Collections**: Authenticated users can read, admins can write
- **System Collections**: Special handling for authentication mapping

### Fixed Rule Structure

#### Admin Users Collection (CRITICAL FIX)
```javascript
match /admin_users/{userId} {
  // Allow users to read their own admin status (needed for isAdmin() function)
  allow read: if isAuthenticated() && isOwner(userId);
  // Only existing admins can modify admin status
  allow write: if isAdmin();
}
```

#### Users Collection (Hybrid Authentication Support)
```javascript
match /users/{userId} {
  // Users can read/write their own data using Firebase UID, admins can access all
  // This supports the hybrid system where CDP users are mapped to Firebase UIDs
  allow read, write: if isAuthenticated() && (isOwner(userId) || isAdmin());
}
```

#### Wallet UID Mappings (Authentication Bridge)
```javascript
match /wallet_uid_mappings/{walletAddress} {
  // Allow read for authentication lookup (CDP users need this for login)
  allow read: if isAuthenticated();
  // Allow write for user registration and admin management
  allow write: if isAuthenticated();
}
```

### Critical Understanding: Cascading Rule Failures

The missing `admin_users` collection rules are causing cascading failures:

1. **`isAdmin()` Function Fails**: Cannot read from `admin_users` collection
2. **Rules Using `isAdmin()` Fail**: Any rule with `|| isAdmin()` fails completely
3. **User Data Access Blocked**: Token balances, user profiles, etc. become inaccessible
4. **CDP Authentication Impact**: Affects all CDP users trying to access their data

**Root Cause**: When `isAdmin()` function fails due to missing collection rules, it doesn't just return `false` - it causes the entire rule evaluation to fail, blocking legitimate user access.

**Affected Collections**:
- `user_balances` - Token balance not showing (uses `|| isAdmin()`)
- `token_transactions` - Transaction history blocked
- `prediction_commitments` - User commitments inaccessible
- Any collection with admin fallback access patterns

## Data Models

### Admin Users Document Structure
```typescript
interface AdminUser {
  userId: string;           // Firebase UID or CDP wallet address
  isActive: boolean;        // Whether admin privileges are active
  createdAt: Timestamp;     // When admin status was granted
  createdBy: string;        // Who granted admin status
  permissions?: string[];   // Optional: specific admin permissions
}
```

### Wallet UID Mapping Structure
```typescript
interface WalletUidMapping {
  walletAddress: string;    // CDP wallet address (document ID)
  firebaseUid: string;      // Mapped Firebase UID
  createdAt: Timestamp;     // When mapping was created
  lastUsed: Timestamp;      // Last authentication time
}
```

## Error Handling

### Authentication Errors
- **Admin Access Denied**: When `isAdmin()` function fails due to missing rules
- **User Data Access Denied**: When users cannot access their own data
- **Mapping Lookup Failed**: When CDP users cannot access wallet mappings

### Security Rule Validation
- **Rule Syntax Errors**: Firestore rules deployment failures
- **Permission Denied Errors**: Legitimate operations blocked by overly restrictive rules
- **Security Violations**: Unauthorized access attempts

### Error Recovery Patterns
```javascript
// Graceful fallback for admin checks
function isAdminSafe() {
  return request.auth != null && 
         exists(/databases/$(database)/documents/admin_users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.isActive == true;
}

// Alternative admin check using custom claims (if available)
function isAdminClaims() {
  return request.auth != null && 
         request.auth.token.admin == true;
}
```

## Testing Strategy

### Rule Testing Approach
1. **Admin Authentication Tests**: Verify admin users can access protected resources
2. **User Data Access Tests**: Verify users can access their own data
3. **Security Tests**: Verify unauthorized access is properly blocked
4. **Hybrid Authentication Tests**: Verify CDP and Firebase auth both work

### Test Scenarios
```javascript
// Test admin access
describe('Admin Rules', () => {
  test('Admin can read admin_users collection', async () => {
    // Test admin user reading admin_users document
  });
  
  test('Non-admin cannot write to admin_users', async () => {
    // Test security enforcement
  });
});

// Test user data access
describe('User Data Rules', () => {
  test('User can read own user document', async () => {
    // Test user data access
  });
  
  test('CDP user can access mapped data', async () => {
    // Test hybrid authentication
  });
});
```

### Integration Testing
- Test complete authentication flow from login to data access
- Verify admin operations work end-to-end
- Test market resolution with proper admin authentication
- Validate user profile operations for both CDP and Firebase users

## Security Considerations

### Principle of Least Privilege
- Users can only access their own data unless they're admins
- Admin status must be explicitly verified for sensitive operations
- Temporary permissive rules must be replaced with proper security

### Authentication Context Validation
- Always verify `request.auth != null` before checking user identity
- Use `request.auth.uid` for Firebase users
- Support wallet address mapping for CDP users
- Validate admin status before allowing admin operations

### Data Integrity Protection
- Prevent users from modifying critical system data
- Ensure admin status can only be changed by existing admins
- Protect authentication mapping data from unauthorized modification
- Validate data structure and constraints in rules

## Implementation Priority

### Phase 1: Critical Fixes (Immediate)
1. Add `admin_users` collection rules to fix `isAdmin()` function
2. Fix `users` collection rules to allow proper user data access
3. Ensure `wallet_uid_mappings` collection supports authentication flow

### Phase 2: Security Hardening (Short-term)
1. Remove temporary permissive rules (`allow read, write: if true`)
2. Implement proper security for all collections
3. Add comprehensive rule validation

### Phase 3: Optimization (Medium-term)
1. Optimize rule performance for complex queries
2. Add detailed permission granularity if needed
3. Implement advanced security patterns