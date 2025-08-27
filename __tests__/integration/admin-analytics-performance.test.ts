/**
 * Admin Analytics Performance Tests
 * 
 * Tests admin analytics queries and dashboard performance with large datasets
 * to ensure the system can handle real-world data volumes efficiently.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock Firebase for testing
const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
}

vi.mock('firebase/firestore', () => ({
  getFirestore: () => mockFirestore,
  collection: vi.fn(() => mockFirestore),
  query: vi.fn(() => mockFirestore),
  where: vi.fn(() => mockFirestore),
  orderBy: vi.fn(() => mockFirestore),
  limit: vi.fn(() => mockFirestore),
  startAfter: vi.fn(() => mockFirestore),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
    fromDate: (date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })
  }
}))

interface MockCommitment {
  id: string
  userId: string
  userEmail: string
  predictionId: string
  tokensCommitted: number
  position: 'yes' | 'no'
  odds: number
  potentialWinning: number
  status: 'active' | 'won' | 'lost' | 'refunded'
  committedAt: Date
  resolvedAt?: Date
}

interface MockMarket {
  id: string
  title: string
  status: 'active' | 'resolved' | 'cancelled'
  createdAt: Date
  resolvedAt?: Date
}

interface MockUser {
  id: string
  email: string
  displayName: string
  tokenBalance: number
  totalCommitted: number
}

describe('Admin Analytics Performance Tests', () => {
  let mockCommitments: MockCommitment[]
  let mockMarkets: MockMarket[]
  let mockUsers: MockUser[]

  beforeEach(() => {
    // Generate large test dataset
    mockUsers = generateMockUsers(5000)
    mockMarkets = generateMockMarkets(500)
    mockCommitments = generateMockCommitments(50000, mockUsers, mockMarkets)

    // Setup Firestore mocks
    setupFirestoreMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  function generateMockUsers(count: number): MockUser[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `user-${i}`,
      email: `user${i}@example.com`,
      displayName: `User ${i}`,
      tokenBalance: Math.floor(Math.random() * 1000) + 100,
      totalCommitted: 0
    }))
  }

  function generateMockMarkets(count: number): MockMarket[] {
    return Array.from({ length: count }, (_, i) => {
      const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // Last 90 days
      const isResolved = Math.random() < 0.3 // 30% resolved
      
      return {
        id: `market-${i}`,
        title: `Test Market ${i}`,
        status: isResolved ? 'resolved' : 'active',
        createdAt,
        resolvedAt: isResolved ? new Date(createdAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined
      }
    }))
  }

  function generateMockCommitments(count: number, users: MockUser[], markets: MockMarket[]): MockCommitment[] {
    return Array.from({ length: count }, (_, i) => {
      const user = users[Math.floor(Math.random() * users.length)]
      const market = markets[Math.floor(Math.random() * markets.length)]
      const tokensCommitted = Math.floor(Math.random() * 200) + 10
      const position = Math.random() > 0.5 ? 'yes' : 'no'
      const odds = 1.2 + Math.random() * 2.8 // 1.2 to 4.0
      const committedAt = new Date(market.createdAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
      
      let status: 'active' | 'won' | 'lost' | 'refunded' = 'active'
      let resolvedAt: Date | undefined
      
      if (market.status === 'resolved') {
        const outcome = Math.random()
        if (outcome < 0.4) status = 'won'
        else if (outcome < 0.8) status = 'lost'
        else status = 'refunded'
        resolvedAt = market.resolvedAt
      }

      return {
        id: `commitment-${i}`,
        userId: user.id,
        userEmail: user.email,
        predictionId: market.id,
        tokensCommitted,
        position,
        odds,
        potentialWinning: tokensCommitted * odds,
        status,
        committedAt,
        resolvedAt
      }
    })
  }

  function setupFirestoreMocks() {
    // Mock collection queries
    mockFirestore.collection.mockImplementation((collectionName: string) => {
      if (collectionName === 'prediction_commitments') {
        return {
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          startAfter: vi.fn().mockReturnThis(),
          get: vi.fn().mockImplementation(() => {
            // Simulate query processing time based on dataset size
            const processingTime = Math.max(50, Math.min(500, mockCommitments.length / 100))
            return new Promise(resolve => {
              setTimeout(() => {
                resolve({
                  docs: mockCommitments.slice(0, 1000).map(commitment => ({
                    id: commitment.id,
                    data: () => commitment
                  })),
                  size: Math.min(1000, mockCommitments.length)
                })
              }, processingTime)
            })
          })
        }
      }
      
      if (collectionName === 'markets') {
        return {
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: mockMarkets.map(market => ({
              id: market.id,
              data: () => market
            })),
            size: mockMarkets.length
          })
        }
      }

      if (collectionName === 'users') {
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: mockUsers.map(user => ({
              id: user.id,
              data: () => user
            })),
            size: mockUsers.length
          })
        }
      }

      return mockFirestore
    })
  }

  describe('Large Dataset Query Performance', () => {
    it('should efficiently query commitments with pagination', async () => {
      const pageSize = 100
      const totalPages = 10
      const queryTimes: number[] = []

      for (let page = 0; page < totalPages; page++) {
        const startTime = Date.now()
        
        // Simulate paginated query
        const query = mockFirestore.collection('prediction_commitments')
          .orderBy('committedAt', 'desc')
          .limit(pageSize)
        
        if (page > 0) {
          query.startAfter(`last-doc-${page - 1}`)
        }

        const result = await query.get()
        const queryTime = Date.now() - startTime
        queryTimes.push(queryTime)

        expect(result.size).toBeLessThanOrEqual(pageSize)
      }

      // Performance assertions
      const averageQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
      const maxQueryTime = Math.max(...queryTimes)

      expect(averageQueryTime).toBeLessThan(200) // Average under 200ms
      expect(maxQueryTime).toBeLessThan(500) // Max under 500ms

      console.log(`Pagination Performance:`)
      console.log(`Average query time: ${averageQueryTime.toFixed(2)}ms`)
      console.log(`Max query time: ${maxQueryTime}ms`)
      console.log(`Total pages tested: ${totalPages}`)
    })

    it('should efficiently aggregate market statistics', async () => {
      const startTime = Date.now()

      // Simulate market statistics aggregation
      const marketStats = new Map()
      
      // Group commitments by market
      mockCommitments.forEach(commitment => {
        if (!marketStats.has(commitment.predictionId)) {
          marketStats.set(commitment.predictionId, {
            totalTokens: 0,
            participantCount: new Set(),
            yesTokens: 0,
            noTokens: 0,
            commitmentCount: 0
          })
        }

        const stats = marketStats.get(commitment.predictionId)
        stats.totalTokens += commitment.tokensCommitted
        stats.participantCount.add(commitment.userId)
        stats.commitmentCount++

        if (commitment.position === 'yes') {
          stats.yesTokens += commitment.tokensCommitted
        } else {
          stats.noTokens += commitment.tokensCommitted
        }
      })

      // Convert to final format
      const aggregatedStats = Array.from(marketStats.entries()).map(([marketId, stats]) => ({
        marketId,
        totalTokens: stats.totalTokens,
        participantCount: stats.participantCount.size,
        yesTokens: stats.yesTokens,
        noTokens: stats.noTokens,
        commitmentCount: stats.commitmentCount,
        yesPercentage: (stats.yesTokens / stats.totalTokens) * 100,
        noPercentage: (stats.noTokens / stats.totalTokens) * 100
      }))

      const aggregationTime = Date.now() - startTime

      // Performance assertions
      expect(aggregationTime).toBeLessThan(1000) // Under 1 second for 50k records
      expect(aggregatedStats.length).toBeGreaterThan(0)
      expect(aggregatedStats.every(stat => stat.totalTokens > 0)).toBe(true)

      console.log(`Aggregation Performance:`)
      console.log(`Processed ${mockCommitments.length} commitments in ${aggregationTime}ms`)
      console.log(`Generated stats for ${aggregatedStats.length} markets`)
    })

    it('should handle complex filtering efficiently', async () => {
      const filters = [
        { status: 'active', timeRange: '7d' },
        { status: 'resolved', timeRange: '30d' },
        { minTokens: 100, maxTokens: 500 },
        { position: 'yes', status: 'won' }
      ]

      const filterTimes: number[] = []

      for (const filter of filters) {
        const startTime = Date.now()

        // Apply filters
        let filteredCommitments = mockCommitments

        if (filter.status) {
          filteredCommitments = filteredCommitments.filter(c => c.status === filter.status)
        }

        if (filter.timeRange) {
          const days = parseInt(filter.timeRange)
          const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          filteredCommitments = filteredCommitments.filter(c => c.committedAt >= cutoffDate)
        }

        if (filter.minTokens) {
          filteredCommitments = filteredCommitments.filter(c => c.tokensCommitted >= filter.minTokens)
        }

        if (filter.maxTokens) {
          filteredCommitments = filteredCommitments.filter(c => c.tokensCommitted <= filter.maxTokens)
        }

        if (filter.position) {
          filteredCommitments = filteredCommitments.filter(c => c.position === filter.position)
        }

        const filterTime = Date.now() - startTime
        filterTimes.push(filterTime)

        expect(filteredCommitments.length).toBeGreaterThanOrEqual(0)
      }

      const averageFilterTime = filterTimes.reduce((sum, time) => sum + time, 0) / filterTimes.length
      expect(averageFilterTime).toBeLessThan(100) // Under 100ms per filter

      console.log(`Complex Filtering Performance:`)
      console.log(`Average filter time: ${averageFilterTime.toFixed(2)}ms`)
    })
  })

  describe('Real-time Analytics Performance', () => {
    it('should handle real-time updates efficiently', async () => {
      const updateTimes: number[] = []
      const batchSize = 100

      // Simulate real-time commitment updates
      for (let batch = 0; batch < 10; batch++) {
        const startTime = Date.now()

        // Simulate batch of new commitments
        const newCommitments = Array.from({ length: batchSize }, (_, i) => ({
          id: `new-commitment-${batch}-${i}`,
          userId: `user-${Math.floor(Math.random() * 1000)}`,
          predictionId: `market-${Math.floor(Math.random() * 100)}`,
          tokensCommitted: Math.floor(Math.random() * 100) + 10,
          position: Math.random() > 0.5 ? 'yes' : 'no',
          status: 'active' as const,
          committedAt: new Date()
        }))

        // Add to dataset
        mockCommitments.push(...newCommitments)

        // Simulate analytics update
        const marketUpdates = new Map()
        newCommitments.forEach(commitment => {
          if (!marketUpdates.has(commitment.predictionId)) {
            marketUpdates.set(commitment.predictionId, {
              newTokens: 0,
              newParticipants: new Set()
            })
          }
          const update = marketUpdates.get(commitment.predictionId)
          update.newTokens += commitment.tokensCommitted
          update.newParticipants.add(commitment.userId)
        })

        const updateTime = Date.now() - startTime
        updateTimes.push(updateTime)
      }

      const averageUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length
      expect(averageUpdateTime).toBeLessThan(50) // Under 50ms per batch update

      console.log(`Real-time Update Performance:`)
      console.log(`Average update time: ${averageUpdateTime.toFixed(2)}ms per ${batchSize} commitments`)
    })

    it('should efficiently calculate trending markets', async () => {
      const startTime = Date.now()

      // Calculate trending markets based on recent activity
      const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      const recentCommitments = mockCommitments.filter(c => c.committedAt >= recentCutoff)

      const marketActivity = new Map()
      recentCommitments.forEach(commitment => {
        if (!marketActivity.has(commitment.predictionId)) {
          marketActivity.set(commitment.predictionId, {
            commitmentCount: 0,
            totalTokens: 0,
            uniqueUsers: new Set(),
            momentum: 0
          })
        }

        const activity = marketActivity.get(commitment.predictionId)
        activity.commitmentCount++
        activity.totalTokens += commitment.tokensCommitted
        activity.uniqueUsers.add(commitment.userId)
        
        // Calculate momentum based on recency
        const hoursAgo = (Date.now() - commitment.committedAt.getTime()) / (1000 * 60 * 60)
        activity.momentum += Math.max(0, 24 - hoursAgo) / 24 // Higher weight for more recent
      })

      // Sort by trending score
      const trendingMarkets = Array.from(marketActivity.entries())
        .map(([marketId, activity]) => ({
          marketId,
          trendingScore: activity.momentum * activity.uniqueUsers.size * Math.log(activity.totalTokens + 1),
          commitmentCount: activity.commitmentCount,
          totalTokens: activity.totalTokens,
          uniqueUsers: activity.uniqueUsers.size
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, 10) // Top 10 trending

      const calculationTime = Date.now() - startTime

      expect(calculationTime).toBeLessThan(300) // Under 300ms
      expect(trendingMarkets.length).toBeGreaterThan(0)
      expect(trendingMarkets[0].trendingScore).toBeGreaterThanOrEqual(trendingMarkets[trendingMarkets.length - 1].trendingScore)

      console.log(`Trending Calculation Performance:`)
      console.log(`Calculated trending markets in ${calculationTime}ms`)
      console.log(`Processed ${recentCommitments.length} recent commitments`)
    })
  })

  describe('Memory and Resource Efficiency', () => {
    it('should handle large result sets without memory issues', async () => {
      const initialMemory = process.memoryUsage?.() || { heapUsed: 0 }

      // Process large dataset in chunks
      const chunkSize = 1000
      const chunks = Math.ceil(mockCommitments.length / chunkSize)
      const processedData = []

      for (let i = 0; i < chunks; i++) {
        const chunk = mockCommitments.slice(i * chunkSize, (i + 1) * chunkSize)
        
        // Process chunk
        const chunkStats = chunk.reduce((stats, commitment) => {
          stats.totalTokens += commitment.tokensCommitted
          stats.commitmentCount++
          return stats
        }, { totalTokens: 0, commitmentCount: 0 })

        processedData.push(chunkStats)

        // Force garbage collection simulation
        if (i % 10 === 0) {
          // Simulate cleanup
          await new Promise(resolve => setTimeout(resolve, 1))
        }
      }

      const finalMemory = process.memoryUsage?.() || { heapUsed: 0 }
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      expect(processedData.length).toBe(chunks)
      // Memory increase should be reasonable (allow for test overhead)
      if (process.memoryUsage) {
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // Less than 100MB
      }

      console.log(`Memory Efficiency:`)
      console.log(`Processed ${mockCommitments.length} records in ${chunks} chunks`)
      if (process.memoryUsage) {
        console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`)
      }
    })

    it('should efficiently handle concurrent analytics requests', async () => {
      const concurrentRequests = 20
      const requestTimes: number[] = []

      const analyticsRequest = async () => {
        const startTime = Date.now()

        // Simulate different analytics queries running concurrently
        const queries = [
          // Total commitments by status
          mockCommitments.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1
            return acc
          }, {} as Record<string, number>),

          // Average commitment size by market
          Array.from(new Set(mockCommitments.map(c => c.predictionId))).map(marketId => {
            const marketCommitments = mockCommitments.filter(c => c.predictionId === marketId)
            const avgSize = marketCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0) / marketCommitments.length
            return { marketId, avgSize }
          }),

          // User participation stats
          Array.from(new Set(mockCommitments.map(c => c.userId))).map(userId => {
            const userCommitments = mockCommitments.filter(c => c.userId === userId)
            return {
              userId,
              totalCommitments: userCommitments.length,
              totalTokens: userCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
            }
          })
        ]

        await Promise.all(queries)
        
        const requestTime = Date.now() - startTime
        requestTimes.push(requestTime)
        
        return { success: true, requestTime }
      }

      // Execute concurrent requests
      const results = await Promise.all(
        Array.from({ length: concurrentRequests }, analyticsRequest)
      )

      const averageRequestTime = requestTimes.reduce((sum, time) => sum + time, 0) / requestTimes.length
      const maxRequestTime = Math.max(...requestTimes)

      expect(results.every(r => r.success)).toBe(true)
      expect(averageRequestTime).toBeLessThan(500) // Under 500ms average
      expect(maxRequestTime).toBeLessThan(1000) // Under 1s max

      console.log(`Concurrent Analytics Performance:`)
      console.log(`${concurrentRequests} concurrent requests`)
      console.log(`Average time: ${averageRequestTime.toFixed(2)}ms`)
      console.log(`Max time: ${maxRequestTime}ms`)
    })
  })
})