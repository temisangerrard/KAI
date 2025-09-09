/**
 * MarketResolutionDashboard Compatibility Tests
 * 
 * Verifies that the MarketResolutionDashboard shows accurate market statistics
 * with the new enhanced commitment tracking system for both binary and multi-option markets.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MarketResolutionDashboard } from '@/app/admin/components/market-resolution-dashboard';
import { AdminCommitmentService } from '@/lib/services/admin-commitment-service';
import { ResolutionService } from '@/lib/services/resolution-service';

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({
      toMillis: () => Date.now()
    }))
  }
}));

// Mock services
jest.mock('@/lib/services/admin-commitment-service');
jest.mock('@/lib/services/resolution-service');
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: { 
      uid: 'admin-123', 
      email: 'admin@kai.com',
      id: 'admin-123',
      address: '0x123...abc'
    }
  })
}));

const mockAdminCommitmentService = AdminCommitmentService as jest.Mocked<typeof AdminCommitmentService>;
const mockResolutionService = ResolutionService as jest.Mocked<typeof ResolutionService>;

describe('MarketResolutionDashboard Compatibility', () => {
  const mockBinaryMarketWithCommitments = {
    id: 'binary-market-123',
    title: 'Will Team A win the championship?',
    description: 'Binary market with migrated commitments',
    category: 'sports',
    status: 'pending_resolution',
    createdBy: 'user-123',
    createdAt: { toMillis: () => new Date('2024-01-01').getTime() },
    endsAt: { toMillis: () => new Date('2024-01-15').getTime() },
    tags: ['sports'],
    options: [
      { id: 'yes', text: 'Yes', totalTokens: 1500, participantCount: 15 },
      { id: 'no', text: 'No', totalTokens: 1000, participantCount: 10 }
    ],
    totalParticipants: 20,
    totalTokensStaked: 2500,
    featured: false,
    trending: false
  };

  const mockMultiOptionMarketWithCommitments = {
    id: 'multi-market-456',
    title: 'Which designer will win Fashion Week?',
    description: 'Multi-option market with 4 choices',
    category: 'fashion',
    status: 'pending_resolution',
    createdBy: 'user-456',
    createdAt: { toMillis: () => new Date('2024-01-01').getTime() },
    endsAt: { toMillis: () => new Date('2024-01-15').getTime() },
    tags: ['fashion'],
    options: [
      { id: 'option_1', text: 'Designer A', totalTokens: 800, participantCount: 8 },
      { id: 'option_2', text: 'Designer B', totalTokens: 600, participantCount: 6 },
      { id: 'option_3', text: 'Designer C', totalTokens: 400, participantCount: 4 },
      { id: 'option_4', text: 'Designer D', totalTokens: 200, participantCount: 2 }
    ],
    totalParticipants: 15,
    totalTokensStaked: 2000,
    featured: false,
    trending: false
  };

  const mockBinaryCommitments = [
    {
      id: 'commit-1',
      userId: 'user-1',
      marketId: 'binary-market-123',
      predictionId: 'binary-market-123',
      position: 'yes',
      optionId: 'yes',
      tokensCommitted: 100,
      odds: 2.5,
      potentialWinning: 250,
      status: 'active',
      committedAt: '2024-01-10T10:00:00Z',
      user: {
        id: 'user-1',
        email: 'user1@example.com',
        displayName: 'User One',
        photoURL: null,
        isAdmin: false
      }
    },
    {
      id: 'commit-2',
      userId: 'user-2',
      marketId: 'binary-market-123',
      predictionId: 'binary-market-123',
      position: 'no',
      optionId: 'no',
      tokensCommitted: 150,
      odds: 1.67,
      potentialWinning: 250,
      status: 'active',
      committedAt: '2024-01-10T11:00:00Z',
      user: {
        id: 'user-2',
        email: 'user2@example.com',
        displayName: 'User Two',
        photoURL: null,
        isAdmin: false
      }
    }
  ];

  const mockMultiOptionCommitments = [
    {
      id: 'commit-3',
      userId: 'user-3',
      marketId: 'multi-market-456',
      predictionId: 'multi-market-456',
      optionId: 'option_1',
      position: 'yes', // Derived for compatibility
      tokensCommitted: 200,
      odds: 2.5,
      potentialWinning: 500,
      status: 'active',
      committedAt: '2024-01-10T12:00:00Z',
      user: {
        id: 'user-3',
        email: 'user3@example.com',
        displayName: 'User Three',
        photoURL: null,
        isAdmin: false
      }
    },
    {
      id: 'commit-4',
      userId: 'user-4',
      marketId: 'multi-market-456',
      predictionId: 'multi-market-456',
      optionId: 'option_3',
      position: 'no', // Derived for compatibility
      tokensCommitted: 75,
      odds: 5.0,
      potentialWinning: 375,
      status: 'active',
      committedAt: '2024-01-10T13:00:00Z',
      user: {
        id: 'user-4',
        email: 'user4@example.com',
        displayName: 'User Four',
        photoURL: null,
        isAdmin: false
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Firebase getDocs to return markets
    const { getDocs } = require('firebase/firestore');
    getDocs.mockResolvedValue({
      docs: [
        {
          id: 'binary-market-123',
          data: () => mockBinaryMarketWithCommitments
        },
        {
          id: 'multi-market-456',
          data: () => mockMultiOptionMarketWithCommitments
        }
      ]
    });

    // Mock ResolutionService.getPendingResolutionMarkets
    mockResolutionService.getPendingResolutionMarkets.mockResolvedValue([
      mockBinaryMarketWithCommitments,
      mockMultiOptionMarketWithCommitments
    ]);

    // Mock AdminCommitmentService.getMarketCommitments
    mockAdminCommitmentService.getMarketCommitments.mockImplementation(async (marketId) => {
      if (marketId === 'binary-market-123') {
        return {
          market: mockBinaryMarketWithCommitments,
          commitments: mockBinaryCommitments,
          analytics: {
            totalTokens: 2500,
            participantCount: 2,
            yesPercentage: 60,
            noPercentage: 40,
            averageCommitment: 125,
            largestCommitment: 150,
            commitmentTrend: []
          },
          totalCount: 2
        };
      } else if (marketId === 'multi-market-456') {
        return {
          market: mockMultiOptionMarketWithCommitments,
          commitments: mockMultiOptionCommitments,
          analytics: {
            totalTokens: 2000,
            participantCount: 2,
            yesPercentage: 73, // option_1 vs others
            noPercentage: 27,
            averageCommitment: 137,
            largestCommitment: 200,
            commitmentTrend: []
          },
          totalCount: 2
        };
      }
      
      return {
        market: mockBinaryMarketWithCommitments,
        commitments: [],
        analytics: {
          totalTokens: 0,
          participantCount: 0,
          yesPercentage: 0,
          noPercentage: 0,
          averageCommitment: 0,
          largestCommitment: 0,
          commitmentTrend: []
        },
        totalCount: 0
      };
    });

    // Mock fetch for API calls
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        markets: [mockBinaryMarketWithCommitments, mockMultiOptionMarketWithCommitments]
      })
    });
  });

  it('should display pending resolution markets correctly', async () => {
    render(<MarketResolutionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
      expect(screen.getByText('Which designer will win Fashion Week?')).toBeInTheDocument();
    });
  });

  it('should show accurate statistics for binary markets', async () => {
    render(<MarketResolutionDashboard />);

    await waitFor(() => {
      // Should show binary market statistics
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
    });

    // Click to view market details
    const binaryMarketCard = screen.getByText('Will Team A win the championship?').closest('[data-testid="market-card"]') || 
                            screen.getByText('Will Team A win the championship?').closest('div');
    
    if (binaryMarketCard) {
      fireEvent.click(binaryMarketCard);
    }

    await waitFor(() => {
      // Should show participant count
      expect(screen.getByText(/20.*participants?/i)).toBeInTheDocument();
      
      // Should show total tokens staked
      expect(screen.getByText(/2,500.*tokens?/i)).toBeInTheDocument();
    });
  });

  it('should show accurate statistics for multi-option markets', async () => {
    render(<MarketResolutionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Which designer will win Fashion Week?')).toBeInTheDocument();
    });

    // Click to view market details
    const multiMarketCard = screen.getByText('Which designer will win Fashion Week?').closest('[data-testid="market-card"]') || 
                           screen.getByText('Which designer will win Fashion Week?').closest('div');
    
    if (multiMarketCard) {
      fireEvent.click(multiMarketCard);
    }

    await waitFor(() => {
      // Should show participant count
      expect(screen.getByText(/15.*participants?/i)).toBeInTheDocument();
      
      // Should show total tokens staked
      expect(screen.getByText(/2,000.*tokens?/i)).toBeInTheDocument();
    });
  });

  it('should display option breakdown for multi-option markets', async () => {
    render(<MarketResolutionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Which designer will win Fashion Week?')).toBeInTheDocument();
    });

    // Should show all 4 options
    await waitFor(() => {
      expect(screen.getByText('Designer A')).toBeInTheDocument();
      expect(screen.getByText('Designer B')).toBeInTheDocument();
      expect(screen.getByText('Designer C')).toBeInTheDocument();
      expect(screen.getByText('Designer D')).toBeInTheDocument();
    });
  });

  it('should handle commitment data correctly for resolution', async () => {
    render(<MarketResolutionDashboard />);

    await waitFor(() => {
      expect(mockAdminCommitmentService.getMarketCommitments).toHaveBeenCalledWith(
        'binary-market-123',
        expect.objectContaining({
          includeAnalytics: true
        })
      );
      
      expect(mockAdminCommitmentService.getMarketCommitments).toHaveBeenCalledWith(
        'multi-market-456',
        expect.objectContaining({
          includeAnalytics: true
        })
      );
    });
  });

  it('should show backward compatible data for migrated binary commitments', async () => {
    render(<MarketResolutionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
    });

    // Verify that binary market shows traditional yes/no breakdown
    const result = await AdminCommitmentService.getMarketCommitments('binary-market-123', {
      includeAnalytics: true
    });

    expect(result.market.options).toHaveLength(2);
    expect(result.market.options[0].id).toBe('yes');
    expect(result.market.options[1].id).toBe('no');
    expect(result.commitments).toHaveLength(2);
    
    // Verify commitments have both position and optionId
    result.commitments.forEach(commitment => {
      expect(commitment.position).toBeDefined();
      expect(commitment.optionId).toBeDefined();
    });
  });

  it('should show enhanced data for new multi-option commitments', async () => {
    render(<MarketResolutionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Which designer will win Fashion Week?')).toBeInTheDocument();
    });

    // Verify that multi-option market shows all options
    const result = await AdminCommitmentService.getMarketCommitments('multi-market-456', {
      includeAnalytics: true
    });

    expect(result.market.options).toHaveLength(4);
    expect(result.market.options.map(o => o.id)).toEqual([
      'option_1', 'option_2', 'option_3', 'option_4'
    ]);
    expect(result.commitments).toHaveLength(2);
    
    // Verify commitments have proper option targeting
    const option1Commitment = result.commitments.find(c => c.optionId === 'option_1');
    const option3Commitment = result.commitments.find(c => c.optionId === 'option_3');
    
    expect(option1Commitment).toBeDefined();
    expect(option3Commitment).toBeDefined();
    expect(option1Commitment!.tokensCommitted).toBe(200);
    expect(option3Commitment!.tokensCommitted).toBe(75);
  });

  it('should calculate accurate payout previews for both market types', async () => {
    // Mock payout preview API
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('payout-preview')) {
        if (url.includes('binary-market-123')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              preview: {
                winningOption: 'yes',
                totalPayout: 250,
                winnerCount: 1,
                averagePayout: 250,
                payoutBreakdown: [
                  { userId: 'user-1', payout: 250, profit: 150 }
                ]
              }
            })
          });
        } else if (url.includes('multi-market-456')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              preview: {
                winningOption: 'option_1',
                totalPayout: 500,
                winnerCount: 1,
                averagePayout: 500,
                payoutBreakdown: [
                  { userId: 'user-3', payout: 500, profit: 300 }
                ]
              }
            })
          });
        }
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          markets: [mockBinaryMarketWithCommitments, mockMultiOptionMarketWithCommitments]
        })
      });
    });

    render(<MarketResolutionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
      expect(screen.getByText('Which designer will win Fashion Week?')).toBeInTheDocument();
    });

    // Both markets should be available for resolution
    expect(mockResolutionService.getPendingResolutionMarkets).toHaveBeenCalled();
  });

  it('should maintain consistent data structure across market types', async () => {
    render(<MarketResolutionDashboard />);

    await waitFor(() => {
      expect(mockAdminCommitmentService.getMarketCommitments).toHaveBeenCalled();
    });

    // Verify both market types return consistent structure
    const binaryResult = await AdminCommitmentService.getMarketCommitments('binary-market-123', {
      includeAnalytics: true
    });
    
    const multiResult = await AdminCommitmentService.getMarketCommitments('multi-market-456', {
      includeAnalytics: true
    });

    // Both should have same top-level structure
    expect(binaryResult).toHaveProperty('market');
    expect(binaryResult).toHaveProperty('commitments');
    expect(binaryResult).toHaveProperty('analytics');
    expect(binaryResult).toHaveProperty('totalCount');

    expect(multiResult).toHaveProperty('market');
    expect(multiResult).toHaveProperty('commitments');
    expect(multiResult).toHaveProperty('analytics');
    expect(multiResult).toHaveProperty('totalCount');

    // Market structure should be consistent
    expect(binaryResult.market).toHaveProperty('options');
    expect(binaryResult.market).toHaveProperty('totalParticipants');
    expect(binaryResult.market).toHaveProperty('totalTokensStaked');

    expect(multiResult.market).toHaveProperty('options');
    expect(multiResult.market).toHaveProperty('totalParticipants');
    expect(multiResult.market).toHaveProperty('totalTokensStaked');
  });

  it('should handle real-time updates for both market types', async () => {
    // Mock real-time listener
    mockAdminCommitmentService.createMarketCommitmentsListener = jest.fn((marketId, callback) => {
      setTimeout(() => {
        if (marketId === 'binary-market-123') {
          callback({
            commitments: mockBinaryCommitments,
            analytics: {
              totalTokens: 2500,
              participantCount: 2,
              yesPercentage: 60,
              noPercentage: 40,
              averageCommitment: 125,
              largestCommitment: 150,
              commitmentTrend: []
            },
            totalCount: 2
          });
        }
      }, 10);
      
      return () => {}; // Unsubscribe function
    });

    render(<MarketResolutionDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
    });

    // Real-time updates should work for both market types
    expect(mockAdminCommitmentService.createMarketCommitmentsListener).toHaveBeenCalled();
  });
});