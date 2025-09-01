#!/usr/bin/env node

/**
 * Simple CDP API Test (JavaScript version)
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing CDP API Configuration...\n');

// Check environment variables
console.log('1. Checking environment variables...');
const apiKeyName = process.env.CDP_API_KEY_NAME;
const apiKeySecret = process.env.CDP_API_KEY_SECRET;

if (!apiKeyName) {
  console.error('❌ CDP_API_KEY_NAME not found in environment');
  process.exit(1);
}

if (!apiKeySecret) {
  console.error('❌ CDP_API_KEY_SECRET not found in environment');
  process.exit(1);
}

console.log('✅ Environment variables found:');
console.log(`   - CDP_API_KEY_NAME: ${apiKeyName.substring(0, 8)}...`);
console.log(`   - CDP_API_KEY_SECRET: ${apiKeySecret.substring(0, 10)}...`);
console.log();

// Test JWT generation
console.log('2. Testing JWT token generation...');
try {
  const crypto = require('crypto');
  
  const header = {
    alg: 'ES256',
    typ: 'JWT',
    kid: apiKeyName
  };

  const payload = {
    iss: 'cdp',
    sub: apiKeyName,
    aud: ['cdp_service'],
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60,
    iat: Math.floor(Date.now() / 1000)
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', Buffer.from(apiKeySecret, 'base64'))
    .update(message)
    .digest('base64url');

  const jwt = `${message}.${signature}`;
  
  console.log('✅ JWT token generated successfully');
  console.log(`   Token length: ${jwt.length} characters`);
  console.log();
  
  // Test API call
  console.log('3. Testing CDP API call...');
  
  const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e';
  const apiUrl = `https://api.cdp.coinbase.com/v2/evm/token-balances/base/${testAddress}`;
  
  fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  })
  .then(response => {
    console.log(`   API Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      return response.json();
    } else {
      return response.text().then(text => {
        throw new Error(`API Error: ${text}`);
      });
    }
  })
  .then(data => {
    console.log('✅ CDP API call successful!');
    console.log(`   Found ${data.balances?.length || 0} token balances`);
    
    if (data.balances && data.balances.length > 0) {
      console.log(`   Sample token: ${data.balances[0].token.symbol} (${data.balances[0].token.name})`);
    }
    
    console.log('\n🎉 CDP API Authentication Test Complete!');
    console.log('✅ All tests passed - CDP API is ready for integration');
  })
  .catch(error => {
    console.error('❌ CDP API call failed:', error.message);
    
    if (error.message.includes('401')) {
      console.error('   This indicates an authentication issue with the JWT token');
    } else if (error.message.includes('403')) {
      console.error('   This indicates insufficient permissions or invalid API key');
    } else if (error.message.includes('404')) {
      console.error('   This indicates the endpoint or address was not found');
    }
    
    process.exit(1);
  });

} catch (error) {
  console.error('❌ JWT generation failed:', error.message);
  process.exit(1);
}