// Script to set admin claims for a user
// Run this with: node scripts/set-admin-user.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up service account)
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   projectId: 'your-project-id'
// });

async function setAdminClaim(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      role: 'admin'
    });
    
    console.log(`✅ Admin claims set for user: ${email}`);
    console.log(`User ID: ${user.uid}`);
  } catch (error) {
    console.error('❌ Error setting admin claims:', error);
  }
}

// Usage: Replace with your admin email
// setAdminClaim('your-admin@example.com');

module.exports = { setAdminClaim };