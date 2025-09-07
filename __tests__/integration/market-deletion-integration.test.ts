/**
 * Integration test for market deletion functionality
 * Tests the complete flow from API to service layer
 */

import { MarketsService } from '@/lib/services/firestore'
import { AdminAuthService } from '@/lib/auth/admin-auth'

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

describe('Market Deletion Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should complete the full deletion workflow', async () => {
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
    jest.spyOn(AdminAuthService, 'checkUserIsAdmin').mockResolvedValue(true)

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

    // Mock related data queries (predictions, comments, transactions)
    ;(getDocs as jest.Mock).mockResolvedValue({
      docs: [
        { ref: { id: 'pred-1' } },
        { ref: { id: 'comment-1' } },
        { ref: { id: 'transaction-1' } }
      ]
    })

    // Mock batch operations
    const mockBatch = {
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    }
    ;(writeBatch as jest.Mock).mockReturnValue(mockBatch)

    // Execute the deletion
    await MarketsService.deleteMarket('market-123', 'admin-123')

    // Verify the workflow
    expect(AdminAuthService.checkUserIsAdmin).toHaveBeenCalledWith('admin-123')
    expect(MarketsService.getMarket).toHaveBeenCalledWith('market-123')
    expect(mockBatch.commit).toHaveBeenCalled()
    
    // Verify batch operations were called for all related data
    expect(mockBatch.delete).toHaveBeenCalled()
  })

  it('should handle the complete error scenarios', async () => {
    // Test 1: Non-admin user
    jest.spyOn(AdminAuthService, 'checkUserIsAdmin').mockResolvedValue(false)

    await expect(
      MarketsService.deleteMarket('market-123', 'regular-user')
    ).rejects.toThrow('Admin privileges required for market deletion')

    // Test 2: Market not found
    jest.spyOn(AdminAuthService, 'checkUserIsAdmin').mockResolvedValue(true)
    jest.spyOn(MarketsService, 'getMarket').mockResolvedValue(null)

    await expect(
      MarketsService.deleteMarket('nonexistent-market', 'admin-123')
    ).rejects.toThrow('Market not found')
  })

  it('should verify all related data is cleaned up', async () => {
    const { 
      getDocs, 
      query, 
      collection, 
      where, 
      writeBatch 
    } = await import('firebase/firestore')

    // Mock admin verification and market exists
    jest.spyOn(AdminAuthService, 'checkUserIsAdmin').mockResolvedValue(true)
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

    // Mock multiple calls to getDocs for different collections
    ;(getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [{ ref: { id: 'pred-1' } }, { ref: { id: 'pred-2' } }] }) // predictions
      .mockResolvedValueOnce({ docs: [{ ref: { id: 'comment-1' } }] }) // comments
      .mockResolvedValueOnce({ docs: [{ ref: { id: 'transaction-1' } }] }) // transactions

    const mockBatch = {
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    }
    ;(writeBatch as jest.Mock).mockReturnValue(mockBatch)

    await MarketsService.deleteMarket('market-123', 'admin-123')

    // Verify queries were made for all related collections
    expect(query).toHaveBeenCalledTimes(3) // predictions, comments, transactions
    expect(collection).toHaveBeenCalledTimes(3)
    expect(where).toHaveBeenCalledTimes(3)
    
    // Verify all documents were marked for deletion
    expect(mockBatch.delete).toHaveBeenCalledTimes(5) // market + 2 predictions + 1 comment + 1 transaction
  })
})