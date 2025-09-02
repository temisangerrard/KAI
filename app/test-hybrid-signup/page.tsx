"use client";

/**
 * Test Hybrid Signup Page
 * 
 * This page tests the CDP email authentication flow with smart wallet creation
 * and Firestore user document creation using wallet address as document ID.
 */

import React, { useState, useEffect } from "react";
import { useIsSignedIn, useIsInitialized, useEvmAddress, useCurrentUser } from "@coinbase/cdp-hooks";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { UserService, type UserProfile } from "@/lib/services/user-service";

// UserProfile interface is now imported from UserService

export default function TestHybridSignupPage() {
  const { isSignedIn } = useIsSignedIn();
  const { isInitialized } = useIsInitialized();
  const { evmAddress } = useEvmAddress();
  const { currentUser } = useCurrentUser();
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // User creation is now handled by UserService via API

  // Handle user profile creation when user signs in
  useEffect(() => {
    if (isSignedIn && evmAddress && !userProfile && !isCreatingUser) {
      handleCreateUserProfile();
    }
  }, [isSignedIn, evmAddress, userProfile, isCreatingUser]);

  // Handle user profile creation after successful CDP authentication
  const handleCreateUserProfile = async () => {
    if (!evmAddress || !currentUser?.email) return;

    setIsCreatingUser(true);
    setError(null);

    try {
      // Create or update user via server-side API
      const result = await UserService.createUser(
        evmAddress,
        currentUser.email,
        currentUser.displayName
      );
      
      if (result.success && result.user) {
        setUserProfile(result.user);
        setSuccess(result.message || `Account ready! Wallet: ${evmAddress}`);
      } else {
        throw new Error(result.error || 'Failed to create user');
      }
    } catch (err) {
      console.error("User profile creation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create user profile. Please try again.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setSuccess(null);
    setIsCreatingUser(false);
    setUserProfile(null);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-cream-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600 mx-auto mb-4"></div>
          <p className="text-sage-700">Initializing CDP...</p>
        </div>
      </div>
    );
  }

  if (isSignedIn && evmAddress) {
    return (
      <div className="min-h-screen bg-cream-50 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-sage-800 mb-8">
            Account Created Successfully! ✨
          </h1>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-sage-200">
            <div className="space-y-4">
              <div className="flex items-center justify-center p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎉</div>
                  <h2 className="text-xl font-semibold text-green-800 mb-2">
                    Smart Wallet Account Created!
                  </h2>
                  <p className="text-green-700">
                    Your gasless Web3 account is ready to use
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-sage-50 rounded-md">
                  <span className="font-medium text-sage-700">Email:</span>
                  <span className="text-sage-800 font-mono">{userProfile?.email || currentUser?.email || 'Loading...'}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-sage-50 rounded-md">
                  <span className="font-medium text-sage-700">Wallet Address:</span>
                  <span className="text-sage-800 font-mono text-sm break-all">
                    {evmAddress}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-sage-50 rounded-md">
                  <span className="font-medium text-sage-700">Account Type:</span>
                  <span className="text-green-600 font-semibold">Smart Account</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-sage-50 rounded-md">
                  <span className="font-medium text-sage-700">Gasless Transactions:</span>
                  <span className="text-green-600 font-semibold">✓ Enabled</span>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <a
                  href="/markets"
                  className="block w-full bg-sage-600 hover:bg-sage-700 text-white font-medium py-3 px-4 rounded-md text-center transition-colors"
                >
                  Go to Markets
                </a>
                
                <AuthButton />
                
                <button
                  onClick={handleRetry}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
                >
                  Test Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-sage-800 mb-8">
          Create Your KAI Account
        </h1>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border border-sage-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-sage-700 mb-2">
              Smart Wallet Signup
            </h2>
            <p className="text-gray-600">
              Create your account with email and get a smart wallet with gasless transactions
            </p>
          </div>
          
          <div className="space-y-4">
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center justify-between">
                  <p className="text-red-700">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-700">{success}</p>
              </div>
            )}
            
            <div className="flex justify-center">
              <AuthButton />
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-800 mb-2">What you'll get:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✓ Smart wallet with gasless transactions</li>
              <li>✓ 100 starting tokens to back your opinions</li>
              <li>✓ Access to all KAI prediction markets</li>
              <li>✓ Secure Web3 account with email login</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}