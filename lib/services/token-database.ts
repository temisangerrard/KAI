import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  increment,
  runTransaction,
  DocumentSnapshot,
  QueryConstraint,
  DocumentReference,
  FirestoreError
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import {
  UserBalance,
  TokenTransaction,
  TokenPackage,
  PredictionCommitment,
  BalanceUpdateRequest
} from '@/lib/types/token'

// Collection references for token management
const COLLECTIONS = {
  userBalances: 'user_balances',
  tokenTransactions: 'token_transactions',
  tokenPackages: 'token_packages',
  predictionCommitments: 'prediction_commitments'
} as const

/**
 * Token Balance Service
 * Handles all user balance operations with optimistic locking
 */
export class TokenBalanceService {
  /**
   * Get user's current balance with optimistic locking support
   */
  static async getUserBalance(userId: string): Promise<UserBalance | null> {
    try {
      const balanceRef = doc(db, COLLECTIONS.userBalances, userId)
      const balanceSnap = await getDoc(balanceRef)
      
      if (balanceSnap.exists()) {
        return { ...balanceSnap.data() } as UserBalance
      }
      
      // Create initial balance if doesn't exist
      const initialBalance: UserBalance = {
        userId,
        availableTokens: 0,
        committedTokens: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: Timestamp.now(),
        version: 1
      }
      
      await updateDoc(balanceRef, initialBalance)
      return initialBalance
    } catch (error) {
      console.error('Error getting user balance:', error)
      throw new Error('Failed to retrieve user balance')
    }
  }

  /**
   * Update user balance with optimistic locking and atomic transaction
   */
  static async updateBalance(request: BalanceUpdateRequest): Promise<UserBalance> {
    const { userId, amount, type, relatedId, metadata } = request
    
    return await runTransaction(db, async (transaction) => {
      const balanceRef = doc(db, COLLECTIONS.userBalances, userId)
      const balanceSnap = await transaction.get(balanceRef)
      
      let currentBalance: UserBalance
      
      if (balanceSnap.exists()) {
        currentBalance = balanceSnap.data() as UserBalance
      } else {
        // Create initial balance
        currentBalance = {
          userId,
          availableTokens: 0,
          committedTokens: 0,
          totalEarned: 0,
          totalSpent: 0,
          lastUpdated: Timestamp.now(),
          version: 1
        }
      }
      
      // Calculate new balance based on transaction type
      const balanceBefore = currentBalance.availableTokens
      let newAvailableTokens = currentBalance.availableTokens
      let newCommittedTokens = currentBalance.committedTokens
      let newTotalEarned = currentBalance.totalEarned
      let newTotalSpent = currentBalance.totalSpent
      
      switch (type) {
        case 'purchase':
          newAvailableTokens += amount
          newTotalEarned += amount
          break
        case 'commit':
          if (newAvailableTokens < amount) {
            throw new Error('Insufficient available tokens')
          }
          newAvailableTokens -= amount
          newCommittedTokens += amount
          break
        case 'win':
          newCommittedTokens -= Math.abs(amount) // Remove from committed
          newAvailableTokens += amount // Add winnings to available
          newTotalEarned += amount
          break
        case 'loss':
          newCommittedTokens -= Math.abs(amount) // Remove from committed
          newTotalSpent += Math.abs(amount)
          break
        case 'refund':
          newCommittedTokens -= Math.abs(amount) // Remove from committed
          newAvailableTokens += Math.abs(amount) // Return to available
          break
        default:
          throw new Error(`Unknown transaction type: ${type}`)
      }
      
      // Validate balance constraints
      if (newAvailableTokens < 0 || newCommittedTokens < 0) {
        throw new Error('Invalid balance operation would result in negative balance')
      }
      
      const updatedBalance: UserBalance = {
        ...currentBalance,
        availableTokens: newAvailableTokens,
        committedTokens: newCommittedTokens,
        totalEarned: newTotalEarned,
        totalSpent: newTotalSpent,
        lastUpdated: Timestamp.now(),
        version: currentBalance.version + 1
      }
      
      // Update balance
      transaction.set(balanceRef, updatedBalance)
      
      // Create transaction record
      const transactionRef = doc(collection(db, COLLECTIONS.tokenTransactions))
      const tokenTransaction: Omit<TokenTransaction, 'id'> = {
        userId,
        type,
        amount,
        balanceBefore,
        balanceAfter: newAvailableTokens,
        relatedId,
        metadata: metadata || {},
        timestamp: Timestamp.now(),
        status: 'completed'
      }
      
      transaction.set(transactionRef, tokenTransaction)
      
      return updatedBalance
    })
  }

