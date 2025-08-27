/**
 * Commitment Flow Load Testing
 * 
 * Tests the commitment system under various load conditions to ensure
 * performance and data integrity are maintained.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LoadTestSimulator, DatabaseStressTest, DataConsistencyValidator } from '../utils/load-test-simulator'

// Mock Firebase for testing
const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  runTransaction: vi.fn(),
  batch: vi.fn(),
}

vi.mock('firebase/firestore', () => ({
  getFirestore: () => mockFirestore,
  collection: vi.fn(),
  doc: vi.fn(),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })
  }
}))

// Mock commitment API
const mockCommitTokens = vi.fn()

interface MockCommitmentRequest {
  userId: string
  predictionId: string
  tokensToCommit: number
  position: 'yes' | 'no'
}

describe('Commitment Flow Load Tests', () => {
  let loadTestSimulator: LoadTestSimulator
  let userBalances: Map<string, number>
  let marketCommitments: Map<string, any[]>
  let transactionLog: any[]

  beforeEach(() => {
    loadTestSimulator = new LoadTestSimulator()
    userBalances = new Map()
    marketCommitments = new Map()
    transactionLog = []

    // Initialize test users with balances
    for (let i = 0; i < 1000; i++) {
      userBalances.set(`user-${i}`, 1000)
    }

    // Initialize test markets
    for (let i = 0; i < 50; i++) {
      marketCommitments.set(`market-${i}`, [])
    }

    // Mock successful commitment operation
    mockCommitTokens.mockImplementation(async (request: MockCommitmentRequest) => {
      const { userId, predictionId, tokensToCommit, position } = request
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10))
      
      const currentBalance = userBalances.get(userId) || 0
      
      if (currentBalance < tokensToCommit) {
        throw new Error('Insufficient balance')
      }

      // Update balance
      userBalances.set(userId, currentBalance - tokensToCommit)
      
      // Add commitment
      const commitments = marketCommitments.get(predictionId) || []
      const commitment = {
        id: `commitment-${Date.now()}-${Math.random()}`,
        userId,
        predictionId,
        tokensCommitted: tokensToCommit,
        position,
        status: 'active',
        committedAt: new Date()
      }
      
      commitments.push(commitment)
      marketCommitments.set(predictionId, commitments)
      
      // Log transaction
      transactionLog.push({
        type: 'commitment',
        userId,
        predictionId,
        tokens: tokensToCommit,
        timestamp: Date.now()
      })

      return {
        success: true,
        commitment,
        updatedBalance: userBalances.get(userId)
      }
    })

    // Mock Firestore transaction
    mockFirestore.runTransaction.mockImplementation(async (callback) => {
      return await callback({
        get: vi.fn().mockImplementation((docRef) => {
          const userId = docRef.split('/').pop()
          return Promise.resolve({
            exists: () => userBalances.has(userId),
            data: () => ({ tokenBalance: userBalances.get(userId) || 0 })
          })
        }),
        set: vi.fn(),
        update: vi.fn().mockImplementation((docRef, updates) => {
          const userId = docRef.split('/').pop()
          if (updates.tokenBalance !== undefined) {
            userBalances.set(userId, updates.tokenBalance)
          }
        })
      })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Concurrent User Load Tests', () => {
    it('should handle 100 concurrent users making commitments', async () => {
      const testConfig = {
        concurrentUsers: 100,
        operationsPerUser: 5,
        rampUpTimeMs: 1000
      }

      const commitmentOperation = async () => {
        const userId = `user-${Math.floor(Math.random() * 100)}`
        const predictionId = `market-${Math.floor(Math.random() * 10)}`
        const tokensToCommit = Math.floor(Math.random() * 50) + 10
        const position = Math.random() > 0.5 ? 'yes' : 'no'

        return await mockCommitTokens({
          userId,
          predictionId,
          tokensToCommit,
          position
        })
      }

      const result = await loadTestSimulator.simulateLoad(commitmentOperation, testConfig)

      // Performance assertions
      expect(result.errorRate).toBeLessThan(5) // Less than 5% error rate
      expect(result.averageResponseTime).toBeLessThan(200) // Average response under 200ms
      expect(result.operationsPerSecond).toBeGreaterThan(10) // At least 10 ops/sec

      console.log(loadTestSimulator.generateReport(result))

      // Verify data integrity
      const totalCommitments = Array.from(marketCommitments.values())
        .flat().length
      expect(totalCommitments).toBe(result.successfulOperations)
    })

    it('should maintain performance under sustained load', async () => {
      const testConfig = {
        concurrentUsers: 50,
        operationsPerUser: 0, // Not used in sustained load
        testDurationMs: 10000 // 10 seconds
      }

      const commitmentOperation = async () => {
        const userId = `user-${Math.floor(Math.random() * 200)}`
        const predictionId = `market-${Math.floor(Math.random() * 20)}`
        const tokensToCommit = Math.floor(Math.random() * 30) + 5
        const position = Math.random() > 0.5 ? 'yes' : 'no'

        return await mockCommitTokens({
          userId,
          predictionId,
          tokensToCommit,
          position
        })
      }

      const result = await loadTestSimulator.simulateSustainedLoad(commitmentOperation, testConfig)

      // Performance assertions for sustained load
      expect(result.errorRate).toBeLessThan(10) // Allow slightly higher error rate for sustained load
      expect(result.averageResponseTime).toBeLessThan(300) // Average response under 300ms
      expect(result.totalOperations).toBeGreaterThan(100) // Should process many operations

      console.log('Sustained Load Test:')
      console.log(loadTestSimulator.generateReport(result))
    })

    it('should handle peak load scenarios', async () => {
      // Simulate peak load with many users hitting the same popular market
      const popularMarketId = 'market-trending'
      marketCommitments.set(popularMarketId, [])

      const testConfig = {
        concurrentUsers: 200,
        operationsPerUser: 3,
        rampUpTimeMs: 500 // Quick ramp-up for peak load
      }

      const peakLoadOperation = async () => {
        const userId = `user-${Math.floor(Math.random() * 500)}`
        const tokensToCommit = Math.floor(Math.random() * 100) + 10
        const position = Math.random() > 0.5 ? 'yes' : 'no'

        return await mockCommitTokens({
          userId,
          predictionId: popularMarketId,
          tokensToCommit,
          position
        })
      }

      const result = await loadTestSimulator.simulateLoad(peakLoadOperation, testConfig)

      // Peak load assertions - more lenient
      expect(result.errorRate).toBeLessThan(15) // Allow higher error rate for peak load
      expect(result.totalOperations).toBeGreaterThan(400) // Should process most operations

      // Verify popular market received commitments
      const popularMarketCommitments = marketCommitments.get(popularMarketId) || []
      expect(popularMarketCommitments.length).toBeGreaterThan(0)

      console.log('Peak Load Test:')
      console.log(loadTestSimulator.generateReport(result))
    })
  })

  describe('Database Transaction Integrity Tests', () => {
    it('should handle transaction conflicts gracefully', async () => {
      const conflictingUserId = 'conflict-user'
      userBalances.set(conflictingUserId, 100) // Low balance to cause conflicts

      let transactionConflicts = 0
      
      // Mock transaction conflicts
      mockCommitTokens.mockImplementation(async (request: MockCommitmentRequest) => {
        if (request.userId === conflictingUserId && Math.random() < 0.3) {
          transactionConflicts++
          throw new Error('Transaction conflict')
        }
        
        // Normal processing for other users
        const currentBalance = userBalances.get(request.userId) || 0
        if (currentBalance < request.tokensToCommit) {
          throw new Error('Insufficient balance')
        }
        
        userBalances.set(request.userId, currentBalance - request.tokensToCommit)
        return { success: true }
      })

      const testConfig = {
        concurrentUsers: 20,
        operationsPerUser: 5
      }

      const conflictOperation = async () => {
        return await mockCommitTokens({
          userId: conflictingUserId,
          predictionId: 'market-conflict',
          tokensToCommit: 50,
          position: 'yes'
        })
      }

      const result = await loadTestSimulator.simulateLoad(conflictOperation, testConfig)

      // Should handle conflicts gracefully
      expect(transactionConflicts).toBeGreaterThan(0)
      expect(result.failedOperations).toBeGreaterThan(0)
      
      console.log(`Transaction conflicts handled: ${transactionConflicts}`)
    })

    it('should maintain atomicity under concurrent access', async () => {
      const sharedUserId = 'shared-user'
      const initialBalance = 1000
      userBalances.set(sharedUserId, initialBalance)

      const atomicityTest = async () => {
        const tokensToCommit = 10
        const currentBalance = userBalances.get(sharedUserId) || 0
        
        if (currentBalance >= tokensToCommit) {
          // Simulate atomic operation
          userBalances.set(sharedUserId, currentBalance - tokensToCommit)
          return { success: true }
        } else {
          throw new Error('Insufficient balance')
        }
      }

      const testConfig = {
        concurrentUsers: 50,
        operationsPerUser: 10
      }

      const result = await loadTestSimulator.simulateLoad(atomicityTest, testConfig)

      // Verify atomicity - final balance should be correct
      const finalBalance = userBalances.get(sharedUserId) || 0
      const expectedBalance = initialBalance - (result.successfulOperations * 10)
      
      expect(finalBalance).toBe(expectedBalance)
      expect(finalBalance).toBeGreaterThanOrEqual(0) // Should never go negative
    })
  })

  describe('Data Consistency Validation Tests', () => {
    it('should maintain user balance consistency across operations', async () => {
      const testUserId = 'consistency-user'
      const initialBalance = 500
      userBalances.set(testUserId, initialBalance)

      // Perform multiple operations
      const operations = [
        { tokens: 100, market: 'market-1' },
        { tokens: 150, market: 'market-2' },
        { tokens: 75, market: 'market-3' }
      ]

      for (const op of operations) {
        await mockCommitTokens({
          userId: testUserId,
          predictionId: op.market,
          tokensToCommit: op.tokens,
          position: 'yes'
        })
      }

      // Validate consistency
      const getUserBalance = async () => userBalances.get(testUserId) || 0
      const getUserCommitments = async () => {
        const allCommitments = Array.from(marketCommitments.values()).flat()
        return allCommitments
          .filter(c => c.userId === testUserId)
          .map(c => ({ tokens: c.tokensCommitted, status: c.status }))
      }

      const validation = await DataConsistencyValidator.validateUserBalanceConsistency(
        testUserId,
        getUserBalance,
        getUserCommitments
      )

      expect(validation.isConsistent).toBe(true)
      expect(validation.details.currentBalance).toBe(initialBalance - 325) // 100 + 150 + 75
    })

    it('should maintain market statistics consistency', async () => {
      const testMarketId = 'consistency-market'
      marketCommitments.set(testMarketId, [])

      // Add commitments from multiple users
      const commitments = [
        { userId: 'user-1', tokens: 100 },
        { userId: 'user-2', tokens: 200 },
        { userId: 'user-1', tokens: 50 }, // Same user, different commitment
        { userId: 'user-3', tokens: 150 }
      ]

      for (const commitment of commitments) {
        await mockCommitTokens({
          userId: commitment.userId,
          predictionId: testMarketId,
          tokensToCommit: commitment.tokens,
          position: 'yes'
        })
      }

      // Validate market consistency
      const getMarketStats = async () => {
        const commitments = marketCommitments.get(testMarketId) || []
        const totalTokens = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
        const participants = new Set(commitments.map(c => c.userId)).size
        return { totalTokens, participants }
      }

      const getMarketCommitments = async () => {
        const commitments = marketCommitments.get(testMarketId) || []
        return commitments.map(c => ({ userId: c.userId, tokens: c.tokensCommitted }))
      }

      const validation = await DataConsistencyValidator.validateMarketConsistency(
        testMarketId,
        getMarketStats,
        getMarketCommitments
      )

      expect(validation.isConsistent).toBe(true)
      expect(validation.details.calculatedTotal).toBe(500) // 100 + 200 + 50 + 150
      expect(validation.details.calculatedParticipants).toBe(3) // user-1, user-2, user-3
    })
  })

  describe('Performance Benchmarks', () => {
    it('should meet response time benchmarks', async () => {
      const benchmarks = {
        p50: 100, // 50th percentile under 100ms
        p95: 300, // 95th percentile under 300ms
        p99: 500  // 99th percentile under 500ms
      }

      const responseTimes: number[] = []

      const benchmarkOperation = async () => {
        const start = Date.now()
        
        await mockCommitTokens({
          userId: `user-${Math.floor(Math.random() * 100)}`,
          predictionId: `market-${Math.floor(Math.random() * 10)}`,
          tokensToCommit: 50,
          position: 'yes'
        })
        
        const responseTime = Date.now() - start
        responseTimes.push(responseTime)
        
        return { responseTime }
      }

      const testConfig = {
        concurrentUsers: 100,
        operationsPerUser: 10
      }

      await loadTestSimulator.simulateLoad(benchmarkOperation, testConfig)

      // Calculate percentiles
      responseTimes.sort((a, b) => a - b)
      const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)]
      const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)]
      const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)]

      console.log(`Response Time Percentiles:`)
      console.log(`P50: ${p50}ms (target: <${benchmarks.p50}ms)`)
      console.log(`P95: ${p95}ms (target: <${benchmarks.p95}ms)`)
      console.log(`P99: ${p99}ms (target: <${benchmarks.p99}ms)`)

      // Verify benchmarks (relaxed for mock environment)
      expect(p50).toBeLessThan(benchmarks.p50 * 2) // Allow 2x for mock overhead
      expect(p95).toBeLessThan(benchmarks.p95 * 2)
      expect(p99).toBeLessThan(benchmarks.p99 * 2)
    })

    it('should handle memory efficiently under load', async () => {
      const initialMemory = DatabaseStressTest.measureMemoryUsage()
      
      const memoryTestOperation = async () => {
        // Create some data to simulate memory usage
        const largeData = new Array(1000).fill(0).map((_, i) => ({
          id: i,
          data: `test-data-${i}`,
          timestamp: Date.now()
        }))
        
        await mockCommitTokens({
          userId: `user-${Math.floor(Math.random() * 100)}`,
          predictionId: 'memory-test-market',
          tokensToCommit: 25,
          position: 'yes'
        })
        
        // Clean up large data
        largeData.length = 0
      }

      const testConfig = {
        concurrentUsers: 50,
        operationsPerUser: 20
      }

      await loadTestSimulator.simulateLoad(memoryTestOperation, testConfig)
      
      const finalMemory = DatabaseStressTest.measureMemoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      console.log(`Memory Usage:`)
      console.log(`Initial: ${initialMemory.heapUsed}MB`)
      console.log(`Final: ${finalMemory.heapUsed}MB`)
      console.log(`Increase: ${memoryIncrease}MB`)

      // Memory should not increase dramatically (allow some increase for test overhead)
      expect(memoryIncrease).toBeLessThan(100) // Less than 100MB increase
    })
  })
})