import { apiClient, extractData } from '@/lib/api';
import type { Category, CreateCategoryDto, UpdateCategoryDto } from './types';

export const categoryApi = {
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get('/categories');
    return extractData<Category[]>(response);
  },

  async getCategory(id: string): Promise<Category> {
    const response = await apiClient.get(`/categories/${id}`);
    return extractData<Category>(response);
  },

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const response = await apiClient.post('/categories', dto);
    return extractData<Category>(response);
  },

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const response = await apiClient.patch(`/categories/${id}`, dto);
    return extractData<Category>(response);
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },
};
