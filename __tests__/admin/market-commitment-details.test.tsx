import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MarketCommitmentDetails } from '@/app/admin/markets/[id]/components/market-commitment-details';

// Mock the fetch function
global.fetch = jest.fn();

// Mock the hooks
jest.mock('@/hooks/use-market-commitments-realtime', () => ({
  useMarketCommitmentsRealtime: jest.fn(),
  useMarketAnalyticsRealtime: jest.fn()
}));

const mockCommitmentDetails = {
  id: 'commitment-1',
  userId: 'user-1',
  predictionId: 'market-1',
  tokensCommitted: 100,
  position: 'yes',
  odds: 1.5,
  potentialWinning: 150,
  status: 'active',
  committedAt: { toDate: () => new Date('2024-01-01') },
  metadata: {
    marketStatus: 'active',
    marketTitle: 'Test Market',
    oddsSnapshot: {
      yesOdds: 1.5,
      noOdds: 2.0,
      totalYesTokens: 500,
      totalNoTokens: 300,
      totalParticipants: 10
    },
    userBalanceAtCommitment: 1000,
    commitmentSource: 'web'
  },
  user: {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    isAdmin: false
  },
  userStats: {
    totalCommitments: 5,
    totalTokensCommitted: 500,
    winRate: 60,
    averageCommitment: 100,
    lastActivity: '2024-01-01T00:00:00Z'
  },
  marketContext: {
    totalParticipants: 10,
    userRank: 3,
    percentileRank: 70,
    marketProgress: 50
  },
  timeline: [
    {
      id: 'event-1',
      type: 'committed',
      timestamp: '2024-01-01T00:00:00Z',
      description: 'Committed 100 tokens on YES position',
      metadata: {
        tokens: 100,
        position: 'yes',
        odds: 1.5,
        potentialWinning: 150
      }
    }
  ]
};

const mockCommitmentsList = [
  {
    id: 'commitment-1',
    userId: 'user-1',
    tokensCommitted: 100,
    position: 'yes',
    user: {
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null
    }
  }
];

describe('MarketCommitmentDetails', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('renders commitment selection interface', async () => {
    // Mock the commitments list API call
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        commitments: mockCommitmentsList
      })
    });

    render(
      <MarketCommitmentDetails
        marketId="market-1"
        realTimeEnabled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Commitment Details')).toBeInTheDocument();
      expect(screen.getByText('Select a commitment to view detailed information and timeline')).toBeInTheDocument();
    });
  });

  it('displays commitment list when available', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        commitments: mockCommitmentsList
      })
    });

    render(
      <MarketCommitmentDetails
        marketId="market-1"
        realTimeEnabled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('YES')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  it('loads commitment details when commitment is selected', async () => {
    // Mock commitments list
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          commitments: mockCommitmentsList
        })
      })
      // Mock commitment details
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommitmentDetails
      });

    render(
      <MarketCommitmentDetails
        marketId="market-1"
        commitmentId="commitment-1"
        realTimeEnabled={false}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/markets/market-1/commitments/commitment-1',
        expect.objectContaining({
          headers: {
            'Cache-Control': 'default'
          }
        })
      );
    });
  });

  it('displays user information card when commitment details are loaded', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          commitments: mockCommitmentsList
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommitmentDetails
      });

    render(
      <MarketCommitmentDetails
        marketId="market-1"
        commitmentId="commitment-1"
        realTimeEnabled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('User Information')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Total commitments
      expect(screen.getByText('60.0%')).toBeInTheDocument(); // Win rate
    });
  });

  it('displays commitment overview with market snapshot', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          commitments: mockCommitmentsList
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommitmentDetails
      });

    render(
      <MarketCommitmentDetails
        marketId="market-1"
        commitmentId="commitment-1"
        realTimeEnabled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Commitment Overview')).toBeInTheDocument();
      expect(screen.getByText('Market Snapshot at Commitment')).toBeInTheDocument();
      expect(screen.getByText('1.50')).toBeInTheDocument(); // Odds
      expect(screen.getByText('150')).toBeInTheDocument(); // Potential winning
    });
  });

  it('displays market context information', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          commitments: mockCommitmentsList
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommitmentDetails
      });

    render(
      <MarketCommitmentDetails
        marketId="market-1"
        commitmentId="commitment-1"
        realTimeEnabled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Market Context')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument(); // User rank
      expect(screen.getByText('70%')).toBeInTheDocument(); // Percentile rank
    });
  });

  it('displays commitment timeline', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          commitments: mockCommitmentsList
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommitmentDetails
      });

    render(
      <MarketCommitmentDetails
        marketId="market-1"
        commitmentId="commitment-1"
        realTimeEnabled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Commitment Timeline')).toBeInTheDocument();
      expect(screen.getByText('Committed 100 tokens on YES position')).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', async () => {
    (fetch as jest.Mock)
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          commitments: mockCommitmentsList
        })
      });

    render(
      <MarketCommitmentDetails
        marketId="market-1"
        realTimeEnabled={false}
      />
    );

    const refreshButton = await screen.findByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  it('handles real-time updates when enabled', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        commitments: mockCommitmentsList
      })
    });

    render(
      <MarketCommitmentDetails
        marketId="market-1"
        realTimeEnabled={true}
        refreshInterval={1000}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/markets/market-1/commitments?pageSize=100&sortBy=committedAt&sortOrder=desc'
      );
    });
  });

  it('displays error state when API fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(
      <MarketCommitmentDetails
        marketId="market-1"
        realTimeEnabled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch commitment details/)).toBeInTheDocument();
    });
  });

  it('displays empty state when no commitments exist', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        commitments: []
      })
    });

    render(
      <MarketCommitmentDetails
        marketId="market-1"
        realTimeEnabled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No commitments found for this market')).toBeInTheDocument();
    });
  });
});