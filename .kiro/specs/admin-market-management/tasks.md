# Implementation Plan

- [x] 1. Create market edit page structure
  - Create the edit page component at `app/admin/markets/[id]/edit/page.tsx`
  - Set up basic page layout using existing admin page patterns
  - Add loading and error states consistent with existing admin pages
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement market data loading for edit page
  - Load existing market data using the market ID from URL params
  - Use existing Firebase patterns from the market list page
  - Handle loading states and error cases for missing markets
  - _Requirements: 1.2_

- [x] 3. Build market edit form
  - Create form with fields for title, description, category, and end date
  - Use existing UI components (Input, Select, Button) from the admin interface
  - Add form validation using existing patterns
  - Pre-populate form with current market data
  - _Requirements: 1.2, 1.3_

- [x] 4. Implement market update functionality
  - Add form submission handler that updates market in Firebase
  - Use existing admin authentication patterns for the update operation
  - Handle success and error cases with appropriate user feedback
  - Redirect to market list on successful update
  - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.3_

- [x] 5. Create delete confirmation modal component
  - Build reusable modal component for delete confirmation
  - Show market details and impact information (participants, tokens)
  - Use existing modal/dialog patterns from the admin interface
  - Add confirm/cancel buttons with appropriate styling
  - _Requirements: 2.2_

- [x] 6. Add dropdown menu to existing More actions button
  - Replace the existing More button with a dropdown menu component
  - Add delete option to the dropdown menu
  - Use existing button and menu styling patterns
  - Trigger delete modal when delete option is clicked
  - _Requirements: 2.1_

- [x] 7. Implement market deletion functionality
  - Add delete operation that removes market from Firebase
  - Use existing admin authentication patterns for the delete operation
  - Handle success and error cases with appropriate user feedback
  - Update the market list after successful deletion
  - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3_

- [x] 8. Add error handling and user feedback
  - Implement consistent error handling across edit and delete operations
  - Add success messages using existing toast/notification patterns
  - Handle authentication errors with appropriate redirects
  - Add loading states during operations
  - _Requirements: 3.2, 3.3, 3.4_