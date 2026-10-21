export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  provider: 'google' | 'local';
  createdAt: string;
}

export interface LoginResponseData {
  accessToken: string;
  user: AuthUser;
}

export interface NestedDataResponse<T> {
  message: string;
  data: T;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  meta?: any;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
  timestamp?: string;
  path?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  password: string;
}
