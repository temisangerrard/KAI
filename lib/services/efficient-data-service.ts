/**
 * Efficient Data Fetching Service
 * Implements caching, selective Firebase listeners, and pagination
 * to minimize Firebase read costs and improve performance
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { TokenTransaction, PredictionCommitment, UserBalance } from '@/lib/types/token'

// Cache configuration
interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number // Maximum number of items to cache
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface PaginationState {
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
  isLoading: boolean
}

interface TransactionPage {
  transactions: TokenTransaction[]
  pagination: PaginationState
}

interface CommitmentPage {
  commitments: PredictionCommitment[]
  pagination: PaginationState
}

/**
 * Generic cache implementation with TTL and size limits
 */
class DataCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private config: CacheConfig

  constructor(config: CacheConfig) {
    this.config = config
  }

  set(key: string, data: T): void {
    // Remove expired entries and enforce size limit
    this.cleanup()
    
    if (this.cache.size >= this.config.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.config.ttl
    })
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  clear(): void {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl
    }
  }
}

/**
 * Efficient Data Service with caching and optimized queries
 */
export class EfficientDataService {
  // Cache instances with different TTL based on data volatility
  private static balanceCache = new DataCache<UserBalance>({ ttl: 30000, maxSize: 100 }) // 30 seconds
  private static transactionCache = new DataCache<TransactionPage>({ ttl: 300000, maxSize: 50 }) // 5 minutes
  private static commitmentCache = new DataCache<CommitmentPage>({ ttl: 60000, maxSize: 50 }) // 1 minute
  
  // Active listeners for real-time updates
  private static activeListeners = new Map<string, Unsubscribe>()
  
  // Pagination states
  private static transactionPagination = new Map<string, PaginationState>()
  private static commitmentPagination = new Map<string, PaginationState>()

  /**
   * Get user balance with caching and optional real-time updates
   */
  static async getUserBalance(
    userId: string, 
    useRealtime: boolean = false
  ): Promise<UserBalance | null> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    const cacheKey = `balance_${userId}`
    
    // Check cache first
    if (!useRealtime && this.balanceCache.has(cacheKey)) {
      console.log('[EFFICIENT_DATA] Balance cache hit for user:', userId)
      return this.balanceCache.get(cacheKey)
    }

