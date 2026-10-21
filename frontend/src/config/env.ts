export const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

// Tự động ưu tiên EXPO_PUBLIC_API_URL từ file .env (nếu có), loại bỏ dấu '/' ở cuối để tránh double-slash (//)
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
).replace(/\/+$/, '');
