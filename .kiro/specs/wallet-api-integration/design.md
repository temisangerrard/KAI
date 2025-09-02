# Design Document

## Overview

This design replaces external blockchain API calls in the KAI wallet dashboard with CDP's built-in capabilities and viem client integration. The solution eliminates "Failed to fetch" errors by using reliable, authenticated APIs and implementing proper error handling patterns.

## Architecture

### Current Issues
- External API calls to `api.basescan.org` fail in deployed environments
- No error boundaries or graceful degradation
- Hard-coded API endpoints without fallbacks
- Missing timeout and retry logic

### Proposed Solution
- Use viem client with CDP's network configuration for balance queries
- Implement CDP transaction hooks for transaction history
- Add comprehensive error handling with user-friendly messages
- Create fallback mechanisms and caching strategies

## Components and Interfaces

### 1. Wallet Balance Service

```typescript
// lib/services/wallet-balance-service.ts
export interface WalletBalance {
  address: string;
  balances: TokenBalance[];
  lastUpdated: Date;
  isStale: boolean;
}

export interface TokenBalance {
  symbol: string;
  name: string;
  address: string; // 'native' for ETH
  formatted: string;
  raw: bigint;
  decimals: number;
  usdValue?: number;
}

export class WalletBalanceService {
  static async getBalances(address: string, networkId: string): Promise<WalletBalance>
  static async refreshBalances(address: string, networkId: string): Promise<WalletBalance>
  static getCachedBalances(address: string): WalletBalance | null
  static clearCache(address: string): void
}
```

### 2. Transaction History Service

```typescript
// lib/services/wallet-transaction-service.ts
export interface WalletTransaction {
  hash: string;
  type: 'send' | 'receive' | 'contract';
  value: string;
  asset: string;
  timestamp: number;
  from: string;
  to: string;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
}

export interface TransactionHistory {
  address: string;
  transactions: WalletTransaction[];
  lastUpdated: Date;
  hasMore: boolean;
}

export class WalletTransactionService {
  static async getTransactionHistory(address: string, networkId: string): Promise<TransactionHistory>
  static async refreshTransactions(address: string, networkId: string): Promise<TransactionHistory>
  static getCachedTransactions(address: string): TransactionHistory | null
}
```

### 3. Error Handling Service

```typescript
// lib/services/wallet-error-service.ts
export interface WalletError {
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
  retryable: boolean;
}

export class WalletErrorService {
  static handleApiError(error: unknown): WalletError
  static getRetryStrategy(error: WalletError): RetryStrategy
  static logError(error: WalletError, context: string): void
}
```

### 4. Enhanced Wallet Page Component

```typescript
// app/wallet/page.tsx (enhanced)
export default function WalletPage() {
  // State management with error handling
  const [balanceState, setBalanceState] = useState<{
    data: WalletBalance | null;
    loading: boolean;
    error: WalletError | null;
  }>({ data: null, loading: false, error: null });

  const [transactionState, setTransactionState] = useState<{
    data: TransactionHistory | null;
    loading: boolean;
    error: WalletError | null;
  }>({ data: null, loading: false, error: null });

  // Enhanced data fetching with error handling
  const fetchBalances = useCallback(async () => {
    // Implementation with try-catch and error service
  }, [address, networkId]);

  const fetchTransactions = useCallback(async () => {
    // Implementation with try-catch and error service
  }, [address, networkId]);
}
```

## Data Models

### Network Configuration Integration
```typescript
// Integration with existing network service
export interface NetworkConfig {
  viemChain: Chain;
  rpcUrls: string[];
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}
```

### Cache Management
```typescript
// lib/services/wallet-cache-service.ts
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class WalletCacheService {
  static set<T>(key: string, data: T, ttl: number): void
  static get<T>(key: string): T | null
  static isStale(key: string): boolean
  static clear(pattern?: string): void
}
```

## Error Handling

### Error Categories
1. **Network Errors**: Connection timeouts, DNS failures
2. **API Errors**: Rate limiting, authentication failures
3. **Data Errors**: Invalid responses, parsing failures
4. **User Errors**: Invalid addresses, insufficient funds

### Error Recovery Strategies
1. **Exponential Backoff**: For temporary failures
2. **Circuit Breaker**: For persistent API failures
3. **Graceful Degradation**: Show cached data with staleness indicators
4. **User Guidance**: Clear error messages with actionable steps

### Error Boundary Implementation
```typescript
// app/wallet/components/wallet-error-boundary.tsx
export class WalletErrorBoundary extends React.Component {
  // Error boundary for wallet-specific errors
  // Provides recovery options and error reporting
}
```

## Testing Strategy

### Unit Tests
- Service layer functions with mocked dependencies
- Error handling scenarios with various failure modes
- Cache management and staleness detection
- Data transformation and validation

### Integration Tests
- End-to-end wallet loading with real CDP hooks
- Network switching scenarios
- Error recovery and retry mechanisms
- Performance under various network conditions

### Error Simulation Tests
- Network timeout scenarios
- API rate limiting responses
- Invalid data handling
- Cache corruption recovery

## Implementation Approach

### Phase 1: Service Layer
1. Create viem client integration with network service
2. Implement balance service with caching
3. Add comprehensive error handling
4. Create transaction service foundation

### Phase 2: UI Integration
1. Update wallet page to use new services
2. Add loading states and error displays
3. Implement retry mechanisms
4. Add error boundary components

### Phase 3: Enhancement
1. Add offline support with cached data
2. Implement background refresh
3. Add performance monitoring
4. Create user feedback mechanisms

### Viem Client Configuration
```typescript
// lib/clients/viem-client.ts
export function createViemClient(networkId: string): PublicClient {
  const network = NetworkService.getNetworkById(networkId);
  if (!network) throw new Error(`Unsupported network: ${networkId}`);

  return createPublicClient({
    chain: getViemChain(networkId),
    transport: http(network.rpcUrl, {
      timeout: 10000,
      retryCount: 3,
      retryDelay: 1000,
    }),
  });
}
```

### Token Contract Integration
```typescript
// Support for ERC-20 tokens like USDC
export const TOKEN_CONTRACTS = {
  'base-mainnet': {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  'base-sepolia': {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
};
```

This design ensures reliable wallet functionality by eliminating external API dependencies and implementing robust error handling throughout the system.