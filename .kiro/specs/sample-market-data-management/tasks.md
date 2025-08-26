# Implementation Plan

- [x] 1. Update sample market data with proper status and tags
  - Modify existing sample markets in sample-markets.ts to have 'ended' status
  - Add 'sample' tag to all demo markets for identification
  - Set realistic past end dates for all sample markets
  - _Requirements: 2.1, 2.2, 3.2_

- [x] 2. Fix market service data integration
  - Update getAllMarkets to properly merge Firestore data with sample markets
  - Prioritize real markets over sample markets in display order
  - Fix fallback logic when API/Firestore is unavailable
  - _Requirements: 3.1, 5.1, 5.3_

- [ ] 3. Add simple sample market identification
  - Add isSample utility function to identify demo markets
  - Update Market type to support sample identification
  - Create helper to distinguish between real and sample markets
  - _Requirements: 3.2, 3.3_


- [x] 6. Fix market page data loading
  - Update market page to properly load and display mixed data
  - Fix data pulling issues for both Firestore and sample markets
  - Add proper error handling and loading states
  - _Requirements: 5.1, 5.2, 5.4_

- [ ] 7. Update market detail page for sample markets
  - Add sample market indicator to detail view
  - Prevent interactions on demo markets with clear messaging
  - Show appropriate status and information for ended sample markets
  - _Requirements: 1.2, 1.3, 4.2_

- [ ] 8. Update market filtering to handle sample markets
  - Ensure sample markets appear in 'ended' status filters
  - Maintain proper sorting with real markets prioritized
  - Fix any filtering issues with mixed data types
  - _Requirements: 2.3, 5.2_