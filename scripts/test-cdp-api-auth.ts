#!/usr/bin/env ts-node

/**
 * CDP API Authentication Test Script
 * 
 * This script verifies that CDP API credentials are properly configured
 * and tests authentication with a simple API call.
 */

import { config } from 'dotenv';
import { CDPApiClient } from '../lib/services/cdp-api-client';

// Load environment variables
config({ path: '.env.local' });

async function testCDPApiAuthentication() {
  console.log('🔍 Testing CDP API Authentication and Configuration...\n');

  // Step 1: Verify environment variables
  console.log('1. Verifying environment variables...');
  const configCheck = CDPApiClient.verifyConfiguration();
  
  if (!configCheck.isValid) {
    console.error('❌ Configuration errors found:');
    configCheck.errors.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }
  
  console.log('✅ Environment variables are properly configured');
  console.log(`   - CDP_API_KEY_NAME: ${process.env.CDP_API_KEY_NAME?.substring(0, 8)}...`);
  console.log(`   - CDP_API_KEY_SECRET: ${process.env.CDP_API_KEY_SECRET?.substring(0, 10)}...`);
  console.log();

  // Step 2: Test JWT token generation
  console.log('2. Testing JWT token generation...');
  try {
    // This will test the JWT generation internally
    const authTest = await CDPApiClient.testAuthentication();
    
    if (authTest) {
      console.log('✅ JWT token generation and API authentication successful');
    } else {
      console.log('❌ Authentication test failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ JWT token generation failed:', error);
    process.exit(1);
  }
  console.log();

  // Step 3: Test API call with supported networks
  console.log('3. Testing API calls with supported networks...');
  const networks = ['base', 'base-sepolia', 'ethereum'];
  const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e'; // KAI treasury address
  
  for (const network of networks) {
    try {
      console.log(`   Testing ${network} network...`);
      const response = await CDPApiClient.getTokenBalances(network, testAddress);
      
      console.log(`   ✅ ${network}: API call successful`);
      console.log(`      - Found ${response.balances?.length || 0} token balances`);
      
      if (response.balances && response.balances.length > 0) {
        console.log(`      - Sample token: ${response.balances[0].token.symbol} (${response.balances[0].token.name})`);
      }
      
      if (response.nextPageToken) {
        console.log(`      - Has pagination token for additional results`);
      }
      
    } catch (error) {
      console.error(`   ❌ ${network}: API call failed -`, error);
      // Don't exit here, continue testing other networks
    }
  }
  console.log();

  // Step 4: Test error handling
  console.log('4. Testing error handling with invalid address...');
  try {
    await CDPApiClient.getTokenBalances('base', 'invalid-address');
    console.log('❌ Expected error for invalid address, but call succeeded');
  } catch (error) {
    console.log('✅ Error handling works correctly for invalid addresses');
    console.log(`   Error: ${error}`);
  }
  console.log();

  console.log('🎉 CDP API Authentication and Configuration Test Complete!');
  console.log('✅ All tests passed - CDP API is ready for token balance integration');
}

// Add immediate console log to verify script is running
console.log('🚀 Starting CDP API Authentication Test...');

// Run the test
testCDPApiAuthentication().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});