import type { Wallet } from '../wallets/types';
import type { Category } from '../categories/types';

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  wallet?: Wallet;
  categoryId: string;
  category?: Category;
  amount: number;
  type: 'income' | 'expense';
  description: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionDto {
  walletId: string;
  categoryId: string;
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  transactionDate: string; // YYYY-MM-DD
}

export interface UpdateTransactionDto {
  walletId?: string;
  categoryId?: string;
  amount?: number;
  type?: 'income' | 'expense';
  description?: string;
  transactionDate?: string;
}

export interface FilterTransactionDto {
  page?: number;
  limit?: number;
  walletId?: string;
  type?: 'income' | 'expense';
  categoryId?: string;
  keyword?: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedTransactions {
  data: Transaction[];
  meta: PaginatedMeta;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  type: 'income' | 'expense';
  total: string;
}

export interface SummaryFilterDto {
  month?: number;
  year?: number;
  period?: 'week' | 'month' | 'year';
  walletId?: string;
  from?: string;
  to?: string;
}

export interface AnomalyCheckResult {
  is_anomaly: boolean;
  risk_score: number;
  risk_level: 'NORMAL' | 'MEDIUM' | 'HIGH';
  anomaly_type: string;
  reason: string;
  suggestion: string;
}

export interface CheckAnomalyDto {
  amount: number;
  categoryId?: string;
  transactionDate?: string;
}
