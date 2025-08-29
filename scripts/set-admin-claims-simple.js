/**
 * Simple script to set admin claims using Firebase Admin SDK
 * Run with: node scripts/set-admin-claims-simple.js <command> [email]
 */

const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin SDK
function initializeAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Try different initialization methods
  try {
    // Option 1: Service account key from environment
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }

    // Option 2: Individual fields
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }

    // Option 3: Default credentials (for development)
    console.warn('⚠️  Using default credentials for development');
    return admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error.message);
    console.log('\n💡 Setup Help:');
    console.log('1. Make sure your .env.local has Firebase configuration');
    console.log('2. For production, add FIREBASE_SERVICE_ACCOUNT_KEY');
    console.log('3. For development, you can use the Firebase emulator');
    process.exit(1);
  }
}

async function setAdminClaims(email) {
  try {
    const app = initializeAdmin();
    const auth = admin.auth(app);

    console.log(`Looking for user with email: ${email}`);
    
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.displayName || 'Unknown'} (${userRecord.uid})`);
    
    // Set admin claims
    await auth.setCustomUserClaims(userRecord.uid, { 
      admin: true,
      role: 'admin'
    });
    
    console.log(`✅ Admin claims granted to ${userRecord.displayName || userRecord.email}`);
    console.log(`User ID: ${userRecord.uid}`);
    console.log(`Email: ${userRecord.email}`);
    
    // Force token refresh for this user
    await auth.revokeRefreshTokens(userRecord.uid);
    console.log(`🔄 User will need to log out and back in to see admin access`);
    
  } catch (error) {
    console.error('Error setting admin claims:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log(`❌ No user found with email: ${email}`);
      console.log('Make sure the user has signed up to the app first.');
    }
  }
}

async function listAdminUsers() {
  try {
    const app = initializeAdmin();
    const auth = admin.auth(app);
    
    console.log('Current admin users:');
    const listUsersResult = await auth.listUsers();
    const adminUsers = listUsersResult.users.filter(user => 
      user.customClaims?.admin === true
    );
    
    if (adminUsers.length === 0) {
      console.log('No admin users found.');
      return;
    }
    
    adminUsers.forEach(user => {
      console.log(`- ${user.displayName || 'Unknown'} (${user.email})`);
      console.log(`  UID: ${user.uid}`);
      console.log(`  Disabled: ${user.disabled ? 'Yes' : 'No'}`);
      console.log(`  Claims: ${JSON.stringify(user.customClaims)}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error listing admin users:', error.message);
  }
}

async function removeAdminClaims(email) {
  try {
    const app = initializeAdmin();
    const auth = admin.auth(app);
    
    console.log(`Looking for user with email: ${email}`);
    
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.displayName || 'Unknown'} (${userRecord.uid})`);
    
    // Remove admin claims
    await auth.setCustomUserClaims(userRecord.uid, { 
      admin: false,
      role: 'user'
    });
    
    console.log(`✅ Admin claims removed from ${userRecord.displayName || userRecord.email}`);
    
    // Force token refresh
    await auth.revokeRefreshTokens(userRecord.uid);
    console.log(`🔄 User's admin access has been revoked`);
    
  } catch (error) {
    console.error('Error removing admin claims:', error.message);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];
const email = args[1];

async function main() {
  if (command === 'set' && email) {
    await setAdminClaims(email);
  } else if (command === 'remove' && email) {
    await removeAdminClaims(email);
  } else if (command === 'list') {
    await listAdminUsers();
  } else {
    console.log('Firebase Admin SDK - Admin Claims Management');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/set-admin-claims-simple.js set <email>     - Grant admin claims');
    console.log('  node scripts/set-admin-claims-simple.js remove <email>  - Remove admin claims');
    console.log('  node scripts/set-admin-claims-simple.js list            - List current admins');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/set-admin-claims-simple.js set admin@example.com');
    console.log('  node scripts/set-admin-claims-simple.js remove admin@example.com');
    console.log('  node scripts/set-admin-claims-simple.js list');
    console.log('');
    console.log('Note: Users will need to log out and back in after claim changes.');
  }
  
  process.exit(0);
}

main().catch(console.error);