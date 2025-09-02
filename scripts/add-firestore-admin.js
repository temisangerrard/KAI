/**
 * Add admin user to Firestore admin_users collection
 * This is for the new Coinbase CDP authentication system
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, collection, getDocs } = require('firebase/firestore');

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

async function addFirestoreAdmin(email, displayName, userId) {
  try {
    console.log('🔍 Adding admin to Firestore admin_users collection...');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Create admin record
    const adminData = {
      userId: userId,
      email: email,
      displayName: displayName,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add to admin_users collection
    await setDoc(doc(db, 'admin_users', userId), adminData);
    
    console.log('✅ Admin user added successfully!');
    console.log(`📋 User ID: ${userId}`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Display Name: ${displayName}`);
    
  } catch (error) {
    console.error('❌ Error adding admin user:', error);
  }
}

async function listFirestoreAdmins() {
  try {
    console.log('🔍 Checking admin_users collection...');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Get all admin users
    const adminUsersRef = collection(db, 'admin_users');
    const snapshot = await getDocs(adminUsersRef);
    
    if (snapshot.empty) {
      console.log('❌ No admin users found in admin_users collection');
      return;
    }
    
    console.log(`✅ Found ${snapshot.size} admin user(s):`);
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`📋 Admin User ID: ${doc.id}`);
      console.log(`   Email: ${data.email}`);
      console.log(`   Display Name: ${data.displayName}`);
      console.log(`   Is Active: ${data.isActive}`);
      console.log(`   Created At: ${data.createdAt?.toDate?.() || data.createdAt}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error checking admin users:', error);
  }
}

async function findUserByEmail(email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Get all users and find by email
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let foundUser = null;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.email === email) {
        foundUser = {
          id: doc.id,
          ...data
        };
      }
    });
    
    if (foundUser) {
      console.log('✅ Found user:');
      console.log(`   User ID: ${foundUser.id}`);
      console.log(`   Email: ${foundUser.email}`);
      console.log(`   Display Name: ${foundUser.displayName}`);
      console.log(`   Address: ${foundUser.address}`);
      return foundUser;
    } else {
      console.log('❌ User not found');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error finding user:', error);
    return null;
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (command === 'list') {
    await listFirestoreAdmins();
  } else if (command === 'find' && args[1]) {
    await findUserByEmail(args[1]);
  } else if (command === 'add' && args[1] && args[2] && args[3]) {
    await addFirestoreAdmin(args[1], args[2], args[3]);
  } else {
    console.log('Firestore Admin Management (for CDP authentication)');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/add-firestore-admin.js list                           - List current admins');
    console.log('  node scripts/add-firestore-admin.js find <email>                  - Find user by email');
    console.log('  node scripts/add-firestore-admin.js add <email> <name> <userId>   - Add admin user');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/add-firestore-admin.js list');
    console.log('  node scripts/add-firestore-admin.js find tagbajoh@gmail.com');
    console.log('  node scripts/add-firestore-admin.js add tagbajoh@gmail.com "Admin User" user123');
  }
  
  process.exit(0);
}

main().catch(console.error);