  /**
   * Validate if user has sufficient balance for a transaction
   */
  static async validateSufficientBalance(userId: string, requiredAmount: number): Promise<boolean> {
    const balance = await this.getUserBalance(userId)
    return balance ? balance.availableTokens >= requiredAmount : false
  }

  /**
   * Get balance summary for multiple users (admin function)
   */
  static async getBalanceSummary(userIds: string[]): Promise<UserBalance[]> {
    const balances: UserBalance[] = []
    
    for (const userId of userIds) {
      const balance = await this.getUserBalance(userId)
      if (balance) {
        balances.push(balance)
      }
    }
    
    return balances
  }
}
/**

 * Token Transaction Service
 * Handles transaction history and queries
 */
export class TokenTransactionService {
  /**
   * Get user's transaction history with pagination
   */
  static async getUserTransactions(
    userId: string,
    limitCount = 50,
    startAfterDoc?: DocumentSnapshot
  ): Promise<{ transactions: TokenTransaction[]; lastDoc?: DocumentSnapshot }> {
    try {
      const constraints: QueryConstraint[] = [
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      ]
      
      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc))
      }
      
      const q = query(collection(db, COLLECTIONS.tokenTransactions), ...constraints)
      const querySnapshot = await getDocs(q)
      
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TokenTransaction[]
      
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1]
      
      return { transactions, lastDoc }
    } catch (error) {
      console.error('Error getting user transactions:', error)
      throw new Error('Failed to retrieve transaction history')
    }
  }

  /**
   * Get transactions by type for a user
   */
  static async getTransactionsByType(
    userId: string,
    type: TokenTransaction['type'],
    limitCount = 20
  ): Promise<TokenTransaction[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.tokenTransactions),
        where('userId', '==', userId),
        where('type', '==', type),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TokenTransaction[]
    } catch (error) {
      console.error('Error getting transactions by type:', error)
      throw new Error('Failed to retrieve transactions')
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransaction(transactionId: string): Promise<TokenTransaction | null> {
    try {
      const transactionRef = doc(db, COLLECTIONS.tokenTransactions, transactionId)
      const transactionSnap = await getDoc(transactionRef)
      
      if (transactionSnap.exists()) {
        return {
          id: transactionSnap.id,
          ...transactionSnap.data()
        } as TokenTransaction
      }
      
      return null
    } catch (error) {
      console.error('Error getting transaction:', error)
      throw new Error('Failed to retrieve transaction')
    }
  }

  /**
   * Create a new transaction record (used internally by balance service)
   */
  static async createTransaction(transactionData: Omit<TokenTransaction, 'id'>): Promise<string> {
    try {
      const transactionRef = await addDoc(
        collection(db, COLLECTIONS.tokenTransactions),
        transactionData
      )
      return transactionRef.id
    } catch (error) {
      console.error('Error creating transaction:', error)
      throw new Error('Failed to create transaction record')
    }
  }

  /**
   * Get all transactions for admin monitoring
   */
  static async getAllTransactions(
    limitCount = 100,
    startAfterDoc?: DocumentSnapshot
  ): Promise<{ transactions: TokenTransaction[]; lastDoc?: DocumentSnapshot }> {
    try {
      const constraints: QueryConstraint[] = [
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      ]
      
      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc))
      }
      
      const q = query(collection(db, COLLECTIONS.tokenTransactions), ...constraints)
      const querySnapshot = await getDocs(q)
      
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TokenTransaction[]
      
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1]
      
      return { transactions, lastDoc }
    } catch (error) {
      console.error('Error getting all transactions:', error)
      throw new Error('Failed to retrieve transactions')
    }
  }
}

/**
 * Token Package Service
 * Handles token package management for purchases
 */
