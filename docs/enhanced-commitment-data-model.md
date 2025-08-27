# Enhanced Commitment Data Model

This document describes the enhancements made to the PredictionCommitment data model as part of task 4 in the market-commitment-admin-view specification.

## Overview

The PredictionCommitment interface has been enhanced to include:
1. User display information for admin views
2. Comprehensive metadata tracking for audit and analytics
3. Server-side validation for data integrity
4. Migration support for existing commitments

## Enhanced Interface

### PredictionCommitment

```typescript
interface PredictionCommitment {
  id: string;
  userId: string;
  predictionId: string;
  tokensCommitted: number;
  position: 'yes' | 'no';
  odds: number;
  potentialWinning: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
  committedAt: Timestamp;
  resolvedAt?: Timestamp;
  
  // NEW: User display information (for admin views)
  userEmail?: string;
  userDisplayName?: string;
  
  // NEW: Commitment metadata tracking
  metadata: {
    // Market state at commitment time
    marketStatus: 'active' | 'closed' | 'resolved' | 'cancelled';
    marketTitle: string;
    marketEndsAt: Timestamp;
    
    // Odds snapshot at commitment time
    oddsSnapshot: {
      yesOdds: number;
      noOdds: number;
      totalYesTokens: number;
      totalNoTokens: number;
      totalParticipants: number;
    };
    
    // Additional tracking data
    userBalanceAtCommitment: number;
    commitmentSource: 'web' | 'mobile' | 'api';
    ipAddress?: string;
    userAgent?: string;
  };
}
```

### New Supporting Interfaces

#### CommitmentWithUser
Extended commitment data for admin views with full user information:

```typescript
interface CommitmentWithUser extends PredictionCommitment {
  user: {
    id: string;
    email: string;
    displayName: string;
    photoURL?: string;
    isAdmin?: boolean;
  };
}
```

#### MarketCommitmentSummary
Aggregated commitment data for market analytics:

```typescript
interface MarketCommitmentSummary {
  marketId: string;
  marketTitle: string;
  marketStatus: 'active' | 'closed' | 'resolved' | 'cancelled';
  totalTokensCommitted: number;
  participantCount: number;
  yesTokens: number;
  noTokens: number;
  averageCommitment: number;
  largestCommitment: number;
  commitments: CommitmentWithUser[];
}
```

## Validation Enhancements

### Server-Side Validation Service

A new `CommitmentValidationService` provides comprehensive validation:

#### Features:
- **Request Validation**: Validates commitment requests before processing
- **Integrity Checks**: Validates existing commitment data for consistency
- **Batch Validation**: Processes multiple commitments efficiently
- **Metadata Generation**: Creates proper metadata for new commitments

#### Key Methods:

```typescript
// Validate a commitment request
static async validateCommitmentRequest(
  request: TokenCommitmentRequest,
  userBalance: UserBalance,
  market: Market
): Promise<CommitmentValidationResult>

// Validate commitment data integrity
static async validateCommitmentIntegrity(
  commitment: PredictionCommitment
): Promise<CommitmentIntegrityCheck>

// Create metadata for new commitments
static async createCommitmentMetadata(
  market: Market,
  userBalance: UserBalance,
  request: TokenCommitmentRequest,
  clientInfo?: ClientInfo
): Promise<PredictionCommitment['metadata']>
```

### Enhanced Zod Schemas

Updated validation schemas include:
- Metadata field validation
- User display information validation
- Comprehensive error messages
- Backward compatibility support

## Data Migration

### Migration Script

A comprehensive migration script handles existing commitments:

```bash
# Dry run to see what would be migrated
npm run commitment:migrate dry-run

# Run the actual migration
npm run commitment:migrate migrate

# Rollback if needed
npm run commitment:migrate rollback
```

### Migration Features:
- **Batch Processing**: Handles large datasets efficiently
- **Error Handling**: Continues processing despite individual failures
- **Rollback Support**: Can undo migrations if needed
- **Progress Tracking**: Provides detailed progress reports

### Migration Process:
1. Identifies commitments missing metadata
2. Reconstructs metadata from available market data
3. Updates commitments in batches
4. Provides detailed success/failure reports

## API Integration

### Enhanced Commit API

The `/api/tokens/commit` endpoint now:
- Uses the validation service for request validation
- Generates comprehensive metadata for new commitments
- Includes client information (IP, user agent) in metadata
- Provides better error handling and reporting

### Example Usage:

```typescript
// The API automatically creates metadata when processing commitments
const commitment = await fetch('/api/tokens/commit', {
  method: 'POST',
  body: JSON.stringify({
    predictionId: 'market123',
    tokensToCommit: 100,
    position: 'yes',
    userId: 'user456'
  })
});
```

## Benefits

### For Administrators:
- **Better Analytics**: Rich metadata enables detailed market analysis
- **Audit Trail**: Complete tracking of commitment context
- **Data Integrity**: Validation ensures consistent data quality
- **User Information**: Easy access to user details for support

### For Developers:
- **Type Safety**: Enhanced TypeScript interfaces
- **Validation**: Comprehensive server-side validation
- **Migration Support**: Safe upgrade path for existing data
- **Testing**: Full test coverage for new functionality

### For Users:
- **Reliability**: Better error handling and validation
- **Transparency**: Complete commitment history tracking
- **Performance**: Optimized data structures for faster queries

## Testing

Comprehensive test coverage includes:
- Unit tests for validation service
- Integration tests for API endpoints
- Migration script testing
- Schema validation testing

Run tests with:
```bash
npm test -- __tests__/services/commitment-validation-service.test.ts
npm test -- __tests__/scripts/migrate-commitment-metadata.test.ts
```

## Backward Compatibility

The enhanced model maintains backward compatibility:
- Existing commitments continue to work
- New fields are optional in validation
- Migration script handles legacy data
- Gradual rollout supported

## Future Enhancements

Potential future improvements:
- Real-time metadata updates
- Advanced analytics dashboards
- Machine learning insights from metadata
- Enhanced user behavior tracking