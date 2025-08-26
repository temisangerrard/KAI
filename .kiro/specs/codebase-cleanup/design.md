# Design Document

## Overview

This design outlines a systematic approach to cleaning up the KAI Prediction Platform codebase by identifying and removing unused code, consolidating duplicates, and optimizing the project structure. The cleanup will be performed in phases to ensure no breaking changes are introduced.

## Architecture

### Cleanup Strategy
The cleanup process follows a multi-phase approach:

1. **Analysis Phase**: Scan and identify unused files, components, and dependencies
2. **Validation Phase**: Cross-reference usage patterns and import dependencies
3. **Removal Phase**: Safely remove unused code while maintaining functionality
4. **Optimization Phase**: Consolidate duplicates and optimize structure
5. **Verification Phase**: Test and validate the cleaned codebase

### File Categories for Analysis

#### Test and Debug Files
- `app/auth-test/page.tsx` - Firebase authentication testing page
- `app/simple-auth-test/page.tsx` - Simple auth testing page  
- `app/debug/page.tsx` - Debug utilities page
- `accessibility-test.html` - Static accessibility testing file
- `.market-service.ts.swp` - Vim swap file (temporary editor file)

#### Potentially Unused Components
Based on import analysis, these components may have limited usage:
- Authentication test pages (auth-test, simple-auth-test)
- Debug utilities
- Accessibility test files
- Editor temporary files

#### Duplicate Authentication Systems
The codebase appears to have multiple authentication implementations:
- Main auth system: `lib/auth/auth-context.tsx` and `lib/auth/auth-service.ts`
- Simple auth system: `lib/auth/simple-auth-context.tsx` and `lib/auth/simple-auth.ts`
- Firebase auth: `lib/auth/firebase-auth.ts`

## Components and Interfaces

### Code Analysis Service
```typescript
interface CodeAnalysisService {
  scanUnusedFiles(): Promise<string[]>
  findUnusedImports(): Promise<Map<string, string[]>>
  identifyDuplicateCode(): Promise<DuplicateCodeReport>
  validateDependencies(): Promise<UnusedDependency[]>
}
```

### File Classification System
```typescript
interface FileClassification {
  path: string
  category: 'production' | 'test' | 'debug' | 'temporary' | 'duplicate'
  usageCount: number
  importedBy: string[]
  canRemove: boolean
  reason?: string
}
```

### Cleanup Report
```typescript
interface CleanupReport {
  filesRemoved: string[]
  importsOptimized: Map<string, string[]>
  dependenciesRemoved: string[]
  duplicatesConsolidated: ConsolidationReport[]
  sizeReduction: {
    fileCount: number
    totalSize: string
  }
}
```

## Data Models

### File Usage Tracking
The system will track file usage patterns:
- Import relationships between files
- Component usage in JSX/TSX files
- API route references
- Static asset references

### Dependency Graph
A dependency graph will be built to understand:
- Which files depend on others
- Circular dependencies
- Unused dependency chains
- Safe removal candidates

## Error Handling

### Safe Removal Validation
Before removing any file, the system will:
1. Check all import statements across the codebase
2. Verify no dynamic imports or string-based references exist
3. Ensure no build-time dependencies are broken
4. Validate that removed files don't affect routing

### Rollback Strategy
- Create git commits for each cleanup phase
- Maintain backup of removed files during cleanup process
- Implement validation tests after each removal
- Provide rollback instructions if issues are discovered

### Build Validation
After each cleanup phase:
- Run `npm run build` to ensure successful compilation
- Execute TypeScript type checking
- Validate that all imports resolve correctly
- Test core application functionality

## Testing Strategy

### Automated Validation
1. **Import Analysis**: Scan all TypeScript/JavaScript files for import statements
2. **Usage Detection**: Search for component usage in JSX files
3. **Route Validation**: Verify Next.js page routes are not broken
4. **Build Testing**: Ensure successful compilation after each cleanup phase

### Manual Testing Checklist
- [ ] Landing page loads correctly
- [ ] Authentication flow works
- [ ] Market creation and viewing functions
- [ ] Navigation between pages works
- [ ] No console errors in browser
- [ ] TypeScript compilation succeeds

### Files Identified for Removal

#### Immediate Removal Candidates
1. **Editor Temporary Files**
   - `app/markets/create/.market-service.ts.swp` - Vim swap file

2. **Test/Debug Pages** (if not needed in production)
   - `app/auth-test/page.tsx` - Firebase auth testing
   - `app/simple-auth-test/page.tsx` - Simple auth testing  
   - `app/debug/page.tsx` - Debug utilities
   - `accessibility-test.html` - Static test file

#### Conditional Removal Candidates
1. **Duplicate Auth Systems**
   - If simple auth is not used, remove `lib/auth/simple-auth*` files
   - Consolidate to single auth implementation

2. **Unused UI Components**
   - Components in `components/ui/` that are not imported anywhere
   - Accessibility components if not actively used

### Consolidation Opportunities

#### Authentication System
- Standardize on single auth implementation (likely the main auth-context)
- Remove unused auth providers and services
- Consolidate auth-related types and interfaces

#### Component Organization
- Move app-specific components from `components/` to `app/components/`
- Consolidate similar utility functions
- Remove duplicate type definitions

## Implementation Phases

### Phase 1: Safe Removals
- Remove editor temporary files (.swp)
- Remove static test files (accessibility-test.html)
- Remove obvious debug/test pages if not needed

### Phase 2: Import Optimization
- Remove unused import statements
- Consolidate related imports
- Update import paths for consistency

### Phase 3: Dependency Cleanup
- Remove unused npm packages
- Update package.json
- Clean up lock files

### Phase 4: Code Consolidation
- Merge duplicate authentication systems
- Consolidate similar components
- Optimize file organization

### Phase 5: Final Validation
- Comprehensive build testing
- Manual functionality testing
- Performance validation
- Documentation updates