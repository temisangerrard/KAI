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
import { Market, MarketOption, UserProfile } from '@/lib/types/database';
import { withPerformanceMonitoring } from './analytics-performance-service';

/**
 * Optimized service for admin commitment queries with proper indexing and performance
 * 
 * BACKWARD COMPATIBILITY: This service handles both binary (yes/no) and multi-option commitments
 * transparently to ensure existing dashboards continue to work without modification.
 */
export class AdminCommitmentService {

  // ========================================
  // BACKWARD COMPATIBILITY LAYER
  // ========================================

  /**
   * Derives optionId from legacy position field for backward compatibility
   * Maps binary positions to appropriate option IDs in multi-option markets
   */
  private static deriveOptionIdFromPosition(
    commitment: PredictionCommitment, 
    market: Market
  ): string {
    // If commitment already has optionId, use it directly
    if (commitment.optionId) {
      return commitment.optionId;
    }

    // For legacy binary commitments, map position to option
    if (commitment.position && market.options && market.options.length >= 2) {
      return commitment.position === 'yes' 
        ? market.options[0].id  // First option = "yes"
        : market.options[1].id; // Second option = "no"
    }

    // Fallback for edge cases - use first available option
    return market.options?.[0]?.id || 'unknown';
  }

  /**
   * Derives position field from optionId for backward compatibility
   * Maps option IDs back to binary positions for existing dashboard components
   */
  private static derivePositionFromOptionId(
    commitment: PredictionCommitment, 
    market: Market
  ): 'yes' | 'no' {
    // If commitment already has position, use it directly
    if (commitment.position) {
      return commitment.position;
    }

    // For new option-based commitments, derive position from optionId
    if (commitment.optionId && market.options && market.options.length >= 2) {
      return commitment.optionId === market.options[0].id ? 'yes' : 'no';
    }

    // Default fallback
    return 'yes';
  }

  /**
   * Ensures commitment has both optionId and position fields for full compatibility
   * This is the core compatibility layer that makes both old and new systems work
   */
  private static enhanceCommitmentCompatibility(
    commitment: PredictionCommitment, 
    market: Market
  ): PredictionCommitment {
    const enhanced = { ...commitment };

    // Ensure marketId field exists (alias for predictionId)
    if (!enhanced.marketId && enhanced.predictionId) {
      enhanced.marketId = enhanced.predictionId;
    }
    if (!enhanced.predictionId && enhanced.marketId) {
      enhanced.predictionId = enhanced.marketId;
    }

    // Ensure optionId exists (derived from position if needed)
    if (!enhanced.optionId) {
      enhanced.optionId = this.deriveOptionIdFromPosition(enhanced, market);
    }

    // Ensure position exists (derived from optionId if needed)
    if (!enhanced.position) {
      enhanced.position = this.derivePositionFromOptionId(enhanced, market);
    }

    // Enhance metadata for option context if missing
    if (enhanced.optionId && market.options) {
      const selectedOption = market.options.find(opt => opt.id === enhanced.optionId);
      if (selectedOption && enhanced.metadata) {
        enhanced.metadata.selectedOptionText = selectedOption.text;
        enhanced.metadata.marketOptionCount = market.options.length;
      }
    }

    return enhanced;
  }

  /**
   * Calculates accurate market statistics that work with both binary and multi-option commitments
   * Preserves existing dashboard expectations while supporting enhanced functionality
   */
  private static calculateBackwardCompatibleMarketStats(
    commitments: PredictionCommitment[],
    market: Market
  ): {
    totalParticipants: number;
    totalTokensStaked: number;
    yesTokens: number;
    noTokens: number;
    optionBreakdown?: { [optionId: string]: { tokens: number; participants: number } };
  } {
    const uniqueParticipants = new Set(commitments.map(c => c.userId));
    const totalTokensStaked = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0);

    // Calculate binary breakdown for backward compatibility
    let yesTokens = 0;
    let noTokens = 0;

    // Calculate option-level breakdown for enhanced functionality
    const optionBreakdown: { [optionId: string]: { tokens: number; participants: number } } = {};

