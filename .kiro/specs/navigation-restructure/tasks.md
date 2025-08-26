# Implementation Plan

- [x] 1. Create hamburger menu component
  - Create reusable HamburgerMenu component with overlay/drawer design
  - Implement smooth slide-in animations and click-outside-to-close functionality
  - Add keyboard navigation support (ESC to close)
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Update root page routing logic
  - Modify app/page.tsx to redirect authenticated users to /markets
  - Ensure unauthenticated users see the landing page
  - _Requirements: 1.1, 1.2_

- [x] 3. Create unified markets page
  - Combine discover and trending functionality into single markets page
  - Implement filtering by category, status, and popularity
  - Add sorting options (trending, newest, ending soon, participants)
  - Add floating action button for market creation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.1_

- [x] 4. Update mobile bottom navigation
  - Modify Navigation component to show 4 items: Markets, Social, Wallet, Profile
  - Update active state logic for new routing structure
  - Ensure Markets tab is highlighted when on /markets
  - _Requirements: 3.1, 3.2_

- [x] 5. Create desktop top navigation
  - Create TopNavigation component with logo, main nav items, and user dropdown
  - Implement user avatar dropdown with Create Market, Settings, Sign Out
  - Add active state highlighting for current page
  - Hide on mobile devices
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 6. Enhance profile page with dashboard content
  - Move current dashboard stats and content to profile page
  - Implement tabbed interface (Activity, Predictions, Markets Created)
  - Display personal stats, token balance, and recent activity
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Integrate hamburger menu across all pages
  - Add hamburger menu to all main pages (markets, social, wallet, profile)
  - Ensure consistent placement and behavior
  - Include Create Market, Settings, and Sign Out options
  - _Requirements: 2.1, 7.2_

- [x] 8. Remove standalone trending pages
  - Delete app/trending/page.tsx
  - Delete app/markets/trending/page.tsx
  - Update any internal links to use markets page with trending sort
  - _Requirements: 8.1, 8.3_

- [x] 9. Update authentication flow
  - Modify login success redirect to go to /markets instead of /dashboard
  - Update any dashboard references in auth components
  - _Requirements: 1.1_

- [x] 10. Add legacy route redirects
  - Create redirect from /dashboard to /markets
  - Handle any bookmarked trending URLs
  - _Requirements: 8.3_

- [x] 11. Test responsive navigation behavior
  - Verify hamburger menu works on all screen sizes
  - Test bottom navigation on mobile devices
  - Test top navigation on desktop
  - Ensure proper hiding/showing of navigation elements
  - _Requirements: 2.3, 3.1, 6.1_

- [x] 12. Update internal navigation links
  - Update all router.push() calls to use new route structure
  - Update any hardcoded links in components
  - Test navigation flow between all pages
  - _Requirements: 1.2, 4.4, 7.3_