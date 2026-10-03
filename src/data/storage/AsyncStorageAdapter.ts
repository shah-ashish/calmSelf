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
 * Checks whether native AsyncStorage or PlatformLocalStorage is linked in the native binary
 * BEFORE attempting to require @react-native-async-storage/async-storage.
 * This prevents the library from throwing fatal uncaught exceptions at require time in builds
 * where the native module is unlinked (such as Expo Go or development builds prior to M3).
 */
function isNativeStorageAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native');
    const TurboModuleRegistry = rn?.TurboModuleRegistry;
    const NativeModules = rn?.NativeModules;

    // In plain Node or test environments where NativeModules is empty/mocked,
    // allow require() to proceed so Jest mocks are used.
    if (!TurboModuleRegistry && !NativeModules) {
      return true;
    }

    // In Jest or tests, if NativeModules is defined but empty, also allow require if in test env
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return true;
    }

    const hasTurbo = Boolean(
      TurboModuleRegistry?.get?.('PlatformLocalStorage') ||
      TurboModuleRegistry?.get?.('RNC_AsyncSQLiteDBStorage') ||
      TurboModuleRegistry?.get?.('RNCAsyncStorage')
    );

    const hasNative = Boolean(
      NativeModules?.['PlatformLocalStorage'] ||
      NativeModules?.['RNC_AsyncSQLiteDBStorage'] ||
      NativeModules?.['RNCAsyncStorage'] ||
      NativeModules?.['AsyncLocalStorage'] ||
      NativeModules?.['AsyncSQLiteDBStorage']
    );

    return hasTurbo || hasNative;
  } catch {
    return false;
  }
}

/**
 * Production storage adapter backed by @react-native-async-storage/async-storage.
 * Highly resilient: if the native AsyncStorage module is not linked in the current APK
 * (e.g. running in Expo Go or an older dev build), it quietly falls back to InMemoryStorageAdapter
 * without throwing errors or showing RedBox popups.
 */
export class AsyncStorageAdapter implements StorageAdapter {
  private backend: StorageAdapter | AsyncStorageBackend;
  private fallbackAdapter?: InMemoryStorageAdapter;

  constructor(customBackend?: AsyncStorageBackend) {
    if (customBackend) {
      this.backend = customBackend;
      return;
    }

    if (!isNativeStorageAvailable()) {
      logger.info(
        'AsyncStorage native module not present in current app binary. Gracefully using in-memory storage fallback.'
      );
      this.backend = new InMemoryStorageAdapter();
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
        'AsyncStorage native module failed to load. Falling back to in-memory storage.',
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
