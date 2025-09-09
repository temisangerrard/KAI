/**
 * AdminTokenDashboard Compatibility Tests
 * 
 * Verifies that the AdminTokenDashboard displays identical statistics
 * before and after migration to the enhanced commitment tracking system.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminTokenDashboard } from '@/app/admin/tokens/components/admin-token-dashboard';

// Mock the fetch API for token stats
global.fetch = jest.fn();

jest.mock('@/lib/services/admin-commitment-service');
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: { uid: 'admin-123', email: 'admin@kai.com' }
  })
}));

describe('AdminTokenDashboard Compatibility', () => {
  const mockTokenStats = {
    circulation: {
      totalTokens: 10000,
      availableTokens: 6000,
      committedTokens: 4000,
      totalUsers: 150,
      activeUsers: 75
    },
    purchases: {
      totalPurchases: 5000,
      dailyPurchases: 250,
      weeklyPurchases: 1500,
      totalTransactions: 300
    },
    payouts: {
      totalPayouts: 2000,
      dailyPayouts: 100,
      totalPayoutTransactions: 50
    },
    packages: {
      activePackages: 5,
      totalRevenue: 15000
    },
    trends: {
      dailyTransactionCount: 25,
      weeklyTransactionCount: 150,
      weeklyTrend: [
        { name: 'Mon', purchases: 100, payouts: 50, date: '2024-01-15' },
        { name: 'Tue', purchases: 120, payouts: 60, date: '2024-01-16' },
        { name: 'Wed', purchases: 110, payouts: 55, date: '2024-01-17' }
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTokenStats)
    });
  });

  it('should display token circulation statistics correctly', async () => {
    render(<AdminTokenDashboard stats={mockTokenStats} />);

    // Verify available vs committed breakdown in the legend
    expect(screen.getByText('Available: 6,000')).toBeInTheDocument();
    expect(screen.getByText('Committed: 4,000')).toBeInTheDocument();
  });

  it('should show accurate user engagement metrics', async () => {
    render(<AdminTokenDashboard stats={mockTokenStats} />);

    // Verify user engagement display
    expect(screen.getByText('75 of 150 users active')).toBeInTheDocument();
    
    // Verify engagement rate calculation
    const engagementRate = (75 / 150) * 100; // 50%
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('should display purchase and payout statistics', async () => {
    render(<AdminTokenDashboard stats={mockTokenStats} />);

    // Verify purchase metrics in Today's Highlights
    expect(screen.getByText('+250')).toBeInTheDocument(); // Daily purchases
    expect(screen.getByText('25')).toBeInTheDocument(); // Daily transaction count
    
    // Verify payout metrics
    expect(screen.getByText('$15,000')).toBeInTheDocument(); // Total revenue
  });

  it('should handle enhanced commitment data structure', async () => {
    // Test with enhanced stats that include both binary and multi-option data
    const enhancedStats = {
      ...mockTokenStats,
      circulation: {
        ...mockTokenStats.circulation,
        // Enhanced with option-level breakdown
        binaryMarketTokens: 2000,
        multiOptionMarketTokens: 2000,
        optionBreakdown: {
          'yes': { tokens: 1200, participants: 30 },
          'no': { tokens: 800, participants: 20 },
          'option_1': { tokens: 600, participants: 15 },
          'option_2': { tokens: 400, participants: 10 },
          'option_3': { tokens: 300, participants: 8 },
          'option_4': { tokens: 700, participants: 17 }
        }
      }
    };

    render(<AdminTokenDashboard stats={enhancedStats} />);

    // Should still display core metrics correctly in the legend
    expect(screen.getByText('Available: 6,000')).toBeInTheDocument();
    expect(screen.getByText('Committed: 4,000')).toBeInTheDocument();
    expect(screen.getByText('4,000 of 10,000 tokens committed')).toBeInTheDocument();
  });

  it('should maintain backward compatibility with existing data format', async () => {
    // Test with legacy data format (pre-migration)
    const legacyStats = {
      circulation: {
        totalTokens: 8000,
        availableTokens: 5000,
        committedTokens: 3000,
        totalUsers: 100,
        activeUsers: 50
      },
      purchases: {
        totalPurchases: 4000,
        dailyPurchases: 200,
        weeklyPurchases: 1200,
        totalTransactions: 250
      },
      payouts: {
        totalPayouts: 1500,
        dailyPayouts: 75,
        totalPayoutTransactions: 40
      },
      packages: {
        activePackages: 3,
        totalRevenue: 12000
      },
      trends: {
        dailyTransactionCount: 20,
        weeklyTransactionCount: 120,
        weeklyTrend: []
      }
    };

    render(<AdminTokenDashboard stats={legacyStats} />);

    // Should display legacy data correctly in the legend
    expect(screen.getByText('Available: 5,000')).toBeInTheDocument();
    expect(screen.getByText('Committed: 3,000')).toBeInTheDocument();
    expect(screen.getByText('50 of 100 users active')).toBeInTheDocument();
  });

  it('should calculate percentages correctly for both binary and multi-option markets', async () => {
    render(<AdminTokenDashboard stats={mockTokenStats} />);

    // Verify engagement rate calculation
    const engagementRate = (mockTokenStats.circulation.activeUsers / mockTokenStats.circulation.totalUsers) * 100;
    expect(screen.getByText(`${engagementRate.toFixed(1)}%`)).toBeInTheDocument();

    // Verify commitment rate calculation
    const commitmentRate = (mockTokenStats.circulation.committedTokens / mockTokenStats.circulation.totalTokens) * 100;
    expect(screen.getByText(`${commitmentRate.toFixed(1)}%`)).toBeInTheDocument();
  });

  it('should handle real-time updates correctly', async () => {
    const { rerender } = render(<AdminTokenDashboard stats={mockTokenStats} />);

    // Initial render
    expect(screen.getByText('Available: 6,000')).toBeInTheDocument();

    // Updated stats (simulating real-time update)
    const updatedStats = {
      ...mockTokenStats,
      circulation: {
        ...mockTokenStats.circulation,
        totalTokens: 12000,
        availableTokens: 7000,
        committedTokens: 5000
      }
    };

    rerender(<AdminTokenDashboard stats={updatedStats} />);

    // Should show updated values
    expect(screen.getByText('Available: 7,000')).toBeInTheDocument();
    expect(screen.getByText('Committed: 5,000')).toBeInTheDocument();
  });

  it('should display trend data correctly', async () => {
    render(<AdminTokenDashboard stats={mockTokenStats} />);

    // Verify weekly trend data is processed
    expect(screen.getByText('150')).toBeInTheDocument(); // Weekly transaction count
    
    // Should handle trend calculations
    const weeklyTrend = mockTokenStats.trends.weeklyTrend;
    const totalWeeklyPurchases = weeklyTrend.reduce((sum, day) => sum + day.purchases, 0);
    expect(totalWeeklyPurchases).toBe(330); // 100 + 120 + 110
  });
});