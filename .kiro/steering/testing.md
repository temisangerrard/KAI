# Testing Guidelines

## Firebase Testing - CRITICAL RULES

### ❌ NEVER DO THESE:
1. **DO NOT** add Firebase mocks to individual test files
2. **DO NOT** import Firebase SDK modules directly in tests
3. **DO NOT** try to configure Firebase in test environments
4. **DO NOT** mock `firebase/app`, `firebase/auth`, `firebase/firestore` in test files

### ✅ ALWAYS DO THESE:
1. **USE** existing Firebase mocks from `jest.setup.js`
2. **MOCK** at the service layer (`@/lib/services/*`)
3. **MOCK** auth context with `useAuth` hook
4. **TEST** component behavior, not Firebase internals

## Correct Testing Patterns

### Component Testing with Firebase Services
```typescript
// ✅ CORRECT: Mock the service, not Firebase
jest.mock('@/lib/services/token-balance-service', () => ({
  TokenBalanceService: {
    getUserBalance: jest.fn().mockResolvedValue({
      userId: 'test-user',
      availableTokens: 100,
      committedTokens: 50,
      totalEarned: 200,
      totalSpent: 50,
      lastUpdated: new Date(),
      version: 1
    })
  }
}))

jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' }
  })
}))
```

### API Route Testing
```typescript
// ✅ CORRECT: Mock database operations at service level
jest.mock('@/lib/services/firestore', () => ({
  getUserById: jest.fn(),
  updateUserBalance: jest.fn(),
  createTransaction: jest.fn()
}))
```

### Integration Testing
```typescript
// ✅ CORRECT: Mock external dependencies, test business logic
jest.mock('@/lib/db/database', () => ({
  db: {},
  auth: {}
}))
```

## Test File Structure

### Component Tests
- Location: `__tests__/components/`
- Focus: Component rendering, user interactions, prop handling
- Mock: Services, auth context, external APIs

### Service Tests  
- Location: `__tests__/services/`
- Focus: Business logic, data transformations, error handling
- Mock: Firebase SDK calls, external APIs

### Integration Tests
- Location: `__tests__/integration/`
- Focus: End-to-end workflows, API interactions
- Mock: External services only

### Hook Tests
- Location: `__tests__/hooks/`
- Focus: Hook behavior, state management, side effects
- Mock: Services, APIs, browser APIs

## Common Test Utilities

### Mock Market Data
```typescript
const mockMarket = {
  id: 'market-123',
  title: 'Test Market',
  description: 'Test description',
  category: 'test' as any,
  status: 'active' as any,
  createdBy: 'user-123',
  createdAt: new Date() as any,
  endsAt: new Date() as any,
  tags: ['test'],
  totalParticipants: 100,
  totalTokensStaked: 1000,
  featured: false,
  trending: false,
  options: [
    {
      id: 'yes',
      text: 'Yes',
      totalTokens: 600,
      participantCount: 60
    },
    {
      id: 'no', 
      text: 'No',
      totalTokens: 400,
      participantCount: 40
    }
  ]
}
```

### Mock User Balance
```typescript
const mockBalance = {
  userId: 'test-user',
  availableTokens: 500,
  committedTokens: 200,
  totalEarned: 1000,
  totalSpent: 300,
  lastUpdated: new Date(),
  version: 1
}
```

## Error Prevention Checklist

Before writing any test:
- [ ] Are you mocking at the service layer, not Firebase SDK?
- [ ] Are you using existing mocks from jest.setup.js?
- [ ] Are you testing component behavior, not Firebase internals?
- [ ] Are you avoiding Firebase imports in test files?

## Test Commands
```bash
npm test                           # Run all tests
npm test -- --watch              # Watch mode
npm test <pattern>                # Run specific tests
npm test -- --coverage           # With coverage report
```

## Debugging Test Failures

### Firebase Configuration Errors
If you see "Firebase: Error (auth/invalid-api-key)" or similar:
1. Check if you're importing Firebase SDK in the test
2. Verify mocks are at service layer, not SDK layer
3. Ensure jest.setup.js mocks are working

### Mock Not Working
1. Check mock is defined before component import
2. Verify mock path matches actual import path
3. Use `jest.clearAllMocks()` in beforeEach

### Component Not Rendering
1. Check all required props are provided
2. Verify auth context is mocked
3. Ensure all services used by component are mocked