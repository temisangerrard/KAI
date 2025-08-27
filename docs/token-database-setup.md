# Token Database Setup Guide

This guide covers the Firebase database schema and utilities implementation for the KAI Token Management System.

## Overview

The token database implementation provides:
- **User Balance Management**: Track available and committed tokens with optimistic locking
- **Transaction History**: Complete audit trail of all token operations
- **Token Packages**: Configurable packages for token purchases
- **Prediction Commitments**: Token commitments to predictions with automatic resolution
- **Database Utilities**: Reconciliation, maintenance, and health monitoring tools

## Database Collections

### 1. `user_balances`
Stores user token balances with optimistic locking support.

```typescript
interface UserBalance {
  userId: string;           // Document ID
  availableTokens: number;  // Tokens available for use
  committedTokens: number;  // Tokens committed to predictions
  totalEarned: number;      // Lifetime tokens earned
  totalSpent: number;       // Lifetime tokens spent
  lastUpdated: Timestamp;   // Last update timestamp
  version: number;          // Version for optimistic locking
}
```

### 2. `token_transactions`
Complete transaction history for all token operations.

```typescript
interface TokenTransaction {
  id: string;                    // Auto-generated document ID
  userId: string;                // User who performed transaction
  type: 'purchase' | 'commit' | 'win' | 'loss' | 'refund';
  amount: number;                // Transaction amount
  balanceBefore: number;         // Balance before transaction
  balanceAfter: number;          // Balance after transaction
  relatedId?: string;            // Related prediction/purchase ID
  metadata: Record<string, any>; // Additional transaction data
  timestamp: Timestamp;          // Transaction timestamp
  status: 'pending' | 'completed' | 'failed';
}
```

### 3. `token_packages`
Available token packages for purchase.

```typescript
interface TokenPackage {
  id: string;           // Document ID
  name: string;         // Package display name
  tokens: number;       // Base tokens in package
  priceUSD: number;     // Price in USD
  bonusTokens: number;  // Bonus tokens included
  stripePriceId: string; // Stripe price ID
  isActive: boolean;    // Whether package is available
  sortOrder: number;    // Display order
  createdAt: Timestamp; // Creation timestamp
}
```

### 4. `prediction_commitments`
Token commitments to specific predictions.

```typescript
interface PredictionCommitment {
  id: string;                    // Auto-generated document ID
  userId: string;                // User making commitment
  predictionId: string;          // Related prediction ID
  tokensCommitted: number;       // Tokens committed
  position: 'yes' | 'no';       // Prediction position
  odds: number;                  // Odds at time of commitment
  potentialWinning: number;      // Potential winnings
  status: 'active' | 'won' | 'lost' | 'refunded';
  committedAt: Timestamp;        // Commitment timestamp
  resolvedAt?: Timestamp;        // Resolution timestamp
}
```

## Database Services

### TokenBalanceService
Handles all user balance operations with atomic transactions and optimistic locking.

**Key Methods:**
- `getUserBalance(userId)` - Get current balance, create if doesn't exist
- `updateBalance(request)` - Update balance with transaction record
- `validateSufficientBalance(userId, amount)` - Check if user has enough tokens

### TokenTransactionService
Manages transaction history and queries.

**Key Methods:**
- `getUserTransactions(userId, limit, startAfter)` - Get paginated transaction history
- `getTransactionsByType(userId, type)` - Filter transactions by type
- `getAllTransactions(limit, startAfter)` - Admin function for all transactions

### TokenPackageService
Manages token packages for purchases.

**Key Methods:**
- `getActivePackages()` - Get all available packages
- `getPackage(packageId)` - Get specific package
- `createPackage(data)` - Admin function to create packages
- `updatePackage(id, updates)` - Admin function to update packages

### PredictionCommitmentService
Handles token commitments to predictions.

**Key Methods:**
- `createCommitment(data)` - Create new commitment with balance validation
- `getUserCommitments(userId, predictionId?)` - Get user's commitments
- `getPredictionCommitments(predictionId)` - Get all commitments for prediction
- `resolvePredictionCommitments(predictionId, winningPosition)` - Process prediction resolution

## Database Indexes

The following indexes are required for optimal performance:

### user_balances
- `userId` (ASC), `lastUpdated` (DESC)

### token_transactions
- `userId` (ASC), `timestamp` (DESC)
- `userId` (ASC), `type` (ASC), `timestamp` (DESC)
- `status` (ASC), `timestamp` (DESC)

### token_packages
- `isActive` (ASC), `sortOrder` (ASC)

