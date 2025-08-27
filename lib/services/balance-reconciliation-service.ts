/**
 * Balance Reconciliation Service
 * Utilities to detect and fix balance inconsistencies
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/db/database'
import {
  UserBalance,
  TokenTransaction,
  PredictionCommitment
} from '@/lib/types/token'

export interface BalanceInconsistency {
  userId: string
  field: string
  storedValue: number
  calculatedValue: number
  difference: number
}

export interface ReconciliationReport {
  totalUsersChecked: number
  usersWithInconsistencies: number
  inconsistenciesFound: BalanceInconsistency[]
  usersFixed: number
  errors: string[]
  executionTime: number
}

export interface BalanceAuditResult {
  userId: string
  currentBalance: UserBalance | null
  calculatedBalance: {
    availableTokens: number
    committedTokens: number
    totalEarned: number
    totalSpent: number
  }
  inconsistencies: BalanceInconsistency[]
  transactionCount: number
  activeCommitmentCount: number
}

/**
 * Balance Reconciliation Service
 * Provides utilities to detect and fix balance inconsistencies
 */
export class BalanceReconciliationService {
  private static readonly COLLECTIONS = {
    userBalances: 'user_balances',
    tokenTransactions: 'token_transactions',
    predictionCommitments: 'prediction_commitments'
  } as const

