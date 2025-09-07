# Design Document

## Overview

This design establishes a comprehensive commitment tracking and payout distribution system for the KAI prediction platform that supports unlimited market options, accurate individual commitment tracking, and precise payout calculations. The system replaces the current binary yes/no commitment structure with a flexible option-based system that can handle complex markets with multiple outcomes while maintaining complete audit trails for every commitment and payout.

## Architecture

### Current System Analysis

#### What Works Well ✅
1. **Individual Commitment Records**: Each commitment gets unique ID and separate database record
2. **Creator Tracking**: Markets properly track `createdBy` field
3. **Multiple Commitments**: Users can make multiple commitments (each gets separate record)
4. **Comprehensive Metadata**: Rich metadata tracking in commitment records
5. **Robust Admin Analytics**: AdminCommitmentService provides comprehensive market analytics
6. **Dashboard Integration**: Multiple admin dashboards successfully consume commitment data
7. **Real-time Updates**: Live commitment tracking and balance updates work reliably

#### Critical Problems ❌
1. **Binary Position Limitation**: `position: 'yes' | 'no'` restricts markets to 2 options only
2. **Option ID Disconnect**: Commitments don't properly link to specific `MarketOption.id` values
3. **UI Limitation**: Commitment components only support binary choices
4. **Payout Calculation Gap**: Resolution system can't handle multi-option markets accurately

#### Existing Dependencies (Must Be Preserved) 🔒
1. **AdminCommitmentService.getMarketCommitments()** - Used by resolution dashboard and markets page
2. **AdminCommitmentService.getCommitmentsWithUsers()** - Powers admin analytics
3. **PredictionCommitment interface** - Expected by all dashboard components
4. **Market statistics calculations** - totalParticipants, totalTokensStaked aggregations
5. **Dashboard query patterns** - All admin dashboards expect current data structure

### Enhanced Commitment Tracking Architecture

#### Backward-Compatible Option-Based Commitment System
```typescript
// Enhanced PredictionCommitment (backward compatible with existing system)
export interface PredictionCommitment {
  id: string
  userId: string
  marketId: string
  
  // NEW: Direct option linking (replaces binary position system)
  optionId: string        // ✅ Links directly to MarketOption.id
  
  // DEPRECATED BUT PRESERVED: Binary position for backward compatibility
  position?: 'yes' | 'no' // ⚠️ Maintained for existing commitments, derived for new ones
  
  // RENAMED: predictionId -> marketId for clarity (with alias support)
  predictionId?: string   // ⚠️ Alias for marketId to maintain compatibility
  
  tokensCommitted: number
  odds: number           // Odds at time of commitment
  potentialWinning: number
  status: 'active' | 'won' | 'lost' | 'refunded'
  committedAt: Timestamp
  resolvedAt?: Timestamp
  
  // User information for admin tracking (existing)
  userEmail?: string
  userDisplayName?: string
  
  // Enhanced commitment metadata (backward compatible)
  metadata: {
    // Market context at commitment time
    marketTitle: string
    marketStatus: MarketStatus
    marketEndsAt: Timestamp
    
    // NEW: Option context at commitment time
    optionText: string
    optionIndex: number
    
    // NEW: Market state snapshot for audit trail
    marketSnapshot: {
      totalOptions: number
      allOptionsData: {
        optionId: string
        text: string
        totalTokens: number
        participantCount: number
        odds: number
      }[]
    }
    
    // Existing user context (preserved)
    userBalanceAtCommitment: number
    commitmentSource: 'web' | 'mobile' | 'api'
    ipAddress?: string
    userAgent?: string
    
    // EXISTING: Preserved for backward compatibility
    oddsSnapshot?: {
      yesOdds: number
      noOdds: number
      totalYesTokens: number
      totalNoTokens: number
      totalParticipants: number
    }
  }
}
```

