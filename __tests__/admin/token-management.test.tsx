import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminTokenDashboard } from '@/app/admin/tokens/components/admin-token-dashboard';
import { TokenPackageManager } from '@/app/admin/tokens/components/token-package-manager';
import { TokenIssuanceModal } from '@/app/admin/tokens/components/token-issuance-modal';

// Mock fetch globally
global.fetch = jest.fn();

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const mockStats = {
  circulation: {
    totalTokens: 100000,
    availableTokens: 75000,
    committedTokens: 25000,
    totalUsers: 1000,
    activeUsers: 500
  },
  purchases: {
    totalPurchases: 50000,
    dailyPurchases: 1000,
    weeklyPurchases: 7000,
    totalTransactions: 500
  },
  payouts: {
    totalPayouts: 30000,
    dailyPayouts: 500,
    totalPayoutTransactions: 200
  },
  packages: {
    activePackages: 5,
    totalRevenue: 5000
  },
  trends: {
    dailyTransactionCount: 50,
    weeklyTransactionCount: 350
  }
};

describe('Admin Token Management', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('AdminTokenDashboard', () => {
    it('renders token statistics correctly', () => {
      render(<AdminTokenDashboard stats={mockStats} />);
      
      expect(screen.getByText('Token Distribution')).toBeInTheDocument();
      expect(screen.getByText('Weekly Trends')).toBeInTheDocument();
      expect(screen.getByText('User Engagement')).toBeInTheDocument();
      expect(screen.getByText('Token Utilization')).toBeInTheDocument();
      expect(screen.getByText('Financial Overview')).toBeInTheDocument();
    });

    it('displays correct token amounts', () => {
      render(<AdminTokenDashboard stats={mockStats} />);
      
      expect(screen.getByText('Available: 75,000')).toBeInTheDocument();
      expect(screen.getByText('Committed: 25,000')).toBeInTheDocument();
    });

    it('calculates user engagement rate correctly', () => {
      render(<AdminTokenDashboard stats={mockStats} />);
      
      // 500 active users / 1000 total users = 50%
      expect(screen.getByText('50.0%')).toBeInTheDocument();
    });

    it('renders charts components', () => {
      render(<AdminTokenDashboard stats={mockStats} />);
      
      expect(screen.getAllByTestId('responsive-container')).toHaveLength(2);
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('TokenPackageManager', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ packages: [] })
      });
    });

    it('renders package manager interface', async () => {
      render(<TokenPackageManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Token Packages')).toBeInTheDocument();
        expect(screen.getByText('Create Package')).toBeInTheDocument();
      });
    });

    it('fetches packages on mount', async () => {
      render(<TokenPackageManager />);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/tokens/packages');
      });
    });

    it('shows empty state when no packages exist', async () => {
      render(<TokenPackageManager />);
      
      await waitFor(() => {
        expect(screen.getByText('No token packages found')).toBeInTheDocument();
      });
    });
  });

  describe('TokenIssuanceModal', () => {
    const mockProps = {
      isOpen: true,
      onClose: jest.fn(),
      onSuccess: jest.fn()
    };

    it('renders issuance form when open', () => {
      render(<TokenIssuanceModal {...mockProps} />);
      
      expect(screen.getByText('Issue Tokens to User')).toBeInTheDocument();
      expect(screen.getByLabelText('User ID *')).toBeInTheDocument();
      expect(screen.getByLabelText('Token Amount *')).toBeInTheDocument();
      expect(screen.getByLabelText('Reason *')).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      render(<TokenIssuanceModal {...mockProps} />);
      
      const submitButton = screen.getByText('Issue Tokens');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please fill in all required fields')).toBeInTheDocument();
      });
    });

    it('validates positive amount', async () => {
      render(<TokenIssuanceModal {...mockProps} />);
      
      fireEvent.change(screen.getByLabelText('User ID *'), { target: { value: 'user123' } });
      fireEvent.change(screen.getByLabelText('Token Amount *'), { target: { value: '0' } });
      fireEvent.change(screen.getByLabelText('Reason *'), { target: { value: 'Test reason' } });
      
      const submitButton = screen.getByText('Issue Tokens');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
      });
    });

    it('shows preset reasons', () => {
      render(<TokenIssuanceModal {...mockProps} />);
      
      expect(screen.getByText('Welcome bonus for new user')).toBeInTheDocument();
      expect(screen.getByText('Compensation for technical issue')).toBeInTheDocument();
      expect(screen.getByText('Promotional campaign reward')).toBeInTheDocument();
    });

    it('fills reason when preset is clicked', () => {
      render(<TokenIssuanceModal {...mockProps} />);
      
      const presetButton = screen.getByText('Welcome bonus for new user');
      fireEvent.click(presetButton);
      
      const reasonTextarea = screen.getByLabelText('Reason *') as HTMLTextAreaElement;
      expect(reasonTextarea.value).toBe('Welcome bonus for new user');
    });

    it('shows approval toggle', () => {
      render(<TokenIssuanceModal {...mockProps} />);
      
      expect(screen.getByText('Requires Approval')).toBeInTheDocument();
      expect(screen.getByText('If enabled, another admin must approve this issuance')).toBeInTheDocument();
    });

    it('submits form with correct data', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Tokens issued successfully' })
      });

      render(<TokenIssuanceModal {...mockProps} />);
      
      fireEvent.change(screen.getByLabelText('User ID *'), { target: { value: 'user123' } });
      fireEvent.change(screen.getByLabelText('Token Amount *'), { target: { value: '100' } });
      fireEvent.change(screen.getByLabelText('Reason *'), { target: { value: 'Test issuance' } });
      
      const submitButton = screen.getByText('Issue Tokens');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/tokens/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user123',
            amount: 100,
            reason: 'Test issuance',
            requiresApproval: false,
            adminId: 'admin-user-id',
            adminName: 'Admin User'
          })
        });
      });
    });
  });
});