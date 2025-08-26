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
  arrayUnion,
  arrayRemove,
  DocumentSnapshot,
  QueryConstraint
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import {
  Market,
  Prediction,
  Comment,
  Transaction,
  Notification,
  LeaderboardEntry,
  Analytics,
  AppConfig,
  MarketStatus,
  MarketCategory
} from '@/lib/types/database'

// Collection references
const COLLECTIONS = {
  users: 'users',
  markets: 'markets',
  predictions: 'predictions',
  comments: 'comments',
  transactions: 'transactions',
  notifications: 'notifications',
  leaderboard: 'leaderboard',
  analytics: 'analytics',
  config: 'config'
} as const

// Markets Service
export class MarketsService {
  static async createMarket(marketData: Omit<Market, 'id' | 'createdAt' | 'totalParticipants' | 'totalTokensStaked'>): Promise<string> {
    const market: Omit<Market, 'id'> = {
      ...marketData,
      createdAt: Timestamp.now(),
      totalParticipants: 0,
      totalTokensStaked: 0
    }
    
    const docRef = await addDoc(collection(db, COLLECTIONS.markets), market)
    return docRef.id
  }

  static async getMarket(id: string): Promise<Market | null> {
    const docRef = doc(db, COLLECTIONS.markets, id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Market
    }
    return null
  }

  static async getMarkets(filters?: {
    status?: MarketStatus
    category?: MarketCategory
    featured?: boolean
    trending?: boolean
    limit?: number
    startAfter?: DocumentSnapshot
  }): Promise<{ markets: Market[]; lastDoc?: DocumentSnapshot }> {
    const constraints: QueryConstraint[] = []
    
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status))
    }
    if (filters?.category) {
      constraints.push(where('category', '==', filters.category))
    }
    if (filters?.featured) {
      constraints.push(where('featured', '==', true))
    }
    if (filters?.trending) {
      constraints.push(where('trending', '==', true))
    }
    
    constraints.push(orderBy('createdAt', 'desc'))
    
    if (filters?.limit) {
      constraints.push(limit(filters.limit))
    }
    
    if (filters?.startAfter) {
      constraints.push(startAfter(filters.startAfter))
    }

    const q = query(collection(db, COLLECTIONS.markets), ...constraints)
    const querySnapshot = await getDocs(q)
    
    const markets = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Market[]
    
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1]
    
    return { markets, lastDoc }
  }

  static async updateMarket(id: string, updates: Partial<Market>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.markets, id)
    await updateDoc(docRef, updates)
  }

  static async resolveMarket(id: string, correctOptionId: string): Promise<void> {
    const batch = writeBatch(db)
    
    // Update market status
    const marketRef = doc(db, COLLECTIONS.markets, id)
    batch.update(marketRef, {
      status: 'resolved' as MarketStatus,
      resolvedAt: Timestamp.now()
    })
    
    // Update the correct option
    const market = await this.getMarket(id)
    if (market) {
      const updatedOptions = market.options.map(option => ({
        ...option,
        isCorrect: option.id === correctOptionId
      }))
      
      batch.update(marketRef, { options: updatedOptions })
    }
    
    await batch.commit()
    
    // Process winning predictions (separate transaction)
    await this.processWinningPredictions(id, correctOptionId)
  }

  private static async processWinningPredictions(marketId: string, correctOptionId: string): Promise<void> {
    // Get all predictions for this market
    const predictionsQuery = query(
      collection(db, COLLECTIONS.predictions),
      where('marketId', '==', marketId)
    )
    const predictionsSnapshot = await getDocs(predictionsQuery)
    
    const batch = writeBatch(db)
    
    // Calculate total tokens staked on correct option
    let totalCorrectTokens = 0
    let totalAllTokens = 0
    
    predictionsSnapshot.docs.forEach(predDoc => {
      const prediction = predDoc.data() as Prediction
      totalAllTokens += prediction.tokensStaked
      if (prediction.optionId === correctOptionId) {
        totalCorrectTokens += prediction.tokensStaked
      }
    })
    
    // Process each prediction
    predictionsSnapshot.docs.forEach(predDoc => {
      const prediction = { id: predDoc.id, ...predDoc.data() } as Prediction
      const isWinning = prediction.optionId === correctOptionId
      
      let tokensWon = 0
      if (isWinning && totalCorrectTokens > 0) {
        // Winner gets their stake back plus proportional share of losing tokens
        const winningShare = prediction.tokensStaked / totalCorrectTokens
        const losingTokens = totalAllTokens - totalCorrectTokens
        tokensWon = prediction.tokensStaked + (losingTokens * winningShare)
      }
      
      // Update prediction
      const predictionRef = doc(db, COLLECTIONS.predictions, prediction.id)
      batch.update(predictionRef, {
        isWinning,
        tokensWon: Math.floor(tokensWon)
      })
      
      // Update user balance if they won
      if (isWinning && tokensWon > 0) {
        const userRef = doc(db, COLLECTIONS.users, prediction.userId)
        batch.update(userRef, {
          tokenBalance: increment(Math.floor(tokensWon)),
          correctPredictions: increment(1)
        })
        
        // Create transaction record
        const transactionRef = doc(collection(db, COLLECTIONS.transactions))
        batch.set(transactionRef, {
          userId: prediction.userId,
          type: 'prediction_win',
          amount: Math.floor(tokensWon),
          description: `Won prediction on market`,
          createdAt: Timestamp.now(),
          marketId,
          predictionId: prediction.id
        })
      }
    })
    
    await batch.commit()
  }
}

