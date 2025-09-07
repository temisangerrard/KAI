# Design Document

## Overview

This design implements the missing admin market management functionality by creating the edit page and delete functionality that the existing admin interface already references. We'll leverage existing patterns, components, and services to minimize complexity and maintain consistency.

## Architecture

### Existing Infrastructure (Already Built)
- Market list page: `app/admin/markets/page.tsx` ✅
- Edit button links: `<Link href={`/admin/markets/${market.id}/edit`}>` ✅
- More actions button: `<Button variant="ghost" size="icon">` ✅
- Admin authentication: `useAdminAuth` hook ✅
- Market data loading: `AdminCommitmentService.getMarketCommitments()` ✅

### New Components to Build
1. **Market Edit Page**: `app/admin/markets/[id]/edit/page.tsx`
2. **Market Delete Modal**: Component for confirmation dialog
3. **More Actions Dropdown**: Dropdown menu for the existing More button

## Components and Interfaces

### 1. Market Edit Page (`app/admin/markets/[id]/edit/page.tsx`)

**Purpose**: Provide form interface for editing market details

**Key Features**:
- Load existing market data using market ID from URL
- Form with fields: title, description, category, end date
- Save changes to Firebase
- Redirect to market list on success

**Component Structure**:
```typescript
export default function MarketEditPage({ params }: { params: { id: string } }) {
  // Load market data
  // Render edit form
  // Handle form submission
  // Handle errors and success
}
```

### 2. Market Delete Confirmation Modal

**Purpose**: Confirm market deletion with impact details

**Key Features**:
- Show market title and basic info
- Display warning about commitments (if any)
- Confirm/cancel buttons
- Handle deletion process

### 3. More Actions Dropdown Menu

**Purpose**: Extend existing More button with delete functionality

**Key Features**:
- Dropdown menu component
- Delete option with icon
- Trigger delete modal
- Maintain existing button styling

## Data Models

### Market Edit Form Data
```typescript
interface MarketEditForm {
  title: string
  description: string
  category: string
  endsAt: Date
}
```

### Market Delete Context
```typescript
interface MarketDeleteContext {
  marketId: string
  title: string
  hasCommitments: boolean
  participantCount: number
  tokensCommitted: number
}
```

## Error Handling

### Authentication Errors
- Use existing `useAdminAuth` hook pattern
- Redirect to login if not authenticated
- Show error messages for authorization failures

### Firebase Operation Errors
- Wrap Firebase operations in try-catch blocks
- Show user-friendly error messages
- Log detailed errors for debugging
- Graceful fallback for network issues

### Form Validation Errors
- Client-side validation for required fields
- Date validation for end dates
- Show inline error messages
- Prevent submission with invalid data

## Testing Strategy

### Component Testing
- Test market edit form rendering and submission
- Test delete confirmation modal behavior
- Test dropdown menu interactions
- Mock Firebase operations and admin auth

### Integration Testing
- Test complete edit workflow (load → edit → save)
- Test complete delete workflow (click → confirm → delete)
- Test error scenarios and recovery
- Test authentication integration

## Implementation Approach

### Phase 1: Market Edit Page
1. Create edit page component at correct route
2. Load market data using existing patterns
3. Build form using existing UI components
4. Implement save functionality
5. Add error handling and success feedback

### Phase 2: Delete Functionality
1. Create delete confirmation modal component
2. Add dropdown menu to existing More button
3. Implement delete operation
4. Add success/error feedback
5. Update market list after deletion

### Phase 3: Polish and Testing
1. Add loading states and transitions
2. Improve error messages and user feedback
3. Test all scenarios and edge cases
4. Ensure consistent styling with existing admin interface