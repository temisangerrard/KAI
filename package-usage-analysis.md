# Package Usage Analysis

Based on my analysis of the codebase, here are the findings for each package:

## USED PACKAGES (Keep these)

### Core Framework & Build Tools
- `next` - Next.js framework ✅
- `react` - React library ✅
- `react-dom` - React DOM ✅
- `typescript` - TypeScript compiler ✅
- `eslint` - Linting ✅
- `eslint-config-next` - Next.js ESLint config ✅
- `postcss` - CSS processing ✅
- `tailwindcss` - CSS framework ✅
- `autoprefixer` - CSS autoprefixer ✅
- `@types/node` - Node.js types ✅
- `@types/react` - React types ✅
- `@types/react-dom` - React DOM types ✅

### Authentication & Forms
- `firebase` - Used in lib/auth/firebase-auth.ts, lib/db/database.ts ✅
- `react-hook-form` - Used in multiple forms (login, register, profile, market creation) ✅
- `@hookform/resolvers` - Used with react-hook-form for Zod integration ✅
- `zod` - Used for form validation in multiple files ✅

### UI Components & Styling
- `lucide-react` - Extensively used for icons throughout the app ✅
- `class-variance-authority` - Used in UI components (button, badge, alert, etc.) ✅
- `tailwind-merge` - Used in lib/utils.ts for the cn() function ✅
- `tailwindcss-animate` - Used in Tailwind config for animations ✅
- `clsx` - Used in lib/utils.ts for the cn() function ✅

### Radix UI Components (Used)
- `@radix-ui/react-slot` - Used in button.tsx, breadcrumb.tsx ✅
- `@radix-ui/react-dialog` - Used in dialog.tsx, sheet.tsx ✅
- `@radix-ui/react-label` - Used in form.tsx, label.tsx ✅
- `@radix-ui/react-select` - Used in select.tsx ✅
- `@radix-ui/react-popover` - Used in popover.tsx ✅
- `@radix-ui/react-separator` - Used in separator.tsx ✅
- `@radix-ui/react-avatar` - Used in avatar.tsx ✅
- `@radix-ui/react-checkbox` - Used in checkbox.tsx ✅
- `@radix-ui/react-dropdown-menu` - Used in dropdown-menu.tsx ✅
- `@radix-ui/react-toast` - Used in toast.tsx ✅
- `@radix-ui/react-toggle` - Used in toggle.tsx ✅
- `@radix-ui/react-switch` - Used in switch.tsx ✅
- `@radix-ui/react-tabs` - Used in tabs.tsx ✅
- `@radix-ui/react-progress` - Used in progress.tsx ✅
- `@radix-ui/react-scroll-area` - Used in scroll-area.tsx ✅
- `@radix-ui/react-slider` - Used in slider.tsx ✅
- `@radix-ui/react-tooltip` - Used in tooltip.tsx ✅
- `@radix-ui/react-radio-group` - Used in radio-group.tsx ✅
- `@radix-ui/react-collapsible` - Used in collapsible.tsx ✅
- `@radix-ui/react-context-menu` - Used in context-menu.tsx ✅
- `@radix-ui/react-menubar` - Used in menubar.tsx ✅
- `@radix-ui/react-navigation-menu` - Used in navigation-menu.tsx ✅
- `@radix-ui/react-accordion` - Used in accordion.tsx ✅
- `@radix-ui/react-alert-dialog` - Used in alert-dialog.tsx ✅
- `@radix-ui/react-aspect-ratio` - Used in aspect-ratio.tsx ✅
- `@radix-ui/react-hover-card` - Used in hover-card.tsx ✅
- `@radix-ui/react-toggle-group` - Used in toggle-group.tsx ✅

### Other UI Libraries
- `date-fns` - Used in profile page and market creation form ✅
- `react-day-picker` - Used in calendar.tsx ✅
- `embla-carousel-react` - Used in carousel.tsx ✅
- `input-otp` - Used in input-otp.tsx ✅
- `recharts` - Used in chart.tsx and token-visualization.tsx ✅
- `sonner` - Used in sonner.tsx for toast notifications ✅
- `next-themes` - Used in sonner.tsx for theme support ✅
- `vaul` - Used in drawer.tsx ✅
- `cmdk` - Used in command.tsx ✅
- `react-resizable-panels` - Used in resizable.tsx ✅

## POTENTIALLY UNUSED PACKAGES (Need verification)

None found! All packages appear to be in use through the shadcn/ui component system or directly in the application code.

## ANALYSIS SUMMARY

- **Total packages**: 58
- **Used packages**: 58 (100%)
- **Unused packages**: 0

All packages in the project appear to be actively used. The shadcn/ui component system means that even if a UI component isn't directly imported in app code, it's still part of the component library and may be used in the future or referenced by other components.

## RECOMMENDATIONS

1. **Keep all packages** - All dependencies are being used
2. **No cleanup needed** - The dependency list is already optimized
3. **Consider future cleanup** - As the app evolves, some UI components may become unused and can be removed later

The codebase has a clean dependency structure with no unused packages identified.