// Predictions Service
export class PredictionsService {
  static async createPrediction(predictionData: Omit<Prediction, 'id' | 'createdAt'>): Promise<string> {
    const batch = writeBatch(db)
    
    // Create prediction
    const predictionRef = doc(collection(db, COLLECTIONS.predictions))
    const prediction: Omit<Prediction, 'id'> = {
      ...predictionData,
      createdAt: Timestamp.now()
    }
    batch.set(predictionRef, prediction)
    
    // Update user balance
    const userRef = doc(db, COLLECTIONS.users, predictionData.userId)
    batch.update(userRef, {
      tokenBalance: increment(-predictionData.tokensStaked),
      totalPredictions: increment(1)
    })
    
    // Update market stats
    const marketRef = doc(db, COLLECTIONS.markets, predictionData.marketId)
    batch.update(marketRef, {
      totalTokensStaked: increment(predictionData.tokensStaked),
      totalParticipants: increment(1)
    })
    
    // Create transaction record
    const transactionRef = doc(collection(db, COLLECTIONS.transactions))
    batch.set(transactionRef, {
      userId: predictionData.userId,
      type: 'prediction_stake',
      amount: -predictionData.tokensStaked,
      description: `Staked tokens on prediction`,
      createdAt: Timestamp.now(),
      marketId: predictionData.marketId,
      predictionId: predictionRef.id
    })
    
    await batch.commit()
    return predictionRef.id
  }

  static async getUserPredictions(userId: string, marketId?: string): Promise<Prediction[]> {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ]
    
    if (marketId) {
      constraints.push(where('marketId', '==', marketId))
    }
    
    const q = query(collection(db, COLLECTIONS.predictions), ...constraints)
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Prediction[]
  }

  static async getMarketPredictions(marketId: string): Promise<Prediction[]> {
    const q = query(
      collection(db, COLLECTIONS.predictions),
      where('marketId', '==', marketId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Prediction[]
  }
}

// Comments Service
export class CommentsService {
  static async createComment(commentData: Omit<Comment, 'id' | 'createdAt' | 'likes' | 'likedBy'>): Promise<string> {
    const comment: Omit<Comment, 'id'> = {
      ...commentData,
      createdAt: Timestamp.now(),
      likes: 0,
      likedBy: []
    }
    
    const docRef = await addDoc(collection(db, COLLECTIONS.comments), comment)
    return docRef.id
  }

  static async getMarketComments(marketId: string): Promise<Comment[]> {
    const q = query(
      collection(db, COLLECTIONS.comments),
      where('marketId', '==', marketId),
      where('isDeleted', '!=', true),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Comment[]
  }

  static async likeComment(commentId: string, userId: string): Promise<void> {
    const commentRef = doc(db, COLLECTIONS.comments, commentId)
    await updateDoc(commentRef, {
      likes: increment(1),
      likedBy: arrayUnion(userId)
    })
  }

  static async unlikeComment(commentId: string, userId: string): Promise<void> {
    const commentRef = doc(db, COLLECTIONS.comments, commentId)
    await updateDoc(commentRef, {
      likes: increment(-1),
      likedBy: arrayRemove(userId)
    })
  }
}

// Transactions Service
export class TransactionsService {
  static async getUserTransactions(userId: string, limitCount = 50): Promise<Transaction[]> {
    const q = query(
      collection(db, COLLECTIONS.transactions),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Transaction[]
  }

  static async createTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
    const transaction: Omit<Transaction, 'id'> = {
      ...transactionData,
      createdAt: Timestamp.now()
    }
    
    const docRef = await addDoc(collection(db, COLLECTIONS.transactions), transaction)
    return docRef.id
  }
}

// App Configuration Service
export class ConfigService {
  static async getConfig(): Promise<AppConfig | null> {
    const docRef = doc(db, COLLECTIONS.config, 'config')
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return docSnap.data() as AppConfig
    }
    return null
  }

  static async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.config, 'config')
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    })
  }
}