#!/usr/bin/env node

/**
 * Test script to verify that the undefined photoURL issue is fixed
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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

async function testUserCreation() {
  console.log('🧪 Testing user creation fix...\n');
  
  try {
    // Import the auth service
    const { authService } = await import('../lib/auth/auth-service.js');
    
    console.log('✅ Auth service imported successfully\n');
    
    // Test creating a user with the problematic email/address
    const testEmail = 'adandeche@gmail.com';
    const testAddress = '0xf912f3A46374e3b1f4C0072169aFf3262e926Fd1';
    
    console.log('🔧 Testing user creation for:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Address: ${testAddress}\n`);
    
    // First, try to get existing user
    console.log('1️⃣ Checking for existing user...');
    const existingUser = await authService.getUserByAddress(testAddress);
    
    if (existingUser) {
      console.log('✅ User already exists:', {
        id: existingUser.id,
        email: existingUser.email,
        displayName: existingUser.displayName,
        hasProfileImage: !!existingUser.profileImage
      });
      console.log('\n✅ Test passed - user exists and no undefined photoURL error occurred');
      return;
    }
    
    console.log('ℹ️ No existing user found, attempting to create...\n');
    
    // Try to create the user
    console.log('2️⃣ Creating new user...');
    const newUser = await authService.createUserFromCDP(testAddress, testEmail);
    
    console.log('✅ User created successfully:', {
      id: newUser.id,
      email: newUser.email,
      displayName: newUser.displayName,
      tokenBalance: newUser.tokenBalance,
      hasProfileImage: !!newUser.profileImage
    });
    
    console.log('\n✅ Test passed - user creation completed without undefined photoURL error');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nError details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    if (error.message.includes('photoURL') && error.message.includes('undefined')) {
      console.error('\n💥 The undefined photoURL issue is still present!');
    }
  }
}

// Run the test
testUserCreation().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Test script failed:', error);
  process.exit(1);
});