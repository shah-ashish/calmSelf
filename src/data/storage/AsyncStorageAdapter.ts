import type { StorageAdapter } from './interface';
import { InMemoryStorageAdapter } from './InMemoryStorageAdapter';
import { logger } from '@/lib/logger';

export interface AsyncStorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  clear(): Promise<void>;
}

/**
 * Production storage adapter backed by @react-native-async-storage/async-storage.
 * Highly resilient: if the native AsyncStorage module is not linked in the current APK
 * (e.g. running in Expo Go or an older dev build), it logs a warning and gracefully
 * falls back to InMemoryStorageAdapter without crashing the app.
 */
export class AsyncStorageAdapter implements StorageAdapter {
  private backend: StorageAdapter | AsyncStorageBackend;
  private fallbackAdapter?: InMemoryStorageAdapter;

  constructor(customBackend?: AsyncStorageBackend) {
    if (customBackend) {
      this.backend = customBackend;
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@react-native-async-storage/async-storage');
      const candidate = mod?.default ?? mod;
      if (candidate && typeof candidate.getItem === 'function') {
        this.backend = candidate;
      } else {
        throw new Error('AsyncStorage export is invalid');
      }
    } catch (err) {
      logger.warn(
        'AsyncStorage native module is unavailable in this build. Falling back to in-memory storage.',
        { error: err }
      );
      this.backend = new InMemoryStorageAdapter();
    }
  }

  private getFallback(): InMemoryStorageAdapter {
    if (!this.fallbackAdapter) {
      this.fallbackAdapter = new InMemoryStorageAdapter();
    }
    return this.fallbackAdapter;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await this.backend.getItem(key);
    } catch (err) {
      logger.warn('AsyncStorage.getItem failed. Using fallback storage.', { key, error: err });
      return this.getFallback().getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.backend.setItem(key, value);
    } catch (err) {
      logger.warn('AsyncStorage.setItem failed. Using fallback storage.', { key, error: err });
      await this.getFallback().setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.backend.removeItem(key);
    } catch (err) {
      logger.warn('AsyncStorage.removeItem failed. Using fallback storage.', { key, error: err });
      await this.getFallback().removeItem(key);
    }
  }

  async getAllKeys(): Promise<readonly string[]> {
    try {
      return await this.backend.getAllKeys();
    } catch (err) {
      logger.warn('AsyncStorage.getAllKeys failed. Using fallback storage.', { error: err });
      return this.getFallback().getAllKeys();
    }
  }

  async clear(): Promise<void> {
    try {
      await this.backend.clear();
    } catch (err) {
      logger.warn('AsyncStorage.clear failed. Using fallback storage.', { error: err });
      await this.getFallback().clear();
    }
  }
}
