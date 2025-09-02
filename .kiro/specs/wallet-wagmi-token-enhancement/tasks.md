# Implementation Plan

- [x] 1. Verify CDP API Authentication and Configuration
  - Confirm existing CDP API configuration with project credentials and supported networks
  - Validate existing JWT token generation using CDP API Key Secret for Bearer authentication
  - Verify environment variables for CDP API credentials (API_KEY_NAME, API_KEY_SECRET) are properly set
  - Test existing authentication with a simple API call to confirm credentials are working
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 2. Implement CDP Token Balance API Client
  - Create CDPApiClient class with methods for token balance API calls
  - Implement getTokenBalances method that calls `/v2/evm/token-balances/{network}/{address}`
  - Add support for pagination handling using nextPageToken parameter
  - Implement proper error handling for API responses (400, 404, 500, 502, 503)
  - Add request timeout and retry logic for network failures
  - _Requirements: 2.1, 2.3, 2.4, 5.4, 5.5_

- [x] 3. Create Token Balance Service Layer
  - Build TokenBalanceService class that orchestrates API calls across networks
  - Implement fetchAllTokenBalances method that calls API for base, base-sepolia, and ethereum
  - Create parallel API call logic to fetch from all networks simultaneously
  - Add token data transformation from CDP API format to internal AggregatedTokenBalance format
  - Implement network labeling and token aggregation across all networks
  - _Requirements: 1.1, 1.3, 3.1, 3.2, 3.5_

- [ ] 4. Implement Token Caching System
  - Create TokenCacheService for caching API responses per network and address
  - Implement 60-second cache expiration with timestamp-based validation
  - Add cache invalidation methods for manual refresh functionality
  - Create cache cleanup logic to prevent memory leaks
  - Implement cache deduplication to avoid redundant API calls
  - _Requirements: 6.1, 6.2, 6.5, 6.6_

- [ ] 5. Build Enhanced Token Balance Hook
  - Create useEnhancedTokenBalance hook that integrates TokenBalanceService
  - Implement loading states for cross-network token fetching
  - Add error handling that falls back to existing functionality when API fails
  - Create manual refresh functionality that bypasses cache
  - Integrate with existing ETH balance to provide unified token list
  - _Requirements: 4.4, 4.5, 5.1, 5.2, 5.6_

- [ ] 6. Create Network Indicator UI Components
  - Add simple network badges showing network name for each token
  - Use basic network colors and text labels (base, ethereum, base-sepolia)
  - Ensure indicators display properly on mobile screens
  - _Requirements: 3.3, 4.1_

- [ ] 7. Update Token Display Components
  - Show API tokens in existing balance list
  - Add simple network labels to each token
  - Keep existing ETH display working during loading
  - Combine ETH and API tokens in one list
  - Show token symbol and name
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [ ] 8. Integrate with Send Token Functionality
  - Update send token form to include all API-discovered tokens in asset dropdown
  - Ensure correct contract addresses and decimals are used from API data
  - Maintain existing ETH and dynamically loaded token sending functionality as fallback
  - Test token sending with API-discovered tokens to verify proper integration
  - _Requirements: 4.3_

- [ ] 9. Implement Comprehensive Error Handling
  - Add graceful fallback to existing manual token balance when API fails
  - Implement exponential backoff for rate limit handling
  - Create user-friendly error messages that don't break existing functionality
  - Add timeout handling with manual retry options
  - Implement API response validation to handle malformed data
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 10. Add Cross-Network Token Aggregation
  - Implement logic to handle same tokens across base and base-sepolia networks
  - Create network-specific grouping in token display for base and base-sepolia
  - Add portfolio view that shows tokens from base and base-sepolia networks
  - Ensure proper network failure handling that doesn't affect the other network
  - Test with mock wallet addresses and sample token data for both base and base-sepolia networks

- [ ] 11. Optimize Performance and Caching
  - Implement parallel API calls to all networks for faster loading
  - Add request deduplication to prevent multiple calls for same data
  - Optimize pagination handling to efficiently fetch all token pages
  - Add component cleanup to cancel pending requests on unmount
  - Test performance with large token lists and multiple networks
  - _Requirements: 6.3, 6.4, 6.5, 6.6_

- [ ] 12. Integration Testing and Validation
  - Test complete token discovery flow from API call to UI display
  - Validate that existing CDP functionality remains unchanged
  - Test error scenarios and fallback behavior
  - Verify token sending works with API-discovered tokens
  - Test cache behavior and manual refresh functionality
  - Validate cross-network token display and aggregation
  - _Requirements: All requirements validation_

- [ ] 13. Performance Testing and Optimization
  - Test API response times and optimize for acceptable performance
  - Validate cache hit rates and memory usage
  - Test with wallets containing many tokens across multiple networks
  - Optimize UI rendering for large token lists
  - Test concurrent user scenarios and API rate limiting
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 14. Documentation and Deployment Preparation
  - Update environment variable documentation for CDP API credentials
  - Create user guide for enhanced token discovery features
  - Document API integration and caching behavior
  - Add troubleshooting guide for API failures and fallback behavior
  - Update README with new token balance capabilities
  - _Requirements: All requirements completion_