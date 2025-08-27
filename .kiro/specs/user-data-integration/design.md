# Design Document

## Overview

This design outlines the integration of real user data throughout the KAI platform, replacing mock data with actual database queries. The focus is on ensuring users see their authentic activity, balances, and participation history through efficient data fetching and real-time updates.

## Architecture

### Data Flow Architecture
```
User Authentication → User ID → Database Queries → Real-time Updates → UI Components
```

### Key Components
- **Data Services**: Centralized services for user data fetching
- **Real-time Listeners**: Firebase listeners for live data updates
- **State Management**: React hooks for managing user-specific data
- **Error Boundaries**: Graceful handling of data loading failures

## Components and Interfaces

### Core Data Services

#### UserDataService
```typescript
interface UserDataService {
  getUserBalance(userId: string): Promise<UserBalance>
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>
  getUserCommitments(userId: string): Promise<PredictionCommitment[]>
  getUserMarketParticipation(userId: string): Promise<MarketParticipation[]>
}
```

#### Real-time Data Hooks
```typescript
interface UserDataHooks {
  useUserBalance(userId: string): { balance: UserBalance, loading: boolean, error: Error }
  useUserTransactions(userId: string): { transactions: Transaction[], loading: boolean, error: Error }
  useUserCommitments(userId: string): { commitments: PredictionCommitment[], loading: boolean, error: Error }
}
```

### Updated Component Interfaces

#### WalletPage Integration
- Replace mock transaction array with real data from `useUserTransactions`
- Connect balance display to `useUserBalance` hook
- Implement real-time balance updates via Firebase listeners

#### User Dashboard Integration
- Replace mock commitment data with real `useUserCommitments` data
- Show actual market participation from database
- Display real performance metrics calculated from user data

## Data Models

### Enhanced User Data Queries
```typescript
// Firestore collection queries
const getUserTransactions = (userId: string) => {
  return db.collection('transactions')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(50)
}

const getUserCommitments = (userId: string) => {
  return db.collection('prediction_commitments')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
}
```

### Data Transformation Layer
```typescript
interface DataTransformer {
  transformTransactionForUI(transaction: FirestoreTransaction): UITransaction
  transformCommitmentForUI(commitment: FirestoreCommitment): UICommitment
  calculateUserStats(commitments: PredictionCommitment[]): UserStats
}
```

## Error Handling

### Loading States
- **Skeleton Components**: Show loading skeletons while fetching real data
- **Progressive Loading**: Load critical data first (balance), then secondary data (history)
- **Retry Logic**: Automatic retry for failed data fetches

### Error States
- **Network Errors**: Show "Unable to load data" with retry button
- **Empty States**: Show appropriate messages when users have no data
- **Fallback UI**: Graceful degradation when data services are unavailable

### Error Boundaries
```typescript
interface DataErrorBoundary {
  handleDataLoadError(error: Error, componentName: string): void
  showFallbackUI(errorType: 'network' | 'empty' | 'permission'): ReactNode
}
```

## Testing Strategy

### Unit Testing
- Test data service functions with mock Firebase responses
- Test data transformation utilities with sample data
- Test React hooks with mock data scenarios

### Integration Testing
- Test complete data flow from authentication to UI display
- Test real-time update scenarios with Firebase emulator
- Test error handling with network failure simulations

### User Acceptance Testing
- Verify users see their actual data after login
- Test data consistency across different components
- Validate real-time updates during user interactions

## Performance Considerations

### Data Fetching Optimization
- **Pagination**: Load transaction history in chunks
- **Caching**: Cache frequently accessed user data
- **Selective Queries**: Only fetch data needed for current view

### Real-time Updates
- **Efficient Listeners**: Use targeted Firebase listeners to minimize data transfer
- **Debouncing**: Prevent excessive updates during rapid user actions
- **Connection Management**: Handle offline/online state transitions

## Security Considerations

### Data Access Control
- **User Isolation**: Ensure users can only access their own data
- **Firebase Rules**: Implement strict Firestore security rules
- **Authentication Checks**: Verify user authentication before data queries

### Data Privacy
- **Minimal Data Exposure**: Only fetch data needed for UI components
- **Secure Transmission**: Use Firebase's built-in encryption
- **Error Logging**: Avoid logging sensitive user data in error messages