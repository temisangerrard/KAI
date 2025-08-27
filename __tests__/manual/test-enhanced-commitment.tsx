/**
 * Manual test component for enhanced PredictionCommitment
 * This can be used to manually test the enhanced error handling features
 */

import React, { useState } from 'react'
import { PredictionCommitment } from '@/app/components/prediction-commitment'

// Mock auth context for testing
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="mock-auth-provider">
      {children}
    </div>
  )
}

export function TestEnhancedCommitment() {
  const [testScenario, setTestScenario] = useState<string>('normal')

  // Mock commit function that simulates different error scenarios
  const mockCommit = async (tokens: number): Promise<void> => {
    console.log(`Testing scenario: ${testScenario}, committing ${tokens} tokens`)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    switch (testScenario) {
      case 'insufficient_balance':
        throw {
          errorCode: 'INSUFFICIENT_BALANCE',
          message: 'You do not have enough tokens for this commitment'
        }
      
      case 'transaction_failed':
        throw {
          errorCode: 'TRANSACTION_FAILED', 
          message: 'Transaction failed due to a database conflict. Please try again.'
        }
      
      case 'market_inactive':
        throw {
          errorCode: 'MARKET_INACTIVE',
          message: 'This market is no longer accepting commitments'
        }
      
      case 'network_error':
        throw {
          errorCode: 'NETWORK_ERROR',
          message: 'Network connection error. Please check your connection.'
        }
      
      case 'timeout':
        throw {
          errorCode: 'TIMEOUT_ERROR',
          message: 'Request timed out. Please try again.'
        }
      
      case 'success':
        console.log('Commitment successful!')
        return
      
      default:
        console.log('Normal commitment flow')
        return
    }
  }

  const mockCancel = () => {
    console.log('Commitment cancelled')
  }

  return (
    <MockAuthProvider>
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Enhanced Commitment Error Handling Test</h1>
        
        {/* Test Scenario Selector */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Test Scenario</h2>
          <select 
            value={testScenario} 
            onChange={(e) => setTestScenario(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="normal">Normal Flow</option>
            <option value="success">Success</option>
            <option value="insufficient_balance">Insufficient Balance (Non-retryable)</option>
            <option value="transaction_failed">Transaction Failed (Retryable)</option>
            <option value="market_inactive">Market Inactive (Non-retryable)</option>
            <option value="network_error">Network Error (Retryable)</option>
            <option value="timeout">Timeout Error (Retryable)</option>
          </select>
        </div>

        {/* Features Being Tested */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Enhanced Features Being Tested</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>✅ Firestore-specific error handling with proper error codes</li>
            <li>✅ Retry logic for network failures and transaction conflicts</li>
            <li>✅ Optimistic UI updates with rollback on failure</li>
            <li>✅ Proper loading states during database operations</li>
            <li>✅ Network status monitoring (online/offline)</li>
            <li>✅ User-friendly error messages with retry buttons</li>
            <li>✅ Exponential backoff for automatic retries</li>
            <li>✅ Success state indicators</li>
          </ul>
        </div>

        {/* Test Instructions */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Test Instructions</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Select a test scenario from the dropdown above</li>
            <li>Try committing tokens using the component below</li>
            <li>Observe the error handling behavior:</li>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>Non-retryable errors should show error without retry button</li>
              <li>Retryable errors should show retry button and auto-retry</li>
              <li>Optimistic updates should show during processing</li>
              <li>Network status should be indicated in the header</li>
              <li>Success should show confirmation message</li>
            </ul>
            <li>Test going offline (disconnect network) to see offline handling</li>
          </ol>
        </div>

        {/* The Enhanced Component */}
        <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Enhanced PredictionCommitment Component</h2>
          <PredictionCommitment
            predictionId="test-prediction-123"
            predictionTitle="Will the next iPhone have a foldable screen?"
            position="yes"
            currentOdds={2.5}
            maxTokens={1000}
            onCommit={mockCommit}
            onCancel={mockCancel}
          />
        </div>

        {/* Console Output */}
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
          <h2 className="text-white font-semibold mb-2">Console Output</h2>
          <p>Check browser console for detailed logs during testing</p>
        </div>
      </div>
    </MockAuthProvider>
  )
}

export default TestEnhancedCommitment