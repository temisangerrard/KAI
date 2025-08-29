/**
 * Script to set admin claims using Firebase Admin SDK
 * Run with: node scripts/set-admin-claims.js <command> [email]
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function setAdminClaims(email) {
  try {
    // Import Firebase Admin SDK - need to use the compiled version
    const { adminAuth } = await import('../lib/firebase-admin.js');
    
    console.log(`Looking for user with email: ${email}`);
    
    // Get user by email
    const userRecord = await adminAuth.getUserByEmail(email);
    if (!userRecord) {
      console.error(`❌ No user found with email: ${email}`);
      return;
    }
    
    console.log(`Found user: ${userRecord.displayName || 'Unknown'} (${userRecord.uid})`);
    
    // Set admin claims
    await adminAuth.setCustomUserClaims(userRecord.uid, { 
      admin: true,
      role: 'admin'
    });
    
    console.log(`✅ Admin claims granted to ${userRecord.displayName || userRecord.email}`);
    console.log(`User ID: ${userRecord.uid}`);
    console.log(`Email: ${userRecord.email}`);
    
    // Force token refresh for this user
    await adminAuth.revokeRefreshTokens(userRecord.uid);
    console.log(`🔄 User will need to refresh their session to see admin access`);
    
  } catch (error) {
    console.error('Error setting admin claims:', error.message);
    
    if (error.message.includes('credentials')) {
      console.log('\n💡 Setup Help:');
      console.log('1. Make sure your .env.local file has the correct Firebase config');
      console.log('2. For production, set up a service account key');
      console.log('3. Check the Firebase Admin SDK setup in lib/firebase-admin.ts');
    }
  }
}

async function listAdminUsers() {
  try {
    const { adminAuth } = await import('../lib/firebase-admin.js');
    
    console.log('Current admin users:');
    const listUsersResult = await adminAuth.listUsers();
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
    const { adminAuth } = await import('../lib/firebase-admin.js');
    
    console.log(`Looking for user with email: ${email}`);
    
    const userRecord = await adminAuth.getUserByEmail(email);
    if (!userRecord) {
      console.error(`❌ No user found with email: ${email}`);
      return;
    }
    
    console.log(`Found user: ${userRecord.displayName || 'Unknown'} (${userRecord.uid})`);
    
    // Remove admin claims
    await adminAuth.setCustomUserClaims(userRecord.uid, { 
      admin: false,
      role: 'user'
    });
    
    console.log(`✅ Admin claims removed from ${userRecord.displayName || userRecord.email}`);
    
    // Force token refresh
    await adminAuth.revokeRefreshTokens(userRecord.uid);
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
    console.log('  node scripts/set-admin-claims.js set <email>     - Grant admin claims');
    console.log('  node scripts/set-admin-claims.js remove <email>  - Remove admin claims');
    console.log('  node scripts/set-admin-claims.js list            - List current admins');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/set-admin-claims.js set admin@example.com');
    console.log('  node scripts/set-admin-claims.js remove admin@example.com');
    console.log('  node scripts/set-admin-claims.js list');
    console.log('');
    console.log('Note: Users will need to refresh their session after claim changes.');
  }
  
  process.exit(0);
}

main().catch(console.error);