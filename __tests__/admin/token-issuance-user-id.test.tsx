/**
 * Test for TokenIssuanceModal user ID logic
 * Verifies that it uses the same logic as useAdminAuth hook
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TokenIssuanceModal } from '@/app/admin/tokens/components/token-issuance-modal';

// Mock the auth context
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'firebase-uid-123',
      address: '0x1234567890abcdef',
      email: 'admin@example.com',
      displayName: 'Admin User'
    }
  })
}));

// Mock fetch
global.fetch = jest.fn();

describe('TokenIssuanceModal User ID Logic', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
    preselectedUser: {
      userId: 'test-user-123',
      userEmail: 'test@example.com',
      displayName: 'Test User'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' })
    });
  });

  it('uses user.id || user.address logic for x-user-id header', async () => {
    render(<TokenIssuanceModal {...mockProps} />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('Token Amount *'), { 
      target: { value: '100' } 
    });
    fireEvent.change(screen.getByLabelText('Reason *'), { 
      target: { value: 'Test reason' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Issue Tokens'));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/tokens/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'firebase-uid-123' // Should use user.id first
        },
        body: expect.stringContaining('"adminId":"firebase-uid-123"')
      });
    });
  });

  it('falls back to user.address when user.id is not available', async () => {
    // Mock auth context with no user.id
    jest.doMock('@/app/auth/auth-context', () => ({
      useAuth: () => ({
        user: {
          address: '0x1234567890abcdef',
          email: 'admin@example.com',
          displayName: 'Admin User'
          // No id property
        }
      })
    }));

    // Re-import the component to get the new mock
    const { TokenIssuanceModal: TokenIssuanceModalWithFallback } = await import('@/app/admin/tokens/components/token-issuance-modal');
    
    render(<TokenIssuanceModalWithFallback {...mockProps} />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('Token Amount *'), { 
      target: { value: '100' } 
    });
    fireEvent.change(screen.getByLabelText('Reason *'), { 
      target: { value: 'Test reason' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Issue Tokens'));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/tokens/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '0x1234567890abcdef' // Should use user.address as fallback
        },
        body: expect.stringContaining('"adminId":"0x1234567890abcdef"')
      });
    });
  });

  it('shows error when neither user.id nor user.address is available', async () => {
    // Mock auth context with no user ID or address
    jest.doMock('@/app/auth/auth-context', () => ({
      useAuth: () => ({
        user: {
          email: 'admin@example.com',
          displayName: 'Admin User'
          // No id or address property
        }
      })
    }));

    const { TokenIssuanceModal: TokenIssuanceModalNoId } = await import('@/app/admin/tokens/components/token-issuance-modal');
    
    render(<TokenIssuanceModalNoId {...mockProps} />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('Token Amount *'), { 
      target: { value: '100' } 
    });
    fireEvent.change(screen.getByLabelText('Reason *'), { 
      target: { value: 'Test reason' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Issue Tokens'));
    
    await waitFor(() => {
      expect(screen.getByText('Admin user not authenticated - no user ID or address available')).toBeInTheDocument();
    });
    
    // Should not make API call
    expect(global.fetch).not.toHaveBeenCalled();
  });
});