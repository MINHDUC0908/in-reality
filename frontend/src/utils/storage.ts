import * as SecureStore from 'expo-secure-store';

/**
 * Quản lý lưu trữ bảo mật thuần Mobile (Android & iOS)
 * Sử dụng Android KeyStore và iOS Keychain thông qua expo-secure-store
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn('SecureStore getItem error:', e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('SecureStore setItem error:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('SecureStore removeItem error:', e);
    }
  },
};