#### Multi-Option Market Structure
```typescript
// Enhanced Market interface supporting unlimited options
export interface Market {
  id: string
  title: string
  description: string
  category: MarketCategory
  status: MarketStatus
  createdBy: string      // ✅ Creator tracking
  createdAt: Timestamp
  endsAt: Timestamp
  resolvedAt?: Timestamp
  
  // Flexible option system (2 to 10+ options)
  options: MarketOption[]
  
  // Calculated participation metrics
  totalParticipants: number
  totalTokensStaked: number
  
  // Resolution data
  pendingResolution?: boolean
  resolution?: MarketResolution
  creatorFeePercentage?: number
  
  // Metadata
  tags: string[]
  featured: boolean
  trending: boolean
  imageUrl?: string
  adminNotes?: string
}

// Enhanced MarketOption for multi-option support
export interface MarketOption {
  id: string              // ✅ Unique ID like "option_market123_0"
  text: string           // ✅ "Option A", "Candidate Smith", "Team Red", etc.
  imageUrl?: string
  totalTokens: number    // ✅ Calculated from commitments to this option
  participantCount: number // ✅ Unique users who committed to this option
  odds?: number          // ✅ Calculated odds for this option
  isCorrect?: boolean    // ✅ Set when market resolves (only one option can be true)
}
```

## Components and Interfaces

### Accurate Commitment Tracking System

#### Commitment Creation Flow
```typescript
interface CommitmentCreationFlow {
  // 1. User selects specific option from market
  selectedOption: MarketOption
  
  // 2. System creates commitment linked to option ID
  commitment: {
    userId: string
    marketId: string
    optionId: string      // ✅ Direct link to selected option
    tokensCommitted: number
    odds: number          // Current odds for this option
  }
  
  // 3. System updates option metrics
  optionUpdate: {
    totalTokens: number   // Add committed tokens
    participantCount: number // Add user if first commitment to this option
  }
  
  // 4. System updates market metrics
  marketUpdate: {
    totalParticipants: number    // Unique users across all options
    totalTokensStaked: number    // Sum of all commitments across all options
  }
}
```

#### Multi-Commitment Tracking Example
```typescript
// User makes 30 commitments across 4 options in one market
interface MultiCommitmentExample {
  marketId: "market_fashion_awards_2024"
  marketOptions: [
    { id: "option_1", text: "Designer A wins" },
    { id: "option_2", text: "Designer B wins" },
    { id: "option_3", text: "Designer C wins" },
    { id: "option_4", text: "Designer D wins" }
  ]
  
  userCommitments: [
    // 10 commitments to Designer A
    { id: "commit_1", optionId: "option_1", tokensCommitted: 100 },
    { id: "commit_2", optionId: "option_1", tokensCommitted: 50 },
    // ... 8 more to option_1
    
    // 8 commitments to Designer B  
    { id: "commit_11", optionId: "option_2", tokensCommitted: 75 },
    // ... 7 more to option_2
    
    // 7 commitments to Designer C
    { id: "commit_19", optionId: "option_3", tokensCommitted: 200 },
    // ... 6 more to option_3
    
    // 5 commitments to Designer D
    { id: "commit_26", optionId: "option_4", tokensCommitted: 25 },
    // ... 4 more to option_4
  ]
  
  // Query: Get all user commitments for this market
  query: {
    collection: "prediction_commitments",
    where: [
      ["userId", "==", "user123"],
      ["marketId", "==", "market_fashion_awards_2024"]
    ]
    // Returns: All 30 commitments with exact option targeting
  }
}
```

### Accurate Payout Distribution System

