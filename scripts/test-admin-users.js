/**
 * Test script to verify Firebase Admin user fetching
 * Run with: node scripts/test-admin-users.js
 */

require('dotenv').config({ path: '.env.local' });

async function testAdminUserFetch() {
  try {
    console.log('Testing Firebase Admin user fetch...');
    
    // Import Firebase Admin SDK directly
    const { initializeApp, getApps, cert } = require('firebase-admin/app');
    const { getAuth } = require('firebase-admin/auth');
    
    console.log('Setting up Firebase Admin with service account...');
    
    // Initialize Firebase Admin with service account
    let adminApp;
    if (getApps().length === 0) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };

      console.log('Using service account:', serviceAccount.clientEmail);
      
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId,
      });
    } else {
      adminApp = getApps()[0];
    }
    
    const adminAuth = getAuth(adminApp);
    
    console.log('Admin auth initialized successfully');
    
    // Try to list users
    console.log('Attempting to list users...');
    const result = await adminAuth.listUsers();
    console.log(`✅ Found ${result.users.length} users via Firebase Admin`);
    
    // Show sample user data
    if (result.users.length > 0) {
      console.log('\nSample users:');
      result.users.slice(0, 3).forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  UID: ${user.uid}`);
        console.log(`  Email: ${user.email || 'No email'}`);
        console.log(`  Display Name: ${user.displayName || 'No display name'}`);
        console.log(`  Photo URL: ${user.photoURL ? 'Yes' : 'No'}`);
        console.log(`  Created: ${user.metadata.creationTime}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing admin user fetch:', error);
    console.error('Error details:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

testAdminUserFetch();