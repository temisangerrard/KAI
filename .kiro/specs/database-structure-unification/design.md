# Design Document

## Overview

This design establishes a unified database structure for the KAI prediction platform by consolidating multiple conflicting Market interfaces into a single source of truth, implementing comprehensive status management, and creating centralized data transformation services. The solution eliminates the current chaos of property name conflicts, incomplete enums, and fragmented transformation logic that prevents reliable market resolution functionality.

## Architecture

### Root Cause Analysis

#### Current Database Structure Problems
1. **Multiple Market Interfaces**: Three different interface definitions with conflicting property names
2. **Incomplete Status Enums**: Different parts of the codebase support different subsets of market status values
3. **Fragmented Transformations**: Data conversion scattered across multiple files with inconsistent logic
4. **No Single Source of Truth**: Services import different interfaces and expect different data structures

#### Impact on Market Resolution
- Market resolution fails because services expect different property names
- Status transitions fail because enums don't match database values
- Data validation fails because Zod schemas are incomplete
- Service integration fails because interfaces are incompatible

### Unified Database Architecture

#### Single Source of Truth: Comprehensive Market Interface
```typescript
// lib/types/market.ts - New unified location
export interface Market {
  // Identity
  id: string
  title: string
  description: string
  category: MarketCategory
  
  // Status and Lifecycle
  status: MarketStatus
  createdAt: Timestamp
  endsAt: Timestamp
  resolvedAt?: Timestamp
  
  // Market Structure
  options: MarketOption[]
  
  // Participation Metrics (calculated from commitments)
  totalParticipants: number
  totalTokensStaked: number
  
  // Resolution Data
  pendingResolution?: boolean
  resolution?: MarketResolution
  creatorFeePercentage?: number
  
  // Metadata
  tags: string[]
  featured: boolean
  trending: boolean
  imageUrl?: string
  adminNotes?: string
  
  // Creator Information
  createdBy: string
}

// User Commitment Tracking (CRITICAL for market resolution)
export interface PredictionCommitment {
  id: string
  userId: string
  predictionId: string  // Links to Market.id
  tokensCommitted: number
  position: 'yes' | 'no'
  odds: number
  potentialWinning: number
  status: 'active' | 'won' | 'lost' | 'refunded'
  committedAt: Timestamp
  resolvedAt?: Timestamp
  
  // User display information (for admin views)
  userEmail?: string
  userDisplayName?: string
  
  // Commitment metadata tracking
  metadata: {
    marketStatus: MarketStatus
    marketTitle: string
    marketEndsAt: Timestamp
    oddsSnapshot: {
      yesOdds: number
      noOdds: number
      totalYesTokens: number
      totalNoTokens: number
      totalParticipants: number
    }
    userBalanceAtCommitment: number
    commitmentSource: 'web' | 'mobile' | 'api'
    ipAddress?: string
    userAgent?: string
  }
}

// Token Balance Tracking
export interface UserBalance {
  userId: string
  availableTokens: number
  committedTokens: number
  totalEarned: number
  totalSpent: number
  lastUpdated: Timestamp
  version: number // For optimistic locking
}

// Transaction History
export interface TokenTransaction {
  id: string
  userId: string
  type: 'purchase' | 'commit' | 'win' | 'loss' | 'refund'
  amount: number
  balanceBefore: number
  balanceAfter: number
  relatedId?: string // predictionId or purchaseId
  metadata: {
    stripePaymentId?: string
    predictionTitle?: string
    packageId?: string
    [key: string]: any
  }
  timestamp: Timestamp
  status: 'pending' | 'completed' | 'failed'
}
```

#### Comprehensive Status Management
```typescript
// lib/types/market.ts
export type MarketStatus = 
  | 'draft'              // Created but not published
  | 'active'             // Live and accepting predictions
  | 'closed'             // No longer accepting predictions
  | 'pending_resolution' // Past end date, awaiting admin resolution
  | 'resolving'          // Currently being resolved by admin
  | 'resolved'           // Outcome determined and payouts distributed
  | 'cancelled'          // Market cancelled

// Legacy status mapping for backward compatibility
export const LEGACY_STATUS_MAP: Record<string, MarketStatus> = {
  'ended': 'resolved',
  'active': 'active',
  'cancelled': 'cancelled'
}
```

