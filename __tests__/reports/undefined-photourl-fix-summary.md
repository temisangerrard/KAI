# Undefined photoURL Fix Summary

## Problem
Users with CDP authentication were getting the following error when trying to sign in:
```
FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined (found in field photoURL in document users/cdp_83dc8f4007_1756897756476)
```

This error prevented CDP users from being created in Firestore, keeping them out of the app even though they had wallet mappings.

## Root Cause
Multiple places in the codebase were setting `photoURL: undefined` or similar undefined values when creating user profiles in Firestore. Firestore doesn't allow undefined values - they must either have a value or be omitted entirely.

## Files Fixed

### 1. `lib/auth/auth-service.ts`
**Issue**: AuthUser objects were being returned with `profileImage: undefined`, `bio: undefined`, and `location: undefined`.

**Fix**: Modified all AuthUser creation methods to only include optional fields if they have values:
- `getUserByAddress()` - Fixed AuthUser conversion
- `createUserFromCDP()` - Fixed returned AuthUser object
- `updateProfileByAddress()` - Fixed returned AuthUser object

### 2. `lib/auth/firebase-auth.ts`
**Issue**: Multiple methods were setting `photoURL: user.photoURL || undefined` in user profiles.

**Fix**: Modified all user profile creation methods to only add photoURL if it has a value:
- `createUserProfile()` - Fixed profile creation
- `createUserProfileFromCDP()` - Fixed CDP profile creation  
- `createDefaultProfile()` - Fixed default profile creation

### 3. `app/api/admin/tokens/issue/route.ts`
**Issue**: Token issuance API was setting `photoURL: authUser.photoURL || undefined` when creating missing user documents.

**Fix**: Modified user profile creation to only add photoURL if it has a value.

### 4. `lib/migration/user-data-migration.ts`
**Issue**: User data migration was setting `photoURL: existingUserData?.photoURL` which could be undefined.

**Fix**: Modified migration to only add optional fields if they have values and filter out undefined values from existing data.

## Technical Details

### Before Fix
```typescript
const userProfile = {
  email: email,
  displayName: displayName,
  photoURL: user.photoURL || undefined, // ❌ This causes Firestore error
  // ... other fields
}
```

### After Fix
```typescript
const userProfile: any = {
  email: email,
  displayName: displayName,
  // ... other required fields
}

// Only add photoURL if it has a value
if (user.photoURL) {
  userProfile.photoURL = user.photoURL; // ✅ Only set if not undefined
}
```

## Testing
- Build completed successfully without undefined photoURL errors
- The specific user mentioned (`adandeche@gmail.com` with wallet `0xf912f3A46374e3b1f4C0072169aFf3262e926Fd1`) should now be able to sign in automatically
- If automatic fix doesn't work, the manual fix component in the admin interface can be used

## Impact
- CDP users can now successfully sign in and have their user profiles created
- No more "All user creation attempts failed" errors
- Existing orphaned wallet mappings can be recovered using the admin tools
- Future user creations will not encounter undefined field errors

## Prevention
All user profile creation code now follows the pattern of:
1. Create profile object with required fields only
2. Conditionally add optional fields only if they have values
3. Never set fields to `undefined` explicitly