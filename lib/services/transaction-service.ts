/**
 * Transaction Service for KAI platform
 * Handles token minting, transactions, and history
 */

import { Transaction, TransactionType, TransactionStatus, TokenBalance } from "@/lib/types/transaction";

// In-memory storage for transactions (would be replaced with API calls in production)
let transactions: Transaction[] = [];

/**
 * Generate a unique transaction ID
 */
const generateTransactionId = (): string => {
  return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Format date for display in transaction history
 */
const formatTransactionDate = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Transaction Service
 */
export const TransactionService = {
  /**
   * Mint new tokens for a user
   * @param userId User ID
   * @param amount Amount of tokens to mint
   * @param paymentMethod Payment method used
   * @returns Transaction object
   */
  mintTokens: async (userId: string, amount: number, paymentMethod: string): Promise<Transaction> => {
    // In a real implementation, this would call an API to process payment and mint tokens
    
    // Create transaction record
    const transaction: Transaction = {
      id: generateTransactionId(),
      type: 'purchase',
      amount,
      description: `Token purchase via ${paymentMethod}`,
      date: new Date(),
      status: 'completed',
    };
    
    // Store transaction
    transactions.push(transaction);
    
    // Update local storage (in a real app, this would be handled by the backend)
    TransactionService.saveTransactionsToStorage(userId, transactions);
    
    return transaction;
  },
  
  /**
   * Record a transaction for backing an opinion (prediction)
   * @param userId User ID
   * @param amount Amount of tokens used
   * @param marketId Market ID
   * @param optionId Option ID
   * @param marketTitle Market title
   * @returns Transaction object
   */
  backOpinion: async (
    userId: string, 
    amount: number, 
    marketId: string, 
    optionId: string, 
    marketTitle: string
  ): Promise<Transaction> => {
    // Create transaction record
    const transaction: Transaction = {
      id: generateTransactionId(),
      type: 'backed',
      amount: -amount, // Negative amount as tokens are being spent
      description: `Backed opinion: ${marketTitle}`,
      date: new Date(),
      status: 'active',
      marketId,
      optionId,
    };
    
    // Store transaction
    transactions.push(transaction);
    
    // Update local storage
    TransactionService.saveTransactionsToStorage(userId, transactions);
    
    return transaction;
  },
  
  /**
   * Record a transaction for winning a prediction
   * @param userId User ID
   * @param amount Amount of tokens won
   * @param marketId Market ID
   * @param marketTitle Market title
   * @returns Transaction object
   */
  recordWin: async (
    userId: string, 
    amount: number, 
    marketId: string, 
    marketTitle: string
  ): Promise<Transaction> => {
    // Create transaction record
    const transaction: Transaction = {
      id: generateTransactionId(),
      type: 'won',
      amount, // Positive amount as tokens are being received
      description: `Won: ${marketTitle}`,
      date: new Date(),
      status: 'completed',
      marketId,
    };
    
    // Store transaction
    transactions.push(transaction);
    
    // Update local storage
    TransactionService.saveTransactionsToStorage(userId, transactions);
    
    return transaction;
  },
  
  /**
   * Record a transaction for creating a market
   * @param userId User ID
   * @param amount Amount of tokens earned for creating
   * @param marketId Market ID
   * @param marketTitle Market title
   * @returns Transaction object
   */
  recordMarketCreation: async (
    userId: string, 
    amount: number, 
    marketId: string, 
    marketTitle: string
  ): Promise<Transaction> => {
    // Create transaction record
    const transaction: Transaction = {
      id: generateTransactionId(),
      type: 'created',
      amount, // Positive amount as tokens are being received
      description: `Created market: ${marketTitle}`,
      date: new Date(),
      status: 'completed',
      marketId,
    };
    
    // Store transaction
    transactions.push(transaction);
    
    // Update local storage
    TransactionService.saveTransactionsToStorage(userId, transactions);
    
    return transaction;
  },
  
  /**
   * Record a reward transaction
   * @param userId User ID
   * @param amount Amount of tokens rewarded
   * @param description Description of the reward
   * @returns Transaction object
   */
  recordReward: async (
    userId: string, 
    amount: number, 
    description: string
  ): Promise<Transaction> => {
    // Create transaction record
    const transaction: Transaction = {
      id: generateTransactionId(),
      type: 'reward',
      amount, // Positive amount as tokens are being received
      description,
      date: new Date(),
      status: 'completed',
    };
    
    // Store transaction
    transactions.push(transaction);
    
    // Update local storage
    TransactionService.saveTransactionsToStorage(userId, transactions);
    
    return transaction;
  },
  
  /**
   * Get all transactions for a user
   * @param userId User ID
   * @returns Array of transactions
   */
  getTransactions: async (userId: string): Promise<Transaction[]> => {
    // In a real implementation, this would call an API to get transactions
    
    // Load from local storage
    const storedTransactions = TransactionService.loadTransactionsFromStorage(userId);
    if (storedTransactions && storedTransactions.length > 0) {
      transactions = storedTransactions;
    }
    
    // Format dates for display
    return transactions.map(transaction => ({
      ...transaction,
      date: formatTransactionDate(new Date(transaction.date))
    }));
  },
  
  /**
   * Get filtered transactions for a user
   * @param userId User ID
   * @param filter Filter type ('all', 'earned', 'spent')
   * @returns Filtered array of transactions
   */
  getFilteredTransactions: async (
    userId: string, 
    filter: 'all' | 'earned' | 'spent'
  ): Promise<Transaction[]> => {
    const allTransactions = await TransactionService.getTransactions(userId);
    
    if (filter === 'all') {
      return allTransactions;
    } else if (filter === 'earned') {
      return allTransactions.filter(t => t.amount > 0);
    } else {
      return allTransactions.filter(t => t.amount < 0);
    }
  },
  
  /**
   * Calculate token balance for a user
   * @param userId User ID
   * @returns Token balance object
   */
  calculateBalance: async (userId: string): Promise<TokenBalance> => {
    const allTransactions = await TransactionService.getTransactions(userId);
    
    let available = 0;
    let pending = 0;
    
    allTransactions.forEach(transaction => {
      if (transaction.status === 'completed') {
        available += transaction.amount;
      } else if (transaction.status === 'active' || transaction.status === 'pending') {
        if (transaction.amount < 0) {
          // For negative amounts (spent tokens), add to pending
          pending += Math.abs(transaction.amount);
        } else {
          // For positive pending amounts, don't add to available yet
          // This is for pending rewards
        }
      }
    });
    
    // Ensure we don't have negative values
    available = Math.max(0, available);
    pending = Math.max(0, pending);
    
    return {
      available,
      pending,
      total: available + pending
    };
  },
  
  /**
   * Save transactions to local storage
   * @param userId User ID
   * @param transactions Transactions to save
   */
  saveTransactionsToStorage: (userId: string, transactions: Transaction[]): void => {
    try {
      localStorage.setItem(`kai_transactions_${userId}`, JSON.stringify(transactions));
    } catch (error) {
      console.error('Failed to save transactions to storage:', error);
    }
  },
  
  /**
   * Load transactions from local storage
   * @param userId User ID
   * @returns Array of transactions or empty array if none found
   */
  loadTransactionsFromStorage: (userId: string): Transaction[] => {
    try {
      const storedTransactions = localStorage.getItem(`kai_transactions_${userId}`);
      return storedTransactions ? JSON.parse(storedTransactions) : [];
    } catch (error) {
      console.error('Failed to load transactions from storage:', error);
      return [];
    }
  },
  
  /**
   * Clear all transactions (for testing/development)
   * @param userId User ID
   */
  clearTransactions: async (userId: string): Promise<void> => {
    transactions = [];
    localStorage.removeItem(`kai_transactions_${userId}`);
  }
};