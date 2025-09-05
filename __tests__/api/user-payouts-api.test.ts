/**
 * @jest-environment node
 */

import { GET } from '@/app/api/user/payouts/route'
import { ResolutionService } from '@/lib/services/resolution-service'

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    method: options?.method || 'GET',
    json: jest.fn().mockResolvedValue(options?.body ? JSON.parse(options.body) : {}),
    headers: new Map(Object.entries(options?.headers || {})),
    cookies: new Map()
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      json: jest.fn().mockResolvedValue(data),
      status: options?.status || 200
    }))
  }
}))

// Mock Firebase and database
jest.mock('@/lib/db/database', () => ({
  db: {},
  auth: {},
  analytics: null,
  app: {},
}))

// Mock the ResolutionService
jest.mock('@/lib/services/resolution-service', () => ({
  ResolutionService: {
    getUserResolutionPayouts: jest.fn()
  }
}))

const mockResolutionService = ResolutionService as jest.Mocked<typeof ResolutionService>

// Helper function to create mock request
function createMockRequest(url: string, options: { headers?: Record<string, string> } = {}) {
  const urlObj = new URL(url)
  return {
    url,
    headers: {
      get: (name: string) => options.headers?.[name] || null
    },
    method: 'GET'
  } as any
}

describe('/api/user/payouts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return user payouts when userId is provided in query params', async () => {
      const mockPayouts = {
        winnerPayouts: [
          {
            id: 'payout-1',
            resolutionId: 'resolution-1',
            userId: 'user-123',
            optionId: 'yes',
            tokensStaked: 100,
            payoutAmount: 150,
            profit: 50,
            processedAt: new Date(),
            status: 'completed' as const
          }
        ],
        creatorPayouts: [
          {
            id: 'creator-payout-1',
            resolutionId: 'resolution-2',
            creatorId: 'user-123',
            feeAmount: 25,
            feePercentage: 2.5,
            processedAt: new Date(),
            status: 'completed' as const
          }
        ]
      }

      mockResolutionService.getUserResolutionPayouts.mockResolvedValue(mockPayouts)

      const request = createMockRequest('http://localhost:3000/api/user/payouts?userId=user-123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockPayouts)
      expect(mockResolutionService.getUserResolutionPayouts).toHaveBeenCalledWith('user-123')
    })

    it('should return user payouts when userId is provided in headers', async () => {
      const mockPayouts = {
        winnerPayouts: [],
        creatorPayouts: []
      }

      mockResolutionService.getUserResolutionPayouts.mockResolvedValue(mockPayouts)

      const request = createMockRequest('http://localhost:3000/api/user/payouts', {
        headers: {
          'x-user-id': 'user-456'
        }
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockPayouts)
      expect(mockResolutionService.getUserResolutionPayouts).toHaveBeenCalledWith('user-456')
    })

    it('should return 400 when no userId is provided', async () => {
      const request = createMockRequest('http://localhost:3000/api/user/payouts')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User ID is required')
      expect(mockResolutionService.getUserResolutionPayouts).not.toHaveBeenCalled()
    })

    it('should return 500 when service throws an error', async () => {
      mockResolutionService.getUserResolutionPayouts.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = createMockRequest('http://localhost:3000/api/user/payouts?userId=user-123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch user payouts')
      expect(data.message).toBe('Database connection failed')
    })

    it('should handle empty payouts gracefully', async () => {
      const mockPayouts = {
        winnerPayouts: [],
        creatorPayouts: []
      }

      mockResolutionService.getUserResolutionPayouts.mockResolvedValue(mockPayouts)

      const request = createMockRequest('http://localhost:3000/api/user/payouts?userId=user-123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.winnerPayouts).toHaveLength(0)
      expect(data.data.creatorPayouts).toHaveLength(0)
    })

    it('should prioritize query param userId over header', async () => {
      const mockPayouts = {
        winnerPayouts: [],
        creatorPayouts: []
      }

      mockResolutionService.getUserResolutionPayouts.mockResolvedValue(mockPayouts)

      const request = createMockRequest('http://localhost:3000/api/user/payouts?userId=query-user', {
        headers: {
          'x-user-id': 'header-user'
        }
      })
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockResolutionService.getUserResolutionPayouts).toHaveBeenCalledWith('query-user')
    })
  })
})