#### Payout Calculation Logic
```typescript
interface PayoutCalculationSystem {
  // 1. Market resolves with winning option
  resolution: {
    marketId: string
    winningOptionId: string  // e.g., "option_2" (Designer B wins)
  }
  
  // 2. Find all winning commitments
  winningCommitments: PredictionCommitment[] // All commitments where optionId === winningOptionId
  
  // 3. Calculate individual payouts
  payoutCalculations: {
    userId: string
    commitmentId: string
    tokensCommitted: number
    odds: number
    payoutAmount: number
    profit: number
  }[]
  
  // 4. Distribute payouts to user balances
  balanceUpdates: {
    userId: string
    totalPayout: number    // Sum of all winning commitments for this user
    individualPayouts: {
      commitmentId: string
      amount: number
    }[]
  }[]
}
```

#### Multi-Commitment Payout Example
```typescript
// User had 30 commitments, 8 were on winning option
interface PayoutExample {
  marketResolution: {
    winningOptionId: "option_2" // Designer B wins
  }
  
  userWinningCommitments: [
    { id: "commit_11", optionId: "option_2", tokensCommitted: 75, odds: 3.2 },
    { id: "commit_12", optionId: "option_2", tokensCommitted: 100, odds: 3.1 },
    // ... 6 more winning commitments to option_2
  ]
  
  userLosingCommitments: [
    // 10 commitments to option_1 (lost)
    // 7 commitments to option_3 (lost)  
    // 5 commitments to option_4 (lost)
    // Total: 22 losing commitments
  ]
  
  payoutCalculation: {
    totalWinningTokens: 600,      // Sum of 8 winning commitments
    averageWinningOdds: 3.15,     // Weighted average of winning odds
    totalPayout: 1890,           // 600 * 3.15 = 1890 tokens
    profit: 1290,                // 1890 - 600 = 1290 profit
    lostTokens: 1400             // Sum of 22 losing commitments
  }
}
```

## Migration Strategy

### Phase 1: Backward-Compatible Interface Updates
**Goal**: Update interfaces to support both binary and multi-option commitments without breaking existing functionality.

#### Interface Evolution Strategy
```typescript
// Step 1: Add optional optionId field to existing interface
export interface PredictionCommitment {
  // Existing fields (unchanged)
  id: string
  userId: string
  predictionId: string  // Keep existing field name initially
  position: 'yes' | 'no'  // Keep existing binary system
  tokensCommitted: number
  // ... all existing fields preserved
  
  // NEW: Add optional optionId for new commitments
  optionId?: string  // Maps to MarketOption.id
  
  // NEW: Add marketId as alias for predictionId
  marketId?: string  // Will eventually replace predictionId
}

// Step 2: Service layer handles both formats transparently
class CommitmentService {
  static getOptionId(commitment: PredictionCommitment, market: Market): string {
    // If commitment has optionId, use it directly
    if (commitment.optionId) {
      return commitment.optionId
    }
    
    // For legacy binary commitments, map position to option
    if (commitment.position && market.options.length >= 2) {
      return commitment.position === 'yes' 
        ? market.options[0].id  // First option = "yes"
        : market.options[1].id  // Second option = "no"
    }
    
    // Fallback for edge cases
    return market.options[0]?.id || 'unknown'
  }
}
```

### Phase 2: Data Migration Process
**Goal**: Migrate existing binary commitments to option-based system while maintaining full backward compatibility.

#### Migration Algorithm
```typescript
interface MigrationPlan {
  // Step 1: Analyze existing data
  existingCommitments: {
    totalCount: number
    binaryCommitments: number  // position: 'yes' | 'no'
    optionCommitments: number  // optionId: string
    marketsAffected: string[]
  }
  
  // Step 2: Market option mapping
  marketOptionMapping: {
    [marketId: string]: {
      yesOptionId: string  // First option becomes "yes"
      noOptionId: string   // Second option becomes "no"
      optionCount: number
      needsCreation: boolean  // If market has no options array
    }
  }
  
  // Step 3: Commitment migration
  migrationBatches: {
    batchSize: number  // Process in small batches
    totalBatches: number
    estimatedTime: string
    rollbackPlan: string
  }
}

// Migration execution
async function migrateCommitments(): Promise<MigrationResult> {
  const plan = await analyzeMigrationNeeds()
  
  // Step 1: Ensure all markets have proper options array
  for (const marketId of plan.existingCommitments.marketsAffected) {
    await ensureMarketHasOptions(marketId)
  }
  
  // Step 2: Migrate commitments in batches
  for (let batch = 0; batch < plan.migrationBatches.totalBatches; batch++) {
    await migrateBatch(batch, plan)
    await validateBatchMigration(batch)
  }
  
  // Step 3: Verify all dashboards still work
  await validateDashboardCompatibility()
  
  return { success: true, migratedCount: plan.existingCommitments.binaryCommitments }
}
```

