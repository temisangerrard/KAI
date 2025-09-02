const { createHmac } = require('crypto');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing CDP API Authentication and Configuration...\n');

// Step 1: Check environment variables
console.log('1. Checking environment variables...');
const API_KEY_NAME = process.env.CDP_API_KEY_NAME;
const API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;

if (!API_KEY_NAME) {
  console.error('❌ CDP_API_KEY_NAME not found in environment');
  process.exit(1);
}

if (!API_KEY_SECRET) {
  console.error('❌ CDP_API_KEY_SECRET not found in environment');
  process.exit(1);
}

console.log('✅ Environment variables found:');
console.log(`   - CDP_API_KEY_NAME: ${API_KEY_NAME.substring(0, 8)}...`);
console.log(`   - CDP_API_KEY_SECRET: ${API_KEY_SECRET.substring(0, 10)}...`);
console.log();

// Step 2: Generate JWT token
console.log('2. Generating JWT token...');

function generateJWT() {
  const header = {
    alg: 'ES256',
    typ: 'JWT',
    kid: API_KEY_NAME
  };

  const payload = {
    iss: 'cdp',
    sub: API_KEY_NAME,
    aud: ['cdp_service'],
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60,
    iat: Math.floor(Date.now() / 1000)
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', Buffer.from(API_KEY_SECRET, 'base64'))
    .update(message)
    .digest('base64url');

  return `${message}.${signature}`;
}

try {
  const jwt = generateJWT();
  console.log('✅ JWT token generated successfully');
  console.log(`   Token: ${jwt.substring(0, 50)}...`);
  console.log();
} catch (error) {
  console.error('❌ JWT generation failed:', error.message);
  process.exit(1);
}

// Step 3: Test API call
console.log('3. Testing API authentication with CDP...');

function makeAPICall() {
  return new Promise((resolve, reject) => {
    const jwt = generateJWT();
    const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e';
    const path = `/v2/evm/token-balances/base/${testAddress}`;
    
    const options = {
      hostname: 'api.cdp.coinbase.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            resolve({ status: res.statusCode, data: response });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        } else {
          reject({ status: res.statusCode, message: data });
        }
      });
    });

    req.on('error', (error) => {
      reject({ error: error.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject({ error: 'Request timeout' });
    });

    req.end();
  });
}

makeAPICall()
  .then((result) => {
    console.log('✅ API authentication successful!');
    console.log(`   Status: ${result.status}`);
    if (result.data && result.data.balances) {
      console.log(`   Found ${result.data.balances.length} token balances`);
      if (result.data.balances.length > 0) {
        const token = result.data.balances[0];
        console.log(`   Sample token: ${token.token.symbol} - ${token.amount.amount}`);
      }
    }
    console.log();
    console.log('🎉 CDP API Authentication Test Complete!');
    console.log('✅ All checks passed - CDP API is ready for integration');
  })
  .catch((error) => {
    console.error('❌ API call failed:', error);
    if (error.status === 401) {
      console.error('   This indicates an authentication problem');
    } else if (error.status === 403) {
      console.error('   This indicates insufficient permissions');
    } else if (error.status === 404) {
      console.error('   This indicates the endpoint or resource was not found');
    }
    process.exit(1);
  });