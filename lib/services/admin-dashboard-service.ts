import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/db/database';
import { Market, UserProfile } from '@/lib/types/database';
import { PredictionCommitment } from '@/lib/types/token';

export interface AdminDashboardStats {
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
  };
  tokens: {
    totalTokensIssued: number;
    totalTokensInCirculation: number;
    totalTokensCommitted: number;
    totalTokensAvailable: number;
  };
  markets: {
    totalMarkets: number;
    activeMarkets: number;
    resolvedMarkets: number;
    marketsCreatedToday: number;
  };
  activity: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    totalCommitments: number;
    commitmentsToday: number;
  };
  financial: {
    totalRevenue: number;
    dailyRevenue: number;
    weeklyRevenue: number;
    averageTransactionValue: number;
  };
}

export interface AdminTokenStats {
  circulation: {
    totalTokens: number;
    availableTokens: number;
    committedTokens: number;
    totalUsers: number;
    activeUsers: number;
  };
  purchases: {
    totalPurchases: number;
    dailyPurchases: number;
    weeklyPurchases: number;
    totalTransactions: number;
  };
  payouts: {
    totalPayouts: number;
    dailyPayouts: number;
    totalPayoutTransactions: number;
  };
  packages: {
    activePackages: number;
    totalRevenue: number;
  };
  trends: {
    dailyTransactionCount: number;
    weeklyTransactionCount: number;
    weeklyTrend: Array<{
      name: string;
      purchases: number;
      payouts: number;
      date: string;
    }>;
  };
}

export class AdminDashboardService {
  /**
   * Fetch users from both Firebase Auth and Firestore users collection
   * This ensures we get both traditional Firebase users and CDP users
   */
  private static async fetchAllUsers(): Promise<{ users: any[] }> {
    console.log('🔍 Fetching users from Firebase Auth and Firestore...');
    
    try {
      // Fetch Firebase Auth users and Firestore users in parallel
      const [authUsersResult, firestoreUsersSnapshot] = await Promise.all([
        this.fetchFirebaseAuthUsers().catch(error => {
          console.warn('Failed to fetch Firebase Auth users:', error.message);
          return { users: [] };
        }),
        getDocs(collection(db, 'users')).catch(error => {
          console.warn('Failed to fetch Firestore users:', error.message);
          return { docs: [] };
        })
      ]);

      // Process Firebase Auth users
      const authUsers = authUsersResult.users;
      console.log(`📱 Found ${authUsers.length} Firebase Auth users`);

      // Process Firestore users (includes CDP users)
      const firestoreUsers = firestoreUsersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          address: data.address, // CDP wallet address if present
          metadata: {
            creationTime: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            lastSignInTime: data.lastLoginAt?.toDate?.()?.toISOString() || data.lastLoginAt
          },
          isFirestoreUser: true,
          isCdpUser: !!data.address // Flag CDP users
        };
      });
      console.log(`🗄️ Found ${firestoreUsers.length} Firestore users`);

      // Merge users, avoiding duplicates (Firebase Auth users take precedence)
      const authUserIds = new Set(authUsers.map(u => u.uid));
      const uniqueFirestoreUsers = firestoreUsers.filter(u => !authUserIds.has(u.uid));
      
      const allUsers = [...authUsers, ...uniqueFirestoreUsers];
      
      console.log(`✅ Total unique users: ${allUsers.length} (${authUsers.length} Auth + ${uniqueFirestoreUsers.length} Firestore-only)`);
      
      return { users: allUsers };
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      throw new Error(`User fetch failed: ${error.message}`);
    }
  }

  /**
   * Fetch users from Firebase Auth using dynamic import (server-side only)
   */
  private static async fetchFirebaseAuthUsers(): Promise<{ users: any[] }> {
    console.log('🔍 Attempting to fetch users from Firebase Auth...');
    
    try {
      // Dynamic import to avoid client-side issues
      const { adminAuth } = await import('@/lib/firebase-admin');
      
      console.log('✅ Firebase Admin imported successfully');
      
      const listUsersResult = await adminAuth.listUsers();
      const users = listUsersResult.users.map(user => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime
        },
        isFirebaseAuthUser: true
      }));

      console.log(`✅ Successfully fetched ${users.length} users from Firebase Auth`);
      return { users };
    } catch (error) {
      console.error('❌ Failed to fetch from Firebase Admin:', error);
      console.error('Error details:', error.message);
      
      // Don't fail completely - return empty array to allow Firestore users to be shown
      return { users: [] };
    }
  }

  /**
   * Get comprehensive dashboard statistics from Firestore
   * Uses the same reliable approach as the market data retrieval script
   */
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      console.log('🔍 Fetching dashboard statistics from Firestore...');

      // Fetch all required data in parallel - get users from both Firebase Auth and Firestore
      const [
        allUsersResult,
        balancesSnapshot,
        marketsSnapshot,
        commitmentsSnapshot,
        transactionsSnapshot
      ] = await Promise.all([
        this.fetchAllUsers(),
        getDocs(collection(db, 'user_balances')).catch(error => {
          console.warn('Failed to fetch user_balances:', error.message);
          return { docs: [] };
        }),
        getDocs(collection(db, 'markets')).catch(error => {
          console.warn('Failed to fetch markets:', error.message);
          return { docs: [] };
        }),
        getDocs(collection(db, 'prediction_commitments')).catch(error => {
          console.warn('Failed to fetch prediction_commitments:', error.message);
          return { docs: [] };
        }),
        getDocs(collection(db, 'token_transactions')).catch(error => {
          console.warn('Failed to fetch token_transactions:', error.message);
          return { docs: [] };
        })
      ]);

      console.log(`📊 Found ${allUsersResult.users.length} total users, ${marketsSnapshot.docs.length} markets, ${commitmentsSnapshot.docs.length} commitments`);

      // Process users data from both Firebase Auth and Firestore - get ALL users
      const users = allUsersResult.users.map(user => ({
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date(user.metadata.creationTime),
        lastSignIn: user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime) : null
      }));

      // Count users by signup method for debugging
      const emailUsers = users.filter(u => u.email && !u.photoURL);
      const oauthUsers = users.filter(u => u.photoURL);
      const usersWithoutEmail = users.filter(u => !u.email);
      
      console.log(`👥 User breakdown: ${emailUsers.length} email, ${oauthUsers.length} OAuth, ${usersWithoutEmail.length} without email`);

      // Calculate new users with safe date handling
      const newUsersToday = users.filter(user => {
        if (!user.createdAt) return false;
        try {
          return user.createdAt >= today;
        } catch (error) {
          return false;
        }
      }).length;

      const newUsersThisWeek = users.filter(user => {
        if (!user.createdAt) return false;
        try {
          return user.createdAt >= lastWeek;
        } catch (error) {
          return false;
        }
      }).length;

      // Process balances data with error handling
      const balances = balancesSnapshot.docs.map(doc => doc.data());
      const totalTokensInCirculation = balances.reduce((sum, balance) => {
        const available = Number(balance.availableTokens) || 0;
        const committed = Number(balance.committedTokens) || 0;
        return sum + available + committed;
      }, 0);
      
      const totalTokensCommitted = balances.reduce((sum, balance) => 
        sum + (Number(balance.committedTokens) || 0), 0
      );
      
      const totalTokensAvailable = balances.reduce((sum, balance) => 
        sum + (Number(balance.availableTokens) || 0), 0
      );

      // Process markets data
      const markets = marketsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : 
                    data.createdAt ? new Date(data.createdAt) : null
        };
      }) as Market[];

      const activeMarkets = markets.filter(market => 
        market.status === 'active' || market.status === 'open'
      ).length;

      const resolvedMarkets = markets.filter(market => 
        market.status === 'resolved' || market.status === 'closed'
      ).length;

      const marketsCreatedToday = markets.filter(market => {
        if (!market.createdAt) return false;
        try {
          return market.createdAt >= today;
        } catch (error) {
          return false;
        }
      }).length;

      // Process commitments data
      const commitments = commitmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          committedAt: data.committedAt?.toDate ? data.committedAt.toDate() : 
                      data.committedAt ? new Date(data.committedAt) : null
        };
      }) as PredictionCommitment[];

      const commitmentsToday = commitments.filter(commitment => {
        if (!commitment.committedAt) return false;
        try {
          return commitment.committedAt >= today;
        } catch (error) {
          return false;
        }
      }).length;

      // Get active users from recent commitments and transactions
      const recentCommitmentUsers = new Set(
        commitments
          .filter(c => {
            if (!c.committedAt || !c.userId) return false;
            try {
              return c.committedAt >= lastMonth;
            } catch (error) {
              return false;
            }
          })
          .map(c => c.userId)
      );

      // Process transactions data
      const transactions = transactionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : 
                    data.timestamp ? new Date(data.timestamp) : null
        };
      });

      const recentTransactionUsers = new Set(
        transactions
          .filter(t => {
            if (!t.timestamp || !t.userId) return false;
            try {
              return t.timestamp >= lastMonth;
            } catch (error) {
              return false;
            }
          })
          .map(t => t.userId)
      );

      // Combine active users from commitments and transactions
      const allActiveUsers = new Set([...recentCommitmentUsers, ...recentTransactionUsers]);
      
      const dailyActiveUsers = new Set([
        ...commitments
          .filter(c => {
            if (!c.committedAt || !c.userId) return false;
            try {
              return c.committedAt >= yesterday;
            } catch (error) {
              return false;
            }
          })
          .map(c => c.userId),
        ...transactions
          .filter(t => {
            if (!t.timestamp || !t.userId) return false;
            try {
              return t.timestamp >= yesterday;
            } catch (error) {
              return false;
            }
          })
          .map(t => t.userId)
      ]).size;

      const weeklyActiveUsers = new Set([
        ...commitments
          .filter(c => {
            if (!c.committedAt || !c.userId) return false;
            try {
              return c.committedAt >= lastWeek;
            } catch (error) {
              return false;
            }
          })
          .map(c => c.userId),
        ...transactions
          .filter(t => {
            if (!t.timestamp || !t.userId) return false;
            try {
              return t.timestamp >= lastWeek;
            } catch (error) {
              return false;
            }
          })
          .map(t => t.userId)
      ]).size;

      // Calculate financial metrics with safe number handling
      const purchaseTransactions = transactions.filter(t => 
        t.type === 'purchase' && t.status === 'completed' && t.amount
      );
      
      const totalRevenue = purchaseTransactions.reduce((sum, t) => 
        sum + (Number(t.amount) || 0) * 0.1, 0 // Assuming $0.10 per token
      );

      const dailyRevenue = purchaseTransactions
        .filter(t => {
          if (!t.timestamp) return false;
          try {
            return t.timestamp >= yesterday;
          } catch (error) {
            return false;
          }
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0) * 0.1, 0);

      const weeklyRevenue = purchaseTransactions
        .filter(t => {
          if (!t.timestamp) return false;
          try {
            return t.timestamp >= lastWeek;
          } catch (error) {
            return false;
          }
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0) * 0.1, 0);

      const averageTransactionValue = purchaseTransactions.length > 0 
        ? purchaseTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) / purchaseTransactions.length
        : 0;

      const stats = {
        users: {
          totalUsers: users.length,
          activeUsers: allActiveUsers.size,
          newUsersToday,
          newUsersThisWeek
        },
        tokens: {
          totalTokensIssued: totalTokensInCirculation, // Total currently in circulation
          totalTokensInCirculation,
          totalTokensCommitted,
          totalTokensAvailable
        },
        markets: {
          totalMarkets: markets.length,
          activeMarkets,
          resolvedMarkets,
          marketsCreatedToday
        },
        activity: {
          dailyActiveUsers,
          weeklyActiveUsers,
          totalCommitments: commitments.length,
          commitmentsToday
        },
        financial: {
          totalRevenue,
          dailyRevenue,
          weeklyRevenue,
          averageTransactionValue
        }
      };

      console.log('✅ Dashboard statistics compiled successfully');
      return stats;

    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      // Return default stats instead of throwing to prevent complete failure
      return {
        users: {
          totalUsers: 0,
          activeUsers: 0,
          newUsersToday: 0,
          newUsersThisWeek: 0
        },
        tokens: {
          totalTokensIssued: 0,
          totalTokensInCirculation: 0,
          totalTokensCommitted: 0,
          totalTokensAvailable: 0
        },
        markets: {
          totalMarkets: 0,
          activeMarkets: 0,
          resolvedMarkets: 0,
          marketsCreatedToday: 0
        },
        activity: {
          dailyActiveUsers: 0,
          weeklyActiveUsers: 0,
          totalCommitments: 0,
          commitmentsToday: 0
        },
        financial: {
          totalRevenue: 0,
          dailyRevenue: 0,
          weeklyRevenue: 0,
          averageTransactionValue: 0
        }
      };
    }
  }

  /**
   * Get enhanced token statistics with real trend data
   */
  static async getEnhancedTokenStats(): Promise<AdminTokenStats> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      // Fetch all required data including all users (Firebase Auth + Firestore)
      const [
        allUsersResult,
        balancesSnapshot,
        transactionsSnapshot,
        packagesSnapshot
      ] = await Promise.all([
        this.fetchAllUsers(),
        getDocs(collection(db, 'user_balances')),
        getDocs(query(
          collection(db, 'token_transactions'),
          orderBy('timestamp', 'desc'),
          limit(2000) // Get more for trend analysis
        )),
        getDocs(query(
          collection(db, 'token_packages'),
          where('isActive', '==', true)
        ))
      ]);

      // Process balances
      const balances = balancesSnapshot.docs.map(doc => doc.data());
      const totalTokens = balances.reduce((sum, balance) => 
        sum + (balance.availableTokens || 0) + (balance.committedTokens || 0), 0
      );
      const availableTokens = balances.reduce((sum, balance) => 
        sum + (balance.availableTokens || 0), 0
      );
      const committedTokens = balances.reduce((sum, balance) => 
        sum + (balance.committedTokens || 0), 0
      );

      // Process transactions
      const transactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const purchaseTransactions = transactions.filter(t => 
        t.type === 'purchase' && t.status === 'completed'
      );
      const payoutTransactions = transactions.filter(t => 
        t.type === 'win' && t.status === 'completed'
      );

      const totalPurchases = purchaseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalPayouts = payoutTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

      const dailyPurchases = purchaseTransactions
        .filter(t => {
          const timestamp = t.timestamp?.toDate?.() || new Date(t.timestamp);
          return timestamp >= yesterday;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const weeklyPurchases = purchaseTransactions
        .filter(t => {
          const timestamp = t.timestamp?.toDate?.() || new Date(t.timestamp);
          return timestamp >= lastWeek;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const dailyPayouts = payoutTransactions
        .filter(t => {
          const timestamp = t.timestamp?.toDate?.() || new Date(t.timestamp);
          return timestamp >= yesterday;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      // Calculate active users
      const activeUsers = new Set(
        transactions
          .filter(t => {
            const timestamp = t.timestamp?.toDate?.() || new Date(t.timestamp);
            return timestamp >= lastMonth;
          })
          .map(t => t.userId)
      ).size;

      // Generate weekly trend data
      const weeklyTrend = this.generateWeeklyTrend(transactions, lastWeek);

      // Count active packages
      const activePackages = packagesSnapshot.size;

      return {
        circulation: {
          totalTokens,
          availableTokens,
          committedTokens,
          totalUsers: allUsersResult.users.length, // Use total user count (Auth + Firestore)
          activeUsers
        },
        purchases: {
          totalPurchases,
          dailyPurchases,
          weeklyPurchases,
          totalTransactions: purchaseTransactions.length
        },
        payouts: {
          totalPayouts,
          dailyPayouts,
          totalPayoutTransactions: payoutTransactions.length
        },
        packages: {
          activePackages,
          totalRevenue: totalPurchases * 0.1 // Assuming $0.10 per token
        },
        trends: {
          dailyTransactionCount: transactions.filter(t => {
            const timestamp = t.timestamp?.toDate?.() || new Date(t.timestamp);
            return timestamp >= yesterday;
          }).length,
          weeklyTransactionCount: transactions.filter(t => {
            const timestamp = t.timestamp?.toDate?.() || new Date(t.timestamp);
            return timestamp >= lastWeek;
          }).length,
          weeklyTrend
        }
      };

    } catch (error) {
      console.error('Error fetching enhanced token stats:', error);
      throw new Error('Failed to fetch token statistics');
    }
  }

  /**
   * Generate weekly trend data from transactions
   */
  private static generateWeeklyTrend(transactions: any[], startDate: Date): Array<{
    name: string;
    purchases: number;
    payouts: number;
    date: string;
  }> {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trend = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayTransactions = transactions.filter(t => {
        const timestamp = t.timestamp?.toDate?.() || new Date(t.timestamp);
        return timestamp >= dayStart && timestamp < dayEnd;
      });

      const purchases = dayTransactions
        .filter(t => t.type === 'purchase' && t.status === 'completed')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const payouts = dayTransactions
        .filter(t => t.type === 'win' && t.status === 'completed')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      trend.push({
        name: days[date.getDay()],
        purchases,
        payouts,
        date: date.toISOString().split('T')[0]
      });
    }

    return trend;
  }

  /**
   * Get real-time market health metrics
   */
  static async getMarketHealthMetrics(): Promise<{
    totalMarkets: number;
    activeMarkets: number;
    averageParticipation: number;
    totalTokensStaked: number;
    healthScore: number;
  }> {
    try {
      const [marketsSnapshot, commitmentsSnapshot] = await Promise.all([
        getDocs(collection(db, 'markets')),
        getDocs(collection(db, 'prediction_commitments'))
      ]);

      const markets = marketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Market[];

      const commitments = commitmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PredictionCommitment[];

      const activeMarkets = markets.filter(m => 
        m.status === 'active' || m.status === 'open'
      ).length;

      const totalTokensStaked = commitments.reduce((sum, c) => 
        sum + (c.tokensCommitted || 0), 0
      );

      const averageParticipation = markets.length > 0 
        ? commitments.length / markets.length 
        : 0;

      // Calculate health score based on various factors
      const healthScore = Math.min(100, Math.max(0, 
        (activeMarkets / Math.max(markets.length, 1)) * 40 + // 40% for active markets ratio
        Math.min(averageParticipation / 10, 1) * 30 + // 30% for participation
        (totalTokensStaked > 0 ? 30 : 0) // 30% for having tokens staked
      ));

      return {
        totalMarkets: markets.length,
        activeMarkets,
        averageParticipation: Math.round(averageParticipation * 100) / 100,
        totalTokensStaked,
        healthScore: Math.round(healthScore)
      };

    } catch (error) {
      console.error('Error fetching market health metrics:', error);
      return {
        totalMarkets: 0,
        activeMarkets: 0,
        averageParticipation: 0,
        totalTokensStaked: 0,
        healthScore: 0
      };
    }
  }
}