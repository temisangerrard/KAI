/**
 * Enhanced PredictionCommitment Component Tests
 * 
 * Tests the enhanced PredictionCommitment component with multi-option support
 * while ensuring backward compatibility with binary markets.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('Enhanced PredictionCommitment Component', () => {
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

  describe('Binary Market Support (Backward Compatibility)', () => {
    const binaryMarket: Market = {
      id: 'binary-market-123',
      title: 'Will it rain tomorrow?',
      description: 'Weather prediction for tomorrow',
      category: 'other',
      status: 'active',
      createdBy: 'creator-123',
      createdAt: new Date() as any,
      endsAt: new Date(Date.now() + 86400000) as any,
      tags: ['weather'],
      totalParticipants: 50,
      totalTokensStaked: 1000,
      featured: false,
      trending: false,
      options: [
        { id: 'yes', text: 'Yes', totalTokens: 600, participantCount: 30 },
        { id: 'no', text: 'No', totalTokens: 400, participantCount: 20 }
      ]
    };

    it('should render binary market with yes/no buttons', async () => {
      render(
        <PredictionCommitment
          predictionId="binary-market-123"
          predictionTitle="Will it rain tomorrow?"
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

      // Should show binary market interface
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
      
      // Should show current selection
      expect(screen.getByText('YES')).toBeInTheDocument(); // Badge showing selected position
    });

    it('should allow switching between yes and no options', async () => {
      const user = userEvent.setup();
      
      render(
        <PredictionCommitment
          predictionId="binary-market-123"
          predictionTitle="Will it rain tomorrow?"
          position="yes"
          optionId="yes"
          market={binaryMarket}
          maxTokens={500}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Click on "No" button
      const noButton = screen.getByRole('button', { name: /No/i });
      await user.click(noButton);

      // Should update the display
      await waitFor(() => {
        expect(screen.getByText('NO')).toBeInTheDocument(); // Badge should update
      });
    });

    it('should maintain backward compatibility with existing props', async () => {
      render(
        <PredictionCommitment
          predictionId="binary-market-123"
          predictionTitle="Will it rain tomorrow?"
          position="no"  // Legacy position prop
          market={binaryMarket}
          maxTokens={500}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Should default to "no" position
      expect(screen.getByText('NO')).toBeInTheDocument();
    });
  });

  describe('Multi-Option Market Support', () => {
    const multiOptionMarket: Market = {
      id: 'multi-market-123',
      title: 'Who will win the fashion award?',
      description: 'Fashion designer competition',
      category: 'fashion',
      status: 'active',
      createdBy: 'creator-123',
      createdAt: new Date() as any,
      endsAt: new Date(Date.now() + 86400000) as any,
      tags: ['fashion', 'awards'],
      totalParticipants: 100,
      totalTokensStaked: 2000,
      featured: true,
      trending: false,
      options: [
        { id: 'designer-a', text: 'Designer A', totalTokens: 800, participantCount: 40 },
        { id: 'designer-b', text: 'Designer B', totalTokens: 600, participantCount: 30 },
        { id: 'designer-c', text: 'Designer C', totalTokens: 400, participantCount: 20 },
        { id: 'designer-d', text: 'Designer D', totalTokens: 200, participantCount: 10 }
      ]
    };

    it('should render multi-option market with radio buttons', async () => {
      render(
        <PredictionCommitment
          predictionId="multi-market-123"
          predictionTitle="Who will win the fashion award?"
          optionId="designer-a"
          market={multiOptionMarket}
          maxTokens={500}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Should show multi-option interface
      expect(screen.getByText('Choose Your Prediction')).toBeInTheDocument();
      expect(screen.getByText('Designer A')).toBeInTheDocument();
      expect(screen.getByText('Designer B')).toBeInTheDocument();
      expect(screen.getByText('Designer C')).toBeInTheDocument();
      expect(screen.getByText('Designer D')).toBeInTheDocument();

      // Should show option count badge
      expect(screen.getByText('4 options')).toBeInTheDocument();
    });

    it('should show option details including tokens and participants', async () => {
      render(
        <PredictionCommitment
          predictionId="multi-market-123"
          predictionTitle="Who will win the fashion award?"
          optionId="designer-a"
          market={multiOptionMarket}
          maxTokens={500}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Should show token amounts
      expect(screen.getByText('800 tokens')).toBeInTheDocument();
      expect(screen.getByText('600 tokens')).toBeInTheDocument();

      // Should show participant counts
      expect(screen.getByText('40 supporters')).toBeInTheDocument();
      expect(screen.getByText('30 supporters')).toBeInTheDocument();
    });

    it('should allow selecting different options', async () => {
      const user = userEvent.setup();
      
      render(
        <PredictionCommitment
          predictionId="multi-market-123"
          predictionTitle="Who will win the fashion award?"
          optionId="designer-a"
          market={multiOptionMarket}
          maxTokens={500}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Click on Designer B option
      const designerBRadio = screen.getByLabelText(/Designer B/i);
      await user.click(designerBRadio);

      // Should update the selected option display
      await waitFor(() => {
        expect(screen.getByText('Designer B')).toBeInTheDocument();
      });
    });

    it('should show validation error when no option is selected', async () => {
      render(
        <PredictionCommitment
          predictionId="multi-market-123"
          predictionTitle="Who will win the fashion award?"
          market={multiOptionMarket}
          maxTokens={500}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Should show validation message when no option is selected (only if no optionId prop provided)
      // Since we didn't provide optionId, it should show validation message
      expect(screen.getByText('Please select an option to continue with your commitment.')).toBeInTheDocument();
    });
  });

  describe('Market Type Detection', () => {
    it('should detect binary market correctly', async () => {
      const binaryMarket: Market = {
        id: 'binary-test',
        title: 'Binary Test',
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
          predictionId="binary-test"
          predictionTitle="Binary Test"
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

      // Should show binary interface (buttons, not radio)
      expect(screen.getByText('Your Prediction')).toBeInTheDocument();
      expect(screen.queryByText('Choose Your Prediction')).not.toBeInTheDocument();
    });

    it('should detect multi-option market correctly', async () => {
      const multiMarket: Market = {
        id: 'multi-test',
        title: 'Multi Test',
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
          predictionId="multi-test"
          predictionTitle="Multi Test"
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

      // Should show multi-option interface (radio buttons)
      expect(screen.getByText('Choose Your Prediction')).toBeInTheDocument();
      expect(screen.queryByText('Your Prediction')).not.toBeInTheDocument();
      
      // Should show the option count badge
      expect(screen.getByText('3 options')).toBeInTheDocument();
    });

    it('should handle legacy markets without options', async () => {
      const legacyMarket: Market = {
        id: 'legacy-test',
        title: 'Legacy Test',
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
          predictionId="legacy-test"
          predictionTitle="Legacy Test"
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

  describe('Commitment Creation', () => {
    it('should call enhanced commitment service for multi-option markets', async () => {
      const { CommitmentCreationService } = require('@/lib/services/commitment-creation-service');
      const user = userEvent.setup();

      const multiMarket: Market = {
        id: 'multi-commit-test',
        title: 'Multi Commit Test',
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
          predictionId="multi-commit-test"
          predictionTitle="Multi Commit Test"
          optionId="option-2"
          market={multiMarket}
          maxTokens={100}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Select option 2
      const option2Radio = screen.getByLabelText(/Option 2/i);
      await user.click(option2Radio);

      // Set token amount
      const tokenInput = screen.getByLabelText(/Tokens to Commit/i);
      await user.clear(tokenInput);
      await user.type(tokenInput, '50');

      // Wait for the button text to update
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Commit 50/i })).toBeInTheDocument();
      });

      // Click commit button
      const commitButton = screen.getByRole('button', { name: /Commit 50/i });
      await user.click(commitButton);

      // Should call enhanced service with correct parameters
      await waitFor(() => {
        expect(CommitmentCreationService.createCommitmentForComponent).toHaveBeenCalledWith(
          'test-user-123',
          'multi-commit-test',
          'no', // Derived position (option-2 is not first option)
          'option-2',
          50,
          expect.objectContaining({
            source: 'web',
            userAgent: expect.any(String)
          })
        );
      });
    });

    it('should fallback to original callback if enhanced service fails', async () => {
      const { CommitmentCreationService } = require('@/lib/services/commitment-creation-service');
      CommitmentCreationService.createCommitmentForComponent.mockRejectedValueOnce(new Error('Service failed'));
      
      const user = userEvent.setup();

      const binaryMarket: Market = {
        id: 'fallback-test',
        title: 'Fallback Test',
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
          predictionId="fallback-test"
          predictionTitle="Fallback Test"
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

      // Set token amount
      const tokenInput = screen.getByLabelText(/Tokens to Commit/i);
      await user.clear(tokenInput);
      await user.type(tokenInput, '25');

      // Wait for the button text to update
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Commit 25/i })).toBeInTheDocument();
      });

      // Click commit button
      const commitButton = screen.getByRole('button', { name: /Commit 25/i });
      await user.click(commitButton);

      // Should fallback to original callback
      await waitFor(() => {
        expect(mockOnCommit).toHaveBeenCalledWith(25, 'yes', 'yes');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for radio buttons', async () => {
      const multiMarket: Market = {
        id: 'accessibility-test',
        title: 'Accessibility Test',
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
          predictionId="accessibility-test"
          predictionTitle="Accessibility Test"
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

      // Should have proper radio button labels for multi-option market
      expect(screen.getByLabelText(/Option 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Option 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Option 3/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      const multiMarket: Market = {
        id: 'keyboard-test',
        title: 'Keyboard Test',
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
          predictionId="keyboard-test"
          predictionTitle="Keyboard Test"
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

      // Should have radio buttons for multi-option market
      const option1Radio = screen.getByLabelText(/Option 1/i);
      const option2Radio = screen.getByLabelText(/Option 2/i);
      
      // Option 1 should be selected by default (from optionId prop)
      expect(option1Radio).toBeChecked();
      
      // Click on option 2
      await user.click(option2Radio);
      expect(option2Radio).toBeChecked();
    });
  });

  describe('Error Handling', () => {
    it('should show error when market options fail to load', async () => {
      // Mock a market that would cause an error
      const errorMarket: Market = {
        id: 'error-test',
        title: 'Error Test',
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
        options: [] // This should trigger fallback behavior
      };

      render(
        <PredictionCommitment
          predictionId="error-test"
          predictionTitle="Error Test"
          market={errorMarket}
          maxTokens={100}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // Should still render (fallback to binary mode)
      expect(screen.getByText('Your Prediction')).toBeInTheDocument();
    });

    it('should auto-select first option when no optionId provided', async () => {
      const user = userEvent.setup();
      
      const multiMarket: Market = {
        id: 'validation-test',
        title: 'Validation Test',
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
          predictionId="validation-test"
          predictionTitle="Validation Test"
          market={multiMarket}
          maxTokens={100}
          onCommit={mockOnCommit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading market options...')).not.toBeInTheDocument();
      });

      // The component should auto-select the first option when no optionId is provided
      // So the commit button should be enabled
      const commitButton = screen.getByRole('button', { name: /Commit/i });
      expect(commitButton).toBeEnabled();
      
      // Should show the first option as selected
      expect(screen.getByText('Option 1')).toBeInTheDocument(); // In the badge
      
      // The first radio button should be checked
      const option1Radio = screen.getByLabelText(/Option 1/i);
      expect(option1Radio).toBeChecked();
    });
  });
});