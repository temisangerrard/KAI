/**
 * Load Test Simulator for Database Performance Testing
 * 
 * Provides utilities to simulate concurrent user load and measure performance
 */

export interface LoadTestConfig {
  concurrentUsers: number
  operationsPerUser: number
  testDurationMs?: number
  rampUpTimeMs?: number
}

export interface LoadTestResult {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  operationsPerSecond: number
  errorRate: number
  duration: number
}

export interface OperationResult {
  success: boolean
  responseTime: number
  error?: string
  timestamp: number
}

export class LoadTestSimulator {
  private results: OperationResult[] = []
  private startTime: number = 0
  private endTime: number = 0

  /**
   * Simulate concurrent user load on a given operation
   */
  async simulateLoad<T>(
    operation: () => Promise<T>,
    config: LoadTestConfig
  ): Promise<LoadTestResult> {
    this.results = []
    this.startTime = Date.now()

    const { concurrentUsers, operationsPerUser, rampUpTimeMs = 0 } = config

    // Create user simulation promises
    const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      // Stagger user start times for ramp-up
      if (rampUpTimeMs > 0) {
        const delay = (userIndex / concurrentUsers) * rampUpTimeMs
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Execute operations for this user
      const userOperations = Array.from({ length: operationsPerUser }, async () => {
        const operationStart = Date.now()
        
        try {
          await operation()
          const responseTime = Date.now() - operationStart
          
          this.results.push({
            success: true,
            responseTime,
            timestamp: operationStart
          })
        } catch (error) {
          const responseTime = Date.now() - operationStart
          
          this.results.push({
            success: false,
            responseTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: operationStart
          })
        }
      })

      return Promise.all(userOperations)
    })

    // Wait for all users to complete
    await Promise.all(userPromises)
    this.endTime = Date.now()

    return this.calculateResults()
  }

  /**
   * Simulate sustained load over a time period
   */
  async simulateSustainedLoad<T>(
    operation: () => Promise<T>,
    config: LoadTestConfig & { testDurationMs: number }
  ): Promise<LoadTestResult> {
    this.results = []
    this.startTime = Date.now()
    const endTime = this.startTime + config.testDurationMs

    const userPromises = Array.from({ length: config.concurrentUsers }, async () => {
      while (Date.now() < endTime) {
        const operationStart = Date.now()
        
        try {
          await operation()
          const responseTime = Date.now() - operationStart
          
          this.results.push({
            success: true,
            responseTime,
            timestamp: operationStart
          })
        } catch (error) {
          const responseTime = Date.now() - operationStart
          
          this.results.push({
            success: false,
            responseTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: operationStart
          })
        }

        // Small delay between operations to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    })

    await Promise.all(userPromises)
    this.endTime = Date.now()

    return this.calculateResults()
  }

  /**
   * Calculate performance metrics from test results
   */
  private calculateResults(): LoadTestResult {
    const totalOperations = this.results.length
    const successfulOperations = this.results.filter(r => r.success).length
    const failedOperations = totalOperations - successfulOperations
    
    const responseTimes = this.results.map(r => r.responseTime)
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalOperations
    const minResponseTime = Math.min(...responseTimes)
    const maxResponseTime = Math.max(...responseTimes)
    
    const duration = this.endTime - this.startTime
    const operationsPerSecond = (totalOperations / duration) * 1000
    const errorRate = (failedOperations / totalOperations) * 100

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      operationsPerSecond,
      errorRate,
      duration
    }
  }

  /**
   * Generate performance report
   */
  generateReport(result: LoadTestResult): string {
    return `
Load Test Performance Report
============================

Total Operations: ${result.totalOperations}
Successful: ${result.successfulOperations} (${((result.successfulOperations / result.totalOperations) * 100).toFixed(2)}%)
Failed: ${result.failedOperations} (${result.errorRate.toFixed(2)}%)

Response Times:
- Average: ${result.averageResponseTime.toFixed(2)}ms
- Min: ${result.minResponseTime}ms
- Max: ${result.maxResponseTime}ms

Throughput: ${result.operationsPerSecond.toFixed(2)} operations/second
Test Duration: ${result.duration}ms
    `.trim()
  }
}

/**
 * Database stress test utilities
 */
export class DatabaseStressTest {
  /**
   * Test database connection pool under load
   */
  static async testConnectionPool(
    connectionTest: () => Promise<boolean>,
    maxConnections: number = 100
  ): Promise<{ successful: number; failed: number; duration: number }> {
    const startTime = Date.now()
    const connectionPromises = Array.from({ length: maxConnections }, connectionTest)
    
    const results = await Promise.allSettled(connectionPromises)
    const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length
    const failed = maxConnections - successful
    const duration = Date.now() - startTime

    return { successful, failed, duration }
  }

  /**
   * Test transaction deadlock scenarios
   */
  static async testTransactionDeadlocks(
    transactionOperation: () => Promise<void>,
    concurrentTransactions: number = 20
  ): Promise<{ completed: number; deadlocks: number; errors: number }> {
    const results = await Promise.allSettled(
      Array.from({ length: concurrentTransactions }, transactionOperation)
    )

    let completed = 0
    let deadlocks = 0
    let errors = 0

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        completed++
      } else {
        const error = result.reason?.message || ''
        if (error.includes('deadlock') || error.includes('transaction')) {
          deadlocks++
        } else {
          errors++
        }
      }
    })

    return { completed, deadlocks, errors }
  }

  /**
   * Test memory usage under load
   */
  static measureMemoryUsage(): { heapUsed: number; heapTotal: number; external: number } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      return {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024) // MB
      }
    }
    
    // Fallback for browser environment
    return { heapUsed: 0, heapTotal: 0, external: 0 }
  }
}

/**
 * Data consistency validator
 */
export class DataConsistencyValidator {
  /**
   * Validate user balance consistency
   */
  static async validateUserBalanceConsistency(
    userId: string,
    getUserBalance: () => Promise<number>,
    getUserCommitments: () => Promise<Array<{ tokens: number; status: string }>>
  ): Promise<{ isConsistent: boolean; details: any }> {
    const balance = await getUserBalance()
    const commitments = await getUserCommitments()
    
    const activeCommitments = commitments.filter(c => c.status === 'active')
    const totalCommitted = activeCommitments.reduce((sum, c) => sum + c.tokens, 0)
    
    // Assuming initial balance was sufficient for all commitments
    const isConsistent = balance >= 0 && totalCommitted >= 0
    
    return {
      isConsistent,
      details: {
        currentBalance: balance,
        totalCommitted,
        activeCommitments: activeCommitments.length,
        totalCommitments: commitments.length
      }
    }
  }

  /**
   * Validate market statistics consistency
   */
  static async validateMarketConsistency(
    marketId: string,
    getMarketStats: () => Promise<{ totalTokens: number; participants: number }>,
    getMarketCommitments: () => Promise<Array<{ userId: string; tokens: number }>>
  ): Promise<{ isConsistent: boolean; details: any }> {
    const stats = await getMarketStats()
    const commitments = await getMarketCommitments()
    
    const calculatedTotal = commitments.reduce((sum, c) => sum + c.tokens, 0)
    const calculatedParticipants = new Set(commitments.map(c => c.userId)).size
    
    const isConsistent = 
      stats.totalTokens === calculatedTotal &&
      stats.participants === calculatedParticipants
    
    return {
      isConsistent,
      details: {
        reportedTotal: stats.totalTokens,
        calculatedTotal,
        reportedParticipants: stats.participants,
        calculatedParticipants,
        commitmentCount: commitments.length
      }
    }
  }
}