// Test actual CDP API call
const crypto = require('crypto');

// Test CDP API authentication and token balance call
async function testCDPAPI() {
  console.log('🔍 Testing CDP API integration...\n');

  // Check environment variables
  const apiKeyName = process.env.CDP_API_KEY_NAME;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;

  if (!apiKeyName || !apiKeySecret) {
    console.log('❌ Missing CDP API credentials');
    console.log('   CDP_API_KEY_NAME:', apiKeyName ? '✓ Set' : '✗ Missing');
    console.log('   CDP_API_KEY_SECRET:', apiKeySecret ? '✓ Set' : '✗ Missing');
    return;
  }

  console.log('✓ CDP API credentials found');

  // Generate JWT token (simplified version)
  function generateJWT() {
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

    return `${message}.${signature}`;
  }

  try {
    const jwt = generateJWT();
    console.log('✓ JWT token generated');

    // Test API call to base network with KAI treasury address
    const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e';
    const network = 'base';
    const url = `https://api.cdp.coinbase.com/v2/evm/token-balances/${network}/${testAddress}`;

    console.log(`🌐 Testing API call: GET ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API call successful!');
      console.log(`📊 Found ${data.balances?.length || 0} token balances`);
      
      if (data.balances && data.balances.length > 0) {
        console.log('\n🪙 Sample tokens:');
        data.balances.slice(0, 3).forEach((token, i) => {
          console.log(`   ${i + 1}. ${token.token.symbol} (${token.token.name})`);
          console.log(`      Balance: ${token.amount.amount} (${token.amount.decimals} decimals)`);
          console.log(`      Contract: ${token.token.contractAddress}`);
        });
      }

      if (data.nextPageToken) {
        console.log(`📄 Has more pages (nextPageToken: ${data.nextPageToken.substring(0, 20)}...)`);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API call failed');
      console.log(`   Error: ${errorText}`);
    }

  } catch (error) {
    console.log('❌ Error during API test:', error.message);
  }
}

testCDPAPI();