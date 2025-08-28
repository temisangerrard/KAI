# Technology Stack

## Framework & Runtime
- **Next.js 15.2.4** - React framework with App Router
- **React 19** - UI library with latest features
- **TypeScript 5** - Type-safe development
- **Node.js** - Runtime environment

## Styling & UI
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **shadcn/ui** - Component library built on Radix UI
- **Custom Design System** - KAI-specific tokens and components

## State Management & Forms
- **React Hook Form 7.54.1** - Form handling
- **Zod 3.24.1** - Schema validation
- **React Context** - Authentication and onboarding state

## Backend & Database
- **Firebase** - Authentication, database, and hosting
- **API Routes** - Next.js server-side endpoints

## Development Tools
- **ESLint** - Code linting (build errors ignored in config)
- **PostCSS** - CSS processing
- **TypeScript** - Type checking (build errors ignored in config)

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Package Management
- Uses npm (package-lock.json present)
- Also has pnpm-lock.yaml for alternative package manager support

## Environment Setup
Create `.env.local` with Firebase configuration:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

## Testing

### Firebase Testing Requirements
**CRITICAL**: All Firebase services are already mocked in `jest.setup.js`. When writing tests:

1. **DO NOT** add Firebase mocks to individual test files
2. **DO NOT** try to configure Firebase in tests
3. **USE** the existing mocks from jest.setup.js
4. **MOCK** Firebase services at the service layer, not the Firebase SDK level

### Test Structure
- Unit tests: `__tests__/components/`, `__tests__/hooks/`, `__tests__/services/`
- Integration tests: `__tests__/integration/`
- Manual tests: `__tests__/manual/`

### Common Test Commands
```bash
npm test                    # Run all tests
npm test -- --watch        # Run tests in watch mode
npm test <file-pattern>     # Run specific test files
```

### Firebase Service Mocking Pattern
```typescript
// ✅ CORRECT: Mock at service layer
jest.mock('@/lib/services/token-balance-service', () => ({
  TokenBalanceService: {
    getUserBalance: jest.fn()
  }
}))

// ❌ WRONG: Don't mock Firebase SDK directly in tests
jest.mock('firebase/firestore', () => ({ ... }))
```

## Build Configuration
- Images are unoptimized for static export compatibility
- ESLint and TypeScript errors are ignored during builds for rapid development
- CSS variables enabled for theming support