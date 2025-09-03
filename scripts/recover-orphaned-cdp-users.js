#!/usr/bin/env node

/**
 * Recovery script for orphaned CDP users
 * This script finds wallet mappings without corresponding user profiles and creates the missing profiles
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

async function recoverOrphanedUsers() {
  console.log('🔧 Starting CDP User Recovery Process\n');

  try {
    // Import the auth service
    const { authService } = await import('../lib/auth/auth-service.js');
    
    console.log('✅ Auth service imported successfully\n');

    // Run the recovery process
    console.log('🔍 Scanning for orphaned CDP users...');
    const result = await authService.recoverOrphanedCDPUsers();
    
    console.log('\n📊 Recovery Results:');
    console.log(`   - Users recovered: ${result.recovered}`);
    console.log(`   - Recovery failures: ${result.failed}`);
    
    if (result.recovered > 0) {
      console.log('\n✅ Recovery successful! Orphaned CDP users can now access the app.');
    } else if (result.failed > 0) {
      console.log('\n⚠️ Some users could not be recovered. Check the logs above for details.');
    } else {
      console.log('\n✅ No orphaned users found. All CDP users have proper profiles.');
    }

  } catch (error) {
    console.error('❌ Error during recovery process:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the recovery
recoverOrphanedUsers().then(() => {
  console.log('\n🏁 Recovery process complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Recovery process failed:', error);
  process.exit(1);
});