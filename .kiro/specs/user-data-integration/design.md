# Design Document

## Overview

This design implements comprehensive user data integration for the admin interface, replacing mock data with real Firestore queries. The solution supports both OAuth and traditional authentication users, provides efficient data retrieval with caching, and ensures the admin interface can manage real platform users effectively.

## Architecture

### Data Flow Architecture
```
Admin Login → Admin Auth Middleware → Admin Interface → API Routes → Firestore Service Layer → Firebase Auth + Firestore
     ↓              ↓                        ↓
Admin Session → Route Protection → User Management Components ← Real User Data ← Aggregated User Profiles
```

### Admin Authentication Strategy
- **Firebase Auth Integration**: Use existing Firebase Auth with custom admin claims
- **Custom Claims**: Admin users have `admin: true` custom claim in Firebase Auth
- **Route Protection**: Middleware to verify Firebase tokens and admin claims
- **Session Management**: Firebase Auth handles session management automatically

### Authentication Integration
- **Firebase Auth**: Primary source for user authentication data
- **Firestore Users Collection**: Extended user profile information
- **Data Consolidation**: Merge auth data with profile data for complete user records

### Caching Strategy
- **Server-side Caching**: Cache frequently accessed user data with TTL
- **Client-side Caching**: React Query for admin interface data management
- **Real-time Updates**: Firestore listeners for critical user data changes

## Components and Interfaces

### Core Data Models

```typescript
interface AdminUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  creationTime: string;
  lastSignInTime: string;
  authProvider: 'email' | 'google' | 'facebook' | 'twitter';
  profileData?: UserProfile;
  commitmentStats?: UserCommitmentStats;
  tokenBalance?: number;
}

interface UserProfile {
  displayName?: string;
  bio?: string;
  avatar?: string;
  preferences?: UserPreferences;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface UserCommitmentStats {
  totalCommitments: number;
  totalTokensCommitted: number;
  activeCommitments: number;
  winRate: number;
  lastCommitmentDate?: Timestamp;
}
```

### API Endpoints

#### Admin Authentication APIs
- `GET /api/admin/auth/verify` - Verify Firebase token and admin claims
- `POST /api/admin/auth/set-admin-claim` - Set admin claim for user (super-admin only)

#### User Management APIs (Protected)
- `GET /api/admin/users` - Paginated user list with search/filter
- `GET /api/admin/users/search` - User search with autocomplete
- `GET /api/admin/users/[id]` - Detailed user profile with stats
- `GET /api/admin/users/[id]/commitments` - User commitment history
- `GET /api/admin/users/[id]/transactions` - User transaction history

#### Data Aggregation APIs (Protected)
- `GET /api/admin/analytics/users` - User analytics and statistics
- `GET /api/admin/users/stats` - Platform-wide user statistics

### Service Layer Components

#### AdminAuthService
```typescript
class AdminAuthService {
  // Firebase Auth integration
  async verifyAdminToken(token: string): Promise<DecodedIdToken | null>
  async setAdminClaim(uid: string): Promise<void>
  async removeAdminClaim(uid: string): Promise<void>
  async isUserAdmin(uid: string): Promise<boolean>
}
```

#### AdminAuthMiddleware
```typescript
// Middleware for protecting admin routes using Firebase Auth
export async function adminAuthMiddleware(request: NextRequest): Promise<NextResponse | null>
export function withAdminAuth<T>(handler: (req: NextRequest, context: T) => Promise<Response>)
```

#### UserDataService
```typescript
class UserDataService {
  // Core user data retrieval
  async getUsers(options: PaginationOptions & FilterOptions): Promise<PaginatedUsers>
  async getUserById(uid: string): Promise<AdminUser | null>
  async searchUsers(query: string): Promise<AdminUser[]>
  
  // User statistics and analytics
  async getUserCommitmentStats(uid: string): Promise<UserCommitmentStats>
  async getUserTransactionHistory(uid: string): Promise<Transaction[]>
  
  // Batch operations for efficiency
  async getUsersBatch(uids: string[]): Promise<AdminUser[]>
}
```

