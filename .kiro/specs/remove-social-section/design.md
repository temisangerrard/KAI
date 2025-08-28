# Design Document

## Overview

This design removes the social section from the KAI prediction platform by eliminating the Social tab from navigation, deleting the social page, and properly adjusting the remaining navigation layout. The solution ensures a cleaner, more focused user experience while maintaining proper spacing and responsive design.

## Architecture

### Current Navigation Structure
```
Mobile Bottom Navigation (4 items):
├── Markets (Home icon)
├── Social (MessageSquare icon) ← TO BE REMOVED
├── Wallet (Wallet icon)
└── Profile (User icon)

Desktop Top Navigation (4 items):
├── Markets
├── Social ← TO BE REMOVED
├── Wallet
└── Profile
```

### New Navigation Structure
```
Mobile Bottom Navigation (3 items):
├── Markets (Home icon)
├── Wallet (Wallet icon)
└── Profile (User icon)

Desktop Top Navigation (3 items):
├── Markets
├── Wallet
└── Profile
```

## Components and Interfaces

### 1. Navigation Component Updates

**Location:** `app/components/navigation.tsx`

**Changes Required:**
- Remove social item from `navItems` array
- Update active tab logic to remove social pathname check
- Ensure proper spacing for 3 items instead of 4
- Maintain touch-friendly 44px minimum targets on mobile

**Before:**
```typescript
const navItems = [
  { id: "markets", icon: Home, label: "Markets", href: "/markets" },
  { id: "social", icon: MessageSquare, label: "Social", href: "/social" }, // REMOVE
  { id: "wallet", icon: Wallet, label: "Wallet", href: "/wallet" },
  { id: "profile", icon: User, label: "Profile", href: "/profile" },
]
```

**After:**
```typescript
const navItems = [
  { id: "markets", icon: Home, label: "Markets", href: "/markets" },
  { id: "wallet", icon: Wallet, label: "Wallet", href: "/wallet" },
  { id: "profile", icon: User, label: "Profile", href: "/profile" },
]
```

### 2. TopNavigation Component Updates

**Location:** `app/components/top-navigation.tsx`

**Changes Required:**
- Remove social item from desktop `navItems` array
- Update active state logic to remove social pathname check
- Maintain proper spacing and alignment for 3 items

### 3. Social Page Removal

**Location:** `app/social/page.tsx`

**Action:** Complete deletion of the file and directory

**Content:** The social page contains:
- Mock social feed data (826 lines)
- Social components and interactions
- User following/discovery features
- All mock data with no real functionality

### 4. Route Handling

**Implementation:** Add redirect logic for any remaining social route access

**Location:** Create `app/social/page.tsx` as a redirect-only component

```typescript
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SocialRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace("/markets")
  }, [router])
  
  return null
}
```

## Data Models

### Navigation State Updates

**Before:**
```typescript
type NavigationTab = "markets" | "social" | "wallet" | "profile"
```

**After:**
```typescript
type NavigationTab = "markets" | "wallet" | "profile"
```

### Route Definitions

**Removed Routes:**
- `/social` - Social feed page
- Any social-related sub-routes

**Maintained Routes:**
- `/markets` - Primary landing page
- `/wallet` - Token management
- `/profile` - User profile and stats

## Error Handling

### Route Access
- **Social route access:** Redirect to `/markets` with no error message
- **Bookmarked social URLs:** Graceful redirect to markets page
- **Deep social links:** All redirect to markets as fallback

### Navigation State
- **Invalid active states:** Default to markets if social was previously active
- **Broken navigation:** Ensure 3-item layout works on all screen sizes

## Testing Strategy

### Unit Tests
- Navigation component renders 3 items correctly
- Active state logic works without social references
- TopNavigation component updates properly
- Route redirects function correctly

### Integration Tests
- Mobile navigation spacing and touch targets
- Desktop navigation alignment and spacing
- Social route redirects to markets
- Navigation state persistence without social

### Visual Regression Tests
- Mobile bottom navigation layout with 3 items
- Desktop top navigation spacing
- Active state highlighting on remaining tabs
- Responsive behavior across breakpoints

### Accessibility Tests
- Navigation remains keyboard accessible
- Screen reader announcements work correctly
- Focus management with 3 navigation items
- ARIA labels updated appropriately

## Implementation Notes

### CSS Layout Updates

**Mobile Navigation:**
```css
/* Ensure even distribution of 3 items */
.navigation-container {
  display: flex;
  justify-content: space-around; /* Even spacing for 3 items */
}

/* Maintain touch targets */
.nav-item {
  min-width: 44px;
  min-height: 44px;
  flex: 1;
  max-width: 120px; /* Prevent items from becoming too wide */
}
```

**Desktop Navigation:**
```css
/* Maintain proper spacing for 3 items */
.desktop-nav {
  display: flex;
  gap: 2rem; /* Consistent spacing */
}
```

### Import Cleanup

**Remove unused imports:**
- `MessageSquare` icon from Lucide React (if not used elsewhere)
- Any social-specific components or utilities
- Social-related type definitions

### Performance Considerations
- Remove social page bundle from build
- Clean up any social-related code splitting
- Ensure navigation animations remain smooth
- Optimize for 3-item layout rendering

### Responsive Design Maintenance

**Mobile (< 768px):**
- Bottom navigation with 3 evenly spaced items
- Touch-friendly targets maintained
- Proper active state highlighting

**Desktop (≥ 768px):**
- Top navigation with 3 items
- Proper spacing and alignment
- Hover states and active indicators

**Tablet (768px - 1024px):**
- Ensure navigation works well in both orientations
- Maintain usability across breakpoints

## Migration Strategy

### Phase 1: Navigation Updates
1. Update Navigation component to remove social item
2. Update TopNavigation component to remove social item
3. Test navigation layout and spacing

### Phase 2: Route Cleanup
1. Replace social page with redirect component
2. Test social route redirects to markets
3. Verify no broken internal links

### Phase 3: Code Cleanup
1. Remove unused imports and types
2. Clean up any social references in other components
3. Update any hardcoded navigation arrays

### Phase 4: Testing & Validation
1. Test responsive navigation behavior
2. Verify accessibility compliance
3. Check visual consistency across devices
4. Validate route handling

## Rollback Plan

If issues arise:
1. Revert navigation component changes
2. Restore social page from version control
3. Re-add social navigation items
4. Test full navigation functionality

The changes are isolated to navigation components and the social page, making rollback straightforward if needed.