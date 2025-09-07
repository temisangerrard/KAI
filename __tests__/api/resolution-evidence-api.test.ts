/**
 * @jest-environment node
 */

import { GET } from '@/app/api/markets/[id]/resolution/evidence/route'
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

describe('/api/markets/[id]/resolution/evidence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return evidence when resolution exists with evidence', async () => {
      const mockEvidence = [
        {
          id: 'evidence-1',
          type: 'url' as const,
          content: 'https://example.com/proof',
          description: 'Official announcement',
          uploadedAt: Timestamp.now()
        },
        {
          id: 'evidence-2',
          type: 'screenshot' as const,
          content: 'screenshot-url',
          description: 'Screenshot of the result',
          uploadedAt: Timestamp.now()
        },
        {
          id: 'evidence-3',
          type: 'description' as const,
          content: 'Detailed explanation of the outcome based on multiple sources',
          uploadedAt: Timestamp.now()
        }
      ]

      const mockResolution = {
        id: 'resolution-123',
        marketId: 'market-456',
        winningOptionId: 'yes',
        resolvedBy: 'admin-789',
        resolvedAt: Timestamp.now(),
        evidence: mockEvidence,
        totalPayout: 1500,
        winnerCount: 10,
        status: 'completed' as const
      }

      mockResolutionService.getMarketResolution.mockResolvedValue(mockResolution)

      const request = createMockRequest('http://localhost:3000/api/markets/market-456/resolution/evidence')
      const response = await GET(request, { params: { id: 'market-456' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockEvidence)
      expect(mockResolutionService.getMarketResolution).toHaveBeenCalledWith('market-456')
    })

    it('should return empty array when resolution exists but has no evidence', async () => {
      const mockResolution = {
        id: 'resolution-123',
        marketId: 'market-456',
        winningOptionId: 'yes',
        resolvedBy: 'admin-789',
        resolvedAt: Timestamp.now(),
        evidence: [],
        totalPayout: 1500,
        winnerCount: 10,
        status: 'completed' as const
      }

      mockResolutionService.getMarketResolution.mockResolvedValue(mockResolution)

      const request = createMockRequest('http://localhost:3000/api/markets/market-456/resolution/evidence')
      const response = await GET(request, { params: { id: 'market-456' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
      expect(mockResolutionService.getMarketResolution).toHaveBeenCalledWith('market-456')
    })

    it('should return empty array when resolution exists but evidence is undefined', async () => {
      const mockResolution = {
        id: 'resolution-123',
        marketId: 'market-456',
        winningOptionId: 'yes',
        resolvedBy: 'admin-789',
        resolvedAt: Timestamp.now(),
        // evidence is undefined
        totalPayout: 1500,
        winnerCount: 10,
        status: 'completed' as const
      }

      mockResolutionService.getMarketResolution.mockResolvedValue(mockResolution as any)

      const request = createMockRequest('http://localhost:3000/api/markets/market-456/resolution/evidence')
      const response = await GET(request, { params: { id: 'market-456' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it('should return empty array when market has not been resolved', async () => {
      mockResolutionService.getMarketResolution.mockResolvedValue(null)

      const request = createMockRequest('http://localhost:3000/api/markets/market-456/resolution/evidence')
      const response = await GET(request, { params: { id: 'market-456' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
      expect(data.message).toBe('Market has not been resolved yet')
      expect(mockResolutionService.getMarketResolution).toHaveBeenCalledWith('market-456')
    })

    it('should return 400 when market ID is missing', async () => {
      const request = createMockRequest('http://localhost:3000/api/markets//resolution/evidence')
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

      const request = createMockRequest('http://localhost:3000/api/markets/market-456/resolution/evidence')
      const response = await GET(request, { params: { id: 'market-456' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch resolution evidence')
      expect(data.message).toBe('Database connection failed')
    })

    it('should handle different evidence types correctly', async () => {
      const mockEvidence = [
        {
          id: 'evidence-1',
          type: 'url' as const,
          content: 'https://twitter.com/official/status/123',
          description: 'Official Twitter announcement',
          uploadedAt: Timestamp.now()
        },
        {
          id: 'evidence-2',
          type: 'screenshot' as const,
          content: 'gs://bucket/screenshots/proof.png',
          description: 'Screenshot of the official result',
          uploadedAt: Timestamp.now()
        },
        {
          id: 'evidence-3',
          type: 'description' as const,
          content: 'Based on multiple news sources and official statements, the outcome was confirmed at 3:00 PM EST.',
          uploadedAt: Timestamp.now()
        }
      ]

      const mockResolution = {
        id: 'resolution-123',
        marketId: 'market-456',
        winningOptionId: 'no',
        resolvedBy: 'admin-789',
        resolvedAt: Timestamp.now(),
        evidence: mockEvidence,
        totalPayout: 2000,
        winnerCount: 15,
        status: 'completed' as const
      }

      mockResolutionService.getMarketResolution.mockResolvedValue(mockResolution)

      const request = createMockRequest('http://localhost:3000/api/markets/market-456/resolution/evidence')
      const response = await GET(request, { params: { id: 'market-456' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(3)
      expect(data.data[0].type).toBe('url')
      expect(data.data[1].type).toBe('screenshot')
      expect(data.data[2].type).toBe('description')
    })

    it('should handle evidence without descriptions', async () => {
      const mockEvidence = [
        {
          id: 'evidence-1',
          type: 'url' as const,
          content: 'https://example.com/result',
          uploadedAt: Timestamp.now()
        }
      ]

      const mockResolution = {
        id: 'resolution-123',
        marketId: 'market-456',
        winningOptionId: 'yes',
        resolvedBy: 'admin-789',
        resolvedAt: Timestamp.now(),
        evidence: mockEvidence,
        totalPayout: 500,
        winnerCount: 3,
        status: 'completed' as const
      }

      mockResolutionService.getMarketResolution.mockResolvedValue(mockResolution)

      const request = createMockRequest('http://localhost:3000/api/markets/market-456/resolution/evidence')
      const response = await GET(request, { params: { id: 'market-456' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockEvidence)
      expect(data.data[0].description).toBeUndefined()
    })
  })
})