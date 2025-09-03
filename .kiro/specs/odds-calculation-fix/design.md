# Design Document

## Overview

This design addresses the fundamental issue in KAI's prediction market odds calculation by switching from participant-count-based calculations to token-amount-based calculations. The solution implements proper prediction market mechanics similar to established platforms like Polymarket, ensuring accurate odds, percentages, and payout calculations.

## Architecture

### Current vs. New Calculation Flow

**Current (Incorrect) Flow:**
```
Market Data → Participant Counts → Percentage Calculation → Display
```

**New (Correct) Flow:**
```
Market Data → Token Amounts → Percentage/Odds Calculation → Potential Winnings → Display
```

### Core Calculation Engine

The design centers around three main calculation functions:

1. **Percentage Calculation**: Based on token distribution
2. **Odds Calculation**: Inverse probability from token ratios  
3. **Potential Winnings**: Pool-based payout simulation

## Components and Interfaces

### 1. Data Model Updates

**MarketOption Interface Changes:**
```typescript
interface MarketOption {
  id: string
  name: string
  totalTokensStaked: number  // Primary metric for all calculations
  color: string
  // Remove: participantCount (derived data, not needed for odds)
}

interface Market {
  // ... existing fields
  options: MarketOption[]
  // Remove: totalParticipants (derived from commitments if needed)
}
```

### 2. Calculation Utilities

**New Market Utils Module (`lib/utils/market-calculations.ts`):**

```typescript
interface CalculationResult {
  percentage: number
  odds: number
  totalTokensInMarket: number
}

interface PotentialWinnings {
  potentialPayout: number
  profit: number
  odds: number
  userShare: number
}

// Core calculation functions
export function calculateMarketMetrics(options: MarketOption[]): CalculationResult[]
export function calculatePotentialWinnings(userStake: number, option: MarketOption, totalTokens: number): PotentialWinnings
export function formatOdds(odds: number): string
export function formatTokenAmount(amount: number): string
```

### 3. Component Updates

**Market Detail View Updates:**
- Replace participant count displays with token amount displays
- Add odds display next to each option
- Update percentage calculations to use token-based logic

**Prediction Commitment Modal Updates:**
- Show real-time potential winnings calculation
- Display both payout and profit
- Show effective odds for the user's bet

**Market Statistics Updates:**
- Replace all participant-based metrics with token-based metrics
- Add total value locked (TVL) display
- Show market liquidity information

## Data Models

### Database Schema Considerations

**Existing Tables to Update:**
```sql
-- Ensure market_options tracks token amounts
market_options:
  - total_tokens_staked: number (primary calculation field)
  
-- Ensure user commitments store token amounts  
user_commitments:
  - tokens_committed: number (aggregated to option totals)
```

**Data Consistency:**
- `option.totalTokensStaked` must equal sum of all `user_commitments.tokens_committed` for that option
- Market totals derived from option totals, not stored separately
- Real-time updates when commitments are made/withdrawn

### Calculation Formulas

**1. Percentage Calculation:**
```typescript
const totalTokensInMarket = options.reduce((sum, opt) => sum + opt.totalTokensStaked, 0)
const percentage = totalTokensInMarket > 0 
  ? (option.totalTokensStaked / totalTokensInMarket) * 100 
  : (100 / options.length) // Equal distribution for empty markets
```

**2. Odds Calculation:**
```typescript
const probability = option.totalTokensStaked / totalTokensInMarket
const odds = probability > 0 ? (1 / probability) : options.length
const formattedOdds = Math.round(odds * 100) / 100 // Round to 2 decimals
```

**3. Potential Winnings:**
```typescript
// Simulate pool after user's bet
const newTotalTokens = totalTokensInMarket + userStake
const newOptionTokens = option.totalTokensStaked + userStake

// User's share of winning pool
const userShare = userStake / newOptionTokens
const potentialPayout = userShare * newTotalTokens
const profit = potentialPayout - userStake
const effectiveOdds = potentialPayout / userStake
```

## Error Handling

### Edge Cases

1. **Empty Markets**: Default to equal percentages and standard odds
2. **Zero Token Options**: Handle division by zero gracefully
3. **Rounding Errors**: Ensure percentages sum to 100%, handle decimal precision
4. **Large Numbers**: Format token amounts with proper comma separation
5. **Negative Values**: Prevent negative stakes and handle edge cases

### Validation Rules

```typescript
// Input validation
function validateStake(stake: number, userBalance: number): ValidationResult {
  if (stake <= 0) return { valid: false, error: "Stake must be positive" }
  if (stake > userBalance) return { valid: false, error: "Insufficient balance" }
  return { valid: true }
}

// Calculation validation  
function validateCalculation(result: CalculationResult): boolean {
  const totalPercentage = result.reduce((sum, r) => sum + r.percentage, 0)
  return Math.abs(totalPercentage - 100) < 0.01 // Allow for rounding
}
```

## Testing Strategy

### Unit Tests

1. **Calculation Functions**:
   - Test percentage calculations with various token distributions
   - Test odds calculations with edge cases (zero tokens, equal distribution)
   - Test potential winnings with different stake amounts

2. **Component Tests**:
   - Test market display with mocked calculation results
   - Test commitment modal with various scenarios
   - Test error states and loading states

### Integration Tests

1. **End-to-End Market Flow**:
   - Create market → Make commitments → Verify calculations → Check displays
   - Test real-time updates when multiple users commit
   - Test market resolution and payout calculations

### Test Scenarios

**Scenario 1: Binary Market (50/50)**
- Initial state: 0 tokens each → 50%/50%, 2.0x odds each
- After 300/700 split → 30%/70%, 3.33x/1.43x odds
- User bets 100 on minority → verify ~2.75x effective odds

**Scenario 2: Multi-Option Market**
- 3 options with 200/300/500 tokens → 20%/30%/50% → 5x/3.33x/2x odds
- Test that percentages sum to 100%
- Test potential winnings for each option

**Scenario 3: Edge Cases**
- Empty market handling
- Single large bet scenario
- Very small bet amounts
- Maximum token amounts

## Implementation Priority

### Phase 1: Core Calculations
1. Create market calculation utilities
2. Update data models and interfaces
3. Add comprehensive unit tests

### Phase 2: UI Updates  
1. Update market detail view displays
2. Update commitment modal calculations
3. Update market statistics components

### Phase 3: Integration & Testing
1. End-to-end testing with real scenarios
2. Performance testing with large token amounts
3. User acceptance testing with realistic market data

### Phase 4: Data Migration
1. Update existing market data if needed
2. Verify calculation consistency
3. Monitor for any calculation discrepancies