/**
 * Token Database Test Script
 * Tests the token database utilities and services
 */

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import {
  TokenBalanceService,
  TokenTransactionService,
  TokenPackageService,
  PredictionCommitmentService
} from '@/lib/services/token-database'
import { BalanceReconciliationUtils } from '@/lib/utils/token-database-utils'

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

/**
 * Test user balance operations
 */
async function testBalanceOperations(): Promise<void> {
  console.log('🧪 Testing balance operations...')
  
  const testUserId = 'test_user_' + Date.now()
  
  try {
    // Test getting initial balance (should create one)
    console.log('  ✓ Testing initial balance creation...')
    const initialBalance = await TokenBalanceService.getUserBalance(testUserId)
    console.log(`    Initial balance: ${JSON.stringify(initialBalance)}`)
    
    // Test balance update - purchase
    console.log('  ✓ Testing balance update (purchase)...')
    const purchaseBalance = await TokenBalanceService.updateBalance({
      userId: testUserId,
      amount: 100,
      type: 'purchase',
      metadata: { packageId: 'test_package' }
    })
    console.log(`    After purchase: available=${purchaseBalance.availableTokens}, earned=${purchaseBalance.totalEarned}`)
    
    // Test balance validation
    console.log('  ✓ Testing balance validation...')
    const hasSufficientBalance = await TokenBalanceService.validateSufficientBalance(testUserId, 50)
    console.log(`    Has sufficient balance for 50 tokens: ${hasSufficientBalance}`)
    
    // Test balance update - commit
    console.log('  ✓ Testing balance update (commit)...')
    const commitBalance = await TokenBalanceService.updateBalance({
      userId: testUserId,
      amount: 30,
      type: 'commit',
      relatedId: 'test_prediction',
      metadata: { position: 'yes' }
    })
    console.log(`    After commit: available=${commitBalance.availableTokens}, committed=${commitBalance.committedTokens}`)
    
    console.log('✅ Balance operations test completed successfully')
  } catch (error) {
    console.error('❌ Balance operations test failed:', error)
    throw error
  }
}

/**
 * Test transaction operations
 */
async function testTransactionOperations(): Promise<void> {
  console.log('🧪 Testing transaction operations...')
  
  const testUserId = 'test_user_' + Date.now()
  
  try {
    // Create some test transactions through balance updates
    await TokenBalanceService.updateBalance({
      userId: testUserId,
      amount: 200,
      type: 'purchase',
      metadata: { packageId: 'starter_pack' }
    })
    
    await TokenBalanceService.updateBalance({
      userId: testUserId,
      amount: 50,
      type: 'commit',
      relatedId: 'prediction_1',
      metadata: { position: 'yes' }
    })
    
    // Test getting user transactions
    console.log('  ✓ Testing transaction history retrieval...')
    const { transactions } = await TokenTransactionService.getUserTransactions(testUserId)
    console.log(`    Found ${transactions.length} transactions`)
    
    // Test getting transactions by type
    console.log('  ✓ Testing transactions by type...')
    const purchaseTransactions = await TokenTransactionService.getTransactionsByType(testUserId, 'purchase')
    console.log(`    Found ${purchaseTransactions.length} purchase transactions`)
    
    console.log('✅ Transaction operations test completed successfully')
  } catch (error) {
    console.error('❌ Transaction operations test failed:', error)
    throw error
  }
}

/**
 * Test token package operations
 */
async function testPackageOperations(): Promise<void> {
  console.log('🧪 Testing package operations...')
  
  try {
    // Test getting active packages
    console.log('  ✓ Testing active packages retrieval...')
    const packages = await TokenPackageService.getActivePackages()
    console.log(`    Found ${packages.length} active packages`)
    
    if (packages.length > 0) {
      // Test getting specific package
      console.log('  ✓ Testing specific package retrieval...')
      const firstPackage = await TokenPackageService.getPackage(packages[0].id)
      console.log(`    Retrieved package: ${firstPackage?.name}`)
    }
    
    console.log('✅ Package operations test completed successfully')
  } catch (error) {
    console.error('❌ Package operations test failed:', error)
    throw error
  }
}

/**
 * Test prediction commitment operations
 */
async function testCommitmentOperations(): Promise<void> {
  console.log('🧪 Testing commitment operations...')
  
  const testUserId = 'test_user_' + Date.now()
  const testPredictionId = 'test_prediction_' + Date.now()
  
  try {
    // First, give the user some tokens
    await TokenBalanceService.updateBalance({
      userId: testUserId,
      amount: 100,
      type: 'purchase',
      metadata: { packageId: 'test_package' }
    })
    
    // Test creating a commitment
    console.log('  ✓ Testing commitment creation...')
    const commitmentId = await PredictionCommitmentService.createCommitment({
      userId: testUserId,
      predictionId: testPredictionId,
      tokensCommitted: 25,
      position: 'yes',
      odds: 2.5,
      potentialWinning: 62.5,
      status: 'active'
    })
    console.log(`    Created commitment: ${commitmentId}`)
    
    // Test getting user commitments
    console.log('  ✓ Testing user commitments retrieval...')
    const userCommitments = await PredictionCommitmentService.getUserCommitments(testUserId)
    console.log(`    Found ${userCommitments.length} user commitments`)
    
    // Test getting prediction commitments
    console.log('  ✓ Testing prediction commitments retrieval...')
    const predictionCommitments = await PredictionCommitmentService.getPredictionCommitments(testPredictionId)
    console.log(`    Found ${predictionCommitments.length} prediction commitments`)
    
    console.log('✅ Commitment operations test completed successfully')
  } catch (error) {
    console.error('❌ Commitment operations test failed:', error)
    throw error
  }
}

/**
 * Test balance reconciliation
 */
async function testBalanceReconciliation(): Promise<void> {
  console.log('🧪 Testing balance reconciliation...')
  
  const testUserId = 'test_user_' + Date.now()
  
  try {
    // Create some transactions
    await TokenBalanceService.updateBalance({
      userId: testUserId,
      amount: 150,
      type: 'purchase',
      metadata: { packageId: 'test_package' }
    })
    
    // Test detecting inconsistencies (should be none for fresh data)
    console.log('  ✓ Testing inconsistency detection...')
    const inconsistencies = await BalanceReconciliationUtils.detectBalanceInconsistencies(testUserId)
    console.log(`    Has inconsistencies: ${inconsistencies.hasInconsistencies}`)
    
    if (inconsistencies.hasInconsistencies) {
      console.log(`    Discrepancies: ${inconsistencies.discrepancies.join(', ')}`)
      
      // Test fixing inconsistencies
      console.log('  ✓ Testing inconsistency fixing...')
      const fixedBalance = await BalanceReconciliationUtils.fixBalanceInconsistencies(testUserId)
      console.log(`    Fixed balance: available=${fixedBalance.availableTokens}`)
    }
    
    console.log('✅ Balance reconciliation test completed successfully')
  } catch (error) {
    console.error('❌ Balance reconciliation test failed:', error)
    throw error
  }
}

/**
 * Run all tests
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Token Database Tests...\n')
  
  try {
    await testBalanceOperations()
    console.log('')
    
    await testTransactionOperations()
    console.log('')
    
    await testPackageOperations()
    console.log('')
    
    await testCommitmentOperations()
    console.log('')
    
    await testBalanceReconciliation()
    console.log('')
    
    console.log('🎉 All tests completed successfully!')
    
  } catch (error) {
    console.error('\n💥 Tests failed:', error)
    process.exit(1)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Tests failed:', error)
      process.exit(1)
    })
}

export { runAllTests }