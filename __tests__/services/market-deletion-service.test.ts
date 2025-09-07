import { MarketsService } from '@/lib/services/firestore'

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  collection: jest.fn(),
  where: jest.fn(),
  writeBatch: jest.fn(),
  deleteDoc: jest.fn()
}))

// Mock the database
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

// Mock admin auth service
jest.mock('@/lib/auth/admin-auth', () => ({
  AdminAuthService: {
    checkUserIsAdmin: jest.fn()
  }
}))

describe('MarketsService.deleteMarket', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully delete a market with admin privileges', async () => {
    const { AdminAuthService } = await import('@/lib/auth/admin-auth')
    const { 
      doc, 
      getDoc, 
      getDocs, 
      query, 
      collection, 
      where, 
      writeBatch 
    } = await import('firebase/firestore')

    // Mock admin verification
    ;(AdminAuthService.checkUserIsAdmin as jest.Mock).mockResolvedValue(true)

    // Mock market exists
    ;(getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        id: 'market-123',
        title: 'Test Market',
        status: 'active'
      })
    })

    // Mock related data queries
    ;(getDocs as jest.Mock).mockResolvedValue({
      docs: [
        { ref: { id: 'pred-1' } },
        { ref: { id: 'pred-2' } }
      ]
    })

    // Mock batch operations
    const mockBatch = {
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    }
    ;(writeBatch as jest.Mock).mockReturnValue(mockBatch)

    // Mock MarketsService.getMarket
    jest.spyOn(MarketsService, 'getMarket').mockResolvedValue({
      id: 'market-123',
      title: 'Test Market',
      description: 'Test description',
      category: 'entertainment' as any,
      status: 'active' as any,
      createdBy: 'user-123',
      createdAt: new Date() as any,
      endsAt: new Date() as any,
      tags: ['test'],
      totalParticipants: 2,
      totalTokensStaked: 300,
      featured: false,
      trending: false,
      options: []
    })

    await MarketsService.deleteMarket('market-123', 'admin-123')

    expect(AdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('admin-123')
    expect(MarketsService.getMarket).toHaveBeenCalledWith('market-123')
    expect(mockBatch.commit).toHaveBeenCalled()
  })

  it('should reject deletion without admin privileges', async () => {
    const { AdminAuthService } = await import('@/lib/auth/admin-auth')

    // Mock admin verification failure
    ;(AdminAuthService.checkUserIsAdmin as jest.Mock).mockResolvedValue(false)

    await expect(
      MarketsService.deleteMarket('market-123', 'regular-user-123')
    ).rejects.toThrow('Admin privileges required for market deletion')

    expect(AdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('regular-user-123')
  })

  it('should reject deletion if market does not exist', async () => {
    const { AdminAuthService } = await import('@/lib/auth/admin-auth')

    // Mock admin verification success
    ;(AdminAuthService.checkUserIsAdmin as jest.Mock).mockResolvedValue(true)

    // Mock MarketsService.getMarket to return null
    jest.spyOn(MarketsService, 'getMarket').mockResolvedValue(null)

    await expect(
      MarketsService.deleteMarket('nonexistent-market', 'admin-123')
    ).rejects.toThrow('Market not found')

    expect(AdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('admin-123')
    expect(MarketsService.getMarket).toHaveBeenCalledWith('nonexistent-market')
  })

  it('should handle batch operation failures', async () => {
    const { AdminAuthService } = await import('@/lib/auth/admin-auth')
    const { 
      getDocs, 
      writeBatch 
    } = await import('firebase/firestore')

    // Mock admin verification
    ;(AdminAuthService.checkUserIsAdmin as jest.Mock).mockResolvedValue(true)

    // Mock market exists
    jest.spyOn(MarketsService, 'getMarket').mockResolvedValue({
      id: 'market-123',
      title: 'Test Market',
      description: 'Test description',
      category: 'entertainment' as any,
      status: 'active' as any,
      createdBy: 'user-123',
      createdAt: new Date() as any,
      endsAt: new Date() as any,
      tags: ['test'],
      totalParticipants: 2,
      totalTokensStaked: 300,
      featured: false,
      trending: false,
      options: []
    })

    // Mock related data queries
    ;(getDocs as jest.Mock).mockResolvedValue({
      docs: []
    })

    // Mock batch operation failure
    const mockBatch = {
      delete: jest.fn(),
      commit: jest.fn().mockRejectedValue(new Error('Database error'))
    }
    ;(writeBatch as jest.Mock).mockReturnValue(mockBatch)

    await expect(
      MarketsService.deleteMarket('market-123', 'admin-123')
    ).rejects.toThrow('Database error')
  })
})