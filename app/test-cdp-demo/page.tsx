"use client";

/**
 * CDP Demo Page
 * 
 * This page demonstrates the CDP integration with KAI theming
 * and shows how to use CDP components and hooks.
 */

import { useIsSignedIn, useEvmAddress, useIsInitialized } from "@coinbase/cdp-hooks";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";

export default function CDPDemoPage() {
  const isSignedIn = useIsSignedIn();
  const isInitialized = useIsInitialized();
  const address = useEvmAddress();

  return (
    <div className="min-h-screen bg-primary-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-kai-700 mb-4">
            CDP Integration Demo
          </h1>
          <p className="text-lg text-gray-600">
            Test the Coinbase CDP integration with KAI theming
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Status Panel */}
          <div className="bg-white rounded-kai-card p-6 shadow-kai-sm border border-primary-100">
            <h2 className="text-2xl font-semibold text-kai-600 mb-6">
              Connection Status
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                <span className="font-medium text-gray-700">CDP Initialized:</span>
                <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                  isInitialized 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {isInitialized ? '✓ Ready' : '⚠ Loading...'}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                <span className="font-medium text-gray-700">Authentication:</span>
                <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                  isSignedIn 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {isSignedIn ? '✓ Signed In' : '○ Not Signed In'}
                </span>
              </div>
              
              {address && (
                <div className="p-4 bg-primary-50 rounded-lg">
                  <span className="font-medium text-gray-700 block mb-2">Smart Wallet Address:</span>
                  <div className="bg-white p-3 rounded border">
                    <code className="text-sm text-gray-600 break-all font-mono">
                      {typeof address === 'object' && 'evmAddress' in address 
                        ? address.evmAddress 
                        : String(address)}
                    </code>
                  </div>
                  <div className="mt-2 text-xs text-green-600 font-medium">
                    ✓ Smart Account (Gasless Transactions Enabled)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Authentication Panel */}
          <div className="bg-white rounded-kai-card p-6 shadow-kai-sm border border-primary-100">
            <h2 className="text-2xl font-semibold text-kai-600 mb-6">
              Authentication
            </h2>
            
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  {isSignedIn 
                    ? "You're connected with your smart wallet!" 
                    : "Connect your wallet to get started"}
                </p>
                
                {/* CDP Auth Button with KAI theming */}
                <div className="cdp-auth-container">
                  <AuthButton />
                </div>
              </div>
              
              {isSignedIn && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">
                    🎉 Successfully Connected!
                  </h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>✓ Smart wallet created</li>
                    <li>✓ Gasless transactions enabled</li>
                    <li>✓ Ready for KAI platform features</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-8 bg-white rounded-kai-card p-6 shadow-kai-sm border border-primary-100">
          <h2 className="text-2xl font-semibold text-kai-600 mb-4">
            What's Next?
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary-50 rounded-lg">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-semibold text-gray-800 mb-1">Prediction Markets</h3>
              <p className="text-sm text-gray-600">Back your opinions with tokens</p>
            </div>
            <div className="text-center p-4 bg-primary-50 rounded-lg">
              <div className="text-2xl mb-2">💰</div>
              <h3 className="font-semibold text-gray-800 mb-1">Smart Wallet</h3>
              <p className="text-sm text-gray-600">Gasless transactions</p>
            </div>
            <div className="text-center p-4 bg-primary-50 rounded-lg">
              <div className="text-2xl mb-2">🌟</div>
              <h3 className="font-semibold text-gray-800 mb-1">Social Features</h3>
              <p className="text-sm text-gray-600">Connect with community</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="inline-flex items-center px-6 py-3 bg-kai-600 text-white rounded-kai-button hover:bg-kai-700 transition-colors mr-4"
          >
            ← Back to Home
          </a>
          <a 
            href="/markets" 
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-kai-button hover:bg-primary-700 transition-colors"
          >
            Explore Markets →
          </a>
        </div>
      </div>
    </div>
  );
}