export class TokenPackageService {
  /**
   * Get all active token packages
   */
  static async getActivePackages(): Promise<TokenPackage[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.tokenPackages),
        where('isActive', '==', true),
        orderBy('sortOrder', 'asc')
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TokenPackage[]
    } catch (error) {
      console.error('Error getting active packages:', error)
      throw new Error('Failed to retrieve token packages')
    }
  }

  /**
   * Get token package by ID
   */
  static async getPackage(packageId: string): Promise<TokenPackage | null> {
    try {
      const packageRef = doc(db, COLLECTIONS.tokenPackages, packageId)
      const packageSnap = await getDoc(packageRef)
      
      if (packageSnap.exists()) {
        return {
          id: packageSnap.id,
          ...packageSnap.data()
        } as TokenPackage
      }
      
      return null
    } catch (error) {
      console.error('Error getting package:', error)
      throw new Error('Failed to retrieve token package')
    }
  }

  /**
   * Create a new token package (admin function)
   */
  static async createPackage(packageData: Omit<TokenPackage, 'id' | 'createdAt'>): Promise<string> {
    try {
      const newPackage: Omit<TokenPackage, 'id'> = {
        ...packageData,
        createdAt: Timestamp.now()
      }
      
      const packageRef = await addDoc(collection(db, COLLECTIONS.tokenPackages), newPackage)
      return packageRef.id
    } catch (error) {
      console.error('Error creating package:', error)
      throw new Error('Failed to create token package')
    }
  }

  /**
   * Update token package (admin function)
   */
  static async updatePackage(packageId: string, updates: Partial<TokenPackage>): Promise<void> {
    try {
      const packageRef = doc(db, COLLECTIONS.tokenPackages, packageId)
      await updateDoc(packageRef, updates)
    } catch (error) {
      console.error('Error updating package:', error)
      throw new Error('Failed to update token package')
    }
  }

  /**
   * Delete token package (admin function)
   */
  static async deletePackage(packageId: string): Promise<void> {
    try {
      const packageRef = doc(db, COLLECTIONS.tokenPackages, packageId)
      await deleteDoc(packageRef)
    } catch (error) {
      console.error('Error deleting package:', error)
      throw new Error('Failed to delete token package')
    }
  }
}/**
 * Prediction Commitment Service
 * Handles token commitments to predictions with enhanced multi-option support
 * 
 * BACKWARD COMPATIBILITY: All existing methods preserved and enhanced
 * NEW FEATURES: Integration with EnhancedCommitmentService for multi-option support
 */
export class PredictionCommitmentService {
  /**
   * Create a new prediction commitment (ENHANCED with backward compatibility)
   * 
   * This method now uses the EnhancedCommitmentService internally while maintaining
   * the exact same API for existing code compatibility.
   */
  static async createCommitment(commitmentData: Omit<PredictionCommitment, 'id' | 'committedAt'>): Promise<string> {
    try {
      // Import EnhancedCommitmentService dynamically to avoid circular dependencies
      const { EnhancedCommitmentService } = await import('./enhanced-commitment-service');
      
      // Convert legacy commitment data to enhanced request format
      const enhancedRequest = {
        userId: commitmentData.userId,
        predictionId: commitmentData.predictionId,
        marketId: commitmentData.marketId || commitmentData.predictionId,
        position: commitmentData.position,
        optionId: commitmentData.optionId,
        tokensToCommit: commitmentData.tokensCommitted,
        clientInfo: {
          source: commitmentData.metadata?.commitmentSource || 'web',
          ipAddress: commitmentData.metadata?.ipAddress,
          userAgent: commitmentData.metadata?.userAgent
        }
      };

      // Use enhanced service for creation
      const result = await EnhancedCommitmentService.createCommitment(enhancedRequest);
      
      if (result.success && result.commitmentId) {
        return result.commitmentId;
      } else {
        throw new Error(result.error?.message || 'Failed to create commitment');
      }
    } catch (error) {
      console.error('[PREDICTION_COMMITMENT_SERVICE] Enhanced creation failed, falling back to legacy method:', error);
      
      // Fallback to original implementation for backward compatibility
      return await this.createCommitmentLegacy(commitmentData);
    }
  }

