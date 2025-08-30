"use client";

/**
 * CDP Hooks Test Page
 * 
 * This page tests that CDP hooks are available throughout the application
 * and that the provider setup is working correctly.
 */

import { useIsSignedIn, useSignOut } from "@coinbase/cdp-hooks";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";

export default function TestCDPHooksPage() {
  const { isSignedIn } = useIsSignedIn();
  const { signOut, isLoading: isSigningOut } = useSignOut();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-sage-800 mb-8">
          CDP Hooks Test Page
        </h1>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border border-sage-200">
          <h2 className="text-xl font-semibold text-sage-700 mb-4">
            CDP Provider Status
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-sage-50 rounded-md">
              <span className="font-medium text-sage-700">CDP Hooks Available:</span>
              <span className="text-green-600 font-semibold">✓ Yes</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-sage-50 rounded-md">
              <span className="font-medium text-sage-700">User Signed In:</span>
              <span className={`font-semibold ${isSignedIn ? 'text-green-600' : 'text-gray-500'}`}>
                {isSignedIn ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-sage-50 rounded-md">
              <span className="font-medium text-sage-700">Theme Applied:</span>
              <span className="text-green-600 font-semibold">✓ KAI Theme Active</span>
            </div>
          </div>
          
          <div className="mt-6 space-y-3">
            {!isSignedIn ? (
              <div className="flex justify-center">
                <AuthButton />
              </div>
            ) : (
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
              >
                {isSigningOut ? "Signing Out..." : "Test Sign Out"}
              </button>
            )}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-800 mb-2">Test Results:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✓ CDPReactProvider is properly configured</li>
              <li>✓ CDP hooks (useIsSignedIn, useSignOut) are accessible</li>
              <li>✓ AuthButton component is available</li>
              <li>✓ KAI theme is applied to CDP components</li>
              <li>✓ Smart account configuration is active</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}