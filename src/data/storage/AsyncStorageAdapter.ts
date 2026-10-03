import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageAdapter } from './interface';

/**
 * Production storage adapter backed by @react-native-async-storage/async-storage.
 */
export class AsyncStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async getAllKeys(): Promise<readonly string[]> {
    return AsyncStorage.getAllKeys();
  }

  async clear(): Promise<void> {
    await AsyncStorage.clear();
  }
}
