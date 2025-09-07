import { ResolutionService, ResolutionErrorType } from '@/lib/services/resolution-service'
import { AdminAuthService } from '@/lib/auth/admin-auth'

// Mock AdminAuthService
jest.mock('@/lib/auth/admin-auth', () => ({
  AdminAuthService: {
    checkUserIsAdmin: jest.fn()
  }
}))

// Mock Firebase services
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

// Mock other dependencies
jest.mock('@/lib/services/token-balance-service', () => ({
  TokenBalanceService: {
    updateBalanceAtomic: jest.fn(),
    rollbackTransaction: jest.fn()
  }
}))

const mockAdminAuthService = AdminAuthService as jest.Mocked<typeof AdminAuthService>

describe('ResolutionService Admin Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('End-to-end admin verification', () => {
    it('should block non-admin users from all critical operations', async () => {
      // Mock non-admin user
      mockAdminAuthService.checkUserIsAdmin.mockResolvedValue(false)
      const nonAdminUserId = 'non-admin-user-123'

      // Test resolveMarket
      await expect(
        ResolutionService.resolveMarket(
          'market-123',
          'yes',
          [{ type: 'description', content: 'Test evidence for resolution' }],
          nonAdminUserId
        )
      ).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'Admin privileges required for this operation'
      })

      // Test rollbackResolution
      await expect(
        ResolutionService.rollbackResolution(
          'market-123',
          'resolution-123',
          nonAdminUserId
        )
      ).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'Admin privileges required for this operation'
      })

      // Test cancelMarket
      await expect(
        ResolutionService.cancelMarket(
          'market-123',
          'Market cancelled due to invalid conditions',
          nonAdminUserId
        )
      ).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'Admin privileges required for this operation'
      })

      // Verify admin check was called for each operation
      expect(mockAdminAuthService.checkUserIsAdmin).toHaveBeenCalledTimes(3)
      expect(mockAdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith(nonAdminUserId)
    })

    it('should allow admin users to proceed with operations', async () => {
      // Mock admin user
      mockAdminAuthService.checkUserIsAdmin.mockResolvedValue(true)
      const adminUserId = 'admin-user-123'

      // Mock Firebase operations to prevent actual database calls
      const mockLogResolutionAction = jest.spyOn(ResolutionService as any, 'logResolutionAction')
        .mockResolvedValue(undefined)

      // Test that admin verification passes (operations will fail later due to mocking, but not due to auth)
      try {
        await ResolutionService.resolveMarket(
          'market-123',
          'yes',
          [{ type: 'description', content: 'Test evidence for resolution' }],
          adminUserId
        )
      } catch (error) {
        // Should not be an authorization error
        expect(error).not.toMatchObject({
          type: ResolutionErrorType.UNAUTHORIZED
        })
      }

      try {
        await ResolutionService.rollbackResolution(
          'market-123',
          'resolution-123',
          adminUserId
        )
      } catch (error) {
        // Should not be an authorization error
        expect(error).not.toMatchObject({
          type: ResolutionErrorType.UNAUTHORIZED
        })
      }

      try {
        await ResolutionService.cancelMarket(
          'market-123',
          'Market cancelled due to invalid conditions',
          adminUserId
        )
      } catch (error) {
        // Should not be an authorization error
        expect(error).not.toMatchObject({
          type: ResolutionErrorType.UNAUTHORIZED
        })
      }

      // Verify admin check was called for each operation
      expect(mockAdminAuthService.checkUserIsAdmin).toHaveBeenCalledTimes(3)
      expect(mockAdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith(adminUserId)
    })

    it('should handle AdminAuthService errors gracefully', async () => {
      // Mock AdminAuthService to throw an error
      mockAdminAuthService.checkUserIsAdmin.mockRejectedValue(new Error('Database connection failed'))
      const userId = 'user-123'

      // Test that service errors are handled gracefully (wrapped in ResolutionServiceError)
      await expect(
        ResolutionService.resolveMarket(
          'market-123',
          'yes',
          [{ type: 'description', content: 'Test evidence for resolution' }],
          userId
        )
      ).rejects.toMatchObject({
        type: ResolutionErrorType.DATABASE_TRANSACTION_FAILED,
        message: 'Failed to resolve market'
      })

      expect(mockAdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith(userId)
    })

    it('should validate user ID before checking admin status', async () => {
      const invalidUserIds = ['', null, undefined]

      for (const invalidUserId of invalidUserIds) {
        await expect(
          ResolutionService.resolveMarket(
            'market-123',
            'yes',
            [{ type: 'description', content: 'Test evidence for resolution' }],
            invalidUserId as any
          )
        ).rejects.toMatchObject({
          type: ResolutionErrorType.UNAUTHORIZED,
          message: 'User identification required for admin operations'
        })
      }

      // AdminAuthService should not be called for invalid user IDs
      expect(mockAdminAuthService.checkUserIsAdmin).not.toHaveBeenCalled()
    })
  })

  describe('Security verification', () => {
    it('should consistently apply admin verification across all critical methods', async () => {
      mockAdminAuthService.checkUserIsAdmin.mockResolvedValue(false)
      const nonAdminUserId = 'non-admin-user'

      const criticalOperations = [
        () => ResolutionService.resolveMarket('market-123', 'yes', [{ type: 'description', content: 'Test' }], nonAdminUserId),
        () => ResolutionService.rollbackResolution('market-123', 'resolution-123', nonAdminUserId),
        () => ResolutionService.cancelMarket('market-123', 'Test reason', nonAdminUserId)
      ]

      // All critical operations should fail with UNAUTHORIZED error
      for (const operation of criticalOperations) {
        await expect(operation()).rejects.toMatchObject({
          type: ResolutionErrorType.UNAUTHORIZED
        })
      }

      expect(mockAdminAuthService.checkUserIsAdmin).toHaveBeenCalledTimes(criticalOperations.length)
    })

    it('should not require admin verification for read-only operations', async () => {
      // These operations should not call AdminAuthService.checkUserIsAdmin
      mockAdminAuthService.checkUserIsAdmin.mockResolvedValue(false)

      // Mock Firebase operations for read-only methods
      jest.doMock('firebase/firestore', () => ({
        collection: jest.fn(),
        query: jest.fn(),
        where: jest.fn(),
        orderBy: jest.fn(),
        getDocs: jest.fn().mockResolvedValue({ docs: [] }),
        doc: jest.fn(),
        getDoc: jest.fn().mockResolvedValue({ exists: () => false })
      }))

      try {
        // These should not require admin verification
        await ResolutionService.getPendingResolutionMarkets()
        await ResolutionService.calculatePayoutPreview('market-123', 'yes')
        await ResolutionService.getUserBets('market-123', 'yes')
        await ResolutionService.getMarketResolution('market-123')
        await ResolutionService.getUserResolutionPayouts('user-123')
      } catch (error) {
        // Errors are expected due to mocking, but should not be authorization errors
        expect(error).not.toMatchObject({
          type: ResolutionErrorType.UNAUTHORIZED
        })
      }

      // AdminAuthService should not be called for read-only operations
      expect(mockAdminAuthService.checkUserIsAdmin).not.toHaveBeenCalled()
    })
  })
})