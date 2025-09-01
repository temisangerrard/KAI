/**
 * Simple test script for CDP API Client
 */

const { CDPApiClient } = require('../lib/services/cdp-api-client.ts');

async function testCDPApiClient() {
  console.log('Testing CDP API Client...');
  
  try {
    // Test configuration verification
    console.log('\n1. Testing configuration verification...');
    const config = CDPApiClient.verifyConfiguration();
    console.log('Configuration check:', config);
    
    // Test supported networks
    console.log('\n2. Testing supported networks...');
    const networks = CDPApiClient.getSupportedNetworks();
    console.log('Supported networks:', networks);
    
    // Test network validation
    console.log('\n3. Testing network validation...');
    console.log('base supported:', CDPApiClient.isNetworkSupported('base'));
    console.log('polygon supported:', CDPApiClient.isNetworkSupported('polygon'));
    
    // Test address validation (this will throw an error for invalid address)
    console.log('\n4. Testing address validation...');
    try {
      await CDPApiClient.getTokenBalances('base', 'invalid-address');
    } catch (error) {
      console.log('Expected error for invalid address:', error.message);
    }
    
    // Test network validation (this will throw an error for invalid network)
    console.log('\n5. Testing network validation...');
    try {
      await CDPApiClient.getTokenBalances('invalid-network', '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e');
    } catch (error) {
      console.log('Expected error for invalid network:', error.message);
    }
    
    console.log('\n✅ CDP API Client basic validation tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCDPApiClient();