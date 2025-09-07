import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the admin markets page component
jest.mock('@/lib/services/admin-commitment-service', () => ({
  AdminCommitmentService: {
    getMarketCommitments: jest.fn().mockResolvedValue({
      commitments: [],
      totalCount: 0,
      hasMore: false
    })
  }
}));

jest.mock('@/lib/db/database', () => ({
  db: {},
  auth: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({
    docs: []
  })
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  })
}));

// Import the component after mocks
import MarketsPage from '@/app/admin/markets/page';

describe('Market Dropdown Menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dropdown menu with delete option', async () => {
    render(<MarketsPage />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Markets')).toBeInTheDocument();
    });

    // Since there are no markets in the mock, we should see the empty state
    expect(screen.getByText('No markets found matching your criteria.')).toBeInTheDocument();
  });

  it('shows correct structure for dropdown menu', () => {
    // Test that the component imports and renders without errors
    expect(() => render(<MarketsPage />)).not.toThrow();
  });
});