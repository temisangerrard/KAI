/**
 * Script to make a CDP user admin
 * Usage: node scripts/make-cdp-user-admin.js <wallet_address> <email>
 */

const { makeCDPUserAdmin } = require('../lib/auth/admin-auth.ts');

async function main() {
  const walletAddress = process.argv[2];
  const email = process.argv[3];
  
  if (!walletAddress || !email) {
    console.error('Usage: node scripts/make-cdp-user-admin.js <wallet_address> <email>');
    process.exit(1);
  }
  
  console.log('🚀 Making CDP user admin...');
  console.log('Wallet Address:', walletAddress);
  console.log('Email:', email);
  
  try {
    const success = await makeCDPUserAdmin(walletAddress, email);
    
    if (success) {
      console.log('✅ Successfully made user admin!');
      console.log('The user can now access admin features.');
    } else {
      console.error('❌ Failed to make user admin.');
      console.error('Check that the wallet address exists in wallet_uid_mappings collection.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);