    commitments.forEach(commitment => {
      const enhancedCommitment = this.enhanceCommitmentCompatibility(commitment, market);
      
      // Binary breakdown (for existing dashboards)
      if (enhancedCommitment.position === 'yes') {
        yesTokens += commitment.tokensCommitted;
      } else {
        noTokens += commitment.tokensCommitted;
      }

      // Option breakdown (for enhanced functionality)
      if (enhancedCommitment.optionId) {
        if (!optionBreakdown[enhancedCommitment.optionId]) {
          optionBreakdown[enhancedCommitment.optionId] = { tokens: 0, participants: 0 };
        }
        optionBreakdown[enhancedCommitment.optionId].tokens += commitment.tokensCommitted;
      }
    });

    // Calculate participants per option
    const participantsByOption = new Map<string, Set<string>>();
    commitments.forEach(commitment => {
      const enhancedCommitment = this.enhanceCommitmentCompatibility(commitment, market);
      if (enhancedCommitment.optionId) {
        if (!participantsByOption.has(enhancedCommitment.optionId)) {
          participantsByOption.set(enhancedCommitment.optionId, new Set());
        }
        participantsByOption.get(enhancedCommitment.optionId)!.add(commitment.userId);
      }
    });

    // Update participant counts in option breakdown
    participantsByOption.forEach((participants, optionId) => {
      if (optionBreakdown[optionId]) {
        optionBreakdown[optionId].participants = participants.size;
      }
    });

