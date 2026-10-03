import type { StorageAdapter } from './interface';

/**
 * In-memory storage adapter for unit tests and local simulation.
 * Pure TypeScript — backed by Map<string, string>.
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getAllKeys(): Promise<readonly string[]> {
    return Array.from(this.store.keys());
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Helper for inspecting store size during tests.
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Helper for populating store directly during tests.
   */
  dump(): ReadonlyMap<string, string> {
    return new Map(this.store);
  }
}
