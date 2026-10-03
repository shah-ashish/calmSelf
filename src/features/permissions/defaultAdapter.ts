import { ExpoAppBlockerAdapter } from '@/platform/blocker/ExpoAppBlockerAdapter';
import type { BlockerAdapter } from '@/platform/blocker/interface';

let instance: BlockerAdapter | null = null;

export function getDefaultBlockerAdapter(): BlockerAdapter {
  if (!instance) {
    instance = new ExpoAppBlockerAdapter();
  }
  return instance;
}

/** For test environment overrides */
export function setBlockerAdapterInstance(adapter: BlockerAdapter | null): void {
  instance = adapter;
}
