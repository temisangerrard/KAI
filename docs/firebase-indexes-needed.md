# Firebase Indexes Required

## Prediction Commitments Collection

For optimal performance of the efficient data service, the following composite indexes are recommended:

### 1. User Commitments Query
**Collection:** `prediction_commitments`
**Fields:**
- `userId` (Ascending)
- `committedAt` (Descending)
- `__name__` (Ascending)

**Firebase Console Link:**
```
https://console.firebase.google.com/v1/r/project/kai-app-99557/firestore/indexes?create_composite=Clxwcm9qZWN0cy9rYWktYXBwLTk5NTU3L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9wcmVkaWN0aW9uX2NvbW1pdG1lbnRzL2luZGV4ZXMvXxABGgoKBnVzZXJJZBABGg8KC2NvbW1pdHRlZEF0EAIaDAoIX19uYW1lX18QAg
```

### 2. Active Commitments Query (Optional)
**Collection:** `prediction_commitments`
**Fields:**
- `userId` (Ascending)
- `status` (Ascending)
- `committedAt` (Descending)

### 3. Token Transactions Query
**Collection:** `token_transactions`
**Fields:**
- `userId` (Ascending)
- `status` (Ascending)
- `timestamp` (Descending)

## Fallback Strategy

The application includes fallback mechanisms:

1. **EfficientDataService** - Uses optimized queries with indexes
2. **SimpleCommitmentService** - Uses basic queries without orderBy
3. **Original Services** - Legacy services as final fallback

If indexes are not created, the application will automatically fall back to simpler queries that don't require indexes, though performance may be reduced.

## Creating Indexes

1. Click the Firebase Console link above
2. Review the index configuration
3. Click "Create Index"
4. Wait for index creation to complete (can take several minutes)

## Monitoring

Check the Firebase Console for:
- Index creation status
- Query performance
- Read/write costs

The efficient data service includes caching to minimize Firebase reads and reduce costs.