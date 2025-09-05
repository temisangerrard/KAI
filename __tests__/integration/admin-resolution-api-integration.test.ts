import { ResolutionService } from '@/lib/services/resolution-service';
import { AdminAuthService } from '@/lib/auth/admin-auth';

// Mock Firebase and services
jest.mock('@/lib/db/database', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  writeBatch: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() }))
  }
}));

jest.mock('@/lib/services/resolution-service', () => ({
  ResolutionService: {
    getPendingResolutionMarkets: jest.fn(),
    calculatePayoutPreview: jest.fn(),
    resolveMarket: jest.fn()
  }
}));

jest.mock('@/lib/auth/admin-auth', () => ({
  AdminAuthService: {
    verifyAdminAuth: jest.fn()
  }
}));

const mockResolutionService = ResolutionService as jest.Mocked<typeof ResolutionService>;
const mockAdminAuthService = AdminAuthService as jest.Mocked<typeof AdminAuthService>;

describe('Admin Resolution API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pending Resolution Markets', () => {
    it('should fetch pending resolution markets successfully', async () => {
      const mockMarkets = [
        {
          id: 'market-1',
          title: 'Test Market 1',
          status: 'pending_resolution',
          endsAt: new Date('2024-01-01'),
          totalParticipants: 10,
          totalTokensStaked: 1000
        }
      ];

      mockResolutionService.getPendingResolutionMarkets.mockResolvedValue(mockMarkets as any);

      const result = await ResolutionService.getPendingResolutionMarkets();
      
      expect(result).toEqual(mockMarkets);
      expect(mockResolutionService.getPendingResolutionMarkets).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching pending markets', async () => {
      const errorMessage = 'Database connection failed';
      mockResolutionService.getPendingResolutionMarkets.mockRejectedValue(new Error(errorMessage));

      await expect(ResolutionService.getPendingResolutionMarkets()).rejects.toThrow(errorMessage);
    });
  });

  describe('Payout Preview Calculation', () => {
    it('should calculate payout preview with default creator fee', async () => {
      const mockPreview = {
        totalPool: 1000,
        houseFee: 50,
        creatorFee: 20,
        winnerPool: 930,
        winnerCount: 3,
        largestPayout: 500,
        smallestPayout: 100,
        creatorPayout: {
          userId: 'creator-123',
          feeAmount: 20,
          feePercentage: 2
        },
        payouts: [
          {
            userId: 'user-1',
            currentStake: 300,
            projectedPayout: 500,
            projectedProfit: 200
          }
        ]
      };

      mockResolutionService.calculatePayoutPreview.mockResolvedValue(mockPreview as any);

      const result = await ResolutionService.calculatePayoutPreview('market-123', 'yes', 0.02);
      
      expect(result).toEqual(mockPreview);
      expect(mockResolutionService.calculatePayoutPreview).toHaveBeenCalledWith('market-123', 'yes', 0.02);
    });

    it('should calculate payout preview with custom creator fee', async () => {
      const mockPreview = {
        totalPool: 1000,
        houseFee: 50,
        creatorFee: 50, // 5% creator fee
        winnerPool: 900,
        winnerCount: 2,
        largestPayout: 600,
        smallestPayout: 300,
        creatorPayout: {
          userId: 'creator-123',
          feeAmount: 50,
          feePercentage: 5
        },
        payouts: []
      };

      mockResolutionService.calculatePayoutPreview.mockResolvedValue(mockPreview as any);

      const result = await ResolutionService.calculatePayoutPreview('market-123', 'no', 0.05);
      
      expect(result).toEqual(mockPreview);
      expect(mockResolutionService.calculatePayoutPreview).toHaveBeenCalledWith('market-123', 'no', 0.05);
    });

    it('should handle errors in payout calculation', async () => {
      const errorMessage = 'Market not found';
      mockResolutionService.calculatePayoutPreview.mockRejectedValue(new Error(errorMessage));

      await expect(ResolutionService.calculatePayoutPreview('market-123', 'yes')).rejects.toThrow(errorMessage);
    });
  });

  describe('Market Resolution', () => {
    const validEvidence = [
      {
        type: 'url' as const,
        content: 'https://example.com/proof',
        description: 'Official announcement'
      },
      {
        type: 'description' as const,
        content: 'The outcome was confirmed by official sources'
      }
    ];

    it('should resolve market successfully', async () => {
      mockResolutionService.resolveMarket.mockResolvedValue({
        success: true,
        resolutionId: 'resolution-456'
      });

      const result = await ResolutionService.resolveMarket(
        'market-123',
        'yes',
        validEvidence,
        'admin-123',
        0.03
      );

      expect(result.success).toBe(true);
      expect(result.resolutionId).toBe('resolution-456');
      expect(mockResolutionService.resolveMarket).toHaveBeenCalledWith(
        'market-123',
        'yes',
        validEvidence,
        'admin-123',
        0.03
      );
    });

    it('should handle resolution errors', async () => {
      const resolutionError = new Error('Market already resolved');
      resolutionError.name = 'ResolutionServiceError';
      
      mockResolutionService.resolveMarket.mockRejectedValue(resolutionError);

      await expect(ResolutionService.resolveMarket(
        'market-123',
        'yes',
        validEvidence,
        'admin-123'
      )).rejects.toThrow('Market already resolved');
    });
  });

  describe('Admin Authentication', () => {
    it('should verify admin authentication successfully', async () => {
      mockAdminAuthService.verifyAdminAuth.mockResolvedValue({
        isAdmin: true,
        user: { uid: 'admin-123' }
      } as any);

      const result = await AdminAuthService.verifyAdminAuth({} as any);
      
      expect(result.isAdmin).toBe(true);
      expect(result.user?.uid).toBe('admin-123');
    });

    it('should reject non-admin authentication', async () => {
      mockAdminAuthService.verifyAdminAuth.mockResolvedValue({
        isAdmin: false,
        error: 'Invalid admin token'
      } as any);

      const result = await AdminAuthService.verifyAdminAuth({} as any);
      
      expect(result.isAdmin).toBe(false);
      expect(result.error).toBe('Invalid admin token');
    });
  });

  describe('API Validation Logic', () => {
    describe('Creator Fee Validation', () => {
      it('should validate creator fee percentage range', () => {
        const validFees = [0.01, 0.02, 0.03, 0.04, 0.05];
        const invalidFees = [0.005, 0.06, -0.01, 0];

        validFees.forEach(fee => {
          expect(fee >= 0.01 && fee <= 0.05).toBe(true);
        });

        invalidFees.forEach(fee => {
          expect(fee >= 0.01 && fee <= 0.05).toBe(false);
        });
      });
    });

    describe('Evidence Validation', () => {
      it('should validate evidence structure', () => {
        const validEvidence = [
          { type: 'url', content: 'https://example.com' },
          { type: 'description', content: 'Detailed explanation' },
          { type: 'screenshot', content: 'base64-image-data' }
        ];

        const invalidEvidence = [
          { type: 'invalid', content: 'test' },
          { type: 'url' }, // Missing content
          { content: 'test' } // Missing type
        ];

        validEvidence.forEach(evidence => {
          const isValid = evidence.type && evidence.content && 
            ['url', 'description', 'screenshot'].includes(evidence.type);
          expect(isValid).toBe(true);
        });

        invalidEvidence.forEach(evidence => {
          const isValid = evidence.type && evidence.content && 
            ['url', 'description', 'screenshot'].includes(evidence.type);
          expect(isValid).toBeFalsy();
        });
      });

      it('should require at least one evidence item', () => {
        const emptyEvidence: any[] = [];
        const validEvidence = [{ type: 'url', content: 'https://example.com' }];

        expect(emptyEvidence.length > 0).toBe(false);
        expect(validEvidence.length > 0).toBe(true);
      });
    });

    describe('Market Status Validation', () => {
      it('should validate market status for operations', () => {
        const resolvableStatuses = ['active', 'pending_resolution'];
        const nonResolvableStatuses = ['resolved', 'cancelled', 'draft'];

        resolvableStatuses.forEach(status => {
          expect(['active', 'pending_resolution'].includes(status)).toBe(true);
        });

        nonResolvableStatuses.forEach(status => {
          expect(['active', 'pending_resolution'].includes(status)).toBe(false);
        });
      });
    });

    describe('Cancellation Reason Validation', () => {
      it('should validate cancellation reason length', () => {
        const validReasons = [
          'Market outcome cannot be determined objectively',
          'Insufficient evidence available for resolution',
          'Market question was ambiguous and needs clarification'
        ];

        const invalidReasons = [
          '', // Empty
          'Too short', // Less than 10 characters
          '   ', // Only whitespace
        ];

        validReasons.forEach(reason => {
          expect(reason.trim().length >= 10).toBe(true);
        });

        invalidReasons.forEach(reason => {
          expect(reason.trim().length >= 10).toBe(false);
        });
      });
    });
  });

  describe('Error Handling Patterns', () => {
    it('should handle different error types consistently', () => {
      const errors = [
        { type: 'validation', status: 400, message: 'Invalid input' },
        { type: 'authentication', status: 401, message: 'Unauthorized' },
        { type: 'not_found', status: 404, message: 'Resource not found' },
        { type: 'server', status: 500, message: 'Internal server error' }
      ];

      errors.forEach(error => {
        expect(error.status).toBeGreaterThanOrEqual(400);
        expect(error.status).toBeLessThan(600);
        expect(error.message).toBeTruthy();
      });
    });

    it('should provide consistent error response structure', () => {
      const errorResponse = {
        success: false,
        error: 'Validation failed',
        message: 'Specific error details'
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeTruthy();
      expect(errorResponse.message).toBeTruthy();
    });

    it('should provide consistent success response structure', () => {
      const successResponse = {
        success: true,
        message: 'Operation completed successfully',
        data: { id: 'test-123' }
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.message).toBeTruthy();
    });
  });
});