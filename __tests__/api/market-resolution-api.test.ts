/**
 * @jest-environment node
 */

import { GET } from '@/app/api/markets/[id]/resolution/route'
import { ResolutionService } from '@/lib/services/resolution-service'
import { Timestamp } from 'firebase/firestore'

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
    getMarketResolution: jest.fn()
  }
}))

const mockResolutionService = ResolutionService as jest.Mocked<typeof ResolutionService>

// Helper function to create mock request
function createMockRequest(url: string, options: { headers?: Record<string, string> } = {}) {
  return {
    url,
    headers: {
      get: (name: string) => options.headers?.[name] || null
    },
    method: 'GET'
  } as any
}

describe('/api/markets/[id]/resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return market resolution when resolution exists', async () => {
      const mockResolution = {
        id: 'resolution-123',
        marketId: 'market-456',
        winningOptionId: 'yes',
        resolvedBy: 'admin-789',
        resolvedAt: Timestamp.now(),
        evidence: [
          {
            id: 'evidence-1',
            type: 'url' as const,
            content: 'https://example.com/proof',
            description: 'Official announcement',
            uploadedAt: Timestamp.now()
          }
        ],
        totalPayout: 1500,
        winnerCount: 10,
        status: 'completed' as const,
        creatorFeeAmount: 50,
        houseFeeAmount: 100
      }

      mockResolutionService.getMarketResolution.mockResolvedValue(mockResolution)

      const request = createMockRequest('http://localhost:3000/api/markets/market-456/resolution')
      const response = await GET(request, { params: { id: 'market-456' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResolution)
      expect(mockResolutionService.getMarketResolution).toHaveBeenCalledWith('market-456')
    })

    it('should return null when market has not been resolved', async () => {
      mockResolutionService.getMarketResolution.mockResolvedValue(null)

      const request = createMockRequest('http://localhost:3000/api/markets/market-456/resolution')
      const response = await GET(request, { params: { id: 'market-456' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeNull()
      expect(data.message).toBe('Market has not been resolved yet')
      expect(mockResolutionService.getMarketResolution).toHaveBeenCalledWith('market-456')
    })

    it('should return 400 when market ID is missing', async () => {
      const request = createMockRequest('http://localhost:3000/api/markets//resolution')
      const response = await GET(request, { params: { id: '' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Market ID is required')
      expect(mockResolutionService.getMarketResolution).not.toHaveBeenCalled()
    })

    it('should return 500 when service throws an error', async () => {
      mockResolutionService.getMarketResolution.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = createMockRequest('http://localhost:3000/api/markets/market-456/resolution')
      const response = await GET(request, { params: { id: 'market-456' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch market resolution')
      expect(data.message).toBe('Database connection failed')
    })

    it('should handle resolution with minimal data', async () => {
      const mockResolution = {
        id: 'resolution-123',
        marketId: 'market-456',
        winningOptionId: 'no',
        resolvedBy: 'admin-789',
        resolvedAt: Timestamp.now(),
        evidence: [],
        totalPayout: 0,
        winnerCount: 0,
        status: 'completed' as const
      }

      mockResolutionService.getMarketResolution.mockResolvedValue(mockResolution)

      const request = createMockRequest('http://localhost:3000/api/markets/market-456/resolution')
      const response = await GET(request, { params: { id: 'market-456' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResolution)
    })

    it('should handle resolution with cancelled status', async () => {
      const mockResolution = {
        id: 'resolution-123',
        marketId: 'market-456',
        winningOptionId: 'yes',
        resolvedBy: 'admin-789',
        resolvedAt: Timestamp.now(),
        evidence: [
          {
            id: 'evidence-1',
            type: 'description' as const,
            content: 'Market cancelled due to insufficient evidence',
            uploadedAt: Timestamp.now()
          }
        ],
        totalPayout: 0,
        winnerCount: 0,
        status: 'cancelled' as const
      }

      mockResolutionService.getMarketResolution.mockResolvedValue(mockResolution)

      const request = createMockRequest('http://localhost:3000/api/markets/market-456/resolution')
      const response = await GET(request, { params: { id: 'market-456' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.status).toBe('cancelled')
    })
  })
})