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

describe('ResolutionService Admin Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('resolveMarket', () => {
    it('should throw UNAUTHORIZED error when user is not admin', async () => {
      // Mock non-admin user
      mockAdminAuthService.checkUserIsAdmin.mockResolvedValue(false)

      await expect(
        ResolutionService.resolveMarket(
          'market-123',
          'yes',
          [{ type: 'description', content: 'Test evidence' }],
          'non-admin-user-id'
        )
      ).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'Admin privileges required for this operation'
      })

      expect(mockAdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('non-admin-user-id')
    })

    it('should throw UNAUTHORIZED error when adminId is empty', async () => {
      await expect(
        ResolutionService.resolveMarket(
          'market-123',
          'yes',
          [{ type: 'description', content: 'Test evidence' }],
          ''
        )
      ).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'User identification required for admin operations'
      })

      expect(mockAdminAuthService.checkUserIsAdmin).not.toHaveBeenCalled()
    })

    it('should proceed when user is admin', async () => {
      // Mock admin user
      mockAdminAuthService.checkUserIsAdmin.mockResolvedValue(true)

      // Mock Firebase operations to avoid actual database calls
      const mockLogResolutionAction = jest.spyOn(ResolutionService as any, 'logResolutionAction')
        .mockResolvedValue(undefined)
      const mockGetMarket = jest.spyOn(ResolutionService as any, 'getMarket')
        .mockResolvedValue({
          id: 'market-123',
          title: 'Test Market',
          status: 'pending_resolution',
          createdBy: 'creator-id'
        })

      // Mock other methods to prevent actual execution
      jest.spyOn(ResolutionService, 'calculatePayoutPreview').mockResolvedValue({
        totalPool: 1000,
        houseFee: 50,
        creatorFee: 20,
        winnerPool: 930,
        winnerCount: 5,
        largestPayout: 200,
        smallestPayout: 100,
        creatorPayout: {
          userId: 'creator-id',
          feeAmount: 20,
          feePercentage: 2
        },
        payouts: []
      })

      // Mock Firebase transaction
      const mockRunTransaction = jest.fn().mockResolvedValue('resolution-id-123')
      jest.doMock('firebase/firestore', () => ({
        runTransaction: mockRunTransaction,
        collection: jest.fn(),
        doc: jest.fn(),
        Timestamp: { now: () => new Date() }
      }))

      try {
        // This should not throw an authorization error
        await ResolutionService.resolveMarket(
          'market-123',
          'yes',
          [{ type: 'description', content: 'Test evidence' }],
          'admin-user-id'
        )
      } catch (error) {
        // We expect other errors due to mocking, but not UNAUTHORIZED
        expect(error).not.toMatchObject({
          type: ResolutionErrorType.UNAUTHORIZED
        })
      }

      expect(mockAdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('admin-user-id')
    })
  })

  describe('rollbackResolution', () => {
    it('should throw UNAUTHORIZED error when user is not admin', async () => {
      // Mock non-admin user
      mockAdminAuthService.checkUserIsAdmin.mockResolvedValue(false)

      await expect(
        ResolutionService.rollbackResolution(
          'market-123',
          'resolution-123',
          'non-admin-user-id'
        )
      ).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'Admin privileges required for this operation'
      })

      expect(mockAdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('non-admin-user-id')
    })

    it('should throw UNAUTHORIZED error when adminId is empty', async () => {
      await expect(
        ResolutionService.rollbackResolution(
          'market-123',
          'resolution-123',
          ''
        )
      ).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'User identification required for admin operations'
      })

      expect(mockAdminAuthService.checkUserIsAdmin).not.toHaveBeenCalled()
    })
  })

  describe('cancelMarket', () => {
    it('should throw UNAUTHORIZED error when user is not admin', async () => {
      // Mock non-admin user
      mockAdminAuthService.checkUserIsAdmin.mockResolvedValue(false)

      await expect(
        ResolutionService.cancelMarket(
          'market-123',
          'Test cancellation reason',
          'non-admin-user-id'
        )
      ).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'Admin privileges required for this operation'
      })

      expect(mockAdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('non-admin-user-id')
    })

    it('should throw UNAUTHORIZED error when adminId is empty', async () => {
      await expect(
        ResolutionService.cancelMarket(
          'market-123',
          'Test cancellation reason',
          ''
        )
      ).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'User identification required for admin operations'
      })

      expect(mockAdminAuthService.checkUserIsAdmin).not.toHaveBeenCalled()
    })
  })

  describe('verifyAdminPrivileges', () => {
    it('should throw error for empty adminId', async () => {
      const verifyAdminPrivileges = (ResolutionService as any).verifyAdminPrivileges

      await expect(verifyAdminPrivileges('')).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'User identification required for admin operations'
      })
    })

    it('should throw error for null adminId', async () => {
      const verifyAdminPrivileges = (ResolutionService as any).verifyAdminPrivileges

      await expect(verifyAdminPrivileges(null)).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'User identification required for admin operations'
      })
    })

    it('should throw error for undefined adminId', async () => {
      const verifyAdminPrivileges = (ResolutionService as any).verifyAdminPrivileges

      await expect(verifyAdminPrivileges(undefined)).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'User identification required for admin operations'
      })
    })

    it('should throw error when user is not admin', async () => {
      mockAdminAuthService.checkUserIsAdmin.mockResolvedValue(false)
      const verifyAdminPrivileges = (ResolutionService as any).verifyAdminPrivileges

      await expect(verifyAdminPrivileges('non-admin-user')).rejects.toMatchObject({
        type: ResolutionErrorType.UNAUTHORIZED,
        message: 'Admin privileges required for this operation'
      })

      expect(mockAdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('non-admin-user')
    })

    it('should not throw error when user is admin', async () => {
      mockAdminAuthService.checkUserIsAdmin.mockResolvedValue(true)
      const verifyAdminPrivileges = (ResolutionService as any).verifyAdminPrivileges

      await expect(verifyAdminPrivileges('admin-user')).resolves.toBeUndefined()

      expect(mockAdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('admin-user')
    })
  })
})