### Phase 3: Service Layer Compatibility
**Goal**: Ensure all existing services continue to work with both old and new commitment formats.

#### AdminCommitmentService Compatibility Layer
```typescript
class AdminCommitmentService {
  // Existing method signature preserved
  static async getMarketCommitments(
    marketId: string,
    options: ExistingOptions
  ): Promise<ExistingReturnType> {
    // Internal: Handle both binary and option-based commitments
    const commitments = await this.fetchCommitments(marketId, options)
    
    // Transform commitments to ensure backward compatibility
    const compatibleCommitments = commitments.map(commitment => ({
      ...commitment,
      // Ensure position field exists for backward compatibility
      position: this.derivePosition(commitment, market),
      // Ensure predictionId exists (alias for marketId)
      predictionId: commitment.marketId || commitment.predictionId,
      // Add optionId if not present (derived from position)
      optionId: commitment.optionId || this.deriveOptionId(commitment, market)
    }))
    
    // Return in expected format - existing dashboards work unchanged
    return {
      market,
      commitments: compatibleCommitments,
      analytics: this.calculateAnalytics(compatibleCommitments),
      totalCount: compatibleCommitments.length
    }
  }
  
  private static derivePosition(
    commitment: PredictionCommitment, 
    market: Market
  ): 'yes' | 'no' {
    if (commitment.position) return commitment.position
    
    // For new option-based commitments, derive position from optionId
    if (commitment.optionId && market.options.length >= 2) {
      return commitment.optionId === market.options[0].id ? 'yes' : 'no'
    }
    
    return 'yes' // Default fallback
  }
}
```

### Phase 4: Dashboard Compatibility Verification
**Goal**: Ensure all existing dashboards continue to display accurate data.

#### Dashboard Compatibility Matrix
```typescript
interface DashboardCompatibility {
  '/admin/dashboard': {
    dependencies: ['totalCommitments', 'activeUsers', 'tokenMetrics']
    compatibilityStatus: 'verified'
    requiredChanges: 'none'
  }
  
  '/admin/tokens': {
    dependencies: ['TokenBalanceService', 'CommitmentAnalytics']
    compatibilityStatus: 'verified'
    requiredChanges: 'none'
  }
  
  '/admin/resolution': {
    dependencies: ['AdminCommitmentService.getMarketCommitments']
    compatibilityStatus: 'verified'
    requiredChanges: 'none'
  }
  
  '/admin/markets': {
    dependencies: ['market statistics', 'participant counts']
    compatibilityStatus: 'verified'
    requiredChanges: 'none'
  }
}

// Automated compatibility testing
async function validateDashboardCompatibility(): Promise<CompatibilityReport> {
  const results = {}
  
  for (const [dashboard, config] of Object.entries(DashboardCompatibility)) {
    results[dashboard] = await testDashboardEndpoints(dashboard, config)
  }
  
  return {
    allCompatible: Object.values(results).every(r => r.success),
    details: results,
    timestamp: new Date().toISOString()
  }
}
```

## Data Models

### Enhanced Commitment Data Structure

