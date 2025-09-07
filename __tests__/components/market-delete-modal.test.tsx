import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarketDeleteModal } from '@/app/admin/components/market-delete-modal';

// Mock the UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => 
    <h2 data-testid="dialog-title">{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      data-variant={variant}
      data-testid={props['data-testid'] || 'button'}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="alert-description">{children}</div>,
}));

const mockMarket = {
  id: 'market-123',
  title: 'Test Market Title',
  totalParticipants: 25,
  totalTokensCommitted: 1500,
};

describe('MarketDeleteModal', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <MarketDeleteModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        market={mockMarket}
      />
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Delete Market');
    expect(screen.getByText('Test Market Title')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <MarketDeleteModal
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        market={mockMarket}
      />
    );

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays market details and impact information', () => {
    render(
      <MarketDeleteModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        market={mockMarket}
      />
    );

    expect(screen.getByText('Test Market Title')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('Tokens Staked')).toBeInTheDocument();
  });

  it('shows warning for markets with participants and tokens', () => {
    render(
      <MarketDeleteModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        market={mockMarket}
      />
    );

    expect(screen.getByText(/This market has active participants and committed tokens/)).toBeInTheDocument();
  });

  it('does not show additional warning for empty markets', () => {
    const emptyMarket = {
      ...mockMarket,
      totalParticipants: 0,
      totalTokensCommitted: 0,
    };

    render(
      <MarketDeleteModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        market={emptyMarket}
      />
    );

    expect(screen.queryByText(/This market has active participants and committed tokens/)).not.toBeInTheDocument();
  });

  it('requires DELETE confirmation text to enable delete button', () => {
    render(
      <MarketDeleteModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        market={mockMarket}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete market/i });
    const confirmInput = screen.getByPlaceholderText('Type DELETE to confirm');

    // Initially disabled
    expect(deleteButton).toBeDisabled();

    // Still disabled with wrong text
    fireEvent.change(confirmInput, { target: { value: 'delete' } });
    expect(deleteButton).toBeDisabled();

    // Enabled with correct text
    fireEvent.change(confirmInput, { target: { value: 'DELETE' } });
    expect(deleteButton).not.toBeDisabled();
  });

  it('calls onConfirm when delete button is clicked with correct confirmation', () => {
    render(
      <MarketDeleteModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        market={mockMarket}
      />
    );

    const confirmInput = screen.getByPlaceholderText('Type DELETE to confirm');
    const deleteButton = screen.getByRole('button', { name: /delete market/i });

    fireEvent.change(confirmInput, { target: { value: 'DELETE' } });
    fireEvent.click(deleteButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <MarketDeleteModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        market={mockMarket}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state correctly', () => {
    render(
      <MarketDeleteModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        market={mockMarket}
        loading={true}
      />
    );

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    
    const deleteButton = screen.getByRole('button', { name: /deleting/i });
    const cancelButton = screen.getByText('Cancel');
    const confirmInput = screen.getByPlaceholderText('Type DELETE to confirm');

    expect(deleteButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(confirmInput).toBeDisabled();
  });

  it('clears confirmation text when modal is closed', () => {
    const { rerender } = render(
      <MarketDeleteModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        market={mockMarket}
      />
    );

    const confirmInput = screen.getByPlaceholderText('Type DELETE to confirm');
    fireEvent.change(confirmInput, { target: { value: 'DELETE' } });

    // Close modal
    rerender(
      <MarketDeleteModal
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        market={mockMarket}
      />
    );

    // Reopen modal
    rerender(
      <MarketDeleteModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        market={mockMarket}
      />
    );

    const newConfirmInput = screen.getByPlaceholderText('Type DELETE to confirm');
    expect(newConfirmInput).toHaveValue('');
  });
});