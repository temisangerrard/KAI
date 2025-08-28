/**
 * Database Migration Service
 * Handles migration from current database structure to optimized structure
 */

import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  query,
  where,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { Market as OldMarket } from '@/lib/db/database'
import { PredictionCommitment } from '@/lib/types/token'
import {
  Market,
  MarketStats,
  UserCommitment,
  UserBalance,
  TokenTransaction,
  COLLECTIONS
} from '@/lib/types/market-database'

export interface MigrationResult {
  success: boolean
  migratedMarkets: number
  migratedCommitments: number
  migratedBalances: number
  errors: string[]
}

export interface MigrationProgress {
  stage: string
  current: number
  total: number
  percentage: number
}

/**
 * Database Migration Service
 */
export class DatabaseMigrationService {
  
  /**
   * Perform complete database migration
   */
  static async migrateDatabase(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedMarkets: 0,
      migratedCommitments: 0,
      migratedBalances: 0,
      errors: []
    }
    
    try {
      // Stage 1: Migrate Markets
      onProgress?.({
        stage: 'Migrating Markets',
        current: 0,
        total: 100,
        percentage: 0
      })
      
      const marketResult = await this.migrateMarkets(onProgress)
      result.migratedMarkets = marketResult.count
      result.errors.push(...marketResult.errors)
      
      // Stage 2: Migrate Commitments
      onProgress?.({
        stage: 'Migrating Commitments',
        current: 25,
        total: 100,
        percentage: 25
      })
      
      const commitmentResult = await this.migrateCommitments(onProgress)
      result.migratedCommitments = commitmentResult.count
      result.errors.push(...commitmentResult.errors)
      
      // Stage 3: Migrate User Balances
      onProgress?.({
        stage: 'Migrating User Balances',
        current: 50,
        total: 100,
        percentage: 50
      })
      
      const balanceResult = await this.migrateUserBalances(onProgress)
      result.migratedBalances = balanceResult.count
      result.errors.push(...balanceResult.errors)
      
      // Stage 4: Update Market Statistics
      onProgress?.({
        stage: 'Updating Market Statistics',
        current: 75,
        total: 100,
        percentage: 75
      })
      
      await this.updateMarketStatistics()
      
      onProgress?.({
        stage: 'Migration Complete',
        current: 100,
        total: 100,
        percentage: 100
      })
      
      result.success = result.errors.length === 0
      return result
      
    } catch (error) {
      console.error('Migration failed:', error)
      result.errors.push(`Migration failed: ${error}`)
      return result
    }
  }
  
  /**
   * Migrate markets from old structure to new structure
   */
  private static async migrateMarkets(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = []
    let count = 0
    
    try {
      // Get all existing markets
      const oldMarketsSnap = await getDocs(collection(db, 'markets'))
      const oldMarkets = oldMarketsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OldMarket[]
      
      console.log(`Found ${oldMarkets.length} markets to migrate`)
      
      for (let i = 0; i < oldMarkets.length; i++) {
        const oldMarket = oldMarkets[i]
        
        onProgress?.({
          stage: 'Migrating Markets',
          current: i,
          total: oldMarkets.length,
          percentage: Math.round((i / oldMarkets.length) * 25)
        })
        
        try {
          const newMarket = await this.convertOldMarketToNew(oldMarket)
          await setDoc(doc(db, COLLECTIONS.markets, newMarket.id), newMarket)
          count++
        } catch (error) {
          console.error(`Error migrating market ${oldMarket.id}:`, error)
          errors.push(`Market ${oldMarket.id}: ${error}`)
        }
      }
      
      return { count, errors }
    } catch (error) {
      console.error('Error in market migration:', error)
      return { count, errors: [`Market migration failed: ${error}`] }
    }
  }
  
  /**
   * Convert old market structure to new structure
   */
  private static async convertOldMarketToNew(oldMarket: OldMarket): Promise<Market> {
    // Initialize empty statistics (will be updated later)
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
    
    // Convert options
    const newOptions = oldMarket.options.map(oldOption => ({
      id: oldOption.id,
      text: oldOption.name,
      totalTokens: oldOption.tokens || 0,
      participantCount: 0, // Will be calculated later
      commitmentCount: 0   // Will be calculated later
    }))
    
    // Initialize token distribution
    newOptions.forEach(option => {
      initialStats.tokenDistribution[option.id] = option.totalTokens
      initialStats.participantDistribution[option.id] = 0
    })
    
    const newMarket: Market = {
      id: oldMarket.id,
      title: oldMarket.title,
      description: oldMarket.description,
      category: this.mapCategory(oldMarket.category),
      status: this.mapStatus(oldMarket.status),
      createdBy: 'system', // Default creator
      createdAt: Timestamp.fromDate(oldMarket.startDate),
      endsAt: Timestamp.fromDate(oldMarket.endDate),
      imageUrl: undefined,
      tags: oldMarket.tags || [],
      options: newOptions,
      minCommitment: 10,
      maxCommitment: 10000,
      stats: initialStats,
      featured: false,
      trending: false
    }
    
    return newMarket
  }
  
  /**
   * Migrate commitments from old structure to new structure
   */
  private static async migrateCommitments(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = []
    let count = 0
    
    try {
      // Get all existing commitments
      const oldCommitmentsSnap = await getDocs(collection(db, 'prediction_commitments'))
      const oldCommitments = oldCommitmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[]
      
      console.log(`Found ${oldCommitments.length} commitments to migrate`)
      
      const batch = writeBatch(db)
      let batchCount = 0
      
      for (let i = 0; i < oldCommitments.length; i++) {
        const oldCommitment = oldCommitments[i]
        
        onProgress?.({
          stage: 'Migrating Commitments',
          current: i,
          total: oldCommitments.length,
          percentage: 25 + Math.round((i / oldCommitments.length) * 25)
        })
        
        try {
          const newCommitment = this.convertOldCommitmentToNew(oldCommitment)
          batch.set(doc(db, COLLECTIONS.userCommitments, newCommitment.id), newCommitment)
          
          batchCount++
          count++
          
          // Commit batch every 500 operations
          if (batchCount >= 500) {
            await batch.commit()
            batchCount = 0
          }
          
        } catch (error) {
          console.error(`Error migrating commitment ${oldCommitment.id}:`, error)
          errors.push(`Commitment ${oldCommitment.id}: ${error}`)
        }
      }
      
      // Commit remaining operations
      if (batchCount > 0) {
        await batch.commit()
      }
      
      return { count, errors }
    } catch (error) {
      console.error('Error in commitment migration:', error)
      return { count, errors: [`Commitment migration failed: ${error}`] }
    }
  }
  
  /**
   * Convert old commitment structure to new structure
   */
  private static convertOldCommitmentToNew(oldCommitment: PredictionCommitment): UserCommitment {
    // Map position to optionId (assuming binary yes/no markets)
    const optionId = oldCommitment.position === 'yes' ? 'yes' : 'no'
    
    const newCommitment: UserCommitment = {
      id: oldCommitment.id,
      userId: oldCommitment.userId,
      marketId: oldCommitment.predictionId, // predictionId was actually marketId
      optionId: optionId,
      tokensCommitted: oldCommitment.tokensCommitted,
      oddsAtCommitment: oldCommitment.odds || 1.0,
      potentialPayout: oldCommitment.potentialWinning || oldCommitment.tokensCommitted,
      status: this.mapCommitmentStatus(oldCommitment.status),
      committedAt: oldCommitment.committedAt
    }
    
    if (oldCommitment.resolvedAt) {
      newCommitment.resolvedAt = oldCommitment.resolvedAt
    }
    
    return newCommitment
  }
  
  /**
   * Migrate user balances
   */
  private static async migrateUserBalances(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = []
    let count = 0
    
    try {
      // Get all existing user balances
      const oldBalancesSnap = await getDocs(collection(db, 'user_balances'))
      const oldBalances = oldBalancesSnap.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      }))
      
      console.log(`Found ${oldBalances.length} user balances to migrate`)
      
      for (let i = 0; i < oldBalances.length; i++) {
        const oldBalance = oldBalances[i]
        
        onProgress?.({
          stage: 'Migrating User Balances',
          current: i,
          total: oldBalances.length,
          percentage: 50 + Math.round((i / oldBalances.length) * 25)
        })
        
        try {
          const newBalance: UserBalance = {
            userId: oldBalance.userId,
            availableTokens: oldBalance.availableTokens || 0,
            committedTokens: oldBalance.committedTokens || 0,
            totalEarned: oldBalance.totalEarned || 0,
            totalSpent: oldBalance.totalSpent || 0,
            totalCommitments: 0, // Will be calculated
            version: oldBalance.version || 1,
            lastUpdated: oldBalance.lastUpdated || Timestamp.now()
          }
          
          await setDoc(doc(db, COLLECTIONS.userBalances, newBalance.userId), newBalance)
          count++
          
        } catch (error) {
          console.error(`Error migrating balance for user ${oldBalance.userId}:`, error)
          errors.push(`Balance ${oldBalance.userId}: ${error}`)
        }
      }
      
      return { count, errors }
    } catch (error) {
      console.error('Error in balance migration:', error)
      return { count, errors: [`Balance migration failed: ${error}`] }
    }
  }
  
  /**
   * Update market statistics based on migrated commitments
   */
  private static async updateMarketStatistics(): Promise<void> {
    try {
      // Get all markets
      const marketsSnap = await getDocs(collection(db, COLLECTIONS.markets))
      const markets = marketsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Market[]
      
      for (const market of markets) {
        // Get all commitments for this market
        const commitmentsQuery = query(
          collection(db, COLLECTIONS.userCommitments),
          where('marketId', '==', market.id)
        )
        
        const commitmentsSnap = await getDocs(commitmentsQuery)
        const commitments = commitmentsSnap.docs.map(doc => doc.data()) as UserCommitment[]
        
        // Calculate statistics
        const stats = this.calculateMarketStats(market, commitments)
        
        // Update market
        const updatedMarket: Market = {
          ...market,
          stats,
          options: market.options.map(option => {
            const optionCommitments = commitments.filter(c => c.optionId === option.id)
            const uniqueUsers = new Set(optionCommitments.map(c => c.userId))
            
            return {
              ...option,
              totalTokens: stats.tokenDistribution[option.id] || 0,
              participantCount: uniqueUsers.size,
              commitmentCount: optionCommitments.length
            }
          })
        }
        
        await setDoc(doc(db, COLLECTIONS.markets, market.id), updatedMarket)
      }
      
    } catch (error) {
      console.error('Error updating market statistics:', error)
      throw error
    }
  }
  
  /**
   * Calculate market statistics from commitments
   */
  private static calculateMarketStats(market: Market, commitments: UserCommitment[]): MarketStats {
    const tokenDistribution: { [optionId: string]: number } = {}
    const participantDistribution: { [optionId: string]: number } = {}
    
    // Initialize distributions
    market.options.forEach(option => {
      tokenDistribution[option.id] = 0
      participantDistribution[option.id] = 0
    })
    
    const uniqueParticipants = new Set<string>()
    const commitmentAmounts: number[] = []
    let firstCommitmentAt: Timestamp | undefined
    let lastCommitmentAt: Timestamp | undefined
    
    commitments.forEach(commitment => {
      // Token distribution
      tokenDistribution[commitment.optionId] = 
        (tokenDistribution[commitment.optionId] || 0) + commitment.tokensCommitted
      
      // Track unique participants per option
      const userOptionKey = `${commitment.userId}_${commitment.optionId}`
      if (!uniqueParticipants.has(userOptionKey)) {
        participantDistribution[commitment.optionId] = 
          (participantDistribution[commitment.optionId] || 0) + 1
        uniqueParticipants.add(userOptionKey)
      }
      
      // Track amounts for statistics
      commitmentAmounts.push(commitment.tokensCommitted)
      
      // Track timing
      if (!firstCommitmentAt || commitment.committedAt.toMillis() < firstCommitmentAt.toMillis()) {
        firstCommitmentAt = commitment.committedAt
      }
      if (!lastCommitmentAt || commitment.committedAt.toMillis() > lastCommitmentAt.toMillis()) {
        lastCommitmentAt = commitment.committedAt
      }
    })
    
    const totalTokens = commitmentAmounts.reduce((sum, amount) => sum + amount, 0)
    const totalParticipants = new Set(commitments.map(c => c.userId)).size
    
    return {
      totalTokensCommitted: totalTokens,
      totalParticipants,
      totalCommitments: commitments.length,
      tokenDistribution,
      participantDistribution,
      averageCommitment: commitments.length > 0 ? totalTokens / commitments.length : 0,
      largestCommitment: commitmentAmounts.length > 0 ? Math.max(...commitmentAmounts) : 0,
      smallestCommitment: commitmentAmounts.length > 0 ? Math.min(...commitmentAmounts) : 0,
      firstCommitmentAt,
      lastCommitmentAt,
      lastUpdated: Timestamp.now()
    }
  }
  
  /**
   * Helper methods for mapping old values to new values
   */
  private static mapCategory(oldCategory: string): Market['category'] {
    const categoryMap: { [key: string]: Market['category'] } = {
      'Entertainment': 'entertainment',
      'Sports': 'sports',
      'Politics': 'politics',
      'Technology': 'technology',
      'Culture': 'culture',
      'Reality TV': 'reality-tv',
      'Fashion': 'fashion',
      'Music': 'music'
    }
    
    return categoryMap[oldCategory] || 'other'
  }
  
  private static mapStatus(oldStatus: string): Market['status'] {
    const statusMap: { [key: string]: Market['status'] } = {
      'active': 'active',
      'ended': 'resolved',
      'cancelled': 'cancelled'
    }
    
    return statusMap[oldStatus] || 'active'
  }
  
  private static mapCommitmentStatus(oldStatus: string): UserCommitment['status'] {
    const statusMap: { [key: string]: UserCommitment['status'] } = {
      'active': 'active',
      'won': 'won',
      'lost': 'lost',
      'refunded': 'refunded'
    }
    
    return statusMap[oldStatus] || 'active'
  }
  
  /**
   * Validate migration results
   */
  static async validateMigration(): Promise<{
    isValid: boolean
    issues: string[]
    summary: {
      markets: number
      commitments: number
      balances: number
    }
  }> {
    const issues: string[] = []
    
    try {
      // Count migrated data
      const marketsSnap = await getDocs(collection(db, COLLECTIONS.markets))
      const commitmentsSnap = await getDocs(collection(db, COLLECTIONS.userCommitments))
      const balancesSnap = await getDocs(collection(db, COLLECTIONS.userBalances))
      
      const summary = {
        markets: marketsSnap.size,
        commitments: commitmentsSnap.size,
        balances: balancesSnap.size
      }
      
      // Validate market statistics
      for (const marketDoc of marketsSnap.docs) {
        const market = marketDoc.data() as Market
        
        if (!market.stats) {
          issues.push(`Market ${market.id} missing stats`)
          continue
        }
        
        // Check if token distribution matches options
        const totalFromDistribution = Object.values(market.stats.tokenDistribution)
          .reduce((sum, tokens) => sum + tokens, 0)
        
        if (Math.abs(totalFromDistribution - market.stats.totalTokensCommitted) > 0.01) {
          issues.push(`Market ${market.id} has inconsistent token totals`)
        }
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        summary
      }
      
    } catch (error) {
      return {
        isValid: false,
        issues: [`Validation failed: ${error}`],
        summary: { markets: 0, commitments: 0, balances: 0 }
      }
    }
  }
}