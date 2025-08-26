# Project Structure & Architecture

## App Router Structure (Next.js 13+ App Directory)

### Core Application (`/app`)
```
app/
├── layout.tsx              # Root layout with providers
├── page.tsx               # Landing page
├── globals.css            # Global styles
├── api/                   # API routes
│   └── markets/           # Market-related endpoints
├── auth/                  # Authentication components
├── components/            # App-specific components
├── dashboard/             # Dashboard pages
├── markets/               # Market-related pages
│   ├── [id]/             # Dynamic market detail pages
│   ├── create/           # Market creation flow
│   ├── discover/         # Market discovery
│   └── trending/         # Trending markets
├── profile/              # User profile pages
├── social/               # Social features
├── trending/             # Trending content
└── wallet/               # Wallet and token management
```

### Shared Components (`/components`)
```
components/
├── ui/                   # shadcn/ui components (Radix-based)
├── accessibility/        # Mobile accessibility components
├── layout/              # Layout components
└── theme-provider.tsx   # Theme management
```

### Business Logic (`/lib`)
```
lib/
├── auth/                # Authentication logic
├── db/                  # Database utilities and mock data
├── services/            # Business services
├── types/               # TypeScript type definitions
├── accessibility/       # Accessibility utilities
├── design-system.ts     # Design system utilities
├── design-tokens.ts     # Design tokens and theme
├── typography.ts        # Typography system
├── responsive.ts        # Responsive utilities
└── utils.ts            # General utilities with cn() helper
```

### Custom Hooks (`/hooks`)
```
hooks/
├── use-mobile.tsx           # Mobile detection
├── use-mobile-accessibility.tsx  # Mobile accessibility
└── use-toast.ts            # Toast notifications
```

## Architecture Patterns

### Component Organization
- **Page Components**: Located in `app/` directory following Next.js App Router
- **Shared UI**: Reusable components in `components/ui/` (shadcn/ui pattern)
- **Feature Components**: App-specific components in `app/components/`
- **Layout Components**: Structural components in `components/layout/`

### State Management
- **Authentication**: React Context (`AuthProvider`, `OnboardingProvider`)
- **Forms**: React Hook Form with Zod validation
- **Local State**: useState and useEffect for component state
- **Global State**: Context providers in root layout

### Styling Conventions
- **Tailwind CSS**: Utility-first approach with custom design tokens
- **Design System**: Custom KAI design tokens in `lib/design-tokens.ts`
- **Component Variants**: Class Variance Authority (CVA) for component styling
- **Responsive**: Mobile-first design with custom breakpoints
- **Accessibility**: ARIA labels, focus management, screen reader support

### File Naming
- **Pages**: `page.tsx` (Next.js App Router convention)
- **Layouts**: `layout.tsx` (Next.js App Router convention)
- **Components**: PascalCase (e.g., `MarketCard.tsx`)
- **Utilities**: kebab-case (e.g., `use-mobile.tsx`)
- **Types**: kebab-case (e.g., `transaction.ts`)

### Import Aliases
```typescript
"@/components" → "./components"
"@/lib" → "./lib"
"@/hooks" → "./hooks"
"@/app" → "./app"
```

### Mobile-First Approach
- Bottom navigation for mobile (`Navigation` component)
- Touch-friendly interactions (44px minimum touch targets)
- Responsive design with mobile accessibility hooks
- Screen reader optimizations for mobile devices

### Design System Integration
- Custom color palette (sage green, cream, gold)
- Typography system with Inter and Playfair Display fonts
- Animation tokens and utilities
- Consistent spacing and shadow scales
- Component tokens for buttons, cards, and inputs