import { create } from 'zustand';
import { storage } from '@/utils/storage';
import { authApi } from './api';
import type { AuthUser, LoginCredentials, RegisterCredentials } from './types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  loadStoredAuth: async () => {
    try {
      set({ isLoading: true });
      const token = await storage.getItem('accessToken');
      const userJson = await storage.getItem('user');

      if (token && userJson) {
        const user = JSON.parse(userJson) as AuthUser;
        set({
          accessToken: token,
          user,
          isAuthenticated: true,
        });

        // Tự động làm mới profile ở background
        try {
          const freshUser = await authApi.getMe();
          set({ user: freshUser });
          await storage.setItem('user', JSON.stringify(freshUser));
        } catch {
          // Nếu token hết hạn, giữ nguyên hoặc logout
        }
      }
    } catch (e) {
      console.error('Failed to load stored auth state', e);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true });
    try {
      const result = await authApi.login(credentials);
      const { accessToken, user } = result;

      // Lưu trữ an toàn
      await storage.setItem('accessToken', accessToken);
      await storage.setItem('user', JSON.stringify(user));

      set({
        accessToken,
        user,
        isAuthenticated: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (credentials: RegisterCredentials) => {
    set({ isLoading: true });
    try {
      const user = await authApi.register(credentials);
      return user;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {}
    await storage.removeItem('accessToken');
    await storage.removeItem('user');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.getMe();
      set({ user });
      await storage.setItem('user', JSON.stringify(user));
    } finally {
      set({ isLoading: false });
    }
  },
}));
