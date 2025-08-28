/**
 * Optimized Market Service
 * Handles market operations with atomic commitment tracking and real-time statistics
 */

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  runTransaction,
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  increment,
  arrayUnion,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import {
  Market,
  MarketStats,
  UserCommitment,
  UserBalance,
  TokenTransaction,
  MarketAnalyticsCache,
  CommitmentStatus,
  TransactionType,
  COLLECTIONS
} from '@/lib/types/market-database'

export interface CommitmentRequest {
  userId: string
  marketId: string
  optionId: string
  tokensToCommit: number
}

export interface CommitmentResult {
  success: boolean
  commitment?: UserCommitment
  updatedBalance?: UserBalance
  updatedMarket?: Market
  error?: string
}

export interface MarketOdds {
  [optionId: string]: {
    odds: number
    percentage: number
    totalTokens: number
    participantCount: number
  }
}

/**
 * Optimized Market Service with atomic operations
 */
export class OptimizedMarketService {
  
  /**
   * Create a new market with proper initialization
   */
  static async createMarket(marketData: Omit<Market, 'id' | 'createdAt' | 'stats'>): Promise<Market> {
    const marketId = doc(collection(db, COLLECTIONS.markets)).id
    
    const initialStats: MarketStats = {
      totalTokensCommitted: 0,
      totalParticipants: 0,
      totalCommitments: 0,
      tokenDistribution: {},
      participantDistribution: {},
      averageCommitment: 0,
      largestCommitment: 0,
      smallestCommitment: 0,
      lastUpdated: Timestamp.now()
    }
    
    // Initialize token distribution for each option
    marketData.options.forEach(option => {
      initialStats.tokenDistribution[option.id] = 0
      initialStats.participantDistribution[option.id] = 0
    })
    
    const market: Market = {
      id: marketId,
      ...marketData,
      createdAt: Timestamp.now(),
      stats: initialStats,
      options: marketData.options.map(option => ({
        ...option,
        totalTokens: 0,
        participantCount: 0,
        commitmentCount: 0
      }))
    }
    
    await setDoc(doc(db, COLLECTIONS.markets, marketId), market)
    return market
  }
  
  /**
   * Get market with real-time calculated odds
   */
  static async getMarketWithOdds(marketId: string): Promise<(Market & { odds: MarketOdds }) | null> {
    const marketDoc = await getDoc(doc(db, COLLECTIONS.markets, marketId))
    
    if (!marketDoc.exists()) {
      return null
    }
    
    const market = { id: marketDoc.id, ...marketDoc.data() } as Market
    const odds = this.calculateOdds(market)
    
    return {
      ...market,
      odds
    }
  }
  