#### Centralized Data Transformation Service
```typescript
// lib/services/market-data-service.ts
export class MarketDataService {
  // Transform Firestore document to unified Market interface
  static fromFirestore(doc: DocumentSnapshot): Market
  
  // Transform unified Market interface to Firestore data
  static toFirestore(market: Market): FirestoreMarketData
  
  // Validate market data against unified schema
  static validate(data: unknown): Market | null
  
  // Handle legacy data migration
  static migrateLegacyData(legacyData: any): Market
  
  // CRITICAL: Calculate participation metrics from commitments
  static async calculateParticipationMetrics(marketId: string): Promise<{
    totalParticipants: number
    totalTokensStaked: number
    optionBreakdown: {
      optionId: string
      totalTokens: number
      participantCount: number
    }[]
  }>
  
  // Get all commitments for a market (needed for resolution)
  static async getMarketCommitments(marketId: string): Promise<PredictionCommitment[]>
  
  // Update market metrics when commitments change
  static async updateMarketMetrics(marketId: string): Promise<void>
}

// Commitment Data Service (integrates with market data)
export class CommitmentDataService {
  // Get user's commitments for a market
  static async getUserCommitments(userId: string, marketId: string): Promise<PredictionCommitment[]>
  
  // Create new commitment (updates market metrics)
  static async createCommitment(commitment: Omit<PredictionCommitment, 'id' | 'committedAt'>): Promise<PredictionCommitment>
  
  // Resolve commitments when market resolves
  static async resolveCommitments(marketId: string, winningOptionId: string): Promise<PayoutResult>
  
  // Get commitment analytics for admin
  static async getCommitmentAnalytics(marketId: string): Promise<MarketAnalytics>
}
```

## Components and Interfaces

### Unified Market Interface Structure

#### Core Market Data
```typescript
interface Market {
  // Use comprehensive interface from lib/types/database.ts as base
  // Standardize on: totalParticipants, totalTokensStaked, createdAt, endsAt
  // Remove: participants, totalTokens, startDate, endDate (legacy names)
}
```

#### Market Option Structure
```typescript
interface MarketOption {
  id: string
  text: string                    // Standardize on 'text' (not 'name')
  totalTokens: number            // Standardize on 'totalTokens'
  participantCount: number       // Standardize on 'participantCount'
  odds?: number
  isCorrect?: boolean
  imageUrl?: string
}
```

#### Validation Schema Unification
```typescript
// Unified Zod schema matching the comprehensive interface
const UnifiedMarketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.nativeEnum(MarketCategory),
  status: z.nativeEnum(MarketStatus),
  createdAt: z.instanceof(Timestamp),
  endsAt: z.instanceof(Timestamp),
  resolvedAt: z.instanceof(Timestamp).optional(),
  options: z.array(MarketOptionSchema),
  totalParticipants: z.number(),
  totalTokensStaked: z.number(),
  pendingResolution: z.boolean().optional(),
  resolution: MarketResolutionSchema.optional(),
  creatorFeePercentage: z.number().optional(),
  tags: z.array(z.string()),
  featured: z.boolean(),
  trending: z.boolean(),
  imageUrl: z.string().optional(),
  adminNotes: z.string().optional(),
  createdBy: z.string()
})
```

### Service Layer Unification

