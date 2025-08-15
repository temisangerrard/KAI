/**
 * Transaction types for the KAI platform
 */

export type TransactionType = 'purchase' | 'backed' | 'won' | 'created' | 'reward';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'active';

export interface Transaction {
  id: string | number;
  type: TransactionType;
  amount: number;
  description: string;
  date: string | Date;
  status: TransactionStatus;
  marketId?: string;
  optionId?: string;
}

export interface TokenBalance {
  available: number;
  pending: number;
  total: number;
}