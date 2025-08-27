import { UserBalance, TokenTransaction, TokenPackage, PredictionCommitment } from '../types/token';

/**
 * Token calculation utilities
 */
export class TokenCalculator {
  /**
   * Calculate total balance (available + committed)
   */
  static getTotalBalance(balance: UserBalance): number {
    return balance.availableTokens + balance.committedTokens;
  }

  /**
   * Calculate net profit/loss for a user
   */
  static getNetProfitLoss(balance: UserBalance): number {
    return balance.totalEarned - balance.totalSpent;
  }

  /**
   * Calculate potential winnings for a commitment
   */
  static calculatePotentialWinnings(tokensCommitted: number, odds: number): number {
    return Math.round(tokensCommitted * odds);
  }

  /**
   * Calculate odds based on total pool and position
   */
  static calculateOdds(totalYesTokens: number, totalNoTokens: number, position: 'yes' | 'no'): number {
    const totalPool = totalYesTokens + totalNoTokens;
    if (totalPool === 0) return 1.0;

    const opposingTokens = position === 'yes' ? totalNoTokens : totalYesTokens;
    const ownTokens = position === 'yes' ? totalYesTokens : totalNoTokens;

    // Avoid division by zero
    if (ownTokens === 0) return 1.0;

    // Calculate odds as (total pool / winning side tokens)
    return Math.max(1.0, totalPool / ownTokens);
  }

  /**
   * Calculate effective price per token for a package
   */
  static getEffectiveTokenPrice(tokenPackage: TokenPackage): number {
    const totalTokens = tokenPackage.tokens + tokenPackage.bonusTokens;
    return tokenPackage.priceUSD / totalTokens;
  }

  /**
   * Calculate bonus percentage for a package
   */
  static getBonusPercentage(tokenPackage: TokenPackage): number {
    if (tokenPackage.tokens === 0) return 0;
    return (tokenPackage.bonusTokens / tokenPackage.tokens) * 100;
  }
}

/**
 * Balance operation utilities
 */
export class BalanceOperations {
  /**
   * Check if user has sufficient available balance
   */
  static hasSufficientBalance(balance: UserBalance, requiredTokens: number): boolean {
    return balance.availableTokens >= requiredTokens;
  }

  /**
   * Calculate new balance after token commitment
   */
  static calculateBalanceAfterCommitment(
    currentBalance: UserBalance,
    tokensToCommit: number
  ): Partial<UserBalance> {
    if (!this.hasSufficientBalance(currentBalance, tokensToCommit)) {
      throw new Error('Insufficient balance for commitment');
    }

    return {
      availableTokens: currentBalance.availableTokens - tokensToCommit,
      committedTokens: currentBalance.committedTokens + tokensToCommit,
      version: currentBalance.version + 1,
    };
  }

  /**
   * Calculate new balance after token purchase
   */
  static calculateBalanceAfterPurchase(
    currentBalance: UserBalance,
    tokensPurchased: number,
    amountSpent: number
  ): Partial<UserBalance> {
    return {
      availableTokens: currentBalance.availableTokens + tokensPurchased,
      totalSpent: currentBalance.totalSpent + amountSpent,
      version: currentBalance.version + 1,
    };
  }

  /**
   * Calculate new balance after winning a prediction
   */
  static calculateBalanceAfterWin(
    currentBalance: UserBalance,
    tokensCommitted: number,
    tokensWon: number
  ): Partial<UserBalance> {
    const totalTokensReturned = tokensCommitted + tokensWon;
    
    return {
      availableTokens: currentBalance.availableTokens + totalTokensReturned,
      committedTokens: currentBalance.committedTokens - tokensCommitted,
      totalEarned: currentBalance.totalEarned + tokensWon,
      version: currentBalance.version + 1,
    };
  }

  /**
   * Calculate new balance after losing a prediction
   */
  static calculateBalanceAfterLoss(
    currentBalance: UserBalance,
    tokensCommitted: number
  ): Partial<UserBalance> {
    return {
      committedTokens: currentBalance.committedTokens - tokensCommitted,
      version: currentBalance.version + 1,
    };
  }

