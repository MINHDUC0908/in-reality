import { apiClient, extractData } from '@/lib/api';
import type {
  Budget,
  BudgetStatus,
  CreateBudgetDto,
  UpdateBudgetDto,
} from './types';

export const budgetApi = {
  async getBudgets(month?: number, year?: number): Promise<Budget[]> {
    const response = await apiClient.get('/budgets', {
      params: { month, year },
    });
    return extractData<Budget[]>(response);
  },

  async getBudgetStatus(month: number, year: number): Promise<BudgetStatus[]> {
    const response = await apiClient.get('/budgets/status', {
      params: { month, year },
    });
    return extractData<BudgetStatus[]>(response);
  },

  async createBudget(dto: CreateBudgetDto): Promise<Budget> {
    const response = await apiClient.post('/budgets', dto);
    return extractData<Budget>(response);
  },

  async updateBudget(id: string, dto: UpdateBudgetDto): Promise<Budget> {
    const response = await apiClient.patch(`/budgets/${id}`, dto);
    return extractData<Budget>(response);
  },

  async deleteBudget(id: string): Promise<void> {
    await apiClient.delete(`/budgets/${id}`);
  },
};
