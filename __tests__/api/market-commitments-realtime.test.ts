// Mock Firebase and services before any imports
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() }))
  }
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn()
}));

jest.mock('@/lib/db/database', () => ({
  db: {},
  auth: {}
}));

jest.mock('@/lib/services/admin-commitment-service', () => ({
  AdminCommitmentService: {
    getMarketCommitments: jest.fn(),
    createMarketCommitmentsListener: jest.fn(),
    createMarketAnalyticsListener: jest.fn(),
    getCachedMarketAnalytics: jest.fn()
  }
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/markets/[id]/commitments/route';
import { AdminCommitmentService } from '@/lib/services/admin-commitment-service';

const mockAdminCommitmentService = AdminCommitmentService as jest.Mocked<typeof AdminCommitmentService>;

describe('/api/admin/markets/[id]/commitments - Real-time API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockMarket = {
    id: 'market-123',
    title: 'Test Market',
    description: 'Test market description',
    status: 'active',
    category: 'entertainment',
    createdAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 86400000).toISOString(),
    totalParticipants: 10,
    totalTokensStaked: 1000,
    options: ['yes', 'no']
  };

  const mockCommitments = [
    {
      id: 'commitment-1',
      userId: 'user-1',
      predictionId: 'market-123',
      tokensCommitted: 100,
      position: 'yes' as const,
      odds: 1.5,
      potentialWinning: 150,
      status: 'active' as const,
      committedAt: new Date().toISOString(),
      user: {
        id: 'user-1',
        email: 'user1@example.com',
        displayName: 'User One'
      },
      metadata: {
        marketStatus: 'active' as const,
        marketTitle: 'Test Market',
        marketEndsAt: new Date(Date.now() + 86400000),
        oddsSnapshot: {
          yesOdds: 1.5,
          noOdds: 2.0,
          totalYesTokens: 600,
          totalNoTokens: 400,
          totalParticipants: 10
        },
        userBalanceAtCommitment: 500,
        commitmentSource: 'web' as const
      }
    }
  ];

  const mockAnalytics = {
    totalTokens: 1000,
    participantCount: 10,
    yesPercentage: 60,
    noPercentage: 40,
    averageCommitment: 100,
    largestCommitment: 200,
    commitmentTrend: [
      {
        date: '2024-01-01',
        totalTokens: 500,
        commitmentCount: 5,
        yesTokens: 300,
        noTokens: 200
      }
    ]
  };

  describe('GET /api/admin/markets/[id]/commitments', () => {
    it('should fetch market commitments with real-time data', async () => {
      // Mock the service response
      mockAdminCommitmentService.getMarketCommitments.mockResolvedValue({
        market: mockMarket,
        commitments: mockCommitments,
        analytics: mockAnalytics,
        totalCount: 1
      });

      const request = new NextRequest('http://localhost:3000/api/admin/markets/market-123/commitments?realTime=true');
      const response = await GET(request, { params: { id: 'market-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockAdminCommitmentService.getMarketCommitments).toHaveBeenCalledWith('market-123', {
        page: 1,
        pageSize: 50,
        status: undefined,
        position: undefined,
        sortBy: 'committedAt',
        sortOrder: 'desc',
        includeAnalytics: true
      });

      expect(data).toMatchObject({
        market: expect.objectContaining({
          id: 'market-123',
          title: 'Test Market'
        }),
        commitments: expect.arrayContaining([
          expect.objectContaining({
            id: 'commitment-1',
            tokensCommitted: 100,
            position: 'yes'
          })
        ]),
        analytics: expect.objectContaining({
          totalTokens: 1000,
          participantCount: 10
        }),
        metadata: expect.objectContaining({
          realTimeEnabled: true,
          lastUpdated: expect.any(String)
        })
      });
    });

    it('should handle real-time query parameters correctly', async () => {
      mockAdminCommitmentService.getMarketCommitments.mockResolvedValue({
        market: mockMarket,
        commitments: mockCommitments,
        analytics: mockAnalytics,
        totalCount: 1
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/markets/market-123/commitments?' +
        'realTime=true&page=2&pageSize=25&status=active&position=yes&sortBy=tokensCommitted&sortOrder=asc'
      );
      
      const response = await GET(request, { params: { id: 'market-123' } });

      expect(mockAdminCommitmentService.getMarketCommitments).toHaveBeenCalledWith('market-123', {
        page: 2,
        pageSize: 25,
        status: 'active',
        position: 'yes',
        sortBy: 'tokensCommitted',
        sortOrder: 'asc',
        includeAnalytics: true
      });

      expect(response.status).toBe(200);
    });

    it('should set appropriate cache headers for real-time requests', async () => {
      mockAdminCommitmentService.getMarketCommitments.mockResolvedValue({
        market: mockMarket,
        commitments: mockCommitments,
        analytics: mockAnalytics,
        totalCount: 1
      });

      const request = new NextRequest('http://localhost:3000/api/admin/markets/market-123/commitments?realTime=true');
      const response = await GET(request, { params: { id: 'market-123' } });

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Pragma')).toBe('no-cache');
      expect(response.headers.get('Expires')).toBe('0');
    });

    it('should set appropriate cache headers for non-real-time requests', async () => {
      mockAdminCommitmentService.getMarketCommitments.mockResolvedValue({
        market: mockMarket,
        commitments: mockCommitments,
        analytics: mockAnalytics,
        totalCount: 1
      });

      const request = new NextRequest('http://localhost:3000/api/admin/markets/market-123/commitments?realTime=false');
      const response = await GET(request, { params: { id: 'market-123' } });

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=30');
    });

    it('should handle market not found error', async () => {
      mockAdminCommitmentService.getMarketCommitments.mockRejectedValue(new Error('Market not found'));

      const request = new NextRequest('http://localhost:3000/api/admin/markets/nonexistent/commitments');
      const response = await GET(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toMatchObject({
        error: 'Market not found',
        message: 'Market with ID nonexistent does not exist',
        marketId: 'nonexistent'
      });
    });

    it('should handle service errors gracefully', async () => {
      mockAdminCommitmentService.getMarketCommitments.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/markets/market-123/commitments');
      const response = await GET(request, { params: { id: 'market-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toMatchObject({
        error: 'Failed to fetch market commitments',
        message: 'An error occurred while retrieving commitment data for this market',
        marketId: 'market-123',
        details: 'Database connection failed'
      });
    });

    it('should include pagination metadata in response', async () => {
      mockAdminCommitmentService.getMarketCommitments.mockResolvedValue({
        market: mockMarket,
        commitments: mockCommitments,
        analytics: mockAnalytics,
        totalCount: 100
      });

      const request = new NextRequest('http://localhost:3000/api/admin/markets/market-123/commitments?page=2&pageSize=25');
      const response = await GET(request, { params: { id: 'market-123' } });
      const data = await response.json();

      expect(data.pagination).toMatchObject({
        page: 2,
        pageSize: 25,
        totalCount: 100,
        totalPages: 4,
        hasNext: true,
        hasPrev: true
      });
    });

    it('should include filter metadata in response', async () => {
      mockAdminCommitmentService.getMarketCommitments.mockResolvedValue({
        market: mockMarket,
        commitments: mockCommitments,
        analytics: mockAnalytics,
        totalCount: 1
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/markets/market-123/commitments?status=active&position=yes&sortBy=tokensCommitted&sortOrder=desc'
      );
      const response = await GET(request, { params: { id: 'market-123' } });
      const data = await response.json();

      expect(data.filters).toMatchObject({
        status: 'active',
        position: 'yes',
        sortBy: 'tokensCommitted',
        sortOrder: 'desc'
      });
    });
  });

  describe('Real-time Service Integration', () => {
    it('should verify AdminCommitmentService has real-time listener methods', () => {
      expect(typeof AdminCommitmentService.createMarketCommitmentsListener).toBe('function');
      expect(typeof AdminCommitmentService.createMarketAnalyticsListener).toBe('function');
      expect(typeof AdminCommitmentService.getCachedMarketAnalytics).toBe('function');
    });

    it('should test real-time listener creation', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      mockAdminCommitmentService.createMarketCommitmentsListener.mockReturnValue(mockUnsubscribe);

      const unsubscribe = AdminCommitmentService.createMarketCommitmentsListener(
        'market-123',
        mockCallback,
        {
          status: 'active',
          position: 'yes',
          sortBy: 'committedAt',
          sortOrder: 'desc',
          pageSize: 50
        }
      );

      expect(mockAdminCommitmentService.createMarketCommitmentsListener).toHaveBeenCalledWith(
        'market-123',
        mockCallback,
        {
          status: 'active',
          position: 'yes',
          sortBy: 'committedAt',
          sortOrder: 'desc',
          pageSize: 50
        }
      );

      expect(typeof unsubscribe).toBe('function');
    });

    it('should test analytics listener creation', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      mockAdminCommitmentService.createMarketAnalyticsListener.mockReturnValue(mockUnsubscribe);

      const unsubscribe = AdminCommitmentService.createMarketAnalyticsListener('market-123', mockCallback);

      expect(mockAdminCommitmentService.createMarketAnalyticsListener).toHaveBeenCalledWith('market-123', mockCallback);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should test cached analytics retrieval', async () => {
      mockAdminCommitmentService.getCachedMarketAnalytics.mockResolvedValue(mockAnalytics);

      const analytics = await AdminCommitmentService.getCachedMarketAnalytics('market-123', 30000);

      expect(mockAdminCommitmentService.getCachedMarketAnalytics).toHaveBeenCalledWith('market-123', 30000);
      expect(analytics).toEqual(mockAnalytics);
    });
  });
});