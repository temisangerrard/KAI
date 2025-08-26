# Design Document

## Overview

The Sample Market Data Management system will implement a comprehensive solution for handling demonstration markets within the KAI prediction platform. The design focuses on clear separation between sample and real data, consistent visual indicators, and seamless integration with existing market services while maintaining the current user experience for real markets.

## Architecture

### Data Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Market Service Layer                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Real Markets  │  │ Sample Markets  │  │  Market Merger  │ │
│  │    (Firestore)  │  │   (Static)      │  │    Service      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Unified Market Data                       │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Real Markets    │  │ Sample Markets  │                   │
│  │ status: active  │  │ status: ended   │                   │
│  │ tags: []        │  │ tags: [sample]  │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Components                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Market Card    │  │ Market Detail   │  │  Market Grid    │ │
│  │  + Sample Badge │  │ + Sample Banner │  │ + Sample Filter │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Sample Market   │  │ Interaction     │                   │
│  │ Indicator       │  │ Blocker         │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Sample Market Service

**Purpose**: Centralized management of sample market data with proper tagging and status management.

**Interface**:
```typescript
interface SampleMarketService {
  getSampleMarkets(): Market[]
  isSampleMarket(marketId: string): boolean
  getSampleMarketById(marketId: string): Market | null
  mergeSampleWithRealMarkets(realMarkets: Market[]): Market[]
}
```

**Key Features**:
- All sample markets automatically tagged with 'sample'
- All sample markets have 'ended' status
- Realistic historical data with past end dates
- Diverse category coverage

### 2. Market Service Enhancement

**Purpose**: Enhanced market service that seamlessly integrates sample and real market data.

**Interface**:
```typescript
interface EnhancedMarketService extends MarketService {
  getAllMarketsWithSamples(): Promise<Market[]>
  getMarketById(id: string, includeSamples?: boolean): Promise<Market | null>
  isMarketInteractable(market: Market): boolean
}
```

**Key Features**:
- Automatic merging of real and sample data
- Priority ordering (real markets first)
- Graceful fallback to sample data
- Sample market identification

### 3. Sample Market Indicator Component

**Purpose**: Visual component to clearly mark sample markets across all UI contexts.

**Interface**:
```typescript
interface SampleMarketIndicatorProps {
  market: Market
  variant?: 'badge' | 'banner' | 'inline'
  size?: 'sm' | 'md' | 'lg'
}
```

**Visual Design**:
- Distinctive "Sample" badge with muted colors
- Clear typography indicating demonstration purpose
- Consistent styling across all market views
- Accessible color contrast and screen reader support

### 4. Interaction Blocker Service

**Purpose**: Prevents actual transactions on sample markets while providing educational feedback.

**Interface**:
```typescript
interface InteractionBlockerService {
  canInteractWithMarket(market: Market): boolean
  getBlockedInteractionMessage(market: Market, action: string): string
  handleBlockedInteraction(market: Market, action: string): void
}
```

**Key Features**:
- Blocks token transactions on sample markets
- Provides educational messaging
- Maintains UI responsiveness
- Logs interaction attempts for analytics

## Data Models

### Enhanced Market Type

```typescript
interface Market {
  id: string
  title: string
  description: string
  category: string
  options: MarketOption[]
  startDate: Date
  endDate: Date
  status: 'active' | 'ended' | 'cancelled'
  totalTokens: number
  participants: number
  tags: string[] // Will include 'sample' for demo markets
  imageUrl?: string
  isSample?: boolean // Computed property for easy identification
}
```

### Sample Market Configuration

```typescript
interface SampleMarketConfig {
  id: string
  title: string
  description: string
  category: string
  options: SampleMarketOption[]
  daysAgoEnded: number // How many days ago this market "ended"
  totalTokens: number
  participants: number
  additionalTags?: string[]
}

interface SampleMarketOption {
  name: string
  percentage: number
  tokens: number
  color: string
}
```

## Error Handling

### Sample Data Loading Errors

- **Fallback Strategy**: If sample data fails to load, show empty state with creation prompt
- **Error Logging**: Log sample data loading failures for monitoring
- **User Feedback**: Show subtle notification if sample data is unavailable

### Real Market Integration Errors

- **Graceful Degradation**: Show sample markets if real market API fails
- **Status Indicators**: Clear messaging when showing fallback data
- **Retry Mechanisms**: Automatic retry for real market data loading

### Interaction Blocking Errors

- **Clear Messaging**: Explain why interaction is blocked on sample markets
- **Alternative Actions**: Suggest creating real markets or viewing tutorials
- **Error Prevention**: Disable interaction buttons rather than showing errors

## Testing Strategy

### Unit Testing

1. **Sample Market Service Tests**
   - Verify all sample markets have 'sample' tag
   - Confirm all sample markets have 'ended' status
   - Test sample market data integrity
   - Validate sample market ID uniqueness

2. **Market Service Integration Tests**
   - Test merging of real and sample markets
   - Verify priority ordering (real markets first)
   - Test fallback to sample data scenarios
   - Validate market identification logic

3. **Component Tests**
   - Sample indicator component rendering
   - Interaction blocker functionality
   - Badge and banner display logic
   - Accessibility compliance testing

### Integration Testing

1. **Market Page Integration**
   - Test market page with mixed real/sample data
   - Verify filtering and sorting with sample markets
   - Test search functionality across both data types
   - Validate responsive behavior

2. **Market Detail Integration**
   - Test sample market detail page display
   - Verify interaction blocking on sample markets
   - Test navigation between real and sample markets
   - Validate sample market messaging

3. **API Integration**
   - Test graceful fallback when API is unavailable
   - Verify sample data loading performance
   - Test error handling for mixed data scenarios
   - Validate caching behavior

### User Experience Testing

1. **Visual Distinction Testing**
   - Verify sample markets are clearly identifiable
   - Test badge and indicator visibility
   - Validate color contrast and accessibility
   - Test across different screen sizes

2. **Interaction Flow Testing**
   - Test blocked interactions provide clear feedback
   - Verify educational messaging is helpful
   - Test transition from sample to real market creation
   - Validate user understanding of sample vs real markets

3. **Performance Testing**
   - Test loading performance with large sample datasets
   - Verify smooth scrolling and filtering
   - Test memory usage with mixed data
   - Validate caching effectiveness

## Implementation Phases

### Phase 1: Core Sample Data Infrastructure
- Create SampleMarketService
- Enhance Market type with sample identification
- Implement basic sample market data
- Add sample market tagging system

### Phase 2: UI Integration
- Create SampleMarketIndicator component
- Update MarketCard to show sample badges
- Enhance MarketGrid with sample filtering
- Update market detail pages with sample banners

### Phase 3: Interaction Management
- Implement InteractionBlockerService
- Add interaction blocking to market detail pages
- Create educational messaging system
- Add sample market interaction feedback

### Phase 4: Market Service Integration
- Enhance getAllMarkets to include samples
- Implement priority ordering logic
- Add fallback mechanisms
- Update market filtering and sorting

### Phase 5: Testing and Polish
- Comprehensive testing across all components
- Performance optimization
- Accessibility improvements
- User experience refinements