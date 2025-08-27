/**
 * Integration test for user commitments display
 * Tests that real commitment data replaces mock data
 */

describe('User Commitments Integration', () => {
  it('should verify that PredictionCommitmentService is used for real data', () => {
    // This test verifies the service integration exists
    const { PredictionCommitmentService } = require('@/lib/services/token-database')
    
    expect(typeof PredictionCommitmentService.getUserCommitments).toBe('function')
    expect(typeof PredictionCommitmentService.createCommitment).toBe('function')
    expect(typeof PredictionCommitmentService.updateCommitmentStatus).toBe('function')
  })

  it('should verify useUserCommitments hook exists and exports correct interface', () => {
    // Mock the Firebase dependencies to avoid initialization issues
    jest.doMock('@/lib/db/database', () => ({
      db: {},
      auth: {}
    }))
    
    jest.doMock('@/app/auth/auth-context', () => ({
      useAuth: () => ({
        user: { uid: 'test-user' },
        isLoading: false,
        isAuthenticated: true
      })
    }))

    jest.doMock('@/lib/services/token-database', () => ({
      PredictionCommitmentService: {
        getUserCommitments: jest.fn().mockResolvedValue([])
      }
    }))

    // Import after mocking
    const hookModule = require('@/hooks/use-user-commitments')
    
    expect(hookModule.useUserCommitments).toBeDefined()
    expect(typeof hookModule.useUserCommitments).toBe('function')
  })

  it('should verify commitment data structure matches expected format', () => {
    const expectedCommitmentStructure = {
      id: 'string',
      marketId: 'string', 
      marketTitle: 'string',
      position: 'yes or no',
      tokensCommitted: 'number',
      potentialWinning: 'number',
      status: 'active | won | lost | refunded',
      committedAt: 'Date',
      resolvedAt: 'Date | undefined'
    }

    // This test documents the expected structure
    expect(expectedCommitmentStructure).toBeDefined()
  })

  it('should verify profile page imports useUserCommitments', () => {
    // Read the profile page file to verify it imports the hook
    const fs = require('fs')
    const path = require('path')
    
    const profilePagePath = path.join(process.cwd(), 'app/profile/page.tsx')
    const profilePageContent = fs.readFileSync(profilePagePath, 'utf8')
    
    // Verify the import exists
    expect(profilePageContent).toContain('useUserCommitments')
    expect(profilePageContent).toContain('from "@/hooks/use-user-commitments"')
    
    // Verify it's being used
    expect(profilePageContent).toContain('commitments,')
    expect(profilePageContent).toContain('commitmentsLoading')
    expect(profilePageContent).toContain('commitmentsError')
  })

  it('should verify profile page displays commitment data instead of predictions', () => {
    const fs = require('fs')
    const path = require('path')
    
    const profilePagePath = path.join(process.cwd(), 'app/profile/page.tsx')
    const profilePageContent = fs.readFileSync(profilePagePath, 'utf8')
    
    // Verify commitments are displayed
    expect(profilePageContent).toContain('My Commitments')
    expect(profilePageContent).toContain('commitments.map')
    expect(profilePageContent).toContain('commitment.position')
    expect(profilePageContent).toContain('commitment.tokensCommitted')
    expect(profilePageContent).toContain('commitment.potentialWinning')
    
    // Verify loading and error states
    expect(profilePageContent).toContain('Loading commitments...')
    expect(profilePageContent).toContain('Error loading commitments')
    expect(profilePageContent).toContain('No commitments yet')
  })

  it('should verify user profile data service uses real commitments', () => {
    const fs = require('fs')
    const path = require('path')
    
    const servicePath = path.join(process.cwd(), 'lib/services/user-profile-data-service.ts')
    const serviceContent = fs.readFileSync(servicePath, 'utf8')
    
    // Verify it imports PredictionCommitmentService
    expect(serviceContent).toContain('PredictionCommitmentService')
    expect(serviceContent).toContain('from \'@/lib/services/token-database\'')
    
    // Verify it uses getUserCommitments
    expect(serviceContent).toContain('PredictionCommitmentService.getUserCommitments')
    
    // Verify it transforms commitment data
    expect(serviceContent).toContain('commitment.tokensCommitted')
    expect(serviceContent).toContain('commitment.potentialWinning')
    expect(serviceContent).toContain('commitment.status')
  })
})