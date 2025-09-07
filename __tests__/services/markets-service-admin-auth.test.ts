import { MarketsService } from '@/lib/services/firestore'
import { AdminAuthService } from '@/lib/auth/admin-auth'

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
}))

jest.mock('@/lib/db/database', () => ({
  db: {}
}))

// Mock AdminAuthService
jest.mock('@/lib/auth/admin-auth', () => ({
  AdminAuthService: {
    checkUserIsAdmin: jest.fn()
  }
}))

describe('MarketsService Admin Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('updateMarket', () => {
    it('updates market without admin verification when no adminId provided', async () => {
      const { updateDoc } = require('firebase/firestore')
      ;(updateDoc as jest.Mock).mockResolvedValue({})

      await MarketsService.updateMarket('market-123', {
        title: 'Updated Title',
        description: 'Updated Description'
      })

      expect(updateDoc).toHaveBeenCalled()
      expect(AdminAuthService.checkUserIsAdmin).not.toHaveBeenCalled()
    })

    it('verifies admin privileges when adminId is provided', async () => {
      const { updateDoc } = require('firebase/firestore')
      ;(updateDoc as jest.Mock).mockResolvedValue({})
      ;(AdminAuthService.checkUserIsAdmin as jest.Mock).mockResolvedValue(true)

      await MarketsService.updateMarket('market-123', {
        title: 'Updated Title',
        description: 'Updated Description'
      }, 'admin-user-id')

      expect(AdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('admin-user-id')
      expect(updateDoc).toHaveBeenCalled()
    })

    it('throws error when user is not admin', async () => {
      ;(AdminAuthService.checkUserIsAdmin as jest.Mock).mockResolvedValue(false)

      await expect(
        MarketsService.updateMarket('market-123', {
          title: 'Updated Title',
          description: 'Updated Description'
        }, 'non-admin-user-id')
      ).rejects.toThrow('Admin privileges required for market updates')

      expect(AdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('non-admin-user-id')
    })

    it('throws error when admin verification fails', async () => {
      ;(AdminAuthService.checkUserIsAdmin as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(
        MarketsService.updateMarket('market-123', {
          title: 'Updated Title',
          description: 'Updated Description'
        }, 'admin-user-id')
      ).rejects.toThrow('Database connection failed')

      expect(AdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('admin-user-id')
    })
  })
})