#### Core Commitment Model
```typescript
export interface PredictionCommitment {
  // Identity and linking
  id: string                    // Unique commitment ID
  userId: string               // User who made commitment
  marketId: string             // Market this commitment belongs to
  optionId: string             // ✅ CRITICAL: Links to specific MarketOption.id
  
  // Commitment details
  tokensCommitted: number      // Exact tokens committed
  odds: number                 // Odds at time of commitment
  potentialWinning: number     // Calculated potential payout
  
  // Status and timing
  status: 'active' | 'won' | 'lost' | 'refunded'
  committedAt: Timestamp       // When commitment was made
  resolvedAt?: Timestamp       // When commitment was resolved
  
  // User context (for admin views and analytics)
  userEmail?: string
  userDisplayName?: string
  
  // Comprehensive metadata for audit trails
  metadata: {
    // Market context at commitment time
    marketTitle: string
    marketStatus: MarketStatus
    marketEndsAt: Timestamp
    marketCreator: string
    
    // Option context at commitment time
    optionText: string
    optionIndex: number
    
    // Market state snapshot (for dispute resolution)
    marketSnapshot: {
      totalOptions: number
      totalParticipants: number
      totalTokensStaked: number
      allOptionsData: {
        optionId: string
        text: string
        totalTokens: number
        participantCount: number
        odds: number
      }[]
    }
    
    // User context
    userBalanceAtCommitment: number
    userTotalCommitmentsToMarket: number  // How many commitments user has made to this market
    commitmentSource: 'web' | 'mobile' | 'api'
    ipAddress?: string
    userAgent?: string
  }
}
```

#### Payout Distribution Model
```typescript
export interface PayoutDistribution {
  id: string
  marketId: string
  resolutionId: string
  userId: string
  
  // Payout breakdown
  totalPayout: number          // Total payout for this user
  totalProfit: number          // Total profit (payout - committed)
  totalLost: number            // Total tokens lost on losing commitments
  
  // Individual commitment payouts
  winningCommitments: {
    commitmentId: string
    optionId: string
    tokensCommitted: number
    odds: number
    payoutAmount: number
    profit: number
  }[]
  
  losingCommitments: {
    commitmentId: string
    optionId: string
    tokensCommitted: number
    lostAmount: number
  }[]
  
  // Processing details
  processedAt: Timestamp
  status: 'completed' | 'failed' | 'disputed'
  transactionIds: string[]     // Token transaction records created
}
```

#### Market Analytics Model
```typescript
export interface MarketCommitmentAnalytics {
  marketId: string
  marketTitle: string
  
  // Overall market metrics
  totalCommitments: number     // Total individual commitment records
  uniqueParticipants: number   // Unique users who made commitments
  totalTokensStaked: number    // Sum of all commitment amounts
  averageCommitmentSize: number
  
  // Option-by-option breakdown
  optionAnalytics: {
    optionId: string
    optionText: string
    commitmentCount: number    // Number of individual commitments to this option
    uniqueParticipants: number // Unique users who committed to this option
    totalTokens: number        // Total tokens committed to this option
    averageCommitment: number
    largestCommitment: number
    smallestCommitment: number
    currentOdds: number
  }[]
  
  // User participation patterns
  userAnalytics: {
    userId: string
    userEmail: string
    totalCommitments: number   // How many individual commitments this user made
    totalTokensCommitted: number
    optionsTargeted: string[]  // Which options this user committed to
    commitmentPattern: {
      optionId: string
      commitmentCount: number
      totalTokens: number
    }[]
  }[]
  
  // Time-based analytics
  commitmentTimeline: {
    date: string
    commitmentCount: number
    totalTokens: number
    uniqueUsers: number
  }[]
}
```

## Error Handling

### Commitment Integrity Validation

#### Pre-Commitment Validation
```typescript
interface CommitmentValidation {
  // Market validation
  marketExists: boolean
  marketIsActive: boolean
  marketNotExpired: boolean
  
  // Option validation
  optionExists: boolean
  optionIdValid: boolean
  optionAcceptingCommitments: boolean
  
  // User validation
  userHasSufficientBalance: boolean
  userNotExceedingLimits: boolean
  
  // Commitment validation
  tokenAmountValid: boolean
  tokenAmountWithinLimits: boolean
}
```

