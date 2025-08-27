/**
 * Firebase Debug Utilities
 * Helper functions to test Firebase connectivity and configuration
 */

import { db } from '@/lib/db/database'
import { doc, getDoc, setDoc, collection, getDocs, query, limit } from 'firebase/firestore'

export interface FirebaseDebugResult {
  success: boolean
  error?: string
  details?: any
  timestamp: Date
}

/**
 * Test basic Firebase connection
 */
export async function testFirebaseConnection(): Promise<FirebaseDebugResult> {
  try {
    console.log('[FIREBASE_DEBUG] Testing Firebase connection...')
    
    // Try to read from a simple collection
    const testQuery = query(collection(db, 'markets'), limit(1))
    const snapshot = await getDocs(testQuery)
    
    console.log('[FIREBASE_DEBUG] Connection test successful')
    return {
      success: true,
      details: {
        documentsFound: snapshot.size,
        connectionTime: Date.now()
      },
      timestamp: new Date()
    }
  } catch (error) {
    console.error('[FIREBASE_DEBUG] Connection test failed:', error)
    return {
      success: false,
      error: error.message,
      details: {
        errorCode: error.code,
        errorStack: error.stack
      },
      timestamp: new Date()
    }
  }
}

/**
 * Test Firebase write operations
 */
export async function testFirebaseWrite(): Promise<FirebaseDebugResult> {
  try {
    console.log('[FIREBASE_DEBUG] Testing Firebase write operations...')
    
    const testDoc = doc(db, 'debug_test', 'connection_test')
    await setDoc(testDoc, {
      timestamp: new Date(),
      test: 'Firebase write test',
      success: true
    })
    
    console.log('[FIREBASE_DEBUG] Write test successful')
    return {
      success: true,
      details: {
        operation: 'write',
        documentPath: 'debug_test/connection_test'
      },
      timestamp: new Date()
    }
  } catch (error) {
    console.error('[FIREBASE_DEBUG] Write test failed:', error)
    return {
      success: false,
      error: error.message,
      details: {
        errorCode: error.code,
        errorStack: error.stack,
        operation: 'write'
      },
      timestamp: new Date()
    }
  }
}

/**
 * Test user balance service
 */
export async function testUserBalanceService(userId: string): Promise<FirebaseDebugResult> {
  try {
    console.log(`[FIREBASE_DEBUG] Testing user balance service for user: ${userId}`)
    
    const { TokenBalanceService } = await import('@/lib/services/token-balance-service')
    const balance = await TokenBalanceService.getUserBalance(userId)
    
    console.log('[FIREBASE_DEBUG] Balance service test successful:', balance)
    return {
      success: true,
      details: {
        balance,
        hasBalance: !!balance,
        availableTokens: balance?.availableTokens || 0
      },
      timestamp: new Date()
    }
  } catch (error) {
    console.error('[FIREBASE_DEBUG] Balance service test failed:', error)
    return {
      success: false,
      error: error.message,
      details: {
        errorCode: error.code,
        errorStack: error.stack,
        userId
      },
      timestamp: new Date()
    }
  }
}

/**
 * Run comprehensive Firebase debug tests
 */
export async function runFirebaseDebugSuite(userId?: string): Promise<{
  connection: FirebaseDebugResult
  write: FirebaseDebugResult
  balance?: FirebaseDebugResult
  overall: boolean
}> {
  console.log('[FIREBASE_DEBUG] Running comprehensive Firebase debug suite...')
  
  const results = {
    connection: await testFirebaseConnection(),
    write: await testFirebaseWrite(),
    balance: userId ? await testUserBalanceService(userId) : undefined,
    overall: false
  }
  
  results.overall = results.connection.success && results.write.success && 
    (results.balance ? results.balance.success : true)
  
  console.log('[FIREBASE_DEBUG] Debug suite completed:', {
    connection: results.connection.success,
    write: results.write.success,
    balance: results.balance?.success,
    overall: results.overall
  })
  
  return results
}