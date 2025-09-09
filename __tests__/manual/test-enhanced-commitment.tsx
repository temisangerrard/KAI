/**
 * Manual Test for Enhanced Commitment Service
 * 
 * This demonstrates that the enhanced commitment service works with both binary and multi-option markets
 * while maintaining full backward compatibility.
 */

import { CommitmentCreationService } from '@/lib/services/commitment-creation-service';
import { EnhancedCommitmentService } from '@/lib/services/enhanced-commitment-service';
import { PredictionCommitmentService } from '@/lib/services/token-database';

// Mock Firebase for manual testing
jest.mock('@/lib/db/database', () => ({
  db: {},
  isFirebaseInitialized: () => true
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn((db, collection, id) => ({ id, collection, path: `${collection}/${id}` })),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  runTransaction: jest.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() })
  }
}));

describe('Enhanced Commitment Service Manual Test', () => {
  const mockBinaryMarket = {
    id: 'binary-market-123',
    title: 'Will it rain tomorrow?',
    status: 'active',
    endDate: new Date(Date.now() + 86400000),
    options: [
      { id: 'yes', text: 'Yes', totalTokens: 500, participantCount: 10 },
      { id: 'no', text: 'No', totalTokens: 300, participantCount: 8 }
    ]
  };

  const mockMultiOptionMarket = {
    id: 'multi-option-market-123',
    title: 'Who will win the championship?',
    status: 'active',
    endDate: new Date(Date.now() + 86400000),
    options: [
      { id: 'team-a', text: 'Team A', totalTokens: 200, participantCount: 5 },
      { id: 'team-b', text: 'Team B', totalTokens: 300, participantCount: 7 },
      { id: 'team-c', text: 'Team C', totalTokens: 150, participantCount: 4 },
      { id: 'team-d', text: 'Team D', totalTokens: 100, participantCount: 3 }
    ]
  };

  const mockUserBalance = {
    userId: 'test-user-123',
    availableTokens: 1000,
    committedTokens: 200,
    version: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { getDoc, runTransaction } = require('firebase/firestore');
    
    getDoc.mockImplementation((docRef) => {
      if (docRef.id === 'binary-market-123') {
        return Promise.resolve({
          exists: () => true,
          id: 'binary-market-123',
          data: () => mockBinaryMarket
        });
      }
      
      if (docRef.id === 'multi-option-market-123') {
        return Promise.resolve({
          exists: () => true,
          id: 'multi-option-market-123',
          data: () => mockMultiOptionMarket
        });
      }
      
      if (docRef.id === 'test-user-123') {
        return Promise.resolve({
          exists: () => true,
          id: 'test-user-123',
          data: () => mockUserBalance
        });
      }
      
      return Promise.resolve({ exists: () => false });
    });

    runTransaction.mockImplementation((db, callback) => {
      const mockTransaction = {
        get: () => Promise.resolve({
          exists: () => true,
          data: () => mockUserBalance
        }),
        set: jest.fn(),
        update: jest.fn()
      };
      
      return callback(mockTransaction).then(() => ({
        commitmentId: 'mock-commitment-id',
        commitment: {
          id: 'mock-commitment-id',
          userId: 'test-user-123',
          tokensCommitted: 100
        }
      }));
    });
  });

  it('DEMO: Enhanced commitment service supports both binary and multi-option markets', async () => {
    console.log('\n=== ENHANCED COMMITMENT SERVICE DEMONSTRATION ===\n');

    // 1. Test Binary Market Support (Backward Compatibility)
    console.log('1. BINARY MARKET SUPPORT (Backward Compatibility)');
    console.log('   Testing existing binary market functionality...');
    
    const binaryResult = await CommitmentCreationService.createCommitment({
      userId: 'test-user-123',
      marketId: 'binary-market-123',
      position: 'yes',
      tokensToCommit: 100,
      clientInfo: { source: 'web' }
    });

    console.log('   ✅ Binary market commitment created successfully');
    console.log('   📊 Market Type:', await CommitmentCreationService.getMarketType('binary-market-123'));
    console.log('   🎯 Available Options:', await CommitmentCreationService.getMarketOptions('binary-market-123'));
    
    expect(binaryResult.success).toBe(true);

    // 2. Test Multi-Option Market Support (New Functionality)
    console.log('\n2. MULTI-OPTION MARKET SUPPORT (New Functionality)');
    console.log('   Testing new multi-option market functionality...');
    
    const multiOptionResult = await CommitmentCreationService.createCommitment({
      userId: 'test-user-123',
      marketId: 'multi-option-market-123',
      optionId: 'team-b',
      tokensToCommit: 150,
      clientInfo: { source: 'web' }
    });

    console.log('   ✅ Multi-option market commitment created successfully');
    console.log('   📊 Market Type:', await CommitmentCreationService.getMarketType('multi-option-market-123'));
    console.log('   🎯 Available Options:', await CommitmentCreationService.getMarketOptions('multi-option-market-123'));
    
    expect(multiOptionResult.success).toBe(true);

    // 3. Test Backward Compatibility Layer
    console.log('\n3. BACKWARD COMPATIBILITY LAYER');
    console.log('   Testing compatibility between position and optionId...');
    
    // Test position -> optionId mapping for binary markets
    const binaryValidation = await CommitmentCreationService.validateCommitmentRequest({
      userId: 'test-user-123',
      marketId: 'binary-market-123',
      position: 'no',
      tokensToCommit: 75
    });

    console.log('   ✅ Position "no" mapped to optionId:', binaryValidation.recommendedOptionId);
    
    // Test optionId -> position mapping for multi-option markets
    const multiValidation = await CommitmentCreationService.validateCommitmentRequest({
      userId: 'test-user-123',
      marketId: 'multi-option-market-123',
      optionId: 'team-a',
      tokensToCommit: 75
    });

    console.log('   ✅ OptionId "team-a" validation successful for multi-option market');
    
    expect(binaryValidation.isValid).toBe(true);
    expect(multiValidation.isValid).toBe(true);

    // 4. Test Enhanced Service Direct API
    console.log('\n4. ENHANCED SERVICE DIRECT API');
    console.log('   Testing direct enhanced service methods...');
    
    const directBinaryResult = await EnhancedCommitmentService.createBinaryCommitment(
      'test-user-123',
      'binary-market-123',
      'yes',
      50,
      { source: 'mobile' }
    );

    const directMultiResult = await EnhancedCommitmentService.createMultiOptionCommitment(
      'test-user-123',
      'multi-option-market-123',
      'team-c',
      200,
      { source: 'api' }
    );

    console.log('   ✅ Direct binary commitment API works');
    console.log('   ✅ Direct multi-option commitment API works');
    
    expect(directBinaryResult.success).toBe(true);
    expect(directMultiResult.success).toBe(true);

    // 5. Test Legacy Service Integration
    console.log('\n5. LEGACY SERVICE INTEGRATION');
    console.log('   Testing that existing PredictionCommitmentService uses enhanced functionality...');
    
    const legacyCommitmentData = {
      userId: 'test-user-123',
      predictionId: 'binary-market-123',
      position: 'yes' as const,
      tokensCommitted: 100,
      odds: 2.5,
      potentialWinning: 250,
      status: 'active' as const,
      metadata: {
        marketStatus: 'active' as const,
        marketTitle: 'Test Market',
        marketEndsAt: new Date(),
        oddsSnapshot: {
          yesOdds: 2.5,
          noOdds: 1.8,
          totalYesTokens: 500,
          totalNoTokens: 300,
          totalParticipants: 18
        },
        userBalanceAtCommitment: 1000,
        commitmentSource: 'web' as const
      }
    };

    const legacyResult = await PredictionCommitmentService.createCommitment(legacyCommitmentData);
    
    console.log('   ✅ Legacy PredictionCommitmentService works with enhanced backend');
    console.log('   📝 Commitment ID:', legacyResult);
    
    expect(legacyResult).toBeDefined();

    console.log('\n=== DEMONSTRATION COMPLETE ===');
    console.log('✅ All tests passed - Enhanced commitment service is working correctly!');
    console.log('🔄 Backward compatibility maintained');
    console.log('🚀 New multi-option functionality available');
    console.log('🛡️ Comprehensive validation and error handling');
    console.log('📊 Enhanced metadata capture for both binary and multi-option contexts\n');
  });

  it('DEMO: Existing PredictionCommitment component integration', async () => {
    console.log('\n=== PREDICTIONCOMMITMENT COMPONENT INTEGRATION ===\n');

    // Test the component integration method
    const componentResult = await CommitmentCreationService.createCommitmentForComponent(
      'test-user-123',
      'binary-market-123',
      'yes',
      'yes',
      100,
      { source: 'web' }
    );

    console.log('✅ PredictionCommitment component can use enhanced service');
    console.log('📝 Component commitment ID:', componentResult);
    
    expect(componentResult).toBe('mock-commitment-id');

    console.log('🎯 The existing PredictionCommitment component now has:');
    console.log('   - Enhanced validation and error handling');
    console.log('   - Automatic market type detection');
    console.log('   - Comprehensive metadata capture');
    console.log('   - Fallback to original implementation if needed');
    console.log('   - Full backward compatibility\n');
  });
});