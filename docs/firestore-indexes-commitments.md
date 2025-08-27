# Firestore Indexes for Admin Commitment Queries

This document outlines the required Firestore indexes for optimal performance of the admin market commitments API.

## Required Composite Indexes

### 1. Commitment Queries by User and Status
```
Collection: prediction_commitments
Fields:
- userId (Ascending)
- status (Ascending) 
- committedAt (Descending)
```

### 2. Commitment Queries by Market and Status
```
Collection: prediction_commitments
Fields:
- predictionId (Ascending)
- status (Ascending)
- committedAt (Descending)
```

### 3. Commitment Queries by Market and Position
```
Collection: prediction_commitments
Fields:
- predictionId (Ascending)
- position (Ascending)
- committedAt (Descending)
```

### 4. Commitment Queries by User, Market and Status
```
Collection: prediction_commitments
Fields:
- userId (Ascending)
- predictionId (Ascending)
- status (Ascending)
- committedAt (Descending)
```

### 5. Commitment Queries Sorted by Token Amount
```
Collection: prediction_commitments
Fields:
- predictionId (Ascending)
- tokensCommitted (Descending)
```

### 6. Commitment Queries Sorted by Odds
```
Collection: prediction_commitments
Fields:
- predictionId (Ascending)
- odds (Descending)
```

### 7. Commitment Queries Sorted by Potential Winning
```
Collection: prediction_commitments
Fields:
- predictionId (Ascending)
- potentialWinning (Descending)
```

### 8. Global Commitment Queries with Status Filter
```
Collection: prediction_commitments
Fields:
- status (Ascending)
- committedAt (Descending)
```

### 9. Global Commitment Queries with Position Filter
```
Collection: prediction_commitments
Fields:
- position (Ascending)
- committedAt (Descending)
```

## Single Field Indexes

These are automatically created by Firestore, but listed for completeness:

- `userId` (Ascending)
- `predictionId` (Ascending)
- `status` (Ascending)
- `position` (Ascending)
- `committedAt` (Descending)
- `tokensCommitted` (Descending)
- `odds` (Descending)
- `potentialWinning` (Descending)

## Index Creation Commands

To create these indexes using the Firebase CLI:

```bash
# Create the indexes using firestore.indexes.json
firebase deploy --only firestore:indexes
```

## firestore.indexes.json Configuration

Add this to your `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "prediction_commitments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "committedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "prediction_commitments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "predictionId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "committedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "prediction_commitments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "predictionId", "order": "ASCENDING" },
        { "fieldPath": "position", "order": "ASCENDING" },
        { "fieldPath": "committedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "prediction_commitments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "predictionId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "committedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "prediction_commitments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "predictionId", "order": "ASCENDING" },
        { "fieldPath": "tokensCommitted", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "prediction_commitments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "predictionId", "order": "ASCENDING" },
        { "fieldPath": "odds", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "prediction_commitments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "predictionId", "order": "ASCENDING" },
        { "fieldPath": "potentialWinning", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "prediction_commitments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "committedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "prediction_commitments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "position", "order": "ASCENDING" },
        { "fieldPath": "committedAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## Performance Considerations

1. **Query Optimization**: The indexes are designed to support the most common query patterns in the admin interface.

2. **Pagination**: Use cursor-based pagination with `startAfter()` for better performance with large datasets.

3. **Batch Operations**: User information is fetched in batches to minimize database calls.

4. **Caching**: Consider implementing caching for frequently accessed data like user profiles.

5. **Monitoring**: Monitor query performance and adjust indexes based on actual usage patterns.

## Query Examples

### Get commitments for a specific market, sorted by tokens
```typescript
query(
  collection(db, 'prediction_commitments'),
  where('predictionId', '==', marketId),
  orderBy('tokensCommitted', 'desc'),
  limit(20)
)
```

### Get active commitments for a user
```typescript
query(
  collection(db, 'prediction_commitments'),
  where('userId', '==', userId),
  where('status', '==', 'active'),
  orderBy('committedAt', 'desc')
)
```

### Get commitments with pagination
```typescript
query(
  collection(db, 'prediction_commitments'),
  where('predictionId', '==', marketId),
  orderBy('committedAt', 'desc'),
  startAfter(lastDoc),
  limit(pageSize)
)
```