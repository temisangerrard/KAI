#!/usr/bin/env node

/**
 * Debug script to test CDP user creation process
 * This will help identify where the issue is in the user creation flow
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs, query, where } = require('firebase/firestore');

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

async function debugCDPUserCreation() {
  console.log('🔍 Debugging CDP User Creation Process\n');

  try {
    // 1. Check wallet_uid_mappings collection
    console.log('1. Checking wallet_uid_mappings collection...');
    const mappingsRef = collection(db, 'wallet_uid_mappings');
    const mappingsSnapshot = await getDocs(mappingsRef);
    
    console.log(`   Found ${mappingsSnapshot.size} wallet mappings:`);
    mappingsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - Wallet: ${doc.id}`);
      console.log(`     Firebase UID: ${data.firebaseUid}`);
      console.log(`     Email: ${data.email}`);
      console.log(`     Created: ${data.createdAt?.toDate?.()?.toISOString() || data.createdAt}`);
      console.log('');
    });

    // 2. Check users collection for CDP users
    console.log('2. Checking users collection for CDP users...');
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`   Found ${usersSnapshot.size} users total:`);
    
    let cdpUsers = 0;
    let regularUsers = 0;
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const isCdpUser = doc.id.startsWith('cdp_') || !!data.address;
      
      if (isCdpUser) {
        cdpUsers++;
        console.log(`   CDP User: ${doc.id}`);
        console.log(`     Email: ${data.email}`);
        console.log(`     Address: ${data.address || 'N/A'}`);
        console.log(`     Display Name: ${data.displayName}`);
        console.log(`     Token Balance: ${data.tokenBalance}`);
        console.log(`     Created: ${data.createdAt?.toDate?.()?.toISOString() || data.createdAt}`);
        console.log('');
      } else {
        regularUsers++;
      }
    });
    
    console.log(`   Summary: ${cdpUsers} CDP users, ${regularUsers} regular users\n`);

    // 3. Check for orphaned mappings (mappings without corresponding users)
    console.log('3. Checking for orphaned mappings...');
    const userIds = new Set();
    usersSnapshot.forEach(doc => userIds.add(doc.id));
    
    let orphanedMappings = 0;
    mappingsSnapshot.forEach(doc => {
      const data = doc.data();
      if (!userIds.has(data.firebaseUid)) {
        orphanedMappings++;
        console.log(`   ⚠️ Orphaned mapping found:`);
        console.log(`     Wallet: ${doc.id}`);
        console.log(`     Firebase UID: ${data.firebaseUid} (no corresponding user)`);
        console.log(`     Email: ${data.email}`);
        console.log('');
      }
    });
    
    if (orphanedMappings === 0) {
      console.log('   ✅ No orphaned mappings found\n');
    } else {
      console.log(`   ❌ Found ${orphanedMappings} orphaned mappings\n`);
    }

    // 4. Check user_balances collection
    console.log('4. Checking user_balances collection...');
    const balancesRef = collection(db, 'user_balances');
    const balancesSnapshot = await getDocs(balancesRef);
    
    console.log(`   Found ${balancesSnapshot.size} user balances:`);
    
    const balanceUserIds = new Set();
    balancesSnapshot.forEach(doc => {
      balanceUserIds.add(doc.id);
      const data = doc.data();
      console.log(`   - User: ${doc.id}`);
      console.log(`     Available: ${data.availableTokens}`);
      console.log(`     Committed: ${data.committedTokens}`);
      console.log('');
    });

    // 5. Check for users without balances
    console.log('5. Checking for users without token balances...');
    let usersWithoutBalances = 0;
    usersSnapshot.forEach(doc => {
      if (!balanceUserIds.has(doc.id)) {
        usersWithoutBalances++;
        const data = doc.data();
        console.log(`   ⚠️ User without balance:`);
        console.log(`     ID: ${doc.id}`);
        console.log(`     Email: ${data.email}`);
        console.log(`     Is CDP User: ${doc.id.startsWith('cdp_') || !!data.address}`);
        console.log('');
      }
    });
    
    if (usersWithoutBalances === 0) {
      console.log('   ✅ All users have token balances\n');
    } else {
      console.log(`   ❌ Found ${usersWithoutBalances} users without token balances\n`);
    }

    // 6. Summary
    console.log('📊 Summary:');
    console.log(`   - Total wallet mappings: ${mappingsSnapshot.size}`);
    console.log(`   - Total users: ${usersSnapshot.size} (${cdpUsers} CDP, ${regularUsers} regular)`);
    console.log(`   - Total user balances: ${balancesSnapshot.size}`);
    console.log(`   - Orphaned mappings: ${orphanedMappings}`);
    console.log(`   - Users without balances: ${usersWithoutBalances}`);
    
    if (orphanedMappings > 0 || usersWithoutBalances > 0) {
      console.log('\n❌ Issues found that may prevent CDP users from accessing the app');
    } else {
      console.log('\n✅ No obvious issues found in the data structure');
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

// Run the debug script
debugCDPUserCreation().then(() => {
  console.log('\n🏁 Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug script failed:', error);
  process.exit(1);
});