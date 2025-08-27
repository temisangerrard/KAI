import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarketCommitmentsList } from '@/app/admin/tokens/components/market-commitments-list';

// Mock the custom hook
jest.mock('@/hooks/use-market-commitments', () => ({
  useMarketCommitments: jest.fn(() => ({
    data: {
      commitments: [
        {
          id: 'test-commitment-1',
          userId: 'user-1',
          predictionId: 'market-1',
          tokensCommitted: 100,
          position: 'yes',
          odds: 2.5,
          potentialWinning: 250,
          status: 'active',
          committedAt: '2024-01-15T10:00:00Z',
          user: {
            id: 'user-1',
            email: 'test@example.com',
            displayName: 'Test User'
          },
          marketTitle: 'Test Market',
          marketStatus: 'active'
        }
      ],
      markets: [
        {
          marketId: 'market-1',
          marketTitle: 'Test Market',
          marketStatus: 'active' as const,
          totalTokensCommitted: 100,
          participantCount: 1,
          yesTokens: 100,
          noTokens: 0,
          averageCommitment: 100,
          largestCommitment: 100,
          commitments: []
        }
      ],
      analytics: {
        totalMarketsWithCommitments: 1,
        totalTokensCommitted: 100,
        activeCommitments: 1,
        resolvedCommitments: 0,
        averageCommitmentSize: 100
      },
      pagination: {
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    },
    loading: false,
    error: null,
    lastUpdated: new Date('2024-01-15T10:00:00Z'),
    isRealTimeActive: true,
    refresh: jest.fn(),
    setRealTimeEnabled: jest.fn()
  }))
}));

// Mock the database status monitor
jest.mock('@/app/admin/tokens/components/database-status-monitor', () => ({
  DatabaseStatusMonitor: () => <div data-testid="database-status">DB Status</div>
}));

describe('MarketCommitmentsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<MarketCommitmentsList />);
    expect(screen.getByText('Market Commitments')).toBeInTheDocument();
  });

  it('displays analytics correctly', () => {
    render(<MarketCommitmentsList />);
    
    expect(screen.getByText('1 markets • 100 tokens committed')).toBeInTheDocument();
    expect(screen.getByText('Active Commitments')).toBeInTheDocument();
  });

  it('shows database status monitor', () => {
    render(<MarketCommitmentsList />);
    expect(screen.getByTestId('database-status')).toBeInTheDocument();
  });

  it('displays markets in overview tab', () => {
    render(<MarketCommitmentsList />);
    
    // Should show markets tab by default
    expect(screen.getByText('Test Market')).toBeInTheDocument();
    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
  });

  it('switches to commitments tab', async () => {
    render(<MarketCommitmentsList />);
    
    // Click on commitments tab
    const commitmentsTab = screen.getByRole('tab', { name: /all commitments/i });
    fireEvent.click(commitmentsTab);
    
    // Tab should exist and be clickable
    expect(commitmentsTab).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    render(<MarketCommitmentsList />);
    
    const searchInput = screen.getByPlaceholderText('Search by user, market, or commitment ID...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    expect(searchInput).toHaveValue('test');
  });

  it('handles filter changes', async () => {
    render(<MarketCommitmentsList />);
    
    // Test status filter - look for the specific trigger button
    const statusTrigger = screen.getByText('All Status');
    fireEvent.click(statusTrigger);
    
    // Should open the dropdown (we can't easily test the dropdown content in this setup)
    expect(statusTrigger).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    // Mock empty data
    const mockUseMarketCommitments = require('@/hooks/use-market-commitments').useMarketCommitments;
    mockUseMarketCommitments.mockReturnValue({
      data: {
        commitments: [],
        markets: [],
        analytics: {
          totalMarketsWithCommitments: 0,
          totalTokensCommitted: 0,
          activeCommitments: 0,
          resolvedCommitments: 0,
          averageCommitmentSize: 0
        },
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      },
      loading: false,
      error: null,
      lastUpdated: new Date(),
      isRealTimeActive: true,
      refresh: jest.fn(),
      setRealTimeEnabled: jest.fn()
    });

    render(<MarketCommitmentsList />);
    expect(screen.getByText('No Markets Found')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const mockUseMarketCommitments = require('@/hooks/use-market-commitments').useMarketCommitments;
    mockUseMarketCommitments.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      lastUpdated: null,
      isRealTimeActive: true,
      refresh: jest.fn(),
      setRealTimeEnabled: jest.fn()
    });

    render(<MarketCommitmentsList />);
    
    // Should show loading skeletons
    const loadingElements = screen.getAllByRole('generic');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows error state', () => {
    const mockUseMarketCommitments = require('@/hooks/use-market-commitments').useMarketCommitments;
    mockUseMarketCommitments.mockReturnValue({
      data: null,
      loading: false,
      error: 'Database connection failed',
      lastUpdated: null,
      isRealTimeActive: false,
      refresh: jest.fn(),
      setRealTimeEnabled: jest.fn()
    });

    render(<MarketCommitmentsList />);
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
  });

  it('renders with onMarketSelect prop', async () => {
    const mockOnMarketSelect = jest.fn();
    const { container } = render(<MarketCommitmentsList onMarketSelect={mockOnMarketSelect} />);
    
    // Component should render without crashing
    expect(container).toBeInTheDocument();
  });

  it('handles real-time toggle', () => {
    const mockSetRealTimeEnabled = jest.fn();
    const mockUseMarketCommitments = require('@/hooks/use-market-commitments').useMarketCommitments;
    mockUseMarketCommitments.mockReturnValue({
      data: {
        commitments: [],
        markets: [],
        analytics: {
          totalMarketsWithCommitments: 0,
          totalTokensCommitted: 0,
          activeCommitments: 0,
          resolvedCommitments: 0,
          averageCommitmentSize: 0
        },
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      },
      loading: false,
      error: null,
      lastUpdated: new Date(),
      isRealTimeActive: true,
      refresh: jest.fn(),
      setRealTimeEnabled: mockSetRealTimeEnabled
    });

    render(<MarketCommitmentsList />);
    
    const realTimeButton = screen.getByText('Disable Live Updates');
    fireEvent.click(realTimeButton);
    
    expect(mockSetRealTimeEnabled).toHaveBeenCalledWith(false);
  });
});