  /**
   * Legacy commitment creation method (preserved for fallback)
   * Maintains original implementation as backup
   */
  private static async createCommitmentLegacy(commitmentData: Omit<PredictionCommitment, 'id' | 'committedAt'>): Promise<string> {
    return await runTransaction(db, async (transaction) => {
      // Validate user has sufficient balance
      const balanceRef = doc(db, COLLECTIONS.userBalances, commitmentData.userId)
      const balanceSnap = await transaction.get(balanceRef)
      
      if (!balanceSnap.exists()) {
        throw new Error('User balance not found')
      }
      
      const balance = balanceSnap.data() as UserBalance
      if (balance.availableTokens < commitmentData.tokensCommitted) {
        throw new Error('Insufficient available tokens')
      }
      
      // Create commitment record
      const commitmentRef = doc(collection(db, COLLECTIONS.predictionCommitments))
      const commitment: Omit<PredictionCommitment, 'id'> = {
        ...commitmentData,
        committedAt: Timestamp.now()
      }
      
      transaction.set(commitmentRef, commitment)
      
      // Update user balance (move tokens from available to committed)
      const updatedBalance: UserBalance = {
        ...balance,
        availableTokens: balance.availableTokens - commitmentData.tokensCommitted,
        committedTokens: balance.committedTokens + commitmentData.tokensCommitted,
        lastUpdated: Timestamp.now(),
        version: balance.version + 1
      }
      
      transaction.set(balanceRef, updatedBalance)
      
      // Create transaction record
      const transactionRef = doc(collection(db, COLLECTIONS.tokenTransactions))
      const tokenTransaction: Omit<TokenTransaction, 'id'> = {
        userId: commitmentData.userId,
        type: 'commit',
        amount: commitmentData.tokensCommitted,
        balanceBefore: balance.availableTokens,
        balanceAfter: updatedBalance.availableTokens,
        relatedId: commitmentData.predictionId,
        metadata: {
          position: commitmentData.position,
          optionId: commitmentData.optionId,
          odds: commitmentData.odds,
          potentialWinning: commitmentData.potentialWinning
        },
        timestamp: Timestamp.now(),
        status: 'completed'
      }
      
      transaction.set(transactionRef, tokenTransaction)
      
      return commitmentRef.id
    })
  }

  /**
   * Create commitment for binary markets (enhanced convenience method)
   * Provides a clean API for binary market commitments
   */
  static async createBinaryCommitment(
    userId: string,
    marketId: string,
    position: 'yes' | 'no',
    tokensToCommit: number,
    odds: number,
    potentialWinning: number,
    metadata?: Partial<PredictionCommitment['metadata']>
  ): Promise<string> {
    try {
      const { EnhancedCommitmentService } = await import('./enhanced-commitment-service');
      
      const result = await EnhancedCommitmentService.createBinaryCommitment(
        userId,
        marketId,
        position,
        tokensToCommit,
        {
          source: metadata?.commitmentSource || 'web',
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent
        }
      );
      
      if (result.success && result.commitmentId) {
        return result.commitmentId;
      } else {
        throw new Error(result.error?.message || 'Failed to create binary commitment');
      }
    } catch (error) {
      console.error('[PREDICTION_COMMITMENT_SERVICE] Binary commitment creation failed:', error);
      throw error;
    }
  }

  /**
   * Create commitment for multi-option markets (new functionality)
   * Provides direct optionId targeting for multi-option markets
   */
  static async createMultiOptionCommitment(
    userId: string,
    marketId: string,
    optionId: string,
    tokensToCommit: number,
    metadata?: Partial<PredictionCommitment['metadata']>
  ): Promise<string> {
    try {
      const { EnhancedCommitmentService } = await import('./enhanced-commitment-service');
      
      const result = await EnhancedCommitmentService.createMultiOptionCommitment(
        userId,
        marketId,
        optionId,
        tokensToCommit,
        {
          source: metadata?.commitmentSource || 'web',
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent
        }
      );
      
      if (result.success && result.commitmentId) {
        return result.commitmentId;
      } else {
        throw new Error(result.error?.message || 'Failed to create multi-option commitment');
      }
    } catch (error) {
      console.error('[PREDICTION_COMMITMENT_SERVICE] Multi-option commitment creation failed:', error);
      throw error;
    }
  }

  /**
   * Get user's commitments for a specific prediction
   */
  static async getUserCommitments(userId: string, predictionId?: string): Promise<PredictionCommitment[]> {
    try {
      console.log('[PREDICTION_COMMITMENT_SERVICE] Fetching commitments for userId:', userId)
      
      const constraints: QueryConstraint[] = [
        where('userId', '==', userId)
      ]
      
      if (predictionId) {
        constraints.push(where('predictionId', '==', predictionId))
      }
      
      console.log('[PREDICTION_COMMITMENT_SERVICE] Query constraints:', constraints.length)
      
      const q = query(collection(db, COLLECTIONS.predictionCommitments), ...constraints)
      const querySnapshot = await getDocs(q)
      
      console.log('[PREDICTION_COMMITMENT_SERVICE] Query executed, docs found:', querySnapshot.docs.length)
      
      const commitments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[]

      // Sort on client side to avoid index requirement
      commitments.sort((a, b) => {
        const aTime = a.committedAt?.toMillis?.() || 0
        const bTime = b.committedAt?.toMillis?.() || 0
        return bTime - aTime // desc order
      })

      console.log('[PREDICTION_COMMITMENT_SERVICE] Returning commitments:', commitments.length)
      return commitments
    } catch (error) {
      console.error('[PREDICTION_COMMITMENT_SERVICE] Error getting user commitments:', error)
      throw new Error('Failed to retrieve user commitments')
    }
  }

