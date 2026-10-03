/**
 * Low-level key-value storage adapter interface.
 * Abstracts AsyncStorage, MMKV, SQLite, or In-Memory adapters.
 */

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  clear(): Promise<void>;
}