  /**
   * Commit tokens to a market option with atomic updates
   */
  static async commitTokens(request: CommitmentRequest): Promise<CommitmentResult> {
    const { userId, marketId, optionId, tokensToCommit } = request
    
    if (tokensToCommit <= 0) {
      return { success: false, error: 'Token amount must be positive' }
    }
    
    try {
      const result = await runTransaction(db, async (transaction) => {
        // Get current market state
        const marketRef = doc(db, COLLECTIONS.markets, marketId)
        const marketSnap = await transaction.get(marketRef)
        
        if (!marketSnap.exists()) {
          throw new Error('Market not found')
        }
        
        const market = marketSnap.data() as Market
        
        // Validate market is active
        if (market.status !== 'active') {
          throw new Error('Market is not active')
        }
        
        // Validate option exists
        const option = market.options.find(opt => opt.id === optionId)
        if (!option) {
          throw new Error('Invalid option')
        }
        
        // Validate commitment amount
        if (tokensToCommit < market.minCommitment || tokensToCommit > market.maxCommitment) {
          throw new Error(`Commitment must be between ${market.minCommitment} and ${market.maxCommitment} tokens`)
        }
        
        // Get user balance
        const balanceRef = doc(db, COLLECTIONS.userBalances, userId)
        const balanceSnap = await transaction.get(balanceRef)
        
        let userBalance: UserBalance
        if (balanceSnap.exists()) {
          userBalance = balanceSnap.data() as UserBalance
        } else {
          // Create initial balance
          userBalance = {
            userId,
            availableTokens: 1000, // Initial bonus
            committedTokens: 0,
            totalEarned: 1000,
            totalSpent: 0,
            totalCommitments: 0,
            version: 1,
            lastUpdated: Timestamp.now()
          }
        }
        
        // Validate sufficient balance
        if (userBalance.availableTokens < tokensToCommit) {
          throw new Error('Insufficient tokens')
        }
        
        // Check if user already has commitment for this market
        const existingCommitmentQuery = query(
          collection(db, COLLECTIONS.userCommitments),
          where('userId', '==', userId),
          where('marketId', '==', marketId),
          where('status', '==', 'active')
        )
        
        const existingCommitments = await getDocs(existingCommitmentQuery)
        if (!existingCommitments.empty) {
          throw new Error('User already has an active commitment for this market')
        }
        
        // Calculate current odds before commitment
        const currentOdds = this.calculateOdds(market)
        const oddsAtCommitment = currentOdds[optionId]?.odds || 1.0
        const potentialPayout = tokensToCommit * oddsAtCommitment
        
        // Create commitment
        const commitmentId = doc(collection(db, COLLECTIONS.userCommitments)).id
        const commitment: UserCommitment = {
          id: commitmentId,
          userId,
          marketId,
          optionId,
          tokensCommitted: tokensToCommit,
          oddsAtCommitment,
          potentialPayout,
          status: 'active',
          committedAt: Timestamp.now()
        }
        
        // Update user balance
        const updatedBalance: UserBalance = {
          ...userBalance,
          availableTokens: userBalance.availableTokens - tokensToCommit,
          committedTokens: userBalance.committedTokens + tokensToCommit,
          totalCommitments: userBalance.totalCommitments + 1,
          version: userBalance.version + 1,
          lastUpdated: Timestamp.now()
        }
        
        // Update market statistics atomically
        const isNewParticipant = market.stats.participantDistribution[optionId] === 0
        
        const updatedStats: MarketStats = {
          ...market.stats,
          totalTokensCommitted: market.stats.totalTokensCommitted + tokensToCommit,
          totalParticipants: isNewParticipant ? 
            market.stats.totalParticipants + 1 : 
            market.stats.totalParticipants,
          totalCommitments: market.stats.totalCommitments + 1,
          tokenDistribution: {
            ...market.stats.tokenDistribution,
            [optionId]: (market.stats.tokenDistribution[optionId] || 0) + tokensToCommit
          },
          participantDistribution: {
            ...market.stats.participantDistribution,
            [optionId]: (market.stats.participantDistribution[optionId] || 0) + (isNewParticipant ? 1 : 0)
          },
          averageCommitment: (market.stats.totalTokensCommitted + tokensToCommit) / (market.stats.totalCommitments + 1),
          largestCommitment: Math.max(market.stats.largestCommitment, tokensToCommit),
          smallestCommitment: market.stats.smallestCommitment === 0 ? 
            tokensToCommit : 
            Math.min(market.stats.smallestCommitment, tokensToCommit),
          firstCommitmentAt: market.stats.firstCommitmentAt || Timestamp.now(),
          lastCommitmentAt: Timestamp.now(),
          lastUpdated: Timestamp.now()
        }
        
        // Update market options
        const updatedOptions = market.options.map(opt => {
          if (opt.id === optionId) {
            return {
              ...opt,
              totalTokens: opt.totalTokens + tokensToCommit,
              participantCount: isNewParticipant ? opt.participantCount + 1 : opt.participantCount,
              commitmentCount: opt.commitmentCount + 1
            }
          }
          return opt
        })
        
        const updatedMarket: Market = {
          ...market,
          stats: updatedStats,
          options: updatedOptions
        }
        
        // Create transaction record
        const transactionId = doc(collection(db, COLLECTIONS.tokenTransactions)).id
        const tokenTransaction: TokenTransaction = {
          id: transactionId,
          userId,
          type: 'commitment',
          amount: -tokensToCommit,
          balanceBefore: userBalance.availableTokens,
          balanceAfter: updatedBalance.availableTokens,
          marketId,
          commitmentId,
          description: `Committed ${tokensToCommit} tokens to "${market.title}"`,
          metadata: {
            optionId,
            optionText: option.text,
            oddsAtCommitment,
            potentialPayout
          },
          status: 'completed',
          createdAt: Timestamp.now(),
          processedAt: Timestamp.now()
        }
        
        // Execute all updates atomically
        transaction.set(doc(db, COLLECTIONS.userCommitments, commitmentId), commitment)
        transaction.set(balanceRef, updatedBalance)
        transaction.set(marketRef, updatedMarket)
        transaction.set(doc(db, COLLECTIONS.tokenTransactions, transactionId), tokenTransaction)
        
        return {
          commitment,
          updatedBalance,
          updatedMarket
        }
      })
      
      return {
        success: true,
        commitment: result.commitment,
        updatedBalance: result.updatedBalance,
        updatedMarket: result.updatedMarket
      }
      
    } catch (error) {
      console.error('Error committing tokens:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
  
  /**
   * Calculate real-time odds for all market options
   */
  static calculateOdds(market: Market): MarketOdds {
    const odds: MarketOdds = {}
    const totalTokens = market.stats.totalTokensCommitted
    
    if (totalTokens === 0) {
      // Equal odds when no commitments
      const equalOdds = market.options.length
      market.options.forEach(option => {
        odds[option.id] = {
          odds: equalOdds,
          percentage: 100 / market.options.length,
          totalTokens: 0,
          participantCount: 0
        }
      })
      return odds
    }
    
    market.options.forEach(option => {
      const optionTokens = market.stats.tokenDistribution[option.id] || 0
      const percentage = (optionTokens / totalTokens) * 100
      
      // Calculate odds using implied probability
      // Odds = Total Pool / Option Tokens
      const impliedOdds = optionTokens > 0 ? totalTokens / optionTokens : market.options.length
      
      odds[option.id] = {
        odds: Math.round(impliedOdds * 100) / 100, // Round to 2 decimal places
        percentage: Math.round(percentage * 100) / 100,
        totalTokens: optionTokens,
        participantCount: market.stats.participantDistribution[option.id] || 0
      }
    })
    
    return odds
  }
  
  /**
   * Get user's commitments for a specific market
   */
  static async getUserMarketCommitments(userId: string, marketId: string): Promise<UserCommitment[]> {
    const commitmentsQuery = query(
      collection(db, COLLECTIONS.userCommitments),
      where('userId', '==', userId),
      where('marketId', '==', marketId),
      orderBy('committedAt', 'desc')
    )
    
    const snapshot = await getDocs(commitmentsQuery)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserCommitment[]
  }
  
  /**
   * Get all user commitments across markets
   */
  static async getUserCommitments(userId: string, status?: CommitmentStatus): Promise<UserCommitment[]> {
    const constraints = [
      where('userId', '==', userId),
      orderBy('committedAt', 'desc'),
      limit(100)
    ]
    
    if (status) {
      constraints.splice(1, 0, where('status', '==', status))
    }
    
    const commitmentsQuery = query(
      collection(db, COLLECTIONS.userCommitments),
      ...constraints
    )
    
    const snapshot = await getDocs(commitmentsQuery)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserCommitment[]
  }
  
  /**
   * Resolve market and process payouts
   */
  static async resolveMarket(marketId: string, winningOptionId: string): Promise<void> {
    const batch = writeBatch(db)
    
    try {
      // Get market
      const marketRef = doc(db, COLLECTIONS.markets, marketId)
      const marketSnap = await getDoc(marketRef)
      
      if (!marketSnap.exists()) {
        throw new Error('Market not found')
      }
      
      const market = marketSnap.data() as Market
      
      if (market.status !== 'active' && market.status !== 'closed') {
        throw new Error('Market cannot be resolved')
      }
      
      // Validate winning option
      const winningOption = market.options.find(opt => opt.id === winningOptionId)
      if (!winningOption) {
        throw new Error('Invalid winning option')
      }
      
      // Update market status
      const resolvedMarket: Market = {
        ...market,
        status: 'resolved',
        resolvedAt: Timestamp.now(),
        options: market.options.map(opt => ({
          ...opt,
          isCorrect: opt.id === winningOptionId,
          resolvedAt: Timestamp.now()
        }))
      }
      
      batch.set(marketRef, resolvedMarket)
      
      // Get all active commitments for this market
      const commitmentsQuery = query(
        collection(db, COLLECTIONS.userCommitments),
        where('marketId', '==', marketId),
        where('status', '==', 'active')
      )
      
      const commitmentsSnap = await getDocs(commitmentsQuery)
      const commitments = commitmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserCommitment[]
      
      // Calculate payouts
      const totalTokens = market.stats.totalTokensCommitted
      const winningTokens = market.stats.tokenDistribution[winningOptionId] || 0
      const losingTokens = totalTokens - winningTokens
      
      // Process each commitment
      for (const commitment of commitments) {
        const isWinner = commitment.optionId === winningOptionId
        let actualPayout = 0
        let payoutMultiplier = 0
        let newStatus: CommitmentStatus = 'lost'
        
        if (isWinner && winningTokens > 0) {
          // Winner gets their stake back plus proportional share of losing tokens
          const winShare = commitment.tokensCommitted / winningTokens
          actualPayout = commitment.tokensCommitted + (losingTokens * winShare)
          payoutMultiplier = actualPayout / commitment.tokensCommitted
          newStatus = 'won'
        }
        
        // Update commitment
        const updatedCommitment: UserCommitment = {
          ...commitment,
          status: newStatus,
          resolvedAt: Timestamp.now(),
          actualPayout: Math.floor(actualPayout),
          payoutMultiplier: Math.round(payoutMultiplier * 100) / 100
        }
        
        batch.set(
          doc(db, COLLECTIONS.userCommitments, commitment.id),
          updatedCommitment
        )
        
        // Update user balance if they won
        if (isWinner && actualPayout > 0) {
          const balanceRef = doc(db, COLLECTIONS.userBalances, commitment.userId)
          batch.update(balanceRef, {
            availableTokens: increment(Math.floor(actualPayout)),
            committedTokens: increment(-commitment.tokensCommitted),
            totalEarned: increment(Math.floor(actualPayout)),
            lastUpdated: Timestamp.now()
          })
          
          // Create payout transaction
          const transactionId = doc(collection(db, COLLECTIONS.tokenTransactions)).id
          const payoutTransaction: TokenTransaction = {
            id: transactionId,
            userId: commitment.userId,
            type: 'payout',
            amount: Math.floor(actualPayout),
            balanceBefore: 0, // Will be updated by the increment
            balanceAfter: 0,  // Will be updated by the increment
            marketId,
            commitmentId: commitment.id,
            description: `Payout for winning prediction on "${market.title}"`,
            metadata: {
              winningOptionId,
              originalCommitment: commitment.tokensCommitted,
              payoutMultiplier,
              winShare: commitment.tokensCommitted / winningTokens
            },
            status: 'completed',
            createdAt: Timestamp.now(),
            processedAt: Timestamp.now()
          }
          
          batch.set(doc(db, COLLECTIONS.tokenTransactions, transactionId), payoutTransaction)
        } else {
          // Update balance for losers (remove committed tokens)
          const balanceRef = doc(db, COLLECTIONS.userBalances, commitment.userId)
          batch.update(balanceRef, {
            committedTokens: increment(-commitment.tokensCommitted),
            totalSpent: increment(commitment.tokensCommitted),
            lastUpdated: Timestamp.now()
          })
        }
      }
      
      await batch.commit()
      
    } catch (error) {
      console.error('Error resolving market:', error)
      throw error
    }
  }
  
  /**
   * Get market analytics with caching
   */
  static async getMarketAnalytics(marketId: string): Promise<MarketAnalyticsCache | null> {
    const analyticsRef = doc(db, COLLECTIONS.marketAnalytics, marketId)
    const analyticsSnap = await getDoc(analyticsRef)
    
    if (analyticsSnap.exists()) {
      const analytics = analyticsSnap.data() as MarketAnalyticsCache
      
      // Check if cache is still valid (5 minutes)
      const now = Timestamp.now()
      if (analytics.expiresAt.toMillis() > now.toMillis()) {
        return analytics
      }
    }
    
    // Generate fresh analytics
    return await this.generateMarketAnalytics(marketId)
  }
  
  /**
   * Generate fresh market analytics
   */
  private static async generateMarketAnalytics(marketId: string): Promise<MarketAnalyticsCache | null> {
    const market = await this.getMarketWithOdds(marketId)
    if (!market) return null
    
    // Get recent commitments for trend analysis
    const recentCommitmentsQuery = query(
      collection(db, COLLECTIONS.userCommitments),
      where('marketId', '==', marketId),
      where('committedAt', '>=', Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000)),
      orderBy('committedAt', 'desc')
    )
    
    const recentCommitmentsSnap = await getDocs(recentCommitmentsQuery)
    const recentCommitments = recentCommitmentsSnap.docs.map(doc => doc.data()) as UserCommitment[]
    
    // Generate hourly breakdown
    const hourlyCommitments = this.generateHourlyBreakdown(recentCommitments, market.options)
    
    // Calculate participant insights
    const participantInsights = this.calculateParticipantInsights(recentCommitments)
    
    // Calculate momentum
    const momentum = this.calculateMomentum(hourlyCommitments, market.options)
    
    const analytics: MarketAnalyticsCache = {
      marketId,
      currentOdds: Object.fromEntries(
        Object.entries(market.odds).map(([optionId, data]) => [optionId, data.odds])
      ),
      hourlyCommitments,
      participantInsights,
      momentum,
      lastUpdated: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000) // 5 minutes
    }
    
    // Cache the analytics
    await setDoc(doc(db, COLLECTIONS.marketAnalytics, marketId), analytics)
    
    return analytics
  }
  
  private static generateHourlyBreakdown(
    commitments: UserCommitment[], 
    options: Market['options']
  ): MarketAnalyticsCache['hourlyCommitments'] {
    const hourlyData = new Map<string, {
      totalTokens: number
      commitmentCount: number
      optionBreakdown: { [optionId: string]: number }
    }>()
    
    // Initialize last 24 hours
    for (let i = 0; i < 24; i++) {
      const hour = new Date(Date.now() - i * 60 * 60 * 1000).toISOString().slice(0, 13)
      hourlyData.set(hour, {
        totalTokens: 0,
        commitmentCount: 0,
        optionBreakdown: Object.fromEntries(options.map(opt => [opt.id, 0]))
      })
    }
    
    // Aggregate commitment data
    commitments.forEach(commitment => {
      const hour = commitment.committedAt.toDate().toISOString().slice(0, 13)
      const data = hourlyData.get(hour)
      
      if (data) {
        data.totalTokens += commitment.tokensCommitted
        data.commitmentCount += 1
        data.optionBreakdown[commitment.optionId] += commitment.tokensCommitted
      }
    })
    
    return Array.from(hourlyData.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
  }
  
  private static calculateParticipantInsights(commitments: UserCommitment[]): MarketAnalyticsCache['participantInsights'] {
    const uniqueUsers = new Set(commitments.map(c => c.userId))
    const commitmentAmounts = commitments.map(c => c.tokensCommitted).sort((a, b) => a - b)
    
    return {
      newParticipants24h: uniqueUsers.size,
      returningParticipants24h: 0, // Would need historical data
      averageCommitmentSize: commitmentAmounts.length > 0 ? 
        commitmentAmounts.reduce((sum, amount) => sum + amount, 0) / commitmentAmounts.length : 0,
      medianCommitmentSize: commitmentAmounts.length > 0 ? 
        commitmentAmounts[Math.floor(commitmentAmounts.length / 2)] : 0
    }
  }
  
  private static calculateMomentum(
    hourlyData: MarketAnalyticsCache['hourlyCommitments'],
    options: Market['options']
  ): MarketAnalyticsCache['momentum'] {
    if (hourlyData.length < 2) {
      return {
        direction: 'stable',
        strength: 0,
        leadingOption: options[0]?.id || ''
      }
    }
    
    const recent = hourlyData.slice(-6) // Last 6 hours
    const earlier = hourlyData.slice(-12, -6) // 6 hours before that
    
    const recentTotal = recent.reduce((sum, h) => sum + h.totalTokens, 0)
    const earlierTotal = earlier.reduce((sum, h) => sum + h.totalTokens, 0)
    
    const direction = recentTotal > earlierTotal ? 'up' : recentTotal < earlierTotal ? 'down' : 'stable'
    const strength = earlierTotal > 0 ? Math.abs((recentTotal - earlierTotal) / earlierTotal) * 100 : 0
    
    // Find leading option
    const optionTotals = options.map(option => ({
      id: option.id,
      total: recent.reduce((sum, h) => sum + (h.optionBreakdown[option.id] || 0), 0)
    }))
    
    const leadingOption = optionTotals.reduce((max, current) => 
      current.total > max.total ? current : max
    ).id
    
    return {
      direction,
      strength: Math.min(100, strength),
      leadingOption
    }
  }
}