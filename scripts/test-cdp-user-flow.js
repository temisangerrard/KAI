#!/usr/bin/env node

/**
 * Test script to simulate CDP user creation flow
 * This will help identify where the issue is in the user creation process
 */

const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Firebase config (using environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mock CDP user data
const testCDPUser = {
  walletAddress: '0x1234567890123456789012345678901234567890',
  email: 'test-cdp-user@example.com',
  displayName: 'Test CDP User'
};

async function testCDPUserFlow() {
  console.log('🧪 Testing CDP User Creation Flow\n');
  console.log('Test user data:', testCDPUser);
  console.log('');

  try {
    // Import the services (using dynamic import to handle ES modules)
    const { WalletUidMappingService } = await import('../lib/services/wallet-uid-mapping.js');
    const { authService } = await import('../lib/auth/auth-service.js');
    const { TokenBalanceService } = await import('../lib/services/token-balance-service.js');

    console.log('✅ Services imported successfully\n');

    // Step 1: Test wallet UID mapping creation
    console.log('1. Testing wallet UID mapping creation...');
    const { firebaseUid, isNewMapping } = await WalletUidMappingService.getOrCreateMapping(
      testCDPUser.walletAddress,
      testCDPUser.email
    );
    
    console.log(`   Firebase UID: ${firebaseUid}`);
    console.log(`   Is new mapping: ${isNewMapping}`);
    console.log('');

    // Step 2: Test user creation
    console.log('2. Testing user creation...');
    const authUser = await authService.createUserFromCDP(
      testCDPUser.walletAddress,
      testCDPUser.email,
      testCDPUser.displayName
    );
    
    console.log('   Created user:', {
      id: authUser.id,
      address: authUser.address,
      email: authUser.email,
      displayName: authUser.displayName,
      tokenBalance: authUser.tokenBalance,
      hasCompletedOnboarding: authUser.hasCompletedOnboarding
    });
    console.log('');

    // Step 3: Test user retrieval
    console.log('3. Testing user retrieval...');
    const retrievedUser = await authService.getUserByAddress(testCDPUser.walletAddress);
    
    if (retrievedUser) {
      console.log('   ✅ User retrieved successfully:', {
        id: retrievedUser.id,
        address: retrievedUser.address,
        email: retrievedUser.email,
        displayName: retrievedUser.displayName,
        tokenBalance: retrievedUser.tokenBalance
      });
    } else {
      console.log('   ❌ Failed to retrieve user');
    }
    console.log('');

    // Step 4: Test token balance initialization
    console.log('4. Testing token balance initialization...');
    let userBalance = await TokenBalanceService.getUserBalance(authUser.id);
    
    if (!userBalance) {
      console.log('   No balance found, creating initial balance...');
      userBalance = await TokenBalanceService.createInitialBalance(authUser.id);
    }
    
    console.log('   Token balance:', {
      userId: userBalance.userId,
      availableTokens: userBalance.availableTokens,
      committedTokens: userBalance.committedTokens,
      totalEarned: userBalance.totalEarned,
      totalSpent: userBalance.totalSpent
    });
    console.log('');

    // Step 5: Test authentication state simulation
    console.log('5. Testing authentication state...');
    const isAuthenticated = !!(retrievedUser && userBalance);
    console.log(`   User would be authenticated: ${isAuthenticated}`);
    
    if (isAuthenticated) {
      console.log('   ✅ User should be able to access the app');
    } else {
      console.log('   ❌ User would NOT be able to access the app');
    }
    console.log('');

    console.log('🎉 CDP User Flow Test Complete');
    console.log('');
    console.log('Summary:');
    console.log(`   - Wallet mapping created: ${!!firebaseUid}`);
    console.log(`   - User profile created: ${!!authUser}`);
    console.log(`   - User can be retrieved: ${!!retrievedUser}`);
    console.log(`   - Token balance exists: ${!!userBalance}`);
    console.log(`   - Would be authenticated: ${isAuthenticated}`);

  } catch (error) {
    console.error('❌ Error during CDP user flow test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCDPUserFlow().then(() => {
  console.log('\n🏁 Test complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});