### prediction_commitments
- `userId` (ASC), `committedAt` (DESC)
- `predictionId` (ASC), `committedAt` (DESC)
- `userId` (ASC), `status` (ASC), `committedAt` (DESC)

## Setup Instructions

### 1. Install Dependencies
```bash
npm install dotenv ts-node
```

### 2. Configure Environment
Ensure your `.env.local` file contains all required Firebase configuration variables:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Run Database Migration
```bash
npm run token:migrate
```

This will:
- Create initial token packages
- Display index creation commands
- Validate the setup

### 4. Create Database Indexes
Run the index creation commands shown by the migration script in the Firebase Console:
1. Go to Firebase Console > Firestore Database > Indexes
2. Create each composite index as displayed
3. Wait for indexes to build

### 5. Test Database Setup
```bash
npm run token:test
```

This will run comprehensive tests of all database operations.

## Maintenance Utilities

### Balance Reconciliation
The system includes utilities to detect and fix balance inconsistencies:

```typescript
import { BalanceReconciliationUtils } from '@/lib/utils/token-database-utils'

// Check for inconsistencies
const inconsistencies = await BalanceReconciliationUtils.detectBalanceInconsistencies(userId)

// Fix inconsistencies
if (inconsistencies.hasInconsistencies) {
  const fixedBalance = await BalanceReconciliationUtils.fixBalanceInconsistencies(userId)
}

// Reconcile all user balances
const results = await BalanceReconciliationUtils.reconcileAllBalances()
```

### Database Maintenance
Regular maintenance utilities for optimal performance:

```typescript
import { DatabaseMaintenanceUtils } from '@/lib/utils/token-database-utils'

// Clean up old transactions (keep last 1000 per user)
const cleanupResults = await DatabaseMaintenanceUtils.cleanupOldTransactions(1000)

// Archive old resolved commitments (older than 90 days)
const archiveResults = await DatabaseMaintenanceUtils.archiveOldCommitments(90)

// Generate health report
const healthReport = await DatabaseMaintenanceUtils.generateHealthReport()
```

## Security Considerations

### Optimistic Locking
All balance updates use optimistic locking with version numbers to prevent race conditions:
- Each balance record has a `version` field
- Updates increment the version
- Concurrent updates are detected and handled

### Atomic Transactions
Critical operations use Firestore transactions to ensure data consistency:
- Balance updates with transaction records
- Prediction commitments with balance updates
- Prediction resolutions with payout calculations

### Input Validation
All inputs are validated using Zod schemas:
- Token amounts must be positive numbers
- User IDs must be valid strings
- Transaction types must be from allowed enum

### Access Control
Database security rules should restrict access:
- Users can only read/write their own balance and transactions
- Admin operations require elevated permissions
- Sensitive operations require server-side validation

## Error Handling

The system includes comprehensive error handling:
- **Insufficient Balance**: Clear error messages with purchase suggestions
- **Concurrent Updates**: Automatic retry with exponential backoff
- **Network Errors**: Graceful degradation with offline support
- **Data Inconsistencies**: Automatic detection and reconciliation

## Performance Optimization

### Denormalization
- Current balance stored on user document for fast reads
- Transaction summaries cached for quick access
- Frequently accessed data duplicated strategically

### Pagination
- Transaction history uses cursor-based pagination
- Large result sets are automatically paginated
- Efficient querying with proper indexes

### Caching
- Token packages cached in memory
- Balance data cached with TTL
- Frequently accessed queries optimized

## Monitoring and Analytics

### Health Monitoring
Regular health checks include:
- Balance consistency validation
- Transaction processing status
- Database performance metrics
- Error rate monitoring

### Analytics
Track key metrics:
- Total tokens in circulation
- Transaction volume and patterns
- User engagement with token system
- Revenue from token purchases

## Troubleshooting

### Common Issues

**Balance Inconsistencies**
- Run balance reconciliation utility
- Check for failed transactions
- Verify prediction resolution logic

**Performance Issues**
- Ensure all required indexes are created
- Monitor query performance in Firebase Console
- Consider data archival for old records

**Transaction Failures**
- Check Firestore security rules
- Verify network connectivity
- Review error logs for specific failures

### Debug Tools

Use the test script to validate operations:
```bash
npm run token:test
```

Check database health:
```typescript
const report = await DatabaseMaintenanceUtils.generateHealthReport()
console.log(report)
```

## Next Steps

After completing the database setup:
1. Implement Stripe payment integration (Task 4)
2. Build frontend token purchase components (Task 5)
3. Create prediction commitment UI (Task 6)
4. Add transaction history dashboard (Task 7)
5. Implement prediction payout system (Task 8)