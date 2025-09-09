/**
 * Manual Test for Enhanced PredictionCommitment Component
 * 
 * This file can be used to manually test the enhanced component
 * by importing it into a test page or component.
 */

import React, { useState } from 'react';
import { PredictionCommitment } from '@/app/components/prediction-commitment';
import { Market } from '@/lib/types';

// Mock user for testing
const mockUser = {
  id: 'test-user-123',
  uid: 'test-user-123',
  email: 'test@example.com'
};

// Test markets
const binaryMarket: Market = {
  id: 'binary-test',
  title: 'Will it rain tomorrow?',
  description: 'Weather prediction for tomorrow in San Francisco',
  category: 'other',
  status: 'active',
  createdBy: 'weather-expert',
  createdAt: new Date() as any,
  endsAt: new Date(Date.now() + 86400000) as any,
  tags: ['weather', 'prediction'],
  totalParticipants: 45,
  totalTokensStaked: 2300,
  featured: false,
  trending: true,
  options: [
    { id: 'yes', text: 'Yes', totalTokens: 1400, participantCount: 28 },
    { id: 'no', text: 'No', totalTokens: 900, participantCount: 17 }
  ]
};

const multiOptionMarket: Market = {
  id: 'fashion-awards-2024',
  title: 'Who will win Designer of the Year 2024?',
  description: 'Annual fashion awards ceremony - predict the winner',
  category: 'fashion',
  status: 'active',
  createdBy: 'fashion-insider',
  createdAt: new Date() as any,
  endsAt: new Date(Date.now() + 7 * 86400000) as any,
  tags: ['fashion', 'awards', 'designer'],
  totalParticipants: 156,
  totalTokensStaked: 8900,
  featured: true,
  trending: false,
  options: [
    { id: 'designer-a', text: 'Maria Rodriguez', totalTokens: 3200, participantCount: 62 },
    { id: 'designer-b', text: 'James Chen', totalTokens: 2800, participantCount: 48 },
    { id: 'designer-c', text: 'Sofia Andersson', totalTokens: 1900, participantCount: 31 },
    { id: 'designer-d', text: 'Alex Thompson', totalTokens: 1000, participantCount: 15 }
  ]
};

const largeMultiOptionMarket: Market = {
  id: 'election-2024',
  title: 'Which party will win the most seats?',
  description: 'Predict the outcome of the upcoming election',
  category: 'politics',
  status: 'active',
  createdBy: 'political-analyst',
  createdAt: new Date() as any,
  endsAt: new Date(Date.now() + 30 * 86400000) as any,
  tags: ['politics', 'election', '2024'],
  totalParticipants: 892,
  totalTokensStaked: 45600,
  featured: true,
  trending: true,
  options: [
    { id: 'party-a', text: 'Progressive Party', totalTokens: 18200, participantCount: 356 },
    { id: 'party-b', text: 'Conservative Alliance', totalTokens: 15400, participantCount: 298 },
    { id: 'party-c', text: 'Green Coalition', totalTokens: 7800, participantCount: 142 },
    { id: 'party-d', text: 'Liberal Democrats', totalTokens: 2900, participantCount: 67 },
    { id: 'party-e', text: 'Independent Bloc', totalTokens: 800, participantCount: 19 },
    { id: 'party-f', text: 'Other Parties', totalTokens: 500, participantCount: 10 }
  ]
};

export function TestEnhancedCommitmentUI() {
  const [selectedMarket, setSelectedMarket] = useState<'binary' | 'multi' | 'large'>('binary');
  const [showCommitment, setShowCommitment] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>('');

  const getCurrentMarket = () => {
    switch (selectedMarket) {
      case 'binary':
        return binaryMarket;
      case 'multi':
        return multiOptionMarket;
      case 'large':
        return largeMultiOptionMarket;
      default:
        return binaryMarket;
    }
  };

  const handleCommit = async (tokens: number, optionId?: string, position?: 'yes' | 'no') => {
    console.log('Commitment made:', { tokens, optionId, position });
    alert(`Commitment successful!\nTokens: ${tokens}\nOption: ${optionId}\nPosition: ${position}`);
    setShowCommitment(false);
  };

  const handleCancel = () => {
    setShowCommitment(false);
  };

  const startCommitment = (optionId: string, position?: 'yes' | 'no') => {
    setSelectedOption(optionId);
    setShowCommitment(true);
  };

  if (showCommitment) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <PredictionCommitment
          predictionId={getCurrentMarket().id}
          predictionTitle={getCurrentMarket().title}
          position={selectedMarket === 'binary' ? 'yes' : undefined}
          optionId={selectedOption}
          market={getCurrentMarket()}
          maxTokens={1000}
          onCommit={handleCommit}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Enhanced PredictionCommitment Component Test
        </h1>

        {/* Market Type Selector */}
        <div className="mb-8 flex justify-center gap-4">
          <button
            onClick={() => setSelectedMarket('binary')}
            className={`px-4 py-2 rounded-lg ${
              selectedMarket === 'binary'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border'
            }`}
          >
            Binary Market (2 options)
          </button>
          <button
            onClick={() => setSelectedMarket('multi')}
            className={`px-4 py-2 rounded-lg ${
              selectedMarket === 'multi'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border'
            }`}
          >
            Multi-Option Market (4 options)
          </button>
          <button
            onClick={() => setSelectedMarket('large')}
            className={`px-4 py-2 rounded-lg ${
              selectedMarket === 'large'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border'
            }`}
          >
            Large Market (6 options)
          </button>
        </div>

        {/* Market Display */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">{getCurrentMarket().title}</h2>
          <p className="text-gray-600 mb-6">{getCurrentMarket().description}</p>

          <div className="grid gap-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{getCurrentMarket().totalParticipants} participants</span>
              <span>{getCurrentMarket().totalTokensStaked.toLocaleString()} tokens staked</span>
            </div>

            <div className="space-y-3">
              {getCurrentMarket().options.map((option, index) => {
                const percentage = getCurrentMarket().totalTokensStaked > 0
                  ? (option.totalTokens / getCurrentMarket().totalTokensStaked) * 100
                  : 0;

                return (
                  <div key={option.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{option.text}</span>
                      <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {option.totalTokens.toLocaleString()} tokens • {option.participantCount} supporters
                      </div>
                      <button
                        onClick={() => startCommitment(
                          option.id,
                          selectedMarket === 'binary' ? (index === 0 ? 'yes' : 'no') : undefined
                        )}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Support This Option
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Test Instructions</h3>
          <ul className="space-y-2 text-blue-700">
            <li>• Switch between different market types using the buttons above</li>
            <li>• Click "Support This Option" on any option to open the commitment modal</li>
            <li>• Test the different interfaces: binary (yes/no buttons) vs multi-option (radio buttons)</li>
            <li>• Verify that option selection, token input, and odds calculation work correctly</li>
            <li>• Check that the component maintains backward compatibility with existing props</li>
            <li>• Test accessibility features like keyboard navigation and screen reader support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TestEnhancedCommitmentUI;