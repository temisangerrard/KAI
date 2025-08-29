/**
 * Script to find users who have balances but no user profile
 * Run with: node scripts/find-missing-users.js
 */

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

async function findMissingUsers() {
  try {
    console.log('🔍 Finding missing users...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Get all users from Firestore
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = new Set(usersSnapshot.docs.map(doc => doc.id));
    console.log(`👥 Found ${users.size} users in 'users' collection`);

    // Get all user balances
    const balancesSnapshot = await getDocs(collection(db, 'user_balances'));
    const balanceUserIds = new Set(balancesSnapshot.docs.map(doc => doc.data().userId));
    console.log(`💰 Found ${balanceUserIds.size} users in 'user_balances' collection`);

    // Get all commitments
    const commitmentsSnapshot = await getDocs(collection(db, 'prediction_commitments'));
    const commitmentUserIds = new Set(commitmentsSnapshot.docs.map(doc => doc.data().userId));
    console.log(`🎯 Found ${commitmentUserIds.size} users in 'prediction_commitments' collection`);

    // Get all transactions
    const transactionsSnapshot = await getDocs(collection(db, 'token_transactions'));
    const transactionUserIds = new Set(transactionsSnapshot.docs.map(doc => doc.data().userId));
    console.log(`💳 Found ${transactionUserIds.size} users in 'token_transactions' collection`);

    // Find users who have activity but no profile
    const allActiveUserIds = new Set([...balanceUserIds, ...commitmentUserIds, ...transactionUserIds]);
    const missingUsers = [...allActiveUserIds].filter(userId => !users.has(userId));

    console.log(`\n📊 Analysis:`);
    console.log(`- Users with profiles: ${users.size}`);
    console.log(`- Users with activity: ${allActiveUserIds.size}`);
    console.log(`- Missing user profiles: ${missingUsers.length}`);

    if (missingUsers.length > 0) {
      console.log(`\n❌ Missing user profiles for:`);
      missingUsers.forEach((userId, index) => {
        console.log(`${index + 1}. ${userId}`);
      });

      // Show some details about these users
      console.log(`\n🔍 Details about missing users:`);
      for (const userId of missingUsers.slice(0, 3)) {
        const balance = balancesSnapshot.docs.find(doc => doc.data().userId === userId);
        const commitments = commitmentsSnapshot.docs.filter(doc => doc.data().userId === userId);
        const transactions = transactionsSnapshot.docs.filter(doc => doc.data().userId === userId);

        console.log(`\nUser: ${userId}`);
        console.log(`- Has balance: ${balance ? 'Yes' : 'No'}`);
        console.log(`- Commitments: ${commitments.length}`);
        console.log(`- Transactions: ${transactions.length}`);
      }
    } else {
      console.log(`\n✅ All active users have profiles!`);
    }

    // Total unique users across all collections
    const totalUniqueUsers = new Set([...users, ...allActiveUserIds]);
    console.log(`\n🎯 Total unique users across all collections: ${totalUniqueUsers.size}`);

  } catch (error) {
    console.error('❌ Error finding missing users:', error);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

findMissingUsers();