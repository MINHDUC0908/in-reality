import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '@/config/env';
import { storage } from '@/utils/storage';
import type {
  ApiResponse,
  NestedDataResponse,
  LoginResponseData,
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  ApiErrorResponse,
} from './types';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Gắn JWT token vào mọi request nếu có
apiClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Xử lý lỗi trả về từ server
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      // Đã đăng xuất hoặc tài khoản được đăng nhập trên thiết bị khác -> tự động xóa token
      storage.removeItem('accessToken');
      storage.removeItem('user');
    }

    if (error.response?.data) {
      const { message, errors } = error.response.data;
      if (errors && errors.length > 0) {
        return Promise.reject(new Error(errors.join('\n')));
      }
      if (message) {
        return Promise.reject(new Error(message));
      }
    }

    if (error.message === 'Network Error') {
      return Promise.reject(
        new Error(
          `Không thể kết nối đến máy chủ (${API_BASE_URL}). Vui lòng kiểm tra kết nối mạng hoặc server backend.`,
        ),
      );
    }

    return Promise.reject(
      new Error(error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.'),
    );
  },
);

export function extractData<T>(response: any): T {
  const payload = response.data;
  if (payload && typeof payload === 'object') {
    if (
      payload.data &&
      typeof payload.data === 'object' &&
      'data' in payload.data &&
      !Array.isArray(payload.data)
    ) {
      return payload.data.data;
    }
    if ('data' in payload) {
      return payload.data;
    }
  }
  return payload;
}

export function extractPaginatedData<T>(response: any): { data: T[]; meta: any } {
  const payload = response.data;
  return {
    data: payload?.data || [],
    meta: payload?.meta || { total: 0, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
  };
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponseData> {
    const response = await apiClient.post<
      ApiResponse<NestedDataResponse<LoginResponseData>>
    >('/auth/login', credentials);

    // Backend bọc qua TransformInterceptor: response.data.data.data là LoginResponseData
    // Nhưng hỗ trợ cả format phẳng nếu interceptor thay đổi
    const payload = response.data;
    if (payload?.data && 'data' in payload.data) {
      return payload.data.data;
    }
    return (payload as any).data;
  },

  async register(credentials: RegisterCredentials): Promise<AuthUser> {
    const response = await apiClient.post<
      ApiResponse<NestedDataResponse<AuthUser>>
    >('/auth/register', credentials);

    const payload = response.data;
    if (payload?.data && 'data' in payload.data) {
      return payload.data.data;
    }
    return (payload as any).data;
  },

  async getMe(): Promise<AuthUser> {
    const response = await apiClient.get<ApiResponse<NestedDataResponse<AuthUser>>>(
      '/auth/me',
    );

    const payload = response.data;
    if (payload?.data && 'data' in payload.data) {
      return payload.data.data;
    }
    return (payload as any).data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Bỏ qua lỗi mạng khi logout để luôn cho phép client thoát
    }
  },
};