  /**
   * Perform comprehensive balance audit for a user
   */
  static async auditUserBalance(userId: string): Promise<BalanceAuditResult> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    try {
      // Get current stored balance
      const balanceRef = doc(db, this.COLLECTIONS.userBalances, userId)
      const balanceSnap = await getDoc(balanceRef)
      const currentBalance = balanceSnap.exists() ? balanceSnap.data() as UserBalance : null

      // Get all completed transactions for the user
      const transactionsQuery = query(
        collection(db, this.COLLECTIONS.tokenTransactions),
        where('userId', '==', userId),
        where('status', '==', 'completed'),
        orderBy('timestamp', 'asc')
      )
      
      const transactionsSnap = await getDocs(transactionsQuery)
      const transactions = transactionsSnap.docs.map(doc => doc.data() as TokenTransaction)

      // Get active commitments
      const commitmentsQuery = query(
        collection(db, this.COLLECTIONS.predictionCommitments),
        where('userId', '==', userId),
        where('status', '==', 'active')
      )
      
      const commitmentsSnap = await getDocs(commitmentsQuery)
      const activeCommitments = commitmentsSnap.docs.map(doc => doc.data() as PredictionCommitment)

      // Calculate expected balance from transactions
      const calculatedBalance = this.calculateBalanceFromTransactions(transactions, activeCommitments)

      // Detect inconsistencies
      const inconsistencies = this.detectInconsistencies(currentBalance, calculatedBalance)

      return {
        userId,
        currentBalance,
        calculatedBalance,
        inconsistencies,
        transactionCount: transactions.length,
        activeCommitmentCount: activeCommitments.length
      }
    } catch (error) {
      console.error('Error auditing user balance:', error)
      throw new Error(`Failed to audit balance for user ${userId}: ${error.message}`)
    }
  }

  /**
   * Calculate balance from transaction history
   */
  private static calculateBalanceFromTransactions(
    transactions: TokenTransaction[],
    activeCommitments: PredictionCommitment[]
  ): {
    availableTokens: number
    committedTokens: number
    totalEarned: number
    totalSpent: number
  } {
    let totalEarned = 0
    let totalSpent = 0

    // Process transactions chronologically
    transactions.forEach(tx => {
      switch (tx.type) {
        case 'purchase':
        case 'win':
        case 'refund':
          totalEarned += Math.abs(tx.amount)
          break
        case 'loss':
          totalSpent += Math.abs(tx.amount)
          break
        case 'commit':
          // Commit transactions don't affect earned/spent directly
          // They move tokens from available to committed
          break
      }
    })

    // Calculate committed tokens from active commitments
    const committedTokens = activeCommitments.reduce((sum, commitment) => {
      return sum + commitment.tokensCommitted
    }, 0)

    // Available tokens = total earned - total spent - committed tokens
    const availableTokens = Math.max(0, totalEarned - totalSpent - committedTokens)

    return {
      availableTokens,
      committedTokens,
      totalEarned,
      totalSpent
    }
  }

  /**
   * Detect inconsistencies between stored and calculated balances
   */
  private static detectInconsistencies(
    storedBalance: UserBalance | null,
    calculatedBalance: {
      availableTokens: number
      committedTokens: number
      totalEarned: number
      totalSpent: number
    }
  ): BalanceInconsistency[] {
    const inconsistencies: BalanceInconsistency[] = []

    if (!storedBalance) {
      // If no stored balance exists, all calculated values are inconsistencies
      if (calculatedBalance.availableTokens > 0) {
        inconsistencies.push({
          userId: storedBalance?.userId || 'unknown',
          field: 'availableTokens',
          storedValue: 0,
          calculatedValue: calculatedBalance.availableTokens,
          difference: calculatedBalance.availableTokens
        })
      }
      return inconsistencies
    }

    const tolerance = 0.01 // Allow for small floating point differences

    // Check each field for inconsistencies
    const fields = [
      { name: 'availableTokens', stored: storedBalance.availableTokens, calculated: calculatedBalance.availableTokens },
      { name: 'committedTokens', stored: storedBalance.committedTokens, calculated: calculatedBalance.committedTokens },
      { name: 'totalEarned', stored: storedBalance.totalEarned, calculated: calculatedBalance.totalEarned },
      { name: 'totalSpent', stored: storedBalance.totalSpent, calculated: calculatedBalance.totalSpent }
    ]

    fields.forEach(field => {
      const difference = Math.abs(field.stored - field.calculated)
      if (difference > tolerance) {
        inconsistencies.push({
          userId: storedBalance.userId,
          field: field.name,
          storedValue: field.stored,
          calculatedValue: field.calculated,
          difference: field.calculated - field.stored
        })
      }
    })

    return inconsistencies
  }

  /**
   * Fix balance inconsistencies for a user
   */
  static async fixUserBalance(userId: string): Promise<UserBalance> {
    if (!userId?.trim()) {
      throw new Error('User ID is required')
    }

    try {
      const auditResult = await this.auditUserBalance(userId)

      if (auditResult.inconsistencies.length === 0) {
        if (auditResult.currentBalance) {
          return auditResult.currentBalance
        }
        throw new Error('No balance found and no inconsistencies to fix')
      }

      // Fix the balance using a transaction
      return await runTransaction(db, async (transaction) => {
        const balanceRef = doc(db, this.COLLECTIONS.userBalances, userId)

        const correctedBalance: UserBalance = {
          userId,
          availableTokens: auditResult.calculatedBalance.availableTokens,
          committedTokens: auditResult.calculatedBalance.committedTokens,
          totalEarned: auditResult.calculatedBalance.totalEarned,
          totalSpent: auditResult.calculatedBalance.totalSpent,
          lastUpdated: Timestamp.now(),
          version: (auditResult.currentBalance?.version || 0) + 1
        }

        transaction.set(balanceRef, correctedBalance)

        return correctedBalance
      })
    } catch (error) {
      console.error('Error fixing user balance:', error)
      throw new Error(`Failed to fix balance for user ${userId}: ${error.message}`)
    }
  }

  /**
   * Run balance reconciliation for multiple users
   */
  static async reconcileMultipleUsers(userIds: string[]): Promise<ReconciliationReport> {
    const startTime = Date.now()
    const report: ReconciliationReport = {
      totalUsersChecked: 0,
      usersWithInconsistencies: 0,
      inconsistenciesFound: [],
      usersFixed: 0,
      errors: [],
      executionTime: 0
    }

    if (!userIds.length) {
      report.executionTime = Date.now() - startTime
      return report
    }

    for (const userId of userIds) {
      try {
        report.totalUsersChecked++

        const auditResult = await this.auditUserBalance(userId)

        if (auditResult.inconsistencies.length > 0) {
          report.usersWithInconsistencies++
          report.inconsistenciesFound.push(...auditResult.inconsistencies)

          try {
            await this.fixUserBalance(userId)
            report.usersFixed++
          } catch (fixError) {
            const errorMessage = fixError instanceof Error ? fixError.message : 'Unknown error'
            report.errors.push(`Failed to fix balance for user ${userId}: ${errorMessage}`)
          }
        }
      } catch (auditError) {
        const errorMessage = auditError instanceof Error ? auditError.message : 'Unknown error'
        report.errors.push(`Failed to audit balance for user ${userId}: ${errorMessage}`)
      }
    }

    report.executionTime = Date.now() - startTime
    return report
  }

  /**
   * Run system-wide balance reconciliation
   */
  static async reconcileAllUsers(): Promise<ReconciliationReport> {
    const startTime = Date.now()

    try {
      // Get all users with balances
      const balancesQuery = query(collection(db, this.COLLECTIONS.userBalances))
      const balancesSnap = await getDocs(balancesQuery)
      
      const userIds = balancesSnap.docs.map(doc => doc.id)

      return await this.reconcileMultipleUsers(userIds)
    } catch (error) {
      console.error('Error during system-wide reconciliation:', error)
      return {
        totalUsersChecked: 0,
        usersWithInconsistencies: 0,
        inconsistenciesFound: [],
        usersFixed: 0,
        errors: [`System-wide reconciliation failed: ${error.message}`],
        executionTime: Date.now() - startTime
      }
    }
  }

  /**
   * Generate balance health report
   */
  static async generateHealthReport(): Promise<{
    totalUsers: number
    usersWithBalances: number
    totalTokensInCirculation: number
    totalTokensCommitted: number
    averageBalancePerUser: number
    inconsistencyRate: number
    lastReconciliation?: Date
  }> {
    try {
      // Get all user balances
      const balancesQuery = query(collection(db, this.COLLECTIONS.userBalances))
      const balancesSnap = await getDocs(balancesQuery)
      const balances = balancesSnap.docs.map(doc => doc.data() as UserBalance)

      const totalUsers = balances.length
      const usersWithBalances = balances.filter(b => b.availableTokens > 0 || b.committedTokens > 0).length
      
      const totalTokensInCirculation = balances.reduce((sum, b) => sum + b.availableTokens + b.committedTokens, 0)
      const totalTokensCommitted = balances.reduce((sum, b) => sum + b.committedTokens, 0)
      const averageBalancePerUser = totalUsers > 0 ? totalTokensInCirculation / totalUsers : 0

      // Sample check for inconsistencies (check first 50 users)
      const sampleUsers = balances.slice(0, 50).map(b => b.userId)
      const reconciliationReport = await this.reconcileMultipleUsers(sampleUsers)
      const inconsistencyRate = sampleUsers.length > 0 ? reconciliationReport.usersWithInconsistencies / sampleUsers.length : 0

      return {
        totalUsers,
        usersWithBalances,
        totalTokensInCirculation,
        totalTokensCommitted,
        averageBalancePerUser,
        inconsistencyRate,
        lastReconciliation: new Date()
      }
    } catch (error) {
      console.error('Error generating health report:', error)
      throw new Error(`Failed to generate health report: ${error.message}`)
    }
  }

  /**
   * Validate balance integrity rules
   */
  static validateBalanceIntegrity(balance: UserBalance): {
    isValid: boolean
    violations: string[]
  } {
    const violations: string[] = []

    // Basic non-negative constraints
    if (balance.availableTokens < 0) {
      violations.push('Available tokens cannot be negative')
    }

    if (balance.committedTokens < 0) {
      violations.push('Committed tokens cannot be negative')
    }

    if (balance.totalEarned < 0) {
      violations.push('Total earned cannot be negative')
    }

    if (balance.totalSpent < 0) {
      violations.push('Total spent cannot be negative')
    }

    // Logical consistency checks
    const totalTokens = balance.availableTokens + balance.committedTokens
    const netTokens = balance.totalEarned - balance.totalSpent

    if (totalTokens > netTokens + 0.01) { // Allow small tolerance for floating point
      violations.push(`Total tokens (${totalTokens}) exceed net earned tokens (${netTokens})`)
    }

    // Version should be positive
    if (balance.version <= 0) {
      violations.push('Version must be positive')
    }

    return {
      isValid: violations.length === 0,
      violations
    }
  }

  /**
   * Create balance snapshot for audit purposes
   */
  static async createBalanceSnapshot(userId: string): Promise<{
    timestamp: Date
    balance: UserBalance | null
    transactionCount: number
    commitmentCount: number
    calculatedBalance: {
      availableTokens: number
      committedTokens: number
      totalEarned: number
      totalSpent: number
    }
    isConsistent: boolean
  }> {
    const auditResult = await this.auditUserBalance(userId)

    return {
      timestamp: new Date(),
      balance: auditResult.currentBalance,
      transactionCount: auditResult.transactionCount,
      commitmentCount: auditResult.activeCommitmentCount,
      calculatedBalance: auditResult.calculatedBalance,
      isConsistent: auditResult.inconsistencies.length === 0
    }
  }
}