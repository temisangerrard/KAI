#!/usr/bin/env node

/**
 * Simple script to fix a specific orphaned CDP user
 * Usage: node scripts/fix-specific-user.js <wallet-address>
 */

const walletAddress = process.argv[2];

if (!walletAddress) {
  console.error('❌ Please provide a wallet address');
  console.error('Usage: node scripts/fix-specific-user.js <wallet-address>');
  process.exit(1);
}

console.log(`🔧 Attempting to fix orphaned user: ${walletAddress}`);

// Make a request to the local API
fetch('http://localhost:3000/api/admin/users/recover', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ walletAddress })
})
.then(response => response.json())
.then(data => {
  console.log('📊 Response:', data);
  
  if (data.success) {
    console.log('✅ Recovery completed successfully');
    console.log(`   Recovered: ${data.result.recovered}`);
    console.log(`   Failed: ${data.result.failed}`);
  } else {
    console.log('❌ Recovery failed:', data.message);
  }
})
.catch(error => {
  console.error('💥 Request failed:', error);
});