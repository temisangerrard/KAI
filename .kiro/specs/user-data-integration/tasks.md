# Implementation Plan

- [x] 1. Create basic user data queries
  - Add Firebase queries to fetch user's actual balance, transactions, and commitments
  - Create simple data fetching functions in existing token utilities
  - _Requirements: 1.1, 2.1_

- [x] 2. Replace mock data in wallet page
  - Update WalletPage to fetch real user transactions instead of using mock array
  - Connect real user balance to the existing useTokenBalance hook
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 3. Show real user commitments
  - Replace any mock commitment data with actual user prediction commitments
  - Display real commitment status and amounts from database
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 4. Add basic error handling
  - Show "No data" messages when users have no transactions or commitments
  - Add simple loading states while fetching real data
  - _Requirements: 1.5, 2.5, 4.5_

- [x] 5. Implement efficient data fetching
  - Add basic caching to prevent redundant Firebase queries
  - Use Firebase listeners only where needed to minimize read costs
  - Implement pagination for transaction history to limit data fetching
  - _Requirements: 1.2, 4.1, 4.4_