#### Market Data Service (New Centralized Service)
```typescript
class MarketDataService {
  // Centralized data transformation
  static async fromFirestore(doc: DocumentSnapshot): Promise<Market> {
    const data = doc.data()
    
    // CRITICAL: Calculate real-time participation metrics from commitments
    const participationMetrics = await this.calculateParticipationMetrics(doc.id)
    
    // Handle legacy field mapping
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      category: data.category,
      status: this.normalizeStatus(data.status),
      createdAt: data.createdAt || data.startDate,
      endsAt: data.endsAt || data.endDate,
      resolvedAt: data.resolvedAt,
      options: await this.normalizeOptionsWithCommitments(data.options, doc.id),
      // REAL participation data from commitments (not cached/stale data)
      totalParticipants: participationMetrics.totalParticipants,
      totalTokensStaked: participationMetrics.totalTokensStaked,
      // ... handle all field mappings consistently
    }
  }
  
  // CRITICAL: Calculate participation from actual commitments
  static async calculateParticipationMetrics(marketId: string): Promise<{
    totalParticipants: number
    totalTokensStaked: number
    optionBreakdown: { optionId: string; totalTokens: number; participantCount: number }[]
  }> {
    const commitments = await this.getMarketCommitments(marketId)
    
    const uniqueUsers = new Set(commitments.map(c => c.userId))
    const totalTokensStaked = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
    
    // Group by option for accurate option-level metrics
    const optionBreakdown = commitments.reduce((acc, commitment) => {
      const optionId = commitment.position // 'yes' or 'no' maps to option
      if (!acc[optionId]) {
        acc[optionId] = { totalTokens: 0, users: new Set() }
      }
      acc[optionId].totalTokens += commitment.tokensCommitted
      acc[optionId].users.add(commitment.userId)
      return acc
    }, {} as Record<string, { totalTokens: number; users: Set<string> }>)
    
    return {
      totalParticipants: uniqueUsers.size,
      totalTokensStaked,
      optionBreakdown: Object.entries(optionBreakdown).map(([optionId, data]) => ({
        optionId,
        totalTokens: data.totalTokens,
        participantCount: data.users.size
      }))
    }
  }
  
  // Get commitments for market resolution
  static async getMarketCommitments(marketId: string): Promise<PredictionCommitment[]> {
    const commitmentsQuery = query(
      collection(db, 'prediction_commitments'),
      where('predictionId', '==', marketId),
      where('status', '==', 'active')
    )
    
    const snapshot = await getDocs(commitmentsQuery)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PredictionCommitment))
  }
  
  // Normalize options with real commitment data
  static async normalizeOptionsWithCommitments(options: any[], marketId: string): Promise<MarketOption[]> {
    const participationMetrics = await this.calculateParticipationMetrics(marketId)
    
    return options.map(option => {
      const optionMetrics = participationMetrics.optionBreakdown.find(
        breakdown => breakdown.optionId === option.id || 
                    (option.id === 'yes' && breakdown.optionId === 'yes') ||
                    (option.id === 'no' && breakdown.optionId === 'no')
      )
      
      return {
        id: option.id,
        text: option.text || option.name,
        totalTokens: optionMetrics?.totalTokens || 0,
        participantCount: optionMetrics?.participantCount || 0,
        odds: option.odds,
        isCorrect: option.isCorrect,
        imageUrl: option.imageUrl
      }
    })
  }
}
```

#### Updated Service Interfaces
```typescript
// All services will use the unified interface
interface TrendingService {
  getTrendingMarkets(markets: Market[]): TrendingMarket[]
  // Uses: market.totalParticipants, market.totalTokensStaked, market.createdAt
}

interface MarketService {
  getAllMarkets(): Promise<Market[]>
  getMarketById(id: string): Promise<Market | null>
  // Returns: unified Market interface
}

interface ResolutionService {
  getPendingResolutionMarkets(): Promise<Market[]>
  resolveMarket(marketId: string, ...): Promise<ResolutionResult>
  // Uses: unified Market interface with complete status enum
}
```

## Data Models

### Migration Strategy

#### Phase 1: Create Unified Interface
```typescript
// lib/types/market.ts - New single source of truth
export { Market, MarketStatus, MarketOption } from './database'

// Deprecate old interfaces
// lib/db/database.ts - Mark as deprecated
/** @deprecated Use lib/types/market.ts instead */
export interface Market { ... }
```

#### Phase 2: Centralized Data Service
```typescript
// lib/services/market-data-service.ts
export class MarketDataService {
  // All market data operations go through this service
  // Handles all legacy data transformation
  // Provides consistent validation
}
```

#### Phase 3: Service Updates
```typescript
// Update all services to use unified interface
// lib/services/trending-service.ts
import { Market } from '@/lib/types/market'

// app/markets/create/market-service.ts  
import { Market } from '@/lib/types/market'

// All other services...
```

#### Phase 4: Validation Unification
```typescript
// Update all Zod schemas to match unified interface
// Remove property name transformations
// Use complete status enum everywhere
```

### Backward Compatibility Strategy

