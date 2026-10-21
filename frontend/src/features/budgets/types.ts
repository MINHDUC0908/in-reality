import type { Category } from '../categories/types';

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  category?: Category;
  amountLimit: number;
  month: number;
  year: number;
  createdAt: string;
}

export interface BudgetStatus {
  categoryId: string;
  categoryName?: string;
  amountLimit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
}

export interface CreateBudgetDto {
  categoryId: string;
  amountLimit: number;
  month: number;
  year: number;
}

export interface UpdateBudgetDto {
  amountLimit: number;
}