    try {
      if (useRealtime) {
        // Set up real-time listener for balance updates
        return await this.setupBalanceListener(userId)
      } else {
        // One-time fetch with caching
        const { TokenBalanceService } = await import('./token-balance-service')
        const balance = await TokenBalanceService.getUserBalance(userId)
        
        if (balance) {
          this.balanceCache.set(cacheKey, balance)
          console.log('[EFFICIENT_DATA] Balance cached for user:', userId)
        }
        
        return balance
      }
    } catch (error) {
      console.error('[EFFICIENT_DATA] Error fetching user balance:', error)
      throw error
    }
  }

  /**
   * Get paginated transaction history with caching
   */
  static async getUserTransactions(
    userId: string,
    pageSize: number = 20,
    loadMore: boolean = false
  ): Promise<TransactionPage> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    const cacheKey = `transactions_${userId}_${pageSize}`
    
    // Check cache for initial load
    if (!loadMore && this.transactionCache.has(cacheKey)) {
      console.log('[EFFICIENT_DATA] Transaction cache hit for user:', userId)
      return this.transactionCache.get(cacheKey)!
    }

    try {
      const paginationState = this.transactionPagination.get(userId) || {
        lastDoc: null,
        hasMore: true,
        isLoading: false
      }

      if (paginationState.isLoading) {
        // Wait for existing request instead of throwing error
        console.log('[EFFICIENT_DATA] Transaction fetch in progress, waiting...')
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            const currentState = this.transactionPagination.get(userId)
            if (!currentState?.isLoading) {
              clearInterval(checkInterval)
              // Retry the request
              this.getUserTransactions(userId, pageSize, loadMore).then(resolve)
            }
          }, 100)
        })
      }

      paginationState.isLoading = true
      this.transactionPagination.set(userId, paginationState)

      // Build query
      let transactionQuery = query(
        collection(db, 'token_transactions'),
        where('userId', '==', userId),
        where('status', '==', 'completed'),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      )

      // Add pagination cursor for load more
      if (loadMore && paginationState.lastDoc) {
        transactionQuery = query(
          collection(db, 'token_transactions'),
          where('userId', '==', userId),
          where('status', '==', 'completed'),
          orderBy('timestamp', 'desc'),
          startAfter(paginationState.lastDoc),
          limit(pageSize)
        )
      }

      const snapshot = await getDocs(transactionQuery)
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TokenTransaction[]

      // Update pagination state
      const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null
      const hasMore = snapshot.docs.length === pageSize

      const updatedPagination: PaginationState = {
        lastDoc: newLastDoc,
        hasMore,
        isLoading: false
      }

      this.transactionPagination.set(userId, updatedPagination)

      const result: TransactionPage = {
        transactions,
        pagination: updatedPagination
      }

      // Cache the result for initial loads
      if (!loadMore) {
        this.transactionCache.set(cacheKey, result)
        console.log('[EFFICIENT_DATA] Transactions cached for user:', userId)
      }

      return result
    } catch (error) {
      // Reset loading state on error
      const paginationState = this.transactionPagination.get(userId)
      if (paginationState) {
        paginationState.isLoading = false
        this.transactionPagination.set(userId, paginationState)
      }
      
      console.error('[EFFICIENT_DATA] Error fetching transactions:', error)
      throw error
    }
  }

  /**
   * Get paginated user commitments with caching
   */
  static async getUserCommitments(
    userId: string,
    pageSize: number = 20,
    loadMore: boolean = false
  ): Promise<CommitmentPage> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    const cacheKey = `commitments_${userId}_${pageSize}`
    
    // Check cache for initial load
    if (!loadMore && this.commitmentCache.has(cacheKey)) {
      console.log('[EFFICIENT_DATA] Commitment cache hit for user:', userId)
      return this.commitmentCache.get(cacheKey)!
    }

    try {
      const paginationState = this.commitmentPagination.get(userId) || {
        lastDoc: null,
        hasMore: true,
        isLoading: false
      }

      if (paginationState.isLoading) {
        // Wait for existing request instead of throwing error
        console.log('[EFFICIENT_DATA] Commitment fetch in progress, waiting...')
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            const currentState = this.commitmentPagination.get(userId)
            if (!currentState?.isLoading) {
              clearInterval(checkInterval)
              // Retry the request
              this.getUserCommitments(userId, pageSize, loadMore).then(resolve)
            }
          }, 100)
        })
      }

      paginationState.isLoading = true
      this.commitmentPagination.set(userId, paginationState)

      // Build query - simplified to avoid index requirements
      let commitmentQuery = query(
        collection(db, 'prediction_commitments'),
        where('userId', '==', userId),
        limit(pageSize)
      )

      // Add pagination cursor for load more
      if (loadMore && paginationState.lastDoc) {
        commitmentQuery = query(
          collection(db, 'prediction_commitments'),
          where('userId', '==', userId),
          startAfter(paginationState.lastDoc),
          limit(pageSize)
        )
      }

      let commitments: PredictionCommitment[] = []
      
      try {
        const snapshot = await getDocs(commitmentQuery)
        commitments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PredictionCommitment[]

        // Sort on client side to avoid index requirement
        commitments.sort((a, b) => {
          const aTime = a.committedAt?.toMillis?.() || 0
          const bTime = b.committedAt?.toMillis?.() || 0
          return bTime - aTime // Descending order (newest first)
        })
      } catch (queryError) {
        console.warn('[EFFICIENT_DATA] Query failed, using simple service:', queryError)
        
        // Fallback to simple service if query fails
        const { SimpleCommitmentService } = await import('./simple-commitment-service')
        const allCommitments = await SimpleCommitmentService.getUserCommitments(userId)
        
        // Apply pagination manually
        const startIndex = loadMore && paginationState.lastDoc ? 
          allCommitments.findIndex(c => c.id === paginationState.lastDoc?.id) + 1 : 0
        commitments = allCommitments.slice(startIndex, startIndex + pageSize)
      }

      // Update pagination state
      const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null
      const hasMore = snapshot.docs.length === pageSize

      const updatedPagination: PaginationState = {
        lastDoc: newLastDoc,
        hasMore,
        isLoading: false
      }

      this.commitmentPagination.set(userId, updatedPagination)

      const result: CommitmentPage = {
        commitments,
        pagination: updatedPagination
      }

      // Cache the result for initial loads
      if (!loadMore) {
        this.commitmentCache.set(cacheKey, result)
        console.log('[EFFICIENT_DATA] Commitments cached for user:', userId)
      }

      return result
    } catch (error) {
      // Reset loading state on error
      const paginationState = this.commitmentPagination.get(userId)
      if (paginationState) {
        paginationState.isLoading = false
        this.commitmentPagination.set(userId, paginationState)
      }
      
      console.error('[EFFICIENT_DATA] Error fetching commitments:', error)
      throw error
    }
  }

  /**
   * Set up real-time listener for user balance (use sparingly)
   */
  private static async setupBalanceListener(userId: string): Promise<UserBalance | null> {
    const listenerKey = `balance_${userId}`
    
    // Clean up existing listener
    if (this.activeListeners.has(listenerKey)) {
      this.activeListeners.get(listenerKey)!()
      this.activeListeners.delete(listenerKey)
    }

    return new Promise((resolve, reject) => {
      const balanceRef = collection(db, 'user_balances')
      const balanceQuery = query(balanceRef, where('userId', '==', userId))
      
      const unsubscribe = onSnapshot(
        balanceQuery,
        (snapshot) => {
          if (snapshot.empty) {
            resolve(null)
            return
          }

          const balance = snapshot.docs[0].data() as UserBalance
          
          // Update cache
          const cacheKey = `balance_${userId}`
          this.balanceCache.set(cacheKey, balance)
          
          console.log('[EFFICIENT_DATA] Real-time balance update for user:', userId)
          resolve(balance)
        },
        (error) => {
          console.error('[EFFICIENT_DATA] Balance listener error:', error)
          reject(error)
        }
      )

      this.activeListeners.set(listenerKey, unsubscribe)
    })
  }

  /**
   * Set up selective real-time listener for active commitments only
   */
  static setupActiveCommitmentsListener(
    userId: string,
    callback: (commitments: PredictionCommitment[]) => void
  ): () => void {
    const listenerKey = `active_commitments_${userId}`
    
    // Clean up existing listener
    if (this.activeListeners.has(listenerKey)) {
      this.activeListeners.get(listenerKey)!()
      this.activeListeners.delete(listenerKey)
    }

    const commitmentsRef = collection(db, 'prediction_commitments')
    const activeCommitmentsQuery = query(
      commitmentsRef,
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('committedAt', 'desc'),
      limit(10) // Only listen to recent active commitments
    )

    const unsubscribe = onSnapshot(
      activeCommitmentsQuery,
      (snapshot) => {
        const commitments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PredictionCommitment[]
        
        console.log('[EFFICIENT_DATA] Active commitments update for user:', userId, commitments.length)
        callback(commitments)
      },
      (error) => {
        console.error('[EFFICIENT_DATA] Active commitments listener error:', error)
      }
    )

    this.activeListeners.set(listenerKey, unsubscribe)
    
    return () => {
      unsubscribe()
      this.activeListeners.delete(listenerKey)
    }
  }

  /**
   * Preload data for better user experience
   */
  static async preloadUserData(userId: string): Promise<void> {
    if (!userId?.trim()) return

    try {
      console.log('[EFFICIENT_DATA] Preloading data for user:', userId)
      
      // Preload in parallel but don't wait for all to complete
      const preloadPromises = [
        this.getUserBalance(userId, false),
        this.getUserTransactions(userId, 10, false),
        this.getUserCommitments(userId, 10, false)
      ]

      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled(preloadPromises)
      
      const successful = results.filter(r => r.status === 'fulfilled').length
      console.log('[EFFICIENT_DATA] Preloaded', successful, 'of', results.length, 'data types for user:', userId)
    } catch (error) {
      console.warn('[EFFICIENT_DATA] Preload failed for user:', userId, error)
      // Don't throw - preloading is optional
    }
  }

  /**
   * Invalidate cache for a user (call after data mutations)
   */
  static invalidateUserCache(userId: string): void {
    console.log('[EFFICIENT_DATA] Invalidating cache for user:', userId)
    
    // Clear relevant cache entries
    this.balanceCache.clear() // Simple approach - clear all balance cache
    this.transactionCache.clear() // Clear transaction cache
    this.commitmentCache.clear() // Clear commitment cache
    
    // Reset pagination states
    this.transactionPagination.delete(userId)
    this.commitmentPagination.delete(userId)
  }

  /**
   * Clean up all listeners and cache (call on logout)
   */
  static cleanup(): void {
    console.log('[EFFICIENT_DATA] Cleaning up listeners and cache')
    
    // Unsubscribe from all listeners
    for (const [key, unsubscribe] of this.activeListeners.entries()) {
      unsubscribe()
    }
    this.activeListeners.clear()
    
    // Clear all caches
    this.balanceCache.clear()
    this.transactionCache.clear()
    this.commitmentCache.clear()
    
    // Clear pagination states
    this.transactionPagination.clear()
    this.commitmentPagination.clear()
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    return {
      balance: this.balanceCache.getStats(),
      transactions: this.transactionCache.getStats(),
      commitments: this.commitmentCache.getStats(),
      activeListeners: this.activeListeners.size,
      paginationStates: {
        transactions: this.transactionPagination.size,
        commitments: this.commitmentPagination.size
      }
    }
  }

  /**
   * Reset pagination for a user (useful when data changes)
   */
  static resetPagination(userId: string): void {
    this.transactionPagination.delete(userId)
    this.commitmentPagination.delete(userId)
    console.log('[EFFICIENT_DATA] Reset pagination for user:', userId)
  }
}