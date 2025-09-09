/**
 * Simple Enhanced PredictionCommitment Component Tests
 * 
 * Basic tests to verify the enhanced component works correctly
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PredictionCommitment } from '@/app/components/prediction-commitment';
import { Market } from '@/lib/types';

// Mock the auth context
jest.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: { 
      id: 'test-user-123',
      uid: 'test-user-123',
      email: 'test@example.com' 
    }
  })
}));

// Mock the token balance service
jest.mock('@/lib/services/token-balance-service', () => ({
  TokenBalanceService: {
    getUserBalance: jest.fn().mockResolvedValue({
      userId: 'test-user-123',
      availableTokens: 1000,
      committedTokens: 200,
      totalEarned: 1500,
      totalSpent: 300,
      lastUpdated: new Date(),
      version: 1
    })
  }
}));

// Mock the commitment creation service
jest.mock('@/lib/services/commitment-creation-service', () => ({
  CommitmentCreationService: {
    createCommitmentForComponent: jest.fn().mockResolvedValue('commitment-123')
  }
}));

// Mock the share button
jest.mock('@/app/components/share-button', () => ({
  ShareButton: ({ commitment }: any) => (
    <button data-testid="share-button">
      Share {commitment.optionText}
    </button>
  )
}));

describe('Enhanced PredictionCommitment Component - Simple Tests', () => {
  const mockOnCommit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  describe('Basic Functionality', () => {
    it('should render and load successfully', async () => {
      const binaryMarket: Market = {
        id: 'test-market',
        title: 'Test Market',
        description: 'Test description',
        category: 'other',
        status: 'active',
        createdBy: 'creator-123',
        createdAt: new Date() as any,
        endsAt: new Date(Date.now() + 86400000) as any,
        tags: ['test'],
        totalParticipants: 10,
        totalTokensStaked: 500,
        featured: false,
        trending: false,
        options: [
          { id: 'yes', text: 'Yes', totalTokens: 300, participantCount: 6 },
          { id: 'no', text: 'No', totalTokens: 200, participantCount: 4 }
        ]
      };

      render(
        <PredictionCommitment
          predictionId="test-market"
          predictionTitle="Test Market"
          position="yes"
          optionId="yes"
          market={binaryMarket}
          maxTokens={500}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Should show the component title
      expect(screen.getByText('Commit Tokens')).toBeInTheDocument();
      
      // Should show the market title
      expect(screen.getByText('Test Market')).toBeInTheDocument();
      
      // Should show balance information
      expect(screen.getByText('Available Tokens')).toBeInTheDocument();
      expect(screen.getByText('1,000')).toBeInTheDocument();
    });

    it('should detect binary market correctly', async () => {
      const binaryMarket: Market = {
        id: 'binary-market',
        title: 'Binary Market',
        description: 'Test',
        category: 'other',
        status: 'active',
        createdBy: 'creator',
        createdAt: new Date() as any,
        endsAt: new Date() as any,
        tags: [],
        totalParticipants: 0,
        totalTokensStaked: 0,
        featured: false,
        trending: false,
        options: [
          { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
          { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
        ]
      };

      render(
        <PredictionCommitment
          predictionId="binary-market"
          predictionTitle="Binary Market"
          position="yes"
          market={binaryMarket}
          maxTokens={100}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Should show binary interface
      expect(screen.getByText('Your Prediction')).toBeInTheDocument();
      
      // Should show yes/no buttons
      expect(screen.getByRole('button', { name: /Yes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /No/i })).toBeInTheDocument();
    });

    it('should detect multi-option market correctly', async () => {
      const multiMarket: Market = {
        id: 'multi-market',
        title: 'Multi Market',
        description: 'Test',
        category: 'other',
        status: 'active',
        createdBy: 'creator',
        createdAt: new Date() as any,
        endsAt: new Date() as any,
        tags: [],
        totalParticipants: 0,
        totalTokensStaked: 0,
        featured: false,
        trending: false,
        options: [
          { id: 'option-1', text: 'Option 1', totalTokens: 0, participantCount: 0 },
          { id: 'option-2', text: 'Option 2', totalTokens: 0, participantCount: 0 },
          { id: 'option-3', text: 'Option 3', totalTokens: 0, participantCount: 0 }
        ]
      };

      render(
        <PredictionCommitment
          predictionId="multi-market"
          predictionTitle="Multi Market"
          optionId="option-1"
          market={multiMarket}
          maxTokens={100}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Should show multi-option interface
      expect(screen.getByText('Choose Your Prediction')).toBeInTheDocument();
      
      // Should show option count badge
      expect(screen.getByText('3 options')).toBeInTheDocument();
      
      // Should show radio buttons for options
      expect(screen.getByLabelText(/Option 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Option 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Option 3/i)).toBeInTheDocument();
    });

    it('should show commit button with token amount', async () => {
      const binaryMarket: Market = {
        id: 'commit-test',
        title: 'Commit Test',
        description: 'Test',
        category: 'other',
        status: 'active',
        createdBy: 'creator',
        createdAt: new Date() as any,
        endsAt: new Date() as any,
        tags: [],
        totalParticipants: 0,
        totalTokensStaked: 0,
        featured: false,
        trending: false,
        options: [
          { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
          { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
        ]
      };

      render(
        <PredictionCommitment
          predictionId="commit-test"
          predictionTitle="Commit Test"
          position="yes"
          market={binaryMarket}
          maxTokens={100}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Should show commit button (with some token amount)
      expect(screen.getByRole('button', { name: /Commit/i })).toBeInTheDocument();
      
      // Should show cancel button
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should handle legacy markets without options', async () => {
      const legacyMarket: Market = {
        id: 'legacy-market',
        title: 'Legacy Market',
        description: 'Test',
        category: 'other',
        status: 'active',
        createdBy: 'creator',
        createdAt: new Date() as any,
        endsAt: new Date() as any,
        tags: [],
        totalParticipants: 0,
        totalTokensStaked: 0,
        featured: false,
        trending: false,
        options: [] // Empty options array
      };

      render(
        <PredictionCommitment
          predictionId="legacy-market"
          predictionTitle="Legacy Market"
          position="yes"
          market={legacyMarket}
          maxTokens={100}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Should default to binary mode for legacy markets
      expect(screen.getByText('Your Prediction')).toBeInTheDocument();
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with existing props pattern', async () => {
      const market: Market = {
        id: 'compat-test',
        title: 'Compatibility Test',
        description: 'Test',
        category: 'other',
        status: 'active',
        createdBy: 'creator',
        createdAt: new Date() as any,
        endsAt: new Date() as any,
        tags: [],
        totalParticipants: 0,
        totalTokensStaked: 0,
        featured: false,
        trending: false,
        options: [
          { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
          { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
        ]
      };

      // Test with legacy props (position only, no optionId)
      render(
        <PredictionCommitment
          predictionId="compat-test"
          predictionTitle="Compatibility Test"
          position="no"
          market={market}
          maxTokens={100}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Should work and show NO as selected
      expect(screen.getByText('NO')).toBeInTheDocument();
    });
  });
});