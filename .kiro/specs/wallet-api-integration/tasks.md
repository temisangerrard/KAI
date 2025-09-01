# Implementation Plan

- [x] 1. Remove external API dependencies and fix immediate errors
  - Remove `fetchRealBalance` function that calls external basescan.org API
  - Remove `fetchRealTransactions` function that calls external basescan.org API
  - Replace with CDP-based data fetching to prevent "Failed to fetch" errors
  - Fix network status component to not trigger external API calls
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Create CDP-based balance service using existing hooks
  - Create `lib/services/cdp-balance-service.ts` using CDP's built-in capabilities
  - Use `useCurrentUser` hook to access user's EVM accounts and smart accounts
  - Implement balance checking using CDP's network support (no external APIs needed)
  - Add proper error handling for CDP API failures with user-friendly messages
  - Write unit tests for CDP balance service functionality
  - _Requirements: 1.1, 1.2, 1.3, 4.1_

- [x] 3. Implement CDP transaction tracking service
  - Create `lib/services/cdp-transaction-service.ts` for transaction management
  - Use `useSendEvmTransaction` and `useSendUserOperation` hooks for transaction tracking
  - Implement transaction status monitoring using CDP's built-in transaction tracking
  - Add transaction history using CDP's transaction data (not external APIs)
  - Write unit tests for transaction service functionality
  - _Requirements: 2.1, 2.2, 2.3, 4.1_

- [ ] 4. Create comprehensive error handling service
  - Create `lib/services/wallet-error-service.ts` with CDP-specific error handling
  - Handle CDP APIError types and convert to user-friendly messages
  - Implement retry strategies for CDP API failures
  - Add error categorization for different CDP error types
  - Write unit tests for error handling scenarios
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Add caching service for wallet data
  - Create `lib/services/wallet-cache-service.ts` for local data caching
  - Implement cache TTL and staleness detection for balance and transaction data
  - Add cache invalidation on network changes and transaction completion
  - Provide offline support with cached data display
  - Write tests for cache behavior and data persistence
  - _Requirements: 1.3, 3.1, 3.2_

- [ ] 6. Create wallet error boundary component
  - Create `app/wallet/components/wallet-error-boundary.tsx` for error recovery
  - Handle CDP-specific errors and component crashes gracefully
  - Provide retry mechanisms and fallback UI for critical errors
  - Add error reporting for debugging wallet issues
  - Write tests for error boundary behavior with CDP errors
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 7. Update wallet page to use CDP services
  - [x] 7.1 Replace external API calls with CDP services
    - Remove external basescan.org API calls from wallet page
    - Integrate CDP balance service for real-time balance data
    - Integrate CDP transaction service for transaction history
    - Use CDP hooks for network detection and status
    - _Requirements: 1.1, 2.1_

  - [x] 7.2 Enhance loading and error states
    - Add proper loading indicators for CDP API calls
    - Implement error displays with retry options for CDP failures
    - Add offline indicators when CDP services are unavailable
    - Show cached data with staleness indicators when appropriate
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8. Implement CDP-aware retry mechanisms
  - Add retry functionality for failed CDP API calls
  - Implement exponential backoff for CDP service failures
  - Add manual refresh buttons that work with CDP services
  - Handle CDP rate limiting and authentication errors appropriately
  - Write integration tests for retry scenarios with CDP
  - _Requirements: 1.4, 2.3, 4.3, 5.4_

- [ ] 9. Fix network status component integration
  - Update network status component to use CDP network detection
  - Remove external RPC calls that cause "Failed to fetch" errors
  - Use CDP's built-in network configuration and status
  - Integrate with CDP error handling service
  - Add proper loading states for network detection
  - _Requirements: 1.2, 1.3, 4.1_

- [x] 10. Add CDP transaction monitoring
  - Implement real-time transaction status updates using CDP hooks
  - Use `useWaitForUserOperation` for smart account transaction tracking
  - Add transaction confirmation notifications using CDP transaction data
  - Handle both EOA and smart account transaction types appropriately
  - Write tests for transaction monitoring functionality
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 11. Integrate error boundary with wallet components
  - Wrap wallet page sections with CDP-aware error boundaries
  - Add error boundaries to balance, transaction, and network status components
  - Test error recovery with simulated CDP API failures
  - Ensure graceful degradation when CDP services are unavailable
  - _Requirements: 4.2, 4.4_

- [ ] 12. Add comprehensive CDP error logging
  - Integrate CDP error service with existing logging infrastructure
  - Add performance monitoring for CDP API calls and hook usage
  - Create error reporting specifically for CDP-related issues
  - Add user feedback collection for CDP service failures
  - Write tests for logging and monitoring functionality
  - _Requirements: 4.1, 4.4_

- [ ] 13. Create integration tests for CDP wallet functionality
  - Write end-to-end tests using CDP hooks and services
  - Test error scenarios with CDP API failures and network issues
  - Test cache behavior with CDP data and network changes
  - Verify wallet works with both EOA and smart account configurations
  - Test retry mechanisms and error recovery with CDP services
  - _Requirements: 3.1, 3.2, 3.3, 4.3_