#### Post-Commitment Verification
```typescript
interface CommitmentVerification {
  // Record creation verification
  commitmentRecordCreated: boolean
  commitmentIdUnique: boolean
  allRequiredFieldsPopulated: boolean
  
  // Market metric updates
  marketTotalParticipantsUpdated: boolean
  marketTotalTokensUpdated: boolean
  optionTotalTokensUpdated: boolean
  optionParticipantCountUpdated: boolean
  
  // User balance updates
  userAvailableTokensReduced: boolean
  userCommittedTokensIncreased: boolean
  transactionRecordCreated: boolean
}
```

### Payout Distribution Integrity

#### Payout Calculation Verification
```typescript
interface PayoutCalculationVerification {
  // Commitment retrieval verification
  allCommitmentsRetrieved: boolean
  winningCommitmentsIdentified: boolean
  losingCommitmentsIdentified: boolean
  
  // Calculation verification
  individualPayoutsCalculated: boolean
  totalPayoutSumsCorrect: boolean
  profitCalculationsAccurate: boolean
  
  // Distribution verification
  userBalancesUpdated: boolean
  transactionRecordsCreated: boolean
  commitmentStatusesUpdated: boolean
  payoutDistributionRecorded: boolean
}
```

## Testing Strategy

### Commitment Tracking Accuracy Tests

#### Multi-Commitment Scenario Testing
```typescript
describe('Multi-Commitment Tracking', () => {
  it('should track 30 commitments across 4 options accurately', async () => {
    const market = await createTestMarket({
      options: [
        { text: "Option A" },
        { text: "Option B" }, 
        { text: "Option C" },
        { text: "Option D" }
      ]
    })
    
    const userId = "test-user-123"
    const commitments = []
    
    // Create 30 commitments across different options
    for (let i = 0; i < 30; i++) {
      const optionIndex = i % 4  // Distribute across 4 options
      const commitment = await CommitmentService.createCommitment({
        userId,
        marketId: market.id,
        optionId: market.options[optionIndex].id,
        tokensCommitted: 50 + (i * 10)
      })
      commitments.push(commitment)
    }
    
    // Verify all commitments are tracked
    const userCommitments = await CommitmentService.getUserCommitments(userId, market.id)
    expect(userCommitments).toHaveLength(30)
    
    // Verify option targeting is accurate
    const optionBreakdown = groupCommitmentsByOption(userCommitments)
    expect(Object.keys(optionBreakdown)).toHaveLength(4)
    
    // Verify each option has correct number of commitments
    Object.values(optionBreakdown).forEach(optionCommitments => {
      expect(optionCommitments).toHaveLength(7 or 8) // 30 / 4 = 7.5
    })
  })
})
```

#### Payout Distribution Accuracy Tests
```typescript
describe('Payout Distribution Accuracy', () => {
  it('should calculate accurate payouts for multi-option market', async () => {
    // Setup market with 4 options and multiple user commitments
    const market = await setupMultiOptionMarket()
    const users = await setupMultipleUsersWithCommitments(market.id)
    
    // Resolve market with specific winning option
    const winningOptionId = market.options[1].id // Option B wins
    const resolution = await ResolutionService.resolveMarket(
      market.id, 
      winningOptionId
    )
    
    // Verify payout calculations
    for (const user of users) {
      const userCommitments = await CommitmentService.getUserCommitments(user.id, market.id)
      const winningCommitments = userCommitments.filter(c => c.optionId === winningOptionId)
      const losingCommitments = userCommitments.filter(c => c.optionId !== winningOptionId)
      
      // Calculate expected payout
      const expectedPayout = winningCommitments.reduce((sum, c) => 
        sum + (c.tokensCommitted * c.odds), 0
      )
      
      // Verify actual payout matches expected
      const actualPayout = await PayoutService.getUserPayout(user.id, market.id)
      expect(actualPayout.totalPayout).toBe(expectedPayout)
      
      // Verify losing commitments are marked as lost
      expect(actualPayout.losingCommitments).toHaveLength(losingCommitments.length)
    }
  })
})
```

