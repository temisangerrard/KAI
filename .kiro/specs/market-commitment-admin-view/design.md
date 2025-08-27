# Design Document

## Overview

This design addresses two critical issues: fixing the broken token commitment flow for users and providing basic admin visibility into market commitments. The solution focuses on debugging and fixing the existing commitment API, improving error handling, and creating a simple admin interface to view commitment data.

## Architecture

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Client   │    │   Admin Client   │    │   API Layer     │
│                 │    │                  │    │                 │
│ - Commitment    │    │ - Market List    │    │ - Commit Route  │
│   Modal         │    │ - Commitment     │    │ - Admin Routes  │
│ - Error Display │    │   Analytics      │    │ - Error Handler │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │   Database Layer    │
                    │                     │
                    │ - Markets           │
                    │ - Commitments       │
                    │ - User Balances     │
                    │ - Transactions      │
                    └─────────────────────┘
```

### Data Flow

1. **User Commitment Flow:**
   - User clicks "Back This Opinion" → Modal opens
   - User enters amount → Validation occurs
   - User confirms → API processes commitment
   - Success → Balance updates, modal closes
   - Error → Clear error message displayed

2. **Admin Analytics Flow:**
   - Admin navigates to commitments → API fetches market data
   - Admin selects market → API fetches commitment details
   - Data displays → Real-time statistics shown

## Components and Interfaces

### Frontend Components

#### 1. Enhanced Prediction Commitment Modal
```typescript
interface PredictionCommitmentProps {
  predictionId: string
  predictionTitle: string
  position: 'yes' | 'no'
  currentOdds: number
  maxTokens: number
  onCommit: (tokens: number) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}
```

**Key Improvements:**
- Better error handling and display
- Clearer validation messages
- Loading states during API calls
- Success confirmation feedback

#### 2. Market Commitments Admin View
```typescript
interface MarketCommitmentsViewProps {
  markets: MarketWithCommitments[]
  selectedMarket?: string
  onMarketSelect: (marketId: string) => void
}

interface MarketWithCommitments {
  id: string
  title: string
  status: 'active' | 'resolved' | 'cancelled'
  totalTokensCommitted: number
  participantCount: number
  yesTokens: number
  noTokens: number
  commitments: CommitmentDetail[]
}
```

#### 3. Commitment Analytics Dashboard
```typescript
interface CommitmentAnalytics {
  totalMarketsWithCommitments: number
  totalTokensCommitted: number
  activeCommitments: number
  resolvedCommitments: number
  averageCommitmentSize: number
}
```

### Backend API Endpoints

#### 1. Enhanced Commit Tokens API
```typescript
// POST /api/tokens/commit
interface CommitTokensRequest {
  predictionId: string
  tokensToCommit: number
  position: 'yes' | 'no'
  userId: string
}

interface CommitTokensResponse {
  success: boolean
  commitment?: CommitmentData
  updatedBalance?: BalanceData
  error?: string
  errorCode?: 'INSUFFICIENT_BALANCE' | 'MARKET_CLOSED' | 'INVALID_AMOUNT'
}
```

#### 2. Admin Market Commitments API
```typescript
// GET /api/admin/markets/commitments
interface AdminCommitmentsResponse {
  markets: MarketWithCommitments[]
  analytics: CommitmentAnalytics
}

// GET /api/admin/markets/[id]/commitments
interface MarketCommitmentsResponse {
  market: MarketDetails
  commitments: CommitmentDetail[]
  analytics: MarketAnalytics
}
```

## Data Models

### Enhanced Commitment Model
```typescript
interface CommitmentDetail {
  id: string
  userId: string
  userEmail?: string // For admin display
  predictionId: string
  tokensCommitted: number
  position: 'yes' | 'no'
  odds: number
  potentialWinning: number
  status: 'active' | 'won' | 'lost' | 'refunded'
  committedAt: Timestamp
  resolvedAt?: Timestamp
}
```

### Market Analytics Model
```typescript
interface MarketAnalytics {
  totalTokens: number
  participantCount: number
  yesPercentage: number
  noPercentage: number
  averageCommitment: number
  largestCommitment: number
  commitmentTrend: DailyCommitmentData[]
}
```

## Error Handling

### User-Facing Errors
1. **Insufficient Balance:** Clear message with available balance
2. **Market Closed:** Explanation that market is no longer accepting commitments
3. **Network Errors:** Retry button with clear messaging
4. **Validation Errors:** Inline validation with helpful hints

### Admin Error Handling
1. **Data Loading Errors:** Graceful fallbacks with retry options
2. **Permission Errors:** Clear access denied messages
3. **Empty States:** Helpful messages when no data exists

### API Error Responses
```typescript
interface APIError {
  error: string
  errorCode: string
  details?: Record<string, any>
  timestamp: string
}
```

## Testing Strategy

### Unit Tests
- Commitment modal component behavior
- API endpoint validation logic
- Balance calculation functions
- Error handling scenarios

### Integration Tests
- End-to-end commitment flow
- Admin data fetching and display
- Error state handling
- Balance updates after commitment

### User Acceptance Tests
- User can successfully commit tokens
- Admin can view market commitment data
- Error messages are clear and helpful
- Loading states work properly

## Implementation Phases

### Phase 1: Fix Core Commitment Flow
1. Debug existing commitment API
2. Improve error handling and validation
3. Fix balance update logic
4. Test commitment success scenarios

### Phase 2: Admin Basic View
1. Create admin API endpoints
2. Build market commitments list view
3. Add basic analytics display
4. Implement commitment detail view

### Phase 3: Polish and Testing
1. Add loading states and error handling
2. Improve UI/UX based on testing
3. Add comprehensive error messages
4. Performance optimization

## Security Considerations

### User Commitments
- Validate user authentication before allowing commitments
- Verify user owns sufficient tokens before processing
- Prevent double-spending through atomic transactions
- Rate limiting on commitment API

### Admin Access
- Require admin role verification
- Audit log all admin actions
- Sanitize user data in admin displays
- Prevent unauthorized data access

## Performance Considerations

### Database Optimization
- Index on predictionId for fast commitment queries
- Index on userId for user-specific queries
- Pagination for large commitment lists
- Caching for frequently accessed market data

### Frontend Optimization
- Lazy loading of commitment details
- Debounced search and filtering
- Optimistic UI updates for better UX
- Efficient re-rendering with proper React keys