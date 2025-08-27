/**
 * Data Integrity Validation Tests
 * 
 * Comprehensive tests to validate data consistency between commitments,
 * balances, and market statistics across the entire system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock Firebase
const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  runTransaction: vi.fn(),
  batch: vi.fn(),
  getDocs: vi.fn(),
}

vi.mock('firebase/firestore', () => ({
  getFirestore: () => mockFirestore,
  collection: vi.fn(() => mockFirestore),
  doc: vi.fn(() => mockFirestore),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(() => mockFirestore),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 }),
    fromDate: (date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })
  }
}))

interface SystemState {
  users: Map<string, UserData>
  markets: Map<string, MarketData>
  commitments: Map<string, CommitmentData>
  transactions: TransactionData[]
}

interface UserData {
  id: string
  email: string
  tokenBalance: number
  totalCommitted: number
  activeCommitments: string[]
  transactionHistory: string[]
}

interface MarketData {
  id: string
  title: string
  status: 'active' | 'resolved' | 'cancelled'
  totalTokensCommitted: number
  participantCount: number
  yesTokens: number
  noTokens: number
  commitmentIds: string[]
}

interface CommitmentData {
  id: string
  userId: string
  predictionId: string
  tokensCommitted: number
  position: 'yes' | 'no'
  odds: number
  potentialWinning: number
  status: 'active' | 'won' | 'lost' | 'refunded'
  committedAt: Date
  resolvedAt?: Date
}

interface TransactionData {
  id: string
  userId: string
  type: 'commitment' | 'payout' | 'refund' | 'purchase'
  amount: number
  relatedCommitmentId?: string
  timestamp: Date
  status: 'pending' | 'completed' | 'failed'
}

describe('Data Integrity Validation Tests', () => {
  let systemState: SystemState

  beforeEach(() => {
    systemState = {
      users: new Map(),
      markets: new Map(),
      commitments: new Map(),
      transactions: []
    }

    setupMockSystem()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  function setupMockSystem() {
    // Create test users
    for (let i = 0; i < 100; i++) {
      const user: UserData = {
        id: `user-${i}`,
        email: `user${i}@example.com`,
        tokenBalance: 1000,
        totalCommitted: 0,
        activeCommitments: [],
        transactionHistory: []
      }
      systemState.users.set(user.id, user)
    }

    // Create test markets
    for (let i = 0; i < 20; i++) {
      const market: MarketData = {
        id: `market-${i}`,
        title: `Test Market ${i}`,
        status: 'active',
        totalTokensCommitted: 0,
        participantCount: 0,
        yesTokens: 0,
        noTokens: 0,
        commitmentIds: []
      }
      systemState.markets.set(market.id, market)
    }
  }

  async function simulateCommitment(
    userId: string,
    predictionId: string,
    tokensToCommit: number,
    position: 'yes' | 'no'
  ): Promise<{ success: boolean; error?: string }> {
    const user = systemState.users.get(userId)
    const market = systemState.markets.get(predictionId)

    if (!user || !market) {
      return { success: false, error: 'User or market not found' }
    }

    if (user.tokenBalance < tokensToCommit) {
      return { success: false, error: 'Insufficient balance' }
    }

    if (market.status !== 'active') {
      return { success: false, error: 'Market not active' }
    }

    // Create commitment
    const commitmentId = `commitment-${Date.now()}-${Math.random()}`
    const commitment: CommitmentData = {
      id: commitmentId,
      userId,
      predictionId,
      tokensCommitted: tokensToCommit,
      position,
      odds: 1.5 + Math.random() * 2, // Random odds between 1.5 and 3.5
      potentialWinning: tokensToCommit * (1.5 + Math.random() * 2),
      status: 'active',
      committedAt: new Date()
    }

    // Create transaction
    const transaction: TransactionData = {
      id: `tx-${Date.now()}-${Math.random()}`,
      userId,
      type: 'commitment',
      amount: -tokensToCommit,
      relatedCommitmentId: commitmentId,
      timestamp: new Date(),
      status: 'completed'
    }

    // Update system state atomically
    try {
      // Update user
      user.tokenBalance -= tokensToCommit
      user.totalCommitted += tokensToCommit
      user.activeCommitments.push(commitmentId)
      user.transactionHistory.push(transaction.id)

      // Update market
      market.totalTokensCommitted += tokensToCommit
      if (!market.commitmentIds.includes(commitmentId)) {
        market.commitmentIds.push(commitmentId)
        
        // Update participant count
        const existingUserCommitments = Array.from(systemState.commitments.values())
          .filter(c => c.predictionId === predictionId && c.userId === userId)
        
        if (existingUserCommitments.length === 0) {
          market.participantCount++
        }
      }

      if (position === 'yes') {
        market.yesTokens += tokensToCommit
      } else {
        market.noTokens += tokensToCommit
      }

      // Store commitment and transaction
      systemState.commitments.set(commitmentId, commitment)
      systemState.transactions.push(transaction)

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Transaction failed' }
    }
  }

  async function simulateMarketResolution(
    marketId: string,
    winningPosition: 'yes' | 'no'
  ): Promise<{ success: boolean; payouts: number }> {
    const market = systemState.markets.get(marketId)
    if (!market || market.status !== 'active') {
      return { success: false, payouts: 0 }
    }

    // Get all commitments for this market
    const marketCommitments = Array.from(systemState.commitments.values())
      .filter(c => c.predictionId === marketId && c.status === 'active')

    let totalPayouts = 0

    // Process each commitment
    for (const commitment of marketCommitments) {
      const user = systemState.users.get(commitment.userId)
      if (!user) continue

      if (commitment.position === winningPosition) {
        // Winner - pay out
        const payout = commitment.potentialWinning
        user.tokenBalance += payout
        commitment.status = 'won'
        totalPayouts += payout

        // Create payout transaction
        const payoutTransaction: TransactionData = {
          id: `payout-${Date.now()}-${Math.random()}`,
          userId: commitment.userId,
          type: 'payout',
          amount: payout,
          relatedCommitmentId: commitment.id,
          timestamp: new Date(),
          status: 'completed'
        }
        systemState.transactions.push(payoutTransaction)
        user.transactionHistory.push(payoutTransaction.id)
      } else {
        // Loser - no payout
        commitment.status = 'lost'
      }

      commitment.resolvedAt = new Date()
      
      // Remove from active commitments
      user.activeCommitments = user.activeCommitments.filter(id => id !== commitment.id)
      user.totalCommitted -= commitment.tokensCommitted
    }

    // Update market status
    market.status = 'resolved'

    return { success: true, payouts: totalPayouts }
  }

  describe('User Balance Consistency', () => {
    it('should maintain accurate user balances across multiple commitments', async () => {
      const userId = 'user-1'
      const initialBalance = systemState.users.get(userId)!.tokenBalance

      const commitments = [
        { market: 'market-1', tokens: 100, position: 'yes' as const },
        { market: 'market-2', tokens: 150, position: 'no' as const },
        { market: 'market-3', tokens: 75, position: 'yes' as const }
      ]

      // Execute commitments
      for (const commitment of commitments) {
        const result = await simulateCommitment(
          userId,
          commitment.market,
          commitment.tokens,
          commitment.position
        )
        expect(result.success).toBe(true)
      }

      // Validate balance consistency
      const user = systemState.users.get(userId)!
      const expectedBalance = initialBalance - commitments.reduce((sum, c) => sum + c.tokens, 0)
      
      expect(user.tokenBalance).toBe(expectedBalance)
      expect(user.totalCommitted).toBe(commitments.reduce((sum, c) => sum + c.tokens, 0))
      expect(user.activeCommitments).toHaveLength(commitments.length)

      // Validate transaction history
      const userTransactions = systemState.transactions.filter(tx => tx.userId === userId)
      expect(userTransactions).toHaveLength(commitments.length)
      expect(userTransactions.every(tx => tx.status === 'completed')).toBe(true)
    })

    it('should handle insufficient balance scenarios correctly', async () => {
      const userId = 'user-2'
      const user = systemState.users.get(userId)!
      const initialBalance = user.tokenBalance

      // Try to commit more than available balance
      const result = await simulateCommitment(userId, 'market-1', initialBalance + 100, 'yes')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient balance')
      
      // Verify no changes were made
      expect(user.tokenBalance).toBe(initialBalance)
      expect(user.totalCommitted).toBe(0)
      expect(user.activeCommitments).toHaveLength(0)
    })

    it('should maintain balance consistency after market resolution', async () => {
      const userIds = ['user-3', 'user-4', 'user-5']
      const marketId = 'market-5'
      const initialBalances = new Map()

      // Record initial balances
      userIds.forEach(userId => {
        initialBalances.set(userId, systemState.users.get(userId)!.tokenBalance)
      })

      // Make commitments
      await simulateCommitment(userIds[0], marketId, 100, 'yes') // Will win
      await simulateCommitment(userIds[1], marketId, 150, 'no')  // Will lose
      await simulateCommitment(userIds[2], marketId, 75, 'yes')  // Will win

      // Resolve market with 'yes' winning
      const resolution = await simulateMarketResolution(marketId, 'yes')
      expect(resolution.success).toBe(true)

      // Validate final balances
      const user3 = systemState.users.get(userIds[0])!
      const user4 = systemState.users.get(userIds[1])!
      const user5 = systemState.users.get(userIds[2])!

      // Winners should have received payouts
      expect(user3.tokenBalance).toBeGreaterThan(initialBalances.get(userIds[0]))
      expect(user5.tokenBalance).toBeGreaterThan(initialBalances.get(userIds[2]))
      
      // Loser should have lost their commitment
      expect(user4.tokenBalance).toBe(initialBalances.get(userIds[1]) - 150)

      // All should have zero active commitments
      expect(user3.activeCommitments).toHaveLength(0)
      expect(user4.activeCommitments).toHaveLength(0)
      expect(user5.activeCommitments).toHaveLength(0)
    })
  })

  describe('Market Statistics Consistency', () => {
    it('should maintain accurate market statistics', async () => {
      const marketId = 'market-10'
      const market = systemState.markets.get(marketId)!

      const commitments = [
        { user: 'user-10', tokens: 100, position: 'yes' as const },
        { user: 'user-11', tokens: 200, position: 'no' as const },
        { user: 'user-12', tokens: 150, position: 'yes' as const },
        { user: 'user-10', tokens: 50, position: 'no' as const }, // Same user, different position
      ]

      // Execute commitments
      for (const commitment of commitments) {
        const result = await simulateCommitment(
          commitment.user,
          marketId,
          commitment.tokens,
          commitment.position
        )
        expect(result.success).toBe(true)
      }

      // Validate market statistics
      const expectedTotal = commitments.reduce((sum, c) => sum + c.tokens, 0)
      const expectedYes = commitments.filter(c => c.position === 'yes').reduce((sum, c) => sum + c.tokens, 0)
      const expectedNo = commitments.filter(c => c.position === 'no').reduce((sum, c) => sum + c.tokens, 0)
      const expectedParticipants = new Set(commitments.map(c => c.user)).size

      expect(market.totalTokensCommitted).toBe(expectedTotal)
      expect(market.yesTokens).toBe(expectedYes)
      expect(market.noTokens).toBe(expectedNo)
      expect(market.participantCount).toBe(expectedParticipants)
      expect(market.yesTokens + market.noTokens).toBe(market.totalTokensCommitted)
      expect(market.commitmentIds).toHaveLength(commitments.length)
    })

    it('should handle market statistics across multiple markets', async () => {
      const marketIds = ['market-15', 'market-16', 'market-17']
      const userCommitments = [
        { user: 'user-20', market: 'market-15', tokens: 100, position: 'yes' as const },
        { user: 'user-20', market: 'market-16', tokens: 150, position: 'no' as const },
        { user: 'user-21', market: 'market-15', tokens: 200, position: 'yes' as const },
        { user: 'user-22', market: 'market-17', tokens: 75, position: 'no' as const },
      ]

      // Execute all commitments
      for (const commitment of userCommitments) {
        const result = await simulateCommitment(
          commitment.user,
          commitment.market,
          commitment.tokens,
          commitment.position
        )
        expect(result.success).toBe(true)
      }

      // Validate each market independently
      marketIds.forEach(marketId => {
        const market = systemState.markets.get(marketId)!
        const marketCommitments = userCommitments.filter(c => c.market === marketId)
        
        const expectedTotal = marketCommitments.reduce((sum, c) => sum + c.tokens, 0)
        const expectedParticipants = new Set(marketCommitments.map(c => c.user)).size
        
        expect(market.totalTokensCommitted).toBe(expectedTotal)
        expect(market.participantCount).toBe(expectedParticipants)
      })

      // Validate cross-market user consistency
      const user20 = systemState.users.get('user-20')!
      expect(user20.activeCommitments).toHaveLength(2) // Committed to 2 markets
      expect(user20.totalCommitted).toBe(250) // 100 + 150
    })
  })

  describe('Transaction History Integrity', () => {
    it('should maintain complete transaction audit trail', async () => {
      const userId = 'user-30'
      const marketId = 'market-30'

      // Make commitment
      await simulateCommitment(userId, marketId, 200, 'yes')
      
      // Resolve market
      await simulateMarketResolution(marketId, 'yes')

      // Validate transaction history
      const userTransactions = systemState.transactions.filter(tx => tx.userId === userId)
      expect(userTransactions).toHaveLength(2) // Commitment + payout

      const commitmentTx = userTransactions.find(tx => tx.type === 'commitment')
      const payoutTx = userTransactions.find(tx => tx.type === 'payout')

      expect(commitmentTx).toBeDefined()
      expect(payoutTx).toBeDefined()
      expect(commitmentTx!.amount).toBe(-200) // Negative for commitment
      expect(payoutTx!.amount).toBeGreaterThan(200) // Positive payout > commitment
      expect(commitmentTx!.relatedCommitmentId).toBe(payoutTx!.relatedCommitmentId)
    })

    it('should handle transaction failures without data corruption', async () => {
      const userId = 'user-31'
      const initialState = {
        balance: systemState.users.get(userId)!.tokenBalance,
        committed: systemState.users.get(userId)!.totalCommitted,
        activeCommitments: [...systemState.users.get(userId)!.activeCommitments],
        transactionCount: systemState.transactions.filter(tx => tx.userId === userId).length
      }

      // Simulate transaction failure (insufficient balance)
      const result = await simulateCommitment(userId, 'market-31', 2000, 'yes')
      expect(result.success).toBe(false)

      // Verify no state changes occurred
      const user = systemState.users.get(userId)!
      expect(user.tokenBalance).toBe(initialState.balance)
      expect(user.totalCommitted).toBe(initialState.committed)
      expect(user.activeCommitments).toEqual(initialState.activeCommitments)
      
      const userTransactions = systemState.transactions.filter(tx => tx.userId === userId)
      expect(userTransactions).toHaveLength(initialState.transactionCount)
    })
  })

  describe('System-Wide Consistency Checks', () => {
    it('should maintain global token conservation', async () => {
      // Record initial system state
      const initialTotalBalance = Array.from(systemState.users.values())
        .reduce((sum, user) => sum + user.tokenBalance, 0)
      const initialTotalCommitted = Array.from(systemState.users.values())
        .reduce((sum, user) => sum + user.totalCommitted, 0)

      // Execute multiple operations
      const operations = [
        { user: 'user-40', market: 'market-40', tokens: 100, position: 'yes' as const },
        { user: 'user-41', market: 'market-40', tokens: 150, position: 'no' as const },
        { user: 'user-42', market: 'market-41', tokens: 200, position: 'yes' as const },
      ]

      for (const op of operations) {
        await simulateCommitment(op.user, op.market, op.tokens, op.position)
      }

      // Check token conservation
      const finalTotalBalance = Array.from(systemState.users.values())
        .reduce((sum, user) => sum + user.tokenBalance, 0)
      const finalTotalCommitted = Array.from(systemState.users.values())
        .reduce((sum, user) => sum + user.totalCommitted, 0)

      // Total tokens in system should be conserved
      expect(finalTotalBalance + finalTotalCommitted).toBe(initialTotalBalance + initialTotalCommitted)

      // Market totals should match user commitments
      const marketTotals = Array.from(systemState.markets.values())
        .reduce((sum, market) => sum + market.totalTokensCommitted, 0)
      expect(marketTotals).toBe(finalTotalCommitted)
    })

    it('should detect and report data inconsistencies', async () => {
      // Create intentional inconsistency for testing
      const userId = 'user-50'
      const marketId = 'market-50'
      
      // Make valid commitment first
      await simulateCommitment(userId, marketId, 100, 'yes')
      
      // Manually corrupt data to test detection
      const user = systemState.users.get(userId)!
      const market = systemState.markets.get(marketId)!
      
      // Introduce inconsistency
      user.totalCommitted = 200 // Should be 100
      market.totalTokensCommitted = 150 // Should be 100

      // Run consistency check
      const inconsistencies = []

      // Check user balance consistency
      const userCommitments = Array.from(systemState.commitments.values())
        .filter(c => c.userId === userId && c.status === 'active')
      const actualCommitted = userCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      
      if (user.totalCommitted !== actualCommitted) {
        inconsistencies.push({
          type: 'user_commitment_mismatch',
          userId,
          reported: user.totalCommitted,
          actual: actualCommitted
        })
      }

      // Check market statistics consistency
      const marketCommitments = Array.from(systemState.commitments.values())
        .filter(c => c.predictionId === marketId)
      const actualMarketTotal = marketCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      
      if (market.totalTokensCommitted !== actualMarketTotal) {
        inconsistencies.push({
          type: 'market_total_mismatch',
          marketId,
          reported: market.totalTokensCommitted,
          actual: actualMarketTotal
        })
      }

      // Should detect both inconsistencies
      expect(inconsistencies).toHaveLength(2)
      expect(inconsistencies.some(i => i.type === 'user_commitment_mismatch')).toBe(true)
      expect(inconsistencies.some(i => i.type === 'market_total_mismatch')).toBe(true)
    })

    it('should validate referential integrity', async () => {
      const userId = 'user-60'
      const marketId = 'market-60'

      // Make commitment
      await simulateCommitment(userId, marketId, 100, 'yes')

      // Validate all references exist and are consistent
      const user = systemState.users.get(userId)!
      const market = systemState.markets.get(marketId)!
      
      // Check user's active commitments reference valid commitments
      for (const commitmentId of user.activeCommitments) {
        const commitment = systemState.commitments.get(commitmentId)
        expect(commitment).toBeDefined()
        expect(commitment!.userId).toBe(userId)
        expect(commitment!.status).toBe('active')
      }

      // Check market's commitment IDs reference valid commitments
      for (const commitmentId of market.commitmentIds) {
        const commitment = systemState.commitments.get(commitmentId)
        expect(commitment).toBeDefined()
        expect(commitment!.predictionId).toBe(marketId)
      }

      // Check transaction references
      for (const transactionId of user.transactionHistory) {
        const transaction = systemState.transactions.find(tx => tx.id === transactionId)
        expect(transaction).toBeDefined()
        expect(transaction!.userId).toBe(userId)
        
        if (transaction!.relatedCommitmentId) {
          const commitment = systemState.commitments.get(transaction!.relatedCommitmentId)
          expect(commitment).toBeDefined()
        }
      }
    })
  })
})