  /**
   * Get all commitments for a specific prediction
   */
  static async getPredictionCommitments(predictionId: string): Promise<PredictionCommitment[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.predictionCommitments),
        where('predictionId', '==', predictionId),
        orderBy('committedAt', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[]
    } catch (error) {
      console.error('Error getting prediction commitments:', error)
      throw new Error('Failed to retrieve prediction commitments')
    }
  }

  /**
   * Update commitment status (used when predictions are resolved)
   */
  static async updateCommitmentStatus(
    commitmentId: string,
    status: PredictionCommitment['status'],
    resolvedAt?: Timestamp
  ): Promise<void> {
    try {
      const commitmentRef = doc(db, COLLECTIONS.predictionCommitments, commitmentId)
      const updates: Partial<PredictionCommitment> = { status }
      
      if (resolvedAt) {
        updates.resolvedAt = resolvedAt
      }
      
      await updateDoc(commitmentRef, updates)
    } catch (error) {
      console.error('Error updating commitment status:', error)
      throw new Error('Failed to update commitment status')
    }
  }

  /**
   * Process prediction resolution (batch update commitments and balances)
   */
  static async resolvePredictionCommitments(
    predictionId: string,
    winningPosition: 'yes' | 'no'
  ): Promise<void> {
    const batch = writeBatch(db)
    
    try {
      // Get all commitments for this prediction
      const commitments = await this.getPredictionCommitments(predictionId)
      
      // Calculate total tokens and winning tokens
      const totalTokens = commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      const winningTokens = commitments
        .filter(c => c.position === winningPosition)
        .reduce((sum, c) => sum + c.tokensCommitted, 0)
      
      const losingTokens = totalTokens - winningTokens
      
      // Process each commitment
      for (const commitment of commitments) {
        const isWinner = commitment.position === winningPosition
        const commitmentRef = doc(db, COLLECTIONS.predictionCommitments, commitment.id)
        
        // Update commitment status
        batch.update(commitmentRef, {
          status: isWinner ? 'won' : 'lost',
          resolvedAt: Timestamp.now()
        })
        
        // Calculate payout for winners
        if (isWinner && winningTokens > 0) {
          const winningShare = commitment.tokensCommitted / winningTokens
          const payout = commitment.tokensCommitted + (losingTokens * winningShare)
          
          // Update user balance
          const balanceRef = doc(db, COLLECTIONS.userBalances, commitment.userId)
          batch.update(balanceRef, {
            availableTokens: increment(Math.floor(payout)),
            committedTokens: increment(-commitment.tokensCommitted),
            totalEarned: increment(Math.floor(payout)),
            lastUpdated: Timestamp.now(),
            version: increment(1)
          })
          
          // Create win transaction
          const transactionRef = doc(collection(db, COLLECTIONS.tokenTransactions))
          batch.set(transactionRef, {
            userId: commitment.userId,
            type: 'win',
            amount: Math.floor(payout),
            balanceBefore: 0, // Will be updated by balance service
            balanceAfter: 0, // Will be updated by balance service
            relatedId: predictionId,
            metadata: {
              commitmentId: commitment.id,
              originalStake: commitment.tokensCommitted,
              winningPosition
            },
            timestamp: Timestamp.now(),
            status: 'completed'
          } as Omit<TokenTransaction, 'id'>)
        } else {
          // Handle losers - just remove from committed tokens
          const balanceRef = doc(db, COLLECTIONS.userBalances, commitment.userId)
          batch.update(balanceRef, {
            committedTokens: increment(-commitment.tokensCommitted),
            totalSpent: increment(commitment.tokensCommitted),
            lastUpdated: Timestamp.now(),
            version: increment(1)
          })
          
          // Create loss transaction
          const transactionRef = doc(collection(db, COLLECTIONS.tokenTransactions))
          batch.set(transactionRef, {
            userId: commitment.userId,
            type: 'loss',
            amount: -commitment.tokensCommitted,
            balanceBefore: 0, // Will be updated by balance service
            balanceAfter: 0, // Will be updated by balance service
            relatedId: predictionId,
            metadata: {
              commitmentId: commitment.id,
              originalStake: commitment.tokensCommitted,
              winningPosition
            },
            timestamp: Timestamp.now(),
            status: 'completed'
          } as Omit<TokenTransaction, 'id'>)
        }
      }
      
      await batch.commit()
    } catch (error) {
      console.error('Error resolving prediction commitments:', error)
      throw new Error('Failed to resolve prediction commitments')
    }
  }
}

