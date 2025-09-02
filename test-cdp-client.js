// Simple test for CDP API Client
const { CDPApiClient } = require('./lib/services/cdp-api-client.ts');

console.log('Testing CDP API Client...');

// Test configuration verification
const config = CDPApiClient.verifyConfiguration();
console.log('Configuration check:', config);

// Test supported networks
const networks = CDPApiClient.getSupportedNetworks();
console.log('Supported networks:', networks);

// Test network validation
console.log('Base network supported:', CDPApiClient.isNetworkSupported('base'));
console.log('Invalid network supported:', CDPApiClient.isNetworkSupported('invalid'));

console.log('CDP API Client implementation complete!');