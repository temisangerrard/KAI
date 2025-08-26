# Design Document

## Overview

This design restructures the KAI prediction platform's navigation and user flow to follow modern web app best practices. The solution consolidates markets functionality, implements a proper hamburger menu system, and ensures users land on actionable content immediately after login.

## Architecture

### Navigation Hierarchy

```
Primary Navigation (Always Visible)
├── Mobile: Bottom Tab Bar (4 items)
│   ├── Markets (Home icon) - Default landing
│   ├── Social (Community icon)
│   ├── Wallet (Wallet icon)
│   └── Profile (User icon)
└── Desktop: Top Navigation Bar
    ├── Logo (left)
    ├── Main Nav Items (Markets, Social, Wallet, Profile)
    └── User Avatar Dropdown (right)

Secondary Navigation (Hamburger Menu)
├── Create Market
├── Settings
├── Help/Support
└── Sign Out
```

### Page Structure Changes

```
Current Structure → New Structure
/dashboard        → /markets (redirect)
/markets/discover → /markets (unified)
/markets/trending → /markets?sort=trending (filter)
/trending         → REMOVED (functionality moved to markets)
/profile          → /profile (enhanced with dashboard content)
```

## Components and Interfaces

### 1. HamburgerMenu Component

**Location:** `app/components/hamburger-menu.tsx`

**Props:**
```typescript
interface HamburgerMenuProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}
```

**Features:**
- Overlay/drawer design
- Smooth slide-in animation
- Click outside to close
- Keyboard navigation (ESC to close)
- Responsive positioning

### 2. Navigation Component (Enhanced)

**Location:** `app/components/navigation.tsx`

**Changes:**
- Update mobile bottom nav to 4 items: Markets, Social, Wallet, Profile
- Add hamburger menu integration
- Update active state logic for new routing

### 3. TopNavigation Component (New)

**Location:** `app/components/top-navigation.tsx`

**Features:**
- Desktop-only component
- Logo, main nav items, user avatar dropdown
- Active state highlighting
- Responsive breakpoints

### 4. UnifiedMarkets Component

**Location:** `app/markets/page.tsx`

**Features:**
- Combines discover + trending functionality
- Advanced filtering (category, status, popularity)
- Sorting options (trending, newest, ending soon, participants)
- Search functionality
- Floating action button for market creation

### 5. EnhancedProfile Component

**Location:** `app/profile/page.tsx`

**Features:**
- Incorporates current dashboard content
- Personal stats overview
- Recent activity feed
- Tabbed interface (Activity, Predictions, Markets Created)
- Token balance display

## Data Models

### Navigation State

```typescript
interface NavigationState {
  currentPage: 'markets' | 'social' | 'wallet' | 'profile'
  hamburgerMenuOpen: boolean
  userDropdownOpen: boolean
}
```

### Markets Filter State

```typescript
interface MarketsFilterState {
  category: string
  status: 'active' | 'resolved' | 'all'
  sortBy: 'trending' | 'newest' | 'ending-soon' | 'participants'
  searchQuery: string
}
```

### User Profile Data (Enhanced)

```typescript
interface UserProfileData extends User {
  dashboardStats: {
    totalPredictions: number
    winRate: number
    tokensEarned: number
    level: number
    recentActivity: Activity[]
  }
}
```

## Error Handling

### Navigation Errors
- **Invalid routes:** Redirect to `/markets` for authenticated users
- **Unauthenticated access:** Redirect to landing page
- **Network errors:** Show offline indicator, cache last known state

### Markets Page Errors
- **API failures:** Show cached markets with refresh option
- **Filter errors:** Reset to default state with user notification
- **Search errors:** Clear search, show all markets

### Profile Page Errors
- **Data loading failures:** Show skeleton with retry option
- **Stats calculation errors:** Show "N/A" with explanation

## Testing Strategy

### Unit Tests
- Navigation component state management
- Filter and sort logic for markets
- Hamburger menu interactions
- Profile data aggregation

### Integration Tests
- Login flow → markets redirect
- Navigation between main sections
- Filter/sort persistence across sessions
- Mobile/desktop responsive behavior

### E2E Tests
- Complete user journey: login → markets → create market → profile
- Hamburger menu functionality across all pages
- Mobile bottom navigation flow
- Desktop top navigation flow

### Accessibility Tests
- Keyboard navigation for hamburger menu
- Screen reader compatibility
- Focus management
- ARIA labels for navigation elements

## Implementation Notes

### Routing Changes
```typescript
// app/page.tsx - Root redirect
if (isAuthenticated) {
  redirect('/markets')
}

// app/dashboard/page.tsx - Legacy redirect
redirect('/markets')

// app/markets/page.tsx - Unified markets
// Combines discover + trending with filtering
```

### State Management
- Use React Context for navigation state
- URL parameters for markets filters/sorting
- Local storage for user preferences

### Performance Considerations
- Lazy load market data on scroll
- Cache filter results
- Optimize hamburger menu animations
- Preload critical navigation routes

### Mobile Optimizations
- Touch-friendly hamburger menu
- Swipe gestures for navigation
- Optimized bottom tab bar spacing
- Fast tap responses

### Desktop Enhancements
- Hover states for navigation items
- Keyboard shortcuts for common actions
- Larger click targets
- Multi-column layouts where appropriate