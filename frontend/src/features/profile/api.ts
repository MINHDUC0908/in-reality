import { apiClient, extractData } from '@/lib/api';
import type { UserProfile } from './types';

export const profileApi = {
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/auth/me');
    return extractData<UserProfile>(response);
  },
};