#### AuthDataIntegrationService
```typescript
class AuthDataIntegrationService {
  // Consolidate Firebase Auth + Firestore data
  async consolidateUserData(uid: string): Promise<AdminUser>
  async getAuthProviderInfo(uid: string): Promise<AuthProviderInfo>
  
  // Handle different authentication methods
  async getOAuthUserData(uid: string): Promise<OAuthUserData>
  async getEmailUserData(uid: string): Promise<EmailUserData>
}
```

## Data Models

### Firestore Collections Structure

#### Admin Metadata Collection (`/admin_metadata/{uid}`)
```typescript
{
  uid: string; // Firebase Auth UID
  role: 'super-admin' | 'moderator';
  permissions: string[];
  createdAt: Timestamp;
  lastLogin?: Timestamp;
  createdBy: string; // UID of admin who granted access
}
```

#### Users Collection (`/users/{uid}`)
```typescript
{
  uid: string;
  email: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  preferences: {
    notifications: boolean;
    privacy: 'public' | 'private';
    theme: 'light' | 'dark';
  };
  stats: {
    totalCommitments: number;
    totalTokensEarned: number;
    winRate: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### User Authentication Metadata (`/user_metadata/{uid}`)
```typescript
{
  authProvider: string;
  providerData: {
    providerId: string;
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
  }[];
  customClaims?: Record<string, any>;
  lastSignIn: Timestamp;
  creationTime: Timestamp;
}
```

### Database Indexes Required

```javascript
// Composite indexes for efficient queries
{
  collectionGroup: "users",
  fields: [
    { fieldPath: "createdAt", order: "DESCENDING" },
    { fieldPath: "email", order: "ASCENDING" }
  ]
},
{
  collectionGroup: "users", 
  fields: [
    { fieldPath: "stats.totalCommitments", order: "DESCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" }
  ]
}
```

## Error Handling

### API Error Responses
```typescript
interface APIError {
  code: 'USER_NOT_FOUND' | 'AUTH_ERROR' | 'DATABASE_ERROR' | 'VALIDATION_ERROR';
  message: string;
  details?: Record<string, any>;
}
```

### Error Handling Strategy
- **Graceful Degradation**: Show partial data when some services fail
- **Retry Logic**: Automatic retry for transient failures
- **Fallback Data**: Use cached data when real-time queries fail
- **User Feedback**: Clear error messages for admin users

### Specific Error Scenarios
1. **Firebase Auth Unavailable**: Use cached user data, show warning
2. **Firestore Connection Issues**: Retry with exponential backoff
3. **User Data Inconsistency**: Log issues, show available data
4. **Large Dataset Timeouts**: Implement pagination and streaming

## Testing Strategy

### Unit Testing
- **Service Layer**: Test user data retrieval and consolidation logic
- **API Endpoints**: Test all user management endpoints with mock data
- **Error Handling**: Test failure scenarios and recovery mechanisms
- **Data Validation**: Test user data schema validation and sanitization

### Integration Testing
- **Firebase Integration**: Test real Firebase Auth and Firestore integration
- **End-to-End User Flows**: Test complete admin user management workflows
- **Performance Testing**: Test with large user datasets and concurrent requests
- **Authentication Testing**: Test both OAuth and email/password user scenarios

### Performance Testing
- **Load Testing**: Test API performance with thousands of users
- **Query Optimization**: Verify Firestore query efficiency and indexing
- **Caching Effectiveness**: Test cache hit rates and data freshness
- **Memory Usage**: Monitor memory consumption with large datasets

## Implementation Phases

### Phase 1: Core User Data Infrastructure
- Implement UserDataService with basic CRUD operations
- Create API endpoints for user retrieval and search
- Set up proper Firestore indexes and security rules

### Phase 2: Authentication Integration
- Implement AuthDataIntegrationService for OAuth/email users
- Add user metadata collection and management
- Create user profile consolidation logic

### Phase 3: Admin Interface Integration
- Replace mock data in existing admin components
- Implement real-time user data updates
- Add comprehensive error handling and loading states

### Phase 4: Analytics and Optimization
- Add user analytics and statistics
- Implement advanced caching strategies
- Optimize query performance and add monitoring