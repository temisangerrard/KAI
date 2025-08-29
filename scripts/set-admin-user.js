/**
 * Script to set admin status for a user in Firestore
 * Run with: node scripts/set-admin-user.js <user-email>
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

async function setAdminUser(email) {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log(`Looking for user with email: ${email}`);
    
    // Find user by email
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      console.error(`No user found with email: ${email}`);
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    console.log(`Found user: ${userData.displayName} (${userId})`);
    
    // Set admin status in admin_users collection
    await setDoc(doc(db, 'admin_users', userId), {
      userId,
      email,
      displayName: userData.displayName,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Also update user record
    await setDoc(doc(db, 'users', userId), {
      isAdmin: true
    }, { merge: true });
    
    console.log(`✅ Admin status granted to ${userData.displayName} (${email})`);
    console.log(`User ID: ${userId}`);
    
  } catch (error) {
    console.error('Error setting admin status:', error);
  }
}

async function listAdminUsers() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('Current admin users:');
    const adminSnapshot = await getDocs(collection(db, 'admin_users'));
    
    if (adminSnapshot.empty) {
      console.log('No admin users found.');
      return;
    }
    
    adminSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.displayName} (${data.email}) - Active: ${data.isActive}`);
    });
    
  } catch (error) {
    console.error('Error listing admin users:', error);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];
const email = args[1];

if (command === 'set' && email) {
  setAdminUser(email);
} else if (command === 'list') {
  listAdminUsers();
} else {
  console.log('Usage:');
  console.log('  node scripts/set-admin-user.js set <email>  - Set admin status for user');
  console.log('  node scripts/set-admin-user.js list        - List current admin users');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/set-admin-user.js set admin@example.com');
  console.log('  node scripts/set-admin-user.js list');
}

module.exports = { setAdminUser, listAdminUsers };