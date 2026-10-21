import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '@/config/env';
import { storage } from '@/utils/storage';
import { apiClient, extractData, extractPaginatedData } from '@/lib/api';
import type {
  Transaction,
  CreateTransactionDto,
  UpdateTransactionDto,
  FilterTransactionDto,
  PaginatedTransactions,
  CategorySummary,
  SummaryFilterDto,
  AnomalyCheckResult,
  CheckAnomalyDto,
} from './types';

export const transactionApi = {
  async getTransactions(filter?: FilterTransactionDto): Promise<PaginatedTransactions> {
    const response = await apiClient.get('/transactions', {
      params: filter,
    });
    return extractPaginatedData<Transaction>(response);
  },

  async getTransaction(id: string): Promise<Transaction> {
    const response = await apiClient.get(`/transactions/${id}`);
    return extractData<Transaction>(response);
  },

  async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    const response = await apiClient.post('/transactions', dto);
    return extractData<Transaction>(response);
  },

  async updateTransaction(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const response = await apiClient.patch(`/transactions/${id}`, dto);
    return extractData<Transaction>(response);
  },

  async deleteTransaction(id: string): Promise<void> {
    await apiClient.delete(`/transactions/${id}`);
  },

  async getSummary(
    filterOrMonth?: SummaryFilterDto | number,
    year?: number,
  ): Promise<CategorySummary[]> {
    let params: Record<string, any> = {};
    if (typeof filterOrMonth === 'object' && filterOrMonth !== null) {
      params = filterOrMonth;
    } else if (typeof filterOrMonth === 'number') {
      params = { month: filterOrMonth, year };
    }
    const response = await apiClient.get('/transactions/summary', { params });
    return extractData<CategorySummary[]>(response);
  },

  async checkAnomaly(dto: CheckAnomalyDto): Promise<AnomalyCheckResult> {
    const response = await apiClient.post('/transactions/check-anomaly', dto);
    return extractData<AnomalyCheckResult>(response);
  },

  async exportExcel(filter?: FilterTransactionDto): Promise<void> {
    const token = await storage.getItem('accessToken');
    const query = new URLSearchParams();
    if (filter?.walletId) query.append('walletId', filter.walletId);
    if (filter?.type) query.append('type', filter.type);
    if (filter?.categoryId) query.append('categoryId', filter.categoryId);
    if (filter?.keyword) query.append('keyword', filter.keyword);
    if (filter?.from) query.append('from', filter.from);
    if (filter?.to) query.append('to', filter.to);

    if (Platform.OS === 'web') {
      const response = await apiClient.get('/transactions/export/excel', {
        params: filter,
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-giao-dich-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return;
    }

    const downloadUrl = `${API_BASE_URL}/transactions/export/excel${query.toString() ? '?' + query.toString() : ''}`;
    const filename = `bao-cao-giao-dich-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const localUri = `${FileSystem.documentDirectory || ''}${filename}`;

    const result = await FileSystem.downloadAsync(downloadUrl, localUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Báo cáo giao dịch Excel',
        UTI: 'com.microsoft.excel.xlsx',
      });
    }
  },
};
