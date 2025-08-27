import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc,
  DocumentSnapshot,
  QueryConstraint,
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/db/database';
import { 
  PredictionCommitment, 
  CommitmentWithUser, 
  MarketCommitmentSummary,
  CommitmentAnalytics,
  MarketAnalytics 
} from '@/lib/types/token';
import { Market, UserProfile } from '@/lib/types/database';
import { withPerformanceMonitoring } from './analytics-performance-service';

/**
 * Optimized service for admin commitment queries with proper indexing and performance
 */
export class AdminCommitmentService {
  
  /**
   * Fetch commitments with optimized queries and user information joining
   */
  static async getCommitmentsWithUsers(options: {
    page?: number;
    pageSize?: number;
    status?: string;
    marketId?: string;
    userId?: string;
    position?: 'yes' | 'no';
    sortBy?: 'committedAt' | 'tokensCommitted' | 'odds' | 'potentialWinning';
    sortOrder?: 'asc' | 'desc';
    search?: string;
    lastDoc?: DocumentSnapshot;
  }): Promise<{
    commitments: CommitmentWithUser[];
    lastDoc?: DocumentSnapshot;
    totalCount: number;
  }> {
    const {
      page = 1,
      pageSize = 20,
      status,
      marketId,
      userId,
      position,
      sortBy = 'committedAt',
      sortOrder = 'desc',
      search,
      lastDoc
    } = options;

    // Build optimized query with proper indexing
    const constraints: QueryConstraint[] = [];

    // Add filters in order of selectivity for optimal index usage
    if (userId) {
      constraints.push(where('userId', '==', userId));
    }
    if (marketId) {
      constraints.push(where('predictionId', '==', marketId));
    }
    if (status) {
      constraints.push(where('status', '==', status));
    }
    if (position) {
      constraints.push(where('position', '==', position));
    }

    // Add ordering - ensure we have a composite index for this combination
    const orderField = this.getOrderField(sortBy);
    constraints.push(orderBy(orderField, sortOrder));

    // Add pagination
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pageSize));

    // Execute optimized query with performance monitoring
    const commitmentsQuery = query(collection(db, 'prediction_commitments'), ...constraints);
    const commitmentsSnapshot = await withPerformanceMonitoring(
      'getCommitmentsWithUsers',
      () => getDocs(commitmentsQuery)
    );

    const commitments = commitmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      committedAt: doc.data().committedAt?.toDate?.()?.toISOString() || doc.data().committedAt,
      resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || doc.data().resolvedAt
    })) as PredictionCommitment[];

    // Batch fetch user information efficiently
    const enhancedCommitments = await this.enhanceCommitmentsWithUsers(commitments);

    // Apply search filter after user data is loaded
    let filteredCommitments = enhancedCommitments;
    if (search) {
      filteredCommitments = this.applySearchFilter(enhancedCommitments, search);
    }

    const newLastDoc = commitmentsSnapshot.docs[commitmentsSnapshot.docs.length - 1];

    // Get total count efficiently (cached or estimated)
    const totalCount = await this.getCommitmentCount(options);

    return {
      commitments: filteredCommitments,
      lastDoc: newLastDoc,
      totalCount
    };
  }

  /**
   * Get market-specific commitments with analytics
   */
  static async getMarketCommitments(
    marketId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: string;
      position?: 'yes' | 'no';
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      includeAnalytics?: boolean;
    }
  ): Promise<{
    market: Market;
    commitments: CommitmentWithUser[];
    analytics?: MarketAnalytics;
    totalCount: number;
  }> {
    const {
      page = 1,
      pageSize = 50,
      status,
      position,
      sortBy = 'committedAt',
      sortOrder = 'desc',
      includeAnalytics = true
    } = options;

    // Fetch market details
    const marketDoc = await getDoc(doc(db, 'markets', marketId));
    if (!marketDoc.exists()) {
      throw new Error('Market not found');
    }
    const market = { id: marketDoc.id, ...marketDoc.data() } as Market;

    // Build optimized query for market commitments
    const constraints: QueryConstraint[] = [
      where('predictionId', '==', marketId)
    ];

    if (status) {
      constraints.push(where('status', '==', status));
    }
    if (position) {
      constraints.push(where('position', '==', position));
    }

    const orderField = this.getOrderField(sortBy);
    constraints.push(orderBy(orderField, sortOrder));

    // For analytics, we need all commitments, so fetch without pagination first
    let allCommitments: PredictionCommitment[] = [];
    if (includeAnalytics) {
      const allCommitmentsQuery = query(collection(db, 'prediction_commitments'), ...constraints);
      const allCommitmentsSnapshot = await getDocs(allCommitmentsQuery);
      allCommitments = allCommitmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        committedAt: doc.data().committedAt?.toDate?.()?.toISOString() || doc.data().committedAt,
        resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || doc.data().resolvedAt
      })) as PredictionCommitment[];
    }

    // Add pagination for the actual results
    const startIndex = (page - 1) * pageSize;
    constraints.push(limit(pageSize + startIndex));

    const commitmentsQuery = query(collection(db, 'prediction_commitments'), ...constraints);
    const commitmentsSnapshot = await getDocs(commitmentsQuery);

    let commitments = commitmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      committedAt: doc.data().committedAt?.toDate?.()?.toISOString() || doc.data().committedAt,
      resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || doc.data().resolvedAt
    })) as PredictionCommitment[];

    // Apply pagination
    const paginatedCommitments = commitments.slice(startIndex, startIndex + pageSize);

    // Enhance with user data
    const enhancedCommitments = await this.enhanceCommitmentsWithUsers(paginatedCommitments);

    // Calculate analytics if requested
    let analytics: MarketAnalytics | undefined;
    if (includeAnalytics && allCommitments.length > 0) {
      analytics = this.calculateMarketAnalytics(allCommitments);
    }

    return {
      market,
      commitments: enhancedCommitments,
      analytics,
      totalCount: allCommitments.length || commitments.length
    };
  }

  /**
   * Get detailed commitment information with user data integration and timeline
   */
  static async getCommitmentDetails(
    marketId: string,
    commitmentId: string
  ): Promise<any | null> {
    try {
      // Fetch the specific commitment
      const commitmentDoc = await getDoc(doc(db, 'prediction_commitments', commitmentId));
      
      if (!commitmentDoc.exists()) {
        return null;
      }

      const commitment = {
        id: commitmentDoc.id,
        ...commitmentDoc.data(),
        committedAt: commitmentDoc.data().committedAt?.toDate?.()?.toISOString() || commitmentDoc.data().committedAt,
        resolvedAt: commitmentDoc.data().resolvedAt?.toDate?.()?.toISOString() || commitmentDoc.data().resolvedAt
      } as PredictionCommitment;

      // Verify the commitment belongs to the specified market
      if (commitment.predictionId !== marketId) {
        return null;
      }

      // Fetch user information
      const userDoc = await getDoc(doc(db, 'users', commitment.userId));
      const user = userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;

      // Fetch user statistics
      const userStats = await this.getUserCommitmentStats(commitment.userId);

      // Fetch market context
      const marketContext = await this.getMarketContext(marketId, commitment.userId);

      // Generate commitment timeline
      const timeline = await this.generateCommitmentTimeline(commitment);

      // Enhance commitment with all additional data
      const enhancedCommitment = {
        ...commitment,
        user: user ? {
          id: user.uid || user.id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isAdmin: user.isAdmin
        } : {
          id: commitment.userId,
          email: 'Unknown User',
          displayName: 'Unknown User'
        },
        userStats,
        marketContext,
        timeline,
        marketTitle: commitment.metadata?.marketTitle,
        marketStatus: commitment.metadata?.marketStatus
      };

      return enhancedCommitment;

    } catch (error) {
      console.error(`[ADMIN_COMMITMENT_SERVICE] Error fetching commitment details:`, error);
      throw error;
    }
  }

  /**
   * Get user commitment statistics
   */
  private static async getUserCommitmentStats(userId: string): Promise<{
    totalCommitments: number;
    totalTokensCommitted: number;
    winRate: number;
    averageCommitment: number;
    lastActivity: string;
  }> {
    try {
      // Fetch all user commitments
      const userCommitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('userId', '==', userId),
        orderBy('committedAt', 'desc')
      );
      
      const userCommitmentsSnapshot = await getDocs(userCommitmentsQuery);
      const userCommitments = userCommitmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[];

      const totalCommitments = userCommitments.length;
      const totalTokensCommitted = userCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0);
      
      // Calculate win rate
      const resolvedCommitments = userCommitments.filter(c => ['won', 'lost'].includes(c.status));
      const wonCommitments = userCommitments.filter(c => c.status === 'won');
      const winRate = resolvedCommitments.length > 0 ? (wonCommitments.length / resolvedCommitments.length) * 100 : 0;
      
      const averageCommitment = totalCommitments > 0 ? totalTokensCommitted / totalCommitments : 0;
      
      // Get last activity
      const lastActivity = userCommitments.length > 0 
        ? userCommitments[0].committedAt?.toDate?.()?.toISOString() || userCommitments[0].committedAt
        : new Date().toISOString();

      return {
        totalCommitments,
        totalTokensCommitted,
        winRate,
        averageCommitment,
        lastActivity
      };
    } catch (error) {
      console.error(`[ADMIN_COMMITMENT_SERVICE] Error fetching user stats:`, error);
      return {
        totalCommitments: 0,
        totalTokensCommitted: 0,
        winRate: 0,
        averageCommitment: 0,
        lastActivity: new Date().toISOString()
      };
    }
  }

  /**
   * Get market context for the user's commitment
   */
  private static async getMarketContext(marketId: string, userId: string): Promise<{
    totalParticipants: number;
    userRank: number;
    percentileRank: number;
    marketProgress: number;
  }> {
    try {
      // Fetch all commitments for this market
      const marketCommitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('predictionId', '==', marketId),
        orderBy('tokensCommitted', 'desc')
      );
      
      const marketCommitmentsSnapshot = await getDocs(marketCommitmentsQuery);
      const marketCommitments = marketCommitmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[];

      const totalParticipants = new Set(marketCommitments.map(c => c.userId)).size;
      
      // Find user's rank based on total tokens committed
      const userTotalTokens = marketCommitments
        .filter(c => c.userId === userId)
        .reduce((sum, c) => sum + c.tokensCommitted, 0);
      
      const usersByTokens = Array.from(
        marketCommitments.reduce((map, c) => {
          const current = map.get(c.userId) || 0;
          map.set(c.userId, current + c.tokensCommitted);
          return map;
        }, new Map<string, number>())
      ).sort(([, a], [, b]) => b - a);

      const userRank = usersByTokens.findIndex(([id]) => id === userId) + 1;
      const percentileRank = totalParticipants > 0 ? Math.round(((totalParticipants - userRank + 1) / totalParticipants) * 100) : 0;

      // Calculate market progress (assuming markets have an end date)
      const marketDoc = await getDoc(doc(db, 'markets', marketId));
      let marketProgress = 50; // Default to 50% if we can't calculate
      
      if (marketDoc.exists()) {
        const market = marketDoc.data();
        if (market.endsAt && market.createdAt) {
          const now = new Date();
          const start = market.createdAt.toDate();
          const end = market.endsAt.toDate();
          const total = end.getTime() - start.getTime();
          const elapsed = now.getTime() - start.getTime();
          marketProgress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
        }
      }

      return {
        totalParticipants,
        userRank: userRank || totalParticipants,
        percentileRank,
        marketProgress
      };
    } catch (error) {
      console.error(`[ADMIN_COMMITMENT_SERVICE] Error fetching market context:`, error);
      return {
        totalParticipants: 0,
        userRank: 0,
        percentileRank: 0,
        marketProgress: 50
      };
    }
  }

  /**
   * Generate commitment timeline events
   */
  private static async generateCommitmentTimeline(commitment: PredictionCommitment): Promise<Array<{
    id: string;
    type: 'committed' | 'market_updated' | 'odds_changed' | 'resolved' | 'refunded';
    timestamp: string;
    description: string;
    metadata?: Record<string, any>;
  }>> {
    const timeline = [];

    // Initial commitment event
    timeline.push({
      id: `${commitment.id}_committed`,
      type: 'committed' as const,
      timestamp: commitment.committedAt,
      description: `Committed ${commitment.tokensCommitted} tokens on ${commitment.position.toUpperCase()} position`,
      metadata: {
        tokens: commitment.tokensCommitted,
        position: commitment.position,
        odds: commitment.odds,
        potentialWinning: commitment.potentialWinning
      }
    });

    // Market snapshot event
    if (commitment.metadata?.oddsSnapshot) {
      timeline.push({
        id: `${commitment.id}_market_snapshot`,
        type: 'market_updated' as const,
        timestamp: commitment.committedAt,
        description: `Market had ${commitment.metadata.oddsSnapshot.totalParticipants} participants with ${commitment.metadata.oddsSnapshot.totalYesTokens + commitment.metadata.oddsSnapshot.totalNoTokens} total tokens`,
        metadata: {
          totalParticipants: commitment.metadata.oddsSnapshot.totalParticipants,
          totalTokens: commitment.metadata.oddsSnapshot.totalYesTokens + commitment.metadata.oddsSnapshot.totalNoTokens,
          yesOdds: commitment.metadata.oddsSnapshot.yesOdds,
          noOdds: commitment.metadata.oddsSnapshot.noOdds
        }
      });
    }

    // Resolution event (if resolved)
    if (commitment.resolvedAt && commitment.status !== 'active') {
      let description = '';
      switch (commitment.status) {
        case 'won':
          description = `Won ${commitment.potentialWinning} tokens - correct prediction!`;
          break;
        case 'lost':
          description = `Lost ${commitment.tokensCommitted} tokens - incorrect prediction`;
          break;
        case 'refunded':
          description = `Refunded ${commitment.tokensCommitted} tokens - market cancelled`;
          break;
      }

      timeline.push({
        id: `${commitment.id}_resolved`,
        type: commitment.status === 'refunded' ? 'refunded' : 'resolved',
        timestamp: commitment.resolvedAt,
        description,
        metadata: {
          finalStatus: commitment.status,
          tokensReturned: commitment.status === 'won' ? commitment.potentialWinning : 
                         commitment.status === 'refunded' ? commitment.tokensCommitted : 0
        }
      });
    }

    // Sort timeline by timestamp
    return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Get system-wide commitment analytics
   */
  static async getCommitmentAnalytics(): Promise<CommitmentAnalytics> {
    // Use optimized aggregation queries with performance monitoring
    const commitmentsQuery = query(collection(db, 'prediction_commitments'));
    const commitmentsSnapshot = await withPerformanceMonitoring(
      'getCommitmentAnalytics',
      () => getDocs(commitmentsQuery)
    );

    const commitments = commitmentsSnapshot.docs.map(doc => doc.data()) as PredictionCommitment[];

    const totalTokensCommitted = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0);
    const activeCommitments = commitments.filter(c => c.status === 'active').length;
    const resolvedCommitments = commitments.filter(c => ['won', 'lost', 'refunded'].includes(c.status)).length;

    // Get unique markets
    const uniqueMarkets = new Set(commitments.map(c => c.predictionId));

    return {
      totalMarketsWithCommitments: uniqueMarkets.size,
      totalTokensCommitted,
      activeCommitments,
      resolvedCommitments,
      averageCommitmentSize: commitments.length > 0 ? Math.round(totalTokensCommitted / commitments.length) : 0
    };
  }

  /**
   * Efficiently enhance commitments with user data using batch operations
   */
  private static async enhanceCommitmentsWithUsers(
    commitments: PredictionCommitment[]
  ): Promise<CommitmentWithUser[]> {
    if (commitments.length === 0) return [];

    // Get unique user IDs
    const userIds = [...new Set(commitments.map(c => c.userId))];
    
    // Use optimized batch fetch
    const usersMap = await this.batchFetchUsers(userIds);

    // Enhance commitments with user data
    return commitments.map(commitment => {
      const user = usersMap.get(commitment.userId);
      
      return {
        ...commitment,
        user: user ? {
          id: user.uid || user.id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isAdmin: user.isAdmin
        } : {
          id: commitment.userId,
          email: 'Unknown User',
          displayName: 'Unknown User'
        },
        // Add market information if available in metadata
        marketTitle: commitment.metadata?.marketTitle,
        marketStatus: commitment.metadata?.marketStatus
      };
    });
  }

  /**
   * Apply search filter to enhanced commitments
   */
  private static applySearchFilter(
    commitments: CommitmentWithUser[],
    search: string
  ): CommitmentWithUser[] {
    const searchLower = search.toLowerCase();
    return commitments.filter(commitment => 
      commitment.user.email.toLowerCase().includes(searchLower) ||
      commitment.user.displayName.toLowerCase().includes(searchLower) ||
      commitment.metadata?.marketTitle?.toLowerCase().includes(searchLower) ||
      commitment.id.toLowerCase().includes(searchLower)
    );
  }

  /**
   * Calculate market analytics from commitments
   */
  private static calculateMarketAnalytics(commitments: PredictionCommitment[]): MarketAnalytics {
    const totalTokens = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0);
    const yesTokens = commitments.filter(c => c.position === 'yes').reduce((sum, c) => sum + c.tokensCommitted, 0);
    const noTokens = commitments.filter(c => c.position === 'no').reduce((sum, c) => sum + c.tokensCommitted, 0);
    const largestCommitment = commitments.length > 0 ? Math.max(...commitments.map(c => c.tokensCommitted)) : 0;

    // Calculate daily trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyData = new Map();
    commitments.forEach(commitment => {
      const commitDate = new Date(commitment.committedAt);
      if (commitDate >= thirtyDaysAgo) {
        const dateKey = commitDate.toISOString().split('T')[0];
        
        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, {
            date: dateKey,
            totalTokens: 0,
            commitmentCount: 0,
            yesTokens: 0,
            noTokens: 0
          });
        }
        
        const dayData = dailyData.get(dateKey);
        dayData.totalTokens += commitment.tokensCommitted;
        dayData.commitmentCount += 1;
        
        if (commitment.position === 'yes') {
          dayData.yesTokens += commitment.tokensCommitted;
        } else {
          dayData.noTokens += commitment.tokensCommitted;
        }
      }
    });

    return {
      totalTokens,
      participantCount: commitments.length,
      yesPercentage: totalTokens > 0 ? Math.round((yesTokens / totalTokens) * 100) : 0,
      noPercentage: totalTokens > 0 ? Math.round((noTokens / totalTokens) * 100) : 0,
      averageCommitment: commitments.length > 0 ? Math.round(totalTokens / commitments.length) : 0,
      largestCommitment,
      commitmentTrend: Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  /**
   * Get optimized order field for queries
   */
  private static getOrderField(sortBy: string): string {
    switch (sortBy) {
      case 'tokens':
        return 'tokensCommitted';
      case 'odds':
        return 'odds';
      case 'potential':
        return 'potentialWinning';
      default:
        return 'committedAt';
    }
  }

  /**
   * Get commitment count efficiently (with potential caching)
   */
  private static async getCommitmentCount(options: any): Promise<number> {
    // For now, return a simple count - in production, this could be cached
    const constraints: QueryConstraint[] = [];
    
    if (options.userId) {
      constraints.push(where('userId', '==', options.userId));
    }
    if (options.marketId) {
      constraints.push(where('predictionId', '==', options.marketId));
    }
    if (options.status) {
      constraints.push(where('status', '==', options.status));
    }
    if (options.position) {
      constraints.push(where('position', '==', options.position));
    }

    const countQuery = query(collection(db, 'prediction_commitments'), ...constraints);
    const countSnapshot = await getDocs(countQuery);
    
    return countSnapshot.size;
  }

  /**
   * Create real-time listener for market commitments with live updates
   */
  static createMarketCommitmentsListener(
    marketId: string,
    callback: (data: {
      commitments: CommitmentWithUser[];
      analytics: MarketAnalytics;
      totalCount: number;
    }) => void,
    options: {
      status?: string;
      position?: 'yes' | 'no';
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      pageSize?: number;
    } = {}
  ): Unsubscribe {
    const {
      status,
      position,
      sortBy = 'committedAt',
      sortOrder = 'desc',
      pageSize = 50
    } = options;

    // Build real-time query
    const constraints: QueryConstraint[] = [
      where('predictionId', '==', marketId)
    ];

    if (status) {
      constraints.push(where('status', '==', status));
    }
    if (position) {
      constraints.push(where('position', '==', position));
    }

    const orderField = this.getOrderField(sortBy);
    constraints.push(orderBy(orderField, sortOrder));
    constraints.push(limit(pageSize));

    const commitmentsQuery = query(collection(db, 'prediction_commitments'), ...constraints);

    // Create real-time listener
    return onSnapshot(
      commitmentsQuery,
      async (snapshot) => {
        try {
          const commitments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            committedAt: doc.data().committedAt?.toDate?.()?.toISOString() || doc.data().committedAt,
            resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || doc.data().resolvedAt
          })) as PredictionCommitment[];

          // Enhance with user data
          const enhancedCommitments = await this.enhanceCommitmentsWithUsers(commitments);

          // Calculate real-time analytics
          const analytics = this.calculateMarketAnalytics(commitments);

          // Call the callback with updated data
          callback({
            commitments: enhancedCommitments,
            analytics,
            totalCount: commitments.length
          });

        } catch (error) {
          console.error('[REAL_TIME_LISTENER] Error processing commitment updates:', error);
        }
      },
      (error) => {
        console.error('[REAL_TIME_LISTENER] Error in market commitments listener:', error);
      }
    );
  }

  /**
   * Create real-time listener for market analytics only (more efficient for dashboards)
   */
  static createMarketAnalyticsListener(
    marketId: string,
    callback: (analytics: MarketAnalytics) => void
  ): Unsubscribe {
    const analyticsQuery = query(
      collection(db, 'prediction_commitments'),
      where('predictionId', '==', marketId)
    );

    return onSnapshot(
      analyticsQuery,
      (snapshot) => {
        try {
          const commitments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            committedAt: doc.data().committedAt?.toDate?.()?.toISOString() || doc.data().committedAt,
            resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || doc.data().resolvedAt
          })) as PredictionCommitment[];

          const analytics = this.calculateMarketAnalytics(commitments);
          callback(analytics);

        } catch (error) {
          console.error('[ANALYTICS_LISTENER] Error processing analytics updates:', error);
        }
      },
      (error) => {
        console.error('[ANALYTICS_LISTENER] Error in market analytics listener:', error);
      }
    );
  }

  /**
   * Create cached analytics with periodic updates for better performance
   */
  static async getCachedMarketAnalytics(
    marketId: string,
    maxAge: number = 60000 // 1 minute default cache
  ): Promise<MarketAnalytics> {
    const cacheKey = `market_analytics_${marketId}`;
    
    // Check if we have cached data (in a real implementation, use Redis or similar)
    const cached = this.analyticsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < maxAge) {
      return cached.data;
    }

    // Fetch fresh analytics
    const result = await this.getMarketCommitments(marketId, {
      includeAnalytics: true,
      pageSize: 1 // We only need analytics, not the commitments
    });

    const analytics = result.analytics || this.getEmptyAnalytics();

    // Cache the result
    this.analyticsCache.set(cacheKey, {
      data: analytics,
      timestamp: Date.now()
    });

    return analytics;
  }

  /**
   * Batch fetch user data more efficiently for large datasets
   */
  static async batchFetchUsers(userIds: string[]): Promise<Map<string, any>> {
    const usersMap = new Map();
    const batchSize = 10; // Firestore limit for 'in' queries
    
    // Process in batches to avoid Firestore 'in' query limits
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      try {
        const userPromises = batch.map(async (userId) => {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            return { id: userId, ...userDoc.data() };
          }
          return null;
        });

        const users = await Promise.all(userPromises);
        users.forEach(user => {
          if (user) {
            usersMap.set(user.id, user);
          }
        });
      } catch (error) {
        console.warn(`Failed to fetch user batch ${i}-${i + batchSize}:`, error);
      }
    }

    return usersMap;
  }

  // Simple in-memory cache for analytics (in production, use Redis)
  private static analyticsCache = new Map<string, { data: MarketAnalytics; timestamp: number }>();

  /**
   * Get empty analytics structure
   */
  private static getEmptyAnalytics(): MarketAnalytics {
    return {
      totalTokens: 0,
      participantCount: 0,
      yesPercentage: 0,
      noPercentage: 0,
      averageCommitment: 0,
      largestCommitment: 0,
      commitmentTrend: []
    };
  }
}