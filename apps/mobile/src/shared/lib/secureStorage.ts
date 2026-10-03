import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

const memoryFallback = new Map<string, string>();

/**
 * Enterprise Hardware Secure Store adapter using iOS Keychain and Android KeyStore.
 * Falls back to localStorage on Web, and in-memory Map if unavailable.
 */
export const mobileSecureStorage: StateStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS !== 'web' && (await SecureStore.isAvailableAsync())) {
        return await SecureStore.getItemAsync(key, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
      }
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return memoryFallback.get(key) ?? null;
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS !== 'web' && (await SecureStore.isAvailableAsync())) {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
        return;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
      memoryFallback.set(key, value);
    } catch {
      memoryFallback.set(key, value);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS !== 'web' && (await SecureStore.isAvailableAsync())) {
        await SecureStore.deleteItemAsync(key);
        return;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
      memoryFallback.delete(key);
    } catch {
      memoryFallback.delete(key);
    }
  },
};
