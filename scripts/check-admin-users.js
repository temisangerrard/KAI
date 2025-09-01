const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkAdminUsers() {
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

checkAdminUsers();