### Data Integrity Tests

#### Commitment Audit Trail Tests
```typescript
describe('Commitment Audit Trail', () => {
  it('should maintain complete audit trail for all commitments', async () => {
    const market = await createTestMarket()
    const userId = "audit-test-user"
    
    // Create multiple commitments with different metadata
    const commitments = await Promise.all([
      CommitmentService.createCommitment({
        userId,
        marketId: market.id,
        optionId: market.options[0].id,
        tokensCommitted: 100,
        source: 'web'
      }),
      CommitmentService.createCommitment({
        userId,
        marketId: market.id,
        optionId: market.options[1].id,
        tokensCommitted: 200,
        source: 'mobile'
      })
    ])
    
    // Verify audit trail completeness
    for (const commitment of commitments) {
      expect(commitment.metadata.marketTitle).toBe(market.title)
      expect(commitment.metadata.optionText).toBeDefined()
      expect(commitment.metadata.userBalanceAtCommitment).toBeGreaterThan(0)
      expect(commitment.metadata.marketSnapshot.allOptionsData).toHaveLength(market.options.length)
    }
  })
})
```

## Implementation Phases

### Phase 1: Enhanced Commitment Structure (Critical Priority)
- **Duration**: 3-4 hours
- **Update PredictionCommitment interface** to use `optionId` instead of binary `position`
- **Create commitment validation** for multi-option markets
- **Update commitment creation logic** to link to specific option IDs
- **Risk**: Medium - requires updating existing commitment records

### Phase 2: Multi-Option UI Support (High Priority)
- **Duration**: 4-5 hours
- **Update commitment components** to support multiple options
- **Create option selection interface** for markets with 3+ options
- **Update commitment flow** to handle option-based commitments
- **Risk**: Medium - requires UI/UX changes

### Phase 3: Accurate Metrics Calculation (High Priority)
- **Duration**: 2-3 hours
- **Implement real-time participation metrics** from commitment records
- **Update market display** to show accurate option-level data
- **Create commitment aggregation services**
- **Risk**: Low - mostly calculation logic

### Phase 4: Enhanced Payout Distribution (Critical Priority)
- **Duration**: 4-6 hours
- **Update payout calculation** to handle multi-option markets
- **Implement accurate winner identification** based on option IDs
- **Create comprehensive payout distribution** with audit trails
- **Risk**: High - critical for market resolution accuracy

## Success Criteria

### Commitment Tracking Accuracy
1. **Individual Commitment Records**: Every commitment gets unique record with exact option targeting
2. **Multi-Commitment Support**: Users can make unlimited commitments to any combination of options
3. **Complete Audit Trail**: Every commitment includes comprehensive metadata for verification
4. **Real-Time Metrics**: Market and option metrics reflect actual commitment data

### Payout Distribution Accuracy
1. **Precise Winner Identification**: System identifies all winning commitments based on exact option matching
2. **Accurate Payout Calculations**: Each commitment's payout calculated using its specific odds and token amount
3. **Complete Distribution**: All winning users receive accurate payouts based on their individual commitments
4. **Audit Trail**: Complete record of how each payout was calculated and distributed

### System Integrity
1. **No Lost Commitments**: Every commitment is tracked and accounted for in resolution
2. **No Double Payouts**: Each commitment is processed exactly once
3. **Accurate Balances**: User balances reflect exact gains and losses from all commitments
4. **Verifiable Results**: All calculations can be audited and verified against commitment records