/**
 * Test script to verify user fetching from Firestore
 * Run with: node scripts/test-user-fetch.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

// Firebase config (you'll need to set these environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

async function testUserFetch() {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Fetching users...');
    
    // Test 1: Get all users without ordering
    console.log('\n=== Test 1: All users (no ordering) ===');
    const allUsersSnapshot = await getDocs(collection(db, 'users'));
    const allUsers = allUsersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${allUsers.length} total users`);
    
    // Analyze user data
    const emailUsers = allUsers.filter(u => u.email && !u.photoURL);
    const oauthUsers = allUsers.filter(u => u.photoURL);
    const usersWithCreatedAt = allUsers.filter(u => u.createdAt);
    const usersWithoutEmail = allUsers.filter(u => !u.email);
    
    console.log(`- Email signups: ${emailUsers.length}`);
    console.log(`- OAuth signups: ${oauthUsers.length}`);
    console.log(`- Users with createdAt: ${usersWithCreatedAt.length}`);
    console.log(`- Users without email: ${usersWithoutEmail.length}`);
    
    // Test 2: Try ordering by createdAt
    console.log('\n=== Test 2: Users ordered by createdAt ===');
    try {
      const orderedSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          limit(10)
        )
      );
      console.log(`Successfully fetched ${orderedSnapshot.docs.length} users with createdAt ordering`);
    } catch (error) {
      console.log('Failed to order by createdAt:', error.message);
    }
    
    // Test 3: Try ordering by email
    console.log('\n=== Test 3: Users ordered by email ===');
    try {
      const emailOrderedSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          orderBy('email'),
          limit(10)
        )
      );
      console.log(`Successfully fetched ${emailOrderedSnapshot.docs.length} users with email ordering`);
    } catch (error) {
      console.log('Failed to order by email:', error.message);
    }
    
    // Show sample users
    console.log('\n=== Sample Users ===');
    allUsers.slice(0, 3).forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email || 'No email'}`);
      console.log(`  Display Name: ${user.displayName || 'No display name'}`);
      console.log(`  Photo URL: ${user.photoURL ? 'Yes' : 'No'}`);
      console.log(`  Created At: ${user.createdAt ? 'Yes' : 'No'}`);
      console.log(`  Token Balance: ${user.tokenBalance || 0}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error testing user fetch:', error);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

testUserFetch();