#### Legacy Data Handling
```typescript
class MarketDataService {
  static migrateLegacyData(data: any): Market {
    // Handle old property names
    const participants = data.totalParticipants || data.participants || 0
    const totalTokens = data.totalTokensStaked || data.totalTokens || 0
    const createdAt = data.createdAt || data.startDate
    const endsAt = data.endsAt || data.endDate
    const status = LEGACY_STATUS_MAP[data.status] || data.status
    
    return {
      // ... map to unified interface
    }
  }
}
```

#### Gradual Migration
```typescript
// Services can gradually migrate to unified interface
// Old interfaces marked as deprecated but still functional
// Data transformation handles both old and new formats
// No breaking changes during transition
```

## Error Handling

### Validation Error Prevention

#### Compile-Time Safety
```typescript
// TypeScript strict mode enforcement
// Single interface import prevents property name conflicts
// Comprehensive status enum prevents invalid status values
// Zod schema matches TypeScript interface exactly
```

#### Runtime Error Handling
```typescript
class MarketDataService {
  static validate(data: unknown): Market | null {
    try {
      const result = UnifiedMarketSchema.safeParse(data)
      if (result.success) {
        return result.data
      } else {
        console.warn('Market validation failed:', result.error)
        // Attempt legacy data migration
        return this.migrateLegacyData(data)
      }
    } catch (error) {
      console.error('Market validation error:', error)
      return null
    }
  }
}
```

#### Graceful Degradation
```typescript
// If validation fails, attempt legacy data migration
// If migration fails, return null and log error
// Services handle null markets gracefully
// No application crashes from data structure issues
```

## Testing Strategy

### Interface Consistency Testing
```typescript
describe('Market Interface Consistency', () => {
  it('should use unified interface across all services', () => {
    // Verify all services import from same source
    // Verify property names are consistent
    // Verify status enum is complete
  })
  
  it('should validate market data correctly', () => {
    // Test Zod schema matches TypeScript interface
    // Test legacy data migration
    // Test error handling
  })
})
```

### Service Integration Testing
```typescript
describe('Service Integration', () => {
  it('should work with unified market data', () => {
    // Test trending service with unified interface
    // Test market service with unified interface
    // Test resolution service with unified interface
  })
})
```

## Implementation Phases

### Phase 1: Foundation (Critical Priority)
- **Duration**: 2-3 hours
- **Create unified Market interface** in `lib/types/market.ts`
- **Create MarketDataService** for centralized transformations
- **Update Zod schemas** to match unified interface
- **Risk**: Low - additive changes only

### Phase 2: Service Migration (High Priority)
- **Duration**: 3-4 hours
- **Update trending service** to use unified interface
- **Update market service** to use unified interface
- **Update admin services** to use unified interface
- **Risk**: Medium - requires testing all service integrations

### Phase 3: Legacy Cleanup (Medium Priority)
- **Duration**: 1-2 hours
- **Mark old interfaces as deprecated**
- **Remove property transformations** from individual services
- **Consolidate validation logic**
- **Risk**: Low - cleanup and optimization

### Phase 4: Market Resolution Integration (High Priority)
- **Duration**: 2-3 hours
- **Update resolution services** to use unified interface
- **Test complete market resolution workflow**
- **Verify status transitions work correctly**
- **Risk**: Medium - depends on unified interface working correctly

## Success Criteria

### Immediate Success Indicators
1. **Single Interface Import**: All services import Market from same source
2. **Consistent Property Access**: No property name conflicts in any service
3. **Complete Status Support**: All status values work in validation and queries
4. **Centralized Transformations**: All Firestore data goes through MarketDataService

### Functional Success Indicators
1. **Markets Load Successfully**: No Zod validation errors or property access errors
2. **Services Work Together**: Trending, creation, and admin services all work with same data
3. **Status Transitions Work**: Market resolution can transition through all status values
4. **No Runtime Errors**: No console errors from interface mismatches

### Long-term Success Indicators
1. **Maintainable Codebase**: New market features can be added without interface conflicts
2. **Reliable Market Resolution**: Market resolution works consistently with unified data structure
3. **Scalable Architecture**: Database structure supports future market features
4. **Developer Experience**: Clear, consistent interfaces make development faster and safer