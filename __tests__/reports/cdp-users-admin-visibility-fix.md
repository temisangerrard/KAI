# CDP Users Admin Visibility Fix

## Problem
CDP users were not showing up in the admin token management section, making it impossible to issue tokens to them or manage their accounts through the admin interface.

## Root Cause
The admin user search API (`/api/admin/users/search`) was only fetching users from Firebase Auth using `adminAuth.listUsers()`. However, CDP users are created directly in Firestore with generated UIDs (like `cdp_83dc8f4007_1756897756476`) and don't exist in Firebase Auth.

## Solution
Modified the user search system to fetch users from both Firebase Auth and Firestore, then merge the data to provide a complete view of all users.

## Files Modified

### 1. `app/api/admin/users/search/route.ts`
**Changes:**
- Added Firestore users collection query alongside Firebase Auth query
- Implemented user data merging logic to combine Firebase Auth and Firestore data
- Added source tracking (`firebase_auth`, `firestore_only`, `both`)
- Enhanced error handling for both data sources
- Added comprehensive logging and statistics

**Key Features:**
- Fetches up to 1000 users from both sources
- Merges data intelligently (Firebase Auth data takes precedence for auth fields)
- Marks CDP users with `source: 'firestore_only'` and `providerId: 'cdp'`
- Provides detailed statistics about user sources

### 2. `app/admin/tokens/components/users-list.tsx`
**Changes:**
- Added `source` field to `UserData` interface
- Updated signup method display to show "CDP Wallet" for CDP users
- Added visual indicator badge for CDP users
- Enhanced user statistics display to show Firebase Auth vs CDP user counts
- Improved styling for different user types

**Visual Improvements:**
- CDP users now show "CDP Wallet" badge in signup method column
- Blue "CDP User" badge appears for Firestore-only users
- Status display shows breakdown: "Firebase Auth: X, CDP Users: Y"

## Technical Details

### Before Fix
```typescript
// Only fetched from Firebase Auth
const listUsersResult = await adminAuth.listUsers(1000);
let users = listUsersResult.users.map(user => ({ ... }));
```

### After Fix
```typescript
// Fetch from both sources
const allUsers = new Map(); // Avoid duplicates

// 1. Firebase Auth users
const listUsersResult = await adminAuth.listUsers(1000);
listUsersResult.users.forEach(user => {
  allUsers.set(user.uid, { ...user, source: 'firebase_auth' });
});

// 2. Firestore users (includes CDP users)
const usersSnapshot = await getDocs(usersQuery);
usersSnapshot.docs.forEach(userDoc => {
  // Merge or add user data with source tracking
});
```

## User Experience Improvements

### Admin Token Management
- **Before**: Only Firebase Auth users visible (missing CDP users)
- **After**: All users visible with clear source identification

### User Identification
- **Firebase Auth users**: Show as "Email", "Google", etc. with verified badges
- **CDP users**: Show as "CDP Wallet" with blue "CDP User" badge
- **Merged users**: Show primary auth method with complete profile data

### Search Functionality
- Search works across all user types (email, display name, UID)
- Maintains performance with proper indexing and limits
- Provides detailed statistics for admin monitoring

## Testing
- Build completed successfully
- API now returns users from both Firebase Auth and Firestore
- Admin interface displays CDP users with proper identification
- Token issuance works for all user types

## Impact
- **CDP users are now visible** in admin token management
- **Token issuance** works for CDP users
- **User search** includes all user types
- **Better admin visibility** into user base composition
- **Maintains backward compatibility** with existing Firebase Auth users

## Future Considerations
- Consider adding user migration tools for moving between auth methods
- Monitor performance with larger user bases
- Add filtering options by user source type
- Consider caching strategies for improved performance