  /**
   * Calculate new balance after refund
   */
  static calculateBalanceAfterRefund(
    currentBalance: UserBalance,
    tokensToRefund: number
  ): Partial<UserBalance> {
    return {
      availableTokens: currentBalance.availableTokens + tokensToRefund,
      committedTokens: currentBalance.committedTokens - tokensToRefund,
      version: currentBalance.version + 1,
    };
  }

  /**
   * Validate balance consistency
   */
  static validateBalanceConsistency(balance: UserBalance): boolean {
    // Check for negative values
    if (balance.availableTokens < 0 || balance.committedTokens < 0) {
      return false;
    }

    // Check for reasonable totals
    if (balance.totalEarned < 0 || balance.totalSpent < 0) {
      return false;
    }

    return true;
  }
}

/**
 * Transaction utilities
 */
export class TransactionUtils {
  /**
   * Generate transaction ID
   */
  static generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create transaction record
   */
  static createTokenTransaction(
    userId: string,
    type: TokenTransaction['type'],
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    relatedId?: string,
    metadata?: TokenTransaction['metadata']
  ): Omit<TokenTransaction, 'id' | 'timestamp'> {
    return {
      userId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      relatedId,
      metadata: metadata || {},
      status: 'pending',
    };
  }

  /**
   * Calculate transaction summary for a period
   */
  static calculateTransactionSummary(transactions: TokenTransaction[]): {
    totalPurchases: number;
    totalCommitments: number;
    totalWinnings: number;
    totalLosses: number;
    totalRefunds: number;
    netChange: number;
  } {
    const summary = {
      totalPurchases: 0,
      totalCommitments: 0,
      totalWinnings: 0,
      totalLosses: 0,
      totalRefunds: 0,
      netChange: 0,
    };

    transactions.forEach((transaction) => {
      if (transaction.status !== 'completed') return;

      switch (transaction.type) {
        case 'purchase':
          summary.totalPurchases += transaction.amount;
          summary.netChange += transaction.amount;
          break;
        case 'commit':
          summary.totalCommitments += transaction.amount;
          break;
        case 'win':
          summary.totalWinnings += transaction.amount;
          summary.netChange += transaction.amount;
          break;
        case 'loss':
          summary.totalLosses += transaction.amount;
          summary.netChange -= transaction.amount;
          break;
        case 'refund':
          summary.totalRefunds += transaction.amount;
          summary.netChange += transaction.amount;
          break;
      }
    });

    return summary;
  }
}

/**
 * Formatting utilities
 */
export class TokenFormatter {
  /**
   * Format token amount for display
   */
  static formatTokens(amount: number): string {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M tokens`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K tokens`;
    }
    return `${amount.toLocaleString()} tokens`;
  }

  /**
   * Format USD amount for display
   */
  static formatUSD(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  /**
   * Format odds for display
   */
  static formatOdds(odds: number): string {
    return `${odds.toFixed(2)}x`;
  }

  /**
   * Format percentage for display
   */
  static formatPercentage(percentage: number): string {
    return `${percentage.toFixed(1)}%`;
  }
}

/**
 * Validation utilities
 */
export class TokenValidation {
  /**
   * Validate token amount is positive integer
   */
  static isValidTokenAmount(amount: number): boolean {
    return Number.isInteger(amount) && amount > 0;
  }

  /**
   * Validate USD amount is positive
   */
  static isValidUSDAmount(amount: number): boolean {
    return typeof amount === 'number' && amount > 0 && isFinite(amount);
  }

  /**
   * Validate user ID format
   */
  static isValidUserId(userId: string): boolean {
    return typeof userId === 'string' && userId.length > 0;
  }

  /**
   * Validate prediction position
   */
  static isValidPosition(position: string): position is 'yes' | 'no' {
    return position === 'yes' || position === 'no';
  }

  /**
   * Validate commitment amount against balance
   */
  static canCommitTokens(balance: UserBalance, tokensToCommit: number): {
    valid: boolean;
    reason?: string;
  } {
    if (!this.isValidTokenAmount(tokensToCommit)) {
      return { valid: false, reason: 'Invalid token amount' };
    }

    if (!BalanceOperations.hasSufficientBalance(balance, tokensToCommit)) {
      return { valid: false, reason: 'Insufficient balance' };
    }

    return { valid: true };
  }
}