    return {
      totalParticipants: uniqueParticipants.size,
      totalTokensStaked,
      yesTokens,
      noTokens,
      optionBreakdown
    };
  }

  /**
   * Enhanced market analytics that work with both binary and multi-option markets
   * Maintains backward compatibility while providing enhanced insights
   */
  private static calculateEnhancedMarketAnalytics(
    commitments: PredictionCommitment[],
    market: Market
  ): MarketAnalytics {
    const stats = this.calculateBackwardCompatibleMarketStats(commitments, market);
    const largestCommitment = commitments.length > 0 ? Math.max(...commitments.map(c => c.tokensCommitted)) : 0;

    // Calculate daily trend (last 30 days) - enhanced for multi-option
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
        const enhancedCommitment = this.enhanceCommitmentCompatibility(commitment, market);
        
        dayData.totalTokens += commitment.tokensCommitted;
        dayData.commitmentCount += 1;
        
        if (enhancedCommitment.position === 'yes') {
          dayData.yesTokens += commitment.tokensCommitted;
        } else {
          dayData.noTokens += commitment.tokensCommitted;
        }
      }
    });

    return {
      totalTokens: stats.totalTokensStaked,
      participantCount: commitments.length,
      yesPercentage: stats.totalTokensStaked > 0 ? Math.round((stats.yesTokens / stats.totalTokensStaked) * 100) : 0,
      noPercentage: stats.totalTokensStaked > 0 ? Math.round((stats.noTokens / stats.totalTokensStaked) * 100) : 0,
      averageCommitment: commitments.length > 0 ? Math.round(stats.totalTokensStaked / commitments.length) : 0,
      largestCommitment,
      commitmentTrend: Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date))
    };
  }
  
  /**
   * Fetch commitments with optimized queries and user information joining
   * ENHANCED: Now supports both binary and multi-option commitment filtering
   */
  static async getCommitmentsWithUsers(options: {
    page?: number;
    pageSize?: number;
    status?: string;
    marketId?: string;
    userId?: string;
    position?: 'yes' | 'no';
    optionId?: string;  // NEW: Support for option-based filtering
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
      optionId,  // NEW: Option-based filtering
      sortBy = 'committedAt',
      sortOrder = 'desc',
      search,
      lastDoc
    } = options;

    try {
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
      // NEW: Support optionId filtering
      if (optionId) {
        constraints.push(where('optionId', '==', optionId));
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

      let commitments = commitmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        committedAt: doc.data().committedAt?.toDate?.()?.toISOString() || doc.data().committedAt,
        resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || doc.data().resolvedAt
      })) as PredictionCommitment[];

      // BACKWARD COMPATIBILITY: Enhance commitments with missing fields
      // Note: We need market data for proper compatibility enhancement
      const marketIds = [...new Set(commitments.map(c => c.predictionId || c.marketId))];
      const marketsMap = new Map<string, Market>();
      
      // Batch fetch market data for compatibility enhancement
      for (const mId of marketIds) {
        if (mId && mId !== 'unknown') {
          try {
            const marketDoc = await getDoc(doc(db, 'markets', mId));
            if (marketDoc.exists()) {
              const market = { id: marketDoc.id, ...marketDoc.data() } as Market;
              // Ensure market has options for compatibility
              if (!market.options || market.options.length === 0) {
                market.options = [
                  { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
                  { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
                ];
              }
              marketsMap.set(mId, market);
            }
          } catch (error) {
            console.warn(`Failed to fetch market ${mId} for compatibility:`, error);
          }
        }
      }

      // Enhance commitments with compatibility layer
      commitments = commitments.map(commitment => {
        const marketId = commitment.predictionId || commitment.marketId;
        const market = marketsMap.get(marketId || '');
        if (market) {
          return this.enhanceCommitmentCompatibility(commitment, market);
        }
        return commitment;
      });

      // Batch fetch user information efficiently
      const enhancedCommitments = await this.enhanceCommitmentsWithUsers(commitments);

      // Apply search filter after user data is loaded
      let filteredCommitments = enhancedCommitments;
      if (search) {
        filteredCommitments = this.applySearchFilter(enhancedCommitments, search);
      }

      const newLastDoc = commitmentsSnapshot.docs[commitmentsSnapshot.docs.length - 1];

      // Get total count efficiently (cached or estimated) with error handling
      let totalCount = 0;
      try {
        const count = await this.getCommitmentCount(options);
        totalCount = typeof count === 'number' ? count : filteredCommitments.length;
      } catch (countError) {
        console.warn('[ADMIN_COMMITMENT_SERVICE] Error getting commitment count, using fallback:', countError);
        totalCount = filteredCommitments.length; // Use actual results length as fallback
      }

      return {
        commitments: filteredCommitments,
        lastDoc: newLastDoc,
        totalCount
      };

    } catch (error) {
      console.error('[ADMIN_COMMITMENT_SERVICE] Error in getCommitmentsWithUsers:', error);
      
      // Return empty result to prevent dashboard breaks
      return {
        commitments: [],
        lastDoc: undefined,
        totalCount: 0
      };
    }
  }

  /**
   * Get market-specific commitments with analytics (ENHANCED FOR BACKWARD COMPATIBILITY)
   * 
   * This method now handles both binary and multi-option commitments transparently.
   * Existing dashboards will continue to work exactly as before, while new functionality
   * is available for multi-option markets.
   */
  static async getMarketCommitments(
    marketId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: string;
      position?: 'yes' | 'no';
      optionId?: string;  // NEW: Support for option-based filtering
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
      optionId,  // NEW: Option-based filtering
      sortBy = 'committedAt',
      sortOrder = 'desc',
      includeAnalytics = true
    } = options;

    try {
      // Fetch market details with error handling
      const marketDoc = await getDoc(doc(db, 'markets', marketId));
      if (!marketDoc.exists()) {
        throw new Error(`Market not found: ${marketId}`);
      }
      const market = { id: marketDoc.id, ...marketDoc.data() } as Market;

      // Ensure market has options array for compatibility
      if (!market.options || market.options.length === 0) {
        // Create default binary options for legacy markets
        market.options = [
          { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
          { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
        ];
      }

      // Build optimized query for market commitments
      const constraints: QueryConstraint[] = [
        where('predictionId', '==', marketId)
      ];

      if (status) {
        constraints.push(where('status', '==', status));
      }
      
      // Handle both binary position and option-based filtering
      if (position) {
        constraints.push(where('position', '==', position));
      }
      
      // NEW: Support optionId filtering for multi-option markets
      if (optionId) {
        constraints.push(where('optionId', '==', optionId));
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

        // BACKWARD COMPATIBILITY: Enhance all commitments with missing fields
        allCommitments = allCommitments.map(commitment => 
          this.enhanceCommitmentCompatibility(commitment, market)
        );
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

      // BACKWARD COMPATIBILITY: Enhance commitments with missing fields
      commitments = commitments.map(commitment => 
        this.enhanceCommitmentCompatibility(commitment, market)
      );

      // Apply pagination
      const paginatedCommitments = commitments.slice(startIndex, startIndex + pageSize);

      // Enhance with user data
      const enhancedCommitments = await this.enhanceCommitmentsWithUsers(paginatedCommitments);

      // Calculate analytics if requested (using enhanced method)
      let analytics: MarketAnalytics | undefined;
      if (includeAnalytics && allCommitments.length > 0) {
        analytics = this.calculateEnhancedMarketAnalytics(allCommitments, market);
      }

      // Update market options with real-time statistics
      const stats = this.calculateBackwardCompatibleMarketStats(allCommitments, market);
      if (stats.optionBreakdown) {
        market.options = market.options.map(option => ({
          ...option,
          totalTokens: stats.optionBreakdown![option.id]?.tokens || 0,
          participantCount: stats.optionBreakdown![option.id]?.participants || 0
        }));
      }

      return {
        market,
        commitments: enhancedCommitments,
        analytics,
        totalCount: allCommitments.length || commitments.length
      };

    } catch (error) {
      console.error(`[ADMIN_COMMITMENT_SERVICE] Error in getMarketCommitments for market ${marketId}:`, error);
      
      // Provide fallback response to prevent dashboard breaks
      return {
        market: {
          id: marketId,
          title: 'Error Loading Market',
          description: 'Market data could not be loaded',
          category: 'other' as any,
          status: 'active' as any,
          createdBy: 'unknown',
          createdAt: Timestamp.now(),
          endsAt: Timestamp.now(),
          tags: [],
          options: [
            { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
            { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
          ],
          totalParticipants: 0,
          totalTokensStaked: 0,
          featured: false,
          trending: false
        },
        commitments: [],
        analytics: this.getEmptyAnalytics(),
        totalCount: 0
      };
    }
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
   * ENHANCED: Now ensures backward compatibility fields are present
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
      
      // BACKWARD COMPATIBILITY: Ensure all required fields are present
      const enhancedCommitment = {
        ...commitment,
        // Ensure both predictionId and marketId exist
        predictionId: commitment.predictionId || commitment.marketId || 'unknown',
        marketId: commitment.marketId || commitment.predictionId || 'unknown',
        // Ensure position field exists (required by existing dashboards)
        position: commitment.position || 'yes',
        // Ensure optionId exists (for new functionality)
        optionId: commitment.optionId || 'yes'
      };
      
      return {
        ...enhancedCommitment,
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
   * Calculate market analytics from commitments (LEGACY METHOD - maintained for compatibility)
   * 
   * This method is kept for any direct calls, but new code should use calculateEnhancedMarketAnalytics
   */
  private static calculateMarketAnalytics(commitments: PredictionCommitment[]): MarketAnalytics {
    // Create a dummy market for compatibility
    const dummyMarket: Market = {
      id: 'legacy',
      title: 'Legacy Market',
      description: '',
      category: 'other' as any,
      status: 'active' as any,
      createdBy: 'unknown',
      createdAt: Timestamp.now(),
      endsAt: Timestamp.now(),
      tags: [],
      options: [
        { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
        { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
      ],
      totalParticipants: 0,
      totalTokensStaked: 0,
      featured: false,
      trending: false
    };

    // Use the enhanced method with backward compatibility
    return this.calculateEnhancedMarketAnalytics(commitments, dummyMarket);
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
   * ENHANCED: Now includes error handling for backward compatibility
   */
  private static async getCommitmentCount(options: any): Promise<number> {
    try {
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
      // NEW: Support optionId filtering
      if (options.optionId) {
        constraints.push(where('optionId', '==', options.optionId));
      }

      const countQuery = query(collection(db, 'prediction_commitments'), ...constraints);
      const countSnapshot = await getDocs(countQuery);
      
      return countSnapshot?.size || 0;
    } catch (error) {
      console.warn('[ADMIN_COMMITMENT_SERVICE] Error getting commitment count:', error);
      return 0; // Return 0 as fallback to prevent dashboard breaks
    }
  }

  /**
   * Create real-time listener for market commitments with live updates
   * ENHANCED: Now supports backward compatibility for both binary and multi-option markets
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
      optionId?: string;  // NEW: Support for option-based filtering
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      pageSize?: number;
    } = {}
  ): Unsubscribe {
    const {
      status,
      position,
      optionId,  // NEW: Option-based filtering
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
    // NEW: Support optionId filtering
    if (optionId) {
      constraints.push(where('optionId', '==', optionId));
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
          let commitments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            committedAt: doc.data().committedAt?.toDate?.()?.toISOString() || doc.data().committedAt,
            resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || doc.data().resolvedAt
          })) as PredictionCommitment[];

          // BACKWARD COMPATIBILITY: Fetch market data for compatibility enhancement
          let market: Market | null = null;
          try {
            const marketDoc = await getDoc(doc(db, 'markets', marketId));
            if (marketDoc.exists()) {
              market = { id: marketDoc.id, ...marketDoc.data() } as Market;
              // Ensure market has options for compatibility
              if (!market.options || market.options.length === 0) {
                market.options = [
                  { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
                  { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
                ];
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch market ${marketId} for real-time compatibility:`, error);
          }

          // Enhance commitments with compatibility layer
          if (market) {
            commitments = commitments.map(commitment => 
              this.enhanceCommitmentCompatibility(commitment, market!)
            );
          }

          // Enhance with user data
          const enhancedCommitments = await this.enhanceCommitmentsWithUsers(commitments);

          // Calculate real-time analytics (enhanced version if market available)
          const analytics = market 
            ? this.calculateEnhancedMarketAnalytics(commitments, market)
            : this.calculateMarketAnalytics(commitments);

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
   * ENHANCED: Now supports backward compatibility for both binary and multi-option markets
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
      async (snapshot) => {
        try {
          let commitments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            committedAt: doc.data().committedAt?.toDate?.()?.toISOString() || doc.data().committedAt,
            resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || doc.data().resolvedAt
          })) as PredictionCommitment[];

          // BACKWARD COMPATIBILITY: Fetch market data for enhanced analytics
          let market: Market | null = null;
          try {
            const marketDoc = await getDoc(doc(db, 'markets', marketId));
            if (marketDoc.exists()) {
              market = { id: marketDoc.id, ...marketDoc.data() } as Market;
              // Ensure market has options for compatibility
              if (!market.options || market.options.length === 0) {
                market.options = [
                  { id: 'yes', text: 'Yes', totalTokens: 0, participantCount: 0 },
                  { id: 'no', text: 'No', totalTokens: 0, participantCount: 0 }
                ];
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch market ${marketId} for analytics compatibility:`, error);
          }

          // Enhance commitments with compatibility layer
          if (market) {
            commitments = commitments.map(commitment => 
              this.enhanceCommitmentCompatibility(commitment, market!)
            );
          }

          // Calculate analytics (enhanced version if market available)
          const analytics = market 
            ? this.calculateEnhancedMarketAnalytics(commitments, market)
            : this.calculateMarketAnalytics(commitments);
            
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
   * ENHANCED: Now supports backward compatibility caching
   */
  static async getCachedMarketAnalytics(
    marketId: string,
    maxAge: number = 60000 // 1 minute default cache
  ): Promise<MarketAnalytics> {
    const cacheKey = `market_analytics_${marketId}`;
    
    try {
      // Check if we have cached data (in a real implementation, use Redis or similar)
      const cached = this.analyticsCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < maxAge) {
        return cached.data;
      }

      // Fetch fresh analytics using enhanced method
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

    } catch (error) {
      console.error(`[CACHED_ANALYTICS] Error fetching analytics for market ${marketId}:`, error);
      
      // Return cached data if available, even if stale
      const cached = this.analyticsCache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
      
      // Return empty analytics as fallback
      return this.getEmptyAnalytics();
    }
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

  // ========================================
  // ADDITIONAL BACKWARD COMPATIBILITY METHODS
  // ========================================

  /**
   * Validates that a commitment has all required fields for backward compatibility
   * Used during transition period to catch edge cases
   */
  private static validateCommitmentCompatibility(commitment: PredictionCommitment): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!commitment.id) errors.push('Missing commitment ID');
    if (!commitment.userId) errors.push('Missing user ID');
    if (!commitment.predictionId && !commitment.marketId) errors.push('Missing market reference');
    if (!commitment.tokensCommitted || commitment.tokensCommitted <= 0) errors.push('Invalid token amount');

    // Check backward compatibility fields
    if (!commitment.position && !commitment.optionId) {
      warnings.push('Missing both position and optionId - will use defaults');
    }

    // Check metadata completeness
    if (!commitment.metadata) {
      warnings.push('Missing metadata - some dashboard features may not work');
    } else {
      if (!commitment.metadata.marketTitle) warnings.push('Missing market title in metadata');
      if (!commitment.metadata.oddsSnapshot) warnings.push('Missing odds snapshot in metadata');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Repairs a commitment record to ensure backward compatibility
   * Used during transition period to fix incomplete records
   */
  private static repairCommitmentForCompatibility(
    commitment: PredictionCommitment,
    market?: Market
  ): PredictionCommitment {
    const repaired = { ...commitment };

    // Ensure basic fields exist
    if (!repaired.predictionId && repaired.marketId) {
      repaired.predictionId = repaired.marketId;
    }
    if (!repaired.marketId && repaired.predictionId) {
      repaired.marketId = repaired.predictionId;
    }

    // Ensure position field exists
    if (!repaired.position) {
      if (repaired.optionId && market?.options) {
        repaired.position = repaired.optionId === market.options[0]?.id ? 'yes' : 'no';
      } else {
        repaired.position = 'yes'; // Default fallback
      }
    }

    // Ensure optionId field exists
    if (!repaired.optionId) {
      if (market?.options && market.options.length >= 2) {
        repaired.optionId = repaired.position === 'yes' ? market.options[0].id : market.options[1].id;
      } else {
        repaired.optionId = repaired.position; // Fallback to position value
      }
    }

    // Ensure metadata exists
    if (!repaired.metadata) {
      repaired.metadata = {
        marketStatus: 'active' as any,
        marketTitle: market?.title || 'Unknown Market',
        marketEndsAt: market?.endsAt || Timestamp.now(),
        oddsSnapshot: {
          yesOdds: 2.0,
          noOdds: 2.0,
          totalYesTokens: 0,
          totalNoTokens: 0,
          totalParticipants: 0
        },
        userBalanceAtCommitment: 0,
        commitmentSource: 'web' as any
      };
    }

    return repaired;
  }

  /**
   * Logs compatibility issues for monitoring during transition period
   */
  private static logCompatibilityIssue(
    type: 'warning' | 'error',
    message: string,
    commitmentId?: string,
    marketId?: string
  ): void {
    const logData = {
      type,
      message,
      commitmentId,
      marketId,
      timestamp: new Date().toISOString(),
      service: 'AdminCommitmentService'
    };

    if (type === 'error') {
      console.error('[COMPATIBILITY_ERROR]', logData);
    } else {
      console.warn('[COMPATIBILITY_WARNING]', logData);
    }

    // In production, send to monitoring service
    // await MonitoringService.logCompatibilityIssue(logData);
  }

  /**
   * Test method to verify backward compatibility with existing dashboard queries
   * This can be used during testing to ensure identical results before/after migration
   */
  static async testBackwardCompatibility(marketId: string): Promise<{
    success: boolean;
    issues: string[];
    statistics: {
      totalCommitments: number;
      binaryCommitments: number;
      optionCommitments: number;
      missingFields: number;
    };
  }> {
    const issues: string[] = [];
    let binaryCommitments = 0;
    let optionCommitments = 0;
    let missingFields = 0;

    try {
      // Fetch all commitments for the market
      const result = await this.getMarketCommitments(marketId, {
        pageSize: 10000,
        includeAnalytics: true
      });

      // Analyze each commitment
      result.commitments.forEach(commitment => {
        const validation = this.validateCommitmentCompatibility(commitment);
        
        if (!validation.isValid) {
          issues.push(`Commitment ${commitment.id}: ${validation.errors.join(', ')}`);
          missingFields++;
        }

        validation.warnings.forEach(warning => {
          issues.push(`Commitment ${commitment.id}: ${warning}`);
        });

        // Count commitment types
        if (commitment.position && !commitment.optionId) {
          binaryCommitments++;
        } else if (commitment.optionId && !commitment.position) {
          optionCommitments++;
        } else if (commitment.position && commitment.optionId) {
          // Both fields present - good for compatibility
        } else {
          issues.push(`Commitment ${commitment.id}: Missing both position and optionId`);
        }
      });

      // Test analytics calculation
      if (!result.analytics) {
        issues.push('Analytics calculation failed');
      } else {
        // Verify analytics make sense
        if (result.analytics.totalTokens <= 0 && result.commitments.length > 0) {
          issues.push('Analytics show zero tokens but commitments exist');
        }
        if (result.analytics.yesPercentage + result.analytics.noPercentage !== 100 && result.analytics.totalTokens > 0) {
          issues.push('Yes/No percentages do not sum to 100%');
        }
      }

      return {
        success: issues.length === 0,
        issues,
        statistics: {
          totalCommitments: result.commitments.length,
          binaryCommitments,
          optionCommitments,
          missingFields
        }
      };

    } catch (error) {
      return {
        success: false,
        issues: [`Test failed with error: ${error}`],
        statistics: {
          totalCommitments: 0,
          binaryCommitments: 0,
          optionCommitments: 0,
          missingFields: 0
        }
      };
    }
  }
}