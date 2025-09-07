import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/markets/[id]/route'

// Mock the admin auth service
jest.mock('@/lib/auth/admin-auth', () => ({
  AdminAuthService: {
    verifyAdminAuth: jest.fn()
  }
}))

// Mock the firestore service
jest.mock('@/lib/services/firestore', () => ({
  MarketsService: {
    deleteMarket: jest.fn()
  }
}))

describe('Market Deletion API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully delete a market with admin privileges', async () => {
    const { AdminAuthService } = await import('@/lib/auth/admin-auth')
    const { MarketsService } = await import('@/lib/services/firestore')

    // Mock admin verification success
    ;(AdminAuthService.verifyAdminAuth as jest.Mock).mockResolvedValue({
      isAdmin: true,
      userId: 'admin-123'
    })

    // Mock successful deletion
    ;(MarketsService.deleteMarket as jest.Mock).mockResolvedValue(undefined)

    // Create mock request with admin headers
    const request = new NextRequest('http://localhost/api/markets/market-123', {
      method: 'DELETE',
      headers: {
        'x-user-id': 'admin-123'
      }
    })

    const response = await DELETE(request, { params: { id: 'market-123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      message: 'Market deleted successfully'
    })

    expect(AdminAuthService.verifyAdminAuth).toHaveBeenCalledWith(request)
    expect(MarketsService.deleteMarket).toHaveBeenCalledWith('market-123', 'admin-123')
  })

  it('should reject deletion without admin privileges', async () => {
    const { AdminAuthService } = await import('@/lib/auth/admin-auth')

    // Mock admin verification failure
    ;(AdminAuthService.verifyAdminAuth as jest.Mock).mockResolvedValue({
      isAdmin: false,
      error: 'Access denied. Admin privileges required.'
    })

    const request = new NextRequest('http://localhost/api/markets/market-123', {
      method: 'DELETE',
      headers: {
        'x-user-id': 'regular-user-123'
      }
    })

    const response = await DELETE(request, { params: { id: 'market-123' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({
      error: 'Unauthorized',
      message: 'Access denied. Admin privileges required.'
    })
  })

  it('should handle market not found error', async () => {
    const { AdminAuthService } = await import('@/lib/auth/admin-auth')
    const { MarketsService } = await import('@/lib/services/firestore')

    // Mock admin verification success
    ;(AdminAuthService.verifyAdminAuth as jest.Mock).mockResolvedValue({
      isAdmin: true,
      userId: 'admin-123'
    })

    // Mock market not found error
    ;(MarketsService.deleteMarket as jest.Mock).mockRejectedValue(
      new Error('Market not found')
    )

    const request = new NextRequest('http://localhost/api/markets/nonexistent-market', {
      method: 'DELETE',
      headers: {
        'x-user-id': 'admin-123'
      }
    })

    const response = await DELETE(request, { params: { id: 'nonexistent-market' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({
      error: 'Market not found'
    })
  })

  it('should handle admin privileges error from service', async () => {
    const { AdminAuthService } = await import('@/lib/auth/admin-auth')
    const { MarketsService } = await import('@/lib/services/firestore')

    // Mock admin verification success
    ;(AdminAuthService.verifyAdminAuth as jest.Mock).mockResolvedValue({
      isAdmin: true,
      userId: 'admin-123'
    })

    // Mock admin privileges error from service
    ;(MarketsService.deleteMarket as jest.Mock).mockRejectedValue(
      new Error('Admin privileges required for market deletion')
    )

    const request = new NextRequest('http://localhost/api/markets/market-123', {
      method: 'DELETE',
      headers: {
        'x-user-id': 'admin-123'
      }
    })

    const response = await DELETE(request, { params: { id: 'market-123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({
      error: 'Admin privileges required'
    })
  })

  it('should handle general server errors', async () => {
    const { AdminAuthService } = await import('@/lib/auth/admin-auth')
    const { MarketsService } = await import('@/lib/services/firestore')

    // Mock admin verification success
    ;(AdminAuthService.verifyAdminAuth as jest.Mock).mockResolvedValue({
      isAdmin: true,
      userId: 'admin-123'
    })

    // Mock general error
    ;(MarketsService.deleteMarket as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    )

    const request = new NextRequest('http://localhost/api/markets/market-123', {
      method: 'DELETE',
      headers: {
        'x-user-id': 'admin-123'
      }
    })

    const response = await DELETE(request, { params: { id: 'market-123' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: 'Failed to delete market'
    })
  })
})