/**
 * Database Utility Functions
 * Helper functions for database operations and maintenance
 */
export class TokenDatabaseUtils {
  /**
   * Reconcile user balance (detect and fix inconsistencies)
   */
  static async reconcileUserBalance(userId: string): Promise<UserBalance> {
    return await runTransaction(db, async (transaction) => {
      // Get current balance
      const balanceRef = doc(db, COLLECTIONS.userBalances, userId)
      const balanceSnap = await transaction.get(balanceRef)
      
      if (!balanceSnap.exists()) {
        throw new Error('User balance not found')
      }
      
      const currentBalance = balanceSnap.data() as UserBalance
      
      // Calculate actual balance from transactions
      const transactionsQuery = query(
        collection(db, COLLECTIONS.tokenTransactions),
        where('userId', '==', userId),
        where('status', '==', 'completed')
      )
      
      const transactionsSnap = await getDocs(transactionsQuery)
      const transactions = transactionsSnap.docs.map(doc => doc.data() as TokenTransaction)
      
      // Calculate totals from transactions
      let calculatedEarned = 0
      let calculatedSpent = 0
      
      transactions.forEach(tx => {
        if (tx.type === 'purchase' || tx.type === 'win' || tx.type === 'refund') {
          calculatedEarned += Math.abs(tx.amount)
        } else if (tx.type === 'loss') {
          calculatedSpent += Math.abs(tx.amount)
        }
      })
      
      // Get committed tokens from active commitments
      const commitmentsQuery = query(
        collection(db, COLLECTIONS.predictionCommitments),
        where('userId', '==', userId),
        where('status', '==', 'active')
      )
      
      const commitmentsSnap = await getDocs(commitmentsQuery)
      const activeCommitments = commitmentsSnap.docs.map(doc => doc.data() as PredictionCommitment)
      
      const calculatedCommitted = activeCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      const calculatedAvailable = calculatedEarned - calculatedSpent - calculatedCommitted
      
      // Update balance if inconsistencies found
      const reconciledBalance: UserBalance = {
        ...currentBalance,
        availableTokens: Math.max(0, calculatedAvailable),
        committedTokens: calculatedCommitted,
        totalEarned: calculatedEarned,
        totalSpent: calculatedSpent,
        lastUpdated: Timestamp.now(),
        version: currentBalance.version + 1
      }
      
      transaction.set(balanceRef, reconciledBalance)
      
      return reconciledBalance
    })
  }

  /**
   * Get token economy statistics (admin function)
   */
  static async getTokenEconomyStats(): Promise<{
    totalTokensInCirculation: number
    totalTokensPurchased: number
    totalTokensCommitted: number
    totalActiveUsers: number
    totalTransactions: number
  }> {
    try {
      // Get all user balances
      const balancesQuery = query(collection(db, COLLECTIONS.userBalances))
      const balancesSnap = await getDocs(balancesQuery)
      const balances = balancesSnap.docs.map(doc => doc.data() as UserBalance)
      
      const totalTokensInCirculation = balances.reduce((sum, b) => sum + b.availableTokens + b.committedTokens, 0)
      const totalTokensPurchased = balances.reduce((sum, b) => sum + b.totalEarned, 0)
      const totalTokensCommitted = balances.reduce((sum, b) => sum + b.committedTokens, 0)
      const totalActiveUsers = balances.filter(b => b.availableTokens > 0 || b.committedTokens > 0).length
      
      // Get total transaction count
      const transactionsQuery = query(collection(db, COLLECTIONS.tokenTransactions))
      const transactionsSnap = await getDocs(transactionsQuery)
      const totalTransactions = transactionsSnap.size
      
      return {
        totalTokensInCirculation,
        totalTokensPurchased,
        totalTokensCommitted,
        totalActiveUsers,
        totalTransactions
      }
    } catch (error) {
      console.error('Error getting token economy stats:', error)
      throw new Error('Failed to retrieve token economy statistics')
    }
  }
}