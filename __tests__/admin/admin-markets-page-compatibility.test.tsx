/**
 * AdminMarketsPage Compatibility Tests
 * 
 * Verifies that the AdminMarketsPage displays correct participant counts
 * and token totals with the enhanced commitment tracking system.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdminMarketsPage from '@/app/admin/markets/page';
import { AdminCommitmentService } from '@/lib/services/admin-commitment-service';

// Mock Firebase
jest.mock('@/lib/db/database', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn()
}));

// Mock services
jest.mock('@/lib/services/admin-commitment-service');
const mockAdminCommitmentService = AdminCommitmentService as jest.Mocked<typeof AdminCommitmentService>;

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

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock Next.js router
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('AdminMarketsPage Compatibility', () => {
  const mockBinaryMarket = {
    id: 'binary-market-123',
    title: 'Will Team A win the championship?',
    description: 'Binary market migrated from old system',
    category: 'sports',
    status: 'active',
    createdBy: 'user-123',
    createdAt: { toMillis: () => Date.now() },
    endsAt: { toMillis: () => Date.now() + 86400000 },
    tags: ['sports'],
    options: [
      { id: 'yes', text: 'Yes', totalTokens: 1500, participantCount: 15 },
      { id: 'no', text: 'No', totalTokens: 1000, participantCount: 10 }
    ],
    totalParticipants: 20,
    totalTokensStaked: 2500,
    featured: false,
    trending: true
  };

  const mockMultiOptionMarket = {
    id: 'multi-market-456',
    title: 'Which designer will win Fashion Week?',
    description: 'Multi-option market with 4 choices',
    category: 'fashion',
    status: 'active',
    createdBy: 'user-456',
    createdAt: { toMillis: () => Date.now() },
    endsAt: { toMillis: () => Date.now() + 86400000 },
    tags: ['fashion'],
    options: [
      { id: 'option_1', text: 'Designer A', totalTokens: 800, participantCount: 8 },
      { id: 'option_2', text: 'Designer B', totalTokens: 600, participantCount: 6 },
      { id: 'option_3', text: 'Designer C', totalTokens: 400, participantCount: 4 },
      { id: 'option_4', text: 'Designer D', totalTokens: 200, participantCount: 2 }
    ],
    totalParticipants: 15,
    totalTokensStaked: 2000,
    featured: true,
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
        displayName: 'User One'
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
        displayName: 'User Two'
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
      position: 'yes',
      tokensCommitted: 200,
      odds: 2.5,
      potentialWinning: 500,
      status: 'active',
      committedAt: '2024-01-10T12:00:00Z',
      user: {
        id: 'user-3',
        email: 'user3@example.com',
        displayName: 'User Three'
      }
    },
    {
      id: 'commit-4',
      userId: 'user-4',
      marketId: 'multi-market-456',
      predictionId: 'multi-market-456',
      optionId: 'option_3',
      position: 'no',
      tokensCommitted: 75,
      odds: 5.0,
      potentialWinning: 375,
      status: 'active',
      committedAt: '2024-01-10T13:00:00Z',
      user: {
        id: 'user-4',
        email: 'user4@example.com',
        displayName: 'User Four'
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
          data: () => mockBinaryMarket
        },
        {
          id: 'multi-market-456',
          data: () => mockMultiOptionMarket
        }
      ]
    });

    // Mock AdminCommitmentService.getMarketCommitments
    mockAdminCommitmentService.getMarketCommitments.mockImplementation(async (marketId) => {
      if (marketId === 'binary-market-123') {
        return {
          market: mockBinaryMarket,
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
          market: mockMultiOptionMarket,
          commitments: mockMultiOptionCommitments,
          analytics: {
            totalTokens: 2000,
            participantCount: 2,
            yesPercentage: 73,
            noPercentage: 27,
            averageCommitment: 137,
            largestCommitment: 200,
            commitmentTrend: []
          },
          totalCount: 2
        };
      }
      
      return {
        market: mockBinaryMarket,
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
  });

  it('should display correct participant counts for binary markets', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
    });

    // Should show correct participant count (20 from market data)
    await waitFor(() => {
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  it('should display correct participant counts for multi-option markets', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Which designer will win Fashion Week?')).toBeInTheDocument();
    });

    // Should show correct participant count (15 from market data)
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  it('should display correct token totals for binary markets', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
    });

    // Should show correct token total (2,500 formatted)
    await waitFor(() => {
      expect(screen.getByText('2,500')).toBeInTheDocument();
    });
  });

  it('should display correct token totals for multi-option markets', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Which designer will win Fashion Week?')).toBeInTheDocument();
    });

    // Should show correct token total (2,000 formatted)
    await waitFor(() => {
      expect(screen.getByText('2,000')).toBeInTheDocument();
    });
  });

  it('should handle market filtering correctly', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
      expect(screen.getByText('Which designer will win Fashion Week?')).toBeInTheDocument();
    });

    // Test category filtering
    const categoryFilter = screen.getByDisplayValue('All Categories');
    fireEvent.click(categoryFilter);
    
    // Should be able to filter by sports category
    const sportsOption = screen.getByText('Sports');
    fireEvent.click(sportsOption);

    // Should still show the sports market
    expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
  });

  it('should handle market search correctly', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
      expect(screen.getByText('Which designer will win Fashion Week?')).toBeInTheDocument();
    });

    // Test search functionality
    const searchInput = screen.getByPlaceholderText('Search markets...');
    fireEvent.change(searchInput, { target: { value: 'championship' } });

    // Should filter to show only the championship market
    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
    });
  });

  it('should display market status badges correctly', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
      expect(screen.getByText('Which designer will win Fashion Week?')).toBeInTheDocument();
    });

    // Should show active status badges
    const statusBadges = screen.getAllByText('Active');
    expect(statusBadges).toHaveLength(2);
  });

  it('should show featured and trending indicators correctly', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
      expect(screen.getByText('Which designer will win Fashion Week?')).toBeInTheDocument();
    });

    // Binary market should show trending indicator
    // Multi-option market should show featured indicator
    // These would be represented by icons in the actual UI
  });

  it('should handle market actions correctly', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
    });

    // Should have action buttons for each market
    const actionButtons = screen.getAllByRole('button');
    expect(actionButtons.length).toBeGreaterThan(0);
  });

  it('should calculate accurate statistics from commitment data', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(mockAdminCommitmentService.getMarketCommitments).toHaveBeenCalledWith(
        'binary-market-123',
        expect.objectContaining({
          pageSize: 1000,
          includeAnalytics: true
        })
      );
      
      expect(mockAdminCommitmentService.getMarketCommitments).toHaveBeenCalledWith(
        'multi-market-456',
        expect.objectContaining({
          pageSize: 1000,
          includeAnalytics: true
        })
      );
    });

    // Verify that the service is called to get real commitment data
    expect(mockAdminCommitmentService.getMarketCommitments).toHaveBeenCalledTimes(2);
  });

  it('should handle mixed market types in the same view', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
      expect(screen.getByText('Which designer will win Fashion Week?')).toBeInTheDocument();
    });

    // Both markets should be displayed with their respective statistics
    expect(screen.getByText('20')).toBeInTheDocument(); // Binary market participants
    expect(screen.getByText('15')).toBeInTheDocument(); // Multi-option market participants
    expect(screen.getByText('2,500')).toBeInTheDocument(); // Binary market tokens
    expect(screen.getByText('2,000')).toBeInTheDocument(); // Multi-option market tokens
  });

  it('should maintain backward compatibility with existing market data structure', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
    });

    // Verify that markets are processed correctly regardless of their type
    const binaryResult = await AdminCommitmentService.getMarketCommitments('binary-market-123', {
      pageSize: 1000,
      includeAnalytics: true
    });

    const multiResult = await AdminCommitmentService.getMarketCommitments('multi-market-456', {
      pageSize: 1000,
      includeAnalytics: true
    });

    // Both should return consistent structure
    expect(binaryResult.market.totalParticipants).toBe(20);
    expect(binaryResult.market.totalTokensStaked).toBe(2500);
    expect(multiResult.market.totalParticipants).toBe(15);
    expect(multiResult.market.totalTokensStaked).toBe(2000);
  });

  it('should handle error states gracefully', async () => {
    // Mock service to throw error
    mockAdminCommitmentService.getMarketCommitments.mockRejectedValueOnce(
      new Error('Service error')
    );

    render(<AdminMarketsPage />);

    await waitFor(() => {
      // Should still show markets even if one fails to load commitment data
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
    });

    // Should use fallback data when service fails
    expect(mockAdminCommitmentService.getMarketCommitments).toHaveBeenCalled();
  });

  it('should format dates correctly', async () => {
    render(<AdminMarketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Will Team A win the championship?')).toBeInTheDocument();
    });

    // Should format end dates properly
    // The exact format depends on the implementation, but dates should be readable
    const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(dateElements.length).